# -*- coding: utf-8 -*-
"""ThinkingUS 交互演示 Flask 后端。

演示『带内心思维的用户模拟』：
  每条用户话语背后有隐藏的内心思维（元认知控制 / 推理操作）。
  ThinkingUS（思维驱动）vs Role-play（仅表层话语）。

API:
  GET  /                   -> 演示页面
  GET  /api/scenarios      -> 场景列表
  GET  /api/scenario/<sid> -> 场景完整脚本数据
  GET  /api/llm_status     -> 在线 LLM 配置情况
  POST /api/live_turn      -> （可选）live 模式让真实 LLM 生成 思维+话语
"""
from __future__ import annotations

import logging
import os
import re
import sys

from flask import Flask, jsonify, render_template, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm_client import chat_complete, llm_status
from scenarios import get_scenario, scenario_full, scenario_index
import prompts

app = Flask(__name__, static_folder="static", template_folder="templates")
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("thinking")


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


@app.post("/api/live_turn")
def api_live_turn():
    data = request.get_json(silent=True) or {}
    sid = data.get("sid", "tts")
    ti = int(data.get("turn", 0))
    if not llm_status()["available"]:
        return jsonify({"error": "LLM 未配置"}), 400
    try:
        s = get_scenario(sid)
        turn = s.turns[ti]
        msg = prompts.THINKING_US_PROMPT.format(
            goal=s.goal, background=s.background, emotion=s.emotion,
            assistant=turn.assistant)
        out = chat_complete([{"role": "user", "content": msg}], temperature=0.8, max_tokens=260)
        thought = _extract(out, "THOUGHT")
        utt = _extract(out, "UTTERANCE")
        return jsonify({"thought": thought, "utterance": utt})
    except Exception as e:
        log.exception("live_turn failed")
        return jsonify({"error": f"{e}"}), 500


def _extract(text: str, tag: str) -> str:
    m = re.search(rf"{tag}\s*[:：]\s*(.+?)(?=\n[A-Z]+\s*[:：]|$)", text, re.S)
    return m.group(1).strip() if m else ""


if __name__ == "__main__":
    port = int(os.environ.get("THINKING_PORT", "7863"))
    host = os.environ.get("THINKING_HOST", "127.0.0.1")
    print(f"\n  ThinkingUS Demo running at  http://{host}:{port}\n")
    app.run(host=host, port=port, debug=False, threaded=True)
