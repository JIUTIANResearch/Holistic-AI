# -*- coding: utf-8 -*-
"""单端口网关：把 Hub 与交互演示挂在同一个端口（默认 8888）下。

适用于服务器只放通一个端口的情况。路由与 GitHub Pages 线上一致：

    /            -> Hub（site/，首页 + 论文概览，数据驱动自 papers.json）
    /demos/...   -> 交互演示（demos/papers/* 纯静态）

所有演示均已静态化，无需 Python 后端。用 Werkzeug 的 DispatcherMiddleware
按路径前缀把静态目录挂到一起。

用法：
    python gateway.py
    # 或指定端口/地址：
    GATEWAY_PORT=8888 GATEWAY_HOST=0.0.0.0 python gateway.py
"""
from __future__ import annotations

import os
import sys

from flask import Flask, send_from_directory
from werkzeug.middleware.dispatcher import DispatcherMiddleware

# Windows 控制台默认 GBK，强制 UTF-8 输出，避免特殊字符报错
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

ROOT = os.path.dirname(os.path.abspath(__file__))


def make_static_app(directory: str, name: str) -> Flask:
    """把一个静态目录包成最小 Flask 应用（用于 Hub 与交互演示）。"""
    app = Flask(name, static_folder=None)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        target = path or "index.html"
        full = os.path.join(directory, target)
        if os.path.isfile(full):
            return send_from_directory(directory, target)
        # 目录请求回退到该目录的 index.html（演示页入口）
        if os.path.isdir(full):
            idx = os.path.join(full, "index.html")
            if os.path.isfile(idx):
                return send_from_directory(full, "index.html")
        # 未知路径：根 index.html
        return send_from_directory(directory, "index.html")

    return app


def build() -> DispatcherMiddleware:
    hub = make_static_app(os.path.join(ROOT, "site"), "hub")

    mounts = {}
    # 交互演示整体挂到 /demos，路径与 GitHub Pages 线上一致
    demos_dir = os.path.join(ROOT, "demos")
    if os.path.isdir(demos_dir):
        mounts["/demos"] = make_static_app(demos_dir, "demos")
        print("  mounted  /demos  -> demos/ (静态交互演示)")

    return DispatcherMiddleware(hub, mounts)


app = build()  # WSGI 可调用对象（供 gunicorn/waitress 等使用）


if __name__ == "__main__":
    from werkzeug.serving import run_simple

    port = int(os.environ.get("GATEWAY_PORT", "8888"))
    host = os.environ.get("GATEWAY_HOST", "0.0.0.0")
    print(f"\n=== JIUTIAN Research · Paper Presentation ===")
    print(f"  全部服务已合并到单端口： http://{host}:{port}/\n")
    run_simple(host, port, app, threaded=True)
