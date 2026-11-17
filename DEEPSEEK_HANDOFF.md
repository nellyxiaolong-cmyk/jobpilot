# JobPilot 项目交接说明

## 项目目标

JobPilot 是一个本地优先的求职与面试管理 Web 原型。求职者可记录投递公司、岗位、面试阶段、安排及反馈，并查看面试日历、求职分析和管道漏斗概览。

## 技术与启动

- 前端：原生 HTML、CSS、JavaScript，无 React/Vue 等框架。
- 服务端：Node.js 内置 HTTP 模块，无 npm 第三方依赖。
- 启动：在项目根目录运行 `node server.js`。
- 访问：`http://127.0.0.1:4174/`。
- 建议 Node.js 18 或更新版本。
- 本项目没有构建步骤，也没有 `package.json`。
- PDF/Word 解析及 OCR 依赖 macOS 的 Swift、`textutil` 等系统能力；移到 Linux/Windows 后需单独适配。

## 主要文件

- `index.html`：应用页面骨架、导航、页面容器、弹窗与表单入口。
- `app.js`：页面渲染、表单交互、投递/面试/日历/档案逻辑、浏览器数据存取、模型调用。
- `server.js`：本机静态文件服务、模型代理、简历解析、图片识别和模型配置接口。
- `styles.css`、`nav.css`、`applications.css`、`dashboard.css`、`ai.css`、`mobile-app.css`：各区域视觉样式与响应式布局。
- `stitch-theme.css`、`design-system/`、`DESIGN.md`：视觉主题、设计令牌与设计参考。
- `resume.swift`、`ocr.swift`：macOS 简历文字提取和图片 OCR 辅助程序。

## 现有功能概览

- 简历与目标岗位入门流程、“我的”个人信息档案。
- 投递记录、面试轮次/时间/方式/地址或链接、面试反馈及编辑/删除。
- 面试日历、总览页、求职分析和阶段漏斗筛选。
- 岗位 JD 文本及截图识别。
- OpenAI 兼容 Chat Completions API 配置和服务端代理。

## 数据与隐私边界

- 投递和个人档案保存在浏览器 `localStorage`，键为 `jobpilot-user-v1`。
- 简历文件及 JD 图片保存在浏览器 IndexedDB：数据库 `offerly-files`，对象仓库 `files`。
- 本机 API 配置保存在项目根目录 `.jobpilot-api-config.json`。此文件包含 API Key，已从交接包中排除，接手后需在目标环境重新配置。
- 浏览器数据不会包含在本压缩包中。不同浏览器、设备和来源地址各自拥有独立的 `localStorage`/IndexedDB；从 `file://` 切换到 localhost 或线上域名时，原数据不会自动出现。迁移前必须先制定并验证备份/导入方案。
- 线上部署前必须增加登录认证、API 限流和服务端密钥保护。当前 `/api/config` 写接口没有认证，不可原样暴露到公网。
- 个人简历、公司、岗位与面试反馈都属于敏感数据；如要更换模型服务或扩大数据发送范围，先征得用户同意并明确外发字段。

## 接手优先事项

1. 先阅读 `AGENTS.md`、本文件和 `app.js`/`server.js`，不要先重构。
2. 确认用户希望继续本地单机使用，还是迁移到可登录、跨设备的线上产品。
3. 若继续线上化，先设计身份认证、用户隔离的数据存储、数据导出/恢复和 API Key 管理，再处理部署。
4. 保持原有功能与视觉习惯；按具体需求做小范围改动。
5. 修改后至少运行 `node --check app.js` 和 `node --check server.js`；涉及 UI 或真实模型链路时，另行进行浏览器交互验证，并如实报告验证范围。

## 当前已知限制

- 这是原型，不是多用户生产系统；目前没有云端账户、数据库或用户间数据隔离。
- `file://` 页面无法调用 `/api/...` 本机接口；模型、PDF/Word 服务端解析需要通过 HTTP 服务访问。
- 本机配置文件不会随压缩包传递；浏览器里的个人资料、投递记录和简历文件也不会随代码包传递。
