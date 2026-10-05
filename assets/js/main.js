/* ==========================================================================
   马上同心 · 文化信使 — 交互脚本
   原生 JS，无依赖
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- 0. 音效
     六骏各有一段专属音效，其余交互统一用「点击音效」。
     · 默认开启，页脚有开关，选择记在 localStorage。
     · 音频一律在用户交互之后才播，天然规避浏览器自动播放拦截。
     · 尊重 prefers-reduced-motion：系统要求减少动效时默认静音。 */
  var SFX = (function () {
    var KEY = 'mstx-sound';
    var enabled = !reduce;
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === 'off') enabled = false;
      else if (saved === 'on') enabled = true;
    } catch (e) {}
    var BASE = 'assets/audio/';
    var pool = {};
    var lastClick = 0;

    function get(name) {
      if (!pool[name]) {
        var a = new Audio(BASE + name + '.mp3');
        a.preload = 'auto';
        a.volume = (name === 'click') ? 0.45 : 0.85;
        pool[name] = a;
      }
      return pool[name];
    }

    return {
      play: function (name) {
        if (!enabled || !name) return;
        var now = Date.now();
        if (name === 'click') {
          if (now - lastClick < 110) return;   /* 连点去抖 */
          lastClick = now;
        }
        try {
          var a = get(name);
          a.currentTime = 0;
          var p = a.play();
          if (p && p.catch) p.catch(function () {});
        } catch (e) {}
      },
      isOn: function () { return enabled; },
      toggle: function () {
        enabled = !enabled;
        try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) {}
        if (enabled) this.play('click');
        return enabled;
      }
    };
  })();

  /* 统一挂点击音：六骏卡片自己有专属音效，跳过以免叠音 */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('button, .btn, a[href^="#"]') : null;
    if (!el) return;
    if (el.closest('.horse')) return;
    SFX.play('click');
  }, true);

  /* ---------------------------------------------------------------- 1. 导航 */
  var nav = $('#nav');
  var navToggle = $('#navToggle');
  var navLinks = $('#navLinks');

  function closeNav() {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
  }
  navToggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  });
  navLinks.addEventListener('click', function (e) { if (e.target.tagName === 'A') closeNav(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });

  /* ------------------------------------------- 2. 滚动进度 / 吸顶 / 回顶 */
  var progress = $('#progress');
  var toTop = $('#toTop');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
    nav.classList.toggle('is-stuck', y > 12);
    toTop.classList.toggle('is-on', y > 700);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ------------------------------------------------------------ 3. 滚动监听 */
  var sections = $$('main section[id]');
  var linkMap = {};
  $$('#navLinks a').forEach(function (a) { linkMap[a.getAttribute('href').slice(1)] = a; });

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        if (!linkMap[id]) return; // sections without a nav link keep the previous highlight
        $$('#navLinks a').forEach(function (a) { a.classList.remove('is-active'); });
        linkMap[id].classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------------------ 4. 进场动画 */
  var revealables = $$('[data-reveal]');
  if (!reduce && 'IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    revealables.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
      ro.observe(el);
    });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------------- 5. Tabs */
  $$('[data-tabs]').forEach(function (tabs) {
    var btns = $$('.tabs__btn', tabs);
    var panels = $$('.tabs__panel', tabs);
    btns.forEach(function (btn, i) {
      btn.addEventListener('click', function () { select(i); });
      btn.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (n < 0) return;
        e.preventDefault();
        n = (n + btns.length) % btns.length;
        btns[n].focus(); select(n);
      });
    });
    function select(i) {
      btns.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); });
      panels.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
    }
  });

  /* ----------------------------------------------------------- 6. 六骏弹窗 */
  var HORSES = [
    { name: '特勒骠', side: '东侧第一骏', element: '光', spirit: '守望', praise: '应策腾空，承声半汉',
      color: '#b8860b', pos: '东侧第一骏', coat: '黄白相间，属西域大宛汗血宝马',
      wound: '经典姿态：对侧步，从容沉稳（三日连经八仗仍步履从容）', art: 'telebiao' },
    { name: '青骓', side: '东侧第二骏', element: '电', spirit: '和睦', praise: '足轻电影，神发天机',
      color: '#6b4c9a', pos: '东侧第二骏', coat: '青白相间杂色',
      wound: '战伤记载：身中五箭', art: 'qingzhui' },
    { name: '什伐赤', side: '东侧第三骏', element: '火', spirit: '奋进', praise: '瀍涧未静，斧钺申威',
      color: '#b03a2e', pos: '东侧第三骏', coat: '通体赤红',
      wound: '战伤记载：臀部身中五箭', art: 'shifachi' },
    { name: '飒露紫', side: '西侧第一骏', element: '露', spirit: '同心', praise: '紫燕超跃，骨腾神骏',
      color: '#3f7d7a', pos: '西侧第一骏', coat: '紫燕骝，通体紫红',
      wound: '战伤记载：前胸正中一箭（丘行恭为其拔箭）', art: 'sa-luzi' },
    { name: '拳毛騧', side: '西侧第二骏', element: '月', spirit: '聚力', praise: '月精按辔，天驷横行',
      color: '#34497a', pos: '西侧第二骏', coat: '黄身黑喙，毛发天然卷曲',
      wound: '战伤记载：身中九箭', art: 'quanmaogua' },
    { name: '白蹄乌', side: '西侧第三骏', element: '云', spirit: '兴旺', praise: '倚天长剑，追风骏足',
      color: '#6b7f99', pos: '西侧第三骏', coat: '通体墨黑，四蹄雪白',
      wound: '经典姿态：四蹄腾空、昂首奔袭，鬃毛迎风飞扬', art: 'baitiwu' }
  ];

  var horseModal = $('#horseModal');
  var hmCurrent = 0;
  var lastFocus = null;

  function fillHorse(i) {
    var h = HORSES[i];
    if (!h) return;
    hmCurrent = i;
    SFX.play(h.art);   /* 每一骏一段专属音效 */
    $('#hmHero').style.background = 'linear-gradient(135deg,' + h.color + ',' + shade(h.color, -22) + ')';
    $('#hmSide').textContent = h.side;
    $('#hmName').textContent = h.name;
    $('#hmPraise').textContent = '「' + h.praise + '」';
    $('#hmPos').textContent = h.pos;
    $('#hmColor').textContent = h.coat;
    $('#hmWound').textContent = h.wound;
    $('#hmElem').textContent = h.element;
    $('#hmSpirit').textContent = h.spirit;
    var art = $('#hmArt');
    art.src = 'assets/img/horses/' + h.art + '.webp';
    art.alt = h.name; // 装饰性配图，名称已在正文中给出
    var tpl = $('#horseTemplates [data-tpl="' + i + '"]');
    $('#hmExtra').innerHTML = tpl ? tpl.innerHTML : '';
    $$('.horse').forEach(function (b) {
      b.style.borderColor = b.dataset.horse === String(i) ? h.color : '';
    });
  }
  function shade(hex, pct) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + pct));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + pct));
    var b = Math.max(0, Math.min(255, (n & 255) + pct));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function openHorse(i) {
    lastFocus = document.activeElement;
    fillHorse(i);
    openModal(horseModal);
  }

  $$('.horse').forEach(function (btn) {
    btn.addEventListener('click', function () { openHorse(Number(btn.dataset.horse)); });
  });
  $$('[data-horse-prev]').forEach(function (b) {
    b.addEventListener('click', function () { fillHorse((hmCurrent + HORSES.length - 1) % HORSES.length); });
  });
  $$('[data-horse-next]').forEach(function (b) {
    b.addEventListener('click', function () { fillHorse((hmCurrent + 1) % HORSES.length); });
  });

  /* --------------------------------------------------------- 7. 成员海报弹窗 */
  var MEMBERS = [
    { slug: 'ma-xueyi',    name: '马雪宜', group: '线下组 · 实地调研与宣讲' },
    { slug: 'luo-yixin',   name: '罗怡欣', group: '线下组 · 实地调研与宣讲' },
    { slug: 'tian-lihan',  name: '田丽涵', group: '线下组 · 实地调研与宣讲' },
    { slug: 'li-shichao',  name: '李世超', group: '线下组 · 实地调研与宣讲' },
    { slug: 'xu-mengyuan', name: '徐梦媛', group: '线上组 · 内容运营与传播' },
    { slug: 'li-muzi',     name: '李木子', group: '线上组 · 内容运营与传播' },
    { slug: 'zou-yaning',  name: '邹亚宁', group: '线上组 · 内容运营与传播' },
    { slug: 'zhang-nan',   name: '张楠',   group: '线上组 · 内容运营与传播' },
    { slug: 'zeng-lilin',  name: '曾丽霖', group: '线上组 · 内容运营与传播' }
  ];

  var memberModal = $('#memberModal');
  var mmIndex = 0;

  function fillMember(i) {
    mmIndex = ((i % MEMBERS.length) + MEMBERS.length) % MEMBERS.length;
    var m = MEMBERS[mmIndex];
    var img = $('#mmPoster');
    img.src = 'assets/img/members/' + m.slug + '.webp';
    img.alt = m.name + '的个人介绍海报';
    $('#mmName').textContent = m.name;
    $('#mmGroup').textContent = m.group;
    $('#mmIndex').textContent = (mmIndex + 1) + ' / ' + MEMBERS.length;
    $$('.member').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.member === m.slug);
    });
  }
  function openMember(slug) {
    var i = MEMBERS.findIndex(function (m) { return m.slug === slug; });
    if (i < 0) return;
    lastFocus = document.activeElement;
    fillMember(i);
    openModal(memberModal);
  }

  $$('.member').forEach(function (b) {
    b.addEventListener('click', function () { openMember(b.dataset.member); });
  });
  $$('[data-member-prev]').forEach(function (b) {
    b.addEventListener('click', function () { fillMember(mmIndex - 1); });
  });
  $$('[data-member-next]').forEach(function (b) {
    b.addEventListener('click', function () { fillMember(mmIndex + 1); });
  });
  document.addEventListener('keydown', function (e) {
    if (!memberModal.classList.contains('is-open')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); fillMember(mmIndex + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); fillMember(mmIndex - 1); }
  });
  // 预取海报：首次悬停/聚焦成员卡片时按需加载，避免一进页面就下 2.4MB
  function prefetch(slug) {
    if (!slug || prefetch.done[slug]) return;
    prefetch.done[slug] = 1;
    var im = new Image();
    im.src = 'assets/img/members/' + slug + '.webp';
  }
  prefetch.done = {};
  $$('.member').forEach(function (b) {
    b.addEventListener('mouseenter', function () { prefetch(b.dataset.member); });
    b.addEventListener('focus', function () { prefetch(b.dataset.member); });
    b.addEventListener('touchstart', function () { prefetch(b.dataset.member); }, { passive: true });
  });

  /* ------------------------------------------------------- 8. 弹窗通用逻辑 */
  var openStack = [];

  function openModal(el) {
    el.classList.add('is-open');
    var box = el.querySelector('.modal__box');
    if (box) box.scrollTop = 0; // 重新打开时回到顶部，避免残留上次的滚动位置
    document.body.classList.add('is-locked');
    openStack.push(el);
    var focusable = el.querySelector('[data-close], button, a[href], video');
    if (focusable) focusable.focus({ preventScroll: true });
  }
  function closeModal(el) {
    el.classList.remove('is-open');
    if (el.id === 'videoModal') { var v = $('#videoPlayer'); v.pause(); v.removeAttribute('src'); v.load(); }
    openStack = openStack.filter(function (m) { return m !== el; });
    if (!openStack.length) document.body.classList.remove('is-locked');
    if (lastFocus) { lastFocus.focus({ preventScroll: true }); lastFocus = null; }
  }
  $$('[data-close]').forEach(function (b) {
    b.addEventListener('click', function () { closeModal(b.closest('.modal, .lightbox')); });
  });
  $$('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(m); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !openStack.length) return;
    closeModal(openStack[openStack.length - 1]);
  });
  // 六骏弹窗：左右方向键切换（弹窗打开时全局生效）
  document.addEventListener('keydown', function (e) {
    if (!horseModal.classList.contains('is-open')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); fillHorse((hmCurrent + 1) % HORSES.length); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); fillHorse((hmCurrent + HORSES.length - 1) % HORSES.length); }
  });

  /* -------------------------------------------------------------- 9. 灯箱 */
  var lightbox = $('#lightbox');
  var lbImg = $('#lbImg'), lbCap = $('#lbCap');
  var shots = $$('[data-full]');
  var lbIndex = 0;

  function showLb(i) {
    if (!shots.length) return;
    lbIndex = (i + shots.length) % shots.length;
    var el = shots[lbIndex];
    lbImg.src = el.dataset.full;
    lbImg.alt = el.dataset.cap || '';
    lbCap.textContent = el.dataset.cap || '';
  }
  shots.forEach(function (el, i) {
    el.addEventListener('click', function () { lastFocus = el; showLb(i); openModal(lightbox); });
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lastFocus = el; showLb(i); openModal(lightbox); }
    });
  });
  var lbPrev = $('[data-lb-prev]'), lbNext = $('[data-lb-next]');
  if (lbPrev) lbPrev.addEventListener('click', function (e) { e.stopPropagation(); showLb(lbIndex - 1); });
  if (lbNext) lbNext.addEventListener('click', function (e) { e.stopPropagation(); showLb(lbIndex + 1); });
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeModal(lightbox); });
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    if (e.key === 'ArrowRight') showLb(lbIndex + 1);
  });

  /* -------------------------------------------------------------- 10. 视频 */
  var videoModal = $('#videoModal');
  var player = $('#videoPlayer');

  $$('[data-video]').forEach(function (card) {
    function play() {
      lastFocus = card;
      player.src = card.dataset.video;
      player.setAttribute('aria-label', card.dataset.title || '视频');
      openModal(videoModal);
      var p = player.play();
      if (p && p.catch) p.catch(function () { /* 自动播放被拦截时由用户手动点击播放 */ });
    }
    card.addEventListener('click', play);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
    });
  });

  /* --------------------------------------------------- 11. 锚点平滑滚动 */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - (nav.offsetHeight + 12);
      window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* --------------------------------------------- 12. 图片加载失败兜底 */
  $$('img').forEach(function (img) {
    img.addEventListener('error', function () {
      if (img.dataset.failed) return;
      img.dataset.failed = '1';
      img.style.background = 'linear-gradient(135deg,#efe7da,#ddd2c0)';
      img.style.minHeight = '80px';
    });
  });

  /* ------------------------------------------------- 13. 页脚音效开关 */
  var sfxBtn = $('#sfxToggle');
  if (sfxBtn) {
    var sfxTxt = $('.sfx-toggle__txt', sfxBtn);
    var paintSfx = function () {
      var on = SFX.isOn();
      sfxBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (sfxTxt) sfxTxt.textContent = on ? '音效已开启' : '音效已关闭';
    };
    sfxBtn.addEventListener('click', function () { SFX.toggle(); paintSfx(); });
    paintSfx();
  }

  /* ------------------------------------------------- 14. 背景音乐
     目标：打开网页即播，按钮负责「暂停 / 继续」。
     浏览器的自动播放策略会拦截带声音的自动播放，硬来只会得到一个静音播放器，
     所以这里用「两手准备」：
       ① 载入时先直接 play() 一次（对已与本域产生过互动的访客、以及部分浏览器会成功）；
       ② 被拦截时，挂上首次交互监听（点击 / 按键 / 触摸 / 滚轮 / 滚动），
          用户一动就把音乐接上 —— 实际效果等同于「打开就放」。
     一旦音乐真正响起，就解绑这些监听：这样用户之后主动按暂停，
     不会因为再滚一下页面又被强行续播。 */
  var bgmBtn = $('#bgmToggle');
  if (bgmBtn) {
    var bgm = new Audio('assets/audio/bgm.m4a');
    bgm.loop = true;
    bgm.volume = 0;
    bgm.preload = 'auto';
    var BGM_VOL = 0.32, bgmTimer = null, bgmOn = false, bgmArmed = true;

    function bgmFadeTo(to) {
      if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
      if (to === 0 && bgm.volume === 0) { bgm.pause(); return; }
      bgmTimer = setInterval(function () {
        var d = to - bgm.volume;
        if (Math.abs(d) < 0.02) {
          bgm.volume = to;
          clearInterval(bgmTimer); bgmTimer = null;
          if (to === 0) bgm.pause();
          return;
        }
        bgm.volume = Math.max(0, Math.min(1, bgm.volume + d * 0.16));
      }, 40);
    }

    function paintBgm() {
      bgmBtn.classList.toggle('is-playing', bgmOn);
      bgmBtn.setAttribute('aria-pressed', bgmOn ? 'true' : 'false');
      bgmBtn.setAttribute('aria-label', (bgmOn ? '暂停' : '播放') + '背景音乐《古道尘远》');
      var t = $('.bgm__txt', bgmBtn);
      if (t) t.textContent = bgmOn ? '暂停音乐' : '背景音乐';
    }

    var BGM_AUTO_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'];

    function bgmAutoKick(e) {
      /* 点在音乐按钮上时交给按钮自己处理，避免「一按就播、紧接着又被判成暂停」 */
      if (e && e.target && e.target.closest && e.target.closest('#bgmToggle')) return;
      if (bgmArmed && !bgmOn) bgmStart();
    }
    function bgmUnbindAuto() {
      BGM_AUTO_EVENTS.forEach(function (ev) {
        window.removeEventListener(ev, bgmAutoKick);
        window.removeEventListener(ev, bgmAutoKick, true);
      });
    }
    function bgmBindAuto() {
      BGM_AUTO_EVENTS.forEach(function (ev) {
        window.addEventListener(ev, bgmAutoKick, { passive: true });
      });
    }

    function bgmStart() {
      bgmOn = true; paintBgm();
      var p = bgm.play();
      if (p && p.then) {
        p.then(function () {
          bgmArmed = false; bgmUnbindAuto(); bgmFadeTo(BGM_VOL);
        }).catch(function () {
          /* 仍被拦截：退回「未播放」，等下一次交互再试 */
          bgmOn = false; paintBgm();
        });
      } else {
        bgmArmed = false; bgmUnbindAuto(); bgmFadeTo(BGM_VOL);
      }
    }

    function bgmStop() {
      bgmOn = false; paintBgm();
      bgmFadeTo(0);
    }

    bgmBtn.addEventListener('click', function () {
      if (bgmOn) bgmStop(); else bgmStart();
    });

    /* ① 先直接试一次；② 无论成败都挂上首次交互监听（成功时会在回调里解绑） */
    bgmBindAuto();
    bgmStart();
    paintBgm();

    /* 页面里任何视频开始播放时让位，暂停或播完再淡回来 */
    function bgmYield() { if (bgmOn && !bgm.paused) bgm.pause(); }
    function bgmResume() { if (bgmOn && bgm.paused) { var p = bgm.play(); if (p && p.catch) p.catch(function () {}); } }
    $$('video').forEach(function (v) {
      v.addEventListener('play', bgmYield);
      v.addEventListener('pause', function () { if (!v.ended) bgmResume(); });
      v.addEventListener('ended', bgmResume);
    });
    /* 视频弹窗里的播放器是动态换 src 的，单独再挂一次 */
    var vp = $('#videoPlayer');
    if (vp) {
      vp.addEventListener('play', bgmYield);
      vp.addEventListener('pause', bgmResume);
    }
  }

})();
