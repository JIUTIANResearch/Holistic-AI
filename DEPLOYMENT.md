# 部署指南

本项目为**纯静态站点**（HTML/CSS/JS），无 Python/Node 后端依赖。站点以 [`site/papers.json`](site/papers.json) 为数据源驱动渲染。

| 方式 | 适用场景 | 说明 |
| --- | --- | --- |
| **GitHub Pages**（推荐） | 免费、自动部署 | 推送 `main` 即由 GitHub Actions 自动构建发布 |
| **自有服务器** | 需自定义域名/端口 | 用 `gateway.py`（WSGI）或任意静态服务器 |

---

## 一、部署到 GitHub Pages（自动）

仓库已含 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)，推送 `main` 即触发：组装 `site/` + `demos/` 为静态站点并发布。

### 首次部署

1. 推送代码到 GitHub 仓库的 `main` 分支。
2. 进入仓库 **Settings → Pages**：
   - **Source** 选 `GitHub Actions`。
3. 等待 Action 完成（Actions 标签页可查看进度），访问：

```
https://<组织或用户>.github.io/<仓库名>/
```

本仓库当前部署在：`https://jiutianresearch.github.io/Holistic-AI/`

### 站点结构

Pages 根目录 = `site/`，交互演示挂载在 `/demos/`：

```
/                           首页（按年代分组，数据驱动）
/paper.html?id=<论文id>     论文概览页（单模板，从 papers.json 渲染）
/demos/papers/<abbr>/       交互演示（纯静态）
```

### 加论文后的部署

加论文只改 `site/papers.json`（+ 配图 + 可选的概览片段/演示目录），推送 `main` 即自动重新部署，无需改 workflow。

---

## 二、部署到自有服务器

### 静态托管（最简）

任意静态文件服务器，把 `site/` 作为根、`demos/` 放到 `site/demos/`（或分别托管并保持相对路径）即可。

### 用 gateway.py（单端口）

`gateway.py` 暴露标准 WSGI 对象 `app`，把 Hub 与演示挂到同一端口：

```bash
pip install flask waitress
waitress-serve --host=0.0.0.0 --port=8888 gateway:app
```

或一键启动（自动开浏览器）：

```bash
GATEWAY_HOST=0.0.0.0 GATEWAY_PORT=8888 python run_all.py
```

Linux 下可用 gunicorn：

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8888 gateway:app
```

### 反向代理（可选）

Nginx 转发到 8888：

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

- [ ] `.gitignore` 已排除 `.env*`、`node_modules/`、`__pycache__/`、`.omc/`、`safe_v2/`
- [ ] `git status` 中没有 `.env` / `.env.local` 等真实密钥文件
- [ ] 代码内无硬编码 API key
- [ ] `site/papers.json` 中每篇论文的 `picture` / `overview` / `demoUrl` 路径都指向真实存在的文件
- [ ] 新增的交互演示目录 `demos/papers/<abbr>/` 含 `index.html`
