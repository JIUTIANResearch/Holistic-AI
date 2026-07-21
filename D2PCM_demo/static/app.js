/* ============ D2PCM demo · 前端逻辑 ============ */
const $ = (id) => document.getElementById(id);
let DATA = null;
let turnIdx = -1;        // 当前已展示到第几轮（-1 = 未开始）
let autoTimer = null;
// 累计指标
let acc = { hit_d: 0, hit_r: 0, mrew_d: 0, mrew_r: 0, rrew_d: 0, rrew_r: 0, n: 0 };

async function jget(url) { const r = await fetch(url); return r.json(); }

async function init() {
  try {
    const s = await jget("api/llm_status");
    const b = $("llm-badge");
    if (s.available) { b.textContent = "LLM ✓"; b.classList.add("good"); }
    else b.textContent = "LLM ✗ 脚本模式";
  } catch (e) { $("llm-badge").textContent = "LLM ✗"; }

  const list = await jget("api/personas");
  const sel = $("persona-select");
  sel.innerHTML = list.map(p => `<option value="${p.pid}">${p.avatar} ${p.name}</option>`).join("");
  sel.onchange = () => loadPersona(sel.value);

  $("reveal-btn").onclick = () => {
    const d = $("persona-desc");
    const masked = d.classList.toggle("masked");
    $("reveal-btn").textContent = masked ? "显示" : "隐藏";
  };
  $("step-btn").onclick = step;
  $("auto-btn").onclick = auto;
  $("reset-btn").onclick = reset;

  await loadPersona(list[0].pid);
}

async function loadPersona(pid) {
  DATA = await jget(`api/persona/${pid}`);
  $("persona-desc").textContent = DATA.desc;
  drawRadar(DATA.big5, DATA.axes);
  reset();
  status(`已加载画像：${DATA.name}`);
}

// ---------- Big-5 雷达图 ----------
function drawRadar(vals, axes) {
  const cv = $("big5-radar"), ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = 88;
  ctx.clearRect(0, 0, W, H);
  const n = axes.length;
  const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;

  // 网格（Low=内, High=外）
  for (let ring = 1; ring <= 2; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const r = R * ring / 2, a = ang(i % n);
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(94,145,255,.18)"; ctx.lineWidth = 1; ctx.stroke();
  }
  // 轴线 + 标签
  ctx.font = "12px sans-serif"; ctx.fillStyle = "#7d88a3"; ctx.textAlign = "center";
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
    ctx.strokeStyle = "rgba(94,145,255,.14)"; ctx.stroke();
    const lx = cx + (R + 16) * Math.cos(a), ly = cy + (R + 16) * Math.sin(a) + 4;
    ctx.fillText(axes[i].key, lx, ly);
  }
  // 数据多边形（High=R, Low=R*0.42 让低值也可见）
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n, v = vals[idx] ? 1 : 0.42, r = R * v, a = ang(idx);
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(94,234,212,.18)";
  ctx.strokeStyle = "#5eead4"; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
  // 顶点
  for (let i = 0; i < n; i++) {
    const v = vals[i] ? 1 : 0.42, r = R * v, a = ang(i);
    ctx.beginPath();
    ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 3, 0, 2 * Math.PI);
    ctx.fillStyle = vals[i] ? "#a78bfa" : "#7d88a3"; ctx.fill();
  }
}

// ---------- 轮次推进 ----------
function reset() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $("auto-btn").textContent = "⏯ 自动播放"; }
  turnIdx = -1;
  acc = { hit_d: 0, hit_r: 0, mrew_d: 0, mrew_r: 0, rrew_d: 0, rrew_r: 0, n: 0 };
  $("query").textContent = "（点击「下一轮」开始）";
  $("mem-list").innerHTML = "";
  $("resp-rag").textContent = "";
  $("resp-d2pcm").textContent = "";
  $("reward-rag").textContent = "";
  $("reward-d2pcm").textContent = "";
  $("turn-indicator").textContent = `轮次 0 / ${DATA ? DATA.turns.length : 0}`;
  renderKpi();
}

function step() {
  if (!DATA || turnIdx >= DATA.turns.length - 1) {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $("auto-btn").textContent = "⏯ 自动播放"; }
    return;
  }
  turnIdx++;
  const t = DATA.turns[turnIdx];
  $("query").textContent = t.query;
  $("turn-indicator").textContent = `轮次 ${turnIdx + 1} / ${DATA.turns.length}`;

  // 记忆 chunk
  $("mem-list").innerHTML = t.memories.map((m, i) => {
    let cls = "mem-item", badges = "";
    const isRag = i === t.rag_pick, isD = i === t.d2pcm_pick;
    if (isRag && isD) cls += " pick-both";
    else if (isRag) cls += " pick-rag";
    else if (isD) cls += " pick-d2pcm";
    if (isRag) badges += `<span class="pick-badge rag">RAG</span>`;
    if (isD) badges += `<span class="pick-badge d2pcm">D2PCM</span>`;
    const star = m.persona_fit ? `<span class="mem-fit-star">★</span>` : "";
    return `<div class="${cls}">
      <div class="mem-text">${star}${m.text}</div>
      <div class="mem-meta"><span class="mem-sim">sim ${m.sim.toFixed(2)}</span>${badges}</div>
    </div>`;
  }).join("");

  // 回复 + reward
  $("resp-rag").textContent = t.resp_rag;
  $("resp-d2pcm").textContent = t.resp_d2pcm;
  $("reward-rag").textContent = `reward ${t.reward_rag.toFixed(2)}`;
  $("reward-d2pcm").textContent = `reward ${t.reward_d2pcm.toFixed(2)}`;

  // 累计指标
  acc.n++;
  if (DATA.turns[turnIdx].memories[t.d2pcm_pick].persona_fit) acc.hit_d++;
  if (DATA.turns[turnIdx].memories[t.rag_pick].persona_fit) acc.hit_r++;
  acc.mrew_d += t.reward_d2pcm; acc.mrew_r += t.reward_rag;
  acc.rrew_d += t.reward_d2pcm; acc.rrew_r += t.reward_rag;
  renderKpi();

  // live 模式（可选）：异步替换 D2PCM 回复
  maybeLive(turnIdx);
}

function renderKpi() {
  const n = acc.n || 1;
  $("hit-d").textContent = Math.round(100 * acc.hit_d / n) + "%";
  $("hit-r").textContent = Math.round(100 * acc.hit_r / n) + "%";
  $("mrew-d").textContent = acc.mrew_d.toFixed(1);
  $("mrew-r").textContent = acc.mrew_r.toFixed(1);
  $("rrew-d").textContent = acc.rrew_d.toFixed(1);
  $("rrew-r").textContent = acc.rrew_r.toFixed(1);
}

function auto() {
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $("auto-btn").textContent = "⏯ 自动播放"; return; }
  if (turnIdx >= DATA.turns.length - 1) reset();
  $("auto-btn").textContent = "⏸ 暂停";
  autoTimer = setInterval(step, 2200);
}

async function maybeLive(ti) {
  const badge = $("llm-badge");
  if (!badge.classList.contains("good")) return;
  try {
    const r = await fetch("api/live_select", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pid: DATA.pid, turn: ti }),
    });
    const d = await r.json();
    if (d.resp_d2pcm && ti === turnIdx) {
      $("resp-d2pcm").textContent = d.resp_d2pcm + "  ⟨live⟩";
    }
  } catch (e) { /* 忽略，保留脚本回复 */ }
}

function status(s) { $("status").textContent = s; }
init();
