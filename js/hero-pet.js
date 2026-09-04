/* ==========================================================================
   Tony Liu — Portfolio hero pet
   A small interactive dog living in the hero "stage": arrow keys / A-D walk
   him directly; clicking or tapping anywhere in the stage drops a treat he
   paths over to and eats. Pure DOM + CSS keyframes, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  function init() {
    var stage = document.getElementById("heroStage");
    var posEl = document.getElementById("dogPos");
    var facingEl = document.getElementById("dogFacing");
    var dogEl = document.getElementById("dogEl");
    var treatsLayer = document.getElementById("treatsLayer");
    if (!stage || !posEl || !facingEl || !dogEl || !treatsLayer) return;

    var DOG_HALF_WIDTH = 55;
    var KEY_SPEED = 230; // px/s
    var SEEK_SPEED = 170; // px/s
    var EAT_DISTANCE = 8;

    var state = {
      x: 0,
      facing: 1,
      left: false,
      right: false,
      treats: [], // {id, x, el}
      walking: false,
    };
    var treatSeq = 0;
    var rafId = null;

    function stageWidth() {
      return stage.clientWidth || 1;
    }

    function clampX(x) {
      var half = DOG_HALF_WIDTH;
      var max = Math.max(half, stageWidth() - half);
      return Math.min(max, Math.max(half, x));
    }

    function render() {
      posEl.style.transform = "translateX(" + (state.x - DOG_HALF_WIDTH) + "px)";
      facingEl.style.transform = "scaleX(" + state.facing + ")";
    }

    function hideHint() {
      var hint = document.querySelector(".hero-play-hint");
      if (hint) hint.classList.add("is-faded");
    }

    function dropTreat(clientX) {
      var rect = stage.getBoundingClientRect();
      var x = clampX(clientX - rect.left);
      var id = "t" + treatSeq++;
      var el = document.createElement("div");
      el.className = "treat";
      el.style.left = x + "px";
      el.innerHTML =
        '<svg viewBox="0 0 24 24" width="100%" height="100%">' +
        '<rect x="6" y="9" width="12" height="6" rx="3" fill="#e08a4b"/>' +
        '<circle cx="5" cy="9" r="3" fill="#e08a4b"/><circle cx="5" cy="15" r="3" fill="#e08a4b"/>' +
        '<circle cx="19" cy="9" r="3" fill="#e08a4b"/><circle cx="19" cy="15" r="3" fill="#e08a4b"/>' +
        "</svg>";
      treatsLayer.appendChild(el);
      state.treats.push({ id: id, x: x, el: el });
      hideHint();
    }

    function nearestTreat() {
      var best = null;
      var bestDist = Infinity;
      for (var i = 0; i < state.treats.length; i++) {
        var t = state.treats[i];
        var d = Math.abs(t.x - state.x);
        if (d < bestDist) {
          bestDist = d;
          best = t;
        }
      }
      return best;
    }

    function eatTreat(t) {
      state.treats = state.treats.filter(function (o) {
        return o.id !== t.id;
      });
      t.el.classList.add("is-eaten");
      window.setTimeout(function () {
        if (t.el.parentNode) t.el.parentNode.removeChild(t.el);
      }, 240);

      dogEl.classList.remove("is-walking");
      dogEl.classList.add("is-eating");
      window.setTimeout(function () {
        dogEl.classList.remove("is-eating");
        dogEl.classList.add("is-happy");
        window.setTimeout(function () {
          dogEl.classList.remove("is-happy");
        }, 460);
      }, 660);
    }

    function onKeyDown(e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") state.left = true;
      if (k === "ArrowRight" || k === "d" || k === "D") state.right = true;
    }
    function onKeyUp(e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") state.left = false;
      if (k === "ArrowRight" || k === "d" || k === "D") state.right = false;
    }

    function onStageClick(e) {
      var clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
      dropTreat(clientX);
    }

    var last = 0;
    function tick(now) {
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;

      var isEating = dogEl.classList.contains("is-eating") || dogEl.classList.contains("is-happy");
      var moving = false;

      if (!isEating) {
        if (state.left && !state.right) {
          state.x = clampX(state.x - KEY_SPEED * dt);
          state.facing = -1;
          moving = true;
        } else if (state.right && !state.left) {
          state.x = clampX(state.x + KEY_SPEED * dt);
          state.facing = 1;
          moving = true;
        } else {
          var target = nearestTreat();
          if (target) {
            var dx = target.x - state.x;
            var dist = Math.abs(dx);
            if (dist < EAT_DISTANCE) {
              eatTreat(target);
            } else {
              var dir = dx > 0 ? 1 : -1;
              state.x = clampX(state.x + dir * SEEK_SPEED * dt);
              state.facing = dir;
              moving = true;
            }
          }
        }
      }

      if (moving !== state.walking) {
        state.walking = moving;
        dogEl.classList.toggle("is-walking", moving);
      }

      render();
      rafId = window.requestAnimationFrame(tick);
    }

    function start() {
      last = 0;
      rafId = window.requestAnimationFrame(tick);
    }
    function stop() {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });
    window.addEventListener("resize", function () {
      state.x = clampX(state.x);
      render();
    });

    stage.addEventListener("click", onStageClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    state.x = clampX(stageWidth() / 2);
    render();
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
