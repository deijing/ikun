# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

鸡王争霸赛 - ikuncode 开发者实战大赏平台。全栈 Web 应用，包含 Linux.do OAuth 登录、比赛报名、GitHub 数据同步、应援系统、作品提交、投票、积分系统、抽奖、竞猜等功能。

## 开发注意事项

- 数据库连接：本地 MySQL `root:root@localhost:3306`，可直接操作
- 前后端跨域：后端已配置 CORS，新增 API 端点时确保在 `app/api/v1/__init__.py` 注册路由
- 所有 API 前缀：`/api/v1`

## 常用命令

### 数据库
```bash
# 初始化
mysql -u root -proot -P 3306 < backend/sql/schema.sql

# 执行迁移（按序号顺序）
mysql -u root -proot -P 3306 chicken_king < backend/sql/002_github_and_cheer.sql
# ... 依次执行到最新的 017_exchange_system.sql
```

### 前端
```bash
cd frontend
npm install
npm run dev          # http://127.0.0.1:5173
npm run build
```

### 后端
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
# API 文档: http://localhost:8000/docs
```

### 测试
```bash
cd backend
pytest
pytest -v tests/test_xxx.py     # 单个文件
pytest -k "test_name"           # 按名称过滤
```

### Docker
```bash
docker-compose up -d            # 启动所有服务
docker-compose logs -f backend  # 查看后端日志
```

## 架构概览

### 前端 (React 18 + Vite + Tailwind)

**状态管理**: Zustand stores (`src/stores/`)
- `authStore` - 用户认证状态、JWT token
- `registrationStore` - 报名弹窗状态
- `themeStore` - 主题切换

**API 层**: `src/services/`
- `api.js` - Axios 实例，自动注入 JWT，处理 401
- `index.js` - 按模块导出 API（authApi, pointsApi, lotteryApi, exchangeApi 等）

**页面结构**: `src/pages/`
- `HomePage` - 首页（比赛介绍、CTA）
- `ActivityCenterPage` - 活动中心（签到、抽奖、扭蛋、刮刮乐、老虎机、积分商城、竞猜）
- `ParticipantsPage` - 参赛选手列表
- `RankingPage` - 排行榜
- `SubmitPage` / `SubmissionsPage` - 作品提交与展示
- `AchievementsPage` - 成就系统
- `PredictionPage` / `MyBetsPage` - 竞猜系统
- `AdminDashboardPage` - 管理后台
- `ReviewCenterPage` - 评审中心

**活动组件**: `src/components/activity/`
- `GachaMachine.jsx` - 扭蛋机
- `ScratchCard.jsx` - 刮刮乐（Canvas 实现）
- `SlotMachine.jsx` - 老虎机
- `ExchangeShop.jsx` - 积分兑换商城

### 后端 (FastAPI + SQLAlchemy Async)

**入口**: `app/main.py` (包含 lifespan 生命周期、CORS 配置)

**API 模块**: `app/api/v1/endpoints/`
| 模块 | 前缀 | 功能 |
|------|------|------|
| `auth` | `/auth` | Linux.do OAuth2、GitHub OAuth |
| `user` | `/users` | 用户信息、成就、徽章 |
| `contest` | `/contests` | 比赛管理 |
| `registration` | - | 比赛报名 |
| `submission` | `/submissions` | 作品提交、附件上传 |
| `vote` | `/votes` | 投票 |
| `github` | - | GitHub 数据同步 |
| `cheer` | - | 打气/应援 |
| `points` | `/points` | 积分系统、签到 |
| `lottery` | `/lottery` | 抽奖、刮刮乐 |
| `prediction` | `/prediction` | 竞猜市场 |
| `exchange` | `/exchange` | 积分兑换商城 |
| `achievement` | - | 成就系统 |
| `announcement` | `/announcements` | 公告 |
| `easter_egg` | `/easter-egg` | 彩蛋兑换码 |
| `admin` | `/admin` | 管理后台 |
| `review_center` | `/review-center` | 评审中心 |

**数据模型**: `app/models/`
- `user.py` - 用户（含角色：user/contestant/reviewer/admin）
- `contest.py` - 比赛
- `registration.py` - 报名记录
- `submission.py` - 作品提交
- `points.py` - 积分账本、签到、抽奖配置、竞猜市场、兑换商品
- `achievement.py` - 成就定义与用户成就
- `easter_egg.py` - 彩蛋兑换码

**服务层**: `app/services/`
- `points_service.py` - 积分变动（幂等、带请求ID）
- `lottery_service.py` - 抽奖逻辑（权重随机、库存扣减）
- `prediction_service.py` - 竞猜下注、结算
- `exchange_service.py` - 积分兑换（库存、限购校验）
- `achievement_service.py` - 成就检测与解锁
- `github_service.py` - GitHub API 集成
- `scheduler.py` - APScheduler 定时任务

### 定时任务 (APScheduler)
- **每小时整点**: 同步所有选手 GitHub 数据
- **每日 23:55**: 生成每日战报

### 数据库迁移

迁移脚本位于 `backend/sql/`，按序号执行：
- `schema.sql` - 基础表
- `002` ~ `017` - 增量迁移

主要表：
- `users`, `contests`, `registrations`, `submissions`, `votes`
- `points_ledger`, `user_points`, `daily_signins`
- `lottery_configs`, `lottery_prizes`, `lottery_draws`
- `prediction_markets`, `prediction_options`, `prediction_bets`
- `exchange_items`, `exchange_records`, `user_exchange_quotas`
- `achievements`, `user_achievements`, `easter_egg_codes`

### 关键业务流程

**认证流程**:
1. 前端跳转 `/api/v1/auth/linuxdo/login`
2. OAuth 回调 `/api/v1/auth/linuxdo/callback`
3. 后端签发 JWT，重定向前端 `/login#token=xxx&user=base64`
4. 前端解析存入 authStore

**积分系统**:
- 签到获得积分（连续签到有里程碑奖励）
- 抽奖/扭蛋/刮刮乐/老虎机消耗积分
- 竞猜下注消耗积分，中奖获得返还
- 积分商城兑换券（抽奖券、刮刮乐券、扭蛋券）

**比赛阶段**: `upcoming` → `signup` → `submission` → `voting` → `ended`

**报名状态**: `draft` → `submitted` → `approved`/`rejected`/`withdrawn`

## 环境配置

**后端 `backend/.env`**:
```
DEBUG=true
SECRET_KEY=your-secret-key
DATABASE_URL=mysql+aiomysql://root:root@localhost:3306/chicken_king
REDIS_URL=redis://localhost:6379/0
FRONTEND_URL=http://127.0.0.1:5173
LINUX_DO_CLIENT_ID=xxx
LINUX_DO_CLIENT_SECRET=xxx
LINUX_DO_REDIRECT_URI=http://127.0.0.1:8000/api/v1/auth/linuxdo/callback
GITHUB_TOKEN=optional
```

**前端 `frontend/.env`**:
```
VITE_API_URL=http://localhost:8000/api/v1
```

## 开发规范

- 前端组件 PascalCase，API 路由 snake_case
- 后端依赖注入获取 `db: AsyncSession` 和 `current_user: User`
- 新增 API 端点后在 `app/api/v1/__init__.py` 注册路由
- 数据库变更需编写迁移脚本到 `backend/sql/`
