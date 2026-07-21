/* ============ 概览页结果图表 · 轻量 Canvas 绘制（无第三方依赖） ============ */
/* 用法：在页面里放 <canvas data-chart='{...}'></canvas>，本脚本自动渲染。
   config: {
     type: "bar" | "groupbar",
     title: "...",
     unit: "",                       // 数值后缀，如 "%"
     // bar:   labels:[...], values:[...], highlight:idx
     // groupbar: labels:[组...], series:[{name,color,values:[...]}], highlight:seriesIdx
     max: number (可选，纵轴上限)
   }
*/
(function () {
  const C = {
    accent: "#5eead4", accent2: "#a78bfa", dim: "#7d88a3",
    grid: "rgba(94,145,255,.14)", text: "#e3e8f5", bad: "#f87171",
    barBase: "rgba(125,136,163,.45)",
  };
  const font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
  const mono = '12px "JetBrains Mono",Consolas,monospace';

  function fit(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 560, h = cv.clientHeight || 240;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function drawBar(cv, cfg) {
    const { ctx, w, h } = fit(cv);
    ctx.clearRect(0, 0, w, h);
    const padL = 48, padR = 18, padT = 14, padB = 46;
    const vals = cfg.values, n = vals.length;
    const max = cfg.max || Math.max(...vals) * 1.18;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const x0 = padL, y0 = h - padB;

    // y 网格
    ctx.strokeStyle = C.grid; ctx.fillStyle = C.dim; ctx.font = mono; ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, y = y0 - plotH * i / 4;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke();
      ctx.fillText(v.toFixed(v < 1 ? 2 : (v < 10 ? 1 : 0)), x0 - 6, y + 4);
    }
    // 柱
    const bw = plotW / n * 0.52, gap = plotW / n;
    vals.forEach((v, i) => {
      const cx = x0 + gap * (i + 0.5), bh = plotH * (v / max);
      const hl = i === cfg.highlight;
      if (hl) {
        const g = ctx.createLinearGradient(0, y0 - bh, 0, y0);
        g.addColorStop(0, C.accent); g.addColorStop(1, C.accent2);
        ctx.fillStyle = g;
      } else ctx.fillStyle = C.barBase;
      roundRect(ctx, cx - bw / 2, y0 - bh, bw, bh, 5); ctx.fill();
      // 数值
      ctx.fillStyle = hl ? C.accent : C.text; ctx.font = mono; ctx.textAlign = "center";
      ctx.fillText(fmt(v, cfg.unit), cx, y0 - bh - 7);
      // 标签
      ctx.fillStyle = hl ? C.text : C.dim; ctx.font = font;
      wrapLabel(ctx, cfg.labels[i], cx, y0 + 16);
    });
  }

  function drawGroupBar(cv, cfg) {
    const { ctx, w, h } = fit(cv);
    ctx.clearRect(0, 0, w, h);
    const padL = 48, padR = 18, padT = 14, padB = 58;
    const groups = cfg.labels, series = cfg.series;
    const allVals = series.flatMap(s => s.values);
    const max = cfg.max || Math.max(...allVals) * 1.18;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const x0 = padL, y0 = h - padB;

    ctx.strokeStyle = C.grid; ctx.fillStyle = C.dim; ctx.font = mono; ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, y = y0 - plotH * i / 4;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + plotW, y); ctx.stroke();
      ctx.fillText(v.toFixed(v < 1 ? 2 : 1), x0 - 6, y + 4);
    }
    const gGap = plotW / groups.length, sN = series.length, bw = gGap * 0.62 / sN;
    groups.forEach((g, gi) => {
      const gcx = x0 + gGap * (gi + 0.5);
      const startX = gcx - (bw * sN) / 2;
      series.forEach((s, si) => {
        const v = s.values[gi], bh = plotH * (v / max);
        const bx = startX + bw * si;
        ctx.fillStyle = s.color;
        roundRect(ctx, bx, y0 - bh, bw - 3, bh, 4); ctx.fill();
        ctx.fillStyle = C.text; ctx.font = mono; ctx.textAlign = "center";
        ctx.fillText(v.toFixed(s.dec != null ? s.dec : 2), bx + (bw - 3) / 2, y0 - bh - 6);
      });
      ctx.fillStyle = C.dim; ctx.font = font; ctx.textAlign = "center";
      wrapLabel(ctx, g, gcx, y0 + 16);
    });
    // 图例
    let lx = x0;
    ctx.font = font; ctx.textAlign = "left";
    series.forEach(s => {
      ctx.fillStyle = s.color; roundRect(ctx, lx, h - 18, 11, 11, 3); ctx.fill();
      ctx.fillStyle = C.dim; ctx.fillText(s.name, lx + 16, h - 9);
      lx += 28 + ctx.measureText(s.name).width;
    });
  }

  function fmt(v, unit) {
    const s = unit === "%" ? v.toFixed(1) : (v < 1 ? v.toFixed(v < 0.1 ? 3 : 3) : v.toFixed(2));
    return s + (unit || "");
  }
  function wrapLabel(ctx, text, cx, y) {
    const parts = String(text).split("\n");
    parts.forEach((p, i) => ctx.fillText(p, cx, y + i * 13));
  }
  function roundRect(ctx, x, y, w, h, r) {
    if (h < 0) { y += h; h = -h; }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function renderAll() {
    document.querySelectorAll("canvas[data-chart]").forEach(cv => {
      let cfg;
      try { cfg = JSON.parse(cv.getAttribute("data-chart")); }
      catch (e) { return; }
      if (cfg.type === "groupbar") drawGroupBar(cv, cfg);
      else drawBar(cv, cfg);
    });
  }
  window.addEventListener("load", renderAll);
  window.addEventListener("resize", () => { clearTimeout(window.__ct); window.__ct = setTimeout(renderAll, 150); });
})();
