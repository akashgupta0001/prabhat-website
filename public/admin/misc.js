/* Pages, menu, brands, bulk upload, inventory, enquiries, settings, SEO, users */
(function (A) {
  'use strict';
  var esc = A.esc, ic = A.ic, S = A.S, UI = A.UI, V = A.V;
  function head(t, p, btns) { return '<div class="page-head"><div><h2>' + t + '</h2><p>' + p + '</p></div><span class="sp"></span>' + (btns || '') + '</div>'; }
  function t(label, id, v, type, ph) { return '<label class="fld"><span>' + label + '</span><input type="' + (type || 'text') + '" id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></label>'; }
  function head2(title) { return '<div class="sh-h"><h3>' + title + '</h3><button class="ic-btn" data-act="closeModal" aria-label="Close">' + ic('x') + '</button></div>'; }
  function foot(btn) { return '<div class="sh-f"><button class="btn" data-act="closeModal">Cancel</button>' + btn + '</div>'; }
  function pill(s) { return s === 'published' ? '<span class="pill ok">Published</span>' : s === 'archived' ? '<span class="pill no">Archived</span>' : '<span class="pill wn">Draft</span>'; }

  /* ----- pages ----- */
  V.pages = function () {
    var l = S.pages.slice().sort(function (a, b) { return String(a.title).localeCompare(b.title); });
    return head('Pages', 'Create and manage content pages', '<button class="btn pri" data-act="addPage">' + ic('plus') + ' Add Page</button>') + '<div class="card">' + (l.length ? '<div class="tw"><table class="t"><thead><tr><th>Title</th><th>URL</th><th>Parent</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>' + l.map(function (p) {
      var par = p.parent ? (S.pages.find(function (x) { return x.id === p.parent; }) || {}).title || '—' : '—';
      return '<tr><td class="cell-name">' + esc(p.title) + '</td><td class="cell-s">/' + esc(p.slug) + '</td><td>' + esc(par) + '</td><td>' + pill(p.status) + '</td><td class="cell-s">' + A.fdate(p.updated) + '</td><td><div class="acts"><button class="ibtn" data-act="prevPage" data-id="' + p.id + '" aria-label="Preview" title="Preview">' + ic('eye') + '</button><button class="ibtn" data-act="editPage" data-id="' + p.id + '" aria-label="Edit">' + ic('edit') + '</button><button class="ibtn" data-act="dupPage" data-id="' + p.id + '" aria-label="Duplicate">' + ic('copy') + '</button><button class="ibtn r" data-act="delPage" data-id="' + p.id + '" aria-label="Archive or delete">' + ic('trash') + '</button></div></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty"><b>No pages yet.</b><span>Create About, Contact or any other page.</span><button class="btn pri" data-act="addPage">Add Page</button></div>') + '</div>';
  };
  A.pageForm = function (id) {
    var p = id ? A.clone(S.pages.find(function (x) { return x.id === id; })) : { status: 'draft' }; A.PGI = p.img || '';
    A.modal(head2(id ? 'Edit Page' : 'Add Page') + '<div class="sh-b"><div class="g2">' + t('Page title *', 'pg_title', p.title) + t('URL slug', 'pg_slug', p.slug, 'text', 'auto from title') + '</div>' +
      '<div class="g2"><label class="fld"><span>Parent page</span><select id="pg_parent"><option value="">None</option>' + S.pages.filter(function (x) { return x.id !== id; }).map(function (x) { return '<option value="' + x.id + '"' + (p.parent === x.id ? ' selected' : '') + '>' + esc(x.title) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>Status</span><select id="pg_status">' + ['draft', 'published', 'archived'].map(function (s) { return '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + s[0].toUpperCase() + s.slice(1) + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="fld"><span>Content</span><textarea id="pg_content" style="min-height:180px">' + esc(p.content || '') + '</textarea></label><div class="fld"><span>Featured image</span><div class="gal" id="pgImg"></div></div>' +
      '<div class="g2">' + t('SEO title', 'pg_seot', p.seoTitle) + t('SEO description', 'pg_seod', p.seoDesc) + '</div><p class="err" id="pg_err" role="alert"></p></div>' + foot('<button class="btn pri" data-act="savePage" data-id="' + (id || '') + '">Save Page</button>'), 'lg');
    A.pgImg();
  };
  A.pgImg = function () { var g = A.$('#pgImg'); if (g) g.innerHTML = '<div class="thumb" style="width:56px;height:56px;' + A.bg(A.PGI) + '">' + (A.PGI ? '' : ic('image')) + '</div><button class="btn sm" data-act="pgPick">' + (A.PGI ? 'Change' : 'Upload') + '</button>' + (A.PGI ? '<button class="btn sm dng" data-act="pgRm">Remove</button>' : ''); };
  A.savePage = async function (id) {
    var v = A.mv, err = A.$('#pg_err'), title = v('pg_title').trim(); if (!title) { err.textContent = 'Page title is required.'; return; }
    var slug = A.slug(v('pg_slug') || title); if (S.pages.some(function (p) { return p.id !== id && p.slug === slug; })) { err.textContent = 'The URL slug "' + slug + '" is already used by another page.'; return; }
    var o = Object.assign({}, id ? S.pages.find(function (p) { return p.id === id; }) : {}, { id: id || undefined, title: title, slug: slug, parent: v('pg_parent'), status: v('pg_status'), content: v('pg_content'), img: A.PGI, seoTitle: v('pg_seot'), seoDesc: v('pg_seod') });
    if (await A.run(function () { return A.save('pages', o); }, 'Page saved.')) { A.log('Page ' + (id ? 'updated' : 'created') + ': ' + title + (o.status === 'published' ? ' (published)' : '')); A.closeModal(); }
  };
  A.dupPage = async function (id) {
    var o = A.clone(S.pages.find(function (p) { return p.id === id; })), n = 2, s = o.slug + '-copy'; while (S.pages.some(function (p) { return p.slug === s; })) s = o.slug + '-copy-' + n++;
    delete o.id; delete o.created; o.title += ' (Copy)'; o.slug = s; o.status = 'draft'; if (await A.run(function () { return A.save('pages', o); }, 'Page duplicated as a draft.')) A.log('Page duplicated: ' + o.title);
  };
  A.delPage = function (id) {
    var p = S.pages.find(function (x) { return x.id === id; }), used = S.menu.filter(function (m) { return m.pageId === id; }).length;
    A.confirmBox({ title: 'Archive or delete page?', body: '<p><b>' + esc(p.title) + '</b></p><p>Archiving keeps the page but removes it from the site. Deleting is permanent. Products and other records are not affected.' + (used ? ' ' + used + ' menu item(s) point to this page and will be switched off.' : '') + '</p>', actions: [
      { label: 'Archive', fn: async function () { var o = A.clone(p); o.status = 'archived'; if (await A.run(function () { return A.save('pages', o); }, 'Page archived.')) { A.log('Page archived: ' + p.title); A.closeModal(); } } },
      { label: 'Delete permanently', cls: 'dng', fn: async function () { if (await A.run(async function () { for (var m of S.menu.filter(function (m) { return m.pageId === id; })) await A.col('menu').doc(m.id).update({ active: false }); await A.del('pages', id); }, 'Page deleted.')) { A.log('Page deleted: ' + p.title); A.closeModal(); } } }] });
  };
  A.prevPage = function (id) {
    var p = S.pages.find(function (x) { return x.id === id; });
    A.modal(head2('Preview: ' + esc(p.title)) + '<div class="sh-b"><p class="cell-s">/' + esc(p.slug) + ' · ' + esc(p.status) + '</p>' + (p.img ? '<div class="slidebox" style="' + A.bg(p.img) + ';aspect-ratio:16/6"></div>' : '') + '<h2>' + esc(p.title) + '</h2><div style="white-space:pre-line">' + esc(p.content || '(no content)') + '</div></div>');
  };

  /* ----- menu ----- */
  V.menu = function () {
    var top = S.menu.filter(function (m) { return !m.parent; }), out = [];
    top.forEach(function (m) { out.push([m, 0]); S.menu.filter(function (c) { return c.parent === m.id; }).forEach(function (c) { out.push([c, 1]); }); });
    return head('Menu Management', 'Edit the website navigation', '<button class="btn pri" data-act="addMenu">' + ic('plus') + ' Add Menu Item</button>') + '<div class="card">' + (out.length ? '<div class="tw"><table class="t"><thead><tr><th>Order</th><th>Label</th><th>Destination</th><th>Active</th><th>Actions</th></tr></thead><tbody>' + out.map(function (r) {
      var m = r[0], sibs = S.menu.filter(function (x) { return (x.parent || '') === (m.parent || ''); }), i = sibs.indexOf(m), dest = m.type === 'page' ? '/' + ((S.pages.find(function (p) { return p.id === m.pageId; }) || {}).slug || '(missing page)') : m.url;
      return '<tr><td><div class="acts"><button class="ibtn" data-act="moveMenu" data-id="' + m.id + '" data-d="-1" ' + (i === 0 ? 'disabled' : '') + ' aria-label="Move up">' + ic('aup') + '</button><button class="ibtn" data-act="moveMenu" data-id="' + m.id + '" data-d="1" ' + (i === sibs.length - 1 ? 'disabled' : '') + ' aria-label="Move down">' + ic('adn') + '</button></div></td><td class="cell-name" style="padding-left:' + (10 + r[1] * 22) + 'px">' + (r[1] ? '↳ ' : '') + esc(m.label) + '</td><td class="cell-s">' + esc(dest) + (m.type === 'external' ? ' <span class="pill bl">external</span>' : '') + '</td><td><label class="sw"><input type="checkbox" data-act="menuActive" data-id="' + m.id + '" ' + (m.active !== false ? 'checked' : '') + ' aria-label="Active"><i></i></label></td><td><div class="acts"><button class="ibtn" data-act="editMenu" data-id="' + m.id + '" aria-label="Edit">' + ic('edit') + '</button><button class="ibtn r" data-act="delMenu" data-id="' + m.id + '" aria-label="Delete">' + ic('trash') + '</button></div></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty"><b>No menu items yet.</b><button class="btn pri" data-act="addMenu">Add Menu Item</button></div>') + '</div>';
  };
  A.menuForm = function (id) {
    var m = id ? S.menu.find(function (x) { return x.id === id; }) : { type: 'page', active: true };
    A.modal(head2(id ? 'Edit Menu Item' : 'Add Menu Item') + '<div class="sh-b">' + t('Label *', 'mn_label', m.label) + '<label class="fld"><span>Links to</span><select id="mn_type">' + [['page', 'A page on this site'], ['external', 'External link'], ['path', 'Catalogue or custom path']].map(function (o) { return '<option value="' + o[0] + '"' + (m.type === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>Page (when linking to a page)</span><select id="mn_page"><option value="">Choose…</option>' + S.pages.map(function (p) { return '<option value="' + p.id + '"' + (m.pageId === p.id ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') + '</select></label>' + t('URL or path (external / custom)', 'mn_url', m.url, 'text', 'https://… or /catalogue') +
      '<label class="fld"><span>Parent item</span><select id="mn_parent"><option value="">None (top level)</option>' + S.menu.filter(function (x) { return x.id !== id && !x.parent; }).map(function (x) { return '<option value="' + x.id + '"' + (m.parent === x.id ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></label><p class="err" id="mn_err" role="alert"></p></div>' + foot('<button class="btn pri" data-act="saveMenu" data-id="' + (id || '') + '">Save</button>'), 'sm');
  };
  A.saveMenu = async function (id) {
    var v = A.mv, err = A.$('#mn_err'), label = v('mn_label').trim(), type = v('mn_type'); if (!label) { err.textContent = 'Label is required.'; return; }
    if (type === 'page' && !v('mn_page')) { err.textContent = 'Choose a page.'; return; } if (type !== 'page' && !v('mn_url').trim()) { err.textContent = 'Enter a URL or path.'; return; }
    if (type === 'external' && !/^https?:\/\//i.test(v('mn_url').trim())) { err.textContent = 'External links must start with http:// or https://'; return; }
    var old = id ? S.menu.find(function (x) { return x.id === id; }) : null, o = Object.assign({ active: true, order: S.menu.length }, old || {}, { id: id || undefined, label: label, type: type, pageId: type === 'page' ? v('mn_page') : '', url: type === 'page' ? '' : v('mn_url').trim(), parent: v('mn_parent') });
    if (await A.run(function () { return A.save('menu', o); }, 'Menu item saved.')) { A.log('Menu item ' + (id ? 'updated' : 'added') + ': ' + label); A.closeModal(); }
  };
  A.moveMenu = async function (id, d) {
    var m = S.menu.find(function (x) { return x.id === id; }), sibs = S.menu.filter(function (x) { return (x.parent || '') === (m.parent || ''); }), i = sibs.indexOf(m), j = i + d; if (j < 0 || j >= sibs.length) return;
    var a = sibs.slice(); a[i] = a[j]; a[j] = m; await A.run(async function () { for (var n = 0; n < a.length; n++) if (a[n].order !== n) await A.col('menu').doc(a[n].id).update({ order: n }); });
  };
  A.delMenu = function (id) {
    var m = S.menu.find(function (x) { return x.id === id; }), kids = S.menu.filter(function (x) { return x.parent === id; });
    A.confirmBox({ title: 'Delete menu item?', body: '<p><b>' + esc(m.label) + '</b> will be removed from the navigation. The page it links to is not deleted.' + (kids.length ? ' Its ' + kids.length + ' sub-items become top-level.' : '') + '</p>', actions: [{ label: 'Delete', cls: 'dng', fn: async function () { if (await A.run(async function () { for (var k of kids) await A.col('menu').doc(k.id).update({ parent: '' }); await A.del('menu', id); }, 'Menu item deleted.')) { A.log('Menu item deleted: ' + m.label); A.closeModal(); } } }] });
  };

  /* ----- brands ----- */
  V.brands = function () {
    return head('Brand Management', 'Brands shown on the website and in product forms', '<button class="btn pri" data-act="addBrand">' + ic('plus') + ' Add Brand</button>') + '<div class="card">' + (S.brands.length ? '<div class="tw"><table class="t"><thead><tr><th></th><th>Name</th><th>Slug</th><th>Tagline</th><th>Products</th><th>Active</th><th>Actions</th></tr></thead><tbody>' + S.brands.map(function (b) {
      var n = S.products.filter(function (p) { return p.brand === b.id; }).length; return '<tr><td><div class="thumb" style="' + A.bg(b.logo) + '">' + (b.logo ? '' : esc(b.name.charAt(0))) + '</div></td><td class="cell-name">' + esc(b.name) + '</td><td class="cell-s">' + esc(b.slug) + '</td><td>' + esc(b.tagline || '—') + '</td><td>' + n + '</td><td><label class="sw"><input type="checkbox" data-act="brandActive" data-id="' + b.id + '" ' + (b.active !== false ? 'checked' : '') + ' aria-label="Active"><i></i></label></td><td><div class="acts"><button class="ibtn" data-act="editBrand" data-id="' + b.id + '" aria-label="Edit">' + ic('edit') + '</button><button class="ibtn r" data-act="delBrand" data-id="' + b.id + '" aria-label="Delete">' + ic('trash') + '</button></div></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty"><b>No brands yet.</b><button class="btn pri" data-act="addBrand">Add Brand</button></div>') + '</div>';
  };
  A.brandForm = function (id) {
    var b = id ? A.clone(S.brands.find(function (x) { return x.id === id; })) : { active: true }; A.BL = b.logo || ''; A.BB = b.bg || '';
    A.modal(head2(id ? 'Edit Brand' : 'Add Brand') + '<div class="sh-b">' + t('Brand name *', 'br_name', b.name) + t('Tagline', 'br_tag', b.tagline) + '<label class="fld"><span>Description</span><textarea id="br_desc">' + esc(b.desc || '') + '</textarea></label><label class="fld"><span>More details (shown on the homepage brand card)</span><textarea id="br_details" rows="4" placeholder="Models, specialities, who it is for...">' + esc(b.details || '') + '</textarea></label><div class="fld"><span>Logo</span><div class="gal" id="brLogo"></div></div><div class="fld"><span>Card background image</span><div class="gal" id="brBg"></div></div><p class="err" id="br_err" role="alert"></p></div>' + foot('<button class="btn pri" data-act="saveBrand" data-id="' + (id || '') + '">Save</button>'), 'sm');
    A.brLogo();
  };
  A.brBg = function () { var g = A.$('#brBg'); if (g) g.innerHTML = '<div class="thumb" style="width:56px;height:56px;' + A.bg(A.BB) + '">' + (A.BB ? '' : ic('image')) + '</div><button class="btn sm" data-act="bbPick">' + (A.BB ? 'Change' : 'Upload') + '</button>' + (A.BB ? '<button class="btn sm dng" data-act="bbRm">Remove</button>' : ''); };
  A.brLogo = function () { A.brBg(); var g = A.$('#brLogo'); if (g) g.innerHTML = '<div class="thumb" style="width:56px;height:56px;' + A.bg(A.BL) + '">' + (A.BL ? '' : ic('image')) + '</div><button class="btn sm" data-act="blPick">' + (A.BL ? 'Change' : 'Upload') + '</button>' + (A.BL ? '<button class="btn sm dng" data-act="blRm">Remove</button>' : ''); };
  A.saveBrand = async function (id) {
    var v = A.mv, err = A.$('#br_err'), name = v('br_name').trim(); if (!name) { err.textContent = 'Brand name is required.'; return; }
    var slug = A.slug(name); if (S.brands.some(function (b) { return b.id !== id && b.slug === slug; })) { err.textContent = 'A brand with this name already exists.'; return; }
    var o = Object.assign({ active: true, order: S.brands.length }, id ? S.brands.find(function (b) { return b.id === id; }) : {}, { id: id || slug, name: name, slug: slug, tagline: v('br_tag'), desc: v('br_desc'), details: v('br_details'), logo: A.BL, bg: A.BB || '' });
    if (await A.run(function () { return A.save('brands', o); }, 'Brand saved.')) { A.log('Brand ' + (id ? 'updated' : 'added') + ': ' + name); A.closeModal(); }
  };
  A.delBrand = function (id) {
    var b = S.brands.find(function (x) { return x.id === id; }), n = S.products.filter(function (p) { return p.brand === id; }).length;
    if (n) { A.confirmBox({ title: b.name + ' is in use', body: '<p><b>' + n + '</b> products use this brand, so it cannot be deleted. Deactivate it instead to hide it from new products and the homepage.</p>', actions: [{ label: 'Deactivate', fn: async function () { if (await A.run(function () { return A.col('brands').doc(id).update({ active: false }); }, 'Brand deactivated.')) A.closeModal(); } }] }); return; }
    A.confirmBox({ title: 'Delete brand?', body: '<p><b>' + esc(b.name) + '</b> has no products. Deleting is permanent.</p>', actions: [{ label: 'Delete', cls: 'dng', fn: async function () { if (await A.run(function () { return A.del('brands', id); }, 'Brand deleted.')) { A.log('Brand deleted: ' + b.name); A.closeModal(); } } }] });
  };

  /* ----- bulk upload ----- */
  var COLS = ['name', 'sku', 'brand', 'categories', 'varieties', 'features', 'sizes', 'colours', 'material', 'mrp', 'price', 'stock', 'status', 'description'];
  A.BU = null;
  V.bulk = function () {
    var r = A.BU;
    return head('Bulk Upload', 'Import products from a CSV file', '<button class="btn" data-act="bulkTemplate">' + ic('download') + ' Download template</button>') +
      '<div class="card pad"><p style="margin-top:0">Upload a <b>.csv</b> file (in Excel use Save As, CSV UTF-8). Required columns: <b>name</b>, <b>sku</b>, <b>brand</b>. Use semicolons to separate several categories, varieties, features, sizes or colours. Names must match existing records. Nothing is saved until you confirm the import.</p><button class="btn pri" data-act="bulkPick">' + ic('upload') + ' Choose CSV file</button></div>' +
      (r ? '<div class="card"><div class="ph-row"><div><h2>Import preview: ' + esc(r.file) + '</h2><p>' + r.ok.length + ' valid rows · ' + r.bad.length + ' rows with problems</p></div><span class="sp"></span><button class="btn pri" data-act="bulkGo" ' + (r.ok.length ? '' : 'disabled') + '>Import ' + r.ok.length + ' valid rows</button></div>' +
        (r.bad.length ? '<div class="tw"><table class="t"><thead><tr><th>Row</th><th>SKU</th><th>Name</th><th>Problem</th></tr></thead><tbody>' + r.bad.map(function (b) { return '<tr><td>' + b.line + '</td><td>' + esc(b.sku) + '</td><td>' + esc(b.name) + '</td><td><span class="pill er">' + esc(b.err) + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="pad"><span class="pill ok">No problems found</span></div>') + '</div>' : '');
  };
  A.bulkParse = function (text, file) {
    var rows = A.parseCsv(text); if (!rows.length) { A.toast('The file is empty.', 'err'); return; }
    var hdr = rows[0].map(function (h) { return h.trim().toLowerCase(); }), idx = {}; COLS.forEach(function (c) { idx[c] = hdr.indexOf(c); });
    if (idx.name < 0 || idx.sku < 0 || idx.brand < 0) { A.toast('Missing required column(s): name, sku, brand.', 'err'); return; }
    var seen = {}, ok = [], bad = [], g = function (r, c) { return idx[c] < 0 ? '' : (r[idx[c]] || '').trim(); };
    var map = function (k, s, bucket, line) { var ids = []; String(s).split(';').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (n) { var o = S[k].find(function (x) { return x.name.toLowerCase() === n.toLowerCase(); }); if (o) ids.push(o.id); else bucket.push(A.TAX[k].label + ' "' + n + '" not found'); }); return ids; };
    rows.slice(1).forEach(function (r, n) {
      var line = n + 2, name = g(r, 'name'), sku = g(r, 'sku'), problems = [];
      if (!name) problems.push('Name missing'); if (!sku) problems.push('SKU missing');
      var br = S.brands.find(function (b) { return b.name.toLowerCase() === g(r, 'brand').toLowerCase() || b.id === g(r, 'brand').toLowerCase(); }); if (!br) problems.push('Brand "' + g(r, 'brand') + '" not found');
      var key = sku.toLowerCase(); if (sku && seen[key]) problems.push('Duplicate SKU in file (row ' + seen[key] + ')'); if (sku && S.products.some(function (p) { return String(p.sku).toLowerCase() === key; })) problems.push('SKU already exists in catalogue');
      var catIds = map('cats', g(r, 'categories'), problems), varIds = map('vars', g(r, 'varieties'), problems), featIds = map('feats', g(r, 'features'), problems);
      var nums = {}; ['mrp', 'price', 'stock'].forEach(function (c) { var s = g(r, c); if (s === '') nums[c] = ''; else if (isNaN(Number(s)) || Number(s) < 0) problems.push(c + ' is not a valid number'); else nums[c] = Number(s); });
      var st = g(r, 'status').toLowerCase() || 'draft'; if (['draft', 'active', 'archived'].indexOf(st) < 0) problems.push('Status must be draft, active or archived');
      if (sku && !seen[key]) seen[key] = line;
      if (problems.length) bad.push({ line: line, sku: sku, name: name, err: problems.join('; ') });
      else ok.push({ name: name, sku: sku, slug: A.slug(name + '-' + sku), brand: br.id, catIds: catIds, varIds: varIds, featIds: featIds, sizes: g(r, 'sizes').split(';').map(function (x) { return x.trim(); }).filter(Boolean), colours: g(r, 'colours').split(';').map(function (x) { return x.trim(); }).filter(Boolean), material: g(r, 'material'), mrp: nums.mrp, price: nums.price, stock: nums.stock, status: st, desc: g(r, 'description'), img: '', gallery: [] });
    });
    A.BU = { file: file, ok: ok, bad: bad }; A.refresh(true);
  };
  A.bulkGo = async function () {
    var ok = A.BU.ok, done = 0;
    var res = await A.run(async function () { for (var i = 0; i < ok.length; i++) { await A.save('products', Object.assign({}, ok[i])); done++; } }, ok.length + ' products imported.');
    if (res) { A.log('Catalogue import completed: ' + ok.length + ' products' + (A.BU.bad.length ? ' (' + A.BU.bad.length + ' rows skipped)' : '')); A.BU = null; A.refresh(true); } else if (done) A.toast(done + ' rows were imported before the error.', 'err');
  };

  /* ----- inventory ----- */
  V.inventory = function () {
    var on = S.settings.inventory === true;
    return head('Inventory', 'Optional stock tracking. Leave a quantity blank to hide stock for that product.') + '<div class="card"><div class="pad" style="display:flex;gap:10px;align-items:center"><label class="sw"><input type="checkbox" data-act="invToggle" ' + (on ? 'checked' : '') + ' aria-label="Track stock"><i></i></label><span>' + (on ? 'Stock is shown to customers where a quantity is set.' : 'Stock tracking is off. Quantities are saved but not shown on the website.') + '</span></div>' +
      (S.products.length ? '<div class="tw"><table class="t"><thead><tr><th>Product</th><th>SKU</th><th>Status</th><th>Stock quantity</th></tr></thead><tbody>' + S.products.slice().sort(function (a, b) { return String(a.sku).localeCompare(String(b.sku)); }).map(function (p) { return '<tr><td class="cell-name">' + esc(p.name) + '</td><td class="cell-s">' + esc(p.sku) + '</td><td>' + (p.status === 'active' ? '<span class="pill ok">Active</span>' : '<span class="pill no">' + esc(p.status) + '</span>') + '</td><td><input type="number" min="0" style="max-width:110px" data-act-change="stock" data-id="' + p.id + '" value="' + esc(p.stock == null ? '' : p.stock) + '" aria-label="Stock for ' + esc(p.name) + '"></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty">No products yet.</div>') + '</div>';
  };

  /* ----- enquiries ----- */
  var ESTAT = ['New', 'Contacted', 'In Progress', 'Converted', 'Closed'];
  V.enquiries = function (type) {
    var ws = type === 'wenq', l = S.enq.filter(function (e) { return ws ? e.type === 'wholesale' : e.type !== 'wholesale'; }).slice().sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); }), q = (UI.enqf || '').toLowerCase();
    if (q) l = l.filter(function (e) { return (e.name + ' ' + e.phone + ' ' + e.message + ' ' + e.status).toLowerCase().indexOf(q) > -1; });
    return head(ws ? 'Wholesale Enquiries' : 'Customer Enquiries', 'Track every enquiry, add notes and set follow-up dates', '<button class="btn pri" data-act="addEnq" data-w="' + (ws ? 1 : 0) + '">' + ic('plus') + ' Add Enquiry</button>') +
      '<div class="note">Enquiries sent through the website forms arrive here automatically with the status New. You can also add enquiries yourself, for example from calls or WhatsApp.</div><div class="card"><div class="tools"><input type="search" placeholder="Search enquiries" aria-label="Search" data-act-input="eq" value="' + esc(UI.enqf) + '"></div>' +
      (l.length ? '<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Name / phone</th><th>Message</th><th>Source</th><th>Status</th><th>Follow-up</th><th>Notes</th><th></th></tr></thead><tbody>' + l.map(function (e) { return '<tr><td class="cell-s">' + A.fdate(e.created) + '</td><td><div class="cell-name">' + esc(e.name) + '</div><div class="cell-s">' + esc(e.phone) + '</div></td><td><div class="clip" style="max-width:240px" title="' + esc(e.message) + '">' + esc(e.message || '—') + '</div></td><td>' + esc(e.source || '—') + '</td><td><select data-act-change="enqStatus" data-id="' + e.id + '" aria-label="Status" style="width:auto">' + ESTAT.map(function (s) { return '<option' + (e.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td><td><input type="date" data-act-change="enqFollow" data-id="' + e.id + '" value="' + esc(e.follow || '') + '" aria-label="Follow-up date" style="width:auto"></td><td><input type="text" data-act-change="enqNotes" data-id="' + e.id + '" value="' + esc(e.notes || '') + '" aria-label="Notes" style="min-width:150px"></td><td><button class="ibtn r" data-act="delEnq" data-id="' + e.id + '" aria-label="Delete">' + ic('trash') + '</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty"><b>No enquiries yet.</b><span>Add one when a customer contacts you.</span></div>') + '</div>';
  };
  A.enqForm = function (w) {
    A.modal(head2('Add ' + (w ? 'Wholesale ' : '') + 'Enquiry') + '<div class="sh-b">' + t('Name *', 'eq_name') + t('Phone', 'eq_phone') + '<label class="fld"><span>Product (optional)</span><select id="eq_prod"><option value="">—</option>' + S.products.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name + ' (' + p.sku + ')') + '</option>'; }).join('') + '</select></label><label class="fld"><span>Message</span><textarea id="eq_msg"></textarea></label><label class="fld"><span>Source</span><select id="eq_src">' + ['WhatsApp', 'Phone call', 'Walk-in', 'Website form', 'Other'].map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></label><p class="err" id="eq_err" role="alert"></p></div>' + foot('<button class="btn pri" data-act="saveEnq" data-w="' + (w ? 1 : 0) + '">Save</button>'), 'sm');
  };
  A.saveEnq = async function (w) {
    var v = A.mv; if (!v('eq_name').trim()) { A.$('#eq_err').textContent = 'Name is required.'; return; }
    var p = S.products.find(function (x) { return x.id === v('eq_prod'); }), o = { name: v('eq_name').trim(), phone: v('eq_phone').trim(), type: w ? 'wholesale' : p ? 'product' : 'general', productId: p ? p.id : '', message: v('eq_msg'), source: v('eq_src'), status: 'New', notes: '', follow: '' };
    if (await A.run(function () { return A.save('enq', o); }, 'Enquiry saved.')) { A.log('Enquiry added: ' + o.name); A.closeModal(); }
  };

  /* ----- settings, SEO, users ----- */
  V.settings = function () {
    var s = S.settings;
    return head('General Settings', 'Company details and website options') + '<div class="card pad" style="max-width:720px"><div class="g2">' + t('Company name', 'st_name', s.company || 'PRABHAT INDUSTRIES') + t('Business phone', 'st_phone', s.phone || '9818185161') + t('WhatsApp number', 'st_wa', s.whatsapp || s.phone || '9818185161') + t('Location', 'st_loc', s.location || 'Bahadurgarh, Haryana, India') + '</div>' + t('Public website address', 'st_site', s.siteUrl, 'url', 'https://…') +
      '<p class="cell-s">No email address or street address is set. Add them here only when the company confirms them.</p>' + t('Email (optional)', 'st_mail', s.email, 'text') + '<div class="row-sw"><label class="sw"><input type="checkbox" id="st_prices" ' + (s.showPrices ? 'checked' : '') + '><i></i></label><span>Show prices on the website</span></div><button class="btn pri" data-act="saveSettings">Save Settings</button></div>';
  };
  V.seo = function () {
    var s = S.settings, miss = S.products.filter(function (p) { return !p.seoTitle || !p.seoDesc; }).length, missP = S.pages.filter(function (p) { return !p.seoTitle || !p.seoDesc; }).length;
    return head('SEO Settings', 'Default search engine text') + '<div class="card pad" style="max-width:720px">' + t('Site title', 'se_title', s.seoTitle) + '<label class="fld"><span>Meta description</span><textarea id="se_desc">' + esc(s.seoDesc || '') + '</textarea></label><button class="btn pri" data-act="saveSeo">Save SEO Settings</button><hr style="border:0;border-top:1px solid var(--line);margin:16px 0"><dl class="kv"><dt>Products without SEO text</dt><dd>' + miss + ' of ' + S.products.length + '</dd><dt>Pages without SEO text</dt><dd>' + missP + ' of ' + S.pages.length + '</dd></dl></div>';
  };
  V.users = function () {
    return head('Users & Roles', 'Who can use this control panel') + '<div class="card pad" style="max-width:720px"><dl class="kv"><dt>Signed in as</dt><dd>' + esc((A.me && A.me.name) || 'Admin') + '</dd><dt>Role</dt><dd>' + esc(A.role) + '</dd></dl><hr style="border:0;border-top:1px solid var(--line);margin:14px 0">' +
      '<p style="margin-top:0">This control panel has one administrator account. Sign-in uses a username and password that are stored securely in your Cloudflare project, not in the website itself.</p>' +
      '<p><b>To change the username or password:</b> open your Cloudflare dashboard, go to Workers &amp; Pages, choose this project, then Settings and Variables and Secrets. Edit <code>ADMIN_USER</code> or <code>ADMIN_PASSWORD</code>, save, and redeploy. Everyone is signed out when the password changes.</p>' +
      '<p class="cell-s">Sign-in locks for 15 minutes after 8 wrong attempts from the same connection. Sessions last 12 hours.</p></div>';
  };
})(window.A);

/* ----- private notes (admin only; never shown on the public website) ----- */
(function (A) {
  'use strict';
  var esc = A.esc, ic = A.ic, S = A.S, UI = A.UI, V = A.V;
  var COLORS = { yellow: '#FFF3B0', blue: '#D6E8FF', green: '#D5F5DC', pink: '#FFD9E4', plain: '' };
  UI.nq = UI.nq || '';
  A.noteItems = function () {
    var q = UI.nq.toLowerCase();
    return S.notes.filter(function (n) { return !q || ((n.title || '') + ' ' + (n.body || '')).toLowerCase().indexOf(q) > -1; })
      .sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.updated).localeCompare(String(a.updated)); });
  };
  V.notes = function () {
    var l = A.noteItems();
    return '<div class="page-head"><div><h2>Notes</h2><p>Private notes for you and your team. They stay inside this control panel and are never shown on the website.</p></div><span class="sp"></span><button class="btn pri" data-act="addNote">' + ic('plus') + ' New note</button></div>' +
      '<div class="card"><div class="tools"><input type="search" placeholder="Search notes" aria-label="Search notes" data-act-input="nq" value="' + esc(UI.nq) + '"></div><div id="notelist" class="pad">' + A.noteList(l) + '</div></div>';
  };
  A.noteList = function (l) {
    if (!l.length) return '<div class="empty"><b>' + (S.notes.length ? 'No notes match.' : 'No notes yet.') + '</b><span>' + (S.notes.length ? 'Clear the search.' : 'Write reminders, to-dos, product ideas or anything you want to keep here.') + '</span>' + (S.notes.length ? '' : '<button class="btn pri" data-act="addNote">' + ic('plus') + ' New note</button>') + '</div>';
    return '<div class="ngrid">' + l.map(function (n) {
      return '<div class="ncard" style="' + (COLORS[n.color] ? 'background:' + COLORS[n.color] : '') + '"><div class="nh"><b>' + esc(n.title || 'Untitled') + '</b><span class="acts"><button class="ibtn' + (n.pinned ? ' on' : '') + '" data-act="pinNote" data-id="' + n.id + '" aria-label="' + (n.pinned ? 'Unpin' : 'Pin') + '" title="' + (n.pinned ? 'Unpin' : 'Pin to top') + '">' + ic('star') + '</button><button class="ibtn" data-act="editNote" data-id="' + n.id + '" aria-label="Edit">' + ic('edit') + '</button><button class="ibtn r" data-act="delNote" data-id="' + n.id + '" aria-label="Delete">' + ic('trash') + '</button></span></div>' +
        '<div class="nb">' + esc(n.body || '') + '</div><small>' + (n.pinned ? 'Pinned · ' : '') + 'Updated ' + A.fdate(n.updated) + '</small></div>';
    }).join('') + '</div>';
  };
  A.noteForm = function (id) {
    var n = id ? S.notes.find(function (x) { return x.id === id; }) : { color: 'yellow' }; if (!n) return; A.NC = n.color || 'plain';
    A.modal('<div class="sh-h"><h3>' + (id ? 'Edit note' : 'New note') + '</h3><button class="ic-btn" data-act="closeModal" aria-label="Close">' + ic('x') + '</button></div><div class="sh-b">' +
      '<label class="fld"><span>Title</span><input id="nt_title" value="' + esc(n.title || '') + '" placeholder="e.g. Call the sole supplier"></label>' +
      '<label class="fld"><span>Note</span><textarea id="nt_body" rows="9" placeholder="Write your note here...">' + esc(n.body || '') + '</textarea></label>' +
      '<div class="fld"><span>Colour</span><div class="ncol">' + Object.keys(COLORS).map(function (c) { return '<button type="button" data-act="noteColor" data-c="' + c + '" class="' + (A.NC === c ? 'on' : '') + '" style="background:' + (COLORS[c] || '#fff') + '" aria-label="' + c + '"></button>'; }).join('') + '</div></div><p class="err" id="nt_err" role="alert"></p></div>' +
      '<div class="sh-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="saveNote" data-id="' + (id || '') + '">Save note</button></div>', 'sm');
  };
  A.saveNote = async function (id) {
    var title = A.mv('nt_title').trim(), body = A.mv('nt_body').trim(); if (!title && !body) { A.$('#nt_err').textContent = 'Write something first.'; return; }
    var o = Object.assign({}, id ? S.notes.find(function (x) { return x.id === id; }) : {}, { id: id || undefined, title: title, body: body, color: A.NC || 'plain' });
    if (await A.run(function () { return A.save('notes', o); }, 'Note saved.')) A.closeModal();
  };
  A.delNote = function (id) {
    var n = S.notes.find(function (x) { return x.id === id; }); if (!n) return;
    A.confirmBox({ title: 'Delete this note?', body: '<p><b>' + esc(n.title || 'Untitled') + '</b> will be deleted permanently.</p>', actions: [{ label: 'Delete', cls: 'dng', fn: async function () { if (await A.run(function () { return A.del('notes', id); }, 'Note deleted.')) A.closeModal(); } }] });
  };
})(window.A);
