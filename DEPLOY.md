# JobPilot 线上部署指南（Render 免费方案）

按此流程部署后，任何拿到网址的人都能在浏览器里体验完整产品流程：数据保存在访客自己的浏览器中，模型 API 由访客自行配置（仅存在访客浏览器里，服务器转发不保存）。

## 一、准备 GitHub 仓库

1. 注册/登录 [GitHub](https://github.com)。
2. 新建一个仓库（Public 或 Private 均可），例如 `jobpilot`。
3. 在本项目根目录执行：

```bash
git init
git add .
git commit -m "JobPilot public demo"
git branch -M main
git remote add origin https://github.com/<你的用户名>/jobpilot.git
git push -u origin main
```

> `.gitignore` 已排除 `.jobpilot-api-config.json`，不会把本机密钥推上去。仓库里的 `render.yaml` 会让 Render 自动完成配置。

## 二、在 Render 上部署

1. 注册/登录 [Render](https://render.com)（可用 GitHub 账号直接登录）。
2. 首页点 **New → Blueprint**，选择刚才的仓库。Render 会读取 `render.yaml`：
   - 运行环境：Node
   - 启动命令：`node server.js`
   - 环境变量：`PUBLIC_MODE=1`（公网模式：服务端不保存任何 API Key，`/api/config` 写接口关闭，带简单限流）
3. 确认套餐为 **Free**，点击部署。约 1–2 分钟后会得到一个网址：
   `https://jobpilot-xxxx.onrender.com`（自带 HTTPS，可直接分享）。
4. 以后每次 `git push`，Render 会自动重新部署。

## 三、绑定自己的域名（可选）

Render 控制台 → 你的服务 → **Settings → Custom Domains**，按提示在域名 DNS 里加一条 CNAME 记录即可，HTTPS 证书由 Render 自动签发。

## 四、需要让访客知道的事

- **数据在哪**：投递记录、简历文件都保存在访客自己浏览器的 localStorage / IndexedDB 里，换浏览器或清缓存数据就没有了；不同访客之间互不可见。
- **模型 API**：访客在"配置大模型 API"里填自己的 OpenAI 兼容接口（如 DeepSeek、通义、OpenAI 等）。Key 只存在访客浏览器中，请求时经服务器转发，服务器不保存、不记录。
- **简历解析**：PDF 在访客浏览器内解析（PDF.js），TXT/Word 也在浏览器内解析，简历文件本身不会上传到服务器。
- **JD 截图识别**：线上环境使用访客自己配置的、支持图片理解的模型来识别。

## 五、已知限制

- Render 免费套餐**闲置约 15 分钟会休眠**，再次访问首次加载需等 30–60 秒唤醒；如需常驻可升级付费套餐（约 $7/月）。
- 海外节点，国内访问速度取决于访客网络；如主要面向国内用户，后续可迁移到国内云（需自有备案域名）。
- 免费实例的磁盘是临时的——本项目用户数据都在浏览器端，不受影响；但请勿在公网模式下依赖服务端存任何状态。
- 公网模式已加简单限流（每 IP 每 10 分钟 40 次 AI 相关请求），但仍建议不要在高流量场合公开发布后长期不管；如发现滥用可在 Render 控制台一键下线。

## 六、本地继续开发

```bash
node server.js          # 本机模式：http://127.0.0.1:4174/，服务端可保存本机 API 配置
PUBLIC_MODE=1 node server.js   # 模拟线上公网模式，监听 0.0.0.0
```

改动后请运行 `node --check app.js && node --check server.js` 做语法检查。
