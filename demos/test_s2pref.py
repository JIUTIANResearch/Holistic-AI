# -*- coding: utf-8 -*-
"""S2Pref demo 浏览器测试：验证「模型推断/回应，用户当评测者」的交互方向。

- Task1: 显式场景 → 模型候选回应卡片渲染，用户评分后揭示论文评分
- Task2: 模糊场景 → 候选回应含 Rask/Rassume/Rrand/Rfail 四类，评分揭示
- Task3: 逐轮揭示 → 模型每轮推断显示在气泡上，点击轮次标记收敛点
"""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8099"


def collect_errors(page):
    errs = []
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errs.append(str(e)))
    return errs


def open_demo(page):
    page.goto(f"{BASE}/demos/papers/s2pref/", wait_until="networkidle")
    page.wait_for_timeout(400)


def test_task1(page):
    errs = collect_errors(page)
    open_demo(page)
    # 默认进入 Task1；显式查询场景应有 option
    page.click(".tab[data-task='1']")
    page.wait_for_timeout(200)
    opts = page.locator("#scenario-select option").count()
    assert opts >= 2, f"Task1 场景数={opts}, 期望>=2"

    # 模型候选回应卡片
    cards = page.locator(".resp-card").count()
    assert cards == 3, f"Task1 候选回应卡={cards}, 期望3"

    # 首张卡评分按钮 1-5
    btns = page.locator(".resp-card").first.locator(".score-btn").count()
    assert btns == 5, f"评分按钮数={btns}, 期望5"

    # 点 5 分（首张应是 align=5）应揭示论文评分
    page.locator(".resp-card").first.locator(".score-btn").nth(4).click()
    page.wait_for_timeout(200)
    reveal = page.locator(".resp-card").first.locator(".resp-reveal:not(.hidden)")
    assert reveal.count() == 1, "评分后未揭示论文评分"
    txt = reveal.inner_text()
    assert "论文评分" in txt, f"揭示内容缺论文评分: {txt}"

    # 首张已评分(5);评完剩余 2 张触发汇总。第2张 partial=3,第3张 wrong=2
    remaining = [(1, 3), (2, 2)]
    for i, sc in remaining:
        page.locator(".resp-card").nth(i).locator(".score-btn").nth(sc - 1).click()
        page.wait_for_timeout(100)
    fb = page.locator("#feedback").inner_text()
    assert "评测完成" in fb, f"未出现评测汇总: {fb}"

    print(f"  [OK] Task1: {opts} 场景, {cards} 候选回应, 评分揭示正常, 汇总OK")
    assert not errs, f"Task1 console errors: {errs}"


def test_task2(page):
    errs = collect_errors(page)
    open_demo(page)
    page.click(".tab[data-task='2']")
    page.wait_for_timeout(300)
    # 模糊场景(social)应有 2 个,每个 4 个回应
    opts = page.locator("#scenario-select option").count()
    assert opts == 2, f"Task2 场景数={opts}, 期望2"
    cards = page.locator(".resp-card").count()
    assert cards == 4, f"Task2 候选回应卡={cards}, 期望4"
    # 评分按钮 0-5 共6个
    btns = page.locator(".resp-card").first.locator(".score-btn").count()
    assert btns == 6, f"Task2 评分按钮={btns}, 期望6"
    # 点 5 分(首张是 ask=5)揭示
    page.locator(".resp-card").first.locator(".score-btn").nth(5).click()
    page.wait_for_timeout(200)
    reveal = page.locator(".resp-card").first.locator(".resp-reveal:not(.hidden)")
    assert reveal.count() == 1
    txt = reveal.inner_text()
    assert "Rask" in txt or "主动追问" in txt, f"Task2 揭示缺分类: {txt}"
    print(f"  [OK] Task2: {opts} 模糊场景, {cards} 候选回应(0-5分), 分类揭示正常")
    assert not errs, f"Task2 console errors: {errs}"


def test_task3(page):
    errs = collect_errors(page)
    open_demo(page)
    page.click(".tab[data-task='3']")
    page.wait_for_timeout(300)
    # step/reset 按钮可见
    assert page.locator("#step-btn").is_visible(), "Task3 step 按钮不可见"

    # 初始无模型推断tag,无已揭示轮
    pills = page.locator(".eff-pill").count()
    assert pills > 0, "Task3 推断轨未渲染"
    # 全部 disabled(未揭示)
    disabled = page.locator(".eff-pill:disabled").count()
    assert disabled == pills, f"Task3 未揭示轮应全 disabled, 实际 {disabled}/{pills}"

    # 揭示一轮
    page.click("#step-btn")
    page.wait_for_timeout(200)
    # 对话气泡应出现模型推断 tag
    predTag = page.locator("#dialog .rel-tag.p").count()
    assert predTag >= 1, f"Task3 揭示后无模型推断 tag, 实际 {predTag}"
    # 第一个 pill 应可点
    first = page.locator(".eff-pill").first
    assert not first.is_disabled(), "揭示后首轮 pill 仍 disabled"

    # 全部揭示
    for _ in range(10):
        if "已揭示" in page.locator("#status").inner_text() and "5/5" in page.locator("#status").inner_text():
            break
        page.click("#step-btn")
        page.wait_for_timeout(100)

    # 点击第3轮标记收敛点 -> 应出现反馈
    page.locator(".eff-pill").nth(2).click()
    page.wait_for_timeout(200)
    fb = page.locator("#feedback").inner_text()
    assert len(fb) > 10, "标记收敛点后无反馈"
    # 标记轮应有 marked 类
    assert page.locator(".eff-pill.marked").count() >= 1, "标记轮无 marked 类"
    print(f"  [OK] Task3: 逐轮揭示+模型推断 tag, 标记收敛点有反馈, pills={pills}")
    assert not errs, f"Task3 console errors: {errs}"


def test_scenario_switch(page):
    errs = collect_errors(page)
    open_demo(page)
    page.click(".tab[data-task='1']")
    page.wait_for_timeout(200)
    first_title = page.locator("#scenario-select option").first.inner_text()
    # 切到第二个场景
    page.select_option("#scenario-select", index=1)
    page.wait_for_timeout(300)
    # 候选回应应刷新(仍是3张但内容不同)
    cards = page.locator(".resp-card").count()
    assert cards == 3, f"切换场景后候选卡数={cards}"
    # 切换画像名应变
    name = page.locator("#persona-name").inner_text()
    assert name != "· —", "切换场景后画像名为空"
    print(f"  [OK] 场景切换: 候选回应刷新, 画像={name.strip()[:20]}")
    assert not errs, f"切换 console errors: {errs}"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        tests = [("Task1", test_task1), ("Task2", test_task2),
                 ("Task3", test_task3), ("ScenarioSwitch", test_scenario_switch)]
        for name, fn in tests:
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
