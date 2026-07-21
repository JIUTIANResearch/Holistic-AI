# 四论文展示网页设计 (Four-Paper Showcase)

**日期**: 2026-06-17
**作者机构**: JIUTIAN Research (中移九天) / 清华大学
**目标**: 一个两级网页，展示 JIUTIAN 团队的四篇论文。Level-1 概览每篇论文的研究内容与实验结果；Level-2 提供可交互界面，让用户直观感受论文方法。

---

## 1. 四篇论文

| 缩写 | 全称 | 会议 | 核心思想 | Demo 状态 |
| --- | --- | --- | --- | --- |
| **PAMDP** | Interact to Persona Alignment via a POMDP | ICLR 2026 | 把"通过对话理解用户"建模为 POMDP + Dual-Critic 强化学习 | ✅ 已完成 (`PAMDP_demo/`) |
| **S2Pref** | Beyond Static Profiles: Capturing the Fluidity of User Preferences | ACL 2026 | 区分 **稳定偏好**(context-agnostic) 与 **情境偏好**(context-dependent，随语境翻转/冲突) | 🔨 新建 |
| **D2PCM** | A Multi-Turn Dialogue Dataset with Personalized Contextual Memory | ACL 2026 | 基于自我参照效应 + Big-5，**个性化记忆选择**优于 RAG | 🔨 新建 |
| **ThinkingUS** | Thinking Alignment of Scenario-Oriented User Simulation | ACL 2026 | 用户模拟器引入**内心思维**(场景设定 + 用户思维 + 用户话语) | 🔨 新建 |

---

## 2. 架构总览

```
d:/Code/demo/
├── site/                      # 静态展示层 (Level-1)
│   ├── index.html             # Hub: 4 张论文卡片
│   ├── pamdp.html             # 概览页 (动机/方法/结果 + 进入演示按钮)
│   ├── s2pref.html
│   ├── d2pcm.html
│   ├── thinking.html
│   └── assets/site.css        # 共享暗色科技风 (沿用 PAMDP 配色)
├── PAMDP_demo/                # 已存在，不改逻辑
├── S2Pref_demo/               # 新建 Flask 应用
├── D2PCM_demo/                # 新建 Flask 应用
└── Thinking_demo/             # 新建 Flask 应用
```

**决策 (已与用户确认)**:
- 站点架构: **静态 Hub + 各论文独立 Flask 应用**。复刻 PAMDP 模式，零风险、可离线。
- 运行模式: **script (默认/离线/论文真实样例) + 可选 live-LLM** (OpenAI 兼容端点，环境变量配置，不可用时自动降级)。
- 语言: **中文为主**，英文术语/论文标题保留 (与 PAMDP 一致)。

**端口分配**: PAMDP 7860 / S2Pref 7861 / D2PCM 7862 / Thinking 7863。
Hub 通过 `http://127.0.0.1:<port>` 链接到各 Demo。Hub 本身可用 `file://` 或 `python -m http.server` 打开。

**每个新 Demo 的文件骨架** (复刻 PAMDP):
```
<Paper>_demo/
├── app.py              # Flask 后端 (路由同 PAMDP: / /api/start /api/step /api/reset /api/llm_status ...)
├── <core>_engine.py    # 状态机
├── scenarios.py        # 论文真实样例的脚本数据
├── prompts.py          # live 模式的 prompt 模板 (来自论文附录)
├── llm_client.py       # OpenAI 兼容客户端 (直接复制自 PAMDP_demo)
├── templates/index.html
├── static/style.css    # 复用共享配色变量
├── static/app.js
├── requirements.txt    # flask (+ requests for live)
└── README.md
```

---

## 3. Level-1 概览页 (统一版式)

每篇论文一个静态 HTML 页，结构统一：

1. **标题条**: 论文全称 + 会议徽章 (ACL/ICLR 2026) + 作者机构 (JIUTIAN Research / 清华).
2. **一句话核心**: 论文最核心的一句话主张。
3. **三段正文**:
   - **动机 / 问题** — 现有方法的缺陷。
   - **方法框架** — 核心方法 (配简单文字示意图/列表)。
   - **关键结果** — 论文真实数字 (见各 Demo 节)。
4. **大号 `▶ 进入交互演示` 按钮** → 指向对应 Demo 端口。

视觉沿用 PAMDP 暗色科技风 (`site/assets/site.css` 定义共享 CSS 变量: 背景、卡片、强调色、字体)。

Hub (`index.html`): 4 张卡片网格，每张含论文缩写、会议徽章、一句话简介、`概览` + `演示` 两个入口。

---

## 4. Demo 1 — S2Pref: 上下文偏好翻转

### 核心机制
同一用户同时拥有 **稳定偏好** (context-agnostic，如"热爱自然") 和 **情境偏好** (context-dependent，同一 Aspect 在不同语境翻转，如"和朋友→冒险 / 和家人→安全")。

### 界面与交互
- **顶部**: 隐藏用户画像卡 (5 条稳定偏好 + 5 个情境 Aspect)，默认遮罩，可点击"显示"。
- **三个标签页** (对应论文三个评测任务):
  - **Task 1 · 上下文对齐**: 同一句模糊请求 ("这周末去哪玩？")，用户切换语境 `[ 和朋友 ]` / `[ 和家人 ]`。Agent 回复中，稳定偏好 (自然) 保持不变，情境偏好翻转 (朋友→刺激徒步⛰ / 家人→安全公园漫步🌳)。高亮"本轮被触发的偏好条目"。
  - **Task 2 · 冲突检测与澄清**: 给一个模糊请求，对比 baseline (盲目假设) vs ours (检测到潜在偏好冲突 → 主动澄清提问)。底部显示判定: 是否存在冲突 / 是否应澄清。
  - **Task 3 · 推断效率**: 逐轮播放对话，每轮带 High/Med/Low 相关度标签，显示"第几轮锁定情境偏好" (ours 3 轮 vs baseline 6 轮)。
- **控制栏**: 画像选择、模式 (script/live)、开始/下一步/自动播放/重置。

### 数据
- 论文 Figure 1 的 **LinWei** 样例 (热爱自然 [稳定] + 周末活动随同伴翻转: 朋友→冒险攀登 / 家人→安全活动)。
- 1~2 个自扩展画像 (如餐饮 Aspect: 在家清淡 vs 餐厅重辣)。

### 关键结果 (用于概览页)
S2Pref 数据集: 10k 条目，每条 5 稳定 + 5 情境 Aspect = 15 偏好项，共 150k grounded 多轮对话；turn-level High/Med/Low 相关度标注，human-LLM 一致率 >92%。三个诊断任务 (Explicit Context Alignment / Conflict Identification & Clarification / Situational Preference Identification Efficiency)。

---

## 5. Demo 2 — D2PCM: 个性化记忆选择 vs RAG

### 核心机制
每轮提供一个 **5 条记忆 chunk**，其中 1 条与用户 Big-5 画像契合 (Personalized Contextual Memory，自我参照效应)。**RAG** 按相似度选；**D2PCM** 选画像契合的那条 → 不同回复、不同 reward。

### 界面与交互
- **顶部**: Big-5 雷达图 (O/C/E/A/N 高低) + 隐藏画像，默认遮罩可显示。
- **中部每轮**:
  - 用户 query。
  - 展开 5 条记忆卡片 (标注哪条是 Personalized Contextual Memory)。
  - 两路并列对比: **RAG** 高亮按相似度选中的记忆 + 生成回复; **D2PCM** 高亮画像契合记忆 + 回复。
- **底部指标**: memory ratio (命中画像记忆比例)、memory selection reward、response reward、累计 win-rate。
- **控制栏**: 同 PAMDP。

### 数据
- 2~3 个 Big-5 画像 + 各自 5~6 轮对话，每轮 5 条记忆候选 (脚本化)。

### 关键结果 (用于概览页, 论文 Table 3)
- Llama-8b: persona-aligned 记忆比例升至 **20.93%**; memory selection reward **+0.6412 (+15.9%)**; response reward **+0.4130 (+16.5%)** vs RAG。
- Qwen-8b: memory ratio 提升 **26.50%**，奖励同步提升。
- 评测指标: LLM-judgement win-rate + reward-driven response quality。基于 Big-5 的 32 个 meta-personality 原型。

---

## 6. Demo 3 — ThinkingUS: 揭示隐藏的用户思维

### 核心机制
用户语境 = **场景设定** (目标/背景) + **用户思维** (隐藏的元认知控制 + 推理操作) + **用户话语** (可见)。ThinkingUS 由思维驱动；普通 role-play 只模仿话语。

### 界面与交互
- **顶部**: 场景设定卡 (用户目标 / 背景 / 情绪态度)，始终可见。
- **中部对话流**: 模拟用户 ↔ 助手。每条用户话语下方有遮罩的 **💭 内心思维气泡**，点击/自动播放时揭示，并标注类型徽章: **元认知控制** (识别信息缺口、调整策略) 或 **推理操作** (验证/回溯/原则细化)。
- **左右对比**: **ThinkingUS** (思维→话语: 更直接、会跳跃回溯) vs **Role-play 基线** (过度礼貌配合、无内心活动)。
- **底部**: 每轮思维类型徽章 + "真人相似度"趋势 (脚本化，呼应论文 win-rate 评测结论)。
- **控制栏**: 同 PAMDP。

### 数据
- 论文 Figure 1 的 **TTS 商业模式探索** 样例 (含回溯、识别信息缺口的真实思维链)。
- 1 个自扩展场景。

### 关键结果 (用于概览页, 论文 Table 1 in-process win-rate rω)
- ThinkingUS (on Base) win-rate rω: **0.3423** (LMSYS-Chat) / **0.4682** (WildChat)，
  显著优于 Utterance SFT (0.1951 / 0.2331) 与 Prompt Thinking (0.2163 / 0.3200)。
- 数据集 LMSYS-UserThinking: 51k human-LLM 对话，重建用户 in-process + terminal 内心推理。

---

## 7. 共享技术约定

- **后端**: Flask，单全局会话 (展台一次一人)，路由与 PAMDP 一致。
- **前端**: 纯 vanilla JS + CSS (无构建步骤)；Chart.js (若需图表) 用本地 `chart.umd.min.js` (从 PAMDP 复制)。
- **llm_client.py**: 直接复用 PAMDP 版本 (OpenAI 兼容，`OPENAI_BASE_URL/API_KEY/MODEL` 环境变量)。
- **降级**: live 模式但 LLM 不可用时自动回退 script。
- **打字机/解锁动画**: 沿用 PAMDP 的交互手感。

---

## 8. 验证标准

- 每个新 Demo 提供引擎层 smoke test (无前端，纯 Python 跑通 N 轮，打印关键状态)，仿照 PAMDP README 的测试片段。
- 三个 Flask 应用能成功启动并返回首页 (200)。
- Hub 与四个概览页在浏览器可正常打开、互相跳转。
- script 模式零依赖 (仅 flask) 可运行。

---

## 9. 不做 (YAGNI)

- 不重写 PAMDP_demo (仅在 Hub 链接它)。
- 不做用户账号/持久化/数据库。
- 不做移动端专门适配 (展台用桌面横屏)。
- 不做 live-LLM 的复杂流式 UI (与 PAMDP 保持一致即可)。
