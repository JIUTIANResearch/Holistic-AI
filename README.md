# JIUTIAN Research · Paper Presentation

中国移动 **JIUTIAN Research（中移九天研究院）** 论文展示平台

---

## 📄 收录论文

站点以**数据驱动注册表** [`site/papers.json`](site/papers.json) 为唯一数据源：首页按发表年代分组、论文概览页均从此渲染。**加论文只改这一个文件**（再放一张配图），无需改动任何代码或脚手架。

当前收录 14 篇（2026 年 5 篇 / 2025 年 9 篇），涵盖受控文本生成、个性化与偏好建模、知识检索与推理、口语理解、多智能体协作等方向。完整列表见 [站点首页](site/index.html)。

每篇论文页面包含：论文概览（忠实于论文的方法/实验/配图）、论文链接、本地 PDF，部分论文附带可交互演示。

---

## 🗂️ 目录结构

```
paperPresentation/
├── site/                  # 站点：首页 + 论文概览（纯静态 HTML/CSS/JS）
│   ├── index.html         # 首页：按年代分组，从 papers.json 渲染卡片
│   ├── paper.html         # 单模板概览页（?id=xxx 从 papers.json 渲染）
│   ├── app.js             # 渲染逻辑（首页分组 + 概览页数据/富文本）
│   ├── papers.json        # ★ 论文注册表（加论文只改这里）
│   ├── overviews/         # 各论文概览富文本片段
│   ├── assets/            # site.css / charts.js / jiutian.svg / papers/*.png
├── demos/                 # 交互演示（纯静态，D2 统一脚手架）
│   ├── shell/             # 公共主题 shell.css + 导航 nav.js（所有 demo 共享）
│   ├── papers/            # 每篇一个自包含目录：index.html + app.js + style.css + data/
│   │   ├── pamdp/  d2pcm/  thinking/  s2pref/
│   └── build_static.py    # 从现有 engine/scenarios 预生成 JSON 的脚本
├── papers/                # 论文 PDF（按年代分子目录 2025/ 2026/）
├── run_all.py / gateway.py  # 一键启动（单端口 8888，本地调试用）
└── .github/workflows/deploy.yml  # GitHub Pages 自动部署
```

### 加一篇论文

1. 把 PDF 放进 `papers/<年份>/`；
2. 在 [`site/papers.json`](site/papers.json) 的 `papers` 数组追加一条（标题/会议/作者/摘要/链接/配图/是否有 demo）；
3. 放一张配图到 `site/assets/papers/<id>.png`；
4. （可选）写一个概览富文本片段到 `site/overviews/<id>.html`，否则自动用数据型渲染；
5. （可选）若需交互演示，在 `demos/papers/<id>/` 建一个自包含目录，并在注册表里设 `hasDemo:true` + `demoUrl`。

无需改动首页、模板、脚手架或部署流程。

---

## 🚀 快速开始

### 本地预览（静态）

```bash
python -m http.server 8000 --directory site
```

打开 `http://127.0.0.1:8000/`。交互演示需连同 `demos/` 一起提供，可用一键启动：

```bash
python run_all.py          # Linux / macOS
# 或 Windows 下 run_all.bat
```

> 首次运行前安装依赖：`pip install flask httpx`

```
http://<host>:8888/            Hub 首页（按年代分组）
http://<host>:8888/demos/papers/pamdp/      PAMDP 交互演示
http://<host>:8888/demos/papers/d2pcm/      D2PCM 交互演示
http://<host>:8888/demos/papers/thinking/   ThinkingUS 交互演示
http://<host>:8888/demos/papers/s2pref/     S2Pref 交互演示
```

---

## 🌐 部署

### GitHub Pages（自动）

推送到 `main` 即触发 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：组装 `site/` + `demos/` 为静态站点并部署。访问 `https://jiutianresearch.github.io/Holistic-AI/`。

### 自有服务器

`gateway.py` 暴露标准 WSGI 对象 `app`：

```bash
pip install waitress
waitress-serve --host=0.0.0.0 --port=8888 gateway:app
```

完整步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 📚 更多文档

- [DEPLOYMENT.md](DEPLOYMENT.md) — 部署完整步骤
- [docs/superpowers/specs/2026-06-17-four-paper-showcase-design.md](docs/superpowers/specs/2026-06-17-four-paper-showcase-design.md) — 整体设计文档
- 各 Demo 子目录下的说明

---

## 📝 许可

本仓库代码用于学术演示。论文版权归原作者所有。
