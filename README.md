# JIUTIAN Research · Paper Presentation

中国移动 **JIUTIAN Research（中移九天研究院）/ 清华大学** 围绕「个性化对话」的四篇论文的两级展示网页：

- **第一级** — 每篇论文的概览页（动机 / 方法框架 / 关键实验结果）。
- **第二级** — 可交互 Demo，让读者直观感受论文方法的核心机制。

把"读论文"变成"玩论文"。

---

## 📄 收录论文

| 论文 | 会议 | 核心思想 | 演示 | 形态 |
| --- | --- | --- | --- | --- |
| **PAMDP** — Interact to Persona Alignment via a POMDP | ICLR 2026 | 把"通过对话理解用户画像"建模为 POMDP，用 **Dual-Critic** 强化学习：训练时 Critic-2 偷看真实画像，运行时只用 Critic-1 | [PAMDP_demo/](PAMDP_demo/) | Flask 应用 |
| **S2Pref** — Beyond Static Profiles | ACL 2026 | 区分**稳定偏好**（与语境无关）与**情境偏好**（随语境翻转、甚至冲突）；10k 条目、150k 多轮对话，三个诊断任务 | [safe_v2/](safe_v2/) | React + Vite 纯前端 SPA |
| **D2PCM** — Personalized Contextual Memory | ACL 2026 | 基于自我参照效应 + Big-5 人格，**个性化记忆选择**在奖励上显著优于 RAG | [D2PCM_demo/](D2PCM_demo/) | Flask 应用 |
| **ThinkingUS** — Thinking Alignment of User Simulation | ACL 2026 | 用户语境 = 场景设定 + 内心思维 + 用户话语；用**思维驱动**用户模拟器，比只模仿话语更像真人 | [Thinking_demo/](Thinking_demo/) | Flask 应用 |

> 论文 PDF 见仓库根目录。

---

## 🗂️ 目录结构

```
paperPresentation/
├── site/                  # 第一级：Hub 首页 + 四个论文概览页（纯静态 HTML/CSS）
│   ├── index.html         # Hub：四张论文卡片
│   ├── pamdp.html  s2pref.html  d2pcm.html  thinking.html
│   └── assets/            # site.css / charts.js / jiutian.svg / *-paper.png
├── PAMDP_demo/            # 第二级：Flask 交互演示
├── D2PCM_demo/
├── Thinking_demo/
├── safe_v2/               # S2Pref 演示：React + Vite SPA（预构建到 dist/，纯静态）
│   ├── src/               #   应用源码
│   ├── dist/              #   构建产物（可直接静态托管）
│   └── .env.example       #   环境变量模板（仅占位符，无真实密钥）
├── run_all.py / run_all.bat   # 一键启动（单端口 8888）
├── gateway.py             # 单端口网关：按路径前缀挂载 Hub + 四个演示
└── docs/                  # 设计文档
```

---

## 🚀 快速开始

### 一键启动（单端口，推荐）

所有内容合并到**同一个端口**（默认 8888），适合服务器只放通一个端口的情况：

```bash
python run_all.py          # Linux / macOS
# 或 Windows 下双击 run_all.bat
```

> 首次运行前安装依赖：`pip install flask httpx`

打开 `http://127.0.0.1:8888/` 即为 Hub 首页：

```
http://<host>:8888/            Hub（含四个论文概览页）
http://<host>:8888/pamdp/      PAMDP 交互演示（Flask）
http://<host>:8888/d2pcm/      D2PCM 交互演示（Flask）
http://<host>:8888/thinking/   ThinkingUS 交互演示（Flask）
http://<host>:8888/s2pref/     S2Pref 演示（safe_v2 SPA，纯静态）
```

自定义端口 / 对外地址：

```bash
# Linux / macOS
GATEWAY_PORT=8888 GATEWAY_HOST=0.0.0.0 python run_all.py
# Windows PowerShell
$env:GATEWAY_PORT=8888; $env:GATEWAY_HOST="0.0.0.0"; python run_all.py
```

各 Flask demo 也可单独启动调试：`cd <demo> && python app.py`（端口分配：PAMDP `7860` / S2Pref `7861` / D2PCM `7862` / Thinking `7863`）。

### 运行模式

三个 Flask Demo 都支持两种模式：

| 模式 | 何时用 | 依赖 |
| --- | --- | --- |
| 🎬 脚本模式（默认） | 展会 / 离线 | 仅 `flask`，使用论文真实样例，零网络依赖 |
| 🤖 在线 LLM 模式 | 演示真实推理 | OpenAI 兼容端点或本地 Ollama |

在线 LLM 模式通过环境变量配置（**密钥只放在环境变量，不写进代码**）：

```bash
export OPENAI_BASE_URL=http://localhost:11434/v1   # 例：本地 Ollama，无需 key
export OPENAI_MODEL=qwen2.5:7b
# 或连接云厂商：
export OPENAI_BASE_URL=https://api.deepseek.com/v1
export OPENAI_API_KEY=sk-xxx                        # 你自己的 key
export OPENAI_MODEL=deepseek-chat
```

---

## 🌐 部署

### 自有服务器（全部演示可用）

`gateway.py` 暴露了标准 WSGI 对象 `app`，可直接交给生产级 WSGI 服务器：

```bash
pip install waitress
waitress-serve --host=0.0.0.0 --port=8888 gateway:app
```

### GitHub Pages（静态展示）

GitHub Pages **只托管纯静态文件**，因此：

- ✅ **可直接展示**：Hub 首页 + 四个论文概览页（`site/`）、S2Pref 交互演示（`safe_v2/dist/` 预构建 SPA）。
- ⚠️ **无法在 Pages 上运行**：PAMDP / D2PCM / ThinkingUS 三个交互演示是 Flask 应用，需要 Python 后端。在 Pages 上它们的「▶ 交互演示」按钮无法使用，但「📄 论文概览」页可正常查看。

完整步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 🔐 安全说明

- 仓库**不含任何硬编码的 API 密钥或密码**。已扫描确认无 `sk-`、`AIza`、`ghp_`、私钥等泄露。
- 所有 LLM 密钥均通过环境变量（`OPENAI_API_KEY` / `GEMINI_API_KEY` 等）注入，代码中仅保留 `.env.example` 占位符。
- 根级 [.gitignore](.gitignore) 已排除 `.env*`（真实密钥）、`node_modules/`、`dist/`、`__pycache__/`、`.omc/`（工具会话缓存）。
- 部署前请确认 `.env`、`.env.local` 未被 `git add`（应已被 `.gitignore` 忽略）。

---

## 📚 更多文档

- [DEPLOYMENT.md](DEPLOYMENT.md) — GitHub Pages 部署完整步骤
- [docs/superpowers/specs/2026-06-17-four-paper-showcase-design.md](docs/superpowers/specs/2026-06-17-four-paper-showcase-design.md) — 整体设计文档
- 各 Demo 子目录下的 `README.md`

---

## 📝 许可

本仓库代码用于学术演示。论文版权归原作者所有。
