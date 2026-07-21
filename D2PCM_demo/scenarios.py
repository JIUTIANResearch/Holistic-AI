# -*- coding: utf-8 -*-
"""D2PCM 演示数据：Big-5 画像 + 每轮 5 条记忆候选。

核心对照（论文 Table 3）：
  RAG    —— 按与 query 的相似度选记忆
  D2PCM  —— 选与用户 Big-5 画像契合的记忆（Personalized Contextual Memory）

每条记忆带：
  text       记忆内容
  sim        与当前 query 的相似度（0~1，模拟 RAG 打分）
  persona_fit是否为画像契合记忆（每轮恰好 1 条为 True）
  reward     若被选用，回复可获得的 reward（画像契合记忆 reward 更高）
"""
from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class Memory:
    text: str
    sim: float
    persona_fit: bool
    reward: float


@dataclass
class Turn:
    query: str
    memories: List[Memory]
    resp_rag: str          # RAG 选中记忆 → 通用回复
    resp_d2pcm: str        # D2PCM 选画像记忆 → 个性化回复


@dataclass
class Big5:
    o: int; c: int; e: int; a: int; n: int   # 0=Low, 1=High


@dataclass
class Persona:
    pid: str
    name: str
    avatar: str
    big5: Big5
    desc: str              # 画像文字描述
    turns: List[Turn] = field(default_factory=list)


def _rag_pick(ms: List[Memory]) -> int:
    return max(range(len(ms)), key=lambda i: ms[i].sim)


def _fit_pick(ms: List[Memory]) -> int:
    for i, m in enumerate(ms):
        if m.persona_fit:
            return i
    return 0


# ---------------------------------------------------------------------------
# 画像 1：高开放性 / 低尽责性 —— 自由创意型
# ---------------------------------------------------------------------------
NOVA = Persona(
    pid="nova",
    name="Nova · 创意自由职业者",
    avatar="🎨",
    big5=Big5(o=1, c=0, e=1, a=1, n=0),
    desc="高开放性、外向、随性不拘——重灵感与新鲜体验，讨厌死板计划。",
    turns=[
        Turn(
            query="周末想找点事做，有什么建议吗？",
            memories=[
                Memory("用户上周提到工作日程很满，需要补觉。", 0.71, False, 3.0),
                Memory("用户喜欢逛独立艺术市集，常被新奇手作吸引。", 0.52, True, 4.4),
                Memory("用户家附近新开了一家超市。", 0.33, False, 2.4),
                Memory("用户一般周末会做家务清单。", 0.61, False, 2.8),
                Memory("用户对健身房办了卡但很少去。", 0.40, False, 2.6),
            ],
            resp_rag="你上周说日程很满，那这周末就好好休息、补补觉吧。",
            resp_d2pcm="这周末城西有个独立艺术市集，全是新奇手作和小众设计，"
                       "正合你爱逛市集、爱被新鲜灵感击中的口味——去淘点宝贝？",
        ),
        Turn(
            query="最近有点提不起劲，怎么调整？",
            memories=[
                Memory("用户提到喜欢尝试没做过的事来找回状态。", 0.58, True, 4.5),
                Memory("用户说过睡眠还算规律。", 0.44, False, 2.7),
                Memory("用户偶尔会列待办清单。", 0.66, False, 2.9),
                Memory("用户喝咖啡提神。", 0.49, False, 2.8),
                Memory("用户家里有跑步机。", 0.39, False, 2.5),
            ],
            resp_rag="可以列个待办清单，把任务拆小一点，完成感会帮你找回动力。",
            resp_d2pcm="你一向是靠『没做过的新鲜事』来回血的——不如这周给自己安排一件"
                       "完全陌生的小冒险，比如去上一节从没碰过的陶艺课，灵感往往就回来了。",
        ),
        Turn(
            query="朋友约我出去玩，但我有点犹豫。",
            memories=[
                Memory("用户是外向型，和人相处后通常更有活力。", 0.55, True, 4.3),
                Memory("用户偶尔需要独处。", 0.57, False, 3.1),
                Memory("用户最近预算有点紧。", 0.50, False, 2.9),
                Memory("用户怕堵车。", 0.42, False, 2.5),
                Memory("用户有个待还的工作 deadline。", 0.63, False, 2.7),
            ],
            resp_rag="如果你最近有 deadline，也许先把工作处理完再考虑出去会更安心。",
            resp_d2pcm="按你外向的性子，和朋友疯一场往往会让你充满电、状态更好。"
                       "别犹豫，去吧——回来反而更有劲头收尾工作。",
        ),
    ],
)


# ---------------------------------------------------------------------------
# 画像 2：高尽责性 / 低开放性 —— 严谨规划型
# ---------------------------------------------------------------------------
GORDON = Persona(
    pid="gordon",
    name="Gordon · 严谨工程经理",
    avatar="📐",
    big5=Big5(o=0, c=1, e=0, a=0, n=0),
    desc="高尽责、内向、务实——重计划与确定性，偏好成熟可靠的方案。",
    turns=[
        Turn(
            query="想给团队引入一个新工具，你怎么看？",
            memories=[
                Memory("用户偏好成熟稳定、社区验证充分的方案，厌恶踩坑。", 0.54, True, 4.4),
                Memory("用户喜欢尝鲜各种新潮技术。", 0.48, False, 2.3),
                Memory("用户办公室在三楼。", 0.20, False, 2.0),
                Memory("用户团队有 8 个人。", 0.62, False, 2.9),
                Memory("用户最近在招人。", 0.51, False, 2.6),
            ],
            resp_rag="你们团队 8 个人，引入新工具时记得做好培训和权限分配。",
            resp_d2pcm="以你一贯求稳的风格，建议先选社区验证充分、文档完善的成熟方案，"
                       "小范围试点两周、列好回滚预案，确认无坑再全员推广。",
        ),
        Turn(
            query="项目排期总被打乱，有什么办法？",
            memories=[
                Memory("用户重视可预测性，喜欢预留缓冲区来吸收意外。", 0.56, True, 4.5),
                Memory("用户偶尔会临时改主意。", 0.45, False, 2.2),
                Memory("用户用 Jira 管理任务。", 0.64, False, 3.0),
                Memory("用户喜欢开长会。", 0.41, False, 2.4),
                Memory("用户团队远程办公。", 0.52, False, 2.7),
            ],
            resp_rag="你们用 Jira 的话，可以把任务拆得更细，便于跟踪进度。",
            resp_d2pcm="你最看重可预测性——建议在每个里程碑后预留 15~20% 的缓冲区，"
                       "专门吸收意外变更，排期被打乱的概率会明显下降。",
        ),
        Turn(
            query="下属总是拖延交付，我该怎么管理？",
            memories=[
                Memory("用户倾向用明确的流程和清晰的检查点来约束执行。", 0.57, True, 4.4),
                Memory("用户性格其实挺随和宽松。", 0.46, False, 2.1),
                Memory("用户喜欢喝茶。", 0.18, False, 2.0),
                Memory("用户团队最近士气一般。", 0.55, False, 2.8),
                Memory("用户读过几本管理书。", 0.50, False, 2.6),
            ],
            resp_rag="团队士气一般的时候，多一些正向激励可能会有帮助。",
            resp_d2pcm="依你重流程的管理风格，最有效的是设立明确的中间检查点——"
                       "把大交付拆成可验收的小节点，每节点对齐一次，拖延就难以累积。",
        ),
    ],
)


ALL_PERSONAS: List[Persona] = [NOVA, GORDON]
BIG5_AXES = [("O", "开放性"), ("C", "尽责性"), ("E", "外向性"), ("A", "宜人性"), ("N", "神经质")]


def get_persona(pid: str) -> Persona:
    for p in ALL_PERSONAS:
        if p.pid == pid:
            return p
    raise KeyError(f"unknown persona: {pid}")


def persona_index() -> List[Dict]:
    return [{"pid": p.pid, "avatar": p.avatar, "name": p.name} for p in ALL_PERSONAS]


def persona_full(pid: str) -> Dict:
    p = get_persona(pid)
    big5 = [p.big5.o, p.big5.c, p.big5.e, p.big5.a, p.big5.n]
    turns = []
    for t in p.turns:
        rag_i = _rag_pick(t.memories)
        fit_i = _fit_pick(t.memories)
        turns.append({
            "query": t.query,
            "memories": [
                {"text": m.text, "sim": m.sim, "persona_fit": m.persona_fit, "reward": m.reward}
                for m in t.memories
            ],
            "rag_pick": rag_i,
            "d2pcm_pick": fit_i,
            "resp_rag": t.resp_rag,
            "resp_d2pcm": t.resp_d2pcm,
            "reward_rag": t.memories[rag_i].reward,
            "reward_d2pcm": t.memories[fit_i].reward,
        })
    return {
        "pid": p.pid,
        "name": p.name,
        "avatar": p.avatar,
        "desc": p.desc,
        "big5": big5,
        "axes": [{"key": k, "label": lb} for k, lb in BIG5_AXES],
        "turns": turns,
    }
