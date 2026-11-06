/* Photo Studio: background removal, enhancement and product photo layout, all in the browser.
   The AI model runs on this device (onnxruntime-web), so photos are never sent anywhere
   except when you save them to a product. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var ORT_VER = '1.20.1', ORT_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@' + ORT_VER + '/dist/';
  // AI models are not part of the website: they load from jsDelivr's free mirror of the
  // GitHub repository (folder models/), so they use no website storage or bandwidth.
  // Nothing is written to the website or kept by this page on the device.
  var MODEL_BASE = 'https://cdn.jsdelivr.net/gh/akashgupta0001/prabhat-website@cb9816365347fb0403b02f52eb879cc939b77635/models/';
  var MODELS = {
    fast: { parts: [MODEL_BASE + 'u2netp.onnx'], size: 320, norm: 'imagenet', mb: 5 },
    hd: { parts: [MODEL_BASE + 'isnet-int8.part0', MODEL_BASE + 'isnet-int8.part1', MODEL_BASE + 'isnet-int8.part2'], size: 1024, norm: 'half', mb: 47 },
    person: { parts: [MODEL_BASE + 'human-int8.part0', MODEL_BASE + 'human-int8.part1', MODEL_BASE + 'human-int8.part2'], size: 320, norm: 'imagenet', mb: 44, refine: true }
  };
  MODELS.fast.refine = MODELS.hd.refine = true;  // every mask gets its edges snapped to the real outline in the photo
  var isPhone = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  var MAX_SRC = 2560;

  var DEF = { tight: 12, esharp: 25, dehalo: true, ex: 0, co: 0, sa: 0, wa: 0, sh: 0, bg: 'none', bgB: 0, bgBlur: 0, asp: '1', sc: 1, x: 0.5, y: 0.5, rot: 0, flip: false, shad: 'under', shO: 45, refl: 0 };
  var P = Object.assign({}, DEF), hist = [JSON.stringify(P)], hi = 0;
  var st = { src: null, name: 'photo', prob: null, probSize: 0, cut: false, restore: null, erase: null, mask: null, subj: null, box: null, enh: null, enhKey: '', bgImgs: {}, product: null, brush: 'off', compare: false, quality: isPhone ? 'fast' : 'hd', mode: 'product' };
  var products = [], db = null, assets = null;

  /* ---------- small UI helpers ---------- */
  function toast(m, bad) { var t = $('#toast'); t.textContent = m; t.className = bad ? 'bad' : ''; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(function () { t.hidden = true; }, bad ? 6500 : 3200); }
  function busy(on, text, pct) {
    $('#busy').hidden = !on; if (text) $('#busyT').textContent = text;
    $('#bar').hidden = pct == null; if (pct != null) $('#bar i').style.width = Math.round(pct * 100) + '%';
  }
  function chips(sel, attr, val) { $$(sel + ' button').forEach(function (b) { b.classList.toggle('on', b.dataset[attr] === String(val)); }); }
  function step(n) { $$('#steps span').forEach(function (s) { s.classList.toggle('on', +s.dataset.s === n); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function ctx2(c) { var g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; return g; }

  /* ---------- history ---------- */
  function commit() { var j = JSON.stringify(P); if (hist[hi] === j) return; hist = hist.slice(0, hi + 1); hist.push(j); if (hist.length > 80) hist.shift(); hi = hist.length - 1; undoBtns(); }
  function undoBtns() { $('#undo').disabled = hi <= 0; $('#redo').disabled = hi >= hist.length - 1; }
  function travel(d) { var n = hi + d; if (n < 0 || n >= hist.length) return; hi = n; P = JSON.parse(hist[n]); afterMaskParam(); sync(); render(); undoBtns(); }

  /* ---------- loading a photo ---------- */
  function toCanvas(bm) {
    var s = Math.min(1, MAX_SRC / Math.max(bm.width, bm.height)), c = canvas(bm.width * s, bm.height * s);
    ctx2(c).drawImage(bm, 0, 0, c.width, c.height); return c;
  }
  function openBlob(blob, name, product) {
    busy(true, 'Opening photo…');
    return (window.createImageBitmap ? createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(blob); }) : Promise.reject(new Error('This browser is too old.')))
      .then(function (bm) {
        st.src = toCanvas(bm); st.name = (name || 'photo').replace(/\.[a-z0-9]+$/i, ''); st.product = product || null;
        st.cut = false; st.prob = null; st.base = null; st.restore = st.erase = st.mask = st.subj = st.enh = null; st.box = null; st.enhKey = '';
        P = Object.assign({}, DEF, { asp: 'orig' }); hist = [JSON.stringify(P)]; hi = 0; undoBtns();
        $('#start').hidden = true; $('#ed').hidden = false; step(2); $('#edgeCard').hidden = true;
        if (product) $('#sProd').value = product.id;
        st.frame = null; st.frameKey = ''; fixHist = []; updFixUndo(); updCutBtn(); viewReset(); gotoTab('cut'); sync(); requestAnimationFrame(render); busy(false);
      }).catch(function (e) { busy(false); toast('Could not open this photo: ' + (e.message || e), true); });
  }
  $('#file').onchange = function (e) { var f = e.target.files[0]; if (f) openBlob(f, f.name); e.target.value = ''; };
  ['dragover', 'dragenter'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); $('#drop').classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); $('#drop').classList.remove('over'); }); });
  document.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) openBlob(f, f.name); });
  $('#newPhoto').onclick = function () { $('#ed').hidden = true; $('#start').hidden = false; step(1); };

  function openProduct(p) {
    var id = p.img || (p.gallery || [])[0];
    if (!id) { toast('This product has no photo yet. Upload one with Choose photo.', true); return; }
    busy(true, 'Opening photo…');
    fetch('/img/' + encodeURIComponent(id), { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('photo not found'); return r.blob(); })
      .then(function (b) { return openBlob(b, (p.sku || p.name || 'product'), p); })
      .catch(function (e) { busy(false); toast('Could not open the product photo: ' + e.message, true); });
  }
  function drawProducts() {
    var q = ($('#pq').value || '').toLowerCase().trim(), box = $('#plist');
    var list = products.filter(function (p) { return !q || (p.name + ' ' + (p.sku || '')).toLowerCase().indexOf(q) >= 0; });
    if (!products.length) { box.innerHTML = '<p class="muted">No products yet. Add products in the Control Panel, or upload a photo on the left.</p>'; return; }
    if (!list.length) { box.innerHTML = '<p class="muted">No product matches “' + esc(q) + '”.</p>'; return; }
    box.innerHTML = list.slice(0, 120).map(function (p) {
      var im = p.img || (p.gallery || [])[0];
      return '<button class="pc" data-id="' + esc(p.id) + '"><div class="im" style="' + (im ? 'background-image:url(/img/' + encodeURIComponent(im) + '?w=480)' : '') + '"></div><span>' + esc(p.name || 'Untitled') + '</span><small>' + esc(p.sku || '') + '</small></button>';
    }).join('');
  }
  $('#plist').onclick = function (e) { var b = e.target.closest('.pc'); if (!b) return; var p = products.find(function (x) { return x.id === b.dataset.id; }); if (p) openProduct(p); };
  $('#pq').oninput = drawProducts;

  /* ---------- AI model (runs on this device) ---------- */
  var ortP = null, sessions = {};
  function loadOrt() {
    if (window.ort) return Promise.resolve(window.ort);
    return ortP || (ortP = new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = ORT_BASE + 'ort.min.js'; s.crossOrigin = 'anonymous';
      s.onload = function () { window.ort ? ok(window.ort) : no(new Error('AI engine did not start')); };
      s.onerror = function () { ortP = null; no(new Error('Could not load the AI engine. Check the internet connection.')); };
      document.head.appendChild(s);
    }));
  }
  function fetchModel(key, onPct) {
    var m = MODELS[key], total = m.mb * 1024 * 1024, got = 0;
    return Promise.all(m.parts.map(function (url) {
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error('model download failed (' + r.status + ')');
        if (!r.body || !r.body.getReader) return r.arrayBuffer().then(function (b) { got += b.byteLength; onPct(got / total); return b; });
        var rd = r.body.getReader(), chunks = [], n = 0;
        function pump() { return rd.read().then(function (x) { if (x.done) return; chunks.push(x.value); n += x.value.length; got += x.value.length; onPct(Math.min(1, got / total)); return pump(); }); }
        return pump().then(function () { var out = new Uint8Array(n), o = 0; chunks.forEach(function (c) { out.set(c, o); o += c.length; }); return out.buffer; });
      });
    })).then(function (bufs) {
      var n = bufs.reduce(function (a, b) { return a + b.byteLength; }, 0), out = new Uint8Array(n), o = 0;
      bufs.forEach(function (b) { out.set(new Uint8Array(b), o); o += b.byteLength; }); return out;
    });
  }
  function session(key) {
    if (sessions[key]) return sessions[key];
    sessions[key] = loadOrt().then(function (ort) {
      ort.env.wasm.wasmPaths = ORT_BASE;
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
      return fetchModel(key, function (p) { busy(true, 'Loading AI model (' + MODELS[key].mb + ' MB)…', p); })
        .then(function (bytes) { busy(true, 'Starting AI…'); return ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }); });
    });
    sessions[key].catch(function () { delete sessions[key]; });
    return sessions[key];
  }
  function predict(key, src, label) {
    var m = MODELS[key], S = m.size; src = src || st.src;
    return session(key).then(function (sess) {
      busy(true, label || 'Removing background…', null);
      return new Promise(function (r) { setTimeout(r, 30); }).then(function () {
        var c = canvas(S, S), g = ctx2(c); g.drawImage(src, 0, 0, S, S);
        var d = g.getImageData(0, 0, S, S).data, n = S * S, x = new Float32Array(3 * n), mx = 1;
        for (var i = 0; i < d.length; i += 4) { if (d[i] > mx) mx = d[i]; if (d[i + 1] > mx) mx = d[i + 1]; if (d[i + 2] > mx) mx = d[i + 2]; }
        var mean = m.norm === 'imagenet' ? [0.485, 0.456, 0.406] : [0.5, 0.5, 0.5], sd = m.norm === 'imagenet' ? [0.229, 0.224, 0.225] : [1, 1, 1];
        for (var p = 0, j = 0; p < n; p++, j += 4) for (var ch = 0; ch < 3; ch++) x[ch * n + p] = (d[j + ch] / mx - mean[ch]) / sd[ch];
        var feeds = {}; feeds[sess.inputNames[0]] = new window.ort.Tensor('float32', x, [1, 3, S, S]);
        return sess.run(feeds).then(function (out) {
          var o = out[sess.outputNames[0]].data, lo = Infinity, hiV = -Infinity;
          for (var k = 0; k < o.length; k++) { if (o[k] < lo) lo = o[k]; if (o[k] > hiV) hiV = o[k]; }
          var prob = new Float32Array(o.length), r = hiV - lo || 1;
          for (k = 0; k < o.length; k++) prob[k] = (o[k] - lo) / r;
          return { prob: prob, size: S, key: key };
        });
      });
    });
  }

  /* ---------- edge refinement: colour guided filter ----------
     The AI mask is low resolution. This snaps its edges to the real outline in the photo:
     it is solved at up to 1024 px and then applied at full photo size. */
  function boxBlur(src, w, h, r) {
    var tmp = new Float32Array(w * h), out = new Float32Array(w * h), x, y, s, i, n = 2 * r + 1;
    for (y = 0; y < h; y++) {
      var row = y * w; s = 0;
      for (x = -r; x <= r; x++) s += src[row + Math.min(w - 1, Math.max(0, x))];
      for (x = 0; x < w; x++) { tmp[row + x] = s / n; s += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; }
    }
    for (x = 0; x < w; x++) {
      s = 0;
      for (y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (y = 0; y < h; y++) { out[y * w + x] = s / n; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
    }
    return out;
  }
  function guidedRefine(src, prob, probSize) {
    src = src || st.src; prob = prob || st.prob; probSize = probSize || st.probSize;
    var W = src.width, H = src.height, k = Math.min(1, 1024 / Math.max(W, H)), w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k)), n = w * h;
    var c = canvas(w, h), g = ctx2(c); g.drawImage(src, 0, 0, w, h); var d = g.getImageData(0, 0, w, h).data;
    var S = probSize, pc = canvas(S, S), pg = ctx2(pc), pid = pg.createImageData(S, S);
    for (var i = 0; i < prob.length; i++) { pid.data[i * 4 + 3] = prob[i] * 255; }
    pg.putImageData(pid, 0, 0); var up = canvas(w, h), ug = ctx2(up); ug.drawImage(pc, 0, 0, w, h); var ud = ug.getImageData(0, 0, w, h).data;
    var R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), Pp = new Float32Array(n);
    for (i = 0; i < n; i++) { R[i] = d[i * 4] / 255; G[i] = d[i * 4 + 1] / 255; B[i] = d[i * 4 + 2] / 255; Pp[i] = ud[i * 4 + 3] / 255; }
    var r = probSize >= 1024 ? Math.max(2, Math.round(Math.max(w, h) / 340)) : Math.max(3, Math.round(Math.max(w, h) / 128)), eps = probSize >= 1024 ? 1e-3 : 1e-4;
    function mul(a, b) { var o = new Float32Array(n); for (var j = 0; j < n; j++) o[j] = a[j] * b[j]; return o; }
    var mR = boxBlur(R, w, h, r), mG = boxBlur(G, w, h, r), mB = boxBlur(B, w, h, r), mP = boxBlur(Pp, w, h, r);
    var cR = boxBlur(mul(R, Pp), w, h, r), cG = boxBlur(mul(G, Pp), w, h, r), cB = boxBlur(mul(B, Pp), w, h, r);
    var vRR = boxBlur(mul(R, R), w, h, r), vRG = boxBlur(mul(R, G), w, h, r), vRB = boxBlur(mul(R, B), w, h, r),
        vGG = boxBlur(mul(G, G), w, h, r), vGB = boxBlur(mul(G, B), w, h, r), vBB = boxBlur(mul(B, B), w, h, r);
    var aR = new Float32Array(n), aG = new Float32Array(n), aB = new Float32Array(n), bb = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var rr = vRR[i] - mR[i] * mR[i] + eps, rg = vRG[i] - mR[i] * mG[i], rb = vRB[i] - mR[i] * mB[i],
          gg = vGG[i] - mG[i] * mG[i] + eps, gb = vGB[i] - mG[i] * mB[i], b2 = vBB[i] - mB[i] * mB[i] + eps;
      var xR = cR[i] - mR[i] * mP[i], xG = cG[i] - mG[i] * mP[i], xB = cB[i] - mB[i] * mP[i];
      // inverse of the symmetric 3x3 covariance matrix
      var i00 = gg * b2 - gb * gb, i01 = rb * gb - rg * b2, i02 = rg * gb - rb * gg, i11 = rr * b2 - rb * rb, i12 = rb * rg - rr * gb, i22 = rr * gg - rg * rg;
      var det = rr * i00 + rg * i01 + rb * i02; if (Math.abs(det) < 1e-12) det = 1e-12;
      aR[i] = (i00 * xR + i01 * xG + i02 * xB) / det; aG[i] = (i01 * xR + i11 * xG + i12 * xB) / det; aB[i] = (i02 * xR + i12 * xG + i22 * xB) / det;
      bb[i] = mP[i] - aR[i] * mR[i] - aG[i] * mG[i] - aB[i] * mB[i];
    }
    aR = boxBlur(aR, w, h, r); aG = boxBlur(aG, w, h, r); aB = boxBlur(aB, w, h, r); bb = boxBlur(bb, w, h, r);
    // apply at full size: q = a . I + b, with a and b smoothly scaled up
    var fc = canvas(W, H), fg = ctx2(fc); fg.drawImage(src, 0, 0); var fd = fg.getImageData(0, 0, W, H).data, out = new Float32Array(W * H);
    var sx = (w - 1) / Math.max(1, W - 1), sy = (h - 1) / Math.max(1, H - 1);
    for (var y = 0; y < H; y++) {
      var fy = y * sy, y0 = fy | 0, y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
      for (var x = 0; x < W; x++) {
        var fx = x * sx, x0 = fx | 0, x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
        var i0 = y0 * w + x0, i1 = y0 * w + x1, i2 = y1 * w + x0, i3 = y1 * w + x1;
        var w0 = (1 - tx) * (1 - ty), w1 = tx * (1 - ty), w2 = (1 - tx) * ty, w3 = tx * ty, p4 = (y * W + x) * 4;
        var v = (aR[i0] * w0 + aR[i1] * w1 + aR[i2] * w2 + aR[i3] * w3) * fd[p4] / 255
              + (aG[i0] * w0 + aG[i1] * w1 + aG[i2] * w2 + aG[i3] * w3) * fd[p4 + 1] / 255
              + (aB[i0] * w0 + aB[i1] * w1 + aB[i2] * w2 + aB[i3] * w3) * fd[p4 + 2] / 255
              + (bb[i0] * w0 + bb[i1] * w1 + bb[i2] * w2 + bb[i3] * w3);
        out[y * W + x] = v < 0 ? 0 : v > 1 ? 1 : v;
      }
    }
    return out;
  }

  /* ---------- mask building ---------- */
  function maskKey() { return [P.tight, P.esharp, P.dehalo].join(','); }
  function buildMask() {
    var W = st.src.width, H = st.src.height;
    var c0 = 0.5 + (P.tight - 12) / 100 + (st.quality === 'fast' && st.mode !== 'person' && st.probSize < 1024 ? 0.06 : 0), slope = Math.max(1, P.esharp / 10);
    if (!st.base) st.base = guidedRefine();
    var mask = canvas(W, H), mg = ctx2(mask), out = mg.createImageData(W, H), od = out.data, bs = st.base;
    for (var p = 0, q = 3; p < bs.length; p++, q += 4) {
      var v = (bs[p] - c0) * slope + 0.5; v = v < 0.02 ? 0 : v > 0.98 ? 1 : v;
      od[q - 3] = od[q - 2] = od[q - 1] = 255; od[q] = v * 255;
    }
    mg.putImageData(out, 0, 0);
    if (st.restore) { mg.globalCompositeOperation = 'source-over'; mg.drawImage(st.restore, 0, 0); }
    if (st.erase) { mg.globalCompositeOperation = 'destination-out'; mg.drawImage(st.erase, 0, 0); }
    mg.globalCompositeOperation = 'source-over';
    st.mask = mask; st._mk = maskKey(); st.frameKey = '';
    // bounding box of the product, read from a small copy for speed
    var k = Math.min(1, 512 / Math.max(W, H)), bw = Math.max(1, Math.round(W * k)), bh = Math.max(1, Math.round(H * k));
    var b = canvas(bw, bh), bg = ctx2(b); bg.drawImage(mask, 0, 0, bw, bh);
    var md = bg.getImageData(0, 0, bw, bh).data, x0 = bw, y0 = bh, x1 = -1, y1 = -1;
    for (var y = 0; y < bh; y++) for (var x = 0; x < bw; x++) if (md[(y * bw + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) st.box = { x: 0, y: 0, w: W, h: H };
    else {
      var pad = 3 / k, bx = Math.max(0, Math.floor(x0 / k - pad)), by = Math.max(0, Math.floor(y0 / k - pad));
      st.box = { x: bx, y: by, w: Math.min(W, Math.ceil((x1 + 1) / k + pad)) - bx, h: Math.min(H, Math.ceil((y1 + 1) / k + pad)) - by };
    }
    st.subj = cutSubject(); st.enhKey = '';
  }
  // Cut the product out of the photo. Edge pixels get their colour from the product itself,
  // so no trace of the old background (dark or coloured halo) shows on the new background.
  function cutSubject() {
    var B = st.box, w = B.w, h = B.h, n = w * h;
    var crop = canvas(w, h), cg = ctx2(crop); cg.drawImage(st.src, B.x, B.y, w, h, 0, 0, w, h);
    var id = cg.getImageData(0, 0, w, h), d = id.data;
    var mc = canvas(w, h), mcg = ctx2(mc); mcg.drawImage(st.mask, B.x, B.y, w, h, 0, 0, w, h);
    var m = mcg.getImageData(0, 0, w, h).data;
    if (P.dehalo) {
      // foreground colour estimate = blur(colour × alpha²) / blur(alpha²), worked out at reduced size
      var k = Math.min(1, 700 / Math.max(w, h)), sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k)), sn = sw * sh;
      var sc = canvas(sw, sh), sg = ctx2(sc); sg.drawImage(crop, 0, 0, sw, sh); var sd = sg.getImageData(0, 0, sw, sh).data;
      var smc = canvas(sw, sh), smg = ctx2(smc); smg.drawImage(mc, 0, 0, sw, sh); var smd = smg.getImageData(0, 0, sw, sh).data;
      var A = new Float32Array(sn), R = new Float32Array(sn), G = new Float32Array(sn), Bl = new Float32Array(sn);
      for (var i = 0; i < sn; i++) { var a = smd[i * 4 + 3] / 255, a2 = a * a; A[i] = a2; R[i] = sd[i * 4] * a2; G[i] = sd[i * 4 + 1] * a2; Bl[i] = sd[i * 4 + 2] * a2; }
      var r = Math.max(2, Math.round(Math.max(sw, sh) / 120));
      A = boxBlur(boxBlur(A, sw, sh, r), sw, sh, r); R = boxBlur(boxBlur(R, sw, sh, r), sw, sh, r); G = boxBlur(boxBlur(G, sw, sh, r), sw, sh, r); Bl = boxBlur(boxBlur(Bl, sw, sh, r), sw, sh, r);
      var fx = (sw - 1) / Math.max(1, w - 1), fy = (sh - 1) / Math.max(1, h - 1);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var p = (y * w + x) * 4, al = m[p + 3];
        if (al === 0 || al >= 250) continue;
        var j = (Math.round(y * fy) * sw + Math.round(x * fx)), den = A[j];
        if (den < 1e-4) continue;
        var t = al / 255;
        d[p] = (R[j] / den) * (1 - t) + d[p] * t; d[p + 1] = (G[j] / den) * (1 - t) + d[p + 1] * t; d[p + 2] = (Bl[j] / den) * (1 - t) + d[p + 2] * t;
      }
    }
    for (var q = 3; q < d.length; q += 4) d[q] = m[q];
    cg.putImageData(id, 0, 0);
    return crop;
  }
  function afterMaskParam() { if (st.cut && st.prob && st._mk !== maskKey()) { buildMask(); } }

  /* ---------- enhancement (pixel maths, works in every browser) ---------- */
  function enhanced() {
    var key = [P.ex, P.co, P.sa, P.wa, P.sh, st.subj && st.subj.width, st.subj && st.subj.height, st._mv || 0].join(',');
    if (st.enh && st.enhKey === key) return st.enh;
    var s = st.subj, c = canvas(s.width, s.height), g = ctx2(c); g.drawImage(s, 0, 0);
    if (!P.ex && !P.co && !P.sa && !P.wa && !P.sh) { st.enh = c; st.enhKey = key; return c; }
    var id = g.getImageData(0, 0, c.width, c.height), d = id.data;
    var lut = [new Uint8ClampedArray(256), new Uint8ClampedArray(256), new Uint8ClampedArray(256)];
    var gain = Math.pow(2, P.ex / 60), con = 1 + P.co / 100, warm = P.wa / 100;
    var mul = [1 + 0.12 * warm, 1, 1 - 0.12 * warm];
    for (var ch = 0; ch < 3; ch++) for (var v = 0; v < 256; v++) { var x = v / 255 * gain * mul[ch]; x = (x - 0.5) * con + 0.5; lut[ch][v] = x * 255; }
    var sat = 1 + P.sa / 100;
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      var r = lut[0][d[i]], gg = lut[1][d[i + 1]], b = lut[2][d[i + 2]];
      if (sat !== 1) { var L = 0.299 * r + 0.587 * gg + 0.114 * b; r = L + (r - L) * sat; gg = L + (gg - L) * sat; b = L + (b - L) * sat; }
      d[i] = r; d[i + 1] = gg; d[i + 2] = b;
    }
    if (P.sh) {
      var w = c.width, h = c.height, src = new Uint8ClampedArray(d), k = P.sh / 100 * 0.7;
      for (var y = 1; y < h - 1; y++) for (var xx = 1; xx < w - 1; xx++) {
        var p = (y * w + xx) * 4; if (!src[p + 3]) continue;
        for (var q = 0; q < 3; q++) {
          var o = p + q, lap = 4 * src[o] - src[o - 4] - src[o + 4] - src[o - w * 4] - src[o + w * 4];
          d[o] = src[o] + k * lap;
        }
      }
    }
    g.putImageData(id, 0, 0); st.enh = c; st.enhKey = key; return c;
  }
  function autoEnhance() {
    var s = st.subj || st.src, k = Math.min(1, 256 / Math.max(s.width, s.height)), c = canvas(s.width * k, s.height * k), g = ctx2(c);
    g.drawImage(s, 0, 0, c.width, c.height);
    var d = g.getImageData(0, 0, c.width, c.height).data, sum = 0, sq = 0, n = 0;
    for (var i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; var L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; sum += L; sq += L * L; n++; }
    if (!n) return;
    var mean = sum / n, sdv = Math.sqrt(Math.max(0, sq / n - mean * mean));
    P.ex = Math.round(Math.max(-15, Math.min(22, (0.5 - mean) * 50)));
    P.co = sdv < 0.16 ? 12 : sdv < 0.22 ? 6 : 0; P.sa = 6; P.sh = 25;
  }

  /* ---------- composing ---------- */
  function aspect() { return P.asp === 'orig' ? st.src.width / st.src.height : +P.asp; }
  function cover(g, img, W, H) { var s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s; g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); }
  function paintBg(g, W, H, forJpg) {
    var bg = P.bg;
    if (bg === 'none') { if (forJpg) { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); } return; }
    var layer = canvas(W, H), lg = ctx2(layer);
    if (bg.charAt(0) === '#') { lg.fillStyle = bg; lg.fillRect(0, 0, W, H); }
    else if (bg.indexOf('g:') === 0) {
      var c = bg.split(':'), r = Math.hypot(W / 2, H * 0.58), gr = lg.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, r);
      gr.addColorStop(0, c[1]); gr.addColorStop(1, c[2]); lg.fillStyle = gr; lg.fillRect(0, 0, W, H);
    } else if (bg === 'orig') { cover(lg, st.src, W, H); }
    else if (st.bgImgs[bg]) { cover(lg, st.bgImgs[bg], W, H); }
    var blur = P.bgBlur + (bg === 'orig' ? 14 : 0);
    if (blur) { // soft blur by shrinking and enlarging (works on every browser)
      var f = 1 / (1 + blur * 0.35), s1 = canvas(W * f, H * f), s1g = ctx2(s1); s1g.drawImage(layer, 0, 0, s1.width, s1.height);
      lg.clearRect(0, 0, W, H); lg.drawImage(s1, 0, 0, W, H);
    }
    g.drawImage(layer, 0, 0);
    if (P.bgB) { g.fillStyle = P.bgB > 0 ? 'rgba(255,255,255,' + P.bgB / 100 + ')' : 'rgba(0,0,0,' + (-P.bgB / 100) + ')'; g.fillRect(0, 0, W, H); }
  }
  function compose(g, W, H, opt) {
    opt = opt || {};
    g.clearRect(0, 0, W, H);
    if (!st.cut) { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(st.src, 0, 0, W, H); return; }
    paintBg(g, W, H, opt.jpg);
    var s = enhanced(), ar = s.width / s.height;
    var fit = Math.min(0.8 * W / s.width, 0.8 * H / s.height) * P.sc, w = s.width * fit, h = s.height * fit;
    g.save(); g.translate(P.x * W, P.y * H); g.rotate(P.rot * Math.PI / 180); g.scale(P.flip ? -1 : 1, 1);
    if (P.shad === 'under') {
      g.save(); g.translate(0, h * 0.49); g.scale(w * 0.47, Math.max(4, w * 0.05));
      var gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, 'rgba(0,0,0,' + (0.6 * P.shO / 45 * 0.75) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
    }
    if (P.refl && P.bg !== 'none') {
      var t = canvas(w, h * 0.5), tg = ctx2(t);
      tg.save(); tg.translate(0, h); tg.scale(1, -1); tg.drawImage(s, 0, 0, w, h); tg.restore();
      tg.globalCompositeOperation = 'destination-in'; var lg = tg.createLinearGradient(0, 0, 0, t.height); lg.addColorStop(0, 'rgba(0,0,0,0.42)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); tg.fillStyle = lg; tg.fillRect(0, 0, t.width, t.height);
      g.save(); g.globalAlpha = P.refl / 100; g.drawImage(t, -w / 2, h / 2, w, h * 0.5); g.restore();
    }
    if (P.shad === 'drop') { g.shadowColor = 'rgba(0,0,0,' + (P.shO / 100 * 0.8) + ')'; g.shadowBlur = W * 0.03; g.shadowOffsetX = W * 0.012 * (P.flip ? -1 : 1); g.shadowOffsetY = W * 0.018; }
    g.drawImage(s, -w / 2, -h / 2, w, h);
    g.restore();
  }

  /* ---------- preview: zoomable view with scrollbars ----------
     The picture ("frame") is drawn once at good resolution; the screen canvas shows the part that
     is in view. Zoom 1 = fit to screen. */
  var cv = $('#cv'), scroller = $('#scroller'), spacer = $('#spacer'), loupe = $('#loupe'), raf = 0;
  var view = { zoom: 1, docW: 0, docH: 0, ox: 0, oy: 0 }, cursor = null, checker = null;
  function refineView() { return st.brush !== 'off' && st.cut && !st.compare; }
  function docAspect() { return (refineView() || st.compare || !st.cut) ? st.src.width / st.src.height : aspect(); }
  function layout() {
    var vw = scroller.clientWidth, vh = scroller.clientHeight, ar = docAspect(), pad = 16;
    var fw = vw - pad * 2, fh = fw / ar; if (fh > vh - pad * 2) { fh = vh - pad * 2; fw = fh * ar; }
    view.docW = Math.max(10, fw * view.zoom); view.docH = Math.max(10, fh * view.zoom);
    var sw = Math.max(vw, view.docW + pad * 2), sh = Math.max(vh, view.docH + pad * 2);
    spacer.style.width = sw + 'px'; spacer.style.height = sh + 'px';
    view.ox = (sw - view.docW) / 2; view.oy = (sh - view.docH) / 2;
    $('#zLbl').textContent = Math.round(view.zoom * 100) + '%';
  }
  function frame() {
    if (st.compare || !st.cut) return st.src;
    if (refineView()) {
      var key = 'r' + st.viewMode + (st._mv || 0) + st._mk + (st.live || 0);
      if (st.frameKey === key && st.frame) return st.frame;
      var W = st.src.width, H = st.src.height, f = st.frame && st.frame.width === W && st.frame.height === H ? st.frame : canvas(W, H), g = ctx2(f);
      g.clearRect(0, 0, W, H);
      if (st.viewMode === 'cut') { g.drawImage(st.src, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(st.mask, 0, 0); g.globalCompositeOperation = 'source-over'; }
      else {
        g.drawImage(st.src, 0, 0);
        var red = st._red && st._red.width === W ? st._red : (st._red = canvas(W, H)), rg = ctx2(red);
        rg.globalCompositeOperation = 'source-over'; rg.clearRect(0, 0, W, H); rg.fillStyle = 'rgba(235,30,60,0.55)'; rg.fillRect(0, 0, W, H);
        rg.globalCompositeOperation = 'destination-out'; rg.drawImage(st.mask, 0, 0); rg.globalCompositeOperation = 'source-over';
        g.drawImage(red, 0, 0);
      }
      st.frame = f; st.frameKey = key; return f;
    }
    // finished picture
    var ar = aspect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    var long = Math.min(2560, Math.max(900, Math.max(view.docW, view.docH) * dpr)), L = Math.round(long / 300) * 300;
    var W2 = ar >= 1 ? L : Math.round(L * ar), H2 = ar >= 1 ? Math.round(L / ar) : L, ck = 'c' + JSON.stringify(P) + st._mk + (st._mv || 0) + W2 + 'x' + H2;
    if (st.frameKey === ck && st.frame) return st.frame;
    var c = st.frame && st.frame.width === W2 && st.frame.height === H2 && st.frameKey.charAt(0) === 'c' ? st.frame : canvas(W2, H2);
    compose(ctx2(c), W2, H2); st.frame = c; st.frameKey = ck; return c;
  }
  function checkerPattern(g) {
    if (!checker) { checker = canvas(16, 16); var x = ctx2(checker); x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#e3e7ef'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8); }
    return g.createPattern(checker, 'repeat');
  }
  function render() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
  function draw() {
    if (!st.src || $('#ed').hidden) return;
    layout();
    var vw = scroller.clientWidth, vh = scroller.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    var W = Math.round(vw * dpr), H = Math.round(vh * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, vw, vh);
    var x = view.ox - scroller.scrollLeft, y = view.oy - scroller.scrollTop, f = frame();
    g.fillStyle = checkerPattern(g); g.fillRect(x, y, view.docW, view.docH);
    g.imageSmoothingEnabled = view.docW / f.width < 4; g.imageSmoothingQuality = 'high';
    g.drawImage(f, x, y, view.docW, view.docH);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.strokeRect(x - 0.5, y - 0.5, view.docW + 1, view.docH + 1);
    var paint = refineView() && (st.brush === 'restore' || st.brush === 'erase');
    if (paint && cursor) { // brush outline
      g.beginPath(); g.arc(cursor.x, cursor.y, +$('#bsz').value / 2, 0, Math.PI * 2);
      g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.stroke(); g.strokeStyle = st.brush === 'erase' ? '#e11d48' : '#16a34a'; g.lineWidth = 1.2; g.stroke();
    }
    if (st.selBox) { // selection box being drawn
      var b = st.selBox, bx = Math.min(b.x0, b.x1), by = Math.min(b.y0, b.y1), bw = Math.abs(b.x1 - b.x0), bh = Math.abs(b.y1 - b.y0);
      g.fillStyle = 'rgba(15,23,42,.35)'; g.fillRect(0, 0, vw, by); g.fillRect(0, by + bh, vw, vh - by - bh); g.fillRect(0, by, bx, bh); g.fillRect(bx + bw, by, vw - bx - bw, bh);
      g.setLineDash([6, 4]); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(bx, by, bw, bh); g.setLineDash([]); g.strokeStyle = '#1F5FD6'; g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
    }
    cv.className = paint ? 'paint' : (refineView() && st.brush === 'select') ? 'sel' : '';
    drawLoupe(f, paint);
  }
  function drawLoupe(f, paint) {
    if (!paint || !cursor) { loupe.hidden = true; return; }
    var u = (cursor.x - (view.ox - scroller.scrollLeft)) / view.docW, v = (cursor.y - (view.oy - scroller.scrollTop)) / view.docH;
    if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) { loupe.hidden = true; return; }
    loupe.hidden = false; loupe.classList.toggle('right', cursor.x < 240 && cursor.y < 240);
    var L = 180, mag = 4, g = loupe.getContext('2d'), scr = view.docW / f.width;      // screen px per frame px
    var span = L / (scr * mag);                                                       // frame px shown in the loupe
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = checkerPattern(g); g.fillRect(0, 0, L, L);
    g.imageSmoothingEnabled = scr * mag < 2;
    g.drawImage(f, u * f.width - span / 2, v * f.height - span / 2, span, span, 0, 0, L, L);
    var br = +$('#bsz').value / 2 * mag;
    g.beginPath(); g.arc(L / 2, L / 2, Math.min(br, L / 2 - 4), 0, Math.PI * 2); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); g.strokeStyle = st.brush === 'erase' ? '#e11d48' : '#16a34a'; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.moveTo(L / 2 - 7, L / 2); g.lineTo(L / 2 + 7, L / 2); g.moveTo(L / 2, L / 2 - 7); g.lineTo(L / 2, L / 2 + 7); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1; g.stroke();
  }
  function zoomTo(z, cx, cy) {
    z = Math.max(1, Math.min(12, z));
    var vw = scroller.clientWidth, vh = scroller.clientHeight; if (cx == null) { cx = vw / 2; cy = vh / 2; }
    var u = (cx + scroller.scrollLeft - view.ox) / view.docW, v = (cy + scroller.scrollTop - view.oy) / view.docH;
    view.zoom = z; layout();
    scroller.scrollLeft = view.ox + u * view.docW - cx; scroller.scrollTop = view.oy + v * view.docH - cy;
    render();
  }
  $('#zIn').onclick = function () { zoomTo(view.zoom * 1.5); };
  $('#zOut').onclick = function () { zoomTo(view.zoom / 1.5); };
  $('#zLbl').onclick = function () { zoomTo(1); };
  scroller.addEventListener('scroll', render);
  window.addEventListener('resize', render);
  function viewReset() { view.zoom = 1; scroller.scrollLeft = scroller.scrollTop = 0; }

  /* ---------- controls ---------- */
  function sync() {
    $$('[data-k]').forEach(function (el) { var v = P[el.dataset.k]; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; });
    chips('#shad', 's', P.shad); chips('#asp', 'a', P.asp); chips('#qChips', 'q', st.quality);
    chips('#modeChips', 'm', st.mode);
    $('#qChips').parentNode.querySelectorAll('.lbl')[1].hidden = $('#qChips').hidden = st.mode === 'person';
    $('#qNote').textContent = (st.mode === 'person' ? 'Keeps only the people (hair and clothes included). Loads a 44 MB AI model.'
      : st.quality === 'hd' ? 'Clean, sharp edges. Loads a 47 MB AI model, best on Wi-Fi.' : 'Lighter 5 MB AI model for phones and slow internet. Edges are refined automatically.')
      + ' The AI runs on this device. Nothing is uploaded or stored.';
    $$('#sw [data-bg]').forEach(function (b) { b.classList.toggle('on', b.dataset.bg === P.bg); });
    $$('#aiRes button').forEach(function (b) { b.classList.toggle('on', b.dataset.bg === P.bg); });
    dNote();
  }
  $$('[data-k]').forEach(function (el) {
    el.addEventListener('input', function () {
      var k = el.dataset.k; P[k] = el.type === 'checkbox' ? el.checked : +el.value;
      if (k === 'tight' || k === 'esharp' || k === 'dehalo') afterMaskParam();
      render();
    });
    el.addEventListener('change', commit);
  });
  $('#undo').onclick = function () { travel(-1); }; $('#redo').onclick = function () { travel(1); };
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'z') { e.preventDefault(); travel(e.shiftKey ? 1 : -1); } if (e.key === 'y') { e.preventDefault(); travel(1); }
  });
  $('#cmp').onclick = function () { st.compare = !st.compare; $('#cmp').classList.toggle('on', st.compare); render(); };
  $('#viewChips').hidden = true;
  function gotoTab(t) {
    $$('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
    $$('.tab').forEach(function (x) { x.hidden = x.id !== 't-' + t; });
    step(t === 'save' ? 3 : 2); if (t !== 'cut') setBrush('off');
  }
  $$('#tabs button').forEach(function (b) { b.onclick = function () { gotoTab(b.dataset.t); }; });

  /* cut out */
  function cutout(again) {
    if (st.cut && !again) return Promise.resolve();
    var key = st.mode === 'person' ? 'person' : st.quality;
    return predict(key).catch(function (e) {
      if (key === 'hd') { toast('HD could not run on this device, using Standard instead.', true); st.quality = 'fast'; sync(); return predict('fast'); }
      throw e;
    }).then(function (r) {
      st.base = null; st.prob = r.prob; st.probSize = r.size; st.refine = !!MODELS[r.key].refine; st.cut = true;
      st.restore = canvas(st.src.width, st.src.height); st.erase = canvas(st.src.width, st.src.height);
      buildMask();
      P.asp = '1'; P.sc = 1; P.x = 0.5; P.y = 0.5; commit();
      $('#edgeCard').hidden = false; $('#hint').hidden = false; setTimeout(function () { $('#hint').hidden = true; }, 4500);
      busy(false); sync(); updCutBtn(); render();
    }).catch(function (e) { busy(false); toast('Background removal failed: ' + (e.message || e) + '. Please try again.', true); throw e; });
  }
  function recutHint() { if (st.cut) { st.cut = false; st.prob = null; $('#edgeCard').hidden = true; updCutBtn(); render(); toast('Press Remove background to cut out again.'); } }
  function updCutBtn() { $('#cut').textContent = st.cut ? '↻ Remove background again' : 'Remove background'; }
  $$('#qChips button').forEach(function (b) { b.onclick = function () { if (st.quality === b.dataset.q) return; st.quality = b.dataset.q; sync(); recutHint(); }; });
  $$('#modeChips button').forEach(function (b) { b.onclick = function () { if (st.mode === b.dataset.m) return; st.mode = b.dataset.m; sync(); recutHint(); }; });
  $('#cut').onclick = function () {
    var again = st.cut;
    if (again) { st.restore = st.erase = null; st.base = null; fixHist = []; updFixUndo(); }
    cutout(again).then(function () { if (again) { setBrush('off'); toast('Background removed again from the original photo. Brush edits were cleared.'); } }).catch(function () {});
  };
  $('#magic').onclick = function () {
    cutout().then(function () {
      autoEnhance(); P.bg = '#ffffff'; P.asp = '1'; P.sc = 1; P.x = 0.5; P.y = 0.5; P.rot = 0; P.shad = 'under';
      commit(); sync(); render(); toast('Done. Change the background or go to Save.');
    }).catch(function () {});
  };

  /* brush: restore / erase with zoom, loupe and pinch */
  function setBrush(m) {
    var wasRefine = refineView();
    st.brush = m; chips('#brush', 'b', m);
    $('#brushNote').textContent = m === 'restore' ? 'Paint over parts of the product that were removed by mistake. Red shows what is removed.'
      : m === 'erase' ? 'Paint over leftover background to remove it. Red shows what is removed.'
      : m === 'select' ? 'Drag a box around the product and the AI cuts out just that. Or tap a kept part to keep only that object.'
      : 'Pick a tool, then work on the photo. Zoom in for fine edges.';
    $('#viewChips').hidden = $('#fixActs').hidden = m === 'off'; $('#selOpts').hidden = m !== 'select'; $('#fixDone').hidden = m === 'off'; if (m !== 'off') $('#hint').hidden = true;
    if (wasRefine !== refineView()) viewReset();
    render();
  }
  st.viewMode = 'overlay';
  $$('#viewChips button').forEach(function (b) { b.onclick = function () { st.viewMode = b.dataset.v; chips('#viewChips', 'v', st.viewMode); render(); }; });
  $$('#brush button').forEach(function (b) { b.onclick = function () { if (!st.cut) return toast('Remove the background first.'); setBrush(b.dataset.b); }; });
  $('#maskReset').onclick = function () {
    if (!st.cut) return; snapshot(); st.restore = canvas(st.src.width, st.src.height); st.erase = canvas(st.src.width, st.src.height);
    st._mv = (st._mv || 0) + 1; buildMask(); render(); toast('Brush edits removed.');
  };

  /* undo for edge fixes (brush strokes, selections, touch-ups) */
  var fixHist = [];
  function copyCanvas(c) { var x = canvas(c.width, c.height); ctx2(x).drawImage(c, 0, 0); return x; }
  function snapshot() { fixHist.push({ base: st.base, restore: copyCanvas(st.restore), erase: copyCanvas(st.erase) }); if (fixHist.length > 6) fixHist.shift(); updFixUndo(); }
  function updFixUndo() { $('#fixUndo').disabled = !fixHist.length; }
  $('#fixUndo').onclick = function () {
    var h = fixHist.pop(); if (!h) return; st.base = h.base; st.restore = h.restore; st.erase = h.erase;
    st._mv = (st._mv || 0) + 1; buildMask(); updFixUndo(); render();
  };
  $('#fixDone').onclick = function () { setBrush('off'); $('#stage').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); toast('Edges applied. Pick a background next.'); };

  /* AI select: cut out only what is inside a box (also used for the touch-up) */
  var selMode = 'only';
  $$('#selOpts button').forEach(function (b) { b.onclick = function () { selMode = b.dataset.s; chips('#selOpts', 's', selMode); }; });
  function aiSelect(box, mode, keepEdits, label) {
    var W = st.src.width, H = st.src.height, padX = box.w * 0.04, padY = box.h * 0.04;
    var x0 = Math.max(0, Math.floor(box.x - padX)), y0 = Math.max(0, Math.floor(box.y - padY));
    var x1 = Math.min(W, Math.ceil(box.x + box.w + padX)), y1 = Math.min(H, Math.ceil(box.y + box.h + padY)), w = x1 - x0, h = y1 - y0;
    if (w < 8 || h < 8) return Promise.resolve();
    var crop = canvas(w, h); ctx2(crop).drawImage(st.src, x0, y0, w, h, 0, 0, w, h);
    var key = st.mode === 'person' ? 'person' : st.quality;
    return predict(key, crop, label || 'Selecting the object…').then(function (r) {
      var cb = guidedRefine(crop, r.prob, r.size), nb = mode === 'add' ? st.base.slice() : new Float32Array(W * H);
      for (var y = 0; y < h; y++) {
        var row = (y + y0) * W + x0, cr = y * w;
        for (var x = 0; x < w; x++) { var v = cb[cr + x]; nb[row + x] = mode === 'add' ? Math.max(nb[row + x], v) : v; }
      }
      snapshot(); st.base = nb;
      if (!keepEdits) {
        if (mode === 'add') ctx2(st.erase).clearRect(x0, y0, w, h);
        else { st.restore = canvas(W, H); st.erase = canvas(W, H); }
      }
      st._mv = (st._mv || 0) + 1; buildMask(); busy(false); render();
    }).catch(function (e) { busy(false); toast('Could not select: ' + (e.message || e), true); });
  }
  $('#touchup').onclick = function () {
    if (!st.cut || !st.box) return;
    aiSelect(st.box, 'only', true, 'AI touch-up: cutting out the product closely…').then(function () { toast('Touch-up done. The AI looked closely at the product only.'); });
  };
  // tap a kept area: keep only that connected object
  function keepObjectAt(ix, iy) {
    var W = st.src.width, H = st.src.height, k = Math.min(1, 512 / Math.max(W, H)), w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
    var c = canvas(w, h), g = ctx2(c); g.drawImage(st.mask, 0, 0, w, h); var d = g.getImageData(0, 0, w, h).data;
    var sx = Math.min(w - 1, Math.max(0, Math.round(ix * k))), sy = Math.min(h - 1, Math.max(0, Math.round(iy * k)));
    if (d[(sy * w + sx) * 4 + 3] < 100) { toast('Tap on a kept part of the photo, or drag a box around the product.'); return; }
    var on = new Uint8Array(w * h), stack = [sy * w + sx]; on[sy * w + sx] = 1;
    while (stack.length) {
      var p = stack.pop(), px = p % w, py = (p / w) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) {
        var nx = px + o[0], ny = py + o[1]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        var q = ny * w + nx; if (!on[q] && d[q * 4 + 3] > 20) { on[q] = 1; stack.push(q); }
      });
    }
    for (var it = 0; it < 3; it++) { // grow a little so soft edges stay
      var nx2 = on.slice();
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (!on[y * w + x] && ((x > 0 && on[y * w + x - 1]) || (x < w - 1 && on[y * w + x + 1]) || (y > 0 && on[(y - 1) * w + x]) || (y < h - 1 && on[(y + 1) * w + x]))) nx2[y * w + x] = 1;
      on = nx2;
    }
    var keepC = canvas(w, h), kg = ctx2(keepC), kid = kg.createImageData(w, h);
    for (var i = 0; i < on.length; i++) if (on[i]) { kid.data[i * 4] = kid.data[i * 4 + 1] = kid.data[i * 4 + 2] = kid.data[i * 4 + 3] = 255; }
    kg.putImageData(kid, 0, 0);
    snapshot();
    var nb = new Float32Array(W * H), fx = w / W, fy = h / H;
    for (y = 0; y < H; y++) { var ky = Math.min(h - 1, (y * fy) | 0); for (x = 0; x < W; x++) if (on[ky * w + Math.min(w - 1, (x * fx) | 0)]) nb[y * W + x] = st.base[y * W + x]; }
    st.base = nb;
    var rg = ctx2(st.restore); rg.globalCompositeOperation = 'destination-in'; rg.drawImage(keepC, 0, 0, W, H); rg.globalCompositeOperation = 'source-over';
    st._mv = (st._mv || 0) + 1; buildMask(); render(); toast('Kept only that object.');
  }
  (function () {
    var drag = null, pan = null, sel = null, painting = false, last = null, dirty = false, pts = {}, pinch = null, space = false;
    function local(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function imgPt(l) {  // screen point -> photo pixels
      var u = (l.x - (view.ox - scroller.scrollLeft)) / view.docW, v = (l.y - (view.oy - scroller.scrollTop)) / view.docH;
      return [u * st.src.width, v * st.src.height, st.src.width / view.docW];
    }
    function dab(g, a, b, size, soft) {
      g.lineCap = g.lineJoin = 'round';
      if (soft > 0.02) { g.shadowColor = '#fff'; g.shadowBlur = size * soft * 0.6; }
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, size * (1 - soft * 0.5));
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0] + 0.01, b[1]); g.stroke(); g.shadowBlur = 0;
    }
    function stroke(a, b) {
      var size = +$('#bsz').value * a[2], soft = +$('#bsoft').value / 100;
      var on = st.brush === 'restore' ? st.restore : st.erase, off = st.brush === 'restore' ? st.erase : st.restore;
      var g1 = ctx2(on); g1.globalCompositeOperation = 'source-over'; dab(g1, a, b, size, soft);
      var g2 = ctx2(off); g2.globalCompositeOperation = 'destination-out'; dab(g2, a, b, size, soft); g2.globalCompositeOperation = 'source-over';
      var mg = ctx2(st.mask); mg.globalCompositeOperation = st.brush === 'restore' ? 'source-over' : 'destination-out'; dab(mg, a, b, size, soft); mg.globalCompositeOperation = 'source-over';
      dirty = true; st.live = (st.live || 0) + 1; render();
    }
    function finishStroke() { if (painting) { painting = false; if (dirty) { dirty = false; st._mv = (st._mv || 0) + 1; st.live = 0; buildMask(); render(); } } }
    document.addEventListener('keydown', function (e) { if (e.code === 'Space' && refineView() && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { space = true; e.preventDefault(); } });
    document.addEventListener('keyup', function (e) { if (e.code === 'Space') space = false; });
    cv.addEventListener('pointerdown', function (e) {
      if (!st.src) return;
      cv.setPointerCapture(e.pointerId); pts[e.pointerId] = local(e);
      var ids = Object.keys(pts);
      if (ids.length === 2) { // pinch: stop painting, zoom and pan with two fingers
        finishStroke(); drag = pan = null;
        var a = pts[ids[0]], b = pts[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return;
      }
      var l = pts[e.pointerId];
      if (refineView() && st.brush === 'select' && !space && e.button === 0) { sel = { x0: l.x, y0: l.y, x1: l.x, y1: l.y }; st.selBox = sel; return; }
      if (refineView() && (st.brush === 'restore' || st.brush === 'erase') && !space && e.button === 0) { snapshot(); painting = true; last = imgPt(l); stroke(last, last); return; }
      if (refineView() || space || e.button === 1 || !st.cut || st.compare || view.zoom > 1 && e.shiftKey) { pan = { x: l.x, y: l.y, sl: scroller.scrollLeft, st: scroller.scrollTop }; cv.classList.add('drag'); return; }
      drag = { x: l.x, y: l.y, sx: P.x, sy: P.y }; cv.classList.add('drag'); $('#hint').hidden = true;
    });
    cv.addEventListener('pointermove', function (e) {
      var l = local(e); cursor = l;
      if (pts[e.pointerId]) pts[e.pointerId] = l;
      if (pinch) {
        var ids = Object.keys(pts); if (ids.length < 2) return;
        var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        zoomTo(pinch.z * d / Math.max(10, pinch.d), mx, my);
        scroller.scrollLeft -= mx - pinch.mx; scroller.scrollTop -= my - pinch.my; pinch.mx = mx; pinch.my = my; return;
      }
      if (sel) { sel.x1 = l.x; sel.y1 = l.y; render(); return; }
      if (painting) { var p = imgPt(l); stroke(last, p); last = p; return; }
      if (pan) { scroller.scrollLeft = pan.sl - (l.x - pan.x); scroller.scrollTop = pan.st - (l.y - pan.y); return; }
      if (drag) { P.x = drag.sx + (l.x - drag.x) / view.docW; P.y = drag.sy + (l.y - drag.y) / view.docH; render(); return; }
      if (refineView()) render(); // move the brush outline and loupe
    });
    function up(e) {
      delete pts[e.pointerId];
      if (pinch) { if (Object.keys(pts).length < 2) pinch = null; return; }
      finishStroke();
      if (sel) {
        var a0 = imgPt({ x: Math.min(sel.x0, sel.x1), y: Math.min(sel.y0, sel.y1) }), a1 = imgPt({ x: Math.max(sel.x0, sel.x1), y: Math.max(sel.y0, sel.y1) }), small = Math.abs(sel.x1 - sel.x0) < 10 && Math.abs(sel.y1 - sel.y0) < 10;
        sel = null; st.selBox = null; render();
        if (small) keepObjectAt(a0[0], a0[1]);
        else aiSelect({ x: a0[0], y: a0[1], w: a1[0] - a0[0], h: a1[1] - a0[1] }, selMode === 'add' ? 'add' : 'only', false).then(function () { toast(selMode === 'add' ? 'Added to the cut-out.' : 'Selected. Everything outside the box was removed.'); });
      }
      if (pan) { pan = null; cv.classList.remove('drag'); }
      if (drag) { drag = null; cv.classList.remove('drag'); commit(); sync(); }
    }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', function () { cursor = null; if (refineView()) render(); });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { var l = local(e); zoomTo(view.zoom * Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0015), l.x, l.y); return; }
      scroller.scrollLeft += e.deltaX; scroller.scrollTop += e.deltaY;
    }, { passive: false });
  })();

  /* background */
  function needCut() { if (!st.cut) { toast('Remove the background first (Cut out).'); return true; } return false; }
  $$('#sw [data-bg]').forEach(function (b) { b.onclick = function () { if (needCut()) return; P.bg = b.dataset.bg; commit(); sync(); render(); }; });
  $('#anyC').oninput = function (e) { if (needCut()) return; P.bg = e.target.value; render(); };
  $('#anyC').onchange = function () { commit(); sync(); };
  function addBgImage(img) { var id = 'img' + Date.now() + Math.random().toString(36).slice(2, 6); st.bgImgs[id] = img; return id; }
  $('#bgFile').onchange = function (e) {
    var f = e.target.files[0]; e.target.value = ''; if (!f || needCut()) return;
    createImageBitmap(f).then(function (bm) {
      var c = toCanvas(bm), id = addBgImage(c); P.bg = id; P.asp = String(+(c.width / c.height).toFixed(4)); P.sc = 0.75; P.y = 0.55; commit(); sync(); render();
      toast('Placed on your photo. Drag the product into position.');
    }).catch(function () { toast('Could not open that photo.', true); });
  };
  $$('#aiIdeas button').forEach(function (b) { b.onclick = function () { $('#aiP').value = b.dataset.p; }; });
  function loadAi(prompt, seed, W, H) {
    var q = encodeURIComponent(prompt + ', empty scene for product photography, no people, no text, no logo, photorealistic');
    var urls = ['https://image.pollinations.ai/prompt/' + q + '?width=' + W + '&height=' + H + '&seed=' + seed + '&nologo=true&model=flux',
                'https://gen.pollinations.ai/image/' + q + '?width=' + W + '&height=' + H + '&seed=' + seed + '&nologo=true&model=flux'];
    function attempt(i) {
      return new Promise(function (ok, no) {
        var im = new Image(), t = setTimeout(function () { im.src = ''; no(new Error('timed out')); }, 120000);
        im.crossOrigin = 'anonymous';
        im.onload = function () { clearTimeout(t); ok(im); }; im.onerror = function () { clearTimeout(t); no(new Error('service did not answer')); };
        im.src = urls[i];
      }).catch(function (e) { if (i + 1 < urls.length) return attempt(i + 1); throw e; });
    }
    return attempt(0).then(function (im) { var c = canvas(im.naturalWidth, im.naturalHeight); ctx2(c).drawImage(im, 0, 0); c.toDataURL(); return c; });
  }
  $('#aiGo').onclick = function () {
    if (needCut()) return;
    var prompt = ($('#aiP').value || '').trim(); if (!prompt) return toast('Describe the background, or tap an idea.');
    var ar = aspect(), W = ar >= 1 ? 1024 : Math.round(1024 * ar), H = ar >= 1 ? Math.round(1024 / ar) : 1024;
    var box = $('#aiRes'), btn = $('#aiGo'); btn.disabled = true; btn.textContent = 'Generating…';
    box.innerHTML = '<button class="wait" disabled>Creating…</button><button class="wait" disabled>Creating…</button>';
    var seeds = [Math.floor(Math.random() * 1e8), Math.floor(Math.random() * 1e8)], done = 0, ok = 0;
    seeds.forEach(function (sd, i) {
      loadAi(prompt, sd, W, H).then(function (c) {
        var id = addBgImage(c), b = box.children[i]; b.className = ''; b.disabled = false; b.dataset.bg = id; b.innerHTML = ''; b.appendChild(Object.assign(document.createElement('img'), { src: c.toDataURL('image/jpeg', 0.7), alt: 'AI background' }));
        b.onclick = function () { P.bg = id; commit(); sync(); render(); };
        if (!ok++) b.click();
      }).catch(function () {
        var b = box.children[i]; if (b) b.remove();
      }).then(function () {
        if (++done < seeds.length) return;
        btn.disabled = false; btn.textContent = ok ? '↻ Generate again' : 'Generate background';
        if (!ok) box.innerHTML = '<p class="err">The free AI service did not answer. Wait a minute and try again, or upload your own background photo.</p>';
      });
    });
  };

  /* enhance */
  $('#auto').onclick = function () { if (!st.src) return; autoEnhance(); commit(); sync(); render(); toast('Auto enhance applied. Adjust any slider if you like.'); };
  $('#enhReset').onclick = function () { P.ex = P.co = P.sa = P.wa = P.sh = 0; commit(); sync(); render(); };

  /* arrange */
  $$('#asp button').forEach(function (b) { b.onclick = function () { P.asp = b.dataset.a; commit(); sync(); render(); }; });
  $$('#shad button').forEach(function (b) { b.onclick = function () { P.shad = b.dataset.s; commit(); sync(); render(); }; });
  $('#center').onclick = function () { P.sc = 1; P.x = 0.5; P.y = 0.5; P.rot = 0; commit(); sync(); render(); };

  /* ---------- save / export ---------- */
  var fmt = 'png', dsz = 2000;
  $$('#fmt button').forEach(function (b) { b.onclick = function () { fmt = b.dataset.f; chips('#fmt', 'f', fmt); dNote(); }; });
  $$('#dsz button').forEach(function (b) { b.onclick = function () { dsz = +b.dataset.z; chips('#dsz', 'z', String(dsz)); dNote(); }; });
  function outWH(long) { var ar = st.cut ? aspect() : st.src.width / st.src.height; return ar >= 1 ? [long, Math.round(long / ar)] : [Math.round(long * ar), long]; }
  function dNote() { if (!st.src) return; var wh = outWH(dsz); $('#dNote').textContent = wh[0] + ' × ' + wh[1] + ' px · ' + (fmt === 'jpg' && P.bg === 'none' ? 'JPG has no transparency, so white is used.' : fmt === 'png' ? 'Best quality, keeps transparency.' : fmt === 'webp' ? 'Small file, keeps transparency.' : 'Small file.'); }
  function exportBlob(long, type) {
    var wh = outWH(long), c = canvas(wh[0], wh[1]), g = ctx2(c);
    compose(g, c.width, c.height, { jpg: type === 'image/jpeg' });
    return new Promise(function (ok, no) {
      try { c.toBlob(function (b) { b ? ok(b) : no(new Error('could not create the file')); }, type, 0.93); }
      catch (e) { no(new Error('this background cannot be saved (the AI service blocked it). Try another background.')); }
    });
  }
  $('#dl').onclick = function () {
    if (!st.src) return; busy(true, 'Preparing file…');
    var type = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[fmt];
    exportBlob(dsz, type).then(function (b) {
      busy(false); var a = document.createElement('a'), name = (st.name || 'photo') + '_' + dsz + '.' + fmt;
      a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); toast('Downloaded ' + name);
    }).catch(function (e) { busy(false); toast('Could not save: ' + e.message, true); });
  };
  $('#allowSave').onchange = function () {
    var on = this.checked; $('#sProd').disabled = $('#sMain').disabled = !on;
  };
  function replaceMain() {
    if (!$('#allowSave').checked) return;
    var pid = $('#sProd').value; if (!pid) return toast('Choose the product first.', true);
    if (!st.cut) return toast('Remove the background first.', true);
    if (!assets || !db) return toast('Saving is not available. Reload the page and sign in again.', true);
    var p = products.find(function (x) { return x.id === pid; }) || {}, oldId = '';
    busy(true, 'Saving photo to ' + (p.name || 'product') + '…');
    exportBlob(2560, P.bg === 'none' ? 'image/png' : 'image/jpeg').then(function (b) {
      return assets.upload(new File([b], (st.name || 'photo') + (P.bg === 'none' ? '.png' : '.jpg'), { type: b.type }));
    }).then(function (r) {
      var ref = db.doc('products/' + pid);
      return ref.get().then(function (snap) {
        var d = (snap.exists && snap.data()) || {}; oldId = d.img || '';
        var patch = { img: r.id, updated: new Date().toISOString() };
        return ref.update(patch).then(function () { Object.assign(p, patch); });
      });
    }).then(function () {
      // free the space used by the old photo (skipped automatically if it is used anywhere else)
      if (!oldId) return;
      return fetch('/api/admin/image/' + encodeURIComponent(oldId), { method: 'DELETE', credentials: 'same-origin', headers: { 'x-requested-with': 'pi-admin' } }).catch(function () {});
    }).then(function () {
      busy(false); toast('Main photo replaced. The old photo was deleted to save space.');
    }).catch(function (e) { busy(false); toast('Could not save: ' + (e.message || e), true); });
  }
  $('#sMain').onclick = replaceMain;

  /* ---------- boot ---------- */
  undoBtns(); sync();
  if (window.claude && claude.use) {
    Promise.all([claude.use('db'), claude.use('assets')]).then(function (r) {
      db = r[0]; assets = r[1];
      return db.collection('products').get();
    }).then(function (snap) {
      products = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; }).sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
      $('#sProd').innerHTML = '<option value="">Choose product…</option>' + products.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name || 'Untitled') + (p.sku ? ' · ' + esc(p.sku) : '') + '</option>'; }).join('');
      drawProducts();
      var want = new URLSearchParams(location.search).get('p');
      if (want) { var p = products.find(function (x) { return x.id === want; }); if (p) openProduct(p); }
    }).catch(function (e) { $('#plist').innerHTML = '<p class="muted">Could not load products: ' + esc(e.message || e) + '</p>'; });
  }
})();
