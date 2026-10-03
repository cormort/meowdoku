/* 貓咪邏輯謎題 Service Worker：App Shell + 離線可玩。
 * 同源資源採網路優先、離線退回快取。 */
const PREFIX='meowdoku';
const SHELL=`${PREFIX}-shell-v31`;
const APP_SHELL=[
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './js/ui.js',
  './js/pet.js',
  './js/room.js',
  './js/academy.js',
  './js/shop.js',
  './js/meowdoku.js',
  './js/quiz.js',
  './js/life.js',
  './quizzes/index.json',
  './quizzes/literacy.json',
  './quizzes/math.json',
  './quizzes/language.json',
  './quizzes/science.json',
  './quizzes/art.json',
  './quizzes/stamina.json',
  './engine.js',
  './gen-worker.js',
  './audio.js',
  './manifest.webmanifest',
  './icons/cats.webp',
  './icons/cats_transparent.webp',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/room/litter_box.webp',
  './icons/room/teaser_wand.webp',
  './icons/room/poop_clump.webp',
  './icons/room/cat_idle.webp',
  './icons/room/cat_pet.webp',
  './icons/room/cat_play.webp',
  './icons/room/cat_sleep.webp',
  './icons/room/orange_idle.webp',
  './icons/room/orange_pet.webp',
  './icons/room/orange_play.webp',
  './icons/room/orange_sleep.webp',
  './icons/room/black_idle.webp',
  './icons/room/black_pet.webp',
  './icons/room/black_play.webp',
  './icons/room/black_sleep.webp',
  './icons/room/calico_idle.webp',
  './icons/room/calico_pet.webp',
  './icons/room/calico_play.webp',
  './icons/room/calico_sleep.webp',
  './icons/room/cat_walk.webp',
  './icons/room/cat_run.webp',
  './icons/room/cat_jump.webp',
  './icons/room/cat_lick.webp',
  './icons/room/cat_wash.webp',
  './icons/room/cat_stretch.webp',
  './icons/room/cat_tail.webp',
  './icons/room/cat_yawn.webp',
  './icons/room/cat_scratch.webp',
  './icons/room/cat_eat.webp',
  './icons/room/orange_walk.webp',
  './icons/room/orange_run.webp',
  './icons/room/orange_jump.webp',
  './icons/room/orange_lick.webp',
  './icons/room/orange_wash.webp',
  './icons/room/orange_stretch.webp',
  './icons/room/orange_tail.webp',
  './icons/room/orange_yawn.webp',
  './icons/room/orange_scratch.webp',
  './icons/room/orange_eat.webp',
  './icons/room/black_walk.webp',
  './icons/room/black_run.webp',
  './icons/room/black_jump.webp',
  './icons/room/black_lick.webp',
  './icons/room/black_wash.webp',
  './icons/room/black_stretch.webp',
  './icons/room/black_tail.webp',
  './icons/room/black_yawn.webp',
  './icons/room/black_scratch.webp',
  './icons/room/black_eat.webp',
  './icons/room/calico_walk.webp',
  './icons/room/calico_run.webp',
  './icons/room/calico_jump.webp',
  './icons/room/calico_lick.webp',
  './icons/room/calico_wash.webp',
  './icons/room/calico_stretch.webp',
  './icons/room/calico_tail.webp',
  './icons/room/calico_yawn.webp',
  './icons/room/calico_scratch.webp',
  './icons/room/calico_eat.webp',
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
