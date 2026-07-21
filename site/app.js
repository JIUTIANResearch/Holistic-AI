/* ============ site/app.js · 首页与概览页的数据驱动渲染 ============
   所有论文数据来自 papers.json（唯一数据源）。加论文只改 papers.json。
   - renderHub()     : 首页按年代分组渲染卡片
   - renderOverview(): 单页 paper.html?id=xxx 渲染概览，富文本片段优先于数据型渲染 */
(function () {
  "use strict";

  var DATA_URL = "papers.json";
  var Overview = "overviews/";

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " @ " + url);
      return r.json();
    });
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  // 会议标签颜色：2026 用 accent（青绿），2025 用 violet（紫），与旧站一致
  function confTag(p) {
    var cls = p.year >= 2026 ? "accent" : "violet";
    var txt = p.conf + " " + p.year;
    if (p.track) txt += " · " + p.track;
    return '<span class="tag ' + cls + '">' + txt + "</span>";
  }

  function abbrHtml(p) {
    // 把 abbr 中希望高亮的部分用 <span class="glow">；简单策略：最后一段字母高亮
    var a = p.abbr;
    return '<span class="pc-abbr">' + a + "</span>";
  }

  function cardHtml(p) {
    var demoBtn = "";
    if (p.hasDemo && p.demoUrl) {
      demoBtn = '<a class="btn primary" href="' + p.demoUrl + '" target="_blank">▶ 交互演示</a>';
    } else if (p.demoNote) {
      demoBtn = '<span class="btn" disabled style="opacity:.5;cursor:default">' + p.demoNote + "</span>";
    }
    return (
      '<article class="paper-card">' +
      '<div class="pc-head">' + abbrHtml(p) + confTag(p) + "</div>" +
      '<h2>' + p.title + "</h2>" +
      '<div class="pc-desc">' + p.abstractZh + "</div>" +
      '<div class="pc-actions">' +
        '<a class="btn" href="paper.html?id=' + p.id + '">📄 论文概览</a>' +
        demoBtn +
      "</div>" +
      "</article>"
    );
  }

  function renderHub(data) {
    var main = document.getElementById("card-grid");
    if (!main) return;
    var html = "";
    data.groups.forEach(function (g) {
      var papers = data.papers.filter(function (p) { return p.year == g.year; });
      if (!papers.length) return;
      html += '<h2 class="group-title">' + g.label + ' <span class="group-count">' + papers.length + " 篇</span></h2>";
      html += '<div class="card-grid-inner">';
      papers.forEach(function (p) { html += cardHtml(p); });
      html += "</div>";
    });
    main.innerHTML = html;
  }

  /* ---- 概览页 ---- */
  function getParam(k) {
    var m = new RegExp("[?&]" + k + "=([^&]+)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function renderOverview(data) {
    var id = getParam("id");
    var p = data.papers.filter(function (x) { return x.id === id; })[0];
    var body = document.getElementById("ov-body");
    if (!p) { body.innerHTML = '<p class="dim">未找到论文 id=' + (id || "") + "</p>"; return; }
    document.title = p.abbr + " · 论文概览";

    // 顶栏
    var brand = document.getElementById("ov-brand");
    if (brand) brand.innerHTML = abbrHtml(p);
    var metas = document.querySelector(".topbar .meta");
    if (metas) metas.innerHTML = confTag(p);

    // 若有富文本片段文件，加载它填入 ov-content，否则用数据型渲染。
    var content = document.getElementById("ov-content");
    function useData() { content.innerHTML = dataOverviewHtml(p); mountOverview(p); }
    if (p.overview) {
      fetch(p.overview).then(function (r) {
        if (!r.ok) throw 0;
        return r.text();
      }).then(function (html) {
        content.innerHTML = html;
        mountOverview(p);
      }).catch(useData);
    } else {
      useData();
    }
  }

  // 数据型概览（无富文本片段时）：标题/作者/摘要/配图/链接
  function dataOverviewHtml(p) {
    var fig = "";
    if (p.picture) {
      fig = '<figure class="paper-fig"><img src="' + p.picture + '" alt="' + p.abbr + ' 论文主图"><figcaption>' + p.title + "（取自论文）</figcaption></figure>";
    }
    var demoRow = "";
    if (p.hasDemo && p.demoUrl) {
      demoRow = '<div class="cta-row"><a class="btn primary lg" href="' + p.demoUrl + '" target="_blank">▶ 进入交互演示</a></div>';
    } else if (p.demoNote) {
      demoRow = '<div class="cta-row"><span class="dim">' + p.demoNote + "</span></div>";
    }
    var linkRow =
      '<div class="ov-links">' +
        (p.paperUrl ? '<a class="btn" href="' + p.paperUrl + '" target="_blank">🔗 论文链接</a>' : "") +
      "</div>";
    return (
      '<a class="back-link" href="index.html">← 返回首页</a>' +
      '<h1 class="ov-title">' + p.title + "</h1>" +
      '<div class="ov-authors">' + p.authors + " · " + p.affiliation + " · " + (p.track ? p.conf + " " + p.year + " (" + p.track + ")" : p.conf + " " + p.year) + "</div>" +
      '<div class="ov-abstract"><div class="ab-label">摘要 · Abstract</div><p>' + p.abstractZh + "</p></div>" +
      '<div class="ov-section"><h3><span class="ic">🖼️</span>论文配图</h3>' + fig + "</div>" +
      linkRow + demoRow
    );
  }

  // 富文本片段加载后，补上统一的链接行（片段文件里通常不含链接）
  function mountOverview(p) {
    var wrap = document.getElementById("ov-links-mount");
    if (!wrap) return;
    wrap.innerHTML =
      (p.paperUrl ? '<a class="btn" href="' + p.paperUrl + '" target="_blank">🔗 论文链接</a>' : "");
    // 演示按钮
    var demoMount = document.getElementById("ov-demo-mount");
    if (demoMount) {
      if (p.hasDemo && p.demoUrl) {
        demoMount.innerHTML = '<div class="cta-row"><a class="btn primary lg" href="' + p.demoUrl + '" target="_blank">▶ 进入交互演示</a></div>';
      } else if (p.demoNote) {
        demoMount.innerHTML = '<div class="cta-row"><span class="dim">' + p.demoNote + "</span></div>";
      }
    }
    // 重绘图表（片段内可能有 canvas data-chart）
    if (window.Charts && window.Charts.redraw) window.Charts.redraw();
  }

  // 入口
  function boot() {
    fetchJSON(DATA_URL).then(function (data) {
      if (document.getElementById("card-grid")) renderHub(data);
      if (document.getElementById("ov-body")) renderOverview(data);
    }).catch(function (e) {
      console.error(e);
      var m = document.getElementById("card-grid") || document.getElementById("ov-body");
      if (m) m.innerHTML = '<p class="dim">数据加载失败：' + e.message + "</p>";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
