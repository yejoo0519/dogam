/* Preserve editor position across synchronous redraws. No saved data is changed. */
(function () {
  'use strict';
  function preserve(draw, receiver, args) {
    const x = window.scrollX, y = window.scrollY;
    const positions = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!el.scrollTop && !el.scrollLeft) return;
      const selector = el.id ? '#' + CSS.escape(el.id) :
        el.classList.length ? el.tagName.toLowerCase() + Array.from(el.classList, c => '.' + CSS.escape(c)).join('') : null;
      if (selector) positions.push({el, selector, index: Array.from(document.querySelectorAll(selector)).indexOf(el), top: el.scrollTop, left: el.scrollLeft});
    });
    const active = document.activeElement;
    const change = active?.tagName === 'SELECT' ? active.getAttribute('onchange') : null;
    try { return draw.apply(receiver, args); }
    finally {
      if (change && !active.isConnected) {
        const replacement = Array.from(document.querySelectorAll('select[onchange]')).find(el => el.getAttribute('onchange') === change && el.getClientRects().length);
        replacement?.focus({preventScroll: true});
      }
      for (const p of positions) {
        const el = p.el.isConnected ? p.el : document.querySelectorAll(p.selector)[p.index];
        if (el) { el.scrollTop = p.top; el.scrollLeft = p.left; }
      }
      if (window.scrollX !== x || window.scrollY !== y) window.scrollTo({left: x, top: y, behavior: 'instant'});
    }
  }
  ['renderDragonInfo', 'renderAcc', 'renderPends', 'renderSpirit', 'renderSettingBuffs'].forEach(name => {
    const draw = window[name];
    if (typeof draw === 'function') window[name] = function (...args) { return preserve(draw, this, args); };
  });
})();
