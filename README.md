# AI 销售顾问助手

国际教育语言培训行业的 AI 销售顾问助手：通过上传微信聊天截图或粘贴聊天文字，AI 结合语言考试专业知识、销售理论和顾问个人表达风格，生成自然、专业、可直接发送的微信回复，并随使用持续学习顾问的个人风格。

> 当前进度：**第二阶段（微信截图 AI 识别）已完成**——豆包视觉模型服务层、多图合并去重、发言方识别、人工纠错与结构化落库均已实现并实测通过；待配置 `ARK_API_KEY` 后即可用真实截图进行端到端识别。

## 技术栈

- 前端：Next.js 15（App Router）+ React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- 后端：Next.js Route Handlers + Node.js + Zod
- 数据库：PostgreSQL 16/17 + Prisma 7 ORM（驱动适配器模式）
- AI 检索：PostgreSQL + pgvector（向量列已就绪，RAG 于第五阶段启用）
- 认证：HttpOnly Cookie（jose 签名 JWT）+ 数据库会话记录
- 文件存储：开发环境本地私有目录（`storage/screenshots`，已 gitignore）

## 目录结构

```
ai-sales-advisor/
├── prisma/
│   ├── schema.prisma          # 完整数据库 Schema（14 张业务表 + 会话表）
│   ├── migrations/            # 迁移文件
│   └── seed.ts                # 管理员账号种子脚本
├── prisma.config.ts           # Prisma 7 配置（迁移直连 + 种子命令）
├── src/
│   ├── app/
│   │   ├── (app)/             # 已登录区域（5 个主页面）
│   │   │   ├── page.tsx       # AI 回复（截图上传）
│   │   │   ├── customers/     # 客户记录
│   │   │   ├── style/         # 我的风格
│   │   │   ├── knowledge/     # 知识库
│   │   │   └── settings/      # 设置（账号、系统状态、改密）
│   │   ├── (auth)/            # 登录 / 注册
│   │   └── api/               # 服务端接口
│   ├── components/            # 布局、上传、表单等组件
│   ├── lib/                   # db / auth / api / env / storage / audit / password
│   ├── generated/prisma/      # Prisma Client（运行时生成，勿提交）
│   └── middleware.ts          # 路由保护（API 401 / 页面跳转）
└── storage/screenshots/       # 受保护截图存储（开发环境，勿提交）
```

## 环境要求

- Node.js ≥ 20
- PostgreSQL 16/17（含 pgvector 扩展，RAG 阶段使用）
- npm ≥ 10

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填写 DATABASE_URL 和 SESSION_SECRET

# 3. 初始化数据库（需先启动 PostgreSQL 并启用 pgvector）
npm run db:migrate      # 创建并应用迁移
npm run db:seed         # 创建管理员账号（输出初始密码）

# 4. 启动开发服务
npm run dev             # http://localhost:3000

# 5. 生产构建与启动
npm run build
npm run start
```

## 数据库初始化

```bash
# 创建数据库（示例：PostgreSQL 17）
psql -d postgres -c "CREATE ROLE sales_advisor WITH LOGIN PASSWORD 'your-password' CREATEDB;"
psql -d postgres -c "CREATE DATABASE sales_advisor OWNER sales_advisor;"
psql -d sales_advisor -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 应用迁移与种子
npm run db:migrate
npm run db:seed
```

`prisma.config.ts` 会自动加载 `.env`；迁移通过 `datasource.url` 直连数据库。

## 火山方舟豆包模型配置（第二、三阶段）

在 `.env` 中配置以下变量（密钥仅存服务端，前端不暴露）：

```
ARK_API_KEY=your-api-key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_TEXT_MODEL=your-text-model-endpoint
ARK_VISION_MODEL=your-vision-model-endpoint
ARK_EMBEDDING_MODEL=your-embedding-model-endpoint
```

配置完成后，`/api/health` 与「设置」页会显示 AI 已配置。
截图识别（`/api/screenshots/analyze`）使用 OpenAI 兼容 Chat Completions 接口，
多张截图以 Base64 data URL 一次性传入视觉模型（`detail=high` 保证文字清晰），
模型输出经 JSON Schema 校验，非法输出自动带错重试一次。

## API 接口（已实现）

| 接口 | 说明 |
| --- | --- |
| POST /api/auth/login、logout、GET /api/auth/me | 账号会话 |
| POST /api/screenshots/upload | 截图上传（校验 + 受保护存储） |
| POST /api/screenshots/analyze | 截图 AI 识别（多图合并去重、发言方识别、结构化落库） |
| GET /api/screenshots | 当前用户截图列表 |
| GET /api/conversations、GET /api/conversations/:id | 识别对话列表 / 详情 |
| PATCH /api/conversations/:id/messages/:mid | 人工纠错（改发言方/内容，标记已人工修正） |
| DELETE /api/conversations/:id/messages/:mid | 删除错误消息 |
| GET /api/health | 健康检查（DB + AI 配置状态） |
| POST /api/settings/password | 修改密码 |

## 知识库初始导入（第五阶段）

支持人工添加、上传 PDF/DOCX/TXT/Markdown 并解析正文建立检索索引；
`KnowledgeChunk.embedding` 使用 pgvector 向量，配合关键词检索实现 RAG。
首版人工维护，不做自动爬取；未配置自动更新时页面会明确提示。

## 测试

```bash
npm run lint          # ESLint
npm run build         # 类型检查 + 生产构建
npm run db:seed       # 幂等种子脚本
npm run test:logic    # 第二阶段核心逻辑测试（JSON 解析/校验/去重合并/时间解析）
```

第一阶段已通过的真实测试（curl 实测）：
- 注册 / 重复注册（409）/ 登录 / 错误密码（401）/ 当前用户
- 未登录访问页面 → 跳转登录；未登录调用 API → 401 JSON
- 截图上传：有效 PNG（201）、多图、伪造扩展名（415）、类型不符（415）、超过 10MB（413）
- 文件落入私有目录（按用户隔离），`/storage/` 公开路径不可达（404）
- 登出后会话失效（401）；数据库落库与审计日志验证

第二阶段已通过的真实测试：
- 核心逻辑单测：JSON 容错解析（裸/围栏/夹杂文字/非法）、Schema 校验、相邻重复合并、
  乱序重建、时间解析、角色映射 —— 11 项断言全部通过
- API 实测（独立测试账号 + 真实服务层落库）：对话列表/详情按序返回、识别元数据保存、
  纠错 PATCH（角色+内容修改 → manuallyCorrected=true）、删除消息、
  跨账号隔离（admin 访问测试对话 → 404）、未配置 AI 时 analyze 返回明确 503 提示
- 截图识别完整链路（视觉模型调用 + 真实截图识别）待用户提供 ARK_API_KEY 后执行
- **无 Key 体验识别流程**：`.env` 中 `ARK_MOCK_VISION=true` 时，
  上传截图点「开始识别」返回明确标注的模拟结果（`mock-vision-fixture`，界面显示警示横幅），
  可完整体验 上传→去重合并→结构化展示→人工纠错 流程；配置真实 Key 后必须将该值置空

## 部署说明

1. 服务器安装 Node.js 20+、PostgreSQL，按「数据库初始化」建库并执行 `npm run db:migrate`
2. 设置生产环境变量：`DATABASE_URL`、`SESSION_SECRET`（强随机 ≥ 32 位）、`NODE_ENV=production`
3. 生产存储建议替换为私有对象存储（代码中 `src/lib/storage.ts` 已按目录抽象，替换实现即可）
4. 构建并启动：`npm run build && npm run start`（建议使用 PM2 / systemd 守护）
5. HTTPS：通过 Nginx/Caddy 反向代理 + Let's Encrypt 证书；Cookie 自动启用 `Secure`
6. 数据备份：`pg_dump` 定时任务；迁移前先备份

## 常见问题

| 问题 | 原因与解决 |
| --- | --- |
| `DATABASE_URL 未配置` | 检查 `.env`；`prisma.config.ts` 与 Next.js 都会读取它 |
| 迁移报 shadow database 权限 | 数据库角色需要 `CREATEDB`（`ALTER ROLE ... CREATEDB`） |
| `extension "vector" is not available` | 未安装 pgvector，或版本与 PostgreSQL 不匹配（brew 需同源安装） |
| 上传 10MB 以上被拦截 | 中间件克隆请求体默认上限 10MB，已在 `next.config.ts` 调至 25MB；单文件仍限 10MB |
| 构建期 Google Fonts 报错 | 本项目已改用系统字体栈，不依赖外网字体 |
| 页面显示「AI 未配置」 | 属正常：第二、三阶段接入豆包模型后显示已配置 |

## 阶段进度

- [x] 第一阶段：基础工程——项目、数据库、迁移、登录、权限隔离、响应式界面、受保护截图上传
- [x] 第二阶段：微信截图 AI 识别——豆包视觉服务层、多图合并去重、发言方识别、人工纠错、结构化落库（待 ARK_API_KEY 配置后进行真实截图端到端识别）
- [ ] 第三阶段：AI 回复生成（豆包文本模型、意图分析、咨询阶段判断、风格切换、流式输出）
- [ ] 第四阶段：个人风格学习（批量导入、风格画像、相似案例检索、编辑差异学习）
- [ ] 第五阶段：知识库与客户记忆（考试知识录入、RAG 检索、客户档案与摘要）
- [ ] 第六阶段：测试与正式部署（性能、安全、备份、HTTPS）
