/* ============ ThinkingUS demo · 前端逻辑 ============ */
const $ = (id) => document.getElementById(id);
let DATA = null;
let turnIdx = -1;
let autoTimer = null;
let showRP = false;

async function jget(url) { const r = await fetch(url); return r.json(); }

async function init() {
  try {
    const s = await jget("api/llm_status");
    const b = $("llm-badge");
    if (s.available) { b.textContent = "LLM ✓"; b.classList.add("good"); }
    else b.textContent = "LLM ✗ 脚本模式";
  } catch (e) { $("llm-badge").textContent = "LLM ✗"; }

  const list = await jget("api/scenarios");
  const sel = $("scenario-select");
  sel.innerHTML = list.map(s => `<option value="${s.sid}">${s.avatar} ${s.title_cn}</option>`).join("");
  sel.onchange = () => loadScenario(sel.value);

  $("step-btn").onclick = step;
  $("auto-btn").onclick = auto;
  $("reveal-all-btn").onclick = revealAll;
  $("reset-btn").onclick = reset;
  $("rp-toggle").onchange = (e) => { showRP = e.target.checked; rerender(); };

  await loadScenario(list[0].sid);
  window.addEventListener("resize", drawSim);
}

async function loadScenario(sid) {
  DATA = await jget(`api/scenario/${sid}`);
  $("scenario-title").textContent = `${DATA.avatar} ${DATA.title_cn}`;
  $("scene-goal").textContent = DATA.goal;
  $("scene-bg").textContent = DATA.background;
  $("scene-emotion").textContent = DATA.emotion;
  reset();
  status(`已加载场景：${DATA.title_cn}`);
}

function reset() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $("auto-btn").textContent = "⏯ 自动播放"; }
  turnIdx = -1;
  $("dialog").innerHTML = "";
  drawSim();
}

function rerender() {
  // 重画已展示的轮（用于切换 role-play）
  const upto = turnIdx;
  $("dialog").innerHTML = "";
  turnIdx = -1;
  for (let i = 0; i <= upto; i++) step(true);
}

function step(silent) {
  if (!DATA || turnIdx >= DATA.turns.length - 1) {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $("auto-btn").textContent = "⏯ 自动播放"; }
    return;
  }
  turnIdx++;
  const t = DATA.turns[turnIdx];
  const dlg = $("dialog");

  // 助手消息
  const am = document.createElement("div");
  am.className = "msg assistant";
  am.innerHTML = `<div class="row"><div class="avatar">🤖</div><div class="assistant-bubble">${t.assistant}</div></div>`;
  dlg.appendChild(am);

  // 用户块：思维（遮罩）+ 话语
  const um = document.createElement("div");
  um.className = "msg user";
  const rpHtml = showRP
    ? `<div class="user-bubble rp"><span class="user-tag">Role-play:</span>${t.utterance_rp}</div>`
    : "";
  um.innerHTML = `
    <div class="user-block">
      <div class="thought masked" data-ti="${turnIdx}">
        <div class="thought-head">
          <span>💭 内心思维</span>
          <span class="tt-badge ${t.thought_type}">${t.thought_label}</span>
          <span class="reveal-hint">点击揭示</span>
        </div>
        <div class="thought-text">${t.thought}</div>
      </div>
      <div class="user-bubble"><span class="user-tag">ThinkingUS:</span>${t.utterance_us}</div>
      ${rpHtml}
    </div>`;
  dlg.appendChild(um);

  um.querySelector(".thought").onclick = function () { this.classList.toggle("masked"); };

  if (!silent) {
    um.scrollIntoView({ behavior: "smooth", block: "end" });
    maybeLive(turnIdx, um);
  }
  drawSim();
}

function revealAll() {
  document.querySelectorAll(".thought").forEach(el => el.classList.remove("masked"));
}

function auto() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $("auto-btn").textContent = "⏯ 自动播放"; return; }
  if (turnIdx >= DATA.turns.length - 1) reset();
  $("auto-btn").textContent = "⏸ 暂停";
  autoTimer = setInterval(() => {
    step();
    // 自动播放时延迟揭示当前思维
    const last = document.querySelector(".thought:last-of-type");
    if (last) setTimeout(() => last.classList.remove("masked"), 700);
  }, 2600);
}

// ---------- 相似度趋势图 ----------
function drawSim() {
  const cv = $("sim-chart"), ctx = cv.getContext("2d");
  const rect = cv.getBoundingClientRect();
  cv.width = rect.width * devicePixelRatio; cv.height = 200 * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const W = rect.width, H = 200, pad = 34;
  ctx.clearRect(0, 0, W, H);
  if (!DATA) return;

  const n = DATA.turns.length;
  const shown = turnIdx + 1;
  const xs = (i) => pad + (W - 2 * pad) * (n === 1 ? 0.5 : i / (n - 1));
  const ys = (v) => H - pad - (H - 2 * pad) * v;

  // 网格
  ctx.strokeStyle = "rgba(94,145,255,.12)"; ctx.lineWidth = 1;
  ctx.fillStyle = "#7d88a3"; ctx.font = "11px monospace"; ctx.textAlign = "right";
  [0, 0.5, 1].forEach(v => {
    const y = ys(v);
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    ctx.fillText(v.toFixed(1), pad - 6, y + 4);
  });
  ctx.textAlign = "center";
  for (let i = 0; i < n; i++) ctx.fillText("T" + (i + 1), xs(i), H - pad + 16);

  // role-play 基线（恒定偏低，体现表层模仿）
  const rpVals = DATA.turns.map((_, i) => 0.30 + 0.02 * i);
  drawLine(ctx, xs, ys, rpVals, shown, "#f87171", n);
  // ThinkingUS（上升趋势）
  const usVals = DATA.turns.map(t => t.similarity);
  drawLine(ctx, xs, ys, usVals, shown, "#5eead4", n);
}

function drawLine(ctx, xs, ys, vals, shown, color, n) {
  if (shown <= 0) return;
  ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.beginPath();
  for (let i = 0; i < Math.min(shown, n); i++) {
    const x = xs(i), y = ys(vals[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 0; i < Math.min(shown, n); i++) {
    ctx.beginPath(); ctx.arc(xs(i), ys(vals[i]), 3.5, 0, 2 * Math.PI); ctx.fill();
  }
}

async function maybeLive(ti, el) {
  if (!$("llm-badge").classList.contains("good")) return;
  try {
    const r = await fetch("api/live_turn", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid: DATA.sid, turn: ti }),
    });
    const d = await r.json();
    if (ti !== turnIdx || d.error) return;
    if (d.thought) el.querySelector(".thought-text").textContent = d.thought + "  ⟨live⟩";
    if (d.utterance) {
      const ub = el.querySelector(".user-bubble:not(.rp)");
      ub.innerHTML = `<span class="user-tag">ThinkingUS:</span>${d.utterance}  ⟨live⟩`;
    }
  } catch (e) { /* 保留脚本内容 */ }
}

function status(s) { $("status").textContent = s; }
init();
