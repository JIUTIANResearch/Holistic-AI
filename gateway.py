# -*- coding: utf-8 -*-
"""单端口网关：把 Hub、四个演示全部挂在同一个端口（默认 8888）下。

适用于服务器只放通一个端口的情况。路由：

    /            -> Hub（site/，含四个论文概览页）
    /pamdp/      -> PAMDP 交互演示（Flask）
    /d2pcm/      -> D2PCM 交互演示（Flask）
    /thinking/   -> ThinkingUS 交互演示（Flask）
    /s2pref/     -> S2Pref 演示（safe_v2 预构建 SPA，纯静态）

实现：用 Werkzeug 的 DispatcherMiddleware 按路径前缀把多个 WSGI 应用组合到一起。
三个 Flask demo 各自目录下都有同名的 scenarios.py / prompts.py / llm_client.py，
因此用独立的模块命名空间分别加载，避免互相覆盖。

用法：
    python gateway.py
    # 或指定端口/地址：
    GATEWAY_PORT=8888 GATEWAY_HOST=0.0.0.0 python gateway.py
"""
from __future__ import annotations

import importlib.util
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


def load_demo_app(subdir: str, modname: str) -> Flask:
    """在隔离的模块命名空间下加载某个 demo 的 Flask app。

    各 demo 目录下有同名模块（scenarios/prompts/llm_client），因此：
      1. 把该 demo 目录临时放到 sys.path 最前；
      2. 用唯一前缀加载其依赖模块，注册进 sys.modules；
      3. 加载 app.py 拿到其中的 `app` 对象。
    """
    demo_dir = os.path.join(ROOT, subdir)
    saved_path = list(sys.path)
    sys.path.insert(0, demo_dir)
    try:
        # 先以唯一名字加载该 demo 的本地依赖，避免与其它 demo 同名模块冲突
        for dep in ("llm_client", "prompts", "scenarios", "personas", "pamdp_engine"):
            dep_file = os.path.join(demo_dir, f"{dep}.py")
            if not os.path.isfile(dep_file):
                continue
            unique = f"{modname}__{dep}"
            spec = importlib.util.spec_from_file_location(dep, dep_file)
            mod = importlib.util.module_from_spec(spec)
            # 同时以原名注册，保证 app.py 内 `import scenarios` 能命中本 demo 的
            sys.modules[dep] = mod
            sys.modules[unique] = mod
            spec.loader.exec_module(mod)

        app_file = os.path.join(demo_dir, "app.py")
        spec = importlib.util.spec_from_file_location(f"{modname}__app", app_file)
        app_mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(app_mod)
        flask_app = app_mod.app

        # 因为是用 importlib 以合成模块名加载 app.py，Flask 的 root_path 会落到
        # 当前工作目录而非 demo 目录，导致 templates/static 解析错误。
        # 这里把模板与静态目录强制指回该 demo 的绝对路径。
        import jinja2
        tpl_dir = os.path.join(demo_dir, "templates")
        static_dir = os.path.join(demo_dir, "static")
        flask_app.root_path = demo_dir
        flask_app.template_folder = tpl_dir
        flask_app.jinja_loader = jinja2.FileSystemLoader(tpl_dir)
        flask_app.static_folder = static_dir
        # 重新绑定 static 视图，使其从正确目录取文件
        if "static" in flask_app.view_functions:
            from flask import send_from_directory

            def _static(filename, _d=static_dir):
                return send_from_directory(_d, filename)

            flask_app.view_functions["static"] = _static
        return flask_app
    finally:
        # 清理：移除本 demo 临时注册的原名模块，避免污染下一个 demo 的加载
        for dep in ("llm_client", "prompts", "scenarios", "personas", "pamdp_engine"):
            sys.modules.pop(dep, None)
        sys.path[:] = saved_path


def make_static_app(directory: str, name: str) -> Flask:
    """把一个静态目录包成最小 Flask 应用（用于 Hub 与 safe_v2 SPA）。"""
    app = Flask(name, static_folder=None)

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        target = path or "index.html"
        full = os.path.join(directory, target)
        if not os.path.isfile(full):
            # SPA 回退：目录请求或未知路径回到 index.html
            if os.path.isdir(full):
                idx = os.path.join(full, "index.html")
                if os.path.isfile(idx):
                    return send_from_directory(full, "index.html")
            return send_from_directory(directory, "index.html")
        return send_from_directory(directory, target)

    return app


def build() -> DispatcherMiddleware:
    hub = make_static_app(os.path.join(ROOT, "site"), "hub")

    mounts = {}

    pamdp = load_demo_app("PAMDP_demo", "pamdp")
    mounts["/pamdp"] = pamdp
    print("  mounted  /pamdp     -> PAMDP_demo")

    d2pcm = load_demo_app("D2PCM_demo", "d2pcm")
    mounts["/d2pcm"] = d2pcm
    print("  mounted  /d2pcm     -> D2PCM_demo")

    thinking = load_demo_app("Thinking_demo", "thinking")
    mounts["/thinking"] = thinking
    print("  mounted  /thinking  -> Thinking_demo")

    s2pref_dist = os.path.join(ROOT, "safe_v2", "dist")
    if os.path.isdir(s2pref_dist):
        mounts["/s2pref"] = make_static_app(s2pref_dist, "s2pref")
        print("  mounted  /s2pref    -> safe_v2/dist (SPA)")
    else:
        print(f"  [跳过] /s2pref: 未找到 {s2pref_dist}")

    return DispatcherMiddleware(hub, mounts)


app = build()  # WSGI 可调用对象（供 gunicorn/waitress 等使用）


if __name__ == "__main__":
    from werkzeug.serving import run_simple

    port = int(os.environ.get("GATEWAY_PORT", "8888"))
    host = os.environ.get("GATEWAY_HOST", "0.0.0.0")
    print(f"\n=== JIUTIAN Research · Paper Presentation ===")
    print(f"  全部服务已合并到单端口： http://{host}:{port}/\n")
    run_simple(host, port, app, threaded=True)
