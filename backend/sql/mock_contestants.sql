-- ============================================================================
-- 鸡王争霸赛 - 模拟参赛选手数据
-- ============================================================================

USE `chicken_king`;

SET NAMES utf8mb4;

-- ============================================================================
-- 插入10名模拟用户
-- ============================================================================
INSERT INTO `users` (`username`, `email`, `display_name`, `linux_do_id`, `linux_do_username`, `trust_level`, `avatar_url`, `role`, `is_active`) VALUES
('zhangsan', 'zhangsan@example.com', '张三', '10001', 'zhangsan_dev', 3, 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan', 'contestant', 1),
('lisi', 'lisi@example.com', '李四', '10002', 'lisi_coder', 2, 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi', 'contestant', 1),
('wangwu', 'wangwu@example.com', '王五', '10003', 'wangwu_tech', 4, 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu', 'contestant', 1),
('zhaoliu', 'zhaoliu@example.com', '赵六', '10004', 'zhaoliu_pro', 2, 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu', 'contestant', 1),
('sunqi', 'sunqi@example.com', '孙七', '10005', 'sunqi_ninja', 3, 'https://api.dicebear.com/7.x/avataaars/svg?seed=sunqi', 'contestant', 1),
('zhouba', 'zhouba@example.com', '周八', '10006', 'zhouba_ace', 3, 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhouba', 'contestant', 1),
('wujiu', 'wujiu@example.com', '吴九', '10007', 'wujiu_master', 4, 'https://api.dicebear.com/7.x/avataaars/svg?seed=wujiu', 'contestant', 1),
('zhengshi', 'zhengshi@example.com', '郑十', '10008', 'zhengshi_guru', 2, 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhengshi', 'contestant', 1),
('xiaoming', 'xiaoming@example.com', '小明', '10009', 'xiaoming_hacker', 3, 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming', 'contestant', 1),
('xiaohong', 'xiaohong@example.com', '小红', '10010', 'xiaohong_wizard', 3, 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaohong', 'contestant', 1);

-- 获取刚插入的用户ID（假设从ID=1开始，如果有其他用户需要调整）
SET @contest_id = 1;

-- ============================================================================
-- 插入10条报名记录
-- ============================================================================
INSERT INTO `registrations` (`contest_id`, `user_id`, `title`, `summary`, `description`, `plan`, `tech_stack`, `contact_email`, `contact_wechat`, `status`, `submitted_at`) VALUES
-- 1. 张三 - AI智能助手
(@contest_id,
 (SELECT id FROM users WHERE username = 'zhangsan'),
 'AI智能编程助手',
 '基于大模型的智能代码补全与生成工具',
 '本项目旨在开发一款基于最新大语言模型的智能编程助手。主要功能包括：\n\n1. **智能代码补全**：根据上下文自动补全代码\n2. **代码生成**：根据自然语言描述生成代码片段\n3. **代码解释**：自动生成代码注释和文档\n4. **Bug检测**：智能识别潜在的代码问题\n\n项目将支持多种编程语言，包括Python、JavaScript、TypeScript、Go等。',
 '## 实现计划\n\n### 第一阶段（Week 1-2）\n- 搭建基础架构\n- 接入大模型API\n- 实现基础补全功能\n\n### 第二阶段（Week 3-4）\n- 开发VS Code插件\n- 优化响应速度\n- 添加多语言支持\n\n### 第三阶段（Week 5-6）\n- 用户测试与反馈\n- 性能优化\n- 发布正式版本',
 '["Python", "FastAPI", "OpenAI API", "VS Code Extension", "TypeScript"]',
 'zhangsan@example.com', 'zhangsan_wx', 'approved', NOW()),

-- 2. 李四 - 在线协作白板
(@contest_id,
 (SELECT id FROM users WHERE username = 'lisi'),
 '协作画板 CoBoard',
 '实时多人协作的在线白板工具',
 '**CoBoard** 是一款支持实时多人协作的在线白板工具。\n\n### 核心特性\n- 实时同步：多人同时编辑，毫秒级同步\n- 丰富画笔：支持多种画笔、形状、文本工具\n- 无限画布：可无限缩放和拖拽的画布\n- 导出分享：支持导出PNG/PDF，生成分享链接\n\n### 技术亮点\n- 使用CRDT算法解决协作冲突\n- WebSocket实现低延迟通信\n- Canvas渲染优化，支持万级图元',
 '### 里程碑\n\n**M1: 基础画板** (2周)\n- 画布渲染引擎\n- 基础画笔工具\n\n**M2: 实时协作** (2周)\n- WebSocket服务\n- CRDT同步算法\n\n**M3: 产品完善** (2周)\n- 用户系统\n- 导出功能\n- UI美化',
 '["React", "Canvas", "WebSocket", "Node.js", "Redis", "CRDT"]',
 'lisi@example.com', NULL, 'approved', NOW()),

-- 3. 王五 - 自动化运维平台
(@contest_id,
 (SELECT id FROM users WHERE username = 'wangwu'),
 'DevOps Commander',
 '一站式自动化运维与监控平台',
 '## DevOps Commander\n\n面向中小团队的一站式DevOps平台，降低运维门槛。\n\n### 功能模块\n\n1. **服务器管理**\n   - 多云服务器统一管理\n   - SSH批量执行命令\n   - 文件分发同步\n\n2. **CI/CD流水线**\n   - 可视化流水线编排\n   - 支持Docker/K8s部署\n   - 自动回滚机制\n\n3. **监控告警**\n   - 服务器性能监控\n   - 应用日志聚合\n   - 多渠道告警通知',
 '### 开发计划\n\n**Phase 1**: 服务器管理模块 (10天)\n**Phase 2**: CI/CD流水线 (14天)\n**Phase 3**: 监控告警系统 (10天)\n**Phase 4**: 集成测试与优化 (6天)',
 '["Go", "Vue 3", "Docker", "Kubernetes", "Prometheus", "Grafana", "PostgreSQL"]',
 'wangwu@example.com', 'wangwu_ops', 'approved', NOW()),

-- 4. 赵六 - 个人知识库
(@contest_id,
 (SELECT id FROM users WHERE username = 'zhaoliu'),
 '知识星球 KnowBase',
 '基于AI的个人知识管理与笔记系统',
 '# KnowBase 知识星球\n\n一款结合AI能力的现代化知识管理工具。\n\n## 核心功能\n\n### 智能笔记\n- Markdown编辑器，支持实时预览\n- 双向链接，构建知识图谱\n- AI自动生成摘要和标签\n\n### 知识检索\n- 全文搜索 + 语义搜索\n- AI问答，基于你的笔记回答问题\n\n### 多端同步\n- Web/桌面/移动端\n- 离线可用，自动同步',
 '## 实现路线\n\n1. **基础编辑器** - 2周\n2. **双向链接与图谱** - 1周\n3. **AI功能集成** - 2周\n4. **多端适配** - 1周',
 '["Next.js", "TipTap", "Prisma", "PostgreSQL", "OpenAI", "Electron", "React Native"]',
 'zhaoliu@example.com', NULL, 'submitted', NOW()),

-- 5. 孙七 - 短视频创作工具
(@contest_id,
 (SELECT id FROM users WHERE username = 'sunqi'),
 'ClipMaster 视频剪辑',
 '面向创作者的Web端视频剪辑工具',
 '## ClipMaster\n\n零门槛的Web端视频剪辑工具，让每个人都能轻松创作。\n\n### 产品特色\n\n- **纯浏览器运行**：无需下载安装，打开即用\n- **时间线编辑**：专业级多轨道时间线\n- **丰富素材库**：内置滤镜、转场、音乐\n- **AI字幕**：自动识别语音生成字幕\n- **一键导出**：支持多种分辨率和格式\n\n### 技术实现\n- 使用FFmpeg.wasm在浏览器端处理视频\n- WebCodecs API实现高性能解码\n- IndexedDB存储大文件素材',
 '### 开发里程碑\n\n| 阶段 | 内容 | 时间 |\n|------|------|------|\n| Alpha | 基础剪辑功能 | 3周 |\n| Beta | AI字幕+素材库 | 2周 |\n| RC | 性能优化+测试 | 1周 |',
 '["React", "FFmpeg.wasm", "WebCodecs", "IndexedDB", "TailwindCSS", "Zustand"]',
 'sunqi@example.com', 'sunqi_video', 'approved', NOW()),

-- 6. 周八 - 低代码平台
(@contest_id,
 (SELECT id FROM users WHERE username = 'zhouba'),
 'EasyPage 低代码平台',
 '拖拽式页面搭建，快速生成管理后台',
 '# EasyPage\n\n企业级低代码开发平台，通过可视化拖拽快速搭建管理系统。\n\n## 核心能力\n\n### 可视化搭建\n- 丰富的组件库（表单、表格、图表等）\n- 拖拽式页面编排\n- 实时预览效果\n\n### 数据源连接\n- 支持MySQL/PostgreSQL/API\n- 可视化数据建模\n- 自动生成CRUD接口\n\n### 逻辑编排\n- 流程图式业务逻辑\n- 内置常用函数库\n- 支持自定义JS代码\n\n## 应用场景\n- 企业内部管理系统\n- 数据看板Dashboard\n- 表单与流程审批',
 '### 项目计划\n\n**Sprint 1** (2周): 组件系统 + 画布编辑器\n**Sprint 2** (2周): 数据源管理 + API生成\n**Sprint 3** (2周): 逻辑编排 + 发布部署',
 '["Vue 3", "TypeScript", "Pinia", "Nest.js", "TypeORM", "MySQL", "Docker"]',
 'zhouba@example.com', 'zhouba_lowcode', 'approved', NOW()),

-- 7. 吴九 - 开源API网关
(@contest_id,
 (SELECT id FROM users WHERE username = 'wujiu'),
 'GateX API网关',
 '高性能、可扩展的云原生API网关',
 '## GateX - Cloud Native API Gateway\n\n专为微服务架构设计的高性能API网关。\n\n### 技术特性\n\n- **高性能**：基于Rust开发，单机10万QPS\n- **插件化**：Lua/WASM插件扩展能力\n- **服务发现**：原生支持K8s/Consul/Nacos\n- **流量管控**：限流、熔断、降级\n- **可观测性**：集成Prometheus/Jaeger\n\n### 与竞品对比\n\n| 特性 | GateX | Kong | APISIX |\n|------|-------|------|--------|\n| 语言 | Rust | Lua | Lua |\n| 性能 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |\n| 内存占用 | 低 | 高 | 中 |',
 '### Roadmap\n\n- [x] 核心代理功能\n- [ ] 插件系统 (进行中)\n- [ ] 管理控制台\n- [ ] K8s Operator\n- [ ] 文档完善',
 '["Rust", "Tokio", "Hyper", "WASM", "Lua", "Prometheus", "Kubernetes"]',
 'wujiu@example.com', NULL, 'approved', NOW()),

-- 8. 郑十 - 在线简历生成器
(@contest_id,
 (SELECT id FROM users WHERE username = 'zhengshi'),
 'ResumeForge 简历工坊',
 'AI驱动的在线简历生成与优化工具',
 '# ResumeForge 简历工坊\n\n让每个人都能拥有专业级简历。\n\n## 产品功能\n\n### 模板中心\n- 50+精选简历模板\n- 支持中英文简历\n- 一键切换模板样式\n\n### AI优化\n- 智能润色工作经历描述\n- 关键词优化建议\n- ATS兼容性检测\n\n### 导出分享\n- 高清PDF导出\n- 在线简历页面\n- 二维码分享\n\n## 商业模式\n- 基础功能免费\n- 高级模板和AI功能订阅制',
 '## 开发计划\n\n**第1周**: 模板系统搭建\n**第2周**: 编辑器开发\n**第3周**: AI功能集成\n**第4周**: 导出与分享\n**第5周**: 测试优化上线',
 '["Next.js", "React-PDF", "TailwindCSS", "Prisma", "PostgreSQL", "OpenAI API", "Stripe"]',
 'zhengshi@example.com', 'zhengshi_resume', 'submitted', NOW()),

-- 9. 小明 - 开源监控系统
(@contest_id,
 (SELECT id FROM users WHERE username = 'xiaoming'),
 'WatchDog 监控平台',
 '轻量级全栈应用监控与APM系统',
 '## WatchDog 监控平台\n\n为中小团队打造的轻量级监控解决方案。\n\n### 监控能力\n\n**基础设施监控**\n- 服务器CPU/内存/磁盘\n- 网络流量与连接数\n- Docker容器状态\n\n**应用性能监控(APM)**\n- 请求链路追踪\n- 慢查询分析\n- 错误日志聚合\n\n**业务监控**\n- 自定义指标上报\n- 业务大盘可视化\n\n### 告警通知\n- 支持邮件/钉钉/企微/飞书\n- 告警聚合与静默\n- 值班排班',
 '### 迭代计划\n\n**v0.1**: 基础采集与展示 (2周)\n**v0.2**: APM链路追踪 (2周)\n**v0.3**: 告警系统 (1周)\n**v1.0**: 正式发布 (1周)',
 '["Go", "ClickHouse", "React", "Grafana", "OpenTelemetry", "Prometheus"]',
 'xiaoming@example.com', 'xiaoming_monitor', 'approved', NOW()),

-- 10. 小红 - 社区问答系统
(@contest_id,
 (SELECT id FROM users WHERE username = 'xiaohong'),
 'AskHub 智能问答社区',
 '融合AI能力的开发者问答平台',
 '# AskHub 智能问答社区\n\n下一代开发者问答平台，让问题找到最佳答案。\n\n## 功能亮点\n\n### 智能问答\n- AI自动推荐相关问题\n- 智能标签分类\n- 答案质量评估\n\n### 社区运营\n- 声望与徽章系统\n- 专家认证机制\n- 悬赏问题\n\n### 开发者友好\n- Markdown + 代码高亮\n- 一键运行代码片段\n- GitHub集成\n\n## 与Stack Overflow的差异\n- 更现代的UI/UX\n- AI原生能力\n- 中文社区优先',
 '### 开发路线\n\n1. **核心功能** - 问答CRUD、用户系统 (2周)\n2. **社区功能** - 声望、徽章、通知 (2周)\n3. **AI功能** - 推荐、标签、摘要 (1周)\n4. **优化上线** - SEO、性能优化 (1周)',
 '["Next.js", "tRPC", "Prisma", "PostgreSQL", "Redis", "OpenAI", "Algolia"]',
 'xiaohong@example.com', 'xiaohong_askhub', 'approved', NOW());

-- ============================================================================
-- 验证数据
-- ============================================================================
SELECT '=== 用户数据 ===' AS '';
SELECT id, username, display_name, linux_do_username, trust_level FROM users ORDER BY id;

SELECT '=== 报名数据 ===' AS '';
SELECT r.id, u.display_name AS '选手', r.title AS '项目名称', r.status AS '状态'
FROM registrations r
JOIN users u ON r.user_id = u.id
WHERE r.contest_id = @contest_id
ORDER BY r.id;
