# -*- coding: utf-8 -*-
"""ThinkingUS 演示数据：场景设定 + 每轮 (助手回复 / 隐藏用户思维 / 用户话语)。

对照：
  ThinkingUS  —— 由内心思维驱动 → 话语更直接、会跳跃/回溯
  Role-play   —— 只模仿话语 → 过度礼貌、配合，无内心活动

思维类型 (论文四维认知框架的两大类)：
  metacog  —— 元认知控制（识别信息缺口、调整策略）
  reason   —— 推理操作（验证 / 回溯 / 原则细化）
"""
from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class Turn:
    assistant: str             # 上一轮助手回复（用户思维针对它产生）
    thought: str               # 隐藏的用户内心思维
    thought_type: str          # "metacog" | "reason"
    thought_label: str         # 思维类型中文标签
    utterance_us: str          # ThinkingUS 模拟用户的话语（思维驱动）
    utterance_rp: str          # Role-play 基线的话语（仅表层、过度礼貌）
    similarity: float          # 该轮"真人相似度"（脚本化趋势，0~1）


@dataclass
class Scenario:
    sid: str
    title_cn: str
    avatar: str
    goal: str                  # 用户动机 / 目标
    background: str            # 场景背景
    emotion: str               # 情绪态度
    turns: List[Turn] = field(default_factory=list)


# ---------------------------------------------------------------------------
# 场景 1：TTS 商业模式探索（论文 Figure 1 真实样例）
# ---------------------------------------------------------------------------
TTS = Scenario(
    sid="tts",
    title_cn="探索 TTS 商业模式",
    avatar="🔊",
    goal="想搞清楚：当 TTS 成本极低、且出现更强的免费开源替代时，怎样的商业模式才站得住脚。",
    background="一位独立开发者在与助手讨论文本转语音（TTS）产品的商业模式可行性，"
               "关注极低成本场景下 freemium 为何不可行。",
    emotion="务实、追根究底，对泛泛而谈的回答不满足。",
    turns=[
        Turn(
            assistant="TTS（文本转语音）是一种典型的 SaaS 业务模式，常见的有 freemium、"
                      "按用量计费、订阅制等……",
            thought="AI 没有真正抓住我的点——我说的是『成本极低到 freemium 都不成立』的极端情形。"
                    "我需要把问题收窄，逼它针对低成本高用量这种模式回答。",
            thought_type="metacog",
            thought_label="元认知控制 · 识别信息缺口",
            utterance_us="那低成本、高用量的模式呢？我说的就是那种便宜到没法靠提价赚钱的情况。",
            utterance_rp="谢谢你的详细解释！这些商业模式都很有帮助，我学到了很多。",
            similarity=0.62,
        ),
        Turn(
            assistant="低成本高用量（LCHV）模式依赖规模效应，通过海量调用摊薄单位成本……",
            thought="这个解释有用。但我真正好奇的是：如果有人放出一个『质量更高、还能在烂电脑上"
                    "实时跑』的免费开源替代，会怎样？我得把这个颠覆情形抛出来验证。",
            thought_type="reason",
            thought_label="推理操作 · 原则细化与验证",
            utterance_us="举个例子：一家 TTS 公司本来有技术护城河，结果别人开源了一个各方面都更好、"
                         "还能在土豆电脑上实时生成的。这种情况叫什么？",
            utterance_rp="明白了，规模效应确实很关键。请问还有别的商业模式可以参考吗？",
            similarity=0.74,
        ),
        Turn(
            assistant="当一个更优的免费开源方案出现，原有付费产品的护城河被瓦解，"
                      "这种现象常被称为『商品化』（commoditization）……",
            thought="商品化这个词对上了。那我下一步想确认：在被商品化之后，原公司还有没有"
                    "可转型的方向？我需要顺着这条线追问，别让对话停在定义上。",
            thought_type="reason",
            thought_label="推理操作 · 回溯与追问",
            utterance_us="那被商品化之后，原来那家公司还有什么活路？转去做服务还是做定制？",
            utterance_rp="原来如此，commoditization 这个概念解释得很清楚，非常感谢你！",
            similarity=0.81,
        ),
    ],
)


# ---------------------------------------------------------------------------
# 场景 2：装修预算纠结（自扩展场景）
# ---------------------------------------------------------------------------
RENO = Scenario(
    sid="reno",
    title_cn="装修预算的反复权衡",
    avatar="🏠",
    goal="想在有限预算内决定：到底该把钱花在好看的设计，还是耐用的基础工程上。",
    background="一位首次装修的业主在和助手讨论预算分配，内心其实已有倾向但不确定。",
    emotion="纠结、谨慎，怕花错钱，需要被理解而非被灌输标准答案。",
    turns=[
        Turn(
            assistant="装修预算一般建议按硬装 50%、软装 30%、家电 20% 来分配……",
            thought="这个比例是通用模板，没考虑我的实际顾虑——我更怕基础工程出问题返工。"
                    "我得把我的真实担忧说出来，而不是接受标准比例。",
            thought_type="metacog",
            thought_label="元认知控制 · 调整策略",
            utterance_us="比例我知道，但我更担心水电这种隐蔽工程，是不是该多留点钱在这上面？",
            utterance_rp="谢谢！这个分配比例很科学，我会照着 50/30/20 来规划的。",
            similarity=0.66,
        ),
        Turn(
            assistant="隐蔽工程确实重要，水电改造若返工成本极高，建议优先保证质量……",
            thought="它认同了我的顾虑，这让我更确定方向。但我还想验证：如果为此压缩软装，"
                    "会不会住进去觉得太将就？我得权衡一下两边。",
            thought_type="reason",
            thought_label="推理操作 · 验证与权衡",
            utterance_us="那如果我为了水电把软装预算砍一半，住起来会不会太凑合了？",
            utterance_rp="好的，那我一定会优先保证隐蔽工程的质量，谢谢你的专业建议！",
            similarity=0.78,
        ),
        Turn(
            assistant="软装可以后期逐步添置，而隐蔽工程几乎无法返工，因此前期向基础工程倾斜更稳妥……",
            thought="『软装可后补』这句点醒了我——我其实一直倾向保基础，只是怕委屈了生活质感。"
                    "现在心里有底了，可以定下来了。",
            thought_type="reason",
            thought_label="推理操作 · 原则细化",
            utterance_us="对，软装大不了以后慢慢加。那我就先把钱压在水电和防水上，定了。",
            utterance_rp="明白了，我会把重心放在基础工程上的，非常感谢你的耐心解答！",
            similarity=0.85,
        ),
    ],
)


ALL_SCENARIOS: List[Scenario] = [TTS, RENO]


def get_scenario(sid: str) -> Scenario:
    for s in ALL_SCENARIOS:
        if s.sid == sid:
            return s
    raise KeyError(f"unknown scenario: {sid}")


def scenario_index() -> List[Dict]:
    return [{"sid": s.sid, "avatar": s.avatar, "title_cn": s.title_cn} for s in ALL_SCENARIOS]


def scenario_full(sid: str) -> Dict:
    s = get_scenario(sid)
    return {
        "sid": s.sid,
        "title_cn": s.title_cn,
        "avatar": s.avatar,
        "goal": s.goal,
        "background": s.background,
        "emotion": s.emotion,
        "turns": [
            {"assistant": t.assistant, "thought": t.thought,
             "thought_type": t.thought_type, "thought_label": t.thought_label,
             "utterance_us": t.utterance_us, "utterance_rp": t.utterance_rp,
             "similarity": t.similarity}
            for t in s.turns
        ],
    }
