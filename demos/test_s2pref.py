# -*- coding: utf-8 -*-
"""S2Pref 极简 demo 测试：验证切换情境后模型推断与推荐随之翻转。"""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8099"


def collect_errors(page):
    errs = []
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errs.append(str(e)))
    return errs


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        errs = collect_errors(page)
        page.goto(f"{BASE}/demos/papers/s2pref/", wait_until="networkidle")
        page.wait_for_timeout(500)

        # 画像与偏好结构渲染
        assert page.locator("#stable-list li").count() == 3, "稳定偏好应 3 条"
        assert "林伟" in page.locator("#p-name").inner_text()
        assert page.locator(".branch-line").count() == 2, "情境分支应 2 条"

        # 默认 friends：冒险
        assert page.locator(".tog.active").get_attribute("data-b") == "friends"
        rec0 = page.locator("#recommend").inner_text()
        assert "攀岩" in rec0 or "刺激" in rec0, f"friends 推荐应含攀岩/刺激: {rec0}"
        assert page.locator(".dialog .msg").count() >= 3

        # 切换到 family：推荐应翻转
        page.click(".tog[data-b='family']")
        page.wait_for_timeout(700)  # 等淡入动画
        assert page.locator(".tog.active").get_attribute("data-b") == "family"
        # 当前激活分支应是 family
        assert page.locator(".branch-line.active").get_attribute("data-b") == "family"
        rec1 = page.locator("#recommend").inner_text()
        assert rec1 != rec0, "切换情境后推荐未变"
        assert "缓步" in rec1 or "安全" in rec1 or "平缓" in rec1, f"family 推荐应含安全/缓步: {rec1}"

        # 切回 friends：恢复
        page.click(".tog[data-b='friends']")
        page.wait_for_timeout(700)
        rec2 = page.locator("#recommend").inner_text()
        assert rec2 == rec0, "切回 friends 推荐应恢复"

        print(f"  [OK] 切换情境推荐翻转: friends(攀岩) → family(缓步) → friends(攀岩)")
        assert not errs, f"console errors: {errs}"
        browser.close()
    print("\nALL PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
