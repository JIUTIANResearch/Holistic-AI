/* ============ D2PCM demo · 静态版前端 ============
   数据来自预生成的 data/*.json（脚本模式），无后端依赖。 */
const $ = (id) => document.getElementById(id);
let DATA = null;
let turnIdx = -1;        // 当前已展示到第几轮（-1 = 未开始）
let autoTimer = null;
// 累计指标
let acc = { hit_d: 0, hit_r: 0, mrew_d: 0, mrew_r: 0, rrew_d: 0, rrew_r: 0, n: 0 };

async function init() {
  const list = await Shell.jget("data/personas.json");
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
  DATA = await Shell.jget(`data/persona_${pid}.json`);
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

  for (let ring = 1; ring <= 2; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const r = R * ring / 2, a = ang(i % n);
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(94,145,255,.18)"; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.font = "12px sans-serif"; ctx.fillStyle = "#7d88a3"; ctx.textAlign = "center";
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
    ctx.strokeStyle = "rgba(94,145,255,.14)"; ctx.stroke();
    const lx = cx + (R + 16) * Math.cos(a), ly = cy + (R + 16) * Math.sin(a) + 4;
    ctx.fillText(axes[i].key, lx, ly);
  }
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n, v = vals[idx] ? 1 : 0.42, r = R * v, a = ang(idx);
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(94,234,212,.18)";
  ctx.strokeStyle = "#5eead4"; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
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

  $("resp-rag").textContent = t.resp_rag;
  $("resp-d2pcm").textContent = t.resp_d2pcm;
  $("reward-rag").textContent = `reward ${t.reward_rag.toFixed(2)}`;
  $("reward-d2pcm").textContent = `reward ${t.reward_d2pcm.toFixed(2)}`;

  acc.n++;
  if (DATA.turns[turnIdx].memories[t.d2pcm_pick].persona_fit) acc.hit_d++;
  if (DATA.turns[turnIdx].memories[t.rag_pick].persona_fit) acc.hit_r++;
  acc.mrew_d += t.reward_d2pcm; acc.mrew_r += t.reward_rag;
  acc.rrew_d += t.reward_d2pcm; acc.rrew_r += t.reward_rag;
  renderKpi();
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

function status(s) { $("status").textContent = s; }
init();
