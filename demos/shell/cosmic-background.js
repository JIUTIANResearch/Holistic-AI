(function () {
  "use strict";

  var script = document.currentScript;
  var imageUrl = script && script.dataset.image ? script.dataset.image : "starfield-bg.webp";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var seed = 1205301;
  var frameId = 0;
  var lastTime = 0;
  var lastScrollY = window.scrollY || 0;
  var scrollVelocity = 0;
  var layers = [];
  var canvas;
  var ctx;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var maxScroll = 0;
  var visible = true;
  var resizeTimer;

  function random() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  function createBackdrop() {
    var root = document.querySelector(".cosmic-backdrop");
    if (root) return root;

    root = document.createElement("div");
    root.className = "cosmic-backdrop";
    root.setAttribute("aria-hidden", "true");

    var photo = document.createElement("div");
    photo.className = "cosmic-photo";
    photo.style.backgroundImage = "url(\"" + imageUrl.replace(/\"/g, "\\\"") + "\")";

    var nebula = document.createElement("div");
    nebula.className = "cosmic-nebula";

    canvas = document.createElement("canvas");
    canvas.className = "cosmic-stars";

    var vignette = document.createElement("div");
    vignette.className = "cosmic-vignette";

    var grain = document.createElement("div");
    grain.className = "cosmic-grain";

    root.appendChild(photo);
    root.appendChild(nebula);
    root.appendChild(canvas);
    root.appendChild(vignette);
    root.appendChild(grain);
    document.body.prepend(root);
    return root;
  }

  function makeLayer(speed, density, minRadius, maxRadius, hueMin, hueMax) {
    var worldHeight = height + maxScroll * speed + height * .2;
    var count = Math.max(42, Math.round(width * worldHeight * density));
    var stars = new Array(count);

    for (var i = 0; i < count; i += 1) {
      var y = random() * worldHeight - height * .1;
      var depth = Math.max(0, Math.min(1, y / Math.max(worldHeight, 1)));
      stars[i] = {
        x: random() * width,
        y: y,
        r: minRadius + random() * (maxRadius - minRadius) * (0.82 + depth * .34),
        alpha: .25 + random() * .72,
        hue: hueMin + random() * (hueMax - hueMin),
        phase: random() * Math.PI * 2,
        pulse: .35 + random() * 1.25
      };
    }

    return { speed: speed, stars: stars };
  }

  function buildField() {
    seed = 1205301;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    layers = [
      makeLayer(.07, .000095, .25, .75, 200, 235),
      makeLayer(.16, .000055, .55, 1.25, 190, 255),
      makeLayer(.31, .000022, .85, 1.75, 185, 285)
    ];
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildField();
    draw(performance.now());
  }

  function drawStar(star, screenY, time, layerIndex, progress) {
    var twinkle = reducedMotion.matches ? 1 : .77 + Math.sin(time * .0007 * star.pulse + star.phase) * .23;
    var alpha = Math.min(1, star.alpha * twinkle * (1 + progress * .12));
    var radius = star.r;

    if (radius > 1.05) {
      var glow = ctx.createRadialGradient(star.x, screenY, 0, star.x, screenY, radius * 4.2);
      glow.addColorStop(0, "hsla(" + star.hue + ", 95%, 93%, " + alpha + ")");
      glow.addColorStop(.22, "hsla(" + star.hue + ", 90%, 78%, " + (alpha * .38) + ")");
      glow.addColorStop(1, "hsla(" + star.hue + ", 80%, 65%, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(star.x, screenY, radius * 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "hsla(" + star.hue + ", 90%, 94%, " + alpha + ")";
    ctx.beginPath();
    ctx.arc(star.x, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    if (layerIndex === 2 && radius > 1.35) {
      ctx.strokeStyle = "hsla(" + star.hue + ", 90%, 90%, " + (alpha * .25) + ")";
      ctx.lineWidth = .6;
      ctx.beginPath();
      ctx.moveTo(star.x - radius * 3.2, screenY);
      ctx.lineTo(star.x + radius * 3.2, screenY);
      ctx.moveTo(star.x, screenY - radius * 3.2);
      ctx.lineTo(star.x, screenY + radius * 3.2);
      ctx.stroke();
    }
  }

  function drawShootingDust(time) {
    if (reducedMotion.matches || Math.abs(scrollVelocity) < .5) return;
    var phase = (time * .000085 + lastScrollY * .000035) % 1;
    if (phase > .18) return;

    var x = width * (.82 - phase * 1.7);
    var y = height * (.13 + phase * 1.4);
    var length = 72 + Math.min(110, Math.abs(scrollVelocity) * 3);
    var gradient = ctx.createLinearGradient(x, y, x + length, y - length * .42);
    gradient.addColorStop(0, "rgba(214, 234, 255, .72)");
    gradient.addColorStop(1, "rgba(140, 184, 255, 0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y - length * .42);
    ctx.stroke();
  }

  function draw(time) {
    if (!ctx) return;
    var scrollY = reducedMotion.matches ? 0 : window.scrollY || 0;
    var progress = maxScroll > 0 ? Math.min(1, Math.max(0, (window.scrollY || 0) / maxScroll)) : 0;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    for (var l = 0; l < layers.length; l += 1) {
      var layer = layers[l];
      var offset = scrollY * layer.speed;
      for (var i = 0; i < layer.stars.length; i += 1) {
        var star = layer.stars[i];
        var screenY = star.y - offset;
        if (screenY < -8 || screenY > height + 8) continue;
        drawStar(star, screenY, time, l, progress);
      }
    }

    drawShootingDust(time);
    ctx.globalCompositeOperation = "source-over";
  }

  function updateCss() {
    var y = window.scrollY || 0;
    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    var progress = maxScroll > 0 ? Math.min(1, Math.max(0, y / maxScroll)) : 0;
    var shift = reducedMotion.matches ? 0 : -progress * window.innerHeight * .035;
    document.documentElement.style.setProperty("--cosmic-photo-shift", shift.toFixed(2) + "px");
    document.documentElement.style.setProperty("--cosmic-progress", progress.toFixed(4));
    document.documentElement.style.setProperty("--cosmic-deepening", Math.pow(progress, .72).toFixed(4));
    scrollVelocity = scrollVelocity * .72 + (y - lastScrollY) * .28;
    lastScrollY = y;
  }

  function animate(time) {
    if (!visible) return;
    updateCss();
    if (time - lastTime > 15) {
      draw(time);
      lastTime = time;
      scrollVelocity *= .92;
    }
    frameId = window.requestAnimationFrame(animate);
  }

  function onVisibilityChange() {
    visible = !document.hidden;
    if (visible && !frameId) frameId = window.requestAnimationFrame(animate);
    if (!visible && frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  function boot() {
    createBackdrop();
    ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    resize();
    updateCss();
    frameId = window.requestAnimationFrame(animate);

    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    }, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", function () {
      buildField();
      updateCss();
    });

    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        var nextMaxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (Math.abs(nextMaxScroll - maxScroll) > 40) buildField();
      }).observe(document.body);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}());
