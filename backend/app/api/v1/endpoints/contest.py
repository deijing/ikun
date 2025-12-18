"""
比赛相关 API

提供比赛信息的查询功能。
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.contest import Contest, ContestPhase

router = APIRouter()


class ContestResponse(BaseModel):
    """比赛响应体"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    phase: ContestPhase


class ContestListResponse(BaseModel):
    """比赛列表响应"""
    items: list[ContestResponse]
    total: int


@router.get("/", response_model=ContestListResponse)
async def list_contests(db: AsyncSession = Depends(get_db)):
    """获取比赛列表"""
    result = await db.execute(select(Contest).order_by(Contest.id.desc()))
    contests = result.scalars().all()

    return ContestListResponse(
        items=[ContestResponse.model_validate(c) for c in contests],
        total=len(contests)
    )


@router.get("/{contest_id}", response_model=ContestResponse)
async def get_contest(contest_id: int, db: AsyncSession = Depends(get_db)):
    """获取比赛详情"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )

    return ContestResponse.model_validate(contest)


@router.get("/{contest_id}/ranking")
async def get_ranking(contest_id: int, db: AsyncSession = Depends(get_db)):
    """获取排行榜"""
    # 验证比赛存在
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )

    # TODO: 实现排行榜逻辑
    return {"message": f"比赛 {contest_id} 排行榜", "items": []}
