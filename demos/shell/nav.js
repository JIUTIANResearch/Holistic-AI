/* ============ demos/shell/nav.js · 公共导航与数据加载辅助 ============
   每篇论文页面引入本文件后：
   - Shell.homeHref()  返回 Hub 首页的相对路径（自动适配部署子路径）
   - Shell.jget(url)    fetch JSON 的简写
   - Shell.$ / Shell.status  常用 DOM 辅助
   各论文的独有交互逻辑写在各自的 app.js 里，互不依赖。 */
(function () {
  "use strict";

  // 部署在 /Holistic-AI/demos/papers/<abbr>/ 下时，Hub 在 ../../../index.html
  // 本地直接打开文件或起静态服务器时同样适用（相对路径）
  function homeHref() {
    return "../../../index.html";
  }

  function jget(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " @ " + url);
      return r.json();
    });
  }

  function $(sel) { return document.querySelector(sel); }

  // 在页面的 .topbar 右侧注入「← 返回首页」链接（若尚无）
  function injectBackLink() {
    var meta = document.querySelector(".topbar .meta");
    if (!meta || meta.querySelector(".shell-back")) return;
    var a = document.createElement("a");
    a.className = "tag shell-back";
    a.href = homeHref();
    a.textContent = "← 返回首页";
    meta.appendChild(a);
  }

  var Shell = {
    homeHref: homeHref,
    jget: jget,
    $: $,
    status: function (sel, msg, type) {
      var el = typeof sel === "string" ? $(sel) : sel;
      if (!el) return;
      el.textContent = msg;
      el.className = "status dim " + (type || "");
    },
    injectBackLink: injectBackLink,
  };

  // DOM 就绪后自动注入返回链接
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectBackLink);
  } else {
    injectBackLink();
  }

  window.Shell = Shell;
})();
