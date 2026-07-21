# -*- coding: utf-8 -*-
"""静态 demo 浏览器测试：用 Playwright 验证三个 demo 能加载、交互、渲染。

对每个 demo：
  1. 打开页面，收集 console 错误
  2. 验证关键 DOM 元素存在且数据已加载
  3. 模拟点击推进一轮，验证交互后元素更新
"""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8099"


def collect_errors(page):
    errs = []
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errs.append(str(e)))
    return errs


def test_pamdp(page):
    errs = collect_errors(page)
    page.goto(f"{BASE}/demos/papers/pamdp/", wait_until="networkidle")
    page.wait_for_timeout(500)

    # 画像下拉应已填充（4 个 option）
    opts = page.locator("#persona-select option").count()
    assert opts == 4, f"PAMDP persona options = {opts}, expect 4"

    # 属性卡片应渲染（8 个 designer 属性）
    cards = page.locator(".attr-card").count()
    assert cards > 0, "PAMDP attr-card 未渲染"

    # 点击开始 + 下一轮
    page.click("#start-btn")
    page.wait_for_timeout(300)
    page.click("#step-btn")
    page.wait_for_timeout(5000)  # 等打字机跑完一轮（query+reply 约 2-4s）

    bubbles = page.locator("#chat-pamdp .bubble").count()
    assert bubbles >= 2, f"PAMDP 点击后 bubble 数 = {bubbles}, expect >=2"
    kpi = page.locator("#vs-reward-p").inner_text()
    assert kpi != "+0.0", f"PAMDP KPI 未更新: {kpi}"

    print(f"  [OK] PAMDP: {opts} 画像, {cards} 属性卡, 点击后 {bubbles} 气泡, KPI={kpi}")
    assert not errs, f"PAMDP console errors: {errs}"


def test_d2pcm(page):
    errs = collect_errors(page)
    page.goto(f"{BASE}/demos/papers/d2pcm/", wait_until="networkidle")
    page.wait_for_timeout(500)

    opts = page.locator("#persona-select option").count()
    assert opts == 2, f"D2PCM persona options = {opts}, expect 2"

    # 点击下一轮
    page.click("#step-btn")
    page.wait_for_timeout(500)

    query = page.locator("#query").inner_text()
    assert "点击" not in query, f"D2PCM query 未更新: {query}"
    mems = page.locator(".mem-item").count()
    assert mems == 5, f"D2PCM memory items = {mems}, expect 5"
    resp = page.locator("#resp-d2pcm").inner_text()
    assert len(resp) > 5, f"D2PCM 回复为空: {resp}"

    print(f"  [OK] D2PCM: {opts} 画像, 点击后 {mems} 记忆, 回复长度={len(resp)}")
    assert not errs, f"D2PCM console errors: {errs}"


def test_thinking(page):
    errs = collect_errors(page)
    page.goto(f"{BASE}/demos/papers/thinking/", wait_until="networkidle")
    page.wait_for_timeout(500)

    opts = page.locator("#scenario-select option").count()
    assert opts == 2, f"Thinking scenario options = {opts}, expect 2"

    # 场景信息应填充
    goal = page.locator("#scene-goal").inner_text()
    assert goal != "—", f"Thinking goal 未加载: {goal}"

    # 点击下一轮
    page.click("#step-btn")
    page.wait_for_timeout(500)

    msgs = page.locator("#dialog .msg").count()
    assert msgs >= 2, f"Thinking 点击后 msg 数 = {msgs}, expect >=2"
    thoughts = page.locator(".thought").count()
    assert thoughts >= 1, f"Thinking thought 未出现: {thoughts}"

    print(f"  [OK] Thinking: {opts} 场景, 点击后 {msgs} 消息, {thoughts} 思维块")
    assert not errs, f"Thinking console errors: {errs}"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        for name, fn in [("PAMDP", test_pamdp), ("D2PCM", test_d2pcm), ("Thinking", test_thinking)]:
            page = ctx.new_page()
            try:
                fn(page)
            except AssertionError as e:
                print(f"  [FAIL] {name} FAILED: {e}")
                browser.close()
                return 1
            finally:
                page.close()
        browser.close()
    print("\nALL PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
