# S2Pref 交互演示

基于论文 **Beyond Static Profiles: Capturing the Fluidity of User Preferences in Diverse Scenarios**（ACL 2026，中移九天 / 清华大学）。

直观展示论文核心：**稳定偏好**（与语境无关）vs **情境偏好**（随语境翻转、甚至冲突），
并复刻论文的三个诊断任务。

## 三个任务

| 任务 | 演示内容 |
| --- | --- |
| **Task 1 · 上下文对齐** | 同一句模糊请求，切换语境（和朋友 / 和家人）→ 稳定偏好保持、情境偏好翻转，并高亮被触发的偏好条目 |
| **Task 2 · 冲突检测与澄清** | 模糊请求下，Baseline 盲目假设 vs S2Pref 检测潜在偏好冲突 → 主动澄清 |
| **Task 3 · 推断效率** | 逐轮播放对话，带 High/Med/Low 相关度标签，对比 Ours 与 Baseline 锁定情境偏好所需轮数 |

## 快速开始

```bash
pip install -r requirements.txt
python app.py
```
浏览器打开 <http://127.0.0.1:7861>。

## 可选：在线 LLM 模式

配置任意 OpenAI 兼容端点即可在 Task 1 用真实模型生成对齐回复：

```bash
export OPENAI_BASE_URL=http://localhost:11434/v1   # 例：本地 Ollama
export OPENAI_MODEL=qwen2.5:7b
```
顶栏 LLM 徽章变为 `✓` 即生效。未配置时全程使用脚本数据（零依赖、稳定）。

## 文件结构

```
S2Pref_demo/
├── app.py            # Flask 后端
├── scenarios.py      # 稳定/情境偏好 + 三任务脚本数据（含论文 Figure 1 的 LinWei）
├── prompts.py        # live 模式 prompt
├── llm_client.py     # OpenAI 兼容客户端
├── templates/index.html
├── static/style.css  # 暗色科技风
├── static/app.js
└── requirements.txt
```

## 测试

```bash
python -c "from scenarios import scenario_full; d=scenario_full('linwei'); print(d['title_cn'], '| aspects:', len(d['aspects']), '| eff turns:', len(d['efficiency']))"
```
