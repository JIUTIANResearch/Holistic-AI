# -*- coding: utf-8 -*-
"""PAMDP 展会演示 Flask 后端。

API:
  GET  /                    -> 仪表盘页面
  GET  /api/personas        -> 可选画像列表
  GET  /api/llm_status      -> 在线 LLM 配置情况
  POST /api/start           -> 初始化一次 episode  (body: {persona_id, mode})
  POST /api/step            -> 推进一轮，返回 TurnResult
  POST /api/reset           -> 重置当前 episode

为简单稳定，使用单全局会话（展台一次只有一位观众交互）。
"""
from __future__ import annotations

import logging
import os
import sys
from dataclasses import asdict

from flask import Flask, jsonify, render_template, request

# 让脚本可独立运行（demo/ 目录下）
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm_client import llm_status
from pamdp_engine import PAMDPEngine
from personas import persona_full, persona_index

app = Flask(__name__, static_folder="static", template_folder="templates")
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("pamdp")

# 单全局会话状态
_ENGINE: PAMDPEngine | None = None


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/personas")
def api_personas():
    return jsonify([
        {"id": pid, "avatar": av, "title_cn": cn, "title_en": en}
        for pid, av, cn, en in persona_index()
    ])


@app.get("/api/persona/<pid>")
def api_persona_full(pid: str):
    try:
        return jsonify(persona_full(pid))
    except KeyError:
        return jsonify({"error": "unknown persona"}), 404


@app.get("/api/llm_status")
def api_llm_status():
    return jsonify(llm_status())


@app.post("/api/start")
def api_start():
    global _ENGINE
    data = request.get_json(silent=True) or {}
    persona_id = data.get("persona_id", "designer")
    mode = data.get("mode", "script")
    if mode not in ("script", "live"):
        mode = "script"
    # 如果选 live 但 LLM 不可用，自动降级
    if mode == "live" and not llm_status()["available"]:
        mode = "script"
    _ENGINE = PAMDPEngine(persona_id=persona_id, mode=mode)
    log.info("start episode persona=%s mode=%s", persona_id, mode)
    return jsonify({"ok": True, **_ENGINE.to_dict()})


@app.post("/api/step")
def api_step():
    global _ENGINE
    if _ENGINE is None:
        return jsonify({"error": "no active episode, call /api/start first"}), 400
    try:
        turn = _ENGINE.step()
    except Exception as e:
        log.exception("step failed")
        return jsonify({"error": f"step failed: {e}"}), 500
    if turn is None:
        return jsonify({"done": True, **_ENGINE.to_dict()})
    return jsonify({"done": False, "turn_data": asdict(turn), **_ENGINE.to_dict()})


@app.post("/api/reset")
def api_reset():
    global _ENGINE
    if _ENGINE is None:
        return jsonify({"error": "no active episode"}), 400
    _ENGINE.reset()
    return jsonify({"ok": True, **_ENGINE.to_dict()})


if __name__ == "__main__":
    port = int(os.environ.get("PAMDP_PORT", "7860"))
    host = os.environ.get("PAMDP_HOST", "127.0.0.1")
    print(f"\n  PAMDP Demo running at  http://{host}:{port}\n")
    app.run(host=host, port=port, debug=False, threaded=True)
