# D2PCM 交互演示

基于论文 **D2PCM: A Multi-Turn Dialogue Dataset with Personalized Contextual Memory**（ACL 2026，中移九天 / 清华大学）。

直观展示论文核心：基于**自我参照效应**与 **Big-5 人格**的**个性化记忆选择**，
在记忆命中与奖励上显著优于 RAG。

## 演示逻辑

每轮提供一个 **5 条记忆 chunk**：
- **RAG** 按与 query 的相似度 (`sim`) 选记忆 → 通用回复。
- **D2PCM** 选与用户 Big-5 画像契合的那条 (`★ Personalized Contextual Memory`) → 个性化回复。

底部累计三项指标，趋势对齐论文 Table 3：
- **画像记忆命中率**（D2PCM ≈ 100% vs RAG 偏低）
- **记忆选择 reward**（论文：+0.6412 / +15.9%）
- **回复生成 reward**（论文：+0.4130 / +16.5%）

顶部 Big-5 雷达图（O/C/E/A/N）展示当前隐藏画像，可点击「显示」揭示文字描述。

## 快速开始

```bash
pip install -r requirements.txt
python app.py
```
浏览器打开 <http://127.0.0.1:7862>，点击「下一轮 / 自动播放」推进。

## 可选：在线 LLM 模式

```bash
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=qwen2.5:7b
```
配置后 D2PCM 一侧的回复会改为真实模型基于画像挑选记忆后实时生成（尾部标注 `⟨live⟩`）。
未配置时全程脚本模式（零依赖）。

## 文件结构

```
D2PCM_demo/
├── app.py            # Flask 后端
├── scenarios.py      # Big-5 画像 + 每轮 5 条记忆候选（含 sim / persona_fit / reward）
├── prompts.py        # live 模式 prompt
├── llm_client.py     # OpenAI 兼容客户端
├── templates/index.html
├── static/style.css  # 暗色科技风
├── static/app.js     # 含手绘 Big-5 雷达图
└── requirements.txt
```

## 测试

```bash
python -c "from scenarios import persona_full; d=persona_full('nova'); t=d['turns'][0]; print('rag pick', t['rag_pick'], 'd2pcm pick', t['d2pcm_pick'], '| fit on d2pcm:', t['memories'][t['d2pcm_pick']]['persona_fit'])"
```
