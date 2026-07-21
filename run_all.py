# -*- coding: utf-8 -*-
"""一键启动：把 Hub 与四个演示全部合并到单个端口（默认 8888）。

服务器若只放通一个端口，用这个最省事——所有内容都在同一端口下：

    http://<host>:8888/            Hub（含四个论文概览页）
    http://<host>:8888/pamdp/      PAMDP 交互演示
    http://<host>:8888/d2pcm/      D2PCM 交互演示
    http://<host>:8888/thinking/   ThinkingUS 交互演示
    http://<host>:8888/s2pref/     S2Pref 演示（safe_v2 SPA）

用法：
    python run_all.py
    # 指定端口/对外地址：
    GATEWAY_PORT=8888 GATEWAY_HOST=0.0.0.0 python run_all.py

按 Ctrl+C 关闭。

可选：先配置 OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL，
则三个 Flask demo 的「在线 LLM」模式自动可用（否则全程脚本模式，零依赖）。
"""
from __future__ import annotations

import os
import sys
import time
import webbrowser
from threading import Thread

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

PORT = int(os.environ.get("GATEWAY_PORT", "8888"))
HOST = os.environ.get("GATEWAY_HOST", "0.0.0.0")
# 浏览器用 127.0.0.1（0.0.0.0 不是可访问地址）
BROWSE_HOST = "127.0.0.1" if HOST in ("0.0.0.0", "") else HOST
HUB_URL = f"http://{BROWSE_HOST}:{PORT}/"


def main() -> None:
    from werkzeug.serving import run_simple
    import gateway  # 构建时即打印各路由挂载情况

    print("\n=== JIUTIAN Research · Paper Presentation · 单端口启动 ===")
    print(f"  全部服务： {HUB_URL}")
    print(f"    Hub        {HUB_URL}")
    print(f"    PAMDP      {HUB_URL}pamdp/")
    print(f"    D2PCM      {HUB_URL}d2pcm/")
    print(f"    ThinkingUS {HUB_URL}thinking/")
    print(f"    S2Pref     {HUB_URL}s2pref/")
    print("\n  按 Ctrl+C 关闭。\n")

    # 延迟开浏览器（本机演示时方便；服务器无显示也不影响）
    def _open():
        time.sleep(1.5)
        try:
            webbrowser.open(HUB_URL)
        except Exception:
            pass
    Thread(target=_open, daemon=True).start()

    run_simple(HOST, PORT, gateway.app, threaded=True)


if __name__ == "__main__":
    main()
