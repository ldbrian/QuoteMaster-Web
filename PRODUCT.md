# QuoteMaster — AI 外贸客户开发助手

## 产品概览

一款面向外贸业务员的 AI SaaS 工具，帮助业务员在 **1 分钟内** 完成客户价值分析、开发策略制定和开发信撰写。产品覆盖从**客户开发**到**跟单跟进**的全流程。

> **Slogan**: 判断一个客户是否值得开发，只需要 1 分钟

---

## 目标用户

- **外贸业务员**（Sales）— 开拓新客户，分析潜在客户价值，撰写开发信
- **跟单员**（Order Follow-up）— 跟进已有客户的订单进度、沟通记录
- **中小外贸企业** — 需要体系化客户管理但暂无 CRM 预算的团队

---

## 核心功能

### 1. 公司资料（Company DNA）

用户在首次使用时需完善公司资料，AI 据此进行个性化客户分析。

| 字段 | 必填 | 说明 |
|------|------|------|
| 公司名称 | ✅ | |
| 主营产品 | ✅ | 核心产品与品类 |
| 核心优势 | ✅ | 价格、认证、设计能力、交货速度等 |
| 目标客户类型 | ✅ | 批发商、品牌商、零售商等 |
| 目标市场 | ✅ | 北美、欧洲、东南亚等 |
| 不适合的客户 | ❌ | 过滤不匹配机会 |

- **引导模式**: AI 可引导用户一步步填写缺失字段
- **编辑模式**: 已完成后可随时修改
- **守卫**: `/home` 和客户分析功能都要求资料完善后才能使用

### 2. 客户开发（Opportunity/Sales）

#### 分析新客户
- 输入客户公司名称（必填）、网址、介绍、补充信息
- 调用 DeepSeek 进行 5 个维度的 AI 分析

#### 分析报告输出

| 模块 | 说明 |
|------|------|
| **结论摘要 (summary)** | 一句话总结（30字内），老板扫一眼就能判断 |
| **价值评分 (valueScore)** | 1-10 分，附带颜色标签（红/黄/绿） |
| **AI 洞察 (insight)** | 一个让业务员"没想到"的深度发现 |
| **客户画像 (buyerProfile)** | 公司规模、行业、市场、商业模式 |
| **产品匹配度 (productFit)** | HIGH / MEDIUM / LOW |
| **开发策略 (approachAngle)** | 具体切入角度与策略 |
| **风险提示 (risks)** | 潜在开发风险 |

#### 开发信生成
- 基于分析结果 + 公司资料，AI 生成针对性开发信
- 支持语气选择（professional / casual / direct）
- 支持自定义额外指令
- 历史版本可查阅

#### 转为跟单
- 分析报告底部提供"转为跟单"按钮
- 自动创建 BusinessThread，关联原 Opportunity

### 3. 跟单（Thread/Order Follow-up）

#### 跟单列表
- 状态标签筛选：需处理 / 待跟进 / 等待回复 / 已完成
- 卡片展示：公司名、优先级（左侧颜色条）、建议下一步操作、沟通数

#### 跟单详情
- **状态快速切换** — 点击即可变更状态
- **AI 建议操作** — 最近一次沟通分析得出的下一步建议
- **关联分析报告** — 如从机会转化而来，显示关联卡片
- **沟通记录时间线** — 按时间排序显示所有沟通

#### 添加沟通记录
- 手动粘贴邮件/聊天内容
- 选择来源（手动/Email/WhatsApp/WeChat）
- 提交后 AI 自动分析：
  - **意图**（intent）— 询价、打样、议价、催货等
  - **优先级**（priority）— high / medium / low
  - **状态建议**（status）— active / waiting / follow_up
  - **下一步操作**（nextAction）
  - **关键信息提取**（keyInfo）— 截止日期、数量、价格等

### 4. 反馈收集

用户可在分析报告底部对 AI 输出进行反馈：
- 分析是否有帮助（yes/no）
- 是否几乎没改就用了
- 数据存储在 Feedback 表，可关联到具体 Opportunity

---

## 用户流程

```
登录（邮箱/密码 or Google OAuth）
  │
  └─→ /home（工作台）
        │
        ├─→ 公司资料未完善 → /company-dna（引导填写）
        │
        └─→ 公司资料已完善 → 工作台
              │
              ├─→ 客户开发（业务员）
              │      ├── /opportunities ─ 机会列表
              │      ├── /opportunities/analyze ─ 分析新客户
              │      ├── /opportunities/[id] ─ 分析报告
              │      │       ├── 反馈（有帮助/没帮助）
              │      │       ├── 生成开发信 → /opportunities/[id]/outreach
              │      │       └── 转为跟单 → 创建 BusinessThread
              │      └── /opportunities/[id]/outreach ─ 开发信编辑
              │
              └─→ 跟单（跟单员）
                     ├── /threads ─ 跟单列表
                     └── /threads/[id] ─ 跟单详情
                            ├── 状态切换
                            ├── AI 建议操作
                            ├── 沟通记录时间线
                            ├── 添加记录（粘贴文本 → AI 分析）
                            └── 关联机会分析报告
```

---

## 技术架构

### 前端
- **框架**: Next.js 16.1.6 (App Router)
- **UI 库**: React 19.2.3
- **样式**: Tailwind CSS 4
- **图标**: Lucide React

### 后端
- **数据库 ORM**: Prisma 7 + PostgreSQL（Supabase）
- **认证**: Supabase Auth（登录/注册/GitHub 代理到服务端）
- **AI**: DeepSeek API（deepseek-chat 模型）
- **运行时**: Node.js (Edge-ready via Next.js)

### 认证策略
- Supabase 在中国大陆浏览器端被墙（`xmrnwjgsalemcrekmlus.supabase.co`）
- 登录/注册通过 `/api/auth/login`、`/api/auth/signup` 服务端代理
- 客户端通过 `supabase.auth.setSession()` 恢复会话
- 服务端通过 `requireAuthenticatedUser()` 校验 Bearer token

### AI 调用
- 所有 AI 调用走 `src/utils/deepseek/client.ts`（OpenAI SDK 封装）
- 调用完成后写入 `PromptLog` 表记录 Prompt + 耗时（方便后续调试）
- 不设流式输出（简化实现）

---

## 数据模型（Prisma Schema）

### CompanyProfile
用户公司资料，与用户一对一。

### Opportunity
客户分析机会，包含 AI 分析结果（buyerProfile, productFit, valueScore, approachAngle, risks, insight, summary）。

### EmailDraft
针对某机会生成的开发信草稿，支持多版本。

### Feedback
用户对 AI 分析的反馈（helpful/editedEmail/sent/comment）。

### BusinessThread
跟单线程，从 Opportunity 转化或手动创建。包含 AI 建议的 status/priority/nextAction/context。

### Communication
跟单线程中的沟通记录，附带 AI 分析的 extractedSignals（JSON）。

### PromptLog
所有 AI 调用的日志，用于调试和成本追踪。

---

## API 路由

| 路径 | 方法 | 描述 |
|------|------|------|
| `/api/auth/login` | POST | 邮箱密码登录（服务端代理） |
| `/api/auth/signup` | POST | 邮箱密码注册 |
| `/api/company-profile` | GET/PUT | 公司资料 CRUD |
| `/api/opportunities` | GET/POST | 机会列表 / 创建并分析 |
| `/api/opportunities/[id]` | GET/DELETE | 机会详情 / 删除 |
| `/api/opportunities/[id]/outreach` | GET/POST | 开发信列表 / 生成 |
| `/api/feedback` | POST | 提交反馈（upsert） |
| `/api/threads` | GET/POST | 跟单列表 / 创建 |
| `/api/threads/[id]` | GET/PATCH | 跟单详情 / 更新状态 |
| `/api/threads/[id]/communicate` | POST | 添加沟通 + AI 分析 |
| `/api/health/deployment` | GET | 部署健康检查 |

---

## 页面清单

| 路由 | 页面 | 描述 |
|------|------|------|
| `/` | Landing Page | 产品介绍，引导登录 |
| `/login` | Login Page | 邮箱登录/注册 + Google OAuth |
| `/home` | 工作台 | 公司资料守卫 + 模块选择 |
| `/company-dna` | 公司资料 | 编辑公司信息 + AI 引导 |
| `/opportunities` | 机会列表 | 所有客户分析记录 |
| `/opportunities/analyze` | 分析新客户 | 输入客户信息表格 |
| `/opportunities/[id]` | 分析报告 | 咨询报告风格详情页 |
| `/opportunities/[id]/outreach` | 开发信 | AI 生成 + 多版本切换 |
| `/threads` | 跟单列表 | 状态标签筛选 |
| `/threads/[id]` | 跟单详情 | 沟通记录 + AI 分析 |

---

## 当前状态

### 已完成
- ✅ 用户注册/登录（邮箱 + Google OAuth）
- ✅ 公司资料管理（6 个字段，5 必填）
- ✅ 客户 AI 分析（5 维度 + 洞察 + 结论摘要）
- ✅ 分析报告展示（咨询报告风格）
- ✅ 开发信 AI 生成（支持多版本/语气/自定义指令）
- ✅ 跟单管理（5 种状态流转）
- ✅ 沟通记录捕获 + AI 意图分析
- ✅ 反馈收集（upsert 模式）
- ✅ Prompt 日志（所有 AI 调用可追溯）
- ✅ 全局错误处理（try-catch + 错误提示 UI）
- ✅ 中国大陆网络适配（认证 API 代理）

### 已知问题
- ❌ 无邮件发送能力（生成开发信后需用户自行复制到邮箱发送）
- ❌ 无自动数据爬取（需要用户手动输入客户信息）
- ❌ 无团队协作（单用户模式）
- ❌ 无 LinkedIn / WhatsApp 集成
- ❌ 无订单/合同管理

---

## 下一步建议

### 短期（MVP 打磨）

1. **跟单空列表引导**
   - 当前跟单列表为空时，仅显示"暂无跟单记录"；可增加从机会转化的快捷入口

2. **开发信复制体验优化**
   - 增加"一键复制"的视觉反馈（当前已有 Copy 按钮但 UX 一般）
   - 可考虑增加 Inbox 风格预览

3. **数据持久化确认**
   - 确认 Supabase 数据库的备份策略
   - 添加定期数据清理机制（PromptLog 表会快速增长）

4. **用户 onboarding**
   - 注册后首次登录增加引导蒙层或步骤条

5. **错误监控**
   - 接入 Sentry 或类似错误监控服务

### 中期（功能增强）

6. **邮件发送集成**
   - 接入 SendGrid / Resend 等邮件发送服务
   - 直接在应用内发送开发信

7. **多语言支持**
   - 开发信支持日语、德语、法语等
   - 分析报告支持英文版

8. **客户管理**
   - 增加客户列表/搜索/标签功能
   - 关联多次分析和跟单

9. **数据导出**
   - 导出开发信为 PDF
   - 导出客户分析报告

10. **团队协作**
    - 多账号共享公司资料
    - 权限分离（业务员 vs 跟单员 vs 管理者）

### 长期（平台化）

11. **LinkedIn 集成**
    - Chrome 扩展一键导入 LinkedIn 客户信息
    - 自动分析 LinkedIn Profile

12. **海关数据集成**
    - 接入海关数据 API，自动验证客户进口记录

13. **AI 模型微调**
    - 用 Feedback + PromptLog 数据微调行业专有模型
    - 开发信 A/B 测试

14. **BI / 数据分析看板**
    - 机会转化漏斗
    - 跟单效率分析
    - AI 分析质量看板

15. **订阅付费**
    - 按分析次数/月收费
    - 免费额度限制
