/* 貓咪邏輯謎題 Service Worker：App Shell + 離線可玩。
 * 同源資源採網路優先、離線退回快取。 */
const PREFIX='meowdoku';
const SHELL=`${PREFIX}-shell-v62`;
const APP_SHELL=[
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './js/ui.js',
  './js/meowdoku.js',
  './engine.js',
  './gen-worker.js',
  './audio.js',
  './manifest.webmanifest',
  './icons/cats.webp',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(SHELL)
      // 逐檔快取：單一檔案 404 不會讓整個 install 失敗（addAll 為全有或全無）
      .then(cache=>Promise.allSettled(APP_SHELL.map(url=>cache.add(url))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keep=new Set([SHELL]);
    for(const key of await caches.keys()){
      if(key.startsWith(`${PREFIX}-`)&&!keep.has(key))await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(request);
      if(fresh.ok){
        const copy=fresh.clone();
        event.waitUntil(caches.open(SHELL).then(cache=>cache.put(request,copy)).catch(()=>{}));
      }
      return fresh;
    }catch{
      const cached=await caches.match(request,{ignoreSearch:true});
      if(cached)return cached;
      if(request.mode==='navigate')return(await caches.match('./index.html'))||Response.error();
      return Response.error();
    }
  })());
});
