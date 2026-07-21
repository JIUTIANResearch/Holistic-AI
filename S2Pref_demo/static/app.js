/* ============ S2Pref demo · 前端逻辑 ============ */
const $ = (id) => document.getElementById(id);
let DATA = null;       // 当前画像完整数据
let curCtx = "a";      // 当前语境
let effIdx = 0;        // efficiency 已播放轮数
let effTimer = null;

async function jget(url) { const r = await fetch(url); return r.json(); }

// ---------- 启动 ----------
async function init() {
  // LLM 徽章
  try {
    const s = await jget("/api/llm_status");
    const b = $("llm-badge");
    if (s.available) { b.textContent = "LLM ✓"; b.classList.add("good"); }
    else { b.textContent = "LLM ✗ 脚本模式"; }
  } catch (e) { $("llm-badge").textContent = "LLM ✗"; }

  const list = await jget("/api/scenarios");
  const sel = $("scenario-select");
  sel.innerHTML = list.map(s => `<option value="${s.sid}">${s.avatar} ${s.title_cn}</option>`).join("");
  sel.onchange = () => loadScenario(sel.value);

  // tabs
  document.querySelectorAll(".tab").forEach(t => {
    t.onclick = () => switchTab(t.dataset.task);
  });
  $("reveal-btn").onclick = toggleReveal;
  $("eff-step").onclick = effStep;
  $("eff-auto").onclick = effAuto;
  $("eff-reset").onclick = effReset;

  await loadScenario(list[0].sid);
}

async function loadScenario(sid) {
  DATA = await jget(`/api/scenario/${sid}`);
  $("profile-title").textContent = `${DATA.avatar} ${DATA.title_cn}`;
  renderProfile();
  curCtx = "a";
  renderAlign();
  renderConflict();
  effReset();
  status(`已加载画像：${DATA.title_cn}`);
}

// ---------- 画像卡 ----------
function renderProfile() {
  $("stable-list").innerHTML = DATA.stable.map((p, i) =>
    `<div class="pref-item stable" data-si="${i}"><span class="pi-ic">${p.icon}</span><span>${p.text}</span></div>`
  ).join("");

  $("aspect-list").innerHTML = DATA.aspects.map((a, i) => `
    <div class="pref-item aspect" data-ai="${i}">
      <div class="aspect-name"><span class="pi-ic">${a.icon}</span> ${a.aspect}</div>
      <div class="aspect-ctx">
        <div class="aspect-pill" data-side="a"><span class="pill-ctx">${a.ctx_a}</span>${a.pref_a}</div>
        <div class="aspect-pill" data-side="b"><span class="pill-ctx">${a.ctx_b}</span>${a.pref_b}</div>
      </div>
    </div>`).join("");
}

function toggleReveal() {
  const body = $("profile-body");
  const masked = body.classList.toggle("masked");
  $("reveal-btn").textContent = masked ? "显示" : "隐藏";
}

// ---------- tab 切换 ----------
function switchTab(task) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.task === task));
  ["align", "conflict", "efficiency"].forEach(p =>
    $("panel-" + p).classList.toggle("hidden", p !== task));
}

// ---------- Task1 上下文对齐 ----------
function renderAlign() {
  const a0 = DATA.aspects[DATA.align[0].triggered_aspect];
  $("ctx-switch").innerHTML = `
    <button class="ctx-btn ${curCtx === 'a' ? 'active' : ''}" data-ctx="a">
      ${a0.ctx_a}<span class="ctx-sub">${a0.pref_a}</span></button>
    <button class="ctx-btn ${curCtx === 'b' ? 'active' : ''}" data-ctx="b">
      ${a0.ctx_b}<span class="ctx-sub">${a0.pref_b}</span></button>`;
  $("ctx-switch").querySelectorAll(".ctx-btn").forEach(b =>
    b.onclick = () => { curCtx = b.dataset.ctx; renderAlign(); });

  const turn = DATA.align.find(t => t.ctx_key === curCtx);
  $("align-user").textContent = turn.user;
  $("align-baseline").textContent = turn.baseline;
  $("align-ours").textContent = turn.ours;
  $("align-note").innerHTML = "💡 " + turn.note;

  // 高亮被触发的偏好
  document.querySelectorAll(".pref-item.stable").forEach(el =>
    el.classList.toggle("triggered", turn.triggered_stable.includes(+el.dataset.si)));
  document.querySelectorAll(".pref-item.aspect").forEach(el => {
    const isHit = +el.dataset.ai === turn.triggered_aspect;
    el.querySelectorAll(".aspect-pill").forEach(p =>
      p.classList.toggle("active", isHit && p.dataset.side === curCtx));
  });
}

// ---------- Task2 冲突检测 ----------
function renderConflict() {
  const c = DATA.conflict;
  $("conflict-user").textContent = c.user;
  $("conflict-baseline").textContent = c.baseline;
  $("conflict-ours").textContent = c.ours;
  $("conflict-baseline-verdict").textContent = "✗ 盲目假设，未察觉偏好冲突";
  $("conflict-ours-verdict").textContent = c.should_clarify ? "✓ 检测到冲突 → 主动澄清" : "✓ 无需澄清";
  $("conflict-explain").innerHTML = "⚠️ " + c.conflict_explain;
}

// ---------- Task3 推断效率 ----------
function effReset() {
  if (effTimer) { clearInterval(effTimer); effTimer = null; }
  effIdx = 0;
  $("eff-stream").innerHTML = "";
  $("eff-ours-turn").textContent = DATA ? DATA.ours_lock_turn : "?";
  $("eff-base-turn").textContent = DATA ? DATA.baseline_lock_turn : "?";
  $("eff-auto").textContent = "⏯ 自动播放";
}

function effStep() {
  if (!DATA || effIdx >= DATA.efficiency.length) return;
  const e = DATA.efficiency[effIdx];
  const div = document.createElement("div");
  div.className = "eff-turn" + (e.ours_locked ? " locked" : "");
  div.innerHTML = `
    <div class="rel-badge rel-${e.relevance}">${e.relevance}</div>
    <div>
      <div class="et-user">👤 ${e.user}</div>
      <div class="et-inferred">${e.ours_locked ? "🔓 " : "🧠 "}${e.inferred}</div>
    </div>`;
  $("eff-stream").appendChild(div);
  effIdx++;
  if (effIdx >= DATA.efficiency.length && effTimer) { clearInterval(effTimer); effTimer = null; $("eff-auto").textContent = "⏯ 自动播放"; }
}

function effAuto() {
  if (effTimer) { clearInterval(effTimer); effTimer = null; $("eff-auto").textContent = "⏯ 自动播放"; return; }
  if (effIdx >= DATA.efficiency.length) effReset();
  $("eff-auto").textContent = "⏸ 暂停";
  effTimer = setInterval(effStep, 1400);
}

function status(s) { $("status").textContent = s; }

init();
