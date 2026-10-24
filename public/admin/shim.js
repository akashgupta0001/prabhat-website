/* Connects the control panel to the website's own database and image storage.
   It exposes the small `window.claude.use(...)` interface the panel was written against. */
(function () {
  'use strict';
  var H = { 'x-requested-with': 'pi-admin' };

  function api(method, path, body, headers) {
    var opt = { method: method, credentials: 'same-origin', headers: Object.assign({}, H, headers || {}) };
    if (body !== undefined) { opt.body = body; }
    return fetch('/api/admin/' + path, opt).then(function (r) {
      if (r.status === 401) { location.replace('/admin/login.html'); return new Promise(function () {}); }
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'Request failed (' + r.status + ')'); e.code = r.status; throw e; }
        return j;
      });
    });
  }
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var rid = function () { var s = ''; for (var i = 0; i < 12; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]; return s; };

  var cache = {}, loaded = {}, subs = {}, fetchedAt = {}, inflight = {};
  function notify(col) { (subs[col] || []).slice().forEach(function (f) { f(); }); }
  function load(col, force) {
    if (loaded[col] && !force) return Promise.resolve();
    if (inflight[col]) return inflight[col];
    inflight[col] = api('GET', 'col/' + col).then(function (j) {
      var m = {}; (j.docs || []).forEach(function (d) { m[d.id] = d.data; });
      cache[col] = m; loaded[col] = true; fetchedAt[col] = Date.now(); delete inflight[col];
    }, function (e) { delete inflight[col]; throw e; });
    return inflight[col];
  }
  function snapDoc(col, id) {
    var d = (cache[col] || {})[id];
    return { id: id, exists: d !== undefined, data: function () { return d === undefined ? undefined : clone(d); } };
  }
  function snapCol(col, q) {
    var l = Object.keys(cache[col] || {}).map(function (id) { return { id: id, exists: true, data: (function (d) { return function () { return clone(d); }; })(cache[col][id]) }; });
    if (q && q.ord) {
      var dir = q.dir === 'desc' ? -1 : 1;
      l.sort(function (a, b) { var x = String(a.data()[q.ord] == null ? '' : a.data()[q.ord]), y = String(b.data()[q.ord] == null ? '' : b.data()[q.ord]); return x < y ? -dir : x > y ? dir : 0; });
    }
    if (q && q.lim) l = l.slice(0, q.lim);
    return { docs: l, size: l.length, empty: !l.length };
  }
  function listen(col, emit, onErr) {
    (subs[col] = subs[col] || []).push(emit);
    load(col).then(emit, function (e) { if (onErr) onErr(e); });
    return function () { subs[col] = (subs[col] || []).filter(function (f) { return f !== emit; }); };
  }

  function docRef(col, id) {
    return {
      id: id, path: col + '/' + id,
      get: function () { return load(col).then(function () { return snapDoc(col, id); }); },
      set: function (o) { return api('PUT', 'doc/' + col + '/' + id, JSON.stringify(o)).then(function () { (cache[col] = cache[col] || {})[id] = clone(o); notify(col); }); },
      update: function (o) { return api('PATCH', 'doc/' + col + '/' + id, JSON.stringify(o)).then(function () { cache[col] = cache[col] || {}; cache[col][id] = Object.assign({}, cache[col][id], clone(o)); notify(col); }); },
      delete: function () { return api('DELETE', 'doc/' + col + '/' + id).then(function () { if (cache[col]) delete cache[col][id]; notify(col); }); },
      onSnapshot: function (cb, err) { return listen(col, function () { cb(snapDoc(col, id)); }, err); }
    };
  }
  function colRef(col, q) {
    q = q || {};
    return {
      doc: function (id) { return docRef(col, id || rid()); },
      add: function (o) { var r = docRef(col, rid()); return r.set(o).then(function () { return r; }); },
      orderBy: function (f, dir) { return colRef(col, Object.assign({}, q, { ord: f, dir: dir })); },
      limit: function (n) { return colRef(col, Object.assign({}, q, { lim: n })); },
      get: function () { return load(col).then(function () { return snapCol(col, q); }); },
      onSnapshot: function (cb, err) { return listen(col, function () { cb(snapCol(col, q)); }, err); }
    };
  }
  var db = {
    collection: function (c) { return colRef(c); },
    doc: function (p) { var a = p.split('/'); return docRef(a[0], a[1]); }
  };

  /* pick up changes made elsewhere when the tab becomes active again */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    Object.keys(subs).forEach(function (col) {
      if (subs[col].length && Date.now() - (fetchedAt[col] || 0) > 60000) load(col, true).then(function () { notify(col); }, function () {});
    });
  });

  /* images: every upload is kept in HD.
     - HD master: up to 2560px on the long side, WebP/JPEG at 92% quality (never upscaled)
     - sharp smaller copies at 480, 960 and 1600px wide for cards and phones
     The website picks the right copy for each screen, so photos stay crisp without slow pages. */
  var MASTER = 2560, WIDTHS = [480, 960, 1600], limits = null;
  function getLimits() {
    if (!limits) limits = api('GET', 'upload').catch(function () { return { maxBytes: 1400 * 1024, widths: WIDTHS }; });
    return limits;
  }
  function canvasOf(src, w, h) {
    // high-quality downscale: halve step by step, then draw the final size
    var cur = src, cw = src.width, ch = src.height;
    while (cw / 2 >= w && ch / 2 >= h) {
      var t = document.createElement('canvas'); t.width = Math.round(cw / 2); t.height = Math.round(ch / 2);
      var tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high'; tx.drawImage(cur, 0, 0, t.width, t.height);
      cur = t; cw = t.width; ch = t.height;
    }
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, w, h);
    return c;
  }
  function hasAlpha(bm) {
    var c = document.createElement('canvas'), s = Math.min(1, 256 / Math.max(bm.width, bm.height));
    c.width = Math.max(1, Math.round(bm.width * s)); c.height = Math.max(1, Math.round(bm.height * s));
    var x = c.getContext('2d'); x.drawImage(bm, 0, 0, c.width, c.height);
    var d = x.getImageData(0, 0, c.width, c.height).data;
    for (var i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
    return false;
  }
  function encode(c, alpha, q) {
    var blob = function (type) { return new Promise(function (res) { c.toBlob(function (b) { res(b); }, type, q); }); };
    return blob('image/webp').then(function (b) {
      if (b && b.type === 'image/webp') return b;           // most browsers
      return alpha ? blob('image/png') : blob('image/jpeg'); // older Safari cannot make WebP
    });
  }
  function prepare(file) {
    if (file.type === 'image/gif') return Promise.resolve({ master: file, copies: [] });
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(file); }).then(function (bm) {
      var alpha = file.type !== 'image/jpeg' && hasAlpha(bm);
      var src = document.createElement('canvas'); src.width = bm.width; src.height = bm.height;
      var sx = src.getContext('2d'); if (!alpha) { sx.fillStyle = '#fff'; sx.fillRect(0, 0, src.width, src.height); } sx.drawImage(bm, 0, 0);
      var size = function (edge) { var s = Math.min(1, edge / Math.max(src.width, src.height)); return [Math.max(1, Math.round(src.width * s)), Math.max(1, Math.round(src.height * s))]; };
      return getLimits().then(function (lim) {
        var max = lim.maxBytes || 1400 * 1024;
        // Try full HD first; only if the file is too big for storage, step down gently.
        // Never below 1800px or 85% quality, so photos never look broken.
        var tries = [[MASTER, 0.92], [MASTER, 0.88], [MASTER, 0.85], [2200, 0.85], [2000, 0.85], [1800, 0.85]];
        function attempt(i) {
          var t = tries[i], wh = size(t[0]);
          return encode(canvasOf(src, wh[0], wh[1]), alpha, t[1]).then(function (b) {
            if (b.size <= max) return { blob: b, width: wh[0] };
            if (i + 1 < tries.length) return attempt(i + 1);
            throw new Error('This photo is too detailed to store in HD. Please crop it or use a smaller file.');
          });
        }
        return attempt(0).then(function (m) {
          var widths = WIDTHS.filter(function (w) { return w < m.width; });
          return Promise.all(widths.map(function (w) {
            var h = Math.max(1, Math.round(src.height * w / src.width));
            return encode(canvasOf(src, w, h), alpha, 0.88).then(function (b) { return { w: w, blob: b }; });
          })).then(function (copies) { return { master: m.blob, copies: copies }; });
        });
      });
    });
  }
  var assets = {
    upload: function (file) {
      return prepare(file).then(function (p) {
        return api('POST', 'upload', p.master, { 'content-type': p.master.type || file.type }).then(function (r) {
          // smaller copies are optional: if one fails, the site falls back to the HD master
          return Promise.all(p.copies.map(function (c) {
            return api('POST', 'upload?of=' + r.id + '&w=' + c.w, c.blob, { 'content-type': c.blob.type }).catch(function () {});
          })).then(function () { return r; });
        });
      });
    },
    list: function () { return api('GET', 'storage'); }
  };

  var user = {
    me: function () { return Promise.resolve({ id: 'admin', name: (window.__piUser || 'Admin') }); },
    isOwner: function () { return true; }, canEdit: function () { return true; }, can: function () { return true; }
  };
  var downloads = {
    save: function (o) {
      var b = new Blob([o.data], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = o.filename; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      return Promise.resolve({ status: 'saved' });
    }
  };

  var gate = fetch('/api/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
    if (!j.user) { location.replace('/admin/login.html'); return new Promise(function () {}); }
    window.__piUser = j.user.name;
  });
  window.claude = {
    use: function (name) {
      return gate.then(function () {
        if (name === 'db') return db;
        if (name === 'assets') return assets;
        if (name === 'user') return user;
        if (name === 'downloads') return downloads;
        return null;
      });
    }
  };
})();
