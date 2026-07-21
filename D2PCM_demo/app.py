# -*- coding: utf-8 -*-
"""D2PCM 交互演示 Flask 后端。

演示『个性化记忆选择 vs RAG』：
  每轮一个 5 条记忆 chunk；RAG 按相似度选，D2PCM 选与 Big-5 画像契合的那条。

API:
  GET  /                   -> 演示页面
  GET  /api/personas       -> Big-5 画像列表
  GET  /api/persona/<pid>  -> 画像完整脚本数据（含每轮记忆 chunk 与两路选择）
  GET  /api/llm_status     -> 在线 LLM 配置情况
  POST /api/live_select    -> （可选）live 模式让真实 LLM 选记忆并生成回复
"""
from __future__ import annotations

import logging
import os
import sys

from flask import Flask, jsonify, render_template, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from llm_client import chat_complete, llm_status
from scenarios import get_persona, persona_full, persona_index
import prompts

app = Flask(__name__, static_folder="static", template_folder="templates")
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("d2pcm")


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/personas")
def api_personas():
    return jsonify(persona_index())


@app.get("/api/persona/<pid>")
def api_persona(pid: str):
    try:
        return jsonify(persona_full(pid))
    except KeyError:
        return jsonify({"error": "unknown persona"}), 404


@app.get("/api/llm_status")
def api_llm_status():
    return jsonify(llm_status())


@app.post("/api/live_select")
def api_live_select():
    data = request.get_json(silent=True) or {}
    pid = data.get("pid", "nova")
    ti = int(data.get("turn", 0))
    if not llm_status()["available"]:
        return jsonify({"error": "LLM 未配置"}), 400
    try:
        p = get_persona(pid)
        turn = p.turns[ti]
        mem_block = "\n".join(f"[{i}] {m.text}" for i, m in enumerate(turn.memories))
        msg = prompts.D2PCM_SELECT_PROMPT.format(
            persona_desc=p.desc, query=turn.query, memories=mem_block)
        out = chat_complete([{"role": "user", "content": msg}], temperature=0.6, max_tokens=200)
        return jsonify({"resp_d2pcm": out})
    except Exception as e:
        log.exception("live_select failed")
        return jsonify({"error": f"{e}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("D2PCM_PORT", "7862"))
    host = os.environ.get("D2PCM_HOST", "127.0.0.1")
    print(f"\n  D2PCM Demo running at  http://{host}:{port}\n")
    app.run(host=host, port=port, debug=False, threaded=True)
