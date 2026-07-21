# 部署指南

本项目有两类部署方式，按需选择：

| 方式 | 适用场景 | 可展示内容 |
| --- | --- | --- |
| **GitHub Pages**（本文重点） | 免费、纯静态、无需服务器 | Hub + 四个概览页 + S2Pref 交互演示 |
| **自有服务器 + `run_all.py`** | 需要全部交互演示可用 | 全部内容（含三个 Flask 演示） |

---

## ⚠️ GitHub Pages 的能力边界

GitHub Pages **只能托管纯静态文件**（HTML / CSS / JS / 图片），不能运行 Python、Node 后端。本仓库里：

- ✅ **可静态展示**
  - `site/` — Hub 首页 + 四个论文概览页（纯 HTML/CSS）。
  - `safe_v2/dist/` — S2Pref 交互演示（React SPA 预构建产物，对话走预置脚本，**不依赖后端**）。
- ⚠️ **无法在 Pages 上运行**
  - `PAMDP_demo/`、`D2PCM_demo/`、`Thinking_demo/` — 三个 Flask 应用，需要 Python 后端。
  - 在 Pages 上，Hub 里这三个论文的「📄 论文概览」页可正常查看，但「▶ 交互演示」按钮会 404。

> 若需三个 Flask 演示也在线可用，请用文末的「自有服务器」方案。

---

## 一、部署到 GitHub Pages

### 方式 A：手动构建 + 推送 `dist`（最简单）

适合不熟悉 CI、只需一次部署的情况。

#### 1. 初始化仓库并提交

```bash
cd paperPresentation
git init
git add .
git commit -m "init: paper presentation"
```

> 确认 `.gitignore` 已排除 `.env*`、`node_modules/`、`__pycache__/`、`.omc/`。
> `safe_v2/dist/` 是已构建产物，**需要提交**（GitHub Pages 直接托管它）。

#### 2. 在 GitHub 创建仓库并推送

在 github.com 新建仓库（例如 `paper-presentation`），然后：

```bash
git remote add origin https://github.com/<你的用户名>/paper-presentation.git
git branch -M main
git push -u origin main
```

#### 3. 开启 GitHub Pages

进入仓库 **Settings → Pages**：

- **Source** 选 `Deploy from a branch`
- **Branch** 选 `main`，文件夹选 `/ (root)`
- 保存

等待 1~2 分钟，访问：

```
https://<你的用户名>.github.io/paper-presentation/
```

由于 `site/index.html` 在仓库根、`safe_v2/dist/` 在子目录，但 Hub 里的链接写的是 `s2pref/`，需要让 Pages 把 `/s2pref/` 指向 `safe_v2/dist/`。两种做法二选一：

**做法 1（推荐）：把 safe_v2/dist 复制到根的 s2pref/ 目录**

```bash
# 在仓库根执行
# Windows PowerShell
Copy-Item -Recurse safe_v2\dist s2pref
# Linux / macOS
cp -r safe_v2/dist s2pref
git add s2pref
git commit -m "add s2pref static dir for pages"
git push
```

之后 `https://<用户名>.github.io/paper-presentation/s2pref/` 即为 S2Pref 演示。

**做法 2：用 GitHub Actions 构建时重命名**（见方式 B）

#### 4. 处理三个 Flask 演示的链接

Hub 里 `/pamdp/`、`/d2pcm/`、`/thinking/` 在 Pages 上不存在。两个选择：

- **保留概览页，去掉交互入口**：编辑 `site/index.html`，把这三个卡片里的 `▶ 交互演示` 按钮删除或改为指向「需本地运行」的说明。
- **或**：保留按钮，用户点击后会 404（体验稍差，但不破坏源码）。

---

### 方式 B：用 GitHub Actions 自动构建（推荐长期维护）

每次推送 `main` 自动重新构建并部署。

在仓库创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: safe_v2/package-lock.json

      - name: Build safe_v2 SPA
        working-directory: safe_v2
        run: |
          npm ci
          npm run build

      - name: Assemble site
        run: |
          # Pages 根 = site/（Hub + 概览页）
          cp -r site _site
          # 把 S2Pref SPA 放到 /s2pref/ 下，匹配 Hub 里的链接
          cp -r safe_v2/dist _site/s2pref

      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

然后：

1. 推送到 `main`。
2. **Settings → Pages → Source** 选 `GitHub Actions`。
3. 等待 Action 完成，访问 `https://<用户名>.github.io/paper-presentation/`。

> 注意：`safe_v2` 的 `vite.config.ts` 未设 `base`，但 `dist/index.html` 用的是相对路径 `./assets/...`，所以在 `/s2pref/` 子路径下能正常加载资源，无需改 `base`。

---

## 二、部署到自有服务器（全部演示可用）

三个 Flask 演示需要 Python 运行环境。

### 1. 安装依赖

```bash
pip install flask httpx
# 生产 WSGI 服务器（可选，推荐）
pip install waitress
```

### 2. 一键启动（单端口 8888）

```bash
GATEWAY_HOST=0.0.0.0 GATEWAY_PORT=8888 python run_all.py
```

`GATEWAY_HOST=0.0.0.0` 让外部可访问。

### 3. 生产级 WSGI（推荐）

`gateway.py` 暴露了标准 WSGI 对象 `app`：

```bash
waitress-serve --host=0.0.0.0 --port=8888 gateway:app
```

或用 gunicorn（Linux）：

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8888 gateway:app
```

### 4. 在线 LLM 模式（可选）

启动前配置环境变量，三个 Flask 演示的「在线 LLM」即自动可用；未配置则全程脚本模式：

```bash
export OPENAI_BASE_URL=http://localhost:11434/v1   # 本地 Ollama，无需 key
export OPENAI_MODEL=qwen2.5:7b
# 或连接云厂商：
export OPENAI_BASE_URL=https://api.deepseek.com/v1
export OPENAI_API_KEY=sk-xxx                        # 你自己的 key
export OPENAI_MODEL=deepseek-chat
```

### 5. 反向代理（可选）

若用 Nginx 转发到 8888：

```nginx
server {
    listen 80;
    server_name your.domain.com;
    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 三、部署前检查清单

- [ ] `.gitignore` 已排除 `.env*`、`node_modules/`、`__pycache__/`、`.omc/`
- [ ] `git status` 中没有 `.env` / `.env.local` 等真实密钥文件
- [ ] 代码内无硬编码 API key（仅 `.env.example` 占位符）
- [ ] `safe_v2/dist/` 已构建（GitHub Pages 直接托管它）
- [ ] 若用 Pages：已把 SPA 放到 `/s2pref/` 路径下匹配 Hub 链接
