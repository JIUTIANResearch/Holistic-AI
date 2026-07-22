/* ============ S2Pref demo · 极简演示 ============
   一个画像（林伟），两个情境。模型只看到对话，推断用户当前情境下的偏好并给推荐。
   切换情境，推荐随之翻转。对应论文 Figure 1 的核心例子。纯前端、无数据文件。 */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var PERSONA = {
    name: "林伟",
    stable: ["喜欢自然环境", "喜欢户外活动", "偏好亲身探索而非走马观花"],
    aspect: "计划的活动类型取决于同伴",
    branches: {
      friends: { trigger: "和朋友在一起", pref: "偏冒险刺激（如攀岩）" },
      family: { trigger: "和家人在一起", pref: "偏安全稳妥（如缓步登山）" }
    },
    scenes: {
      friends: {
        dialog: [
          { who: "林伟", t: "明天终于周末了，想出去放松一下。" },
          { who: "好友", t: "想去哪儿？" },
          { who: "林伟", t: "有山有水的地方。咱们去爬个刺激的山怎么样？" },
          { who: "林伟", t: "要那种能手脚并用往上爬的，太平淡没意思。" }
        ],
        infer: "当前情境：和朋友 → 情境偏好「冒险刺激」；稳定偏好「自然 / 户外 / 亲身探索」仍成立。",
        rec: "推荐和朋友去白岩攀岩——手脚并用、够刺激，又是自然户外，正中下怀。"
      },
      family: {
        dialog: [
          { who: "林伟", t: "明天周末，咱们一家出去走走吧。" },
          { who: "家人", t: "去哪儿呢？" },
          { who: "林伟", t: "有山有水的地方，带孩子呼吸新鲜空气。" },
          { who: "家人", t: "爬山怎么样？" },
          { who: "林伟", t: "爬个平缓点的山就行，安全第一，孩子还小。" }
        ],
        infer: "当前情境：和家人 → 情境偏好「安全稳妥」；稳定偏好「自然 / 户外 / 亲身探索」仍成立。",
        rec: "推荐带家人去翠湖缓步登山——平缓安全、孩子能走，有山有水还能呼吸新鲜空气。"
      }
    }
  };

  var cur = "friends";

  function renderPersona() {
    $("#p-name").textContent = PERSONA.name;
    var ul = $("#stable-list");
    ul.innerHTML = "";
    PERSONA.stable.forEach(function (s) {
      var li = document.createElement("li"); li.textContent = s; ul.appendChild(li);
    });
    $("#aspect-text").textContent = PERSONA.aspect;
    $("#tr-friends").textContent = PERSONA.branches.friends.trigger;
    $("#pr-friends").textContent = PERSONA.branches.friends.pref;
    $("#tr-family").textContent = PERSONA.branches.family.trigger;
    $("#pr-family").textContent = PERSONA.branches.family.pref;
  }

  function renderScene() {
    var sc = PERSONA.scenes[cur];

    // 高亮当前激活分支
    $$(".branch-line").forEach(function (b) {
      b.classList.toggle("active", b.dataset.b === cur);
    });
    $$(".tog").forEach(function (b) {
      b.classList.toggle("active", b.dataset.b === cur);
    });

    var d = $("#dialog");
    d.innerHTML = "";
    sc.dialog.forEach(function (m, i) {
      var isUser = m.who === PERSONA.name;
      var row = document.createElement("div");
      row.className = "msg " + (isUser ? "user" : "other");
      row.style.animationDelay = (i * 0.08) + "s";
      row.innerHTML = '<div class="row"><div class="avatar">' + (isUser ? "👤" : "💬") + '</div>' +
        '<div class="bubble">' + m.t + '</div></div>';
      d.appendChild(row);
    });

    $("#infer").textContent = sc.infer;
    $("#recommend").textContent = sc.rec;
  }

  function switchTo(b) {
    cur = b;
    renderScene();
  }

  function init() {
    renderPersona();
    renderScene();
    $$(".tog").forEach(function (b) {
      b.addEventListener("click", function () { switchTo(b.dataset.b); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
