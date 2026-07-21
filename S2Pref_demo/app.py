# -*- coding: utf-8 -*-
"""S2Pref 交互演示 Flask 后端。

演示『稳定偏好 vs 情境偏好』三个任务：
  Task1 上下文对齐 / Task2 冲突检测与澄清 / Task3 推断效率

API:
  GET  /                  -> 演示页面
  GET  /api/scenarios     -> 可选画像列表
  GET  /api/scenario/<sid>-> 单个画像的完整脚本数据（前端据此渲染三个任务）
  GET  /api/llm_status    -> 在线 LLM 配置情况
  POST /api/live_align    -> （可选）live 模式实时生成上下文对齐回复

数据已全部脚本化在 scenarios.py，前端直接消费；live 仅作锦上添花。
"""
from __future__ import annotations

import logging
import os
import sys

from flask import Flask, jsonify, render_template, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm_client import chat_complete, llm_status
from scenarios import get_scenario, scenario_full, scenario_index
import prompts

app = Flask(__name__, static_folder="static", template_folder="templates")
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("s2pref")


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/scenarios")
def api_scenarios():
    return jsonify(scenario_index())


@app.get("/api/scenario/<sid>")
def api_scenario(sid: str):
    try:
        return jsonify(scenario_full(sid))
    except KeyError:
        return jsonify({"error": "unknown scenario"}), 404


@app.get("/api/llm_status")
def api_llm_status():
    return jsonify(llm_status())


@app.post("/api/live_align")
def api_live_align():
    """可选：用真实 LLM 生成某个语境下的对齐回复。"""
    data = request.get_json(silent=True) or {}
    sid = data.get("sid", "linwei")
    ctx_key = data.get("ctx_key", "a")
    if not llm_status()["available"]:
        return jsonify({"error": "LLM 未配置"}), 400
    try:
        s = get_scenario(sid)
        turn = next(t for t in s.align if t.ctx_key == ctx_key)
        aspect = s.aspects[turn.triggered_aspect]
        ctx = aspect.ctx_a if ctx_key == "a" else aspect.ctx_b
        situ_pref = aspect.pref_a if ctx_key == "a" else aspect.pref_b
        stable = "；".join(p.text for p in s.stable)
        msg = prompts.CONTEXT_ALIGN_PROMPT.format(
            stable=stable, ctx=ctx, situ_pref=situ_pref, user=turn.user)
        out = chat_complete([{"role": "user", "content": msg}], temperature=0.7, max_tokens=200)
        return jsonify({"ours": out})
    except Exception as e:
        log.exception("live_align failed")
        return jsonify({"error": f"{e}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("S2PREF_PORT", "7861"))
    host = os.environ.get("S2PREF_HOST", "127.0.0.1")
    print(f"\n  S2Pref Demo running at  http://{host}:{port}\n")
    app.run(host=host, port=port, debug=False, threaded=True)
