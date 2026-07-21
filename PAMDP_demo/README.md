# PAMDP 展会演示系统

基于论文 **PAMDP: Interact to Persona Alignment via a Partially Observable Markov
Decision Process**（ICLR 2026，中移九天 / 清华大学）搭建的可视化交互演示系统。

一屏直观展示 PAMDP 框架的核心价值：
- 🔒 **隐藏用户画像 ω**：对助手不可见，仅 Critic-2 在训练阶段可窥
- 🧠 **逐轮画像推断 c_t**：助手通过交互不断推断用户偏好
- 🤖 **Vanilla vs PAMDP** 对比：左右两栏同步展示通用回复 vs 个性化回复
- 📈 **累计回报曲线**：实时呈现 PAMDP 的优势（趋势对齐论文 Table 3）
- 📊 **双 Critic 数值**：V(h)、V(h,ω)、Advantage 实时跳动

---

## 快速开始

### 1. 安装依赖
```bash
cd e:/works/softwares/bigloop/PAMDP/demo
/c/ProgramData/miniforge3/python.exe -m pip install -r requirements.txt
```

### 2. 启动服务
```bash
/c/ProgramData/miniforge3/python.exe app.py
```
浏览器打开 <http://127.0.0.1:7860>。

### 3. 现场操作
1. 在底栏选择**画像**（设计师 / 程序员 / 退休教师 / 高三学生）
2. 模式默认**脚本演示**（零依赖，绝对稳定，推荐展会使用）
3. 点击 **▶ 开始演示** → **⏯ 自动播放**，让屏幕自动跑 6 轮
4. 想揭示隐藏画像，点击左上角 **显示** 按钮
5. 若想换案例，**🔄 重置** → 选别的画像

---

## 两种运行模式

| 模式 | 何时用 | 依赖 | 说明 |
| --- | --- | --- | --- |
| **🎬 脚本模式** | 展会默认 | 仅 `flask` | 使用论文 Table 8/9 的真实对话 + 趋势化数值，不依赖网络 |
| **🤖 在线 LLM 模式** | 演示真实推理 | LLM API 或本地 Ollama | 实时调用论文附录 D 的 4 个 prompt：User-Simulator / Profile-Inferrer / Reward-Generator + 两个 assistant |

### 在线 LLM 模式配置

支持任意 OpenAI 兼容端点，通过环境变量配置：

```bash
# 例 A：连接 DeepSeek
export OPENAI_BASE_URL=https://api.deepseek.com/v1
export OPENAI_API_KEY=sk-xxx
export OPENAI_MODEL=deepseek-chat

# 例 B：连接通义千问
export OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
export OPENAI_API_KEY=sk-xxx
export OPENAI_MODEL=qwen2.5-7b-instruct

# 例 C：连接本地 Ollama（展会推荐！无网络依赖）
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5:7b
# 无需 API key
```

配置完成后启动 `app.py`，顶栏的 **LLM** 徽章会变为绿色 `✓`；
此时在前端模式下拉框选择 **在线 LLM**，每一轮会实时调用模型。

---

## 文件结构

```
demo/
├── app.py              # Flask 后端
├── pamdp_engine.py     # PAMDP 状态机（Actor / Dual-Critic / Env）
├── prompts.py          # 论文附录 D 的 4 个 Prompt 模板
├── personas.py         # 4 个画像 + 论文 Table 8 的脚本对话
├── llm_client.py       # OpenAI 兼容客户端
├── templates/index.html
├── static/style.css    # 暗色科技风
├── static/app.js       # Chart.js + 打字机动画
├── requirements.txt
└── README.md
```

---

## 与论文的对应关系

| 论文模块 | 演示中的体现 |
| --- | --- |
| 不可观测变量 ω（用户画像）       | 左上"🔒 隐藏画像"卡片（默认遮罩） |
| 可观测状态 h（对话历史）         | 中间两栏对话气泡 |
| 推断画像 c_t = I(h_t)            | "🧠 助手画像推断"卡片，逐轮追加 |
| 动作 u（assistant utterance）    | PAMDP 一栏的回复气泡 |
| 奖励 r ∈ {-1, +0.5, +1}          | 每轮气泡下方的彩色 reward pill |
| V(h)   · Critic-1                | 右上 metrics |
| V(h,ω) · Critic-2                | 右上 metrics |
| Advantage Â = r + γV(h') − V(h,ω)| 右上 metrics（论文公式 6） |
| 论文 Table 3 累计回报趋势        | 底部 Chart.js 折线图 |
| 论文附录 D 的 Profile-Infer Prompt | `prompts.py::PROFILE_INFER_PROMPT` |
| 论文附录 D 的 User-Aware Prompt    | `prompts.py::USER_SIMULATOR_PROMPT` |
| 论文附录 D 的 Reward-Aware Prompt  | `prompts.py::REWARD_PROMPT` |

---

## 展会演示话术建议（30 秒版）

> "传统 LLM 用一个统一奖励模型对齐所有人——但每个人喜好不同。
> 我们把'通过对话理解你'建模成 POMDP：你的画像 ω 对助手不可见，
> 助手必须**靠交互**自己推断。我们提出 **Dual-Critic** 强化学习——
> 训练时让 Critic-2 偷看真实画像，运行时只用 Critic-1。
>
> 现场看：左边是 Vanilla LLM，6 轮后还在说'我是 AI 没有爱好'；
> 右边是 PAMDP，3 轮内就猜出'你养了两只猫'。
> 累计回报从论文 Table 3 看，我们超越 UAAC 0.16，超越 DCRL 0.31。"

---

## 测试

```bash
# 引擎单元测试（无前端）
/c/ProgramData/miniforge3/python.exe -c "
import sys; sys.path.insert(0, '.')
from pamdp_engine import PAMDPEngine
e = PAMDPEngine('designer', 'script')
for _ in range(6):
    t = e.step()
    print(f'T{t.turn}: cum_pamdp={t.cum_reward_pamdp} cum_vanilla={t.cum_reward_vanilla} adv={t.advantage}')
"
```
