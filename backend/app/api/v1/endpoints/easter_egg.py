"""
彩蛋兑换码 API
隐藏彩蛋系统，先到先得
"""
from datetime import datetime
from typing import Optional
import random
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from app.core.rate_limit import limiter, RateLimits
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.mysql import insert
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user
from app.models.user import User, UserRole
from app.models.easter_egg import (
    EasterEggCode, EasterEggRedemption,
    EasterEggRewardType, EasterEggStatus
)
import logging

logger = logging.getLogger(__name__)
from app.models.points import PointsReason, UserItem
from app.services.points_service import PointsService

# 扭蛋机消耗积分
GACHA_COST = 50
from app.schemas.easter_egg import (
    RedeemCodeRequest, RedeemCodeResponse, RewardInfo,
    RedemptionHistoryItem, RedemptionHistoryResponse,
    EasterEggCodeInfo, EasterEggStatsResponse, CreateEasterEggRequest,
    GachaPlayResponse, GachaStatusResponse
)

router = APIRouter()


async def grant_points_reward(
    db: AsyncSession,
    user_id: int,
    amount: int,
    code_id: int,
    code: str
) -> None:
    """发放积分奖励"""
    await PointsService.add_points(
        db=db,
        user_id=user_id,
        amount=amount,
        reason=PointsReason.EASTER_EGG_REDEEM,
        ref_type="easter_egg",
        ref_id=code_id,
        description=f"彩蛋兑换码: {code}",
        auto_commit=False
    )


async def grant_item_reward(
    db: AsyncSession,
    user_id: int,
    item_type: str,
    amount: int
) -> None:
    """发放道具奖励"""
    # 使用 upsert 更新道具库存
    stmt = insert(UserItem).values(
        user_id=user_id,
        item_type=item_type,
        quantity=amount
    ).on_duplicate_key_update(
        quantity=UserItem.quantity + amount
    )
    await db.execute(stmt)


async def grant_badge_reward(
    db: AsyncSession,
    user_id: int,
    badge_key: str,
    badge_name: str,
    code_id: int = None,
    code: str = None
) -> None:
    """
    发放徽章奖励
    1. 解锁用户的指定成就（徽章）
    2. 直接发放徽章对应的积分奖励（可重复获得）
    """
    from app.models.achievement import UserAchievement, AchievementDefinition, AchievementStatus
    from sqlalchemy.dialects.mysql import insert as mysql_insert

    # 检查成就定义是否存在
    result = await db.execute(
        select(AchievementDefinition).where(
            AchievementDefinition.achievement_key == badge_key
        )
    )
    definition = result.scalar_one_or_none()

    if not definition:
        # 成就定义不存在，记录警告但不中断流程
        logger.warning(f"徽章定义不存在: {badge_key}")
        return

    # 使用 upsert 创建或更新用户成就记录，直接设为已解锁
    now = datetime.utcnow()
    stmt = mysql_insert(UserAchievement).values(
        user_id=user_id,
        achievement_key=badge_key,
        status=AchievementStatus.UNLOCKED.value,
        progress_value=definition.target_value,  # 直接满进度
        unlocked_at=now
    ).on_duplicate_key_update(
        status=AchievementStatus.UNLOCKED.value,
        progress_value=definition.target_value,
        unlocked_at=now
    )
    await db.execute(stmt)

    # 直接发放徽章对应的积分奖励（每次扭到都可以获得）
    if definition.points > 0:
        await PointsService.add_points(
            db=db,
            user_id=user_id,
            amount=definition.points,
            reason=PointsReason.EASTER_EGG_REDEEM,
            ref_type="easter_egg_badge",
            ref_id=code_id or 0,
            description=f"彩蛋徽章奖励: {badge_name}",
            auto_commit=False
        )


@router.post("/redeem", response_model=RedeemCodeResponse)
@limiter.limit(RateLimits.REDEEM)
async def redeem_easter_egg(
    request: Request,
    body: RedeemCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    兑换彩蛋码
    - 先到先得，每个码只能被兑换一次
    - 支持积分、道具、徽章等多种奖励类型
    """
    # 标准化兑换码：去空格、转大写
    code = body.code.strip().upper()

    if not code:
        raise HTTPException(status_code=400, detail="兑换码不能为空")

    # 使用条件更新实现并发安全的"先到先得"
    # UPDATE ... WHERE status='active' AND claimed_by IS NULL
    now = datetime.utcnow()

    # 先查询兑换码是否存在
    result = await db.execute(
        select(EasterEggCode).where(EasterEggCode.code == code)
    )
    egg_code = result.scalar_one_or_none()

    if not egg_code:
        raise HTTPException(status_code=404, detail="兑换码无效或不存在")

    # 检查是否过期
    if egg_code.expires_at and egg_code.expires_at < now:
        raise HTTPException(status_code=410, detail="兑换码已过期")

    # 检查是否已被领取（使用字符串比较，因为数据库存储的是字符串）
    if egg_code.status == EasterEggStatus.CLAIMED.value:
        # 如果是同一用户的码（可能通过扭蛋机获得）
        if egg_code.claimed_by == current_user.id:
            # 检查是否已发放奖励（通过 redemption 记录判断）
            redemption_result = await db.execute(
                select(EasterEggRedemption).where(
                    EasterEggRedemption.code_id == egg_code.id,
                    EasterEggRedemption.user_id == current_user.id
                )
            )
            existing_redemption = redemption_result.scalar_one_or_none()

            if existing_redemption:
                # 已发放过奖励，返回幂等响应
                return RedeemCodeResponse(
                    success=True,
                    code=code,
                    reward=RewardInfo(
                        type=egg_code.reward_type,
                        value=egg_code.reward_value
                    ),
                    hint=egg_code.hint,
                    claimed_at=egg_code.claimed_at
                )

            # 未发放奖励，继续执行发放流程（跳过状态更新）
            now = datetime.utcnow()
            reward_value = egg_code.reward_value
            reward_type = egg_code.reward_type

            try:
                if reward_type == EasterEggRewardType.POINTS.value:
                    amount = reward_value.get("amount", 0)
                    await grant_points_reward(db, current_user.id, amount, egg_code.id, code)

                elif reward_type == EasterEggRewardType.ITEM.value:
                    item_type = reward_value.get("item_type")
                    amount = reward_value.get("amount", 1)
                    if item_type:
                        await grant_item_reward(db, current_user.id, item_type, amount)

                elif reward_type == EasterEggRewardType.BADGE.value:
                    badge_key = reward_value.get("badge_key")
                    badge_name = reward_value.get("badge_name", "")
                    if badge_key:
                        await grant_badge_reward(db, current_user.id, badge_key, badge_name, egg_code.id, code)

                # 记录兑换流水
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent", "")[:500]
                redemption = EasterEggRedemption(
                    code_id=egg_code.id,
                    user_id=current_user.id,
                    reward_type=reward_type,
                    reward_value=reward_value,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                db.add(redemption)
                await db.commit()

                return RedeemCodeResponse(
                    success=True,
                    code=code,
                    reward=RewardInfo(type=reward_type, value=reward_value),
                    hint=egg_code.hint,
                    claimed_at=egg_code.claimed_at
                )

            except Exception as e:
                await db.rollback()
                logger.error(f"彩蛋兑换奖励发放失败: code_id={egg_code.id}, error={str(e)}")
                raise HTTPException(status_code=500, detail="奖励发放失败，请稍后重试")

        raise HTTPException(status_code=409, detail="兑换码已被其他用户领取")

    if egg_code.status == EasterEggStatus.DISABLED.value:
        raise HTTPException(status_code=410, detail="兑换码已禁用")

    if egg_code.status == EasterEggStatus.EXPIRED.value:
        raise HTTPException(status_code=410, detail="兑换码已过期")

    # 使用条件更新确保并发安全（使用字符串值）
    update_result = await db.execute(
        update(EasterEggCode)
        .where(
            and_(
                EasterEggCode.id == egg_code.id,
                EasterEggCode.status == EasterEggStatus.ACTIVE.value,
                EasterEggCode.claimed_by.is_(None)
            )
        )
        .values(
            status=EasterEggStatus.CLAIMED.value,
            claimed_by=current_user.id,
            claimed_at=now
        )
    )

    if update_result.rowcount == 0:
        # 更新失败，说明被其他用户抢先领取
        raise HTTPException(status_code=409, detail="兑换码已被其他用户领取")

    # 发放奖励
    reward_value = egg_code.reward_value
    reward_type = egg_code.reward_type
    try:
        if reward_type == EasterEggRewardType.POINTS.value:
            amount = reward_value.get("amount", 0)
            await grant_points_reward(db, current_user.id, amount, egg_code.id, code)

        elif reward_type == EasterEggRewardType.ITEM.value:
            item_type = reward_value.get("item_type")
            amount = reward_value.get("amount", 1)
            if item_type:
                await grant_item_reward(db, current_user.id, item_type, amount)

        elif reward_type == EasterEggRewardType.BADGE.value:
            badge_key = reward_value.get("badge_key")
            badge_name = reward_value.get("badge_name", "")
            if badge_key:
                await grant_badge_reward(db, current_user.id, badge_key, badge_name, egg_code.id, code)

        elif reward_type == EasterEggRewardType.API_KEY.value:
            # API Key 奖励特殊处理
            # TODO: 从 api_key_codes 表分配一个可用的 key
            pass

        # 记录兑换流水
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")[:500]

        redemption = EasterEggRedemption(
            code_id=egg_code.id,
            user_id=current_user.id,
            reward_type=reward_type,
            reward_value=reward_value,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(redemption)

        await db.commit()

    except Exception as e:
        await db.rollback()
        # 记录详细错误日志，但不对外暴露
        logger.error(
            f"彩蛋兑换奖励发放失败: code_id={egg_code.id}, user_id={current_user.id}, "
            f"reward_type={reward_type}, error={str(e)}"
        )
        raise HTTPException(status_code=500, detail="奖励发放失败，请稍后重试")

    return RedeemCodeResponse(
        success=True,
        code=code,
        reward=RewardInfo(
            type=reward_type,
            value=reward_value
        ),
        hint=egg_code.hint,
        claimed_at=now
    )


@router.get("/history", response_model=RedemptionHistoryResponse)
async def get_redemption_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户的彩蛋兑换历史"""
    # 查询兑换记录
    result = await db.execute(
        select(EasterEggRedemption, EasterEggCode)
        .join(EasterEggCode, EasterEggRedemption.code_id == EasterEggCode.id)
        .where(EasterEggRedemption.user_id == current_user.id)
        .order_by(EasterEggRedemption.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()

    # 查询总数
    count_result = await db.execute(
        select(func.count(EasterEggRedemption.id))
        .where(EasterEggRedemption.user_id == current_user.id)
    )
    total = count_result.scalar()

    items = [
        RedemptionHistoryItem(
            id=redemption.id,
            code=code.code,
            reward=RewardInfo(
                type=redemption.reward_type,
                value=redemption.reward_value
            ),
            hint=code.hint,
            claimed_at=redemption.created_at
        )
        for redemption, code in rows
    ]

    return RedemptionHistoryResponse(items=items, total=total)


# ========== 管理员接口 ==========

@router.get("/admin/list")
async def list_easter_egg_codes(
    status: Optional[str] = Query(None, description="状态筛选"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """管理员：查看所有彩蛋码"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可访问")

    query = select(EasterEggCode, User).outerjoin(
        User, EasterEggCode.claimed_by == User.id
    )

    if status:
        query = query.where(EasterEggCode.status == status)

    query = query.order_by(EasterEggCode.id.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for code, user in rows:
        items.append({
            "id": code.id,
            "code": code.code,
            "reward_type": code.reward_type,  # 已经是字符串
            "reward_value": code.reward_value,
            "status": code.status,  # 已经是字符串
            "description": code.description,
            "hint": code.hint,
            "claimed_by": code.claimed_by,
            "claimer_username": user.username if user else None,
            "claimed_at": code.claimed_at.isoformat() if code.claimed_at else None,
            "expires_at": code.expires_at.isoformat() if code.expires_at else None,
            "created_at": code.created_at.isoformat()
        })

    return {"items": items}


@router.get("/admin/stats", response_model=EasterEggStatsResponse)
async def get_easter_egg_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """管理员：彩蛋码统计"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可访问")

    # 统计各状态数量
    result = await db.execute(
        select(
            EasterEggCode.status,
            func.count(EasterEggCode.id)
        ).group_by(EasterEggCode.status)
    )
    # status 已经是字符串，无需 .value
    status_counts = {row[0]: row[1] for row in result.all()}

    total = sum(status_counts.values())

    return EasterEggStatsResponse(
        total_codes=total,
        active_codes=status_counts.get("active", 0),
        claimed_codes=status_counts.get("claimed", 0),
        disabled_codes=status_counts.get("disabled", 0),
        expired_codes=status_counts.get("expired", 0)
    )


@router.post("/admin/create")
async def create_easter_egg_code(
    body: CreateEasterEggRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """管理员：创建新彩蛋码"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可访问")

    # 检查兑换码是否已存在
    code = body.code.strip().upper()
    result = await db.execute(
        select(EasterEggCode).where(EasterEggCode.code == code)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="兑换码已存在")

    # 验证奖励类型
    try:
        reward_type = EasterEggRewardType(body.reward_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的奖励类型")

    new_code = EasterEggCode(
        code=code,
        reward_type=reward_type.value,  # 存储字符串值
        reward_value=body.reward_value,
        status=EasterEggStatus.ACTIVE.value,  # 存储字符串值
        description=body.description,
        hint=body.hint,
        expires_at=body.expires_at
    )
    db.add(new_code)
    await db.commit()
    await db.refresh(new_code)

    return {
        "id": new_code.id,
        "code": new_code.code,
        "message": "彩蛋码创建成功"
    }


@router.put("/admin/{code_id}/disable")
async def disable_easter_egg_code(
    code_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """管理员：禁用彩蛋码"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="仅管理员可访问")

    result = await db.execute(
        select(EasterEggCode).where(EasterEggCode.id == code_id)
    )
    code = result.scalar_one_or_none()

    if not code:
        raise HTTPException(status_code=404, detail="兑换码不存在")

    if code.status == EasterEggStatus.CLAIMED.value:
        raise HTTPException(status_code=400, detail="已被领取的兑换码无法禁用")

    code.status = EasterEggStatus.DISABLED.value
    await db.commit()

    return {"message": "兑换码已禁用"}


# ========== 扭蛋机接口 ==========

@router.get("/gacha/status", response_model=GachaStatusResponse)
async def get_gacha_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取扭蛋机状态
    返回当前可抽取的彩蛋码数量、用户积分余额等
    """
    # 查询可抽取的彩蛋码数量（未过期、未领取、未禁用）
    now = datetime.utcnow()
    result = await db.execute(
        select(func.count(EasterEggCode.id)).where(
            and_(
                EasterEggCode.status == EasterEggStatus.ACTIVE.value,
                EasterEggCode.claimed_by.is_(None),
                # 未过期或无过期时间
                (EasterEggCode.expires_at.is_(None)) | (EasterEggCode.expires_at > now)
            )
        )
    )
    available_codes = result.scalar() or 0

    # 获取用户积分余额
    user_balance = await PointsService.get_balance(db, current_user.id)

    return GachaStatusResponse(
        cost=GACHA_COST,
        available_codes=available_codes,
        user_balance=user_balance,
        can_play=user_balance >= GACHA_COST and available_codes > 0
    )


@router.post("/gacha/play", response_model=GachaPlayResponse)
@limiter.limit(RateLimits.LOTTERY)
async def play_gacha(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    扭蛋机抽奖
    - 消耗 50 积分随机获得一个彩蛋码
    - 彩蛋码直接分配给用户（标记为已领取）
    - 用户可以查看彩蛋码对应的奖励
    """
    now = datetime.utcnow()
    selected_code: Optional[EasterEggCode] = None
    reward_type: Optional[str] = None
    reward_value = None

    try:
        # 1. 预检查积分（非事务性，仅快速失败）
        user_balance = await PointsService.get_balance(db, current_user.id)
        if user_balance < GACHA_COST:
            raise HTTPException(
                status_code=400,
                detail=f"积分不足，需要 {GACHA_COST} 积分，当前余额 {user_balance}"
            )

        # 2. 在事务中完成：领取彩蛋码 + 扣积分 + 记录流水 + 发奖励
        # 有限重试机制应对并发冲突
        max_retries = 5
        for attempt in range(max_retries):
            # 随机选择一个可用的彩蛋码
            result = await db.execute(
                select(EasterEggCode).where(
                    and_(
                        EasterEggCode.status == EasterEggStatus.ACTIVE.value,
                        EasterEggCode.claimed_by.is_(None),
                        (EasterEggCode.expires_at.is_(None)) | (EasterEggCode.expires_at > now)
                    )
                )
            )
            available_codes = result.scalars().all()

            if not available_codes:
                raise HTTPException(status_code=404, detail="暂无可抽取的彩蛋码")

            # 随机选择一个
            candidate = random.choice(available_codes)

            # 使用条件更新确保并发安全
            update_result = await db.execute(
                update(EasterEggCode)
                .where(
                    and_(
                        EasterEggCode.id == candidate.id,
                        EasterEggCode.status == EasterEggStatus.ACTIVE.value,
                        EasterEggCode.claimed_by.is_(None)
                    )
                )
                .values(
                    status=EasterEggStatus.CLAIMED.value,
                    claimed_by=current_user.id,
                    claimed_at=now
                )
            )

            if update_result.rowcount == 1:
                selected_code = candidate
                break

            # 如果更新失败，继续重试
            if attempt < max_retries - 1:
                continue

        if not selected_code:
            raise HTTPException(
                status_code=409,
                detail="手慢了！彩蛋被抢走了，请再试一次"
            )

        # 3. 扣除积分（带行锁防并发超扣）
        try:
            await PointsService.deduct_points(
                db=db,
                user_id=current_user.id,
                amount=GACHA_COST,
                reason=PointsReason.GACHA_SPEND,
                ref_type="easter_egg",
                ref_id=selected_code.id,
                description="扭蛋机抽奖获得彩蛋码",
                auto_commit=False
            )
        except ValueError as e:
            await db.rollback()
            raise HTTPException(status_code=400, detail=str(e))

        # 4. 扭蛋机只分配彩蛋码，不立即发放奖励
        # 用户需要通过彩蛋兑换入口手动兑换才能获得奖励
        reward_type = selected_code.reward_type
        reward_value = selected_code.reward_value

        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(
            "扭蛋机处理失败: code_id=%s, user_id=%s, reward_type=%s, error=%s",
            getattr(selected_code, "id", None),
            current_user.id,
            reward_type,
            str(e)
        )
        raise HTTPException(status_code=500, detail="扭蛋机处理失败，请稍后再试")

    # 6. 获取更新后的余额
    remaining_balance = await PointsService.get_balance(db, current_user.id)

    return GachaPlayResponse(
        success=True,
        code=selected_code.code,
        reward=RewardInfo(type=reward_type, value=reward_value),
        hint=selected_code.hint,
        cost=GACHA_COST,
        remaining_balance=remaining_balance
    )
