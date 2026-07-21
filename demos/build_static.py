# -*- coding: utf-8 -*-
"""静态 demo 数据生成脚本。

复用各 Flask demo 已有的 engine / scenarios 模块，把脚本模式的数据预生成成 JSON，
供 demos/papers/<abbr>/data/ 下的纯前端页面读取。

注册表 PAPERS 是加新论文的唯一入口：
  新论文只需加一行 ("abbr", "源模块路径", build_fn) 并实现 build_fn。

用法：
  python demos/build_static.py            # 生成全部
  python demos/build_static.py pamdp      # 只生成某篇
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys
from typing import Callable, Dict, List

# 让脚本能 import 各 demo 目录下的模块
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)


def _load_module(name: str, file_path: str):
    """按文件路径显式加载模块，避免各 demo 同名 scenarios.py 互相覆盖。"""
    spec = importlib.util.spec_from_file_location(name, file_path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod  # 注册进 sys.modules，让 dataclass 等机制能查到
    spec.loader.exec_module(mod)
    return mod


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _dump(path: str, obj) -> None:
    _ensure_dir(os.path.dirname(path))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print(f"  wrote {os.path.relpath(path, ROOT)}")


# ---------------------------------------------------------------------------
# PAMDP：复用 PAMDPEngine 跑 script 模式 6 轮完整轨迹
# ---------------------------------------------------------------------------
def build_pamdp(out_dir: str) -> None:
    # PAMDP_demo 的模块名不与他人冲突，用普通 import 即可
    sys.path.insert(0, os.path.join(ROOT, "PAMDP_demo"))
    from pamdp_engine import PAMDPEngine
    from personas import ALL_PERSONAS, persona_full, persona_index
    from dataclasses import asdict

    index = [
        {"id": pid, "avatar": av, "title_cn": cn, "title_en": en}
        for pid, av, cn, en in persona_index()
    ]
    _dump(os.path.join(out_dir, "personas.json"), index)

    for p in ALL_PERSONAS:
        eng = PAMDPEngine(persona_id=p.pid, mode="script")
        meta = eng.to_dict()
        turns: List[Dict] = []
        while True:
            t = eng.step()
            if t is None:
                break
            turns.append(asdict(t))
        _dump(os.path.join(out_dir, f"episode_{p.pid}.json"), {
            **meta,
            "persona": persona_full(p.pid),
            "turns": turns,
        })


# ---------------------------------------------------------------------------
# D2PCM：复用 scenarios.persona_full，整包输出
# ---------------------------------------------------------------------------
def build_d2pcm(out_dir: str) -> None:
    sc = _load_module("d2pcm_scenarios", os.path.join(ROOT, "D2PCM_demo", "scenarios.py"))
    _dump(os.path.join(out_dir, "personas.json"), sc.persona_index())
    for p in sc.ALL_PERSONAS:
        _dump(os.path.join(out_dir, f"persona_{p.pid}.json"), sc.persona_full(p.pid))


# ---------------------------------------------------------------------------
# ThinkingUS：复用 scenarios.scenario_full，整包输出
# ---------------------------------------------------------------------------
def build_thinking(out_dir: str) -> None:
    sc = _load_module("thinking_scenarios", os.path.join(ROOT, "Thinking_demo", "scenarios.py"))
    _dump(os.path.join(out_dir, "scenarios.json"), sc.scenario_index())
    for s in sc.ALL_SCENARIOS:
        _dump(os.path.join(out_dir, f"scenario_{s.sid}.json"), sc.scenario_full(s.sid))


# ---------------------------------------------------------------------------
# 注册表：加新论文在这里加一行
# ---------------------------------------------------------------------------
PAPERS: List[Dict] = [
    {"abbr": "pamdp",    "build": build_pamdp},
    {"abbr": "d2pcm",    "build": build_d2pcm},
    {"abbr": "thinking", "build": build_thinking},
]


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else None
    for paper in PAPERS:
        abbr = paper["abbr"]
        if target and abbr != target:
            continue
        out_dir = os.path.join(ROOT, "demos", "papers", abbr, "data")
        print(f"[build] {abbr} -> {os.path.relpath(out_dir, ROOT)}/")
        paper["build"](out_dir)
    print("done.")


if __name__ == "__main__":
    main()
