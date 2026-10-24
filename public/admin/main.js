/* Shell, routing, event handling, boot */
(function (A) {
  'use strict';
  var esc = A.esc, ic = A.ic, S = A.S, UI = A.UI, V = A.V;
  var NAV = [
    { id: 'dashboard', label: 'Dashboard', ic: 'home', top: true },
    { g: 'Website Management', items: [['homepage', 'Homepage Builder', 'grid', true], ['banner', 'Banner & Slider', 'image'], ['sections', 'Sections & Blocks', 'layers'], ['pages', 'Pages', 'file'], ['menu', 'Menu Management', 'menu'], ['brands', 'Brand Management', 'tag']] },
    { g: 'Catalogue Management', items: [['products', 'Products', 'box', true], ['categories', 'Categories', 'folder'], ['varieties', 'Varieties', 'palette'], ['features', 'Features', 'star'], ['bulk', 'Bulk Upload', 'upload'], ['inventory', 'Inventory', 'wh']] },
    { g: 'Enquiries & Orders', items: [['enq', 'Customer Enquiries', 'msg', true], ['wenq', 'Wholesale Enquiries', 'mail']] },
    { g: 'Settings', items: [['settings', 'General Settings', 'cog'], ['seo', 'SEO Settings', 'search'], ['users', 'Users & Roles', 'users']] },
    { g: 'My Workspace', items: [['notes', 'Notes', 'file']] }
  ];
  A.syncNav = function () {
    NAV.forEach(function (g) { (g.items || []).forEach(function (it) { var k = { categories: 'cats', varieties: 'vars', features: 'feats' }[it[0]]; if (k) it[1] = A.TAX[k].plural; }); });
  };
  var TITLES = {};
  var closed = {};

  function sidebar() {
    var h = '<div class="sb-head"><span class="logo">P</span><div><b>PRABHAT INDUSTRIES</b><small>SUPREMLITE | STON</small></div></div><nav class="sb-nav" aria-label="Main">';
    NAV.forEach(function (n) {
      if (n.top) { h += '<button class="sb-item ' + (UI.route === n.id ? 'on' : '') + '" data-act="go" data-r="' + n.id + '">' + ic(n.ic) + '<span class="grow">' + n.label + '</span></button>'; return; }
      h += '<div class="sb-group ' + (closed[n.g] ? 'closed' : '') + '"><button data-act="grp" data-g="' + esc(n.g) + '" aria-expanded="' + !closed[n.g] + '">' + n.g + ic('down') + '</button><div class="sb-items">';
      n.items.forEach(function (i) { TITLES[i[0]] = i[1]; h += '<button class="sb-item ' + (UI.route === i[0] ? 'on' : '') + '" data-act="go" data-r="' + i[0] + '">' + ic(i[2]) + '<span class="grow">' + i[1] + '</span>' + (i[3] ? ic('down') : '') + '</button>'; });
      h += '</div></div>';
    });
    return h + '</nav><div class="sb-foot"><button class="sb-item" data-act="logout">' + ic('logout') + '<span class="grow">Logout</span></button></div>';
  }
  function topbar() {
    var newN = S.enq.filter(function (e) { return e.status === 'New'; }).length, nm = (A.me && A.me.name) || 'Admin', live = !!S.live;
    return '<button class="ic-btn" data-act="toggleNav" aria-label="Toggle sidebar">' + ic('menu') + '</button><div><h1>Website Control Panel</h1><div class="sub">Manage Your Website, Catalogue &amp; More</div></div><span class="sp"></span>' +
      '<button class="live ' + (live ? '' : 'off') + '" data-act="openSite" title="Open website"><span class="dot"></span><span class="t">' + (live ? 'Website Live' : 'Not published') + '</span>' + ic('ext') + '</button>' +
      '<button class="ic-btn" data-act="bell" aria-label="Notifications">' + ic('bell') + (newN ? '<span class="badge-n">' + newN + '</span>' : '') + '</button>' +
      '<button class="who" data-act="userMenu" aria-haspopup="true"><span class="avatar">' + esc(nm.charAt(0).toUpperCase()) + '</span><div><b>' + esc(nm) + '</b><small>' + (A.role === 'Super Admin' ? 'Super Admin' : A.role) + '</small></div>' + ic('down') + '</button><div id="pop"></div>';
  }
  function view() {
    var r = UI.route;
    if (!A.db) return '<div class="card empty"><b>The database is not reachable.</b><span>Check your internet connection, then reload this page and sign in again.</span></div>';
    if (!A.H) A.H = A.defHome();
    if (r === 'categories') return V.taxonomy('cats'); if (r === 'varieties') return V.taxonomy('vars'); if (r === 'features') return V.taxonomy('feats');
    if (r === 'notes') return V.notes();
    if (r === 'enq' || r === 'wenq') return V.enquiries(r);
    return (V[r] || V.dashboard)();
  }
  A.render = function () {
    A.$('#sb').innerHTML = sidebar(); A.$('#top').innerHTML = topbar();
    var c = A.$('#content'), sy = window.scrollY; c.innerHTML = view(); window.scrollTo(0, sy); A.pending = false;
  };
  A.refresh = function (force) {
    var ae = document.activeElement, typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && A.$('#content').contains(ae) && ae.type !== 'checkbox';
    if (!force && (A.modalOpen || typing)) { A.pending = true; A.$('#top').innerHTML = topbar(); return; }
    A.render();
  };
  window.addEventListener('focusout', function () { if (A.pending && !A.modalOpen) setTimeout(function () { var ae = document.activeElement; if (!(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) A.refresh(); }, 120); });
  function go(r) { UI.route = r; document.body.classList.remove('nav-open'); A.render(); window.scrollTo(0, 0); }
  A.go = go;
  function dataOf(t) { return t.dataset; }

  var ACT = {
    addNote: function () { A.noteForm(); }, editNote: function (t) { A.noteForm(t.dataset.id); }, saveNote: function (t) { A.saveNote(t.dataset.id); }, delNote: function (t) { A.delNote(t.dataset.id); },
    pinNote: function (t) { var n = S.notes.find(function (x) { return x.id === t.dataset.id; }); if (n) A.run(function () { return A.col('notes').doc(n.id).update({ pinned: !n.pinned }); }); },
    noteColor: function (t) { A.NC = t.dataset.c; Array.prototype.forEach.call(document.querySelectorAll('#modal .ncol button'), function (b) { b.classList.toggle('on', b.dataset.c === A.NC); }); },
    go: function (t) { go(t.dataset.r); }, grp: function (t) { closed[t.dataset.g] = !closed[t.dataset.g]; A.render(); },
    toggleNav: function () { document.body.classList.toggle('nav-open'); },
    closeModal: function () { A.closeModal(); },
    confirmDo: function (t) { var f = A.confirmFns[+t.dataset.i]; if (f) f(); },
    logout: function () { fetch('/api/logout', { method: 'POST', headers: { 'x-requested-with': 'pi-admin' }, credentials: 'same-origin' }).finally(function () { location.href = '/admin/login.html'; }); },
    helpInfo: function () { A.toast('Call or WhatsApp the person who set up this website.'); },
    openSite: function () { if (S.settings.siteUrl) window.open(S.settings.siteUrl, '_blank'); else { A.toast('Set the public website address in General Settings first.'); go('settings'); } },
    userMenu: function () { var p = A.$('#pop'); if (p.innerHTML) { p.innerHTML = ''; return; } p.innerHTML = '<div class="menu-pop"><div class="row"><b>' + esc((A.me && A.me.name) || 'Admin') + '</b><span>' + esc(A.role) + '</span></div><hr><button data-act="go" data-r="users">' + ic('user') + ' Profile &amp; roles</button><button data-act="logout">' + ic('logout') + ' Logout</button></div>'; },
    bell: function () {
      var p = A.$('#pop'); if (p.innerHTML) { p.innerHTML = ''; return; } var n = S.enq.filter(function (e) { return e.status === 'New'; });
      p.innerHTML = '<div class="menu-pop"><div class="row"><b>Notifications</b></div>' + (n.length ? n.slice(0, 5).map(function (e) { return '<button data-act="go" data-r="' + (e.type === 'wholesale' ? 'wenq' : 'enq') + '">' + ic('mail') + ' New enquiry from ' + esc(e.name) + '</button>'; }).join('') : '<div class="row">No new enquiries.</div>') + '</div>';
    },
    /* homepage */
    hpTab: function (t) { UI.tab = t.dataset.v; A.render(); }, hpEdit: function (t) { UI.tab = t.dataset.v; go('homepage'); },
    selSlide: function (t) { UI.sel = +t.dataset.i; A.render(); },
    addSlide: function () { A.H.slides.push({ id: 's' + Date.now(), title: 'New slide', subtitle: '', desc: '', img: '', imgM: '', btnLabel: 'Explore Collection', btnUrl: '/catalogue', active: true, start: '', end: '' }); A.dirty = true; UI.sel = A.H.slides.length - 1; UI.tab = 'hero'; A.render(); },
    dupSlide: function () { var s = A.clone(A.H.slides[UI.sel]); s.id = 's' + Date.now(); s.title += ' (copy)'; A.H.slides.splice(UI.sel + 1, 0, s); UI.sel++; A.dirty = true; A.render(); },
    delSlide: function () { var s = A.H.slides[UI.sel]; A.confirmBox({ title: 'Delete slide?', body: '<p><b>' + esc(s.title) + '</b> will be removed from the draft. The live website changes only when you publish.</p>', actions: [{ label: 'Delete slide', cls: 'dng', fn: function () { A.H.slides.splice(UI.sel, 1); UI.sel = Math.max(0, UI.sel - 1); A.dirty = true; A.closeModal(); A.render(); } }] }); },
    moveSlide: function (t) { var d = +t.dataset.d, i = UI.sel, j = i + d, a = A.H.slides; if (j < 0 || j >= a.length) return; var x = a[i]; a[i] = a[j]; a[j] = x; UI.sel = j; A.dirty = true; A.render(); },
    slideImg: function (t) { var k = t.dataset.k; A.pickImage(function (id) { A.H.slides[UI.sel][k] = id; A.dirty = true; A.render(); }); },
    slideImgRm: function (t) { A.H.slides[UI.sel][t.dataset.k] = ''; A.dirty = true; A.render(); },
    catImg: function (t) { var id = t.dataset.id; A.pickImage(function (img) { A.run(function () { return A.col('cats').doc(id).update({ image: img, updated: A.now() }); }, 'Category image saved.'); }); },
    catImgRm: function (t) { A.run(function () { return A.col('cats').doc(t.dataset.id).update({ image: '', updated: A.now() }); }, 'Image removed.'); },
    bbPick: function () { A.pickImage(function (id) { A.BB = id; A.brLogo(); }); }, bbRm: function () { A.BB = ''; A.brLogo(); },
    secImg: function () { A.pickImage(function (id) { A.H.sec.about.img = id; A.dirty = true; A.render(); }); }, secImgRm: function () { A.H.sec.about.img = ''; A.dirty = true; A.render(); },
    addTesti: function () { A.H.sec.testimonials.items = A.H.sec.testimonials.items || []; A.H.sec.testimonials.items.push({ name: '', quote: '' }); A.dirty = true; A.render(); },
    rmTesti: function (t) { A.H.sec.testimonials.items.splice(+t.dataset.i, 1); A.dirty = true; A.render(); },
    saveHome: function () { A.saveHome(); }, publishHome: function () { A.publishHome(); },
    moveSec: function (t) { var i = +t.dataset.i, j = i + +t.dataset.d, o = A.H.order; if (j < 0 || j >= o.length) return; var x = o[i]; o[i] = o[j]; o[j] = x; A.dirty = true; A.render(); },
    secOn: function (t) { A.H.sec[t.dataset.k].on = t.checked; A.dirty = true; A.rePreview(); },
    dev: function (t) { UI.dev = t.dataset.v; A.render(); }, pvMode: function (t) { UI.pvMode = t.dataset.v; A.render(); }, pvRefresh: function () { A.rePreview(); A.toast('Preview refreshed'); },
    pvSlide: function (t) { UI.pvi = +t.dataset.i; A.rePreview(); },
    /* filters panel */
    fTab: function (t) { UI.ftab = t.dataset.v; A.render(); },
    fvToggle: function (t) { UI.fv[t.dataset.id] = t.checked; var k = A.taxKeys().filter(function (k) { return S[k].some(function (x) { return x.id === t.dataset.id; }); })[0], o = S[k].find(function (x) { return x.id === t.dataset.id; }); if ((o.filterVisible !== false) === t.checked) delete UI.fv[t.dataset.id]; A.render(); },
    fvSave: function () { A.fvSave(); }, fvReset: function () { UI.fv = {}; A.render(); },
    fvAll: function (t) { var on = t.dataset.v === '1'; [UI.ftab].forEach(function (k) { S[k].forEach(function (x) { if ((x.filterVisible !== false) !== on) UI.fv[x.id] = on; else delete UI.fv[x.id]; }); }); A.render(); },
    /* products */
    addProduct: function () { A.productForm(); }, editProduct: function (t) { A.productForm(t.dataset.id); }, dupProduct: function (t) { A.dupProduct(t.dataset.id); }, delProduct: function (t) { A.delProduct(t.dataset.id); },
    saveProduct: function (t) { A.saveProduct(t.dataset.id); }, exportProducts: function () { A.exportProducts(); },
    pfMain: function () { A.pickImage(function (id) { A.PF.img = id; A.pfImgs(); }); }, pfMainRm: function () { A.PF.img = ''; A.pfImgs(); },
    pfGalAdd: function () { A.pickImage(function (id) { A.PF.gallery.push(id); A.pfImgs(); }); }, pfGalRm: function (t) { A.PF.gallery.splice(+t.dataset.i, 1); A.pfImgs(); },
    dpPage: function (t) { UI.dp.page = +t.dataset.p; A.rePlist(); }, pPage: function (t) { UI.prod.page = +t.dataset.p; A.rePlist(); },
    clearPF: function () { var f = UI.prod; f.q = f.brand = f.cat = f.var = f.feat = f.status = ''; f.page = 1; UI.dp.page = 1; A.render(); },
    pSel: function (t) { UI.prod.sel[t.dataset.id] = t.checked; A.bulkBar(); }, bulkClear: function () { UI.prod.sel = {}; A.rePlist(); },
    bulkArchive: function () { var ids = Object.keys(UI.prod.sel).filter(function (k) { return UI.prod.sel[k]; }); A.confirmBox({ title: 'Archive ' + ids.length + ' products?', body: '<p>They are hidden from the public catalogue and keep all their data.</p>', actions: [{ label: 'Archive', fn: async function () { if (await A.run(async function () { for (var id of ids) await A.col('products').doc(id).update({ status: 'archived', updated: A.now() }); }, ids.length + ' products archived.')) { A.log(ids.length + ' products archived'); UI.prod.sel = {}; A.closeModal(); } } }] }); },
    bulkCat: async function () { var cid = A.$('#bulkCat').value, ids = Object.keys(UI.prod.sel).filter(function (k) { return UI.prod.sel[k]; }); if (!cid) { A.toast('Choose a category first.', 'err'); return; } if (await A.run(async function () { for (var id of ids) { var p = S.products.find(function (x) { return x.id === id; }), a = (p.catIds || []).slice(); if (a.indexOf(cid) < 0) a.push(cid); await A.col('products').doc(id).update({ catIds: a, updated: A.now() }); } }, 'Category assigned to ' + ids.length + ' products.')) { A.log('Category assigned to ' + ids.length + ' products'); UI.prod.sel = {}; } },
    /* taxonomy */
    newGroup: function () { A.groupForm(); }, saveGroup: function () { A.saveGroup(); }, delGroup: function (t) { A.askDelGroup(t.dataset.k); }, renameTax: function (t) { A.labelForm(t.dataset.k); }, saveLabels: function (t) { A.saveLabels(t.dataset.k); }, resetLabels: function (t) { A.saveLabels(t.dataset.k, true); },
    addTax: function (t) { A.taxForm(t.dataset.k); }, editTax: function (t) { A.taxForm(t.dataset.k, t.dataset.id); }, dupTax: function (t) { A.dupTax(t.dataset.k, t.dataset.id); }, delTax: function (t) { A.askDelTax(t.dataset.k, t.dataset.id); },
    moveTax: function (t) { A.moveTax(t.dataset.k, +t.dataset.i, +t.dataset.d); }, saveTax: function (t) { A.saveTax(t.dataset.k, t.dataset.id); }, exportTax: function (t) { A.exportTax(t.dataset.k); },
    taxActive: function (t) { A.run(function () { return A.col(t.dataset.k).doc(t.dataset.id).update({ active: t.checked, updated: A.now() }); }, t.checked ? 'Activated.' : 'Deactivated. Hidden from new assignments and public filters.'); },
    tfPick: function () { A.pickImage(function (id) { A.TF.img = id; A.tfImg(); }); }, tfRm: function () { A.TF.img = ''; A.tfImg(); },
    /* pages / menu / brands */
    addPage: function () { A.pageForm(); }, editPage: function (t) { A.pageForm(t.dataset.id); }, dupPage: function (t) { A.dupPage(t.dataset.id); }, delPage: function (t) { A.delPage(t.dataset.id); }, prevPage: function (t) { A.prevPage(t.dataset.id); }, savePage: function (t) { A.savePage(t.dataset.id); },
    pgPick: function () { A.pickImage(function (id) { A.PGI = id; A.pgImg(); }); }, pgRm: function () { A.PGI = ''; A.pgImg(); },
    addMenu: function () { A.menuForm(); }, editMenu: function (t) { A.menuForm(t.dataset.id); }, saveMenu: function (t) { A.saveMenu(t.dataset.id); }, delMenu: function (t) { A.delMenu(t.dataset.id); }, moveMenu: function (t) { A.moveMenu(t.dataset.id, +t.dataset.d); },
    menuActive: function (t) { A.run(function () { return A.col('menu').doc(t.dataset.id).update({ active: t.checked }); }); },
    addBrand: function () { A.brandForm(); }, editBrand: function (t) { A.brandForm(t.dataset.id); }, saveBrand: function (t) { A.saveBrand(t.dataset.id); }, delBrand: function (t) { A.delBrand(t.dataset.id); },
    brandActive: function (t) { A.run(function () { return A.col('brands').doc(t.dataset.id).update({ active: t.checked }); }); }, blPick: function () { A.pickImage(function (id) { A.BL = id; A.brLogo(); }); }, blRm: function () { A.BL = ''; A.brLogo(); },
    /* bulk, inventory, enquiries, settings */
    bulkTemplate: function () { A.download('product-import-template.csv', A.csv([['name', 'sku', 'brand', 'categories', 'varieties', 'features', 'sizes', 'colours', 'material', 'mrp', 'price', 'stock', 'status', 'description']])); },
    bulkPick: function () { var i = document.createElement('input'); i.type = 'file'; i.accept = '.csv,text/csv'; i.onchange = function () { var f = i.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { A.bulkParse(String(r.result), f.name); }; r.readAsText(f); }; i.click(); },
    bulkGo: function () { A.bulkGo(); },
    invToggle: function (t) { A.run(function () { return A.db.doc('site/settings').set(Object.assign({}, S.settings, { inventory: t.checked })); }, t.checked ? 'Stock tracking on.' : 'Stock tracking off.'); },
    addEnq: function (t) { A.enqForm(t.dataset.w === '1'); }, saveEnq: function (t) { A.saveEnq(t.dataset.w === '1'); },
    delEnq: function (t) { var e = S.enq.find(function (x) { return x.id === t.dataset.id; }); A.confirmBox({ title: 'Delete enquiry?', body: '<p>Enquiry from <b>' + esc(e.name) + '</b> will be removed permanently.</p>', actions: [{ label: 'Delete', cls: 'dng', fn: async function () { if (await A.run(function () { return A.del('enq', e.id); }, 'Enquiry deleted.')) A.closeModal(); } }] }); },
    saveSettings: function () { var v = function (i) { return A.$('#' + i); }; var o = Object.assign({}, S.settings, { company: v('st_name').value, phone: v('st_phone').value.trim(), whatsapp: v('st_wa').value.trim(), location: v('st_loc').value, siteUrl: v('st_site').value.trim(), email: v('st_mail').value.trim(), showPrices: v('st_prices').checked }); A.run(function () { return A.db.doc('site/settings').set(o); }, 'Settings saved.').then(function (ok) { if (ok) A.log('General settings updated'); }); },
    saveSeo: function () { var o = Object.assign({}, S.settings, { seoTitle: A.$('#se_title').value, seoDesc: A.$('#se_desc').value }); A.run(function () { return A.db.doc('site/settings').set(o); }, 'SEO settings saved.').then(function (ok) { if (ok) A.log('SEO settings updated'); }); }
  };
  var INP = {
    pq: function (t) { UI.prod.q = t.value; UI.prod.page = 1; UI.dp.page = 1; A.rePlist(); },
    pf: function (t) { var f = t.dataset.f; UI.prod[f] = f === 'size' ? +t.value : t.value; UI.prod.page = 1; A.rePlist(); },
    fq: function (t) { UI.fq = t.value; var pos = t.selectionStart; A.render(); var n = A.$('[data-act-input="fq"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } },
    nq: function (t) { UI.nq = t.value; A.$('#notelist').innerHTML = A.noteList(A.noteItems()); },
    tq: function (t) { UI.tx[t.dataset.k] = Object.assign({ q: '', status: '', sort: 'order' }, UI.tx[t.dataset.k], { q: t.value }); A.$('#txlist').innerHTML = A.txList(t.dataset.k); },
    tstatus: function (t) { UI.tx[t.dataset.k] = Object.assign({ q: '', status: '', sort: 'order' }, UI.tx[t.dataset.k], { status: t.value }); A.$('#txlist').innerHTML = A.txList(t.dataset.k); },
    tsort: function (t) { UI.tx[t.dataset.k] = Object.assign({ q: '', status: '', sort: 'order' }, UI.tx[t.dataset.k], { sort: t.value }); A.$('#txlist').innerHTML = A.txList(t.dataset.k); },
    eq: function (t) { UI.enqf = t.value; A.render(); var n = A.$('[data-act-input="eq"]'); if (n) { n.focus(); n.setSelectionRange(t.value.length, t.value.length); } }
  };
  var CHG = {
    stock: function (t) { var v = t.value.trim(); if (v !== '' && (isNaN(v) || +v < 0)) { A.toast('Stock must be zero or more.', 'err'); return; } A.run(function () { return A.col('products').doc(t.dataset.id).update({ stock: v === '' ? '' : +v, updated: A.now() }); }, 'Stock saved.'); },
    enqStatus: function (t) { A.run(function () { return A.col('enq').doc(t.dataset.id).update({ status: t.value }); }, 'Status updated.'); },
    enqFollow: function (t) { A.run(function () { return A.col('enq').doc(t.dataset.id).update({ follow: t.value }); }, 'Follow-up date saved.'); },
    enqNotes: function (t) { A.run(function () { return A.col('enq').doc(t.dataset.id).update({ notes: t.value }); }, 'Notes saved.'); }
  };

  document.addEventListener('click', function (e) {
    var pop = A.$('#pop'); if (pop && pop.innerHTML && !e.target.closest('#pop') && !e.target.closest('[data-act="userMenu"],[data-act="bell"]')) pop.innerHTML = '';
    if (e.target.id === 'modal') { A.closeModal(); return; }
    var t = e.target.closest('[data-act]'); if (!t) { if (e.target.classList.contains('scrim')) document.body.classList.remove('nav-open'); return; }
    var fn = ACT[t.dataset.act]; if (!fn) return;
    if (t.tagName === 'INPUT' && t.type === 'checkbox') { fn(t, e); return; }
    if (t.tagName === 'A' && !t.hasAttribute('href')) e.preventDefault();
    if (t.tagName === 'INPUT') return;
    fn(t, e);
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('input[type=checkbox][data-act]')) return;
    if (t.dataset.bind) { var v = t.dataset.type === 'bool' ? t.checked : t.dataset.type === 'number' ? (t.value === '' ? '' : +t.value) : t.value; A.hpSet(t.dataset.bind, v); if (t.dataset.type === 'bool') A.refresh(true); else A.rePreview(); return; }
    if (t.dataset.actChange && CHG[t.dataset.actChange]) CHG[t.dataset.actChange](t);
    else if (t.dataset.actInput && t.tagName === 'SELECT' && INP[t.dataset.actInput]) INP[t.dataset.actInput](t);
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.bind && t.dataset.type !== 'bool') { var v = t.dataset.type === 'number' ? (t.value === '' ? '' : +t.value) : t.value; A.hpSet(t.dataset.bind, v); A.rePreview(); var sb = A.$('.slidebox'); if (sb && /^slides\./.test(t.dataset.bind)) { var s = A.H.slides[UI.sel]; sb.innerHTML = '<b>' + esc(s.title || 'Slide title') + '</b><span>' + esc(s.subtitle) + '</span>' + (s.btnLabel ? '<em>' + esc(s.btnLabel) + '</em>' : ''); } return; }
    if (t.dataset.actInput && t.tagName !== 'SELECT' && INP[t.dataset.actInput]) INP[t.dataset.actInput](t);
  });
  window.addEventListener('beforeunload', function (e) { if (A.dirty || Object.keys(UI.fv).length) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && A.modalOpen) A.closeModal(); });

  /* ---------- boot ---------- */
  A.boot = async function () {
    A.render();
    try { A.db = await window.claude.use('db'); } catch (e) { A.db = null; }
    try { A.assets = await window.claude.use('assets'); } catch (e) { A.assets = null; }
    try { A.user = await window.claude.use('user'); } catch (e) { A.user = null; }
    if (A.user) { try { var m = await A.user.me(); A.me = { id: m && m.id, name: (m && (m.name || '')) || 'Admin' }; } catch (e) { /* ignore */ } try { A.role = A.user.isOwner() ? 'Super Admin' : A.user.canEdit() ? 'Admin' : (A.user.can && A.user.can('data.write') === false) ? 'Viewer' : 'Staff'; } catch (e) { /* ignore */ } }
    if (A.me && !A.me.name) A.me.name = 'Admin';
    if (!A.db) { A.render(); return; }
    if (A.assets) { try { var l = await A.assets.list(); A.storage = l.usage; } catch (e) { /* optional */ } }
    var onErr = function (e) { A.toast('Live data error: ' + A.errMsg(e), 'err'); };
    A.subGroup = function (n) { A.col(n).onSnapshot(function (snap) { S[n] = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); S[n].sort(A.byOrder); A.refresh(); }, onErr); };
    ['cats', 'vars', 'feats', 'brands', 'products', 'pages', 'menu', 'enq', 'notes'].forEach(function (n) {
      A.col(n).onSnapshot(function (snap) { S[n] = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); if (n !== 'products' && n !== 'enq' && n !== 'pages' && n !== 'notes') S[n].sort(A.byOrder); S.loaded[n] = true; A.refresh(); }, onErr);
    });
    A.col('activity').orderBy('ts', 'desc').limit(30).onSnapshot(function (snap) { S.activity = snap.docs.map(function (d) { return d.data(); }); A.refresh(); }, onErr);
    A.db.doc('site/home_draft').onSnapshot(function (s) { if (!A.dirty) A.H = s.exists ? Object.assign(A.defHome(), s.data()) : A.defHome(); S.loaded.draft = true; A.refresh(); }, onErr);
    A.db.doc('site/home_live').onSnapshot(function (s) { S.live = s.exists ? s.data() : null; S.loaded.live = true; A.refresh(); }, onErr);
    A.db.doc('site/settings').onSnapshot(function (s) { S.settings = s.exists ? s.data() : {}; A.applyLabels(); A.syncGroups(); A.syncNav(); A.refresh(); }, onErr);
  };
  A.boot();
})(window.A);
