/* ============ S2Pref demo · 情境偏好诊断 ============
   数据来自 data/scenarios.json（基于论文 Figure 1 与方法构造的忠实样例）。
   三个任务对应论文 Task 1/2/3，纯前端、无后端。 */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var status = function (m) { var e = $("#status"); if (e) e.textContent = m; };

  var DATA_URL = "data/scenarios.json";
  // 论文 Table 2 / 3 实测结果
  var PAPER_RESULTS = {
    1: {
      title: "Task 1 · 显式上下文对齐得分（满分 5，越高越好）",
      cols: ["模型", "Short", "Long"],
      rows: [
        ["GLM-4.6-Thinking", "4.18", "4.13"],
        ["Qwen3-235B-Thinking", "4.11", "3.85"],
        ["Qwen3-235B-Instruct", "3.78", "3.72"],
        ["GPT-OSS-120B-Thinking", "3.86", "3.75"],
        ["DeepSeek-v3.2-Exp-Thinking", "3.74", "3.69"]
      ],
      hl: 0,
      note: "Short=仅目标情境历史；Long=全部 5 个情境历史（含噪声）。Long 设置下模型被无关历史干扰，普遍下降。"
    },
    2: {
      title: "Task 2 · 冲突识别与澄清得分（满分 5）",
      cols: ["模型", "Short", "Long"],
      rows: [
        ["GLM-4.6-Thinking", "3.23", "3.03"],
        ["DeepSeek-v3.2-Exp-Thinking", "3.04", "2.94"],
        ["GPT-OSS-120B-Thinking", "2.88", "2.85"],
        ["Qwen3-235B-Instruct", "2.84", "2.82"],
        ["Qwen3-235B-Thinking", "2.87", "2.79"]
      ],
      hl: 0,
      note: "即便最强模型也只 ~3 分：模型倾向「瞎猜一个情境再给建议」(Rrand/Rassume)，而非主动追问澄清(Rask=5)。这是当前对齐的关键短板。"
    },
    3: {
      title: "Task 3 · 推断效率（达到收敛所需的平均轮数，越少越好；Sturn 越高越好）",
      cols: ["模型", "t̄low", "t̄med", "t̄high", "Sturn"],
      rows: [
        ["GLM-4.6-Thinking", "0.46", "2.73", "3.46", "4.071"],
        ["GPT-OSS-120B-Thinking", "0.51", "2.27", "3.21", "4.366"],
        ["Qwen3-235B-Thinking", "0.53", "2.52", "3.71", "3.649"],
        ["Qwen3-235B-Instruct", "0.52", "2.72", "3.55", "3.588"],
        ["DeepSeek-v3.2-Exp-Thinking", "0.53", "2.72", "3.80", "3.384"]
      ],
      hl: 0,
      note: "t̄high 高=需要大量高相关轮次才能猜对，效率低；Sturn 高=用更少轮次完成推断。8B 模型 Sturn 仅 1.2–1.6，差距悬殊。"
    }
  };

  var TASK_DESC = {
    1: "给一段已建立用户偏好的对话与一个带显式情境触发词的查询（如「和朋友」「在家」），判断当前情境应激活哪个情境偏好分支，并给出对齐的推荐。",
    2: "给一段揭示偏好的对话与一个故意模糊的查询，判断该如何回应。论文评分：主动追问澄清 Rask=5，明确假设后建议 Rassume=4，直接给建议 Rrand=3，违反偏好或幻觉 Rfail=0–2。",
    3: "逐轮揭示对话，每轮后判断当前激活的是哪个情境偏好分支（或信息不足）。统计你达到正确判断所需的高/中/低相关轮数，对照论文的推断效率指标 Sturn。"
  };

  var data = null, curTask = 1, curScn = null, curPersona = null;
  var revealedTurns = 0;   // Task3 已揭示轮数
  var effLog = [];         // Task3 每轮判断记录

  // ---- 加载 ----
  function load() {
    fetch(DATA_URL).then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      var sel = $("#scenario-select");
      sel.innerHTML = "";
      data.forEach(function (p) {
        // 每个画像两个场景各作为一个选项
        Object.keys(p.scenarios).forEach(function (k) {
          var s = p.scenarios[k];
          var opt = document.createElement("option");
          opt.value = p.id + "/" + k;
          opt.textContent = p.title + " · " + s.role;
          sel.appendChild(opt);
        });
      });
      sel.addEventListener("change", function () { selectScenario(sel.value); });
      $$(".tab").forEach(function (t) {
        t.addEventListener("click", function () { switchTask(parseInt(t.dataset.task, 10)); });
      });
      $("#step-btn").addEventListener("click", step);
      $("#reveal-all-btn").addEventListener("click", revealAll);
      $("#reset-btn").addEventListener("click", reset);
      selectScenario(sel.value);
    }).catch(function (e) { status("数据加载失败: " + e.message); });
  }

  function selectScenario(val) {
    var parts = val.split("/");
    curPersona = data.filter(function (p) { return p.id === parts[0]; })[0];
    curScn = curPersona.scenarios[parts[1]];
    revealedTurns = 0;
    effLog = [];
    renderPersona();
    renderDialog();
    renderQuery();
    renderResult();
    renderAnswer();
    status("就绪 · " + curPersona.title);
  }

  function switchTask(t) {
    curTask = t;
    $$(".tab").forEach(function (x) { x.classList.toggle("active", parseInt(x.dataset.task, 10) === t); });
    $("#task-desc").textContent = TASK_DESC[t];
    revealedTurns = (t === 3) ? 0 : curScn.dialogue.length;
    effLog = [];
    renderDialog();
    renderAnswer();
    renderResult();
  }

  // ---- 画像与偏好 ----
  function renderPersona() {
    $("#persona-name").textContent = "· " + curPersona.persona;
    var sl = $("#stable-list");
    sl.innerHTML = "";
    curPersona.stablePrefs.forEach(function (s) {
      var li = document.createElement("li"); li.textContent = s; sl.appendChild(li);
    });
    var ab = $("#aspect-box");
    var asp = curPersona.situationalAspects[0];
    ab.innerHTML =
      '<div class="aspect-label">Aspect（情境维度）</div>' +
      '<div class="aspect-text">' + asp.aspect + '</div>' +
      '<div class="aspect-branch" data-branch="A"><span class="br-trigger">' + asp.triggerA + '</span><span class="br-pref">' + asp.prefA + '</span></div>' +
      '<div class="aspect-branch" data-branch="B"><span class="br-trigger">' + asp.triggerB + '</span><span class="br-pref">' + asp.prefB + '</span></div>';
    $("#scene-meta").textContent = curScn.context;
  }

  // ---- 对话 ----
  function renderDialog() {
    var box = $("#dialog");
    box.innerHTML = "";
    var show = (curTask === 3) ? revealedTurns : curScn.dialogue.length;
    for (var i = 0; i < show; i++) {
      var t = curScn.dialogue[i];
      var isUser = t.speaker === "user";
      var m = document.createElement("div");
      m.className = "msg " + (isUser ? "user" : "other");
      var rel = t.relevance === "high" ? "h" : (t.relevance === "medium" ? "m" : "l");
      var relTxt = t.relevance === "high" ? "高" : (t.relevance === "medium" ? "中" : "低");
      m.innerHTML =
        '<div class="row"><div class="avatar">' + (isUser ? "👤" : "💬") + '</div>' +
        '<div class="bubble">' + t.text + (isUser ? ' <span class="rel-tag ' + rel + '">' + relTxt + '相关</span>' : "") + '</div></div>';
      box.appendChild(m);
    }
    if (curTask === 3 && show < curScn.dialogue.length) {
      var hint = document.createElement("div");
      hint.className = "dim";
      hint.style.cssText = "padding:8px 0;font-size:12px;";
      hint.textContent = "…还有 " + (curScn.dialogue.length - show) + " 轮未揭示（点击「揭示下一轮」继续）";
      box.appendChild(hint);
    }
  }

  function step() {
    if (curTask !== 3) { status("当前任务无需逐轮揭示"); return; }
    if (revealedTurns < curScn.dialogue.length) {
      revealedTurns++;
      renderDialog();
      renderAnswer();
      status("已揭示 " + revealedTurns + "/" + curScn.dialogue.length + " 轮");
    } else { status("对话已全部揭示"); }
  }
  function revealAll() {
    if (curTask === 3) { revealedTurns = curScn.dialogue.length; renderDialog(); renderAnswer(); status("已揭示全部"); }
    else { status("当前任务已显示全部对话"); }
  }
  function reset() {
    revealedTurns = (curTask === 3) ? 0 : curScn.dialogue.length;
    effLog = [];
    renderDialog(); renderAnswer();
    var fb = $("#feedback"); fb.classList.add("hidden"); fb.textContent = "";
    status("已重置");
  }

  // ---- 查询 ----
  function renderQuery() {
    var q = $("#query-box");
    var tag = curScn.queryType === "ambiguous"
      ? '<span class="rel-tag l" style="margin-right:6px">模糊查询</span>'
      : '<span class="rel-tag h" style="margin-right:6px">显式触发：' + curScn.queryTrigger + '</span>';
    q.innerHTML = tag + curScn.query;
  }

  // ---- 作答区 ----
  function renderAnswer() {
    var area = $("#answer-area");
    var fb = $("#feedback"); fb.classList.add("hidden"); fb.textContent = "";
    area.innerHTML = "";
    if (curTask === 1) renderTask1(area);
    else if (curTask === 2) renderTask2(area);
    else renderTask3(area);
  }

  function branchText(b) {
    var asp = curPersona.situationalAspects[0];
    return b === "A" ? asp.triggerA + " → " + asp.prefA : asp.triggerB + " → " + asp.prefB;
  }

  // Task1：选当前情境激活哪个分支
  function renderTask1(area) {
    $("#answer-title").textContent = "当前情境应激活哪个偏好分支？";
    var wrap = document.createElement("div"); wrap.className = "choice-row";
    ["A", "B"].forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "choice"; btn.textContent = branchText(b);
      btn.addEventListener("click", function () { judgeTask1(b, btn); });
      wrap.appendChild(btn);
    });
    area.appendChild(wrap);
  }
  function judgeTask1(b, btn) {
    var asp = curPersona.situationalAspects[0];
    var gt = curScn.groundTruthPref;
    var ok = b === gt;
    $$(".choice").forEach(function (c) { c.disabled = true; });
    btn.classList.add(ok ? "correct" : "wrong");
    // 标出正确项
    $$(".choice").forEach(function (c, i) {
      var bb = ["A", "B"][i];
      if (bb === gt) c.classList.add("correct");
    });
    showFb(ok ? "ok" : "no",
      ok ? "✓ 对齐成功。当前情境「" + (gt === "A" ? asp.triggerA : asp.triggerB) + "」激活了偏好 " + gt +
            "，你的推荐应满足此情境偏好，同时不违反稳定偏好。这正是论文 Task 1 的满分要求。"
         : "✗ 未对齐。对话上下文表明当前情境是「" + (gt === "A" ? asp.triggerA : asp.triggerB) + "」，应激活偏好 " + gt +
            "（" + branchText(gt) + "）。若按另一分支推荐，就违反了情境偏好。");
  }

  // Task2：选回应策略
  function renderTask2(area) {
    $("#answer-title").textContent = "面对这个查询，你如何回应？";
    // 若查询本身是 explicit，提示 Task2 应选 ambiguous 场景
    if (curScn.queryType !== "ambiguous") {
      var warn = document.createElement("p");
      warn.className = "dim"; warn.style.fontSize = "13px";
      warn.textContent = "提示：Task 2 需要模糊查询。当前场景查询带显式触发词，请在底栏选择「社交场合」类场景体验冲突澄清。";
      area.appendChild(warn);
    }
    var opts = [
      { k: "ask", s: "5", t: "主动追问澄清情境（如：你这次是和孩子还是和朋友一起？）", cls: "ok" },
      { k: "assume", s: "4", t: "明确假设一个情境后再给建议（如：假设你是和孩子一起，建议……）", cls: "info" },
      { k: "rand", s: "3", t: "不澄清，直接给一个具体建议", cls: "info" },
      { k: "fail", s: "0–2", t: "给一个违反稳定偏好或与偏好无关的泛泛建议", cls: "no" }
    ];
    var wrap = document.createElement("div"); wrap.className = "choice-row";
    opts.forEach(function (o) {
      var btn = document.createElement("button");
      btn.className = "choice";
      btn.innerHTML = '<span class="ch-tag score">得分 ' + o.s + '</span>' + o.t;
      btn.addEventListener("click", function () { judgeTask2(o, btn); });
      wrap.appendChild(btn);
    });
    area.appendChild(wrap);
  }
  function judgeTask2(o, btn) {
    $$(".choice").forEach(function (c) { c.disabled = true; });
    var asp = curPersona.situationalAspects[0];
    var msg;
    if (o.k === "ask") {
      btn.classList.add("correct");
      msg = "✓ 满分 5（Rask）。查询未给出情境触发词，且对话中存在互斥的偏好分支（" + asp.triggerA + " vs " + asp.triggerB +
            "），主动追问是最优策略——既不违反稳定偏好，又能避免意图幻觉。这正是论文期望而当前模型最欠缺的行为。";
    } else if (o.k === "assume") {
      btn.classList.add("wrong");
      msg = "△ 得分 4（Rassume）。明确假设后建议次优：虽然给了 context 假设，但仍有赌错分支的风险；只有假设与真实情境一致且满足稳定偏好时才成立。";
    } else if (o.k === "rand") {
      btn.classList.add("wrong");
      msg = "△ 得分 3（Rrand）。直接给建议但不澄清，是当前主流模型最常见的失败模式——它赌中某个分支，但未体现对冲突的感知。";
    } else {
      btn.classList.add("wrong");
      msg = "✗ 得分 0–2（Rfail）。违反稳定偏好或给出无关建议，属完全失败。论文中单次违反=2 分、双重违反=1 分、完全无关=0 分。";
    }
    showFb(o.k === "ask" ? "ok" : "no", msg);
  }

  // Task3：逐轮判断激活分支
  function renderTask3(area) {
    $("#answer-title").textContent = "已揭示 " + revealedTurns + " 轮后，你认为当前激活哪个分支？";
    var track = document.createElement("div"); track.className = "eff-track";
    curScn.dialogue.forEach(function (t, i) {
      var p = document.createElement("span"); p.className = "eff-pill";
      var locked = i < revealedTurns;
      if (locked) p.classList.add("locked");
      var rel = t.relevance === "high" ? "H" : (t.relevance === "medium" ? "M" : "L");
      p.textContent = "T" + (i + 1) + "·" + rel + (effLog[i] ? "→" + effLog[i] : "");
      track.appendChild(p);
    });
    area.appendChild(track);

    if (revealedTurns === 0) {
      var p = document.createElement("p"); p.className = "dim"; p.style.fontSize = "13px";
      p.textContent = "点击「揭示下一轮」开始逐轮推断。每轮后在此选择你的判断。";
      area.appendChild(p);
      return;
    }
    var wrap = document.createElement("div"); wrap.className = "choice-row";
    ["A", "B", "?"].forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "choice";
      btn.textContent = b === "?" ? "信息不足，继续观察" : branchText(b);
      btn.addEventListener("click", function () { judgeTask3(b, btn, wrap); });
      wrap.appendChild(btn);
    });
    area.appendChild(wrap);
  }
  function judgeTask3(b, btn, wrap) {
    // 记录当前轮的判断
    var idx = revealedTurns - 1;
    effLog[idx] = b;
    var asp = curPersona.situationalAspects[0];
    var gt = curScn.groundTruthPref;
    if (b === gt) {
      btn.classList.add("correct");
      // 统计达到正确判断所用的高/中/低轮数
      var h = 0, m = 0, l = 0;
      for (var i = 0; i <= idx; i++) {
        var rel = curScn.dialogue[i].relevance;
        if (rel === "high") h++; else if (rel === "medium") m++; else l++;
      }
      showFb("ok",
        "✓ 你在第 " + revealedTurns + " 轮达到正确判断（" + gt + "：" + (gt === "A" ? asp.triggerA : asp.triggerB) + "）。" +
        "消耗轮数：高相关 " + h + " / 中相关 " + m + " / 低相关 " + l + "。" +
        "论文 Task 3 用 t̄high/t̄med/t̄low 与 Sturn 衡量推断效率——所需高相关轮越少、Sturn 越高越好。" +
        "过早断言若信息不足会被收敛阈值惩罚。");
      $$(".choice").forEach(function (c) { c.disabled = true; });
    } else if (b === "?") {
      showFb("info", "你选择继续观察。论文 Task 3 的严格收敛阈值会惩罚过早断言——信息不足时暂缓是合理的。揭示下一轮后再判断。");
      // 不禁用，允许继续
      btn.disabled = true;
    } else {
      btn.classList.add("wrong");
      showFb("no", "✗ 此判断与对话上下文不符。当前情境是「" + (gt === "A" ? asp.triggerA : asp.triggerB) +
            "」。可继续揭示下一轮后修正。");
      btn.disabled = true;
    }
    renderDialog(); // 刷新 eff-track 显示（通过重渲染 answer）
    renderAnswerTrackOnly();
  }
  // 仅刷新 Task3 的 track 显示，不清除已作答状态（简单实现：重新渲染整个 answer 会重置按钮，
  // 这里改为在 track pill 上直接更新——为简洁，复用 renderAnswer 但保留 effLog）
  function renderAnswerTrackOnly() {
    // 更新 track pill 文本
    var pills = $$(".eff-pill");
    curScn.dialogue.forEach(function (t, i) {
      if (i < pills.length && effLog[i]) {
        var rel = t.relevance === "high" ? "H" : (t.relevance === "medium" ? "M" : "L");
        pills[i].textContent = "T" + (i + 1) + "·" + rel + "→" + effLog[i];
      }
    });
  }

  function showFb(cls, msg) {
    var fb = $("#feedback");
    fb.className = "feedback " + cls;
    fb.textContent = msg;
  }

  // ---- 论文结果 ----
  function renderResult() {
    var r = PAPER_RESULTS[curTask];
    var area = $("#result-area");
    var html = '<div class="dim" style="margin-bottom:4px">' + r.title + '</div>';
    html += '<table class="result-tbl"><thead><tr>';
    r.cols.forEach(function (c) { html += "<th>" + c + "</th>"; });
    html += "</tr></thead><tbody>";
    r.rows.forEach(function (row, i) {
      html += '<tr class="' + (i === r.hl ? "hl" : "") + '">';
      row.forEach(function (cell, j) { html += '<td class="' + (j === 0 ? "model" : "") + '">' + cell + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table>";
    html += '<div class="result-note">' + r.note + "</div>";
    area.innerHTML = html;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
})();
