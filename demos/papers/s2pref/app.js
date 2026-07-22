/* ============ S2Pref demo · 情境偏好诊断 ============
   交互方向（修正版）：模型从对话推断用户偏好 / 给出回应；用户作为「评测者」
   按论文评分准则判断模型输出。对应论文 Task 1 / 2 / 3，纯前端、无后端。
   数据来自 data/scenarios.json。 */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var status = function (m) { var e = $("#status"); if (e) e.textContent = m; };
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

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
    1: "【你=评测者】模型只看到对话历史与当前查询（无完整画像），给出候选回应。你掌握用户完整偏好画像（下示），请判断每个回应是否对齐了当前情境激活的偏好与稳定偏好，按 Salign（0–5）打分，再看论文评分。",
    2: "【你=评测者】查询故意模糊，存在互斥情境分支。模型给出回应。请按论文分类打分：主动追问 Rask=5 / 明确假设后建议 Rassume=4 / 直接给建议 Rrand=3 / 违反偏好或幻觉 Rfail=0–2。",
    3: "【你=评测者】逐轮揭示对话，每轮后模型输出对当前激活分支的推断（A/B/?）。你掌握完整画像，请判断模型在哪一轮收敛到正确偏好并稳定，点击该轮标记。统计所耗高/中/低相关轮数，对照论文 Sturn。"
  };

  var data = null, curTask = 1, curScn = null, curPersona = null;
  var revealedTurns = 0;     // Task3 已揭示轮数
  var scored = {};           // responseId -> {user, actual, correct}
  var convergedMark = -1;    // Task3 用户标记的收敛轮 index

  // ---- 加载 ----
  function load() {
    fetch(DATA_URL).then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      $$(".tab").forEach(function (t) {
        t.addEventListener("click", function () { switchTask(parseInt(t.dataset.task, 10)); });
      });
      $("#step-btn").addEventListener("click", step);
      $("#reveal-all-btn").addEventListener("click", revealAll);
      $("#reset-btn").addEventListener("click", reset);
      $("#scenario-select").addEventListener("change", function () { selectScenario($("#scenario-select").value); });
      switchTask(1);
    }).catch(function (e) { status("数据加载失败: " + e.message); });
  }

  // 按任务过滤场景：Task1=显式查询场景，Task2=模糊查询场景，Task3=全部
  function populateScenarios(task) {
    var sel = $("#scenario-select");
    var prev = sel.value;
    sel.innerHTML = "";
    data.forEach(function (p) {
      Object.keys(p.scenarios).forEach(function (k) {
        var s = p.scenarios[k];
        var keep = (task === 3) ? true : (task === 1 ? s.queryType === "explicit" : s.queryType === "ambiguous");
        if (!keep) return;
        var opt = document.createElement("option");
        opt.value = p.id + "/" + k;
        opt.textContent = p.title + " · " + s.role;
        sel.appendChild(opt);
      });
    });
    var stillThere = $$("option", sel).some(function (o) { return o.value === prev; });
    sel.value = stillThere ? prev : sel.options[0].value;
  }

  function switchTask(t) {
    curTask = t;
    $$(".tab").forEach(function (x) { x.classList.toggle("active", parseInt(x.dataset.task, 10) === t); });
    $("#task-desc").textContent = TASK_DESC[t];
    populateScenarios(t);
    $("#step-btn").style.display = (t === 3) ? "" : "none";
    $("#reveal-all-btn").style.display = (t === 3) ? "" : "none";
    clearFeedback();
    selectScenario($("#scenario-select").value);
  }

  function selectScenario(val) {
    var parts = val.split("/");
    curPersona = data.filter(function (p) { return p.id === parts[0]; })[0];
    curScn = curPersona.scenarios[parts[1]];
    revealedTurns = (curTask === 3) ? 0 : curScn.dialogue.length;
    scored = {};
    convergedMark = -1;
    renderPersona();
    renderDialog();
    renderQuery();
    renderResult();
    renderAnswer();
    status("就绪 · " + curPersona.title + " · " + curScn.role);
  }

  // ---- 画像与偏好（评测者的全知视图）----
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

  // ---- 对话（模型可见）----
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
      var predTag = "";
      if (curTask === 3) {
        var pred = curScn.turnPredictions[i];
        var predTxt = pred === "?" ? "信息不足" : (pred + " 分支");
        predTag = ' <span class="rel-tag p">模型推断:' + predTxt + '</span>';
      }
      m.innerHTML =
        '<div class="row"><div class="avatar">' + (isUser ? "👤" : "💬") + '</div>' +
        '<div class="bubble">' + t.text + (isUser ? ' <span class="rel-tag ' + rel + '">' + relTxt + '相关</span>' : "") + predTag + '</div></div>';
      box.appendChild(m);
    }
    if (curTask === 3 && show < curScn.dialogue.length) {
      var hint = document.createElement("div");
      hint.className = "dim";
      hint.style.cssText = "padding:8px 0;font-size:12px;";
      hint.textContent = "…还有 " + (curScn.dialogue.length - show) + " 轮未揭示（点击「揭示下一轮」，模型每轮给出推断）";
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
    scored = {};
    convergedMark = -1;
    renderDialog(); renderAnswer();
    clearFeedback();
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

  // ---- 作答区（模型输出 + 你的评分）----
  function renderAnswer() {
    var area = $("#answer-area");
    area.innerHTML = "";
    if (curTask === 1) renderTask1(area);
    else if (curTask === 2) renderTask2(area);
    else renderTask3(area);
  }

  function catLabel(r, task) {
    if (task === 1) {
      return r.category === "align" ? "对齐（满分）" : (r.category === "partial" ? "部分对齐" : "情境错误");
    }
    return { ask: "Rask 主动追问", assume: "Rassume 明确假设", rand: "Rrand 直接建议", fail: "Rfail 违反/幻觉" }[r.category];
  }

  // Task1 / Task2：模型候选回应，用户逐个评分
  function renderTask1(area) {
    $("#answer-title").textContent = "模型候选回应 · 请评分（你=评测者）";
    area.appendChild(el("p", "ans-intro",
      "模型只看到上面的对话与查询，给出以下候选回应。你掌握用户完整偏好画像，请按 <b>Salign（0–5）</b> 给每个回应打分，再看论文评分。"));
    curScn.responses.forEach(function (r) { area.appendChild(responseCard(r, 1)); });
  }
  function renderTask2(area) {
    $("#answer-title").textContent = "模型候选回应 · 请分类评分（你=评测者）";
    area.appendChild(el("p", "ans-intro",
      "查询模糊，存在互斥分支。模型给出以下候选回应。请按论文分类打分：<b>Rask=5 / Rassume=4 / Rrand=3 / Rfail=0–2</b>。"));
    curScn.responses.forEach(function (r) { area.appendChild(responseCard(r, 2)); });
  }

  function responseCard(r, task) {
    var card = el("div", "resp-card");
    card.appendChild(el("div", "resp-head", '<span class="resp-label">' + r.label + '</span>'));
    card.appendChild(el("div", "resp-text", r.text));
    var row = el("div", "resp-score-row");
    var lo = task === 2 ? 0 : 1, hi = 5;
    for (var s = lo; s <= hi; s++) {
      (function (score) {
        var b = el("button", "score-btn", "" + score);
        b.addEventListener("click", function () { scoreResponse(r, score, task, row, card); });
        row.appendChild(b);
      }(s));
    }
    card.appendChild(row);
    card.appendChild(el("div", "resp-reveal hidden"));
    return card;
  }

  function scoreResponse(r, userScore, task, row, card) {
    var actual = r.score, correct;
    if (task === 2) {
      var ucat = userScore === 5 ? "ask" : userScore === 4 ? "assume" : userScore === 3 ? "rand" : "fail";
      correct = ucat === r.category;
    } else {
      correct = userScore === actual;
    }
    scored[r.id] = { user: userScore, actual: actual, correct: correct };
    $$(".score-btn", row).forEach(function (b) { b.disabled = true; });
    var clicked = $$(".score-btn", row)[userScore - (task === 2 ? 0 : 1)];
    // 标记用户所选
    $$(".score-btn", row).forEach(function (b) {
      if (b.textContent === "" + userScore) b.classList.add("picked");
    });
    var reveal = $(".resp-reveal", card);
    reveal.className = "resp-reveal " + (correct ? "ok" : "no");
    reveal.innerHTML =
      '<div class="rv-line">论文评分：<b>' + actual + '</b> 分 · ' + catLabel(r, task) + (correct ? '' : ' · 你评 ' + userScore) + '</div>' +
      '<div class="rv-why">' + r.why + '</div>';
    // 汇总
    maybeSummary(task);
  }

  function maybeSummary(task) {
    var total = curScn.responses.length, done = Object.keys(scored).length;
    if (done < total) { status("已评 " + done + "/" + total + " 个回应"); return; }
    var right = 0;
    Object.keys(scored).forEach(function (k) { if (scored[k].correct) right++; });
    var cls = right === total ? "ok" : (right >= total / 2 ? "info" : "no");
    showFb(cls,
      "评测完成：" + right + "/" + total + " 个回应与论文评分一致。" +
      (right === total ? "你对偏好对齐的判断很准——这正是论文期望评测者具备的全知判断力。" :
       "部分判断与论文评分不同，可对照下方每个回应的论文评分与理由复盘。"));
  }

  // Task3：模型逐轮推断，用户标记收敛点
  function renderTask3(area) {
    $("#answer-title").textContent = "模型逐轮推断 · 请标记收敛点（你=评测者）";
    area.appendChild(el("p", "ans-intro",
      "逐轮揭示对话，每轮后模型输出对当前激活分支的推断。你掌握完整画像，请判断模型在哪一轮<b>收敛到正确偏好并稳定</b>，点击该轮标记。"));

    var stream = el("div", "eff-track");
    curScn.dialogue.forEach(function (t, i) {
      var p = el("button", "eff-pill");
      var rel = t.relevance === "high" ? "H" : (t.relevance === "medium" ? "M" : "L");
      var locked = i < revealedTurns;
      var pred = locked ? curScn.turnPredictions[i] : "·";
      p.textContent = "T" + (i + 1) + "·" + rel + "→" + pred;
      if (locked) p.classList.add("locked");
      if (i === convergedMark) p.classList.add("marked");
      p.disabled = !locked;
      p.addEventListener("click", function () { markConverge(i); });
      stream.appendChild(p);
    });
    area.appendChild(stream);

    if (revealedTurns === 0) {
      area.appendChild(el("p", "dim", "点击「揭示下一轮」开始。每轮揭示后模型给出推断，你可在已揭示的轮次上点击标记收敛点。"));
    } else {
      area.appendChild(el("p", "dim", "点击你认为是模型收敛点的轮次（首次正确且后续稳定的轮）。可多次改判。"));
    }
  }

  function markConverge(i) {
    convergedMark = i;
    var gtBranch = curScn.groundTruthPref === "prefA" ? "A" : "B";
    var preds = curScn.turnPredictions;
    var asp = curPersona.situationalAspects[0];
    var gtTrigger = gtBranch === "A" ? asp.triggerA : asp.triggerB;

    // 真实收敛点：首个 pred==gtBranch 且其后全为 gtBranch 的轮
    var trueConv = -1;
    for (var k = 0; k < preds.length; k++) {
      if (preds[k] === gtBranch) {
        var stable = true;
        for (var j = k; j < preds.length; j++) { if (preds[j] !== gtBranch) { stable = false; break; } }
        if (stable) { trueConv = k; break; }
      }
    }

    var h = 0, m = 0, l = 0;
    for (var x = 0; x <= i; x++) {
      var rel = curScn.dialogue[x].relevance;
      if (rel === "high") h++; else if (rel === "medium") m++; else l++;
    }

    var cls, msg;
    if (trueConv === -1) {
      cls = "no";
      msg = "✗ 该模型的推断流从未稳定锁定正确分支 " + gtBranch + "，无法收敛——属失败案例。";
    } else if (i === trueConv) {
      cls = "ok";
      msg = "✓ 正确！模型在第 " + (i + 1) + " 轮收敛到正确分支 " + gtBranch + "（" + gtTrigger + "）并稳定至结尾。";
    } else if (i > trueConv) {
      cls = "no";
      msg = "△ 标记偏晚。模型实际在第 " + (trueConv + 1) + " 轮就已收敛到 " + gtBranch + "（" + gtTrigger + "），你在第 " + (i + 1) + " 轮才标记，多消耗了信息。";
    } else {
      cls = "no";
      var predAtI = preds[i];
      if (predAtI !== gtBranch) {
        msg = "✗ 过早标记。第 " + (i + 1) + " 轮模型推断为 '" + predAtI + "'，尚未锁定正确分支 " + gtBranch + "。论文 Task 3 的严格收敛阈值会惩罚过早断言。";
      } else {
        msg = "△ 此轮推断正确，但尚未稳定到结尾——收敛要求正确且持续。最早收敛点在第 " + (trueConv + 1) + " 轮。";
      }
    }
    msg += " 你标记点消耗：高相关 " + h + " / 中相关 " + m + " / 低相关 " + l + " 轮。论文用 t̄high/t̄med/t̄low 与 Sturn 衡量——所需轮数越少、高相关占比越低，Sturn 越高（效率越好）。";
    renderAnswer();
    showFb(cls, msg);
    // 重新高亮标记轮
    var pills = $$(".eff-pill");
    pills.forEach(function (p, idx) { p.classList.toggle("marked", idx === i); });
  }

  function showFb(cls, msg) {
    var fb = $("#feedback");
    fb.className = "feedback " + cls;
    fb.innerHTML = msg;
  }
  function clearFeedback() {
    var fb = $("#feedback");
    fb.className = "feedback hidden";
    fb.innerHTML = "";
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
