# ThinkingUS 交互演示

基于论文 **Thinking Alignment of Scenario-Oriented User Simulation**（ACL 2026，中移九天 / 清华大学）。

直观展示论文核心：用户语境 = **场景设定 + 内心思维 + 用户话语**。
ThinkingUS 由内心思维驱动，比只模仿话语的 Role-play 更接近真实人类用户。

## 演示逻辑

- 顶部展示**场景设定**（用户目标 / 背景 / 情绪态度），贯穿整段对话。
- 对话流中，每条用户话语上方有一个**遮罩的 💭 内心思维气泡**，点击即可揭示，
  并标注思维类型：
  - **元认知控制**（识别信息缺口、调整策略）
  - **推理操作**（验证 / 回溯 / 原则细化）
- 勾选「对比 Role-play 基线」可看到：基线只会过度礼貌地配合，缺少追问与回溯。
- 底部「真人相似度趋势」对比 ThinkingUS 与 Role-play（趋势对齐论文 win-rate 评测结论）。

样例 1（TTS 商业模式探索）取自论文 Figure 1，含真实的信息缺口识别与回溯思维链。

## 快速开始

```bash
pip install -r requirements.txt
python app.py
```
浏览器打开 <http://127.0.0.1:7863>，点击「下一轮 / 自动播放」推进，点击 💭 揭示思维。

## 可选：在线 LLM 模式

```bash
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5:7b
```
配置后，每轮的「思维 + 话语」会由真实模型按 ThinkingUS 范式实时生成（尾部标注 `⟨live⟩`）。
未配置时全程脚本模式（零依赖）。

## 文件结构

```
Thinking_demo/
├── app.py            # Flask 后端（含 THOUGHT/UTTERANCE 解析）
├── scenarios.py      # 场景设定 + 每轮 (助手回复 / 隐藏思维 / 用户话语)
├── prompts.py        # live 模式 prompt（先思维后话语）
├── llm_client.py     # OpenAI 兼容客户端
├── templates/index.html
├── static/style.css  # 暗色科技风
├── static/app.js     # 思维揭示 + 相似度趋势图
└── requirements.txt
```

## 测试

```bash
python -c "from scenarios import scenario_full; d=scenario_full('tts'); t=d['turns'][0]; print('thought_type:', t['thought_type'], '| has us/rp:', bool(t['utterance_us']), bool(t['utterance_rp']))"
```
