// Posts products to a Facebook Page and a linked Instagram business account through Meta's Graph API.
// The Page token is stored privately in the database (doc id starts with "_" so it is never public).
import { getDoc, putStmt } from './db.js';

const G = 'https://graph.facebook.com/v21.0';
export const getSocial = (env) => getDoc(env, 'site', '_social');

async function graph(path, { method = 'GET', params = {} } = {}) {
  const body = new URLSearchParams(params);
  const r = await fetch(method === 'GET' ? G + path + '?' + body : G + path, { method, ...(method === 'GET' ? {} : { body }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error((j.error && j.error.message) || 'Meta refused the request (' + r.status + ')');
  return j;
}

// Called once with the token from Graph API Explorer. Turns it into a never-expiring Page token and finds the Instagram account.
export async function connect(env, { token, appId, appSecret, pageName }) {
  let user = token;
  if (appId && appSecret) {
    const l = await graph('/oauth/access_token', { params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: token } });
    user = l.access_token;
  }
  const acc = await graph('/me/accounts', { params: { access_token: user, fields: 'id,name,access_token,instagram_business_account{id,username}', limit: 50 } });
  const pages = acc.data || [];
  if (!pages.length) throw new Error('No Facebook Page was shared with this token. Generate it again and select your Page when Meta asks.');
  const want = String(pageName || '').trim().toLowerCase();
  const pg = (want && pages.find((x) => x.name.toLowerCase() === want)) || pages[0];
  const ig = pg.instagram_business_account || null;
  await putStmt(env, 'site', '_social', {
    pageId: pg.id, pageName: pg.name, pageToken: pg.access_token,
    igId: ig ? ig.id : '', igName: ig ? ig.username : '', connected: new Date().toISOString(),
  }).run();
  return { pageName: pg.name, igName: ig ? ig.username : '' };
}

// targets: { fb: bool, ig: bool }. imageUrl must be a public https link to a JPEG/PNG.
export async function publish(env, { caption, imageUrl, fb, ig }) {
  const c = await getSocial(env);
  if (!c || !c.pageToken) throw new Error('Facebook is not connected yet. Connect it in General Settings.');
  const out = {};
  if (fb) {
    const j = await graph('/' + c.pageId + '/photos', { method: 'POST', params: { url: imageUrl, caption, access_token: c.pageToken } });
    out.facebook = j.post_id || j.id;
  }
  if (ig) {
    if (!c.igId) throw new Error('No Instagram business account is linked to this Page.');
    const m = await graph('/' + c.igId + '/media', { method: 'POST', params: { image_url: imageUrl, caption, access_token: c.pageToken } });
    let done = null;
    for (let i = 0; i < 6 && !done; i++) {
      try { done = await graph('/' + c.igId + '/media_publish', { method: 'POST', params: { creation_id: m.id, access_token: c.pageToken } }); }
      catch (e) { if (i === 5) throw e; await new Promise((r) => setTimeout(r, 2000)); }
    }
    out.instagram = done.id;
  }
  return out;
}
