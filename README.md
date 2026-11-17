# JobPilot · 面试进度助手

让每一次求职进展，都有迹可循。

JobPilot 是一个**本地优先（local-first）**的求职与面试管理 Web 应用：从简历建立个人档案，集中管理投递记录、面试安排与复盘反馈，并可借助你自己配置的大模型生成求职匹配分析。

## 快速体验（访客指南）

线上地址：**https://jobpilot-bvks.onrender.com**

> 首次打开如需等待 30–60 秒，是免费服务器从休眠中唤醒，属正常现象，之后即恢复流畅。

1. **创建工作台**：打开网址，上传简历（PDF / Word / TXT），填写目标岗位。简历在你的浏览器内解析，文件不会上传到服务器。
2. **配置模型 API**：点击"配置大模型 API"，填入你自己的 Key。推荐 [DeepSeek](https://platform.deepseek.com)：服务地址 `https://api.deepseek.com`，模型 `deepseek-chat`，注册后充值几元即可体验。Key 只保存在你自己的浏览器中，服务器仅转发、不存储。
3. **记录投递**：在总览页点击"＋ 记录新投递"，填写公司、岗位，并粘贴岗位 JD 文本。
4. **生成分析**：进入"求职分析"页，点击"✳ 生成求职分析"，稍等片刻即可得到基于你简历与投递记录的匹配报告。

每位访客的数据仅保存在**自己浏览器**的本地存储中，彼此完全隔离；清除浏览器缓存或更换浏览器后数据不会保留。

## 功能

- **简历建档**：上传 PDF / Word / TXT 简历，自动提取姓名、学历、技能等基本信息（可直接在浏览器内解析，文件不上传服务器）
- **投递管理**：记录公司、岗位、行业方向、岗位 JD（支持截图识别文字），跟踪面试阶段
- **面试日历**：月视图查看面试安排，按日管理时间、地点与会议链接
- **求职分析**：基于简历、JD、面试反馈生成逐公司的匹配报告（调用你自己配置的大模型）
- **管道漏斗**：总览页按阶段展示机会分布，点击即可筛选

## 隐私设计

- 投递记录与个人档案保存在**访客自己浏览器**的 localStorage（`jobpilot-user-v1`）
- 简历文件与 JD 截图保存在浏览器 IndexedDB（`offerly-files`）
- 模型 API Key 只保存在访客浏览器中；调用 AI 功能时经服务器**转发且不保存**
- 发送给模型的内容经过脱敏（姓名、电话、邮箱、证件号等会被过滤）

## 技术栈

原生 HTML / CSS / JavaScript，无前端框架、无构建步骤；服务端为 Node.js 内置 HTTP 模块，零第三方依赖（Node ≥ 18）。PDF 浏览器端解析使用 PDF.js（CDN 引入）。

## 本地运行

```bash
node server.js
# 打开 http://127.0.0.1:4174/
```

本机模式下模型配置可保存在服务端 `.jobpilot-api-config.json`（已被 .gitignore 排除）；简历 PDF 解析与 JD 截图 OCR 在 macOS 上另有 Swift / `textutil` 本机加速。

## 线上部署

仓库包含 `render.yaml`，可在 [Render](https://render.com) 上一键 Blueprint 部署（免费套餐，自动 HTTPS）。公网模式（`PUBLIC_MODE=1`）下服务端不保存任何 API Key，并带有简单限流。详细步骤见 [DEPLOY.md](DEPLOY.md)。

## 目录结构

| 文件 | 说明 |
| --- | --- |
| `index.html` / `app.js` | 页面骨架与全部前端逻辑 |
| `server.js` | 静态服务、模型代理、简历解析、OCR 接口 |
| `styles.css` / `nav.css` / `dashboard.css` / `applications.css` / `ai.css` / `mobile-app.css` / `stitch-theme.css` | 各区域样式与响应式布局 |
| `resume.swift` / `ocr.swift` | macOS 本机简历解析与图片 OCR |
| `design-system/` / `DESIGN.md` | 设计令牌与视觉规范 |
| `DEPLOY.md` | 线上部署指南 |

## 说明

本项目为产品原型：没有云端账号体系，数据不与任何服务器同步，换浏览器或清除缓存后数据不会保留。更多背景见 [DEEPSEEK_HANDOFF.md](DEEPSEEK_HANDOFF.md) 与 [AGENTS.md](AGENTS.md)。
