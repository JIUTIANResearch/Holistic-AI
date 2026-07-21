// ============ PAMDP demo · 静态版前端 ============
// 数据来自预生成的 data/*.json（脚本模式），无后端依赖。
const $ = (sel) => document.querySelector(sel);

let personas = [];                  // [{id, avatar, title_cn, title_en}]
let episode = null;                 // {persona, turns:[...], max_turn}
let currentPersonaId = null;
let unlockedKeys = new Set();
let turnIdx = 0;                    // 已播放到第几轮（0-based）
let inProgress = false;
let autoTimer = null;

// reward chart
let chart = null;
const chartLabels = ["init"];
const chartPamdp = [0];
const chartVanilla = [0];

function initChart() {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js 未加载，回报曲线将被禁用");
    const wrap = document.querySelector(".chart-wrap");
    if (wrap) wrap.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#7d88a3;font-size:13px">'
      + 'Chart.js 未加载 · 曲线视图已禁用</div>';
    return;
  }
  const ctx = document.getElementById("reward-chart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        { label: "PAMDP (Ours)", data: chartPamdp,
          borderColor: "#5eead4", backgroundColor: "rgba(94, 234, 212, 0.18)",
          fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: "#5eead4", borderWidth: 3 },
        { label: "Vanilla LLM", data: chartVanilla,
          borderColor: "#f87171", backgroundColor: "rgba(248, 113, 113, 0.10)",
          fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: "#f87171",
          borderWidth: 2, borderDash: [6, 4] },
      ],
    },
    options: {
      animation: { duration: 700, easing: "easeOutQuart" },
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#cdd6e8",
          font: { family: "PingFang SC, Microsoft YaHei, sans-serif", size: 13 }, usePointStyle: true } },
        tooltip: { mode: "index", intersect: false,
          backgroundColor: "rgba(13, 18, 32, 0.94)", borderColor: "rgba(94, 234, 212, 0.3)", borderWidth: 1 },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7d88a3" },
             title: { display: true, text: "interaction step t", color: "#7d88a3" } },
        y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#7d88a3" },
             title: { display: true, text: "cumulative reward", color: "#7d88a3" } },
      },
    },
  });
}

function status(msg, type = "") {
  const el = $("#status");
  el.textContent = msg;
  el.className = "status dim " + type;
}

// ============ persona list ============
async function loadPersonas() {
  personas = await Shell.jget("data/personas.json");
  const sel = $("#persona-select");
  sel.innerHTML = "";
  personas.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.avatar}  ${p.title_cn}`;
    sel.appendChild(opt);
  });
  currentPersonaId = personas[0].id;
  await loadEpisode(currentPersonaId);

  sel.onchange = async () => {
    currentPersonaId = sel.value;
    await loadEpisode(currentPersonaId);
  };
}

async function loadEpisode(pid) {
  episode = await Shell.jget(`data/episode_${pid}.json`);
  unlockedKeys.clear();
  renderAttrGrid(episode.persona);
  $("#persona-title-inline").textContent =
    `${episode.persona.avatar} ${episode.persona.title_cn}`;
  updateMatchSummary();
  clearAll();
  status(`已加载画像：${episode.persona.title_cn}（共 ${episode.max_turn} 轮）`);
}

// ============ attribute card grid ============
function renderAttrGrid(persona) {
  const grid = $("#attr-grid");
  grid.innerHTML = "";
  (persona.attributes || []).forEach((a) => {
    const card = document.createElement("div");
    card.className = "attr-card";
    card.dataset.key = a.key;
    card.innerHTML =
      `<span class="icon-big">${escapeHtml(a.icon || "")}</span>` +
      `<span class="attr-label">${escapeHtml(a.label || a.key)}</span>` +
      `<span class="attr-detail">${escapeHtml(a.detail || "")}</span>`;
    grid.appendChild(card);
  });
}

function unlockAttrs(keys) {
  if (!keys || !keys.length) return;
  keys.forEach((k) => {
    if (unlockedKeys.has(k)) return;
    unlockedKeys.add(k);
    const card = document.querySelector(`.attr-card[data-key="${cssEscape(k)}"]`);
    if (!card) return;
    card.classList.add("unlocked", "just-unlocked");
    setTimeout(() => card.classList.remove("just-unlocked"), 1500);
  });
  updateMatchSummary();
}

function updateMatchSummary() {
  const total = episode && episode.persona ? (episode.persona.attributes || []).length : 0;
  const got = unlockedKeys.size;
  $("#match-summary").textContent = `${got} / ${total}`;
  $("#vs-cover-p").textContent = `${got} / ${total}`;
  $("#vs-cover-v").textContent = `0 / ${total}`;
}

// ============ KPI ============
function flashKpi(el) {
  el.style.transform = "scale(1.18)";
  setTimeout(() => { el.style.transform = ""; }, 240);
}

function updateKpi(t) {
  const rewardP = $("#vs-reward-p"), rewardV = $("#vs-reward-v");
  rewardP.textContent = (t.cum_reward_pamdp >= 0 ? "+" : "") + t.cum_reward_pamdp.toFixed(1);
  rewardV.textContent = (t.cum_reward_vanilla >= 0 ? "+" : "") + t.cum_reward_vanilla.toFixed(1);
  flashKpi(rewardP); flashKpi(rewardV);

  const winP = $("#vs-winrate-p"), winV = $("#vs-winrate-v");
  winP.textContent = Math.round((t.win_rate_pamdp || 0) * 100) + "%";
  winV.textContent = Math.round((t.win_rate_vanilla || 0) * 100) + "%";
  flashKpi(winP); flashKpi(winV);

  $("#kpi-turn").textContent = `${t.turn} / ${episode.max_turn}`;
  const advSign = t.advantage >= 0 ? "+" : "";
  const advEl = $("#kpi-adv");
  advEl.textContent = advSign + t.advantage.toFixed(3);
  advEl.classList.toggle("good", t.advantage >= 0);
  advEl.classList.toggle("bad",  t.advantage < 0);
  $("#kpi-vh").textContent = `${t.v_partial.toFixed(2)} / ${t.v_full.toFixed(2)}`;
}

function clearAll() {
  $("#chat-vanilla").innerHTML = "";
  $("#chat-pamdp").innerHTML = "";
  $("#vs-reward-p").textContent = "+0.0"; $("#vs-reward-v").textContent = "0.0";
  $("#vs-winrate-p").textContent = "0%"; $("#vs-winrate-v").textContent = "0%";
  $("#kpi-turn").textContent = `0 / ${episode ? episode.max_turn : 6}`;
  $("#kpi-adv").textContent = "+0.000";
  $("#kpi-adv").classList.remove("good", "bad");
  $("#kpi-vh").textContent = "0.00 / 0.00";
  unlockedKeys.clear();
  document.querySelectorAll(".attr-card").forEach((c) => {
    c.classList.remove("unlocked", "just-unlocked");
  });
  updateMatchSummary();
  try {
    if (chart) {
      chart.data.labels = ["init"];
      chart.data.datasets[0].data = [0];
      chart.data.datasets[1].data = [0];
      chart.update("none");
    }
    chartLabels.length = 0; chartLabels.push("init");
    chartPamdp.length  = 0; chartPamdp.push(0);
    chartVanilla.length = 0; chartVanilla.push(0);
  } catch (e) { console.warn("[PAMDP] chart reset failed:", e); }
}

// ============ chat ============
function typewriter(el, text, speed = 18) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = "";
    const tick = () => {
      if (i >= text.length) return resolve();
      el.textContent += text.charAt(i++);
      setTimeout(tick, speed);
    };
    tick();
  });
}

async function appendChat(containerSel, role, text, opts = {}) {
  const container = $(containerSel);
  const wrap = document.createElement("div");
  wrap.className = "bubble " + role;
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = role === "user" ? "user" : (opts.assistantLabel || "assistant");
  wrap.appendChild(meta);
  const body = document.createElement("span");
  wrap.appendChild(body);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  await typewriter(body, text, opts.speed || 16);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

function appendRewardPill(containerSel, reward) {
  const container = $(containerSel);
  const pill = document.createElement("div");
  let cls, text;
  if (reward > 0.6) { cls = "win";  text = `reward = +${reward.toFixed(1)}  ✓ win`; }
  else if (reward < -0.1) { cls = "loss"; text = `reward = ${reward.toFixed(1)}  ✗ lose`; }
  else { cls = "tie";  text = `reward = ${reward.toFixed(1)}  ≈ tie`; }
  pill.className = "reward-pill " + cls;
  pill.textContent = text;
  container.appendChild(pill);
  container.scrollTop = container.scrollHeight;
}

function pushChartPoint(t) {
  try {
    chartLabels.push(`t=${t.turn}`);
    chartPamdp.push(t.cum_reward_pamdp);
    chartVanilla.push(t.cum_reward_vanilla);
    if (chart) {
      chart.data.labels = chartLabels.slice();
      chart.data.datasets[0].data = chartPamdp.slice();
      chart.data.datasets[1].data = chartVanilla.slice();
      chart.update();
    }
  } catch (e) { console.warn("[PAMDP] pushChartPoint failed:", e); }
}

// ============ flow ============
async function doStep() {
  if (inProgress) return;
  if (!episode || turnIdx >= episode.turns.length) return;
  inProgress = true;
  status("⏳ 推进一轮…", "");
  try {
    const t = episode.turns[turnIdx];
    turnIdx++;

    await Promise.all([
      appendChat("#chat-vanilla", "user", t.user_query, { speed: 8 }),
      appendChat("#chat-pamdp", "user", t.user_query, { speed: 8 }),
    ]);
    await Promise.all([
      appendChat("#chat-vanilla", "assistant", t.vanilla_reply, { speed: 14, assistantLabel: "vanilla" }),
      appendChat("#chat-pamdp",   "assistant", t.pamdp_reply,   { speed: 14, assistantLabel: "pamdp" }),
    ]);
    appendRewardPill("#chat-vanilla", t.reward_vanilla);
    appendRewardPill("#chat-pamdp",   t.reward_pamdp);

    updateKpi(t);
    unlockAttrs(t.attrs_unlocked);
    pushChartPoint(t);

    status(`✓ 第 ${t.turn} 轮 · 新增解锁 ${t.attrs_unlocked.length} 项 · 覆盖 ${t.attrs_unlocked_total}/${t.attrs_total}`, "accent");
    if (t.is_final || turnIdx >= episode.turns.length) {
      $("#step-btn").disabled = true;
      $("#auto-btn").disabled = true;
      stopAuto();
      status("✓ 演示结束 · PAMDP 累计回报领先 " +
             (t.cum_reward_pamdp - t.cum_reward_vanilla).toFixed(2) +
             " · 画像覆盖 " + t.attrs_unlocked_total + "/" + t.attrs_total, "accent");
    }
  } catch (e) {
    console.error("[PAMDP] doStep error:", e);
    status("✗ " + (e && e.message ? e.message : e), "bad");
  }
  inProgress = false;
}

function doStart() {
  clearAll();
  turnIdx = 0;
  status(`✓ Episode ready · 脚本模式 · max=${episode.max_turn}`, "accent");
  $("#step-btn").disabled = false;
  $("#auto-btn").disabled = false;
  $("#reset-btn").disabled = false;
  $("#start-btn").textContent = "▶ 重新开始";
}

function doReset() {
  stopAuto();
  clearAll();
  turnIdx = 0;
  $("#step-btn").disabled = true;
  $("#auto-btn").disabled = true;
  status("已重置", "");
}

function toggleAuto() {
  if (autoTimer) { stopAuto(); return; }
  $("#auto-btn").textContent = "⏸ 暂停";
  const tick = async () => {
    await doStep();
    if ($("#step-btn").disabled) { stopAuto(); return; }
    autoTimer = setTimeout(tick, 1200);
  };
  tick();
}
function stopAuto() {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  $("#auto-btn").textContent = "⏯ 自动播放";
}

// ============ utils ============
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function cssEscape(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

// ============ boot ============
function boot() {
  try { initChart(); } catch (e) { console.error("initChart failed:", e); }

  $("#start-btn").addEventListener("click", doStart);
  $("#step-btn").addEventListener("click", doStep);
  $("#auto-btn").addEventListener("click", toggleAuto);
  $("#reset-btn").addEventListener("click", doReset);

  loadPersonas().catch((e) => {
    console.error("loadPersonas:", e);
    status("✗ 画像列表加载失败: " + e, "bad");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
