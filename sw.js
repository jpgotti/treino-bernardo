/* Funciona sem internet: guarda o app na primeira visita. O treino.md busca a versão nova quando há rede. */
const VERSAO = 'treino-v2';
const BASE = ['./', 'index.html', 'app.css', 'app.js', 'nucleo.js', 'treino.md', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png', 'icone-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const rede = u.pathname.endsWith('treino.md') || u.pathname.endsWith('.js') || u.pathname.endsWith('.css') || u.pathname.endsWith('/') || u.pathname.endsWith('.html');
  if (rede) {
    // rede primeiro (pega atualização), cache se estiver offline
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true })));
  } else {
    // imagens e fontes: cache primeiro
    e.respondWith(caches.match(e.request).then(m => m || fetch(e.request).then(r => {
      if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(VERSAO).then(x => x.put(e.request, c)); }
      return r;
    })));
  }
});
