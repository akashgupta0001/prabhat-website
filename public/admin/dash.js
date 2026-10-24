/* Homepage editor, live preview, dashboard panels */
(function (A) {
  'use strict';
  var esc = A.esc, ic = A.ic, S = A.S, UI = A.UI;
  A.V = A.V || {};

  A.defHome = function () {
    return { heading: 'Footwear for Every Step.', sub: 'Discover footwear from SUPREMLITE and STON, with collections for men, women, kids and everyday needs.',
      order: ['hero', 'brands', 'categories', 'featured', 'about', 'testimonials'], slides: [],
      sec: { brands: { on: true, heading: 'Our Brands', desc: '' }, categories: { on: true, heading: 'Explore Our Footwear Collection', desc: '', count: 6 },
        featured: { on: true, heading: 'Featured Products', desc: '', count: 4, mode: 'featured' }, about: { on: true, heading: 'About PRABHAT INDUSTRIES', text: '', img: '' },
        testimonials: { on: false, heading: 'What Customers Say', items: [] } }, footer: { text: '© PRABHAT INDUSTRIES' } };
  };
  A.hpSet = function (path, val) {
    var p = path.split('.'), o = A.H, i;
    for (i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = val; A.dirty = true;
  };
  A.hpGet = function (path) { var p = path.split('.'), o = A.H, i; for (i = 0; i < p.length && o != null; i++) o = o[p[i]]; return o; };
  A.slideOn = function (s) {
    if (s.active === false) return false; var t = new Date().toISOString().slice(0, 10);
    return !(s.start && s.start > t) && !(s.end && s.end < t);
  };

  /* ---------- live website preview (rendered from saved content, no iframe) ---------- */
  A.pvHTML = function (c) {
    if (!c) return '<div class="pv-empty"><b>Nothing to preview yet.</b><br>' + (UI.pvMode === 'live' ? 'The homepage has not been published.' : 'Edit the homepage to create a draft.') + '</div>';
    var wa = 'https://wa.me/' + A.wa() + '?text=' + encodeURIComponent('Hello PRABHAT INDUSTRIES, I would like to enquire about your footwear.');
    var slides = (c.slides || []).filter(A.slideOn), sl = slides[UI.pvi % Math.max(1, slides.length)] || null;
    var secs = c.sec || {}, out = '';
    out += '<div class="pv-nav"><span class="lg"><i>P</i>PRABHAT INDUSTRIES</span><nav><span>Home</span><span>About Us</span><span>SUPREMLITE</span><span>STON</span><span>Catalogue</span><span>Contact</span></nav></div>';
    (c.order || []).forEach(function (k) {
      var s = secs[k];
      if (k === 'hero') {
        var title = sl ? sl.title : c.heading, sub = sl ? sl.subtitle : c.sub, label = sl ? sl.btnLabel : 'Explore Catalogue';
        out += '<div class="pv-hero" style="' + (sl && sl.img ? A.bg(sl.img) : '') + '"><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p><div class="bt">' + (label ? '<span class="pv-b">' + esc(label) + '</span>' : '') + '<a class="pv-b g" href="' + wa + '" target="_blank" rel="noopener">WhatsApp Enquiry</a></div>' +
          (slides.length > 1 ? '<div class="pv-dots">' + slides.map(function (_, i) { return '<button class="' + (i === UI.pvi % slides.length ? 'on' : '') + '" data-act="pvSlide" data-i="' + i + '" aria-label="Slide ' + (i + 1) + '"></button>'; }).join('') + '</div>' : '') + '</div>';
      } else if (s && s.on !== false) {
        if (k === 'brands') {
          var bs = S.brands.filter(function (b) { return b.active !== false; });
          out += '<div class="pv-sec"><h4>' + esc(s.heading) + '</h4>' + (s.desc ? '<p class="d">' + esc(s.desc) + '</p>' : '') + '</div><div class="pv-brands" style="padding-top:0">' + (bs.length ? bs.map(function (b) { return '<div class="pv-brand" style="' + A.bg(b.logo) + '"><span>' + esc(b.name) + (b.tagline ? '<small>' + esc(b.tagline) + '</small>' : '') + '</span></div>'; }).join('') : '<div class="note">No active brands.</div>') + '</div>';
        } else if (k === 'categories') {
          var cs = S.cats.filter(function (x) { return x.active !== false && x.filterVisible !== false; }).slice(0, s.count || 6);
          out += '<div class="pv-sec"><h4>' + esc(s.heading) + '</h4>' + (s.desc ? '<p class="d">' + esc(s.desc) + '</p>' : '') + '<div class="pv-tiles">' + cs.map(function (x) { return '<div class="pv-tile"><i style="' + A.bg(x.image) + '">' + (x.image ? '' : esc(x.name.charAt(0))) + '</i>' + esc(x.name) + '</div>'; }).join('') + '</div></div>';
        } else if (k === 'featured') {
          var ps = S.products.filter(function (p) { return p.status === 'active' && (s.mode === 'home' ? p.home : s.mode === 'new' ? true : p.featured); });
          if (s.mode === 'new') ps.sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); });
          ps = ps.slice(0, s.count || 4);
          out += '<div class="pv-sec"><h4>' + esc(s.heading) + '</h4>' + (s.desc ? '<p class="d">' + esc(s.desc) + '</p>' : '') + (ps.length ? '<div class="pv-prods">' + ps.map(function (p) { return '<div class="pv-prod"><i style="' + A.bg(p.img) + '"></i><b>' + esc(p.name) + '</b><span>' + esc(p.sku) + '</span></div>'; }).join('') + '</div>' : '<div class="note">No active products are flagged for this section.</div>') + '</div>';
        } else if (k === 'about') {
          out += '<div class="pv-sec"><h4>' + esc(s.heading) + '</h4><p class="d" style="white-space:pre-line">' + esc(s.text || '') + '</p></div>';
        } else if (k === 'testimonials') {
          out += '<div class="pv-sec"><h4>' + esc(s.heading) + '</h4>' + ((s.items || []).map(function (t) { return '<p class="d">“' + esc(t.quote) + '” — <b>' + esc(t.name) + '</b></p>'; }).join('') || '<p class="d">No testimonials added.</p>') + '</div>';
        }
      }
    });
    out += '<div class="pv-foot">' + esc((c.footer && c.footer.text) || '') + ' · Phone / WhatsApp: ' + esc(S.settings.phone || '9818185161') + '</div>';
    return out;
  };
  A.previewPanel = function () {
    var c = UI.pvMode === 'live' ? S.live : A.H, url = S.settings.siteUrl || '';
    return '<div class="card"><div class="ph-row"><span class="ti">' + ic('desk') + '</span><div><h2>Live Website Preview</h2></div></div>' +
      '<div class="pv-bar"><div class="pv-url">' + ic('search') + '<span>' + esc(url || 'Set the website address in General Settings') + '</span></div>' +
      (url ? '<a class="btn pri" href="' + esc(url) + '" target="_blank" rel="noopener">View Site</a>' : '<button class="btn pri" data-act="openSite">View Site</button>') + '</div>' +
      '<div class="pv-bar" style="padding-top:0"><div class="seg" role="group" aria-label="Device">' + [['desktop', 'desk'], ['tablet', 'tab'], ['mobile', 'phone']].map(function (d) { return '<button class="' + (UI.dev === d[0] ? 'on' : '') + '" data-act="dev" data-v="' + d[0] + '" aria-label="' + d[0] + '">' + ic(d[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="seg" role="group" aria-label="Content"><button class="' + (UI.pvMode === 'draft' ? 'on' : '') + '" data-act="pvMode" data-v="draft">Draft</button><button class="' + (UI.pvMode === 'live' ? 'on' : '') + '" data-act="pvMode" data-v="live">Published</button></div>' +
      '<span class="sp"></span><button class="btn sm" data-act="pvRefresh">' + ic('refresh') + ' Refresh</button></div>' +
      '<div class="pv-wrap"><div class="pv dev-' + UI.dev + '" id="pvBox">' + A.pvHTML(c) + '</div></div></div>';
  };
  A.rePreview = function () { var b = A.$('#pvBox'); if (b) b.innerHTML = A.pvHTML(UI.pvMode === 'live' ? S.live : A.H); var d = A.$('#dirtyPill'); if (d) d.hidden = !A.dirty; };

  /* ---------- homepage content editor ---------- */
  var HTABS = [['hero', 'Hero Slider'], ['brands', 'Brand Section'], ['categories', 'Category Section'], ['featured', 'Featured Products'], ['about', 'About Section'], ['testimonials', 'Testimonials']];
  function bind(path, type, v) { return ' data-bind="' + path + '" data-type="' + (type || 'text') + '"' + (v != null ? ' value="' + esc(v) + '"' : ''); }
  function fld(label, path, v, type) { return '<label class="fld"><span>' + label + '</span><input type="' + (type === 'number' ? 'number' : type === 'date' ? 'date' : 'text') + '"' + bind(path, type, v) + '></label>'; }
  function sw(label, path, on) { return '<div class="row-sw"><span>' + label + '</span><label class="sw"><input type="checkbox"' + bind(path, 'bool') + (on ? ' checked' : '') + '><i></i></label><span style="color:' + (on ? 'var(--green)' : 'var(--muted)') + '">' + (on ? 'Active' : 'Off') + '</span></div>'; }

  function heroTab() {
    var sl = A.H.slides, i = Math.min(UI.sel, sl.length - 1), s = sl[i], p = 'slides.' + i + '.';
    var list = '<div class="sl-list">' + sl.map(function (x, n) { return '<button class="sl-th ' + (n === i ? 'on' : '') + '" data-act="selSlide" data-i="' + n + '"><div class="im" style="' + A.bg(x.img) + '"></div><small>Slide ' + (n + 1) + (x.active === false ? ' (off)' : '') + '</small></button>'; }).join('') +
      '<button class="btn pri" data-act="addSlide">' + ic('plus') + ' Add New Slide</button></div>';
    if (!s) return '<div class="hp" style="grid-template-columns:130px 1fr">' + list + '<div class="empty"><b>No slides yet.</b><span>Add a slide to build the homepage banner.</span></div></div>';
    var prev = '<div><div class="slidebox ' + (s.img ? '' : 'empty') + '" style="' + A.bg(s.img) + '"><b>' + esc(s.title || 'Slide title') + '</b><span>' + esc(s.subtitle) + '</span>' + (s.btnLabel ? '<em>' + esc(s.btnLabel) + '</em>' : '') + '</div>' +
      '<div class="bgrow"><label>Background Image (desktop)</label><div class="th" style="' + A.bg(s.img) + '"></div><button class="btn pri sm" data-act="slideImg" data-k="img">Change Image</button><button class="btn dng sm" data-act="slideImgRm" data-k="img">Remove</button></div></div>';
    var f = '<div class="sfields">' + fld('Title', p + 'title', s.title) + fld('Subtitle', p + 'subtitle', s.subtitle) + fld('Button Text', p + 'btnLabel', s.btnLabel) + fld('Button Link', p + 'btnUrl', s.btnUrl) +
      sw('Status', p + 'active', s.active !== false) +
      '<details class="more"><summary>More options</summary><div style="padding-top:10px"><label class="fld"><span>Description</span><textarea' + bind(p + 'desc', 'text') + '>' + esc(s.desc || '') + '</textarea></label>' +
      '<div class="bgrow" style="margin:0 0 10px"><label>Mobile image</label><div class="th" style="' + A.bg(s.imgM) + '"></div><button class="btn sm" data-act="slideImg" data-k="imgM">Upload</button><button class="btn sm" data-act="slideImgRm" data-k="imgM">Remove</button></div>' +
      '<div class="g2">' + fld('Start date', p + 'start', s.start, 'date') + fld('End date', p + 'end', s.end, 'date') + '</div>' +
      '<div class="acts"><button class="btn sm" data-act="moveSlide" data-d="-1" ' + (i === 0 ? 'disabled' : '') + '>' + ic('aup') + ' Move up</button><button class="btn sm" data-act="moveSlide" data-d="1" ' + (i === sl.length - 1 ? 'disabled' : '') + '>' + ic('adn') + ' Move down</button><button class="btn sm" data-act="dupSlide">' + ic('copy') + ' Duplicate</button><button class="btn dng sm" data-act="delSlide">' + ic('trash') + ' Delete</button></div></div></details>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn pri" data-act="saveHome">Save Changes</button></div></div>';
    return '<div class="hp">' + list + prev + f + '</div>';
  }
  function otherTab(t) {
    var s = A.H.sec[t] || {}, p = 'sec.' + t + '.', body = '<div class="pad" style="max-width:560px">' + sw('Show section', p + 'on', s.on !== false) + fld('Heading', p + 'heading', s.heading);
    if (t === 'about') body += '<label class="fld"><span>Text</span><textarea' + bind(p + 'text', 'text') + '>' + esc(s.text || '') + '</textarea></label><div class="bgrow"><label>Background image</label><div class="th" style="' + A.bg(s.img) + '"></div><button class="btn sm" data-act="secImg" data-t="about">Upload</button><button class="btn sm" data-act="secImgRm" data-t="about">Remove</button></div>';
    else if (t === 'testimonials') {
      body += '<p class="cell-s">Add only real customer comments you have permission to show.</p>' + (s.items || []).map(function (it, n) { return '<div class="note" style="margin-bottom:8px"><div class="g2">' + fld('Name', p + 'items.' + n + '.name', it.name) + fld('Comment', p + 'items.' + n + '.quote', it.quote) + '</div><button class="btn dng sm" data-act="rmTesti" data-i="' + n + '">Remove</button></div>'; }).join('') + '<button class="btn sm" data-act="addTesti">' + ic('plus') + ' Add testimonial</button>';
    } else {
      body += fld('Description', p + 'desc', s.desc);
      if (t !== 'brands') body += fld('Number of items shown', p + 'count', s.count, 'number');
      if (t === 'featured') body += '<label class="fld"><span>Show</span><select' + bind(p + 'mode', 'text') + '>' + [['featured', 'Products marked Featured'], ['home', 'Products marked Show on homepage'], ['new', 'Newest products (new arrivals)']].map(function (o) { return '<option value="' + o[0] + '"' + (s.mode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>';
      if (t === 'categories') body += '<div class="fld"><span>Category images (shown on the homepage tiles)</span></div>' + (S.cats.length ? S.cats.map(function (x) { return '<div class="bgrow" style="margin-bottom:8px"><div class="th" style="' + A.bg(x.image) + '">' + (x.image ? '' : esc(x.name.charAt(0))) + '</div><b style="flex:1">' + esc(x.name) + '</b><button class="btn sm" data-act="catImg" data-id="' + x.id + '">' + (x.image ? 'Change image' : 'Add image') + '</button>' + (x.image ? '<button class="btn sm dng" data-act="catImgRm" data-id="' + x.id + '">Remove</button>' : '') + '</div>'; }).join('') : '<p class="cell-s">No categories yet.</p>') + '<p class="cell-s">Image changes here save straight away. Tiles with fewer items are centred on the page.</p>';
      if (t === 'brands') body += '<div class="fld"><span>Brand cards (details, logo and card background image)</span></div>' + S.brands.map(function (b) { return '<div class="bgrow" style="margin-bottom:8px"><div class="th" style="' + A.bg(b.bg || b.logo) + '">' + ((b.bg || b.logo) ? '' : esc(b.name.charAt(0))) + '</div><b style="flex:1">' + esc(b.name) + '</b><button class="btn sm" data-act="editBrand" data-id="' + b.id + '">' + ic('edit') + ' Edit details &amp; image</button></div>'; }).join('') + '<p class="cell-s">Each brand has its own details and card background image. Changes save straight away.</p>';
      body += '<p class="cell-s">' + (t === 'brands' ? 'Brands come from Brand Management.' : t === 'categories' ? 'Shows active categories whose filter is visible, in the order set on the Categories page.' : 'Only active products appear on the homepage.') + '</p>';
    }
    return body + '<div style="display:flex;gap:8px;margin-top:6px"><button class="btn pri" data-act="saveHome">Save Changes</button></div></div>';
  }
  A.hpPanel = function (forceTab) {
    var tab = forceTab || UI.tab;
    return '<div class="card"><div class="ph-row"><span class="ti">' + ic('home') + '</span><div><h2>Homepage Content Management</h2><p>Update banners, texts and media for your homepage</p></div><span class="sp"></span>' +
      '<span class="dirty" id="dirtyPill" ' + (A.dirty ? '' : 'hidden') + '>Unsaved changes</span><button class="btn sm" data-act="publishHome">Publish</button></div>' +
      '<div class="tabs">' + HTABS.map(function (t) { return '<button class="' + (tab === t[0] ? 'on' : '') + '" data-act="hpTab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      (tab === 'hero' ? heroTab() : otherTab(tab)) + '</div>';
  };

  A.saveHome = async function () {
    var ok = await A.run(function () { return A.db.doc('site/home_draft').set(A.H); }, 'Draft saved. The live website is unchanged until you publish.');
    if (ok) { A.dirty = false; A.log('Homepage draft saved'); A.refresh(true); }
  };
  A.publishHome = async function () {
    var ok = await A.run(async function () { var d = A.clone(A.H); d.publishedAt = A.now(); await A.db.doc('site/home_draft').set(A.H); await A.db.doc('site/home_live').set(d); }, 'Homepage published.');
    if (ok) { A.dirty = false; A.log('Homepage changes published'); A.refresh(true); }
  };

  /* ---------- dashboard panels ---------- */
  A.statCards = function () {
    var wk = Date.now() - 7 * 864e5, mo = Date.now() - 30 * 864e5;
    var newP = S.products.filter(function (p) { return new Date(p.created || 0) > wk; }).length, newE = S.enq.filter(function (e) { return new Date(e.created || 0) > wk; }).length, newPg = S.pages.filter(function (p) { return new Date(p.created || 0) > mo; }).length;
    function allAct(k, w) { var n = S[k].filter(function (x) { return x.active !== false; }).length; return n === S[k].length ? 'All ' + w + ' active' : n + ' of ' + S[k].length + ' active'; }
    var cards = [['box', 't-blue', 'Total Products', S.products.length, '+' + newP + ' this week'], ['grid', 't-green', 'Total ' + A.TAX.cats.plural, S.cats.length, allAct('cats', 'categories')], ['palette', 't-blue', 'Total ' + A.TAX.vars.plural, S.vars.length, allAct('vars', 'varieties')],
      ['star', 't-amber', 'Total ' + A.TAX.feats.plural, S.feats.length, allAct('feats', 'features')], ['file', 't-blue', 'Total Pages', S.pages.length, '+' + newPg + ' this month'], ['mail', 't-blue', 'Total Enquiries', S.enq.length, '+' + newE + ' this week']];
    return '<div class="stats">' + cards.map(function (c) { return '<div class="card stat"><div class="ico ' + c[1] + '">' + ic(c[0]) + '</div><div><small>' + c[2] + '</small><b>' + c[3] + '</b><span class="d">' + (/^\+/.test(c[4]) ? ic('trend') : ic('ok')) + c[4] + '</span></div></div>'; }).join('') + '</div>';
  };
  function fvOn(k, x) { return Object.prototype.hasOwnProperty.call(UI.fv, x.id) ? UI.fv[x.id] : x.filterVisible !== false; }
  A.filtersPanel = function () {
    var tabs = A.taxKeys(), cur = A.TAX[UI.ftab] ? UI.ftab : 'cats', q = (UI.fq || '').toLowerCase();
    var others = tabs.filter(function (t) { return t !== cur; });
    function list(k, withCount) {
      return S[k].filter(function (x) { return !q || x.name.toLowerCase().indexOf(q) > -1; }).map(function (x) {
        return '<label class="it"><input class="chk" type="checkbox" data-act="fvToggle" data-id="' + x.id + '" ' + (fvOn(k, x) ? 'checked' : '') + '>' + (withCount ? '<span class="th2" style="' + A.bg(x.image) + '">' + (x.image ? '' : esc(x.name.charAt(0))) + '</span>' : '') + '<span>' + esc(x.name) + (x.active === false ? ' <span class="pill no">inactive</span>' : '') + '</span><span class="n">(' + A.useCount(k, x.id) + ')</span><button type="button" class="ibtn" style="width:22px;height:22px" data-act="editTax" data-k="' + k + '" data-id="' + x.id + '" aria-label="Edit ' + esc(x.name) + '" title="Edit">' + ic('edit') + '</button><button type="button" class="ibtn r" style="width:22px;height:22px" data-act="delTax" data-k="' + k + '" data-id="' + x.id + '" aria-label="Delete ' + esc(x.name) + '" title="Delete">' + ic('trash') + '</button>' + '</label>';
      }).join('') || '<div class="empty" style="padding:16px">None yet</div>';
    }
    function heading(k) {
      return (A.TAX[k].custom ? '<button type="button" class="ibtn r" style="width:22px;height:22px" data-act="delGroup" data-k="' + k + '" aria-label="Delete this filter group" title="Delete this filter group">' + ic('trash') + '</button>' : '') + '<button type="button" class="ibtn" style="width:22px;height:22px" data-act="renameTax" data-k="' + k + '" aria-label="Rename heading" title="Rename heading">' + ic('edit') + '</button><button type="button" class="ibtn" style="width:22px;height:22px" data-act="addTax" data-k="' + k + '" aria-label="Add new" title="Add new">' + ic('plus') + '</button>';
    }
    var pend = Object.keys(UI.fv).length;
    return '<div class="card"><div class="ph-row"><span class="ti">' + ic('layers') + '</span><div><h2>Product Filters <span style="font-weight:500;color:var(--muted)">(' + S.cats.length + ' Categories × ' + S.vars.length + ' Varieties × ' + S.feats.length + ' Features' + (A.taxKeys().length > 3 ? ' + ' + (A.taxKeys().length - 3) + ' more' : '') + ')</span></h2></div></div>' +
      '<div class="tabs">' + tabs.map(function (t) { return '<button class="' + (cur === t ? 'on' : '') + '" data-act="fTab" data-v="' + t + '">' + A.TAX[t].plural + ' (' + S[t].length + ')</button>'; }).join('') + '<button class="newg" data-act="newGroup" title="Create a new filter group">' + ic('plus') + ' New filter group</button></div>' +
      '<div class="tools" style="padding-bottom:0"><input type="search" placeholder="Search" aria-label="Search filters" data-act-input="fq" value="' + esc(UI.fq) + '"><button class="btn sm" data-act="addTax" data-k="' + cur + '">' + ic('plus') + ' Add New</button></div>' +
      '<div class="fp"><div class="fl"><h5><span>' + esc(A.TAX[cur].plural) + '</span><span class="acts">' + heading(cur) + '</span></h5>' + list(cur, true) + '</div><div class="fcols">' +
      others.map(function (k) { return '<div class="fl"><h5><span>' + S[k].length + ' ' + esc(A.TAX[k].plural) + '</span><span class="acts">' + heading(k) + '</span></h5>' + list(k, false) + '</div>'; }).join('') +
      '<div class="fbtn"><button class="btn pri" data-act="fvSave" ' + (pend ? '' : 'disabled') + '>Apply Filters</button><button class="btn" data-act="fvReset" ' + (pend ? '' : 'disabled') + '>Reset</button></div>' +
      '<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-act="fvAll" data-v="1">Select all</button><button class="btn sm" data-act="fvAll" data-v="0">Deselect all</button>' + (pend ? '<span class="dirty">Unsaved changes</span>' : '') + '</div></div></div>' +
      '<p class="cell-s" style="padding:0 16px 14px;margin:0">Unticking a filter only hides it on the public catalogue. Products and their assignments are kept.</p></div>';
  };
  A.labelForm = function (k) {
    var T = A.TAX[k];
    A.modal('<div class="sh-h"><h3>Rename heading</h3><button class="ic-btn" data-act="closeModal" aria-label="Close">' + ic('x') + '</button></div><div class="sh-b">' +
      '<p class="cell-s" style="margin-top:0">This changes the heading everywhere: this panel, the menu, and the filter on the public catalogue.</p>' +
      '<label class="fld"><span>Heading (plural), for example "Categories"</span><input id="lb_pl" value="' + esc(T.plural) + '"></label>' +
      '<label class="fld"><span>Single item name, for example "Category"</span><input id="lb_sg" value="' + esc(T.label) + '"></label><p class="err" id="lb_err" role="alert"></p></div>' +
      '<div class="sh-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn" data-act="resetLabels" data-k="' + k + '">Reset to default</button><button class="btn pri" data-act="saveLabels" data-k="' + k + '">Save</button></div>', 'sm');
  };
  A.saveLabels = async function (k, reset) {
    if (A.TAX[k] && A.TAX[k].custom) {
      var pl2 = A.mv('lb_pl').trim(), sg2 = A.mv('lb_sg').trim(); if (!pl2 || !sg2) { A.$('#lb_err').textContent = 'Both names are required.'; return; }
      var gs = (S.settings.filterGroups || []).map(function (g) { return g.id === A.TAX[k].gid ? Object.assign({}, g, { plural: pl2, label: sg2 }) : g; }), o2 = Object.assign({}, S.settings, { filterGroups: gs });
      if (await A.run(function () { return A.db.doc('site/settings').set(o2); }, 'Heading saved.')) { S.settings = o2; A.syncGroups(); A.closeModal(); A.refresh(true); } return;
    }
    var pl = reset ? A.TAXDEF[k].plural : A.mv('lb_pl').trim(), sg = reset ? A.TAXDEF[k].label : A.mv('lb_sg').trim();
    if (!pl || !sg) { A.$('#lb_err').textContent = 'Both names are required.'; return; }
    var fl = Object.assign({}, S.settings.filterLabels || {}); fl[k] = { plural: pl, label: sg };
    var o = Object.assign({}, S.settings, { filterLabels: fl });
    if (await A.run(function () { return A.db.doc('site/settings').set(o); }, 'Heading saved.')) { S.settings = o; A.applyLabels(); A.log('Filter heading renamed: ' + pl); A.closeModal(); A.refresh(true); }
  };
  A.groupForm = function () {
    A.modal('<div class="sh-h"><h3>New filter group</h3><button class="ic-btn" data-act="closeModal" aria-label="Close">' + ic('x') + '</button></div><div class="sh-b">' +
      '<p class="cell-s" style="margin-top:0">A filter group is a new way to sort products, for example Colours, Sizes, Sole Type or Season. It appears in the product form and as a filter on the public catalogue.</p>' +
      '<label class="fld"><span>Group name (plural), for example "Colours"</span><input id="ng_pl"></label><label class="fld"><span>Single item name, for example "Colour"</span><input id="ng_sg"></label><p class="err" id="ng_err" role="alert"></p></div>' +
      '<div class="sh-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="saveGroup">Create group</button></div>', 'sm');
  };
  A.saveGroup = async function () {
    var pl = A.mv('ng_pl').trim(), sg = A.mv('ng_sg').trim() || pl; if (!pl) { A.$('#ng_err').textContent = 'Enter a group name.'; return; }
    var gs = (S.settings.filterGroups || []).slice();
    if (gs.length >= 12) { A.$('#ng_err').textContent = 'You can have up to 12 extra groups.'; return; }
    if (gs.some(function (g) { return g.plural.toLowerCase() === pl.toLowerCase(); }) || ['categories', 'varieties', 'features'].indexOf(pl.toLowerCase()) > -1) { A.$('#ng_err').textContent = 'A group with this name already exists.'; return; }
    var id = 'g' + Math.random().toString(36).slice(2, 8); gs.push({ id: id, plural: pl, label: sg });
    var o = Object.assign({}, S.settings, { filterGroups: gs });
    if (await A.run(function () { return A.db.doc('site/settings').set(o); }, 'Filter group created.')) { S.settings = o; A.syncGroups(); UI.ftab = 'fg_' + id; A.log('Filter group created: ' + pl); A.closeModal(); A.refresh(true); }
  };
  A.askDelGroup = function (k) {
    var T = A.TAX[k], n = S[k].length;
    A.confirmBox({ title: 'Delete the "' + T.plural + '" group?', body: '<p>This permanently deletes the group and its <b>' + n + '</b> item' + (n === 1 ? '' : 's') + '. Products are not deleted; they simply lose this filter.</p>', actions: [{ label: 'Delete group', cls: 'dng', fn: async function () {
      var gs = (S.settings.filterGroups || []).filter(function (g) { return g.id !== T.gid; }), o = Object.assign({}, S.settings, { filterGroups: gs }), items = S[k].slice();
      var ok = await A.run(async function () { for (var i = 0; i < items.length; i++) await A.del(k, items[i].id); await A.db.doc('site/settings').set(o); }, 'Filter group deleted.');
      if (ok) { S.settings = o; delete S[k]; A.syncGroups(); UI.ftab = 'cats'; A.log('Filter group deleted: ' + T.plural); A.closeModal(); A.refresh(true); }
    } }] });
  };
  A.fvSave = async function () {
    var ids = Object.keys(UI.fv), ok = await A.run(async function () {
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i], k = A.taxKeys().filter(function (t) { return S[t].some(function (x) { return x.id === id; }); })[0]; if (!k) continue;
        await A.col(k).doc(id).update({ filterVisible: UI.fv[id], updated: A.now() });
      }
    }, 'Filter visibility saved.');
    if (ok) { UI.fv = {}; A.log('Product filter visibility updated'); A.refresh(true); }
  };

  A.quickActions = function () {
    var q = [['plus', 't-blue', 'Add Product', 'New product', 'addProduct'], ['file', 't-blue', 'Add Page', 'New website page', 'addPage'], ['image', 't-amber', 'Update Banner', 'Homepage slider', 'go:banner'], ['download', 't-red', 'Download Catalogue', 'CSV export', 'exportProducts'], ['mail', 't-green', 'Manage Enquiries', 'View messages', 'go:enq'], ['cog', 't-purple', 'Settings', 'Website settings', 'go:settings']];
    return '<div class="card"><div class="ph-row"><div><h2>Quick Actions</h2></div></div><div class="qa">' + q.map(function (x) { return '<button data-act="' + (x[4].indexOf('go:') === 0 ? 'go" data-r="' + x[4].slice(3) : x[4]) + '"><span class="q ' + x[1] + '">' + ic(x[0]) + '</span><span><b>' + x[2] + '</b><small>' + x[3] + '</small></span></button>'; }).join('') + '</div></div>';
  };
  A.activityPanel = function () {
    return '<div class="card"><div class="ph-row"><div><h2>Recent Activity</h2></div></div>' + (S.activity.length ? '<ul class="act-l">' + S.activity.slice(0, 6).map(function (a) { return '<li><span>' + esc(a.text) + '</span><time>' + A.ago(a.ts) + '</time></li>'; }).join('') + '</ul>' : '<div class="empty">No activity yet. Changes you make are listed here.</div>') + '</div>';
  };
  A.statusPanel = function () {
    var dbOk = !!A.db && S.loaded.products, d = S.loaded.live && S.live, pend = d && A.H && JSON.stringify(A.H) !== JSON.stringify(Object.assign({}, S.live, { publishedAt: undefined }));
    var st = A.storage ? Math.round(A.storage.bytes / 1048576 * 10) / 10 + ' MB of ' + Math.round(A.storage.maxBytes / 1048576) + ' MB used' : 'Not available';
    function row(ok, t, s) { return '<li><span class="' + (ok ? 'ok' : 'wn') + '">' + ic(ok ? 'ok' : 'x') + '</span><div><b>' + t + '</b><small>' + s + '</small></div></li>'; }
    return '<div class="card"><div class="ph-row"><div><h2>System Status</h2></div></div><ul class="ss">' + row(dbOk, 'Database', dbOk ? 'Connected' : 'Not connected') +
      row(!!S.live, 'Website publishing', S.live ? (S.live.publishedAt ? 'Last published ' + A.ago(S.live.publishedAt) + (A.dirty ? ' · unsaved edits' : '') : 'Published') : 'Nothing published yet') +
      row(!!A.storage, 'File storage', st) + row(false, 'Backup', 'No backup configured') + '</ul></div>';
  };
  A.helpPanel = function () {
    return '<div class="card"><div class="ph-row"><span class="ti" style="color:var(--blue)">' + ic('help') + '</span><div><h2>Need Help?</h2></div></div><div class="help"><p style="color:var(--muted);margin:0 0 12px">For help with this control panel, call or WhatsApp the person who set it up for you.</p><button class="btn pri" data-act="helpInfo">Contact Support</button></div></div>';
  };

  A.V.dashboard = function () {
    return '<div class="dashview" style="display:grid;gap:16px">' + A.statCards() + '<div class="r2">' + A.hpPanel() + A.previewPanel() + '</div><div class="r2"><div id="dashProd">' + A.prodCard(true) + '</div>' + A.filtersPanel() + '</div><div class="r4">' + A.quickActions() + A.activityPanel() + A.statusPanel() + A.helpPanel() + '</div></div>';
  };
  A.V.homepage = function () { return '<div class="r2">' + A.hpPanel() + A.previewPanel() + '</div>'; };
  A.V.banner = function () { return '<div class="r2">' + A.hpPanel('hero') + A.previewPanel() + '</div>'; };
  A.V.sections = function () {
    var o = A.H.order, names = { hero: 'Hero slider', brands: 'Brand section', categories: 'Category section', featured: 'Featured products', about: 'About section', testimonials: 'Testimonials' };
    return '<div class="r2"><div class="card"><div class="ph-row"><span class="ti">' + ic('layers') + '</span><div><h2>Sections &amp; Blocks</h2><p>Turn homepage sections on or off and change their order</p></div><span class="sp"></span><span class="dirty" id="dirtyPill" ' + (A.dirty ? '' : 'hidden') + '>Unsaved changes</span></div><div class="tw"><table class="t"><thead><tr><th>Order</th><th>Section</th><th>Visible</th><th>Edit</th></tr></thead><tbody>' +
      o.map(function (k, i) { var on = k === 'hero' ? true : (A.H.sec[k] || {}).on !== false; return '<tr><td><div class="acts"><button class="ibtn" data-act="moveSec" data-i="' + i + '" data-d="-1" ' + (i === 0 ? 'disabled' : '') + ' aria-label="Move up">' + ic('aup') + '</button><button class="ibtn" data-act="moveSec" data-i="' + i + '" data-d="1" ' + (i === o.length - 1 ? 'disabled' : '') + ' aria-label="Move down">' + ic('adn') + '</button></div></td><td class="cell-name">' + names[k] + '</td><td>' + (k === 'hero' ? '<span class="pill ok">Always</span>' : '<label class="sw"><input type="checkbox" data-act="secOn" data-k="' + k + '" ' + (on ? 'checked' : '') + '><i></i></label>') + '</td><td><button class="btn sm" data-act="hpEdit" data-v="' + k + '">Edit content</button></td></tr>'; }).join('') +
      '</tbody></table></div><div class="pad" style="display:flex;gap:8px"><button class="btn pri" data-act="saveHome">Save Changes</button><button class="btn" data-act="publishHome">Publish</button></div></div>' + A.previewPanel() + '</div>';
  };
})(window.A);
