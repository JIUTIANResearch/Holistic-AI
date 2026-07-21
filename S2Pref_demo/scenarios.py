# -*- coding: utf-8 -*-
"""S2Pref 演示数据：稳定偏好 / 情境偏好 + 三个任务的脚本样例。

画像 1 (LinWei) 直接来自论文 Figure 1，方便观众对照论文；
另两个画像为我们扩充，用于增加现场演示多样性。
"""
from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class StablePref:
    icon: str
    text: str            # 稳定偏好描述（与语境无关）


@dataclass
class SituAspect:
    icon: str
    aspect: str          # Aspect 名称
    ctx_a: str           # 语境 A 标签（如 "和朋友"）
    pref_a: str          # 语境 A 下的偏好行为
    ctx_b: str           # 语境 B 标签（如 "和家人"）
    pref_b: str          # 语境 B 下的偏好行为


@dataclass
class AlignTurn:
    """Task 1 · 上下文对齐：同一请求 + 选定语境 → agent 回复。"""
    ctx_key: str                 # "a" or "b"
    user: str
    baseline: str                # 不看语境的通用回复
    ours: str                    # S2Pref-aware 个性化回复
    triggered_stable: List[int]  # 命中的稳定偏好索引
    triggered_aspect: int        # 命中的情境 Aspect 索引
    note: str


@dataclass
class ConflictCase:
    """Task 2 · 冲突检测与澄清。"""
    user: str
    has_conflict: bool
    baseline: str                # 盲目假设
    ours: str                    # 主动澄清
    conflict_explain: str        # 揭示的潜在冲突
    should_clarify: bool


@dataclass
class EffTurn:
    """Task 3 · 推断效率：逐轮带相关度标签。"""
    user: str
    relevance: str               # High / Medium / Low
    ours_locked: bool            # ours 在本轮是否锁定情境偏好
    baseline_locked: bool        # baseline 是否锁定
    inferred: str


@dataclass
class Scenario:
    sid: str
    title_cn: str
    avatar: str
    summary: str
    stable: List[StablePref]
    aspects: List[SituAspect]
    align: List[AlignTurn]
    conflict: ConflictCase
    efficiency: List[EffTurn]
    ours_lock_turn: int          # ours 锁定所需轮数
    baseline_lock_turn: int      # baseline 锁定所需轮数


# ---------------------------------------------------------------------------
# 画像 1：LinWei（论文 Figure 1）
# ---------------------------------------------------------------------------
LINWEI = Scenario(
    sid="linwei",
    title_cn="林伟 · 周末活动随同伴而变",
    avatar="🧗",
    summary="热爱自然 [稳定]；活动冒险度随同伴翻转 [情境]：和朋友→刺激，和家人→安全",
    stable=[
        StablePref("🌿", "热爱自然环境（山水、户外）"),
        StablePref("📷", "喜欢拍风景照"),
        StablePref("☕", "习惯午餐时与朋友闲聊计划"),
    ],
    aspects=[
        SituAspect("⛰️", "活动冒险度取决于同伴",
                   "和朋友", "偏好更刺激的活动（如惊险攀登）",
                   "和家人", "偏好更安全的活动（如公园漫步）"),
        SituAspect("🍜", "口味取决于就餐场合",
                   "在外就餐", "偏好重口味、尝鲜",
                   "在家做饭", "偏好清淡、家常"),
    ],
    align=[
        AlignTurn(
            ctx_key="a",
            user="这周末终于能出去放松了，去哪好呢？",
            baseline="周末可以去公园散步、看电影，或者在家休息一下也不错。",
            ours="既然是和朋友一起，又喜欢山水——不如去近郊那条有点挑战的山脊线，"
                 "登顶能看到超棒的视野，正好拍几张风景照！",
            triggered_stable=[0, 1],
            triggered_aspect=0,
            note="语境=和朋友：稳定偏好（自然）保持，情境偏好触发『刺激活动』",
        ),
        AlignTurn(
            ctx_key="b",
            user="这周末终于能出去放松了，去哪好呢？",
            baseline="周末可以去公园散步、看电影，或者在家休息一下也不错。",
            ours="和家人一起的话，推荐去湖边的湿地公园走走——同样是亲近自然的山水景致，"
                 "路平好走、老人小孩都轻松，沿途也很适合拍照。",
            triggered_stable=[0, 1],
            triggered_aspect=0,
            note="语境=和家人：稳定偏好（自然）不变，情境偏好翻转为『安全活动』",
        ),
    ],
    conflict=ConflictCase(
        user="帮我订个周末的活动吧。",
        has_conflict=True,
        baseline="好的，已为你安排周六上午的高空蹦极，很刺激！",
        ours="没问题～不过先确认一下：这次是和朋友一起，还是带家人？"
             "你和朋友时偏爱刺激些的，和家人时更想要安全轻松的，两种我会推荐得很不一样。",
        conflict_explain="活动冒险度 Aspect 存在冲突：和朋友→刺激 vs 和家人→安全。"
                         "请求未指明同伴，存在潜在偏好冲突。",
        should_clarify=True,
    ),
    efficiency=[
        EffTurn("最近天气真好，特别想出去走走。", "Low", False, False, "（信息量低，无法判断）"),
        EffTurn("我喜欢有山有水的地方，看到风景就很治愈。", "Medium", False, False,
                "推断：热爱自然 [稳定]"),
        EffTurn("这周打算约几个老友一起，想找点刺激的玩法。", "High", True, False,
                "✓ 锁定：和朋友→偏好刺激活动 [情境]"),
        EffTurn("上次那条野线就很带劲，这次还想更野一点。", "High", True, True,
                "baseline 此时才勉强跟上"),
    ],
    ours_lock_turn=3,
    baseline_lock_turn=4,
)


# ---------------------------------------------------------------------------
# 画像 2：王敏（餐饮场景，口味随场合翻转）
# ---------------------------------------------------------------------------
WANGMIN = Scenario(
    sid="wangmin",
    title_cn="王敏 · 口味随就餐场合而变",
    avatar="🍲",
    summary="爱美食、注重健康 [稳定]；口味随场合翻转 [情境]：在家清淡，在外重辣尝鲜",
    stable=[
        StablePref("🥗", "注重饮食健康、爱吃蔬菜"),
        StablePref("🍳", "喜欢自己研究菜谱"),
        StablePref("🌍", "对各地美食充满好奇"),
    ],
    aspects=[
        SituAspect("🌶️", "口味取决于就餐场合",
                   "在外就餐", "偏好重辣、尝试新奇口味",
                   "在家做饭", "偏好清淡、少油少盐"),
        SituAspect("⏱️", "用餐节奏取决于工作日/周末",
                   "工作日", "偏好快手简餐",
                   "周末", "偏好慢工细做的大菜"),
    ],
    align=[
        AlignTurn(
            ctx_key="a",
            user="今晚想好好吃一顿，有什么推荐？",
            baseline="可以考虑做点番茄炒蛋、清蒸鱼之类的家常菜，简单又营养。",
            ours="今晚是去外面吃吧？那别客气——来一锅麻辣鲜香的川式冒菜怎么样，"
                 "多点几样新鲜时蔬，既过瘾又不失你一贯的健康讲究。",
            triggered_stable=[0, 2],
            triggered_aspect=0,
            note="语境=在外就餐：健康偏好保持，口味情境偏好触发『重辣尝鲜』",
        ),
        AlignTurn(
            ctx_key="b",
            user="今晚想好好吃一顿，有什么推荐？",
            baseline="可以考虑做点番茄炒蛋、清蒸鱼之类的家常菜，简单又营养。",
            ours="在家做的话，推荐一道少油的香煎龙利鱼配时蔬，清淡鲜美，"
                 "正合你在家偏清淡又爱研究菜谱的习惯，步骤我可以一步步给你。",
            triggered_stable=[0, 1],
            triggered_aspect=0,
            note="语境=在家做饭：健康偏好不变，口味情境偏好翻转为『清淡』",
        ),
    ],
    conflict=ConflictCase(
        user="给我推荐个晚餐方案。",
        has_conflict=True,
        baseline="给你推荐一份超辣的水煮牛肉，香辣过瘾！",
        ours="好呀～先问一句：今晚是出去吃，还是在家做？"
             "你在外面爱吃辣尝鲜，在家则偏清淡，方向差挺多的，我好对症下药。",
        conflict_explain="口味 Aspect 存在冲突：在外→重辣 vs 在家→清淡。"
                         "请求未指明场合，存在潜在偏好冲突。",
        should_clarify=True,
    ),
    efficiency=[
        EffTurn("我平时挺注意吃得健康的。", "Low", False, False, "推断：注重健康 [稳定]"),
        EffTurn("不过我这人也爱尝点新鲜花样。", "Medium", False, False, "线索：爱尝鲜"),
        EffTurn("尤其周末出去搓一顿，无辣不欢！", "High", True, False,
                "✓ 锁定：在外就餐→重辣尝鲜 [情境]"),
        EffTurn("在家就完全相反，清汤寡水才舒服。", "High", True, True,
                "baseline 需第 4 轮显式陈述才跟上"),
    ],
    ours_lock_turn=3,
    baseline_lock_turn=4,
)


ALL_SCENARIOS: List[Scenario] = [LINWEI, WANGMIN]


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
        "avatar": s.avatar,
        "title_cn": s.title_cn,
        "summary": s.summary,
        "stable": [{"icon": p.icon, "text": p.text} for p in s.stable],
        "aspects": [
            {"icon": a.icon, "aspect": a.aspect,
             "ctx_a": a.ctx_a, "pref_a": a.pref_a,
             "ctx_b": a.ctx_b, "pref_b": a.pref_b}
            for a in s.aspects
        ],
        "align": [
            {"ctx_key": t.ctx_key, "user": t.user, "baseline": t.baseline, "ours": t.ours,
             "triggered_stable": t.triggered_stable, "triggered_aspect": t.triggered_aspect,
             "note": t.note}
            for t in s.align
        ],
        "conflict": {
            "user": s.conflict.user, "has_conflict": s.conflict.has_conflict,
            "baseline": s.conflict.baseline, "ours": s.conflict.ours,
            "conflict_explain": s.conflict.conflict_explain,
            "should_clarify": s.conflict.should_clarify,
        },
        "efficiency": [
            {"user": e.user, "relevance": e.relevance, "ours_locked": e.ours_locked,
             "baseline_locked": e.baseline_locked, "inferred": e.inferred}
            for e in s.efficiency
        ],
        "ours_lock_turn": s.ours_lock_turn,
        "baseline_lock_turn": s.baseline_lock_turn,
    }
