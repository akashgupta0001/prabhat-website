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

  /* images: shrink big photos in the browser before upload so pages stay fast */
  function shrink(file) {
    var keep = /^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 350 * 1024;
    if (keep || file.type === 'image/gif' && file.size <= 900 * 1024) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bm) {
      var alpha = file.type !== 'image/jpeg', type = alpha ? 'image/webp' : 'image/jpeg', scale = Math.min(1, 1600 / Math.max(bm.width, bm.height)), q = 0.86;
      function pass() {
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bm.width * scale)); c.height = Math.max(1, Math.round(bm.height * scale));
        var x = c.getContext('2d'); if (!alpha) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); } x.drawImage(bm, 0, 0, c.width, c.height);
        return new Promise(function (res) { c.toBlob(function (b) { res(b); }, type, q); }).then(function (b) {
          if (b && b.size > 900 * 1024 && (q > 0.5 || scale > 0.4)) { q = Math.max(0.5, q - 0.12); scale *= 0.85; return pass(); }
          return b;
        });
      }
      return pass();
    });
  }
  var assets = {
    upload: function (file) {
      return shrink(file).then(function (blob) {
        return api('POST', 'upload', blob, { 'content-type': blob.type || file.type });
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
