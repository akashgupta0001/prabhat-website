/* PRABHAT INDUSTRIES public website. All content comes from /api/public/data,
   which is filled in from the admin control panel. */
(function () {
  'use strict';
  var body = document.body, page = body.dataset.page || '';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var img = function (id) { return '/img/' + encodeURIComponent(id); };
  // Responsive HD photos: the browser picks the sharpest copy needed for the screen.
  var CARD = '(max-width: 560px) 100vw, (max-width: 900px) 50vw, 360px';
  var srcset = function (id) { var u = img(id); return u + '?w=480 480w, ' + u + '?w=960 960w, ' + u + '?w=1600 1600w, ' + u + ' 2560w'; };
  var pic = function (id, sizes) { return 'src="' + img(id) + '?w=960" srcset="' + srcset(id) + '" sizes="' + (sizes || CARD) + '" decoding="async"'; };

  var DEFAULTS = { settings: { company: 'PRABHAT INDUSTRIES', phone: '9818185161', whatsapp: '9818185161', location: 'Bahadurgarh, Haryana, India' }, home: null, cats: [], vars: [], feats: [], brands: [], menu: [], pages: [], products: [] };
  var D = DEFAULTS;
  var COMPANY = 'PRABHAT INDUSTRIES';

  function waNum() { var d = String(D.settings.whatsapp || D.settings.phone || '9818185161').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; }
  function wa(text) { return 'https://wa.me/' + waNum() + '?text=' + encodeURIComponent(text); }
  function general() { return wa('Hello ' + COMPANY + ', I would like to enquire about your footwear.'); }
  function productWa(p) { return wa('Hello ' + COMPANY + ', I would like to enquire about ' + p.name + ', model code ' + p.sku + (brandName(p.brand) ? ' (' + brandName(p.brand) + ')' : '') + '.'); }
  function brandName(id) { var b = D.brands.filter(function (x) { return x.id === id; })[0]; return b ? b.name : ''; }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function names(list, ids) { return (ids || []).map(function (i) { var o = byId(list, i); return o ? o.name : null; }).filter(Boolean); }
  function setMeta(title, desc) {
    if (title) document.title = title;
    if (desc) { var m = $('meta[name="description"]'); if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); } m.content = desc; }
  }
  function para(t) {
    return String(t || '').split(/\n{2,}/).map(function (b) {
      b = b.trim(); if (!b) return '';
      if (/^##\s+/.test(b)) return '<h2>' + esc(b.replace(/^##\s+/, '')) + '</h2>';
      return '<p>' + esc(b).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  var PHSVG = '<svg aria-hidden="true" viewBox="0 0 48 48"><rect x="5" y="9" width="38" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="17" cy="21" r="4" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M7 35l12-11 8 7 6-5 10 9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  var PH = '<div class="ph">' + PHSVG + '<span>Photo coming soon</span></div>';

  /* ---------- header + footer ---------- */
  function menuHref(m) {
    if (m.type === 'page') { var p = byId(D.pages, m.pageId); return p ? '/page?s=' + encodeURIComponent(p.slug) : null; }
    return m.url || '#';
  }
  function navHTML() {
    var items = D.menu.length ? D.menu : [{ label: 'Home', url: '/' }, { label: 'About', url: '/about' }, { label: 'Brands', url: '/brands' }, { label: 'Catalogue', url: '/catalogue' }, { label: 'Wholesale', url: '/wholesale' }, { label: 'Contact', url: '/contact' }];
    var here = location.pathname.replace(/\/$/, '') || '/';
    function link(m) {
      var h = menuHref(m); if (!h) return '';
      var ext = m.type === 'external', cur = !ext && h.split('?')[0].replace(/\.html$/, '').replace(/\/$/, '') === here.replace(/\.html$/, '') || (h === '/' && here === '/');
      return '<a href="' + esc(h) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + (cur ? ' aria-current="page" style="background:var(--alt)"' : '') + '>' + esc(m.label) + '</a>';
    }
    return items.filter(function (m) { return !m.parent; }).map(function (m) {
      var kids = items.filter(function (c) { return c.parent === m.id; });
      return kids.length ? '<span class="has-sub">' + link(m) + '<span class="sub">' + kids.map(link).join('') + '</span></span>' : link(m);
    }).join('');
  }
  function gbarHTML() {
    var cs = D.cats.filter(function (c) { return c.filterVisible !== false; });
    var cur = new URLSearchParams(location.search).get('cat') || '';
    var tabs = [['/catalogue', 'All', page === 'catalogue' && !cur]].concat(cs.map(function (c) { return ['/catalogue?cat=' + encodeURIComponent(c.slug || c.id), c.name, page === 'catalogue' && (cur === c.slug || cur === c.id)]; }));
    var VIS = 4; /* All + first 3 categories stay on the bar; the rest go into the "More" dropdown */
    function tabHTML(t) { return '<a class="tab" style="text-decoration:none" href="' + t[0] + '" aria-pressed="' + !!t[2] + '">' + esc(t[1]) + '</a>'; }
    return tabs.slice(0, VIS).map(tabHTML).join('');
  }
  function moreHTML() {
    var cs = D.cats.filter(function (c) { return c.filterVisible !== false; }).slice(3);
    if (!cs.length) return '';
    var cur = new URLSearchParams(location.search).get('cat') || '', on = cs.some(function (c) { return page === 'catalogue' && (cur === c.slug || cur === c.id); });
    return '<div class="moreWrap"><button class="tab" id="moreBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-pressed="' + on + '">More &#9662;</button>' +
      '<div class="moreMenu" id="moreMenu" hidden>' + cs.map(function (c) { return '<a href="/catalogue?cat=' + encodeURIComponent(c.slug || c.id) + '">' + esc(c.name) + '</a>'; }).join('') + '</div></div>';
  }
  function drawHeader() {
    var top = $('#site-top'); if (!top) return;
    var s = D.settings, phone = esc(s.phone || '');
    top.innerHTML =
      '<div class="announce"><div class="in"><span><b>Footwear for every step</b> &nbsp;Enquire on WhatsApp for models, sizes and colours</span>' + (phone ? '<span class="r">Phone / WhatsApp: <b>' + phone + '</b></span>' : '') + '</div></div>' +
      '<div class="wrap"><div class="top"><header class="head"><a class="brand" href="/" aria-label="' + esc(COMPANY) + ' home"><span class="mark">P</span><span><b>Prabhat Industries</b><small>SUPREMLITE · STON</small></span></a>' +
      '<nav class="nav" aria-label="Main">' + navHTML() + '</nav>' +
      '<div class="actions"><div class="ct"><button class="ctBtn" id="ctBtn" type="button" aria-label="Contact us" aria-expanded="false" aria-controls="ctMenu" title="Contact us"><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25c1.1.37 2.3.57 3.6.57a1 1 0 011 1V20a1 1 0 01-1 1C10.6 21 3 13.4 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.6a1 1 0 01-.25 1z"/></svg></button>' +
      '<div class="ctMenu" id="ctMenu" hidden><b class="ctT">Contact us</b>' + (phone ? '<a class="ctA call" href="tel:+91' + phone.replace(/\D/g, '').slice(-10) + '"><span class="ctI">&#9742;</span><span><b>Call us</b><small>' + phone + '</small></span></a>' : '') +
      '<a class="ctA wa" href="' + general() + '" target="_blank" rel="noopener"><span class="ctI">&#128172;</span><span><b>WhatsApp</b><small>Chat with us</small></span></a></div></div>' +
      '<div class="co"><button class="btn brand" id="coBtn" aria-expanded="false" aria-controls="coMenu" type="button">Company <svg class="chev" aria-hidden="true" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<nav class="menu" id="coMenu" aria-label="Company information" hidden>' +
      '<a href="/about">About us <span aria-hidden="true">→</span></a><a href="/mission-vision">Mission &amp; vision <span aria-hidden="true">→</span></a><a href="/values">Our values <span aria-hidden="true">→</span></a>' +
      '<a href="/supremlite">SUPREMLITE <span aria-hidden="true">→</span></a><a href="/ston">STON <span aria-hidden="true">→</span></a>' +
      '<a href="/wholesale">Wholesale &amp; business enquiries <span aria-hidden="true">→</span></a><a href="/contact">Contact us <span aria-hidden="true">→</span></a><a class="stafflogin" href="/staff/">Staff login <span aria-hidden="true">→</span></a>' +
      '<div class="facts"><span><b>Established</b> 2015</span>' + (s.location ? '<span><b>Location</b> ' + esc(s.location) + '</span>' : '') + (phone ? '<span><b>Phone / WhatsApp</b> ' + phone + '</span>' : '') + '</div></nav></div>' +
      '<button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span><span></span></button></div>' +
      '<nav class="mnav" id="mnav" aria-label="Mobile menu" hidden>' + navHTML() + '<b class="mh">Company</b><a href="/mission-vision">Mission &amp; vision</a><a href="/values">Our values</a><a href="/supremlite">SUPREMLITE</a><a href="/ston">STON</a><a href="/wholesale">Wholesale &amp; business enquiries</a><a href="/contact">Contact us</a><a href="/staff/">Staff login</a></nav></header>' +
      '<div class="gbar" role="navigation" aria-label="Shop by category"><span class="lbl">Shop by</span><button class="arrow" id="prev" type="button" aria-label="Scroll left">‹</button>' +
      '<div class="tabs" id="tabs">' + gbarHTML() + '</div>' + moreHTML() + '<button class="arrow" id="next" type="button" aria-label="Scroll right">›</button></div></div></div>';
    var tb = $('#tabs'); $('#prev').onclick = function () { tb.scrollBy({ left: -160, behavior: 'smooth' }); }; $('#next').onclick = function () { tb.scrollBy({ left: 160, behavior: 'smooth' }); };
    var mb = $('#moreBtn'), mm = $('#moreMenu');
    if (mb) {
      mb.onclick = function (e) { e.stopPropagation(); var o = mm.hidden; mm.hidden = !o; mb.setAttribute('aria-expanded', String(o)); if (o) { var r = mb.getBoundingClientRect(); mm.style.top = r.bottom + 'px'; mm.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 208)) + 'px'; } };
      document.addEventListener('click', function () { mm.hidden = true; mb.setAttribute('aria-expanded', 'false'); });
      window.addEventListener('scroll', function () { mm.hidden = true; }, { passive: true });
    }
    var bg = $('#burger'), mn = $('#mnav');
    bg.onclick = function (e) { e.stopPropagation(); var o = mn.hidden; mn.hidden = !o; bg.setAttribute('aria-expanded', String(o)); bg.classList.toggle('open', o); };
    document.addEventListener('click', function (e) { if (!mn.hidden && !e.target.closest('.mnav,.burger')) { mn.hidden = true; bg.setAttribute('aria-expanded', 'false'); bg.classList.remove('open'); } });
    var cb = $('#ctBtn'), cm = $('#ctMenu');
    cb.onclick = function (e) { e.stopPropagation(); var o = cm.hidden; cm.hidden = !o; cb.setAttribute('aria-expanded', String(o)); if (o) { var cmenu = $('#coMenu'); if (cmenu) { cmenu.hidden = true; } } };
    document.addEventListener('click', function (e) { if (!cm.hidden && !e.target.closest('.ct')) { cm.hidden = true; cb.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !cm.hidden) { cm.hidden = true; cb.focus(); } });
    var btn = $('#coBtn'), menu = $('#coMenu');
    function setMenu(o) { btn.setAttribute('aria-expanded', String(o)); menu.hidden = !o; if (o) cm.hidden = true; }
    btn.onclick = function (e) { e.stopPropagation(); setMenu(menu.hidden); };
    document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.co')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });
    var act = $('.tab[aria-pressed="true"]'); if (act && act.scrollIntoView) { try { tb.scrollLeft = Math.max(0, act.offsetLeft - 60); } catch (e) { /* ignore */ } }
  }
  function drawFooter() {
    var foot = $('#site-foot'); if (!foot) return;
    var s = D.settings, cats = D.cats.slice(0, 6);
    foot.className = 'foot';
    foot.innerHTML = '<div class="in"><div class="fgrid">' +
      '<div><div class="fb"><span class="mark">P</span><span class="fname"><b>Prabhat Industries</b><small>SUPREMLITE · STON</small></span></div><p>Footwear for every step. Footwear manufacturing and trading, established 2015.</p>' + (s.location ? '<p>' + esc(s.location) + '</p>' : '') + (s.phone ? '<p>Phone / WhatsApp: ' + esc(s.phone) + '</p>' : '') + (s.email ? '<p>' + esc(s.email) + '</p>' : '') + '</div>' +
      '<div><h4>Catalogue</h4><ul>' + D.cats.filter(function (c) { return c.filterVisible !== false; }).slice(0, 3).map(function (c) { return '<li><a href="/catalogue?cat=' + encodeURIComponent(c.slug || c.id) + '">' + esc(c.name) + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h4>Brands</h4><ul>' + D.brands.map(function (b) { return '<li><a href="/' + (b.slug === 'supremlite' || b.slug === 'ston' ? esc(b.slug) : 'catalogue?brand=' + encodeURIComponent(b.id)) + '">' + esc(b.name) + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h4>Company</h4><ul><li><a href="/about">About us</a></li><li><a href="/mission-vision">Mission &amp; vision</a></li><li><a href="/values">Our values</a></li><li><a href="/wholesale">Wholesale</a></li><li><a href="/contact">Contact</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li></ul></div>' +
      '</div><div class="fbar"><span>© ' + new Date().getFullYear() + ' ' + esc(COMPANY) + '. All rights reserved.</span><span>SUPREMLITE · STON</span></div></div>';
  }
  function fixLinks() {
    Array.prototype.forEach.call(document.querySelectorAll('a.wa'), function (a) { a.href = general(); a.target = '_blank'; a.rel = 'noopener'; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-phone]'), function (e) { e.textContent = D.settings.phone || ''; });
  }

  /* ---------- product cards ---------- */
  function catOf(p) { var c = byId(D.cats, (p.catIds || [])[0]); return c ? c.name : ''; }
  var rupee = function (x) { return '₹' + Number(x).toLocaleString('en-IN'); };
  /* MRP can differ by size: rows with their own MRP, falling back to the product's default MRP */
  function mrpRows(p) {
    var d = Number(p.mrp) || 0;
    return (p.sizePrices || []).map(function (r) { return { size: r.size, mrp: Number(r.mrp) || d }; }).filter(function (r) { return r.size; });
  }
  function mrpText(p) {
    var v = mrpRows(p).map(function (r) { return r.mrp; }).filter(function (x) { return x > 0; }), d = Number(p.mrp) || 0; if (d) v.push(d);
    if (!v.length) return '';
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    return lo === hi ? 'MRP ' + rupee(lo) : 'MRP ' + rupee(lo) + ' – ' + rupee(hi);
  }
  function priceHTML(p) {
    var m = mrpText(p), sell = D.settings.showPrices && p.price !== '' && p.price != null ? '<b>' + rupee(p.price) + '</b> ' : '';
    if (!m && !sell) return '';
    return '<span class="meta">' + sell + (m ? (sell ? '<s style="opacity:.6">' + m + '</s>' : '<b>' + m + '</b>') : '') + '</span>';
  }
  function card(p) {
    var url = '/product?s=' + encodeURIComponent(p.slug || p.id), el = document.createElement('article');
    el.className = 'pcard';
    el.innerHTML = '<a class="imgl" href="' + url + '" aria-label="View ' + esc(p.name) + '">' + (p.img ? '<img class="pimg" loading="lazy" alt="' + esc(p.name) + '" ' + pic(p.img) + '>' : PH) + '</a>' +
      '<div class="pbody"><span class="code">' + esc(p.sku) + '</span><h3><a href="' + url + '">' + esc(p.name) + '</a></h3>' +
      '<span class="meta">' + esc([brandName(p.brand), catOf(p)].filter(Boolean).join(' · ')) + '</span>' + priceHTML(p) +
      '<div class="pbtns"><a class="btn ghost" href="' + url + '">View details</a><a class="btn accent" target="_blank" rel="noopener" href="' + productWa(p) + '">WhatsApp</a></div></div>';
    return el;
  }

  /* ---------- enquiry form ---------- */
  function enquiryForm(host, o) {
    o = o || {};
    host.innerHTML = '<form class="form" novalidate><div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="row2"><label>Your name<input class="field" name="name" autocomplete="name" required></label><label>Phone / WhatsApp<input class="field" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></label></div>' +
      (o.type === 'wholesale' ? '<div class="row2"><label>Business name<input class="field" name="business" autocomplete="organization"></label><label>City<input class="field" name="city" autocomplete="address-level2"></label></div><label>Approximate quantity<input class="field" name="qty" placeholder="For example: 200 pairs"></label>' : '') +
      '<label>Message<textarea class="field" name="message" required>' + esc(o.message || '') + '</textarea></label>' +
      '<p class="errmsg" role="alert"></p><button class="btn accent" type="submit">' + esc(o.button || 'Send enquiry') + '</button>' +
      '<p class="hint">We use these details only to reply to your enquiry.</p></form>';
    var f = $('form', host), err = $('.errmsg', host), btn = $('button', host);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = '';
      var v = {}; new FormData(f).forEach(function (val, k) { v[k] = val; });
      if (!String(v.name || '').trim()) { err.textContent = 'Please enter your name.'; return; }
      if (!/^[0-9+\-\s()]{7,20}$/.test(String(v.phone || '').trim())) { err.textContent = 'Please enter a valid phone number.'; return; }
      if (String(v.message || '').trim().length < 3) { err.textContent = 'Please enter your message.'; return; }
      v.type = o.type || 'general'; if (o.product) { v.productId = o.product.id; v.productName = o.product.name; v.sku = o.product.sku; }
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/enquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(v) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) { err.textContent = x.j.error || 'Could not send. Please try again.'; btn.disabled = false; btn.textContent = o.button || 'Send enquiry'; return; }
          var m = 'Hello ' + COMPANY + ', I just sent an enquiry on your website' + (o.product ? ' about ' + o.product.name + ' (' + o.product.sku + ')' : '') + '. My name is ' + v.name + '.';
          f.innerHTML = '<div class="ok" role="status"><b>Thank you. Your enquiry has been received.</b><span>Our team will contact you on ' + esc(v.phone) + '. For a faster reply you can also message us on WhatsApp.</span><a class="btn accent" target="_blank" rel="noopener" href="' + wa(m) + '">Continue on WhatsApp</a></div>';
        })
        .catch(function () { err.textContent = 'Could not reach the server. Please check your connection or use WhatsApp.'; btn.disabled = false; btn.textContent = o.button || 'Send enquiry'; });
    });
  }

  /* ---------- home ---------- */
  var SLIDE_T;
  function slideLink(u) { u = String(u || '').trim(); return u || '/catalogue'; }
  function renderSlider(h) {
    var today = new Date().toISOString().slice(0, 10);
    var slides = (h.slides || []).filter(function (s) { return s.active !== false && !(s.start && s.start > today) && !(s.end && s.end < today); });
    if (!slides.length) slides = [{ title: h.heading || 'Footwear for Every Step.', subtitle: h.sub || '', btnLabel: 'Explore catalogue', btnUrl: '/catalogue' }];
    var html = '<div class="slider" id="slider" aria-label="Featured">' + slides.map(function (s, i) {
      var title = String(s.title || '').trim(), textless = s.img && (!title || title.toLowerCase() === 'new slide') && !String(s.subtitle || '').trim() && !String(s.btnLabel || '').trim();
      if (textless) {
        var u = String(s.btnUrl || '').trim();
        return '<div class="slide hasimg pure' + (i === 0 ? ' on' : '') + '" style="background-image:url(' + img(s.img) + ')" role="img" aria-label="Banner ' + (i + 1) + '">' + (u && u !== '#' ? '<a class="fill" href="' + esc(u) + '" aria-label="Open banner link"></a>' : '') + '</div>';
      }
      return '<div class="slide' + (i === 0 ? ' on' : '') + (s.img ? ' hasimg' : '') + '"' + (s.img ? ' style="background-image:url(' + img(s.img) + ')"' : '') + '><div class="copy">' + (s.eyebrow ? '<span class="eyebrow">' + esc(s.eyebrow) + '</span>' : '') + (i === 0 ? '<h1>' : '<h2 class="h1">') + esc(s.title) + (i === 0 ? '</h1>' : '</h2>') +
        (s.subtitle ? '<p>' + esc(s.subtitle) + '</p>' : '') + '<div class="cta">' + (s.btnLabel ? '<a class="btn accent" href="' + esc(slideLink(s.btnUrl)) + '">' + esc(s.btnLabel) + '</a>' : '') + '<a class="btn light wa" href="#">Enquire on WhatsApp</a></div></div>' + (s.img ? '' : '<div class="ghostword" aria-hidden="true">' + esc(String(s.title).split(' ').slice(-1)[0]) + '</div>') + '</div>';
    }).join('') + (slides.length > 1 ? '<div class="sctl" id="dots"></div><div class="sarrow"><button type="button" id="sprev" aria-label="Previous slide">‹</button><button type="button" id="snext" aria-label="Next slide">›</button></div>' : '') + '</div>';
    return { html: html, n: slides.length };
  }
  function startSlider(n) {
    if (n < 2) return;
    var s = [].slice.call(document.querySelectorAll('.slide')), d = $('#dots'), c = 0;
    var dots = s.map(function (_, i) { var b = document.createElement('button'); b.className = 'dot'; b.type = 'button'; b.setAttribute('aria-label', 'Go to slide ' + (i + 1)); b.onclick = function () { go(i); rs(); }; d.appendChild(b); return b; });
    function go(i) { c = (i + s.length) % s.length; s.forEach(function (x, k) { x.classList.toggle('on', k === c); }); dots.forEach(function (x, k) { x.setAttribute('aria-current', String(k === c)); }); }
    function rs() { clearInterval(SLIDE_T); if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; SLIDE_T = setInterval(function () { go(c + 1); }, 6500); }
    $('#sprev').onclick = function () { go(c - 1); rs(); }; $('#snext').onclick = function () { go(c + 1); rs(); };
    go(0); rs();
  }
  function sh(eb, h, p) { return '<div class="sh">' + (eb ? '<span class="eyebrow">' + esc(eb) + '</span>' : '') + '<h2>' + esc(h) + '</h2>' + (p ? '<p>' + esc(p) + '</p>' : '') + '</div>'; }
  function renderHome() {
    var root = $('#home'); if (!root) return;
    var h = D.home || { order: ['hero', 'categories', 'featured', 'brands', 'about'], slides: [], sec: {} }, sec = h.sec || {}, out = '', nSlides = 0, first = true;
    (h.order || []).forEach(function (k) {
      var s = sec[k] || {}, pad = first ? '' : 'padding-top:0';
      if (k === 'hero') { var r = renderSlider(h); out += r.html; nSlides = r.n; return; }
      first = false;
      if (s.on === false) return;
      if (k === 'categories') {
        var cs = D.cats.filter(function (c) { return c.filterVisible !== false; }).slice(0, s.count || 6);
        if (cs.length) out += '<section>' + sh('Browse', s.heading || 'Explore our footwear collection', s.desc) + '<div class="tiles tiles-c">' + cs.map(function (c) { return '<a class="tile" href="/catalogue?cat=' + encodeURIComponent(c.slug || c.id) + '">' + (c.image ? '<img class="pimg" loading="lazy" alt="" ' + pic(c.image) + '>' : '<div class="ph">' + PHSVG + '</div>') + '<h3>' + esc(c.name) + '</h3><span class="more">Explore more</span></a>'; }).join('') + '</div></section>';
      } else if (k === 'featured') {
        var ps = D.products.filter(function (p) { return s.mode === 'home' ? p.home : s.mode === 'new' ? true : p.featured; });
        if (s.mode === 'new') ps.sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); });
        ps = ps.slice(0, s.count || 8);
        out += '<section style="' + pad + '">' + sh('Catalogue', s.heading || 'Featured models', s.desc) + (ps.length ? '<div class="pgrid" id="featured"></div>' : '<p class="note">Products will appear here as soon as they are added.</p>') + '<div class="loadmore"><a class="btn brand" href="/catalogue">View all products</a></div></section>';
        root.__feat = ps;
      } else if (k === 'brands') {
        if (D.brands.length) out += '<section style="padding-top:0">' + sh('Our brands', s.heading || 'Our brands', s.desc) + '<div class="brands">' + D.brands.map(function (b, i) {
          var href = b.slug === 'supremlite' || b.slug === 'ston' ? '/' + b.slug : '/catalogue?brand=' + encodeURIComponent(b.id);
          var WM = { supremlite: 1, ston: 1 }[b.slug] ? b.slug : '';
          var bg = b.bg ? ' hasbg' : '', st = b.bg ? ' style="background-image:url(' + img(b.bg) + ')"' : '', dark = b.bg || i % 2 === 0;
          return '<div class="bcard ' + (i % 2 ? 't' : 's') + bg + (WM ? ' b-' + WM : '') + '"' + st + '>' + (b.logo ? '<img class="blogo" alt="' + esc(b.name) + ' logo" loading="lazy" ' + pic(b.logo, '160px') + '>' : '') + '<span class="eyebrow"' + (dark || WM ? ' style="color:#fff;opacity:.8"' : '') + '>Brand</span>' + (WM ? '<h3 class="wm"><img src="/brand/' + WM + '.png" alt="' + esc(b.name) + '"><span class="sr">' + esc(b.name) + '</span></h3>' : '<h3>' + esc(b.name) + '</h3>') + (b.tagline ? '<strong class="btag">' + esc(b.tagline) + '</strong>' : '') + '<p>' + esc(b.desc || '') + '</p>' + (b.details ? '<div class="bdet">' + para(b.details) + '</div>' : '') + '<a class="btn ' + (i % 2 && !WM ? 'brand' : 'accent') + '" href="' + href + '">View ' + esc(b.name) + '</a></div>';
        }).join('') + '</div></section>';
      } else if (k === 'about') {
        out += '<section' + (s.img ? ' class="abg" style="background-image:url(' + img(s.img) + ')"' : ' style="padding-top:0"') + '>' + sh('Company profile', s.heading || 'About us') + '<div class="two"><div class="prose" style="margin:0">' + para(s.text) + '</div><div class="cards3" style="grid-template-columns:1fr"><a class="lcard" href="/about"><h3>About us</h3><p>Our business, our brands and how we work.</p><span class="more">Read more</span></a><a class="lcard" href="/mission-vision"><h3>Mission &amp; vision</h3><p>What we aim to do and where we want to go.</p><span class="more">Read more</span></a><a class="lcard" href="/values"><h3>Our values</h3><p>Customer focus, integrity, selection and relationships.</p><span class="more">Read more</span></a></div></div></section>';
      } else if (k === 'testimonials') {
        var it = (s.items || []).filter(function (t) { return t && t.quote; });
        if (it.length) out += '<section style="padding-top:0">' + sh('Testimonials', s.heading || 'What customers say') + '<div class="testi">' + it.map(function (t) { return '<blockquote>“' + esc(t.quote) + '”<cite>' + esc(t.name || '') + '</cite></blockquote>'; }).join('') + '</div></section>';
      }
    });
    out += '<section style="padding-top:0"><div class="band"><div><span class="eyebrow" style="color:#fff;opacity:.8">Wholesale &amp; business enquiries</span><h2 style="margin-top:12px">Your footwear business partner</h2><p>PRABHAT INDUSTRIES serves business buyers and individual customers through its footwear manufacturing and trading activities. Retailers, wholesalers, distributors and bulk buyers are welcome to enquire about available products, quantities and commercial terms.</p><div class="cta"><a class="btn accent" href="/wholesale#enquire">Send a wholesale enquiry</a><a class="btn light" href="/wholesale">How to enquire</a></div></div><ol class="steps"><li>Browse the catalogue and identify your preferred models.</li><li>Share the model codes, required sizes, colours and quantities.</li><li>Our team confirms availability, pricing, minimum order quantities and commercial terms.</li><li>Confirm your order once the details and terms are agreed.</li></ol></div></section>' +
      '<section style="padding-top:0"><div class="contact"><div><h2>Let\'s talk footwear</h2><p>Browse the catalogue and contact ' + esc(COMPANY) + ' to discuss your requirements.</p><div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn accent" href="/catalogue">View all products</a><a class="btn ghost" href="/contact">Contact us</a></div></div><ul class="facts">' + (D.settings.location ? '<li><span>Location</span><span>' + esc(D.settings.location) + '</span></li>' : '') + '<li><span>Phone / WhatsApp</span><span>' + esc(D.settings.phone || '') + '</span></li></ul></div></section>';
    root.innerHTML = out;
    var fg = $('#featured'); if (fg && root.__feat) root.__feat.forEach(function (p) { fg.appendChild(card(p)); });
    startSlider(nSlides);
    var hs = D.settings;
    setMeta(hs.seoTitle || (COMPANY + ' | SUPREMLITE and STON Footwear'), hs.seoDesc);
  }

  /* ---------- catalogue ---------- */
  function renderCatalogue() {
    var root = $('#catalogue'); if (!root) return;
    var qs = new URLSearchParams(location.search), preBrand = root.dataset.brand || '';
    var catParam = qs.get('cat') || '', cat = D.cats.filter(function (c) { return c.slug === catParam || c.id === catParam; })[0];
    var brandParam = preBrand || qs.get('brand') || '', brand = D.brands.filter(function (b) { return b.id === brandParam || b.slug === brandParam; })[0];
    var st = { q: qs.get('q') || '', brand: brand ? brand.id : '', cat: cat ? cat.id : '', vr: '', ft: '', sort: qs.get('sort') || 'new' };
    var vr = D.vars.filter(function (v) { return v.slug === qs.get('variety') || v.id === qs.get('variety'); })[0]; if (vr) st.vr = vr.id;
    var ft = D.feats.filter(function (v) { return v.slug === qs.get('feature') || v.id === qs.get('feature'); })[0]; if (ft) st.ft = ft.id;
    var GR = (D.groups || []).filter(function (g) { return g.items && g.items.some(function (x) { return x.filterVisible !== false; }); });
    GR.forEach(function (g) { var it = g.items.filter(function (x) { return x.slug === qs.get('g_' + g.id) || x.id === qs.get('g_' + g.id); })[0]; st['g_' + g.id] = it ? it.id : ''; });
    var FL = D.settings.filterLabels || {}, lbl = function (k, d) { return String((FL[k] && FL[k].plural) || d).toLowerCase(); };
    var STEP = 12, shown = STEP;
    var opt = function (list, val, all) { return '<option value="">' + all + '</option>' + list.filter(function (x) { return x.filterVisible !== false; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (val === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join(''); };
    var h = $('#chead');
    if (h) h.innerHTML = '<span class="eyebrow">' + (preBrand ? 'Brand' : 'Catalogue') + '</span><h1>' + esc(cat ? cat.name : brand ? brand.name : 'All products') + '</h1><p>' + esc(cat && cat.desc ? cat.desc : 'Search the catalogue by model code or product name, and filter by brand, category, variety and feature.') + '</p>';
    setMeta((cat ? cat.name : brand ? brand.name : 'Product catalogue') + ' | ' + COMPANY, 'Browse ' + COMPANY + ' footwear models by brand, category and features, and enquire on WhatsApp.');
    root.innerHTML = '<div class="filters" role="search"><input id="fq" type="search" placeholder="Search model code or name" aria-label="Search" value="' + esc(st.q) + '">' +
      (preBrand ? '<span style="display:none"></span>' : '<select id="fb" aria-label="Brand">' + opt(D.brands, st.brand, 'All brands') + '</select>') +
      '<select id="fc" aria-label="' + lbl('cats', 'categories') + '">' + opt(D.cats, st.cat, 'All ' + lbl('cats', 'categories')) + '</select><select id="fv" aria-label="Variety">' + opt(D.vars, st.vr, 'All ' + lbl('vars', 'varieties')) + '</select><select id="ff" aria-label="Feature">' + opt(D.feats, st.ft, 'All ' + lbl('feats', 'features')) + '</select>' +
      GR.map(function (g) { return '<select id="fg_' + g.id + '" aria-label="' + esc(g.plural) + '">' + opt(g.items, st['g_' + g.id], 'All ' + esc(g.plural.toLowerCase())) + '</select>'; }).join('') + '<select id="fs" aria-label="Sort"><option value="new">Newest first</option><option value="name">Name A to Z</option><option value="sku">Model code</option></select></div>' +
      '<p class="count" id="count" aria-live="polite"></p><div class="pgrid" id="pgrid"></div><div class="loadmore" id="more" hidden><button class="btn brand" type="button">Load more</button></div>';
    $('#fs').value = st.sort;
    var list = [];
    function apply() {
      var t = st.q.trim().toLowerCase();
      list = D.products.filter(function (p) {
        if (st.brand && p.brand !== st.brand) return false; if (st.cat && (p.catIds || []).indexOf(st.cat) < 0) return false;
        if (st.vr && (p.varIds || []).indexOf(st.vr) < 0) return false; if (st.ft && (p.featIds || []).indexOf(st.ft) < 0) return false;
        for (var gi = 0; gi < GR.length; gi++) { var gv = st['g_' + GR[gi].id]; if (gv && ((p.fx || {})[GR[gi].id] || []).indexOf(gv) < 0) return false; }
        return !t || (p.sku + ' ' + p.name + ' ' + brandName(p.brand) + ' ' + catOf(p)).toLowerCase().indexOf(t) > -1;
      });
      list.sort(function (a, b) { return st.sort === 'name' ? a.name.localeCompare(b.name) : st.sort === 'sku' ? String(a.sku).localeCompare(String(b.sku), undefined, { numeric: true }) : String(b.created).localeCompare(String(a.created)); });
      draw();
    }
    function draw() {
      var g = $('#pgrid'); g.innerHTML = '';
      if (!list.length) g.innerHTML = '<div class="empty"><b>' + (D.products.length ? 'No models match your search.' : 'Our catalogue is being updated.') + '</b><br><span>' + (D.products.length ? 'Clear the filters, or ask our team about a specific model.' : 'Please contact us for available models.') + '</span><br><br><a class="btn accent" href="' + general() + '" target="_blank" rel="noopener">Enquire on WhatsApp</a></div>';
      else list.slice(0, shown).forEach(function (p) { g.appendChild(card(p)); });
      $('#count').textContent = list.length ? 'Showing ' + Math.min(shown, list.length) + ' of ' + list.length + ' models' : '';
      $('#more').hidden = shown >= list.length;
    }
    function sync() {
      var p = new URLSearchParams(); if (st.q) p.set('q', st.q); if (st.brand && !preBrand) p.set('brand', st.brand);
      var c = byId(D.cats, st.cat); if (c) p.set('cat', c.slug || c.id); var v = byId(D.vars, st.vr); if (v) p.set('variety', v.slug || v.id); var f = byId(D.feats, st.ft); if (f) p.set('feature', f.slug || f.id); GR.forEach(function (g) { var it = byId(g.items, st['g_' + g.id]); if (it) p.set('g_' + g.id, it.slug || it.id); }); if (st.sort !== 'new') p.set('sort', st.sort);
      history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    }
    [['fq', 'q'], ['fb', 'brand'], ['fc', 'cat'], ['fv', 'vr'], ['ff', 'ft'], ['fs', 'sort']].forEach(function (m) {
      var el = $('#' + m[0]); if (!el) return;
      el.addEventListener('input', function () { st[m[1]] = el.value; shown = STEP; sync(); apply(); });
    });
    GR.forEach(function (g) { var el = $('#fg_' + g.id); el.addEventListener('input', function () { st['g_' + g.id] = el.value; shown = STEP; sync(); apply(); }); });
    $('#more button').onclick = function () { shown += STEP; draw(); };
    apply();
  }

  /* ---------- product page ---------- */
  var PDP = '(max-width: 860px) 100vw, 50vw';
  // Full-screen viewer with the HD master photo; pinch or double-tap to zoom on phones.
  function zoom(pics, i, name) {
    var o = document.createElement('div'); o.className = 'zoomv'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Photo viewer');
    var show = function () { o.querySelector('img').src = img(pics[i]); o.querySelector('.zc').textContent = (i + 1) + ' / ' + pics.length; };
    o.innerHTML = '<button type="button" class="zx" aria-label="Close">×</button>' + (pics.length > 1 ? '<button type="button" class="zp" aria-label="Previous photo">‹</button><button type="button" class="zn" aria-label="Next photo">›</button>' : '') + '<div class="zs"><img alt="' + esc(name) + '"></div><span class="zc"></span>';
    var close = function () { o.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
    var step = function (d) { i = (i + d + pics.length) % pics.length; show(); };
    var key = function (e) { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    o.onclick = function (e) { var t = e.target; if (t.classList.contains('zx') || t === o) close(); else if (t.classList.contains('zp')) step(-1); else if (t.classList.contains('zn')) step(1); else if (t.tagName === 'IMG') t.classList.toggle('big'); };
    document.addEventListener('keydown', key); document.body.appendChild(o); document.body.style.overflow = 'hidden'; show(); o.querySelector('.zx').focus();
  }
  function renderProduct() {
    var root = $('#product'); if (!root) return;
    var s = new URLSearchParams(location.search).get('s') || '', p = D.products.filter(function (x) { return x.slug === s || x.id === s; })[0];
    if (!p) { root.innerHTML = '<div class="empty"><b>We could not find this model.</b><br><span>It may have been removed or renamed.</span><br><br><a class="btn brand" href="/catalogue">Browse the catalogue</a></div>'; setMeta('Model not found | ' + COMPANY); return; }
    var pics = [p.img].concat(p.gallery || []).filter(Boolean), cd = 'Contact us for details';
    var cats = (p.catIds || []).map(function (i) { return byId(D.cats, i); }).filter(Boolean);
    var spec = function (k, v) { return '<div><dt>' + k + '</dt><dd>' + (v && String(v).length ? esc(v) : cd) + '</dd></div>'; };
    var price = (mrpText(p) ? '<div><dt>MRP</dt><dd>' + esc(mrpText(p).replace('MRP ', '')) + '</dd></div>' : '') + (D.settings.showPrices && p.price !== '' && p.price != null ? '<div><dt>Selling price</dt><dd>' + rupee(p.price) + '</dd></div>' : '');
    var rows = mrpRows(p), allSizes = rows.length ? rows.map(function (r) { return r.size; }) : (p.sizes || []);
    var sizeBlock = rows.length ? '<div class="sztab"><h3>Sizes &amp; MRP' + (p.setOf ? ' <small>Sold as a set of ' + esc(p.setOf) + ' sizes</small>' : '') + '</h3><div class="szrow">' + rows.map(function (r) { return '<div><b>' + esc(r.size) + '</b><span>' + (r.mrp ? rupee(r.mrp) : '—') + '</span></div>'; }).join('') + '</div></div>' : (p.setOf ? '<p class="fine" style="margin-top:12px"><b>Sold as a set of ' + esc(p.setOf) + ' sizes.</b></p>' : '');
    root.innerHTML = '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <a href="/catalogue">Catalogue</a>' + (cats[0] ? ' <span>/</span> <a href="/catalogue?cat=' + encodeURIComponent(cats[0].slug || cats[0].id) + '">' + esc(cats[0].name) + '</a>' : '') + ' <span>/</span> <span>' + esc(p.name) + '</span></nav>' +
      '<div class="pdp"><div class="gal">' + (pics.length ? '<button type="button" class="zoomer" id="zoombtn" aria-label="Zoom photo"><img class="main" id="mainimg" alt="' + esc(p.name) + '" ' + pic(pics[0], PDP) + '><span class="zhint" aria-hidden="true">Tap to zoom</span></button>' : PH) + (pics.length > 1 ? '<div class="thumbs">' + pics.map(function (x, i) { return '<button type="button" data-i="' + i + '" aria-label="Photo ' + (i + 1) + '" aria-current="' + (i === 0) + '"><img alt="" src="' + img(x) + '?w=480"></button>'; }).join('') + '</div>' : '') + '</div>' +
      '<div><span class="brandtag">' + esc(p.sku) + '</span><h1>' + esc(p.name) + '</h1><div class="chips">' + (brandName(p.brand) ? '<span>' + esc(brandName(p.brand)) + '</span>' : '') + cats.map(function (c) { return '<a href="/catalogue?cat=' + encodeURIComponent(c.slug || c.id) + '">' + esc(c.name) + '</a>'; }).join('') + '</div>' +
      (p.desc ? '<p class="desc">' + esc(p.desc) + '</p>' : '') +
      '<dl class="spec">' + spec('Brand', brandName(p.brand)) + spec('Model code', p.sku) + spec('Category', names(D.cats, p.catIds).join(', ')) + spec('Variety', names(D.vars, p.varIds).join(', ')) + spec('Features', names(D.feats, p.featIds).join(', ')) + spec('Sizes', allSizes.join(', ')) + spec('Colours', (p.colours || []).join(', ')) + spec('Material', p.material) + price + '</dl>' + sizeBlock +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px"><a class="btn accent" target="_blank" rel="noopener" href="' + productWa(p) + '">Enquire on WhatsApp</a><a class="btn ghost" href="#enquire">Send an enquiry</a></div>' +
      '<p class="fine" style="font-size:13px;color:var(--muted);margin-top:14px">Availability, pricing, minimum order quantities and terms are confirmed by ' + esc(COMPANY) + '.</p>' +
      '<div class="enqbox" id="enquire"><h2 style="font-size:1.1rem;margin-bottom:12px">Enquire about this model</h2><div id="pform"></div></div></div></div><div id="related"></div>';
    var cur = 0, zb = $('#zoombtn');
    if (zb) zb.onclick = function () { zoom(pics, cur, p.name); };
    Array.prototype.forEach.call(root.querySelectorAll('.thumbs button'), function (b) {
      b.onclick = function () { var m = $('#mainimg'), id = pics[+b.dataset.i]; m.srcset = srcset(id); m.src = img(id) + '?w=960'; cur = +b.dataset.i; Array.prototype.forEach.call(root.querySelectorAll('.thumbs button'), function (x) { x.setAttribute('aria-current', String(x === b)); }); };
    });
    enquiryForm($('#pform'), { product: p, message: 'I would like to enquire about ' + p.name + ' (model ' + p.sku + '). Please share sizes, colours, price and minimum order quantity.' });
    var rel = D.products.filter(function (x) { return x.id !== p.id && (x.catIds || []).some(function (c) { return (p.catIds || []).indexOf(c) > -1; }); }).slice(0, 4);
    if (rel.length) { var r = $('#related'); r.innerHTML = '<section><div class="sh"><span class="eyebrow">More to explore</span><h2>Related models</h2></div><div class="pgrid" id="relg"></div></section>'; rel.forEach(function (x) { $('#relg').appendChild(card(x)); }); }
    setMeta((p.seoTitle || p.name + ' (' + p.sku + ')') + ' | ' + COMPANY, p.seoDesc || p.desc || ('Enquire about ' + p.name + ' from ' + COMPANY + '.'));
  }

  /* ---------- CMS page ---------- */
  function renderCms() {
    var root = $('#cms'); if (!root) return;
    var s = new URLSearchParams(location.search).get('s') || '', p = D.pages.filter(function (x) { return x.slug === s; })[0];
    if (!p) { root.innerHTML = '<div class="empty"><b>This page is not available.</b><br><br><a class="btn brand" href="/">Back to home</a></div>'; setMeta('Page not found | ' + COMPANY); return; }
    root.innerHTML = '<div class="pagehero"><span class="eyebrow">' + esc(COMPANY) + '</span><h1>' + esc(p.title) + '</h1></div><nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <span>' + esc(p.title) + '</span></nav><section style="padding-top:36px"><div class="richpage">' + (p.img ? '<img class="feat" alt="" ' + pic(p.img, '(max-width: 960px) 100vw, 900px') + '>' : '') + '<div class="prose" style="margin:0">' + para(p.content) + '</div></div></section>';
    setMeta((p.seoTitle || p.title) + ' | ' + COMPANY, p.seoDesc);
  }

  /* ---------- static pages with live brand listings / forms ---------- */
  function renderExtras() {
    var f = $('#enq-form'); if (f) enquiryForm(f, { type: f.dataset.type || 'general', button: f.dataset.button });
  }

  function run() {
    drawHeader(); drawFooter(); fixLinks();
    try { renderHome(); renderCatalogue(); renderProduct(); renderCms(); renderExtras(); } catch (e) { if (window.console) console.error(e); }
    fixLinks();
    var h = location.hash && $(location.hash); if (h) h.scrollIntoView();
  }

  /* draw the shell straight away, then fill in live content */
  drawHeader(); drawFooter();
  var loading = $('#home, #catalogue, #product, #cms'); if (loading && !loading.innerHTML.trim()) loading.innerHTML = '<div class="loading">Loading…</div>';
  fetch('/api/public/data').then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
    .then(function (j) { D = Object.assign({}, DEFAULTS, j); D.settings = Object.assign({}, DEFAULTS.settings, j.settings || {}); COMPANY = D.settings.company || COMPANY; })
    .catch(function () { /* keep defaults; pages show friendly empty states */ })
    .then(run);
})();
