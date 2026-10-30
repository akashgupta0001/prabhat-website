/* Products and taxonomy (categories, varieties, features) */
(function (A) {
  'use strict';
  var esc = A.esc, ic = A.ic, S = A.S, UI = A.UI;
  function brandName(id) { var b = S.brands.find(function (x) { return x.id === id; }); return b ? b.name : (id || '—'); }
  function statusPill(s) { return s === 'active' ? '<span class="pill ok">Active</span>' : s === 'archived' ? '<span class="pill no">Archived</span>' : '<span class="pill wn">Draft</span>'; }

  A.filteredProducts = function () {
    var f = UI.prod, q = f.q.trim().toLowerCase();
    var l = S.products.filter(function (p) {
      return (!q || (p.name + ' ' + p.sku).toLowerCase().indexOf(q) > -1) && (!f.brand || p.brand === f.brand) && (!f.cat || (p.catIds || []).indexOf(f.cat) > -1) &&
        (!f.var || (p.varIds || []).indexOf(f.var) > -1) && (!f.feat || (p.featIds || []).indexOf(f.feat) > -1) && (!f.status || p.status === f.status);
    });
    l.sort(function (a, b) { return f.sort === 'name' ? a.name.localeCompare(b.name) : f.sort === 'sku' ? String(a.sku).localeCompare(String(b.sku)) : String(b.updated || '').localeCompare(String(a.updated || '')); });
    return l;
  };
  function rows(list, compact) {
    return list.map(function (p) {
      var cats = A.names('cats', p.catIds).join(', '), vars = A.names('vars', p.varIds).join(', '), feats = A.names('feats', p.featIds).join(', ');
      return '<tr>' + (compact ? '' : '<td><input class="chk" type="checkbox" data-act="pSel" data-id="' + p.id + '" ' + (UI.prod.sel[p.id] ? 'checked' : '') + ' aria-label="Select"></td>') +
        '<td><div class="thumb" style="' + A.bg(p.img) + '">' + (p.img ? '' : esc((p.name || '?').charAt(0))) + '</div></td><td><div class="cell-name">' + esc(p.name) + '</div>' + (compact ? '' : '<div class="cell-s">' + esc(p.sku) + '</div>') + '</td><td>' + esc(brandName(p.brand)) + '</td>' +
        '<td><div class="clip" title="' + esc(cats) + '">' + esc(cats || '—') + '</div></td><td><div class="clip" title="' + esc(vars) + '">' + esc(vars || '—') + '</div></td><td><div class="clip" title="' + esc(feats) + '">' + esc(feats || '—') + '</div></td>' +
        '<td>' + (p.price === '' || p.price == null ? '—' : A.money(p.price)) + '</td><td>' + statusPill(p.status) + '</td>' + (compact ? '' : '<td class="cell-s">' + A.fdate(p.updated) + '</td>') +
        '<td><div class="acts"><button class="ibtn" data-act="editProduct" data-id="' + p.id + '" aria-label="Edit" title="Edit">' + ic('edit') + '</button>' + (compact ? '' : '<button class="ibtn" data-act="dupProduct" data-id="' + p.id + '" aria-label="Duplicate" title="Duplicate">' + ic('copy') + '</button>') + '<button class="ibtn r" data-act="delProduct" data-id="' + p.id + '" aria-label="Delete or archive" title="Delete or archive">' + ic('trash') + '</button></div></td></tr>';
    }).join('');
  }
  A.prodCard = function (compact) {
    var f = UI.prod, list = A.filteredProducts(), size = compact ? 5 : f.size, page = compact ? UI.dp.page : f.page, pages = Math.max(1, Math.ceil(list.length / size));
    if (page > pages) page = pages; if (compact) UI.dp.page = page; else f.page = page;
    var slice = list.slice((page - 1) * size, page * size), from = list.length ? (page - 1) * size + 1 : 0;
    var head = compact ? '<div class="ph-row"><span class="ti">' + ic('box') + '</span><div><h2>Product Catalogue Management</h2><p>Add, edit, delete and manage your products with advanced filtering</p></div><span class="sp"></span><input type="search" style="max-width:240px" placeholder="Search product name, SKU, or model..." aria-label="Search products" data-act-input="pq" value="' + esc(f.q) + '"><button class="btn pri" data-act="addProduct">Add Product</button></div>' : '';
    var th = '<tr>' + (compact ? '' : '<th></th>') + '<th>Image</th><th>Product Name</th><th>Brand</th><th>Category</th><th>Variety</th><th>Features</th><th>Price (₹)</th><th>Status</th>' + (compact ? '' : '<th>Updated</th>') + '<th>Actions</th></tr>';
    var body = !S.loaded.products ? '<div class="empty">Loading products…</div>' : slice.length ? '<div class="tw"><table class="t"><thead>' + th + '</thead><tbody>' + rows(slice, compact) + '</tbody></table></div>' :
      '<div class="empty"><b>' + (S.products.length ? 'No products match these filters.' : 'No products yet.') + '</b><span>' + (S.products.length ? 'Clear the filters or try another search.' : 'Add your first product, or import a CSV file.') + '</span><div class="acts">' + (S.products.length ? '<button class="btn" data-act="clearPF">Clear filters</button>' : '<button class="btn pri" data-act="addProduct">Add Product</button><button class="btn" data-act="go" data-r="bulk">Bulk Upload</button>') + '</div></div>';
    return '<div class="card">' + head + (compact ? '' : '') + body + '<div class="pager"><span>Showing ' + from + ' to ' + Math.min(page * size, list.length) + ' of ' + list.length + ' products</span><div class="pg">' + A.pager(list.length, page, size, compact ? 'dpPage' : 'pPage') + '</div></div></div>';
  };
  A.rePlist = function () { var d = A.$('#dashProd'), p = A.$('#plist'); if (d) d.innerHTML = A.prodCard(true); if (p) { p.innerHTML = A.prodCard(false); A.bulkBar(); } };
  A.bulkBar = function () { var b = A.$('#bulkbar'); if (!b) return; var n = Object.keys(UI.prod.sel).filter(function (k) { return UI.prod.sel[k]; }).length; b.hidden = !n; b.querySelector('b').textContent = n + ' selected'; };

  A.V.products = function () {
    var f = UI.prod;
    function opt(k, v, label, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + esc(label) + '</option>'; }
    var sel = function (field, ph, items) { return '<select data-act-input="pf" data-f="' + field + '" aria-label="' + ph + '">' + opt(0, '', ph, f[field]) + items.map(function (x) { return opt(0, x.id, x.name, f[field]); }).join('') + '</select>'; };
    return '<div class="page-head"><div><h2>Products</h2><p>Manage the product catalogue</p></div><span class="sp"></span><button class="btn" data-act="exportProducts">' + ic('download') + ' Export CSV</button><button class="btn" data-act="go" data-r="bulk">' + ic('upload') + ' Import CSV</button><button class="btn pri" data-act="addProduct">' + ic('plus') + ' Add Product</button></div>' +
      '<div class="card"><div class="tools"><input type="search" placeholder="Search by product name, SKU or model" aria-label="Search" data-act-input="pq" value="' + esc(f.q) + '">' + sel('brand', 'All brands', S.brands) + sel('cat', 'All categories', S.cats) + sel('var', 'All varieties', S.vars) + sel('feat', 'All features', S.feats) +
      '<select data-act-input="pf" data-f="status" aria-label="Status">' + [['', 'All statuses'], ['active', 'Active'], ['draft', 'Draft'], ['archived', 'Archived']].map(function (o) { return opt(0, o[0], o[1], f.status); }).join('') + '</select>' +
      '<select data-act-input="pf" data-f="sort" aria-label="Sort">' + [['updated', 'Sort: newest'], ['name', 'Sort: name'], ['sku', 'Sort: SKU']].map(function (o) { return opt(0, o[0], o[1], f.sort); }).join('') + '</select>' +
      '<select data-act-input="pf" data-f="size" aria-label="Page size">' + [10, 25, 50].map(function (n) { return opt(0, String(n), n + ' per page', String(f.size)); }).join('') + '</select><button class="btn sm" data-act="clearPF">Clear filters</button></div>' +
      '<div class="bulkbar" id="bulkbar" hidden><b></b><button class="btn sm" data-act="bulkArchive">Archive selected</button><select id="bulkCat" aria-label="Category" style="width:auto"><option value="">Assign category…</option>' + S.cats.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select><button class="btn sm" data-act="bulkCat">Apply</button><button class="btn sm" data-act="bulkClear">Clear</button></div></div>' +
      '<div id="plist">' + A.prodCard(false) + '</div>';
  };

  /* ---------- product form ---------- */
  A.PF = { img: '', gallery: [] };
  function chips(k, field, sel) {
    var all = S[k].filter(function (x) { return x.active !== false || sel.indexOf(x.id) > -1; });
    return '<div class="chips">' + (all.map(function (x) { return '<label><input type="checkbox" class="chk" data-grp="' + field + '" value="' + x.id + '" ' + (sel.indexOf(x.id) > -1 ? 'checked' : '') + '>' + esc(x.name) + (x.active === false ? ' (inactive)' : '') + '</label>'; }).join('') || '<span class="cell-s">None yet. Add them under Catalogue Management.</span>') + '</div>';
  }
  function pfImgs() {
    var m = A.$('#pfMain'), g = A.$('#pfGal');
    if (m) m.innerHTML = '<div class="thumb" style="width:64px;height:64px;' + A.bg(A.PF.img) + '">' + (A.PF.img ? '' : ic('image')) + '</div><button class="btn sm" data-act="pfMain">' + (A.PF.img ? 'Change' : 'Upload') + '</button>' + (A.PF.img ? '<button class="btn sm dng" data-act="pfMainRm">Remove</button>' : '');
    if (g) g.innerHTML = A.PF.gallery.map(function (id, i) { return '<div class="thumb" style="' + A.bg(id) + '"><button data-act="pfGalRm" data-i="' + i + '" aria-label="Remove image">×</button></div>'; }).join('') + '<button class="btn sm" data-act="pfGalAdd">' + ic('plus') + ' Add image</button>';
  }
  A.pfImgs = pfImgs;
  A.productForm = function (id) {
    var p = id ? S.products.find(function (x) { return x.id === id; }) : null; p = p ? A.clone(p) : { status: 'draft', brand: (S.brands[0] || {}).id || '', catIds: [], varIds: [], featIds: [], sizes: [], colours: [] };
    A.PF = { img: p.img || '', gallery: (p.gallery || []).slice(), id: id || '', sp: ((p.sizePrices && p.sizePrices.length) ? p.sizePrices : (p.sizes || []).map(function (z) { return { size: z, mrp: '' }; })).map(function (r) { return { size: r.size, mrp: r.mrp }; }) };
    function t(label, idn, v, type, ph) { return '<label class="fld"><span>' + label + '</span><input type="' + (type || 'text') + '" id="' + idn + '" value="' + esc(v == null ? '' : v) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></label>'; }
    A.modal('<div class="sh-h"><h3>' + (id ? 'Edit Product' : 'Add Product') + '</h3><button class="ic-btn" data-act="closeModal" aria-label="Close">' + ic('x') + '</button></div><div class="sh-b">' +
      '<div class="g2">' + t('Product name *', 'pf_name', p.name) + t('SKU / model number *', 'pf_sku', p.sku) + '</div>' +
      '<div class="g3"><label class="fld"><span>Brand *</span><select id="pf_brand">' + S.brands.map(function (b) { return '<option value="' + b.id + '"' + (p.brand === b.id ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>Status</span><select id="pf_status">' + [['draft', 'Draft'], ['active', 'Active'], ['archived', 'Archived']].map(function (o) { return '<option value="' + o[0] + '"' + (p.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' + t('URL slug', 'pf_slug', p.slug, 'text', 'auto from name') + '</div>' +
      '<label class="fld"><span>Description</span><textarea id="pf_desc">' + esc(p.desc || '') + '</textarea></label>' +
      '<div class="fld"><span>Main image</span><div class="gal" id="pfMain"></div></div><div class="fld"><span>Gallery images</span><div class="gal" id="pfGal"></div></div>' +
      '<label class="fld"><span>Dropbox folder link (optional): shows every photo in that folder</span><input id="pf_dbxf" value="' + esc(p.dropboxFolder || '') + '" placeholder="https://www.dropbox.com/scl/fo/..."><small class="cell-s">In Dropbox: right-click the folder, Share, Copy link. New photos you add to the folder appear on the website within a few minutes. Needs the one-time Dropbox connection under Settings → General Settings.</small></label>' +
      '<label class="fld"><span>Or single Dropbox photo links (optional, one link per line)</span><textarea id="pf_dbx" rows="4" placeholder="Paste Dropbox share links of the photos, one per line">' + esc((p.dropbox || []).join('\n')) + '</textarea><small class="cell-s">In Dropbox open each photo, click Share, Copy link and paste here.</small></label>' +
      '<div class="fld"><span>Categories</span>' + chips('cats', 'catIds', p.catIds || []) + '</div><div class="fld"><span>Varieties</span>' + chips('vars', 'varIds', p.varIds || []) + '</div><div class="fld"><span>Features</span>' + chips('feats', 'featIds', p.featIds || []) + '</div>' +
      A.taxKeys().slice(3).map(function (k) { return '<div class="fld"><span>' + esc(A.TAX[k].plural) + '</span>' + chips(k, A.TAX[k].field, p[A.TAX[k].field] || []) + '</div>'; }).join('') +
      '<div class="g2">' + t('Available colours (comma separated)', 'pf_colours', (p.colours || []).join(', ')) + t('Sold as a set of how many sizes? (optional)', 'pf_setof', p.setOf, 'number', 'e.g. 5') + '</div>' + t('Material details', 'pf_material', p.material) +
      '<div class="fld"><span>Sizes and MRP (each size can have its own MRP)</span><div id="pfSizes"></div></div>' +
      '<div class="g3">' + t('Default MRP (used when a size has no MRP of its own)', 'pf_mrp', p.mrp, 'number') + t('Selling price (optional)', 'pf_price', p.price, 'number') + t('Stock quantity (optional)', 'pf_stock', p.stock, 'number') + '</div>' +
      '<div class="g2"><label class="row-sw"><label class="sw"><input type="checkbox" id="pf_featured" ' + (p.featured ? 'checked' : '') + '><i></i></label><span>Featured product</span></label><label class="row-sw"><label class="sw"><input type="checkbox" id="pf_home" ' + (p.home ? 'checked' : '') + '><i></i></label><span>Show on homepage</span></label></div>' +
      '<div class="g2">' + t('SEO title', 'pf_seot', p.seoTitle) + t('SEO description', 'pf_seod', p.seoDesc) + '</div><p class="err" id="pf_err" role="alert"></p></div>' +
      '<div class="sh-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="saveProduct" data-id="' + (id || '') + '">Save Product</button></div>', 'lg');
    pfImgs(); A.pfSizes();
  };
  A.pfSizesRead = function () {
    var z = document.querySelectorAll('#pfSizes .pz'), m = document.querySelectorAll('#pfSizes .pm');
    if (z.length) A.PF.sp = Array.prototype.map.call(z, function (e, i) { return { size: e.value.trim(), mrp: m[i].value }; });
  };
  A.pfSizes = function () {
    var g = A.$('#pfSizes'); if (!g) return;
    g.innerHTML = '<div class="szform">' + A.PF.sp.map(function (r, i) { return '<div class="szr"><input class="pz" aria-label="Size" placeholder="Size e.g. 6" value="' + esc(r.size) + '"><input class="pm" type="number" min="0" aria-label="MRP for this size" placeholder="MRP ₹" value="' + esc(r.mrp == null ? '' : r.mrp) + '"><button type="button" class="ibtn r" data-act="pfSzRm" data-i="' + i + '" aria-label="Remove size">' + ic('trash') + '</button></div>'; }).join('') + '</div>' +
      '<div class="szadd"><button type="button" class="btn sm" data-act="pfSzAdd">' + ic('plus') + ' Add size</button><input id="pfQuick" placeholder="Quick add: 6,7,8,9,10 or 6-10"><button type="button" class="btn sm" data-act="pfSzQuick">Add these sizes</button></div>';
  };
  A.saveProduct = async function (id) {
    A.pfSizesRead(); var v = A.mv, err = A.$('#pf_err'), name = v('pf_name').trim(), sku = v('pf_sku').trim();
    function fail(m) { err.textContent = m; }
    if (!name) return fail('Product name is required.'); if (!sku) return fail('SKU / model number is required.'); if (!v('pf_brand')) return fail('Choose a brand. Add one under Brand Management first.');
    if (S.products.some(function (p) { return p.id !== id && String(p.sku).toLowerCase() === sku.toLowerCase(); })) return fail('Another product already uses SKU "' + sku + '". SKUs must be unique.');
    var slug = A.slug(v('pf_slug') || name + '-' + sku); if (S.products.some(function (p) { return p.id !== id && p.slug === slug; })) return fail('The URL slug "' + slug + '" is already used by another product.');
    var num = function (x) { x = String(x).trim(); return x === '' ? '' : Number(x); };
    var mrp = num(v('pf_mrp')), price = num(v('pf_price')), stock = num(v('pf_stock'));
    if ([mrp, price, stock].some(function (n) { return n !== '' && (isNaN(n) || n < 0); })) return fail('Prices and stock must be zero or more.');
    var grp = function (f) { return Array.prototype.map.call(document.querySelectorAll('#modal input[data-grp="' + f + '"]:checked'), function (e) { return e.value; }); };
    var list = function (s) { return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
    var old = id ? S.products.find(function (p) { return p.id === id; }) : null;
    var dbx = []; var bad = '';
    v('pf_dbx').split(/\s+/).filter(Boolean).forEach(function (u) {
      try { var x = new URL(u); if (!/(^|\.)dropbox\.com$/.test(x.hostname)) { bad = 'Only Dropbox links are allowed in the Dropbox box: ' + u; return; } if (/^\/(scl\/fo|sh)\//.test(x.pathname)) { bad = 'That is a folder link. Paste it in the Dropbox folder link box above instead.'; return; } x.searchParams.delete('dl'); x.searchParams.set('raw', '1'); dbx.push(x.toString()); } catch (e) { bad = 'This is not a valid link: ' + u; }
    });
    var folder = v('pf_dbxf').trim();
    if (folder) { try { var fu = new URL(folder); if (!/(^|\.)dropbox\.com$/.test(fu.hostname) || !/^\/(scl\/fo|sh)\//.test(fu.pathname)) bad = 'The folder link must be a Dropbox folder share link (it contains /scl/fo/).'; else { fu.searchParams.delete('dl'); folder = fu.toString(); } } catch (e) { bad = 'The Dropbox folder link is not a valid link.'; } }
    if (bad) return fail(bad);
    var o = Object.assign({}, old || {}, { id: id || undefined, name: name, sku: sku, slug: slug, brand: v('pf_brand'), status: v('pf_status'), desc: v('pf_desc'), img: A.PF.img, gallery: A.PF.gallery, dropbox: dbx, dropboxFolder: folder, catIds: grp('catIds'), varIds: grp('varIds'), featIds: grp('featIds'),
      sizes: (A.PF.sp || []).filter(function (r) { return r.size; }).map(function (r) { return r.size; }), sizePrices: (A.PF.sp || []).filter(function (r) { return r.size; }).map(function (r) { return { size: r.size, mrp: r.mrp === '' || r.mrp == null ? '' : Number(r.mrp) }; }), setOf: v('pf_setof') === '' ? '' : Number(v('pf_setof')), colours: list(v('pf_colours')), material: v('pf_material'), mrp: mrp, price: price, stock: stock, featured: v('pf_featured'), home: v('pf_home'), seoTitle: v('pf_seot'), seoDesc: v('pf_seod') });
    A.taxKeys().slice(3).forEach(function (k) { o[A.TAX[k].field] = grp(A.TAX[k].field); });
    if (await A.run(function () { return A.save('products', o); }, 'Product saved.')) { A.log('Product ' + (id ? 'updated' : 'added') + ': ' + name); A.closeModal(); }
  };
  A.dupProduct = async function (id) {
    var p = A.clone(S.products.find(function (x) { return x.id === id; })); if (!p) return;
    var sku = p.sku + '-COPY', n = 2; while (S.products.some(function (x) { return String(x.sku).toLowerCase() === sku.toLowerCase(); })) sku = p.sku + '-COPY' + n++;
    delete p.id; delete p.created; p.sku = sku; p.name = p.name + ' (Copy)'; p.slug = A.slug(p.name + '-' + sku); p.status = 'draft';
    if (await A.run(function () { return A.save('products', p); }, 'Duplicate created as a draft.')) A.log('Product duplicated: ' + p.name);
  };
  A.delProduct = function (id) {
    var p = S.products.find(function (x) { return x.id === id; }); if (!p) return;
    A.confirmBox({ title: 'Delete or archive product?', body: '<p><b>' + esc(p.name) + '</b> (' + esc(p.sku) + ')</p><p>Archiving hides it from the public catalogue and keeps its data. Deleting removes it permanently.</p>', actions: [
      { label: 'Archive', fn: async function () { p = A.clone(p); p.status = 'archived'; if (await A.run(function () { return A.save('products', p); }, 'Product archived.')) { A.log('Product archived: ' + p.name); A.closeModal(); } } },
      { label: 'Delete permanently', cls: 'dng', fn: async function () { if (await A.run(function () { return A.del('products', id); }, 'Product deleted.')) { A.log('Product deleted: ' + p.name); A.closeModal(); } } }] });
  };
  A.exportProducts = function () {
    var head = ['name', 'sku', 'brand', 'categories', 'varieties', 'features', 'sizes', 'colours', 'material', 'mrp', 'price', 'stock', 'status', 'description'];
    var rowsx = S.products.map(function (p) { return [p.name, p.sku, brandName(p.brand), A.names('cats', p.catIds).join(';'), A.names('vars', p.varIds).join(';'), A.names('feats', p.featIds).join(';'), (p.sizes || []).join(';'), (p.colours || []).join(';'), p.material, p.mrp, p.price, p.stock, p.status, p.desc]; });
    A.download('products.csv', A.csv([head].concat(rowsx)));
  };

  /* ---------- taxonomy ---------- */
  function txState(k) { return UI.tx[k] || (UI.tx[k] = { q: '', status: '', sort: 'order' }); }
  A.txList = function (k) {
    var T = A.TAX[k], st = txState(k), q = st.q.toLowerCase(), all = S[k], arrange = st.sort === 'order' && !q && !st.status;
    var l = all.filter(function (x) { return (!q || (x.name + ' ' + (x.desc || '')).toLowerCase().indexOf(q) > -1) && (!st.status || (st.status === 'active') === (x.active !== false)); });
    if (st.sort === 'name') l = l.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }); else if (st.sort === 'count') l = l.slice().sort(function (a, b) { return A.useCount(k, b.id) - A.useCount(k, a.id); });
    if (!l.length) return '<div class="empty"><b>' + (all.length ? 'Nothing matches.' : 'No ' + T.plural.toLowerCase() + ' yet.') + '</b><span>' + (all.length ? 'Clear the search or filter.' : 'Add the first one. It becomes available in product forms straight away.') + '</span><button class="btn pri" data-act="addTax" data-k="' + k + '">' + ic('plus') + ' Add ' + T.label + '</button></div>';
    return '<div class="tw"><table class="t"><thead><tr><th>Order</th><th></th><th>Name</th><th>Slug</th><th>Description</th>' + (k === 'cats' ? '<th>Parent</th>' : k === 'feats' ? '<th>Filter group</th>' : '') + '<th>Products</th><th>Active</th><th>Filter</th><th>Actions</th></tr></thead><tbody>' +
      l.map(function (x) {
        var i = all.indexOf(x), par = k === 'cats' && x.parent ? (all.find(function (c) { return c.id === x.parent; }) || {}).name || '—' : '—';
        return '<tr><td><div class="acts"><button class="ibtn" data-act="moveTax" data-k="' + k + '" data-i="' + i + '" data-d="-1" ' + (!arrange || i === 0 ? 'disabled' : '') + ' aria-label="Move up">' + ic('aup') + '</button><button class="ibtn" data-act="moveTax" data-k="' + k + '" data-i="' + i + '" data-d="1" ' + (!arrange || i === all.length - 1 ? 'disabled' : '') + ' aria-label="Move down">' + ic('adn') + '</button></div></td>' +
          '<td><div class="thumb" style="' + A.bg(x.image) + '">' + (x.image ? '' : esc(x.name.charAt(0))) + '</div></td><td class="cell-name">' + esc(x.name) + '</td><td class="cell-s">' + esc(x.slug) + '</td><td><div class="clip">' + esc(x.desc || '—') + '</div></td>' + (k === 'cats' ? '<td>' + esc(par) + '</td>' : k === 'feats' ? '<td>' + esc(x.group || '—') + '</td>' : '') +
          '<td>' + A.useCount(k, x.id) + '</td><td><label class="sw"><input type="checkbox" data-act="taxActive" data-k="' + k + '" data-id="' + x.id + '" ' + (x.active !== false ? 'checked' : '') + ' aria-label="Active"><i></i></label></td><td>' + (x.filterVisible === false ? '<span class="pill no">Hidden</span>' : '<span class="pill ok">Shown</span>') + '</td>' +
          '<td><div class="acts"><button class="ibtn" data-act="editTax" data-k="' + k + '" data-id="' + x.id + '" aria-label="Edit">' + ic('edit') + '</button><button class="ibtn" data-act="dupTax" data-k="' + k + '" data-id="' + x.id + '" aria-label="Duplicate">' + ic('copy') + '</button><button class="ibtn r" data-act="delTax" data-k="' + k + '" data-id="' + x.id + '" aria-label="Delete">' + ic('trash') + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div>';
  };
  A.V.taxonomy = function (k) {
    var T = A.TAX[k], st = txState(k);
    return '<div class="page-head"><div><h2>' + T.plural + '</h2><p>' + S[k].length + ' total. Add as many as you need; there is no fixed limit.</p></div><span class="sp"></span><button class="btn" data-act="exportTax" data-k="' + k + '">' + ic('download') + ' Export CSV</button><button class="btn pri" data-act="addTax" data-k="' + k + '">' + ic('plus') + ' Add ' + T.label + '</button></div>' +
      '<div class="card"><div class="tools"><input type="search" placeholder="Search ' + T.plural.toLowerCase() + '" aria-label="Search" data-act-input="tq" data-k="' + k + '" value="' + esc(st.q) + '"><select data-act-input="tstatus" data-k="' + k + '" aria-label="Status"><option value="">All</option><option value="active"' + (st.status === 'active' ? ' selected' : '') + '>Active</option><option value="inactive"' + (st.status === 'inactive' ? ' selected' : '') + '>Inactive</option></select>' +
      '<select data-act-input="tsort" data-k="' + k + '" aria-label="Sort"><option value="order">Sort: manual order</option><option value="name"' + (st.sort === 'name' ? ' selected' : '') + '>Sort: name</option><option value="count"' + (st.sort === 'count' ? ' selected' : '') + '>Sort: product count</option></select></div><div id="txlist">' + A.txList(k) + '</div></div>';
  };
  A.taxForm = function (k, id) {
    var T = A.TAX[k], x = id ? A.clone(S[k].find(function (y) { return y.id === id; })) : { active: true, filterVisible: true }; A.TF = { img: x.image || '' };
    A.modal('<div class="sh-h"><h3>' + (id ? 'Edit ' : 'Add ') + T.label + '</h3><button class="ic-btn" data-act="closeModal" aria-label="Close">' + ic('x') + '</button></div><div class="sh-b">' +
      '<label class="fld"><span>Name *</span><input type="text" id="tf_name" value="' + esc(x.name || '') + '"></label><label class="fld"><span>Slug (unique)</span><input type="text" id="tf_slug" value="' + esc(x.slug || '') + '" placeholder="auto from name"></label>' +
      '<label class="fld"><span>Description</span><textarea id="tf_desc">' + esc(x.desc || '') + '</textarea></label>' +
      (k === 'cats' ? '<label class="fld"><span>Parent category</span><select id="tf_parent"><option value="">None</option>' + S.cats.filter(function (c) { return c.id !== id; }).map(function (c) { return '<option value="' + c.id + '"' + (x.parent === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' : '') +
      (k === 'feats' ? '<label class="fld"><span>Filter group / attribute type (optional)</span><input type="text" id="tf_group" value="' + esc(x.group || '') + '"></label>' : '') +
      '<div class="fld"><span>Image / icon (optional)</span><div class="gal" id="tfImg"></div></div>' +
      '<div class="g2"><label class="row-sw"><label class="sw"><input type="checkbox" id="tf_active" ' + (x.active !== false ? 'checked' : '') + '><i></i></label><span>Active</span></label><label class="row-sw"><label class="sw"><input type="checkbox" id="tf_fv" ' + (x.filterVisible !== false ? 'checked' : '') + '><i></i></label><span>Show in public filters</span></label></div><p class="err" id="tf_err" role="alert"></p></div>' +
      '<div class="sh-f"><button class="btn" data-act="closeModal">Cancel</button><button class="btn pri" data-act="saveTax" data-k="' + k + '" data-id="' + (id || '') + '">Save</button></div>');
    A.tfImg();
  };
  A.tfImg = function () { var g = A.$('#tfImg'); if (g) g.innerHTML = '<div class="thumb" style="width:56px;height:56px;' + A.bg(A.TF.img) + '">' + (A.TF.img ? '' : ic('image')) + '</div><button class="btn sm" data-act="tfPick">' + (A.TF.img ? 'Change' : 'Upload') + '</button>' + (A.TF.img ? '<button class="btn sm dng" data-act="tfRm">Remove</button>' : ''); };
  A.saveTax = async function (k, id) {
    var T = A.TAX[k], v = A.mv, err = A.$('#tf_err'), name = v('tf_name').trim(); if (!name) { err.textContent = 'Name is required.'; return; }
    var slug = A.slug(v('tf_slug') || name);
    if (S[k].some(function (x) { return x.id !== id && (x.slug === slug || x.name.toLowerCase() === name.toLowerCase()); })) { err.textContent = 'A ' + T.label.toLowerCase() + ' with this name or slug already exists.'; return; }
    var old = id ? S[k].find(function (x) { return x.id === id; }) : null;
    var o = Object.assign({}, old || { order: S[k].length }, { id: id || undefined, name: name, slug: slug, desc: v('tf_desc'), image: A.TF.img, active: v('tf_active'), filterVisible: v('tf_fv') });
    if (k === 'cats') o.parent = v('tf_parent'); if (k === 'feats') o.group = v('tf_group');
    if (await A.run(function () { return A.save(k, o); }, T.label + ' saved.')) { A.log(T.label + (id ? ' updated: ' : ' created: ') + name); A.closeModal(); }
  };
  A.dupTax = async function (k, id) {
    var T = A.TAX[k], o = A.clone(S[k].find(function (x) { return x.id === id; })), n = 2, name = o.name + ' (Copy)'; delete o.id; delete o.created;
    while (S[k].some(function (x) { return x.name === name; })) name = o.name + ' (Copy ' + n++ + ')';
    o.name = name; o.slug = A.slug(name); o.order = S[k].length;
    if (await A.run(function () { return A.save(k, o); }, T.label + ' duplicated.')) A.log(T.label + ' duplicated: ' + name);
  };
  A.moveTax = async function (k, i, d) {
    var arr = S[k].slice(), j = i + d; if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    await A.run(async function () { for (var n = 0; n < arr.length; n++) if (arr[n].order !== n) await A.col(k).doc(arr[n].id).update({ order: n }); });
  };
  A.askDelTax = function (k, id) {
    var T = A.TAX[k], x = S[k].find(function (y) { return y.id === id; }), n = A.useCount(k, id); if (!x) return;
    var kids = k === 'cats' ? S.cats.filter(function (c) { return c.parent === id; }).length : 0;
    var del = async function () {
      var ok = await A.run(async function () { if (kids) for (var c of S.cats.filter(function (c) { return c.parent === id; })) await A.col('cats').doc(c.id).update({ parent: '' }); await A.del(k, id); }, T.label + ' deleted.');
      if (ok) { A.log(T.label + ' deleted: ' + x.name); A.closeModal(); }
    };
    if (!n) { A.confirmBox({ title: 'Delete ' + T.label.toLowerCase() + '?', body: '<p><b>' + esc(x.name) + '</b> is not used by any product. Deleting it is permanent.</p>' + (kids ? '<p class="cell-s">' + kids + ' sub-categories will become top-level.</p>' : ''), actions: [{ label: 'Delete permanently', cls: 'dng', fn: del }] }); return; }
    var others = S[k].filter(function (y) { return y.id !== id; });
    A.confirmBox({ title: x.name + ' is in use', body: '<p><b>' + n + '</b> product' + (n > 1 ? 's use' : ' uses') + ' this ' + T.label.toLowerCase() + '. Products are never deleted with it. Choose a safe option:</p><ul style="margin:6px 0 10px;padding-left:18px"><li><b>Deactivate</b> hides it from filters and new assignments and keeps history.</li><li><b>Reassign</b> moves those products to another ' + T.label.toLowerCase() + ', then deletes this one.</li></ul>' +
      (others.length ? '<label class="fld"><span>Reassign products to</span><select id="rt">' + others.map(function (y) { return '<option value="' + y.id + '">' + esc(y.name) + '</option>'; }).join('') + '</select></label>' : ''), actions: [
        { label: 'Deactivate', fn: async function () { if (await A.run(function () { return A.col(k).doc(id).update({ active: false, updated: A.now() }); }, T.label + ' deactivated.')) { A.log(T.label + ' deactivated: ' + x.name); A.closeModal(); } } }].concat(others.length ? [{ label: 'Reassign and delete', cls: 'dng', fn: async function () {
          var to = A.mv('rt'), f = T.field, ok = await A.run(async function () { for (var p of S.products.filter(function (p) { return (p[f] || []).indexOf(id) > -1; })) { var a = p[f].filter(function (z) { return z !== id; }); if (a.indexOf(to) < 0) a.push(to); var u = {}; u[f] = a; u.updated = A.now(); await A.col('products').doc(p.id).update(u); } await A.del(k, id); }, 'Products reassigned and ' + T.label.toLowerCase() + ' deleted.');
          if (ok) { A.log(T.label + ' deleted after reassigning ' + n + ' products: ' + x.name); A.closeModal(); } } }] : []) });
  };
  A.exportTax = function (k) { var T = A.TAX[k]; A.download(T.plural.toLowerCase() + '.csv', A.csv([['name', 'slug', 'description', 'active', 'products']].concat(S[k].map(function (x) { return [x.name, x.slug, x.desc, x.active !== false, A.useCount(k, x.id)]; })))); };
})(window.A);
