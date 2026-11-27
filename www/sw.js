// Офлайн: для приложения сначала сеть, затем последний успешно сохранённый ответ.
const C="magnit-v0915-rc1b-drugoy-ai05-h191";
const PREFIX="magnit-v0915-rc1b-drugoy-ai05-";
const SCOPE=new URL("./",self.location.href).href;
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","ai05-integration.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","brand/12a1-ring-foreground.png"])).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith(PREFIX)&&x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
async function remember(request,response){
  if(response.ok||response.type==="opaque")try{await (await caches.open(C)).put(request,response.clone())}catch(_){/* Сбой кэша не отменяет успешный сетевой ответ. */}
  return response;
}
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  if(u.origin!==self.location.origin){e.respondWith((async()=>{let hit;try{hit=await (await caches.open(C)).match(r)}catch(_){}return hit||remember(r,await fetch(r))})());return}
  if(!u.href.startsWith(SCOPE))return;
  e.respondWith((async()=>{
    try{return await remember(r,await fetch(r))}catch(err){
      try{const c=await caches.open(C),hit=await c.match(r);if(hit)return hit;if(r.mode==="navigate"){const page=await c.match("index.html");if(page)return page}}catch(_){}
      return new Response("Нет сети",{status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
    }
  })());
});
