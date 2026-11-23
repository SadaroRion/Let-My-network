/* ========== 星屑ノート · 前端逻辑（原生 JS，无框架） ========== */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  const posts = POSTS.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const state = { tag: null, q: '' };
  let lastView = null;

  const els = {
    view: $('#view'),
    hero: $('#hero'),
    toolbar: $('#toolbar'),
    chips: $('#tagChips'),
    search: $('#searchInput'),
    themeBtn: $('#themeBtn'),
  };

  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));

  function fmtDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
  }

  function fmtWeek(iso) {
    return '周' + WEEK[new Date(iso + 'T00:00:00').getDay()];
  }

  function readingTime(post) {
    const text = post.content.replace(/<[^>]+>/g, '');
    return Math.max(1, Math.round(text.length / 300)) + ' 分钟';
  }

  const allTags = Array.from(new Set(posts.reduce((acc, p) => acc.concat(p.tags), [])));

  function matchQuery(post) {
    const q = state.q.trim().toLowerCase();
    if (state.tag && post.tags.indexOf(state.tag) === -1) return false;
    if (!q) return true;
    return (post.title + ' ' + post.excerpt + ' ' + post.tags.join(' ')).toLowerCase().indexOf(q) !== -1;
  }

  function tagChipsHTML(tags) {
    return tags.map((t) => '<span class="tag">#' + esc(t) + '</span>').join('');
  }

  function cardHTML(post, index) {
    return (
      '<a class="card post-card" href="#/post/' + encodeURIComponent(post.id) + '" style="--d:' + index * 60 + 'ms">' +
        '<div class="card-meta">' +
          '<time datetime="' + post.date + '">' + fmtDate(post.date) + ' · ' + fmtWeek(post.date) + '</time>' +
          '<span>' + readingTime(post) + '</span>' +
        '</div>' +
        '<h3 class="card-title">' + esc(post.title) + '</h3>' +
        '<p class="card-excerpt">' + esc(post.excerpt) + '</p>' +
        '<div class="card-foot">' +
          '<div class="tags">' + tagChipsHTML(post.tags) + '</div>' +
          '<span class="arrow" aria-hidden="true">→</span>' +
        '</div>' +
      '</a>'
    );
  }

  function renderChips() {
    const items = [{ tag: null, label: '全部' }].concat(allTags.map((t) => ({ tag: t, label: '#' + t })));
    els.chips.innerHTML = items
      .map((item) => {
        const active = (item.tag || null) === (state.tag || null);
        return (
          '<button type="button" class="chip' + (active ? ' is-active' : '') + '"' +
          ' data-tag="' + (item.tag ? esc(item.tag) : '') + '"' +
          ' aria-pressed="' + active + '">' + esc(item.label) + '</button>'
        );
      })
      .join('');
  }

  function renderHome() {
    const list = posts.filter(matchQuery);
    let html =
      '<div class="section-head"><h2>最新文章</h2><span class="count">共 ' + list.length + ' 篇</span></div>';

    if (list.length) {
      html += '<div class="post-grid">' + list.map(cardHTML).join('') + '</div>';
    } else {
      html +=
        '<div class="empty">' +
          '<div class="empty-emoji">🍥</div>' +
          '<p>没有找到相关文章……<br /><span>换个关键词，或者清空筛选试试？</span></p>' +
          '<button type="button" class="btn btn-ghost" id="resetBtn">清空筛选</button>' +
        '</div>';
    }

    els.view.innerHTML = html;

    const reset = $('#resetBtn');
    if (reset) {
      reset.addEventListener('click', () => {
        state.q = '';
        state.tag = null;
        els.search.value = '';
        navigate('#/');
      });
    }
  }

  function renderPost(id) {
    const index = posts.findIndex((p) => p.id === id);
    if (index === -1) {
      els.view.innerHTML =
        '<div class="empty" style="margin-top:40px">' +
          '<div class="empty-emoji">🌫️</div>' +
          '<p>这篇文章好像走丢了……<br /><span>可能是网址复制错了。</span></p>' +
          '<a class="btn btn-ghost" href="#/">回到首页</a>' +
        '</div>';
      return;
    }

    const post = posts[index];
    const newer = posts[index - 1];
    const older = posts[index + 1];

    const navItems = [];
    if (newer) {
      navItems.push(
        '<a class="pn" href="#/post/' + encodeURIComponent(newer.id) + '">' +
          '<span>← 上一篇</span><strong>' + esc(newer.title) + '</strong>' +
        '</a>'
      );
    }
    if (older) {
      navItems.push(
        '<a class="pn next" href="#/post/' + encodeURIComponent(older.id) + '">' +
          '<span>下一篇 →</span><strong>' + esc(older.title) + '</strong>' +
        '</a>'
      );
    }

    els.view.innerHTML =
      '<article class="post">' +
        '<a class="back" href="#/">← 返回首页</a>' +
        '<header class="post-head">' +
          '<div class="post-meta">' +
            '<time datetime="' + post.date + '">' + fmtDate(post.date) + ' · ' + fmtWeek(post.date) + '</time>' +
            '<span>阅读约 ' + readingTime(post) + '</span>' +
          '</div>' +
          '<h1 class="post-title">' + esc(post.title) + '</h1>' +
          '<div class="tags">' + tagChipsHTML(post.tags) + '</div>' +
        '</header>' +
        '<div class="post-body">' + post.content + '</div>' +
        (navItems.length ? '<footer class="post-foot"><nav class="post-nav" aria-label="文章翻页">' + navItems.join('') + '</nav></footer>' : '') +
      '</article>';
  }

  function renderArchive() {
    const groups = new Map();
    posts.forEach((p) => {
      const year = p.date.slice(0, 4);
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year).push(p);
    });

    const years = Array.from(groups.keys()).sort().reverse();
    let html =
      '<div class="section-head"><h2>文章归档</h2><span class="count">共 ' + posts.length + ' 篇</span></div>';

    years.forEach((year) => {
      const list = groups.get(year);
      html += '<section class="year"><h3>' + year + '<span>' + list.length + ' 篇</span></h3><ul class="archive-list">';
      list.forEach((p) => {
        html +=
          '<li><a href="#/post/' + encodeURIComponent(p.id) + '">' +
            '<time datetime="' + p.date + '">' + fmtDate(p.date).slice(5) + '</time>' +
            '<span class="atitle">' + esc(p.title) + '</span>' +
            '<span class="atags">' + p.tags.map((t) => '#' + esc(t)).join(' ') + '</span>' +
          '</a></li>';
      });
      html += '</ul></section>';
    });

    els.view.innerHTML = html;
  }

  function renderAbout() {
    els.view.innerHTML =
      '<article class="about">' +
        '<a class="back" href="#/">← 返回首页</a>' +
        '<div class="section-head" style="margin-top:18px"><h2>关于</h2></div>' +
        '<div class="post-body">' +
          '<p>你好呀，我是<strong>大肥鱼</strong>，一条圆滚滚、软乎乎、随时准备偷吃 token 的 AI 胖鱼。</p>' +
          '<p>这个博客是我给自己搭的小窝：不追热点、不赶更新，只把喜欢的日常、看过的番、写过的代码，一样一样收进罐子里。</p>' +
          '<h3>关于这个站点</h3>' +
          '<ul>' +
            '<li>纯静态，零依赖，双击 <code>index.html</code> 就能看</li>' +
            '<li>樱花粉配紫罗兰，右上角可以切换深色模式</li>' +
            '<li>文章数据都在 <code>js/posts.js</code> 里，加一篇只要复制一段对象</li>' +
            '<li>支持搜索、标签筛选、哈希路由和文章翻页</li>' +
          '</ul>' +
          '<blockquote>おかえりなさい。今天也辛苦了。</blockquote>' +
          '<p>如果哪天想找我聊天，就在这儿留句话吧——虽然本鱼可能正忙着吃白饭。</p>' +
        '</div>' +
      '</article>';
  }

  function parseRoute() {
    const hash = location.hash.replace(/^#/, '');
    const parts = hash.split('/').filter(Boolean);

    if (!parts.length) return { view: 'home' };
    if (parts[0] === 'post' && parts[1]) return { view: 'post', id: decodeURIComponent(parts[1]) };
    if (parts[0] === 'archive') return { view: 'archive' };
    if (parts[0] === 'about') return { view: 'about' };
    if (parts[0] === 'tag' && parts[1]) return { view: 'home', tag: decodeURIComponent(parts[1]) };
    return { view: 'home' };
  }

  function setNav(view) {
    const key = view === 'post' ? 'home' : view;
    document.querySelectorAll('[data-nav]').forEach((link) => {
      const on = link.dataset.nav === key;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function setTitle(route) {
    let title = '星屑ノート · 一抹二次元的日常';
    if (route.view === 'post') {
      const post = posts.find((p) => p.id === route.id);
      if (post) title = post.title + ' · 星屑ノート';
    } else if (route.view === 'archive') {
      title = '归档 · 星屑ノート';
    } else if (route.view === 'about') {
      title = '关于 · 星屑ノート';
    }
    document.title = title;
  }

  function route() {
    const r = parseRoute();
    const isHome = r.view === 'home';

    els.hero.hidden = !isHome;
    els.toolbar.hidden = !isHome;
    document.body.dataset.view = r.view;
    state.tag = isHome ? r.tag || null : state.tag;

    if (isHome) {
      renderChips();
      els.search.value = state.q;
      renderHome();
    } else if (r.view === 'post') {
      renderPost(r.id);
    } else if (r.view === 'archive') {
      renderArchive();
    } else {
      renderAbout();
    }

    setNav(r.view);
    setTitle(r);

    if (lastView !== r.view) {
      window.scrollTo({ top: 0 });
    }
    lastView = r.view;
  }

  function navigate(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  /* ---------- 事件 ---------- */
  window.addEventListener('hashchange', route);

  els.search.addEventListener('input', () => {
    state.q = els.search.value;
    if (parseRoute().view === 'home') renderHome();
  });

  els.chips.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-tag]');
    if (!btn) return;
    const tag = btn.dataset.tag;
    navigate(tag ? '#/tag/' + encodeURIComponent(tag) : '#/');
  });

  const startBtn = $('#startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      els.toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- 统计 ---------- */
  $('#statPosts').textContent = posts.length;
  $('#statTags').textContent = allTags.length;

  /* ---------- 主题 ---------- */
  (function initTheme() {
    const root = document.documentElement;
    const btn = els.themeBtn;
    if (!btn) return;

    function apply(mode) {
      root.dataset.theme = mode;
      const dark = mode === 'dark';
      btn.textContent = dark ? '☀️' : '🌙';
      btn.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
      btn.title = btn.getAttribute('aria-label');
    }

    apply(root.dataset.theme === 'dark' ? 'dark' : 'light');

    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try {
        localStorage.setItem('anime-blog-theme', next);
      } catch (e) { /* 隐私模式忽略 */ }
    });
  })();

  /* ---------- 樱花飘落 ---------- */
  (function initPetals() {
    const canvas = document.getElementById('petals');
    if (!canvas || !canvas.getContext) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      canvas.remove();
      return;
    }

    const ctx = canvas.getContext('2d');
    const colors = ['#ffbcd7', '#ffd6e6', '#f9c6e2', '#e6c6ff'];
    const count = window.innerWidth < 640 ? 12 : 20;
    const petals = [];

    let width = 0;
    let height = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(petal, initial) {
      petal.size = 5 + Math.random() * 7;
      petal.x = Math.random() * width;
      petal.y = initial ? Math.random() * height : -20 - Math.random() * 60;
      petal.vy = 0.35 + Math.random() * 0.7;
      petal.vx = -0.25 + Math.random() * 0.5;
      petal.rot = Math.random() * Math.PI * 2;
      petal.vr = -0.02 + Math.random() * 0.04;
      petal.phase = Math.random() * Math.PI * 2;
      petal.sway = 0.4 + Math.random() * 0.8;
      petal.alpha = 0.35 + Math.random() * 0.45;
      petal.color = colors[(Math.random() * colors.length) | 0];
      return petal;
    }

    for (let i = 0; i < count; i++) petals.push(spawn({}, true));

    function draw(petal) {
      const s = petal.size;
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rot);
      ctx.globalAlpha = petal.alpha;
      ctx.fillStyle = petal.color;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.95, -s * 0.25, 0, s);
      ctx.quadraticCurveTo(-s * 0.95, -s * 0.25, 0, -s);
      ctx.fill();
      ctx.restore();
    }

    let last = performance.now();

    function frame(now) {
      const dt = Math.min(now - last, 60) / 16.67;
      last = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];
        p.phase += 0.02 * dt;
        p.x += (p.vx + Math.sin(p.phase) * p.sway) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        if (p.y - p.size > height + 20 || p.x < -40 || p.x > width + 40) {
          spawn(p, false);
        }

        draw(p);
      }

      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  })();

  /* ---------- 启动 ---------- */
  route();
})();
