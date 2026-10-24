/* Core: utilities, icons, state, database wiring, modal, toast, shell */
window.A = window.A || {};
(function (A) {
  'use strict';
  A.$ = function (s, r) { return (r || document).querySelector(s); };
  A.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  A.slug = function (s) { return String(s || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
  A.now = function () { return new Date().toISOString(); };
  A.clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  A.ago = function (iso) {
    if (!iso) return '';
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' hours ago'; if (s < 172800) return '1 day ago';
    return Math.floor(s / 86400) + ' days ago';
  };
  A.fdate = function (iso) { if (!iso) return '—'; var d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
  A.money = function (n) { return n === '' || n == null || isNaN(n) ? '—' : '₹' + Number(n).toLocaleString('en-IN'); };
  A.imgUrl = function (id) { return id ? '/img/' + id : ''; };
  A.bg = function (id) { return id ? 'background-image:url(' + A.imgUrl(id) + ')' : ''; };

  var P = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M14 2v6h6"/>',
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    wh: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    cog: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="m18 15-6-6-6 6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    ok: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    help: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    desk: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    tab: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    aup: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>', adn: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    trend: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>'
  };
  A.ic = function (n, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || '') + '</svg>'; };

  /* state */
  A.S = { cats: [], vars: [], feats: [], brands: [], products: [], pages: [], menu: [], enq: [], activity: [], settings: {}, live: null, loaded: {} };
  A.H = null; A.dirty = false; A.db = null; A.assets = null; A.user = null; A.me = null; A.role = 'Super Admin';
  A.UI = { route: 'dashboard', tab: 'hero', sel: 0, dev: 'desktop', pvMode: 'draft', pvi: 0, ftab: 'cats', fv: {}, fq: '', prod: { q: '', brand: '', cat: '', var: '', feat: '', status: '', sort: 'updated', page: 1, size: 10, sel: {} }, dp: { page: 1 }, tx: {}, enqf: '' };
  A.modalOpen = false; A.pending = false;

  A.col = function (n) { return A.db.collection(n); };
  A.wa = function () { var d = String(A.S.settings.whatsapp || A.S.settings.phone || '9818185161').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };
  A.byOrder = function (a, b) { return (a.order == null ? 1e9 : a.order) - (b.order == null ? 1e9 : b.order) || String(a.name || a.title || a.label || '').localeCompare(String(b.name || b.title || b.label || '')); };

  A.toast = function (msg, kind) {
    var d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = msg;
    A.$('#toast').appendChild(d); setTimeout(function () { d.remove(); }, kind === 'err' ? 6000 : 3200);
  };
  A.errMsg = function (e) { return (e && (e.message || e.code)) || 'Something went wrong'; };
  A.run = async function (fn, ok) {
    if (!A.db) { A.toast('The database is not reachable. Check your connection and sign in again.', 'err'); return false; }
    try { await fn(); if (ok) A.toast(ok, 'ok'); return true; } catch (e) { A.toast('Could not save: ' + A.errMsg(e), 'err'); return false; }
  };
  A.save = async function (colName, obj) {
    obj.id = obj.id || A.col(colName).doc().id; obj.updated = A.now();
    if (!obj.created) obj.created = obj.updated;
    await A.col(colName).doc(obj.id).set(obj); return obj;
  };
  A.del = function (colName, id) { return A.col(colName).doc(id).delete(); };
  A.log = async function (text) {
    try { await A.col('activity').add({ text: text, ts: A.now(), who: (A.me && A.me.name) || 'Admin' }); } catch (e) { /* log is best effort */ }
  };

  /* modal */
  A.modal = function (html, size) {
    var m = A.$('#modal'); m.innerHTML = '<div class="sheet ' + (size || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    m.hidden = false; A.modalOpen = true;
    var f = m.querySelector('input:not([type=checkbox]),select,textarea'); if (f) f.focus();
  };
  A.closeModal = function () { var m = A.$('#modal'); m.hidden = true; m.innerHTML = ''; A.modalOpen = false; if (A.pending) A.refresh(); };
  A.mv = function (id) { var e = A.$('#modal #' + id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : ''; };
  A.confirmBox = function (o) {
    A.confirmFns = (o.actions || []).map(function (a) { return a.fn; });
    A.modal('<div class="sh-h"><h3>' + A.esc(o.title) + '</h3><button class="ic-btn" data-act="closeModal" aria-label="Close">' + A.ic('x') + '</button></div><div class="sh-b">' + o.body + '</div><div class="sh-f"><button class="btn" data-act="closeModal">Cancel</button>' +
      (o.actions || []).map(function (a, i) { return '<button class="btn ' + (a.cls || '') + '" data-act="confirmDo" data-i="' + i + '">' + A.esc(a.label) + '</button>'; }).join('') + '</div>', 'sm');
  };

  /* file pick + upload */
  A.pickImage = function (cb) {
    var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp,image/gif';
    i.onchange = async function () {
      var f = i.files && i.files[0]; if (!f) return;
      if (!A.assets) { A.toast('Image upload is not available right now.', 'err'); return; }
      if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { A.toast('Choose a PNG, JPG, WebP or GIF image.', 'err'); return; }
      if (f.size > 25 * 1024 * 1024) { A.toast('Image is larger than 25 MB. Please choose a smaller one.', 'err'); return; }
      try { var r = await A.assets.upload(f); cb(r.id); } catch (e) { A.toast('Upload failed: ' + A.errMsg(e), 'err'); }
    };
    i.click();
  };

  A.download = async function (filename, text) {
    try { var d = await window.claude.use('downloads'); if (!d) throw new Error('Downloads are not available.'); await d.save({ filename: filename, data: text }); A.toast('File ready: ' + filename, 'ok'); }
    catch (e) { if (e && e.code === 'declined') return; A.toast('Could not save file: ' + A.errMsg(e), 'err'); }
  };
  A.csv = function (rows) { return rows.map(function (r) { return r.map(function (c) { c = c == null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n'); };
  A.parseCsv = function (t) {
    var rows = [], r = [], c = '', q = false, i, ch; t = t.replace(/^﻿/, '');
    for (i = 0; i < t.length; i++) {
      ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; if (r.length > 1 || r[0] !== '') rows.push(r); r = []; }
      else c += ch;
    }
    if (c !== '' || r.length) { r.push(c); rows.push(r); }
    return rows;
  };

  A.pager = function (total, page, size, act) {
    var pages = Math.max(1, Math.ceil(total / size)), b = [], i, show = [];
    for (i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1 || (page <= 3 && i <= 4)) show.push(i);
    var out = '<button data-act="' + act + '" data-p="' + (page - 1) + '" ' + (page <= 1 ? 'disabled' : '') + ' aria-label="Previous">‹</button>', last = 0;
    show.forEach(function (n) { if (n - last > 1) out += '<button disabled>…</button>'; out += '<button class="' + (n === page ? 'on' : '') + '" data-act="' + act + '" data-p="' + n + '">' + n + '</button>'; last = n; });
    out += '<button data-act="' + act + '" data-p="' + (page + 1) + '" ' + (page >= pages ? 'disabled' : '') + ' aria-label="Next">›</button>';
    return out;
  };

  /* usage counts */
  A.TAX = {
    cats: { label: 'Category', plural: 'Categories', field: 'catIds', route: 'categories', ic: 'folder' },
    vars: { label: 'Variety', plural: 'Varieties', field: 'varIds', route: 'varieties', ic: 'palette' },
    feats: { label: 'Feature', plural: 'Features', field: 'featIds', route: 'features', ic: 'star' }
  };
  A.useCount = function (k, id) { var f = A.TAX[k].field; return A.S.products.filter(function (p) { return (p[f] || []).indexOf(id) > -1; }).length; };
  A.names = function (k, ids) { return (ids || []).map(function (id) { var o = A.S[k].find(function (x) { return x.id === id; }); return o ? o.name : null; }).filter(Boolean); };
  A.canWrite = function () { return A.db && A.role !== 'Viewer'; };
})(window.A);
