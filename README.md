# 鸡王争霸赛 - ikuncode 开发者实战大赏

> 第一届 ikuncode "鸡王争霸赛" 活动平台

## 项目结构

```
鸡王争霸赛/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/    # 组件库
│   │   ├── pages/         # 页面
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── services/      # API 服务
│   │   ├── stores/        # 状态管理
│   │   ├── types/         # 类型定义
│   │   └── utils/         # 工具函数
│   └── package.json
│
├── backend/           # FastAPI 后端
│   ├── app/
│   │   ├── api/           # API 路由
│   │   ├── core/          # 核心配置
│   │   ├── models/        # 数据模型
│   │   ├── schemas/       # Pydantic 模式
│   │   ├── services/      # 业务逻辑
│   │   └── utils/         # 工具函数
│   ├── tests/
│   └── requirements.txt
│
└── docker-compose.yml
```

## 技术栈

### 前端
- **框架**: React 18 + Vite
- **样式**: Tailwind CSS
- **路由**: React Router
- **状态**: Zustand
- **请求**: Axios + React Query

### 后端
- **框架**: FastAPI
- **ORM**: SQLAlchemy
- **数据库**: MySQL 8.0
- **缓存**: Redis
- **认证**: JWT

## 快速开始

### 前端
```bash
cd frontend
npm install
npm run dev
```

### 后端
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 功能模块

- [ ] 用户认证（注册/登录）
- [ ] 活动报名
- [ ] 作品提交
- [ ] 投票系统
- [ ] 排行榜
- [ ] 管理后台

## 开发规范

- 前端组件使用 PascalCase
- API 路由使用 snake_case
- 提交信息遵循 Conventional Commits
