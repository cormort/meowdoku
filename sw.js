/* 貓咪邏輯謎題 Service Worker：App Shell + 離線可玩。
 * 同源資源採網路優先、離線退回快取。 */
const PREFIX='meowdoku';
const SHELL=`${PREFIX}-shell-v15`;
const APP_SHELL=[
  './',
  './index.html',
  './engine.js',
  './gen-worker.js',
  './icons/cats.webp',
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(SHELL)
      .then(cache=>cache.addAll(APP_SHELL))
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
        const cache=await caches.open(SHELL);
        cache.put(request,fresh.clone());
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
