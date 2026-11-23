/* 今天吃啥抽签器 —— 纯原生，无依赖 */
(function () {
  'use strict';

  const DEFAULT_OPTIONS = ['白米饭', '拉面', '黄焖鸡', '麻辣烫', '饺子', '蛋炒饭', '寿司', '汉堡', '火锅', '螺蛳粉'];
  const STORE_KEY = 'jintian-chisha-v1';
  const MAX_OPTIONS = 40;
  const QUIPS = [
    '就它了，别再纠结！',
    '听本鱼的，开饭～',
    '今天命中注定吃这个',
    '嗯……就这个吧，本鱼都看饿了',
    '决定好了，不许反悔哦',
    '好，本鱼先替你去闻闻香味'
  ];
  const ROUNDS = 6;          // 至少转几整圈
  const DURATION = 4200;     // 旋转毫秒数（和 CSS 保持一致）

  const el = {
    wrap: document.getElementById('wheelWrap'),
    canvas: document.getElementById('wheel'),
    go: document.getElementById('go'),
    result: document.getElementById('result'),
    rEmoji: document.getElementById('resultEmoji'),
    rName: document.getElementById('resultName'),
    rQuip: document.getElementById('resultQuip'),
    editor: document.getElementById('editor'),
    avoid: document.getElementById('avoid'),
    reset: document.getElementById('reset'),
    history: document.getElementById('history'),
    toast: document.getElementById('toast')
  };

  let state = { options: DEFAULT_OPTIONS.slice(), avoid: false, history: [] };
  let picked = [];          // 本轮「不重复」模式下已抽中的名字
  let rotation = 0;         // 累计旋转角度（deg），只增不减
  let spinning = false;
  let editorTimer = null;
  let spinTimer = null;
  let toastTimer = null;
  let resizeTimer = null;

  /* ---------------- 存储 ---------------- */

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (Array.isArray(s.options)) {
        const list = s.options.map(String).map(t => t.trim()).filter(Boolean);
        if (list.length) state.options = list;
      }
      state.avoid = !!s.avoid;
      if (Array.isArray(s.history)) state.history = s.history.map(String).slice(0, 6);
    } catch (e) { /* 存储坏了就从默认开始，不影响用 */ }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 隐私模式下忽略 */ }
  }

  /* ---------------- 画转盘 ---------------- */

  function drawWheel() {
    const canvas = el.canvas;
    const size = Math.max(180, Math.round(el.wrap.clientWidth || 320));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 6;
    const n = state.options.length;

    // 底盘
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#f3e6d3';
    ctx.fill();

    if (n === 0) {
      ctx.fillStyle = '#a2896d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.max(12, size * 0.05)}px "PingFang SC","Microsoft YaHei",sans-serif`;
      ctx.fillText('右边先写点吃的', cx, cy - size * 0.16);
      return;
    }

    const step = (Math.PI * 2) / n;
    const fontSize = Math.max(10, Math.min(17, size * 0.044));

    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * step;
      const a1 = a0 + step;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = `hsl(${(i * 360) / n + 18}, 70%, ${i % 2 ? 66 : 59}%)`;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,.65)';
      ctx.stroke();

      const label = state.options[i];
      const mid = a0 + step / 2;
      // 左半边的字翻转 180°，保证永远是从外往内正向可读
      const flip = Math.cos(mid) < 0;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(flip ? mid + Math.PI : mid);
      ctx.textAlign = flip ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(58,34,15,.9)';
      ctx.font = `700 ${fontSize.toFixed(1)}px "PingFang SC","Microsoft YaHei",sans-serif`;
      const tx = (r - size * 0.05) * (flip ? -1 : 1);
      ctx.fillText(label, tx, 0, r * 0.58);
      ctx.restore();
    }

    // 外圈
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fffdf8';
    ctx.stroke();
  }

  /* ---------------- 抽签 ---------------- */

  function pickIndex() {
    const pool = [];
    for (let i = 0; i < state.options.length; i++) {
      if (!state.avoid || !picked.includes(state.options[i])) pool.push(i);
    }
    if (!pool.length) return -1;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function spin() {
    if (spinning) return;
    const n = state.options.length;
    if (n < 2) { toast('至少写 2 个选项才有得抽哦～'); return; }

    let idx = pickIndex();
    if (idx === -1) {
      picked = [];
      idx = pickIndex();
      toast('这一轮都抽完啦，重新开始～');
    }

    spinning = true;
    el.go.disabled = true;

    // 让第 idx 个扇区的中心转到正上方（指针处）
    const step = 360 / n;
    const targetMod = -(idx * step + step / 2);
    let diff = (targetMod - rotation) % 360;
    if (diff < 0) diff += 360;
    rotation += 360 * ROUNDS + diff;

    el.canvas.style.transition = `transform ${DURATION}ms cubic-bezier(.15,.72,.12,1)`;
    // 强制重排，保证从当前角度开始过渡
    void el.canvas.offsetWidth;
    el.canvas.style.transform = `rotate(${rotation}deg)`;

    spinTimer = setTimeout(() => finishSpin(idx), DURATION + 120);
  }

  function finishSpin(idx) {
    if (!spinning) return;
    clearTimeout(spinTimer);
    spinTimer = null;
    spinning = false;
    el.go.disabled = false;
    el.canvas.style.transition = '';

    const name = state.options[idx];
    showResult(name);

    if (state.avoid && !picked.includes(name)) picked.push(name);

    state.history.unshift(name);
    state.history = state.history.slice(0, 6);
    save();
    renderHistory();
  }

  function showResult(name) {
    el.rEmoji.textContent = emojiFor(name);
    el.rName.textContent = name;
    el.rQuip.textContent = QUIPS[Math.floor(Math.random() * QUIPS.length)];
    el.result.classList.remove('pop');
    void el.result.offsetWidth;   // 重启动画
    el.result.classList.add('pop');
  }

  function emojiFor(name) {
    const rules = [
      [/饭|米|粥|寿司/, '🍚'],
      [/面|拉面|粉|螺蛳|米线/, '🍜'],
      [/饺|包子|馄饨|煎饼/, '🥟'],
      [/火锅|麻辣烫|冒菜|锅/, '🍲'],
      [/烧烤|烤串|串/, '🍢'],
      [/汉堡|薯条|快餐/, '🍔'],
      [/披萨|匹萨/, '🍕'],
      [/炸鸡|鸡/, '🍗'],
      [/沙拉|青菜|素/, '🥗'],
      [/奶茶|咖啡|饮料|豆浆/, '🥤'],
      [/蛋糕|甜|冰淇淋|雪糕/, '🍰']
    ];
    for (let i = 0; i < rules.length; i++) {
      if (rules[i][0].test(name)) return rules[i][1];
    }
    return '🍽️';
  }

  /* ---------------- 菜单编辑 ---------------- */

  function applyEditor() {
    const lines = el.editor.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const next = [];
    for (let i = 0; i < lines.length && next.length < MAX_OPTIONS; i++) {
      if (!next.includes(lines[i])) next.push(lines[i]);
    }
    state.options = next;
    picked = picked.filter(name => next.includes(name));
    save();
    drawWheel();
  }

  function renderHistory() {
    el.history.textContent = state.history.length ? state.history.join(' · ') : '—';
  }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2000);
  }

  /* ---------------- 事件 ---------------- */

  el.go.addEventListener('click', spin);

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable);
    if (!typing && (e.code === 'Space' || e.key === 'Enter')) {
      e.preventDefault();
      spin();
    }
  });

  el.editor.addEventListener('input', () => {
    clearTimeout(editorTimer);
    editorTimer = setTimeout(applyEditor, 350);
  });
  el.editor.addEventListener('blur', () => {
    clearTimeout(editorTimer);
    applyEditor();
  });

  el.avoid.addEventListener('change', () => {
    state.avoid = el.avoid.checked;
    picked = [];
    save();
    toast(state.avoid ? '抽过的不会再抽到啦' : '恢复普通模式');
  });

  el.reset.addEventListener('click', () => {
    state.options = DEFAULT_OPTIONS.slice();
    state.history = [];
    picked = [];
    el.editor.value = state.options.join('\n');
    save();
    renderHistory();
    drawWheel();
    toast('已恢复默认菜单～');
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawWheel, 160);
  });

  /* ---------------- 启动 ---------------- */

  load();
  el.editor.value = state.options.join('\n');
  el.avoid.checked = state.avoid;
  renderHistory();
  drawWheel();
  requestAnimationFrame(drawWheel);   // 等布局稳定再画一次，避免首屏尺寸为 0
})();
