// Cloudflare Worker entry: runs the API and serves the website files from /public.
import * as login from './functions/api/login.js';
import * as logout from './functions/api/logout.js';
import * as me from './functions/api/me.js';
import * as enquiry from './functions/api/enquiry.js';
import * as pub from './functions/api/public/data.js';
import * as admin from './functions/api/admin/[[path]].js';
import * as dbxList from './functions/api/dbx/list.js';
import * as dbxImg from './functions/api/dbx/img.js';
import * as img from './functions/img/[id].js';
import * as sitemap from './functions/sitemap.xml.js';
import * as robots from './functions/robots.txt.js';

const METHOD = { GET: 'onRequestGet', POST: 'onRequestPost' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    const ctxArg = { request, env, params: {}, waitUntil: (x) => ctx.waitUntil(x) };
    const call = (mod) => {
      const h = mod[METHOD[request.method]] || mod.onRequest;
      return h ? h(ctxArg) : new Response('Method not allowed', { status: 405 });
    };
    try {
      if (p === '/api/login') return await call(login);
      if (p === '/api/logout') return await call(logout);
      if (p === '/api/me') return await call(me);
      if (p === '/api/enquiry') return await call(enquiry);
      if (p === '/api/public/data') return await call(pub);
      if (p === '/api/dbx/list') return await call(dbxList);
      if (p === '/api/dbx/img') return await call(dbxImg);
      if (p.startsWith('/api/admin/')) {
        ctxArg.params = { path: p.slice('/api/admin/'.length).split('/').filter(Boolean).map(decodeURIComponent) };
        return await admin.onRequest(ctxArg);
      }
      if (p.startsWith('/img/')) { ctxArg.params = { id: decodeURIComponent(p.slice(5)) }; return await call(img); }
      if (p === '/sitemap.xml') return await call(sitemap);
      if (p === '/robots.txt') return await call(robots);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Server error: ' + (e && e.message ? e.message : 'unknown') }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
    return env.ASSETS.fetch(request);
  },
};
