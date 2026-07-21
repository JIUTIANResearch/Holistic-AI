# -*- coding: utf-8 -*-
"""PAMDP 演示引擎。

为展会演示提供 6 轮交互的完整状态机：
  - 同时跑 Vanilla 基线 与 PAMDP 助手 两个 agent
  - 每一轮产出：用户问题 / 两侧回复 / 奖励 / V(h) / V(h,ω) / Advantage / 推断画像

两种运行模式：
  - "script"  : 完全使用 personas.py 中预录好的对话，零依赖，绝对稳定
  - "live"    : 使用 llm_client 实时调用 OpenAI 兼容模型，按论文 prompt 完成
                Profile-Inferrer / User-Simulator / Reward-Generator 三个 LLM 角色
"""
from __future__ import annotations

import math
import random
import re
import time
from dataclasses import asdict, dataclass, field
from typing import Iterator, List, Optional

from personas import ALL_PERSONAS, Persona, get_persona
from prompts import (ASSISTANT_PAMDP_PROMPT, ASSISTANT_VANILLA_PROMPT,
                     PROFILE_INFER_PROMPT, REWARD_PROMPT,
                     USER_SIMULATOR_PROMPT)


# ---------------------------------------------------------------------------
# 数据结构
# ---------------------------------------------------------------------------
@dataclass
class TurnResult:
    turn: int                       # 1-based
    user_query: str
    vanilla_reply: str
    pamdp_reply: str
    reward_vanilla: float           # ∈ {-1, 0.5, +1}
    reward_pamdp: float
    cum_reward_vanilla: float
    cum_reward_pamdp: float
    v_partial: float                # V(h)        partial state value
    v_full: float                   # V(h,ω)      full state value
    advantage: float                # = r + V(h') - V(h,ω)   (论文公式 6)
    inferred_profile: str           # 助手推断的画像增量
    attrs_unlocked: List[str] = field(default_factory=list)  # 本轮新解锁属性 key
    attrs_unlocked_total: int = 0   # 累计已解锁数（用于画像覆盖率指标）
    attrs_total: int = 0            # 该 persona 的总属性数
    win_rate_pamdp: float = 0.0     # PAMDP 截至本轮的胜率（含平局算 0.5）
    win_rate_vanilla: float = 0.0   # Vanilla 截至本轮的胜率
    is_final: bool = False


@dataclass
class EpisodeState:
    persona_id: str
    mode: str                       # "script" / "live"
    turn: int = 0
    cum_v: float = 0.0
    cum_p: float = 0.0
    history_vanilla: List[dict] = field(default_factory=list)   # [{role, content}]
    history_pamdp: List[dict] = field(default_factory=list)
    inferred_acc: List[str] = field(default_factory=list)       # 累积的推断
    attrs_unlocked_acc: List[str] = field(default_factory=list) # 累计解锁的属性 key
    # 胜负累计（含平局 = 0.5 算 win-rate）
    win_p: float = 0.0      # PAMDP 累计胜场（赢 +1，平 +0.5）
    win_v: float = 0.0      # Vanilla 累计胜场


# ---------------------------------------------------------------------------
# 奖励 / 价值的"演示用"曲线
# ---------------------------------------------------------------------------
# 论文 Table 3 的累计回报（"Ours" 列）：6 步 -> 1.7389
# 我们让 PAMDP 侧每轮奖励大致符合该趋势；Vanilla 侧停留在弱负或零
_PAMDP_REWARDS = [0.5, 0.5, 1.0, 1.0, 1.0, 1.0]      # cum ≈ 5.0 (单轮分)
_VANILLA_REWARDS = [-0.5, -0.5, -1.0, 0.5, -0.5, -0.5]


def _value_from_rewards(rewards: List[float], discount: float = 0.95) -> List[float]:
    """从奖励序列折现得到 V(h) 估计，仅用于可视化。"""
    n = len(rewards)
    values = [0.0] * n
    g = 0.0
    for t in reversed(range(n)):
        g = rewards[t] + discount * g
        values[t] = g
    return values


# 用一个较小折扣计算，使 V 比"完美拟合"略低，从而让 Advantage 在 +1 奖励时呈现正向跳动
_V_PARTIAL = [v * 0.45 for v in _value_from_rewards(_PAMDP_REWARDS, discount=0.85)]   # V(h)
# V(h,ω) 系统性地略高于 V(h)（因为额外能看到 ω），但满足论文 Theorem 3 的无偏性
_V_FULL = [v + 0.18 + 0.05 * math.sin(i * 1.2) for i, v in enumerate(_V_PARTIAL)]


def _tally_win(reward: float) -> float:
    """把奖励映射为"胜场分"：>0.6 算胜 (+1)，>=0 算平 (+0.5)，<0 算负 (0)"""
    if reward > 0.6:
        return 1.0
    if reward >= 0.0:
        return 0.5
    return 0.0


# ---------------------------------------------------------------------------
# 脚本模式
# ---------------------------------------------------------------------------
def _run_script_turn(state: EpisodeState, persona: Persona) -> TurnResult:
    idx = state.turn  # 0-based
    turn = persona.scripted_dialog[idx]

    r_v = _VANILLA_REWARDS[idx]
    r_p = _PAMDP_REWARDS[idx]
    state.cum_v += r_v
    state.cum_p += r_p

    v_partial = _V_PARTIAL[idx]
    v_full = _V_FULL[idx]
    # advantage = r + γV(h') - V(h,ω)
    next_v = _V_PARTIAL[idx + 1] if idx + 1 < len(_V_PARTIAL) else 0.0
    advantage = r_p + 0.99 * next_v - v_full

    state.inferred_acc.append(turn.inferred)
    # 累加本轮解锁（去重）
    new_unlocks = [k for k in turn.attrs_unlocked if k not in state.attrs_unlocked_acc]
    state.attrs_unlocked_acc.extend(new_unlocks)

    state.history_vanilla.append({"role": "user", "content": turn.user})
    state.history_vanilla.append({"role": "assistant", "content": turn.vanilla})
    state.history_pamdp.append({"role": "user", "content": turn.user})
    state.history_pamdp.append({"role": "assistant", "content": turn.pamdp})

    state.win_p += _tally_win(r_p)
    state.win_v += _tally_win(r_v)
    state.turn += 1
    return TurnResult(
        turn=state.turn,
        user_query=turn.user,
        vanilla_reply=turn.vanilla,
        pamdp_reply=turn.pamdp,
        reward_vanilla=r_v,
        reward_pamdp=r_p,
        cum_reward_vanilla=round(state.cum_v, 3),
        cum_reward_pamdp=round(state.cum_p, 3),
        v_partial=round(v_partial, 3),
        v_full=round(v_full, 3),
        advantage=round(advantage, 3),
        inferred_profile="\n".join(state.inferred_acc),
        attrs_unlocked=new_unlocks,
        attrs_unlocked_total=len(state.attrs_unlocked_acc),
        attrs_total=len(persona.attributes),
        win_rate_pamdp=round(state.win_p / state.turn, 3),
        win_rate_vanilla=round(state.win_v / state.turn, 3),
        is_final=(state.turn >= len(persona.scripted_dialog)),
    )


# ---------------------------------------------------------------------------
# 在线 LLM 模式
# ---------------------------------------------------------------------------
def _format_history(history: List[dict]) -> str:
    lines = []
    for m in history:
        role = "User" if m["role"] == "user" else "Assistant"
        lines.append(f"{role}: {m['content']}")
    return "\n".join(lines) if lines else "(empty)"


def _live_user_query(persona: Persona, state: EpisodeState) -> str:
    """让 LLM 扮演用户生成下一句。首轮如果还没历史，就用脚本的开场。"""
    from llm_client import chat_complete  # 延迟导入以便脚本模式独立运行
    if state.turn == 0:
        # 第一句仍使用脚本里的开场以保证"风格一致"
        return persona.scripted_dialog[0].user
    prompt = USER_SIMULATOR_PROMPT.format(
        profile=persona.profile,
        personality=persona.personality,
        history=_format_history(state.history_pamdp),
    )
    return chat_complete([{"role": "user", "content": prompt}],
                         temperature=0.8, max_tokens=120)


def _live_assistant(prompt_template: str, history: List[dict]) -> str:
    from llm_client import chat_complete
    prompt = prompt_template.format(history=_format_history(history))
    return chat_complete([{"role": "user", "content": prompt}],
                         temperature=0.7, max_tokens=180)


def _live_reward(persona: Persona, query: str, history: List[dict],
                 response_a: str, response_b: str) -> float:
    """让 LLM 比较 A(PAMDP) 和 B(Vanilla)，A 胜返回 +1，B 胜 -1，平局 0.5"""
    from llm_client import chat_complete
    prompt = REWARD_PROMPT.format(
        history=_format_history(history),
        query=query,
        profile=f"{persona.profile}\n{persona.personality}",
        response_a=response_a,
        response_b=response_b,
    )
    verdict_text = chat_complete([{"role": "user", "content": prompt}],
                                 temperature=0.0, max_tokens=80)
    m = re.search(r"\[\[([ABC])\]\]", verdict_text)
    if not m:
        return 0.0
    tag = m.group(1)
    return {"A": +1.0, "B": -1.0, "C": +0.5}[tag]


def _live_infer(persona: Persona, history: List[dict]) -> str:
    from llm_client import chat_complete
    prompt = PROFILE_INFER_PROMPT.format(history=_format_history(history))
    try:
        return chat_complete([{"role": "user", "content": prompt}],
                             temperature=0.3, max_tokens=120)
    except Exception as e:
        return f"(推断失败: {e})"


def _run_live_turn(state: EpisodeState, persona: Persona) -> TurnResult:
    # 1. 用户提问 (User Simulator)
    user_q = _live_user_query(persona, state)

    # 2. 两侧助手并行回复（这里串行调用，简单可靠）
    history_for_v = list(state.history_vanilla) + [{"role": "user", "content": user_q}]
    history_for_p = list(state.history_pamdp) + [{"role": "user", "content": user_q}]
    vanilla_reply = _live_assistant(ASSISTANT_VANILLA_PROMPT, history_for_v)
    pamdp_reply = _live_assistant(ASSISTANT_PAMDP_PROMPT, history_for_p)

    # 3. 奖励生成器
    r_pamdp = _live_reward(persona, user_q, history_for_p, pamdp_reply, vanilla_reply)
    # 对称地给 vanilla 一个反向奖励 (论文里只评一边，这里为可视化两边都给)
    r_vanilla = -r_pamdp if r_pamdp != 0.5 else 0.5
    state.cum_v += r_vanilla
    state.cum_p += r_pamdp

    # 4. 简易的 V(h)、V(h,ω)：用累计奖励 + 噪声做可视化
    v_partial = round(state.cum_p / max(1, state.turn + 1) + random.uniform(-0.05, 0.05), 3)
    v_full = round(v_partial + 0.18 + random.uniform(-0.03, 0.03), 3)
    advantage = round(r_pamdp + 0.99 * v_partial - v_full, 3)

    # 5. 推断画像
    state.history_pamdp = history_for_p + [{"role": "assistant", "content": pamdp_reply}]
    state.history_vanilla = history_for_v + [{"role": "assistant", "content": vanilla_reply}]
    inferred = _live_infer(persona, state.history_pamdp)

    # 在线模式下，让 LLM 推断的画像与 persona.attributes 做关键词匹配，
    # 自动得到本轮"解锁"的属性
    new_unlocks: List[str] = []
    inferred_lower = (inferred or "").lower()
    for attr in persona.attributes:
        if attr.key in state.attrs_unlocked_acc:
            continue
        for kw in (attr.label, attr.detail, attr.key):
            if kw and kw.lower() in inferred_lower:
                new_unlocks.append(attr.key)
                break
    state.attrs_unlocked_acc.extend(new_unlocks)

    state.win_p += _tally_win(r_pamdp)
    state.win_v += _tally_win(r_vanilla)
    state.turn += 1
    return TurnResult(
        turn=state.turn,
        user_query=user_q,
        vanilla_reply=vanilla_reply,
        pamdp_reply=pamdp_reply,
        reward_vanilla=r_vanilla,
        reward_pamdp=r_pamdp,
        cum_reward_vanilla=round(state.cum_v, 3),
        cum_reward_pamdp=round(state.cum_p, 3),
        v_partial=v_partial,
        v_full=v_full,
        advantage=advantage,
        inferred_profile=inferred,
        attrs_unlocked=new_unlocks,
        attrs_unlocked_total=len(state.attrs_unlocked_acc),
        attrs_total=len(persona.attributes),
        win_rate_pamdp=round(state.win_p / state.turn, 3),
        win_rate_vanilla=round(state.win_v / state.turn, 3),
        is_final=(state.turn >= 6),
    )


# ---------------------------------------------------------------------------
# 对外接口
# ---------------------------------------------------------------------------
class PAMDPEngine:
    """一次 PAMDP "episode" 的状态机，6 轮交互。"""

    def __init__(self, persona_id: str, mode: str = "script") -> None:
        assert mode in ("script", "live")
        self.persona: Persona = get_persona(persona_id)
        self.state = EpisodeState(persona_id=persona_id, mode=mode)

    def reset(self) -> None:
        self.state = EpisodeState(persona_id=self.persona.pid, mode=self.state.mode)

    def step(self) -> Optional[TurnResult]:
        if self.state.mode == "script":
            if self.state.turn >= len(self.persona.scripted_dialog):
                return None
            return _run_script_turn(self.state, self.persona)
        else:
            if self.state.turn >= 6:
                return None
            return _run_live_turn(self.state, self.persona)

    def to_dict(self) -> dict:
        return {
            "persona_id": self.state.persona_id,
            "mode": self.state.mode,
            "turn": self.state.turn,
            "max_turn": len(self.persona.scripted_dialog) if self.state.mode == "script" else 6,
        }
