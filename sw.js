/* ===========================================================
   오픈매니저 서비스 워커
   - 홈 화면 앱으로 설치할 수 있게 하고, 재방문 시 화면을 빠르게 띄운다
   - 원칙: 화면(HTML/JS/이미지)만 저장하고, 회사 데이터는 저장하지 않는다
           (데이터는 항상 서버에서 최신으로 받아온다)
   =========================================================== */

// 파일을 수정하면 이 번호를 올린다 → 이용자에게 새 화면이 배포됨
const CACHE = 'openmanager-v3';

// 처음 설치할 때 미리 받아둘 화면 구성 요소
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './signup.html',
  './company.html',
  './store.html',
  './ads.html',
  './terms.html',
  './privacy.html',
  './ad-util.js',
  './excel-util.js',
  './footer-util.js',
  './mobile-util.js',
  './idle-util.js',
  './phone-util.js',
  './terms-text.js',
  './version.js',
  './mail-config.js',
  './logo-horizontal.png',
  './logo-symbol.png',
  './logo-symbol-white.png',
  './favicon.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // 일부 파일이 없어도 설치가 실패하지 않도록 개별 처리
      .then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // ① 다른 도메인(Firebase, EmailJS, CDN 등)은 건드리지 않는다.
  //    특히 데이터 통신을 가로채면 오래된 정보가 보일 수 있으므로 반드시 제외.
  if(url.origin !== location.origin) return;

  // ② 화면 문서는 '서버 우선' — 항상 최신 화면을 받고, 인터넷이 끊겼을 때만 저장본 사용
  if(req.mode === 'navigate' || req.destination === 'document'){
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./login.html')))
    );
    return;
  }

  // ③ 그 외 정적 파일은 '저장본 우선' — 빠르게 띄우고 뒤에서 갱신
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if(res && res.status === 200){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
