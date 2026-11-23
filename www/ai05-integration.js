/* AI-05 H1.50: scaled H1.38 visual transfer and screen blur, correcting Android screenshots.
 * Original 12A-1 stays as the only ring; visual layers, cloud, trail and
 * lock/stop derive from the actual app button diameter. Background is softly blurred. The single-mic native Android
 * transcription+audio conflict is NOT solved here; verify on device.
 * Emergency opt-out: localStorage.setItem('ai05_enabled','0'); location.reload();
 */
(()=>{
'use strict';
const get=(k,d)=>{try{return localStorage.getItem(k)??d}catch(_){return d}};
const put=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
if(get('ai05_enabled','1')==='0')return;
const $=s=>document.querySelector(s);
const safe=f=>{try{return f()}catch(_){return null}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let gesture=null,run=null,layer=null,holdTimeout=0,hapticTimer=0,hapticEcho=0,lastGesture=0;
let stream=null,recorder=null,recordPending=null,recordChunks=[],recordBlob=null,recordDuration=0,recordStarted=0;
let asr=null,spoken='',speechIssue='',audioContext=null,audioSource=null,analyser=null,raf=0;
let stagedMenu=false;
const style=document.createElement('style');
style.id='ai05-h150-styles';
style.textContent=`
/* AI-05 H1.50 - approved H1.38 composition mapped at 58/138; preserve original app 12A-1 ring. */
#hub.drugoy-hub-preview{touch-action:none;-webkit-user-select:none;user-select:none}
body.ai05-focused #app{filter:blur(2.25px) saturate(.87);opacity:.53;transition:filter .28s ease,opacity .28s ease}
/* The active layer is above the glass navigation. Hide the original face while its
   exact 12A-1 artwork is displayed in the same position in the visual layer. */
body.ai05-focused #tabs{opacity:.34;filter:blur(2px);transition:opacity .26s ease,filter .26s ease}
body.ai05-focused #tabs nav button:not(#hub){pointer-events:none}
body.ai05-focused #hub{opacity:0!important}
body.ai05-focused .drugoy-fx-layer{display:none!important}
.ai05-face{position:absolute;inset:0;border-radius:50%;background:linear-gradient(150deg,var(--acc2),var(--acc3));box-shadow:0 7px 18px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.22);overflow:hidden}
.ai05-ring-copy{position:absolute;inset:0;margin:auto;display:block;width:82.7586%;height:82.7586%;object-fit:contain;z-index:5;filter:drop-shadow(0 1px 1px rgba(0,0,0,.22))}
.ai05-layer[data-state=holding] .ai05-ring-copy{animation:ai05-hold-ring 1.05s ease-in-out infinite alternate}
.ai05-layer[data-state=recording] .ai05-ring-copy{animation:ai05-record-ring 3.8s ease-in-out infinite}
.ai05-layer[data-state=locked] .ai05-ring-copy{animation:ai05-record-ring 6.8s ease-in-out infinite}
.ai05-layer{position:fixed;inset:0;z-index:39;pointer-events:none;overflow:hidden;--ai05-volume:0;--ai05-size:58px;--ai05-rise:64px;--ai05-focus:0;--ai05-move-x:0px;--ai05-blur:4px}
.ai05-backdrop{position:absolute;inset:0;background:rgba(22,45,33,.26);-webkit-backdrop-filter:blur(1.4px) saturate(.83);backdrop-filter:blur(1.4px) saturate(.83);transition:background .28s ease}
.ai05-layer[data-state=holding] .ai05-backdrop{background:rgba(22,45,33,.19)}
.ai05-layer[data-state=locked] .ai05-backdrop{background:rgba(22,45,33,.22)}
/* Outer living halo and three independent organic gradients. Original painted ring stays above these. */
.ai05-visual{position:absolute;left:var(--cx);top:var(--cy);width:var(--ai05-size);height:var(--ai05-size);transform:translate(-50%,-50%);pointer-events:none;isolation:isolate}
.ai05-visual::before{content:'';position:absolute;inset:-31%;border-radius:49% 51% 46% 54%;background:radial-gradient(ellipse at 50% 53%,rgba(233,183,115,.29) 3%,rgba(153,189,145,.27) 36%,rgba(101,144,111,.11) 58%,transparent 76%);filter:blur(calc(var(--ai05-blur)*1.8));opacity:.52;animation:ai05-aura 5.3s ease-in-out infinite}
.ai05-aura-mesh{z-index:1;position:absolute;inset:-21%;filter:blur(var(--ai05-blur));opacity:.61;isolation:isolate;transform:scale(.94);transition:transform .34s ease,opacity .3s ease}
.ai05-aura-mesh i{position:absolute;inset:0;border-radius:45% 55% 53% 47%/51% 43% 57% 49%;display:block;mix-blend-mode:screen}
.ai05-aura-mesh i:nth-child(1){background:conic-gradient(from 34deg,transparent,#769c7a55 19%,#cbd4ad88 34%,transparent 53%,#e4ac7577 73%,transparent 91%);animation:ai05-organic-a 7.1s ease-in-out infinite alternate}
.ai05-aura-mesh i:nth-child(2){inset:8%;background:conic-gradient(from -41deg,#729a8466,transparent 22%,#d3cc9e99 44%,transparent 64%,#7ca88b77 80%,transparent);animation:ai05-organic-b 9.4s ease-in-out infinite alternate-reverse}
.ai05-aura-mesh i:nth-child(3){inset:14%;background:radial-gradient(ellipse at 60% 40%,rgba(160,194,147,.52),rgba(230,175,111,.28) 32%,transparent 70%);animation:ai05-organic-c 6.3s ease-in-out infinite alternate}
.ai05-core{z-index:2;position:absolute;inset:10%;border-radius:50%;overflow:hidden;clip-path:circle(49%);background:radial-gradient(ellipse at 41% 34%,rgba(251,243,193,.60) 0%,rgba(195,216,165,.50) 19%,rgba(117,159,132,.30) 44%,transparent 76%);mix-blend-mode:screen;animation:ai05-breathe 4.4s ease-in-out infinite}
.ai05-core::before{content:'';position:absolute;inset:-13%;border-radius:46% 54% 47% 53%/52% 43% 57% 48%;background:conic-gradient(from 65deg,transparent 0deg,#d3e4bc77 38deg,transparent 98deg,#f4c1896b 173deg,transparent 240deg,#8ab39d55 310deg,transparent 360deg);filter:blur(var(--ai05-blur));animation:ai05-swirl 9.2s ease-in-out infinite alternate}
.ai05-core::after{content:'';position:absolute;inset:21%;border-radius:57% 43% 55% 45%;background:radial-gradient(ellipse at 38% 30%,#fff4d6bf,transparent 65%);filter:blur(var(--ai05-blur));animation:ai05-drift 5.8s ease-in-out infinite alternate}
.ai05-radar{z-index:3;position:absolute;inset:5%;border-radius:50%;background:conic-gradient(from 20deg,transparent 0deg,transparent 285deg,#fef4d075 332deg,transparent 355deg);-webkit-mask:radial-gradient(circle,transparent 20%,#000 42% 76%,transparent 88%);mask:radial-gradient(circle,transparent 20%,#000 42% 76%,transparent 88%);opacity:0}
.ai05-layer[data-state=holding] .ai05-radar{opacity:.8;animation:ai05-rotate 4.6s linear infinite}
.ai05-layer[data-state=recording] .ai05-core{filter:brightness(calc(1 + var(--ai05-volume)*.43));animation-duration:3.2s}
.ai05-layer[data-state=recording] .ai05-aura-mesh{transform:scale(calc(1.02 + var(--ai05-volume)*.11));opacity:calc(.72 + var(--ai05-volume)*.18)}
.ai05-layer[data-state=locked] .ai05-core{animation-duration:6.8s;filter:brightness(calc(1 + var(--ai05-volume)*.28))}
.ai05-layer[data-state=locked] .ai05-visual::before{animation-duration:8.2s}
/* No pointed triangle: translucent elliptical flow with moving focus and soft wide foot. */
.ai05-path{position:absolute;left:calc(var(--cx) + var(--ai05-move-x)*.22);bottom:calc(100% - var(--cy) + var(--ai05-size)*.22);width:var(--ai05-trail-width);height:var(--ai05-rise);opacity:0;pointer-events:none;border-radius:46% 54% 42% 58%/58% 51% 49% 42%;filter:blur(calc(var(--ai05-blur)*2));background:radial-gradient(ellipse at 51% 94%,rgba(247,199,141,.76),rgba(181,208,167,.54) 29%,rgba(112,168,131,.30) 56%,transparent 78%);transform:translateX(-50%) scaleX(calc(1 - var(--ai05-focus)*.52));transform-origin:50% 100%;transition:height .18s ease,opacity .24s ease,transform .22s ease,left .19s ease;animation:ai05-cloud-shape 7.9s ease-in-out infinite alternate}
.ai05-path::before{content:'';position:absolute;left:25%;right:25%;top:1%;height:48%;border-radius:58% 42% 55% 45%/43% 57% 46% 54%;background:radial-gradient(ellipse at 48% 44%,rgba(255,237,194,.75),rgba(255,192,118,.34) 29%,transparent 78%);filter:blur(calc(var(--ai05-blur)*.9));opacity:var(--ai05-focus);animation:ai05-organic-c 8.7s ease-in-out infinite alternate}
.ai05-path::after{content:'';position:absolute;inset:21% 14% -8%;border-radius:48% 52% 56% 44%;background:radial-gradient(ellipse at 50% 85%,rgba(234,206,150,.39),rgba(170,209,172,.20) 46%,transparent 73%);filter:blur(calc(var(--ai05-blur)*1.5));animation:ai05-cloud-shape 9.4s ease-in-out -2s infinite alternate}
.ai05-layer[data-state=holding] .ai05-path{height:calc(var(--ai05-size)*.62);opacity:.13}
.ai05-layer[data-state=recording] .ai05-path{opacity:calc(.66 + var(--ai05-volume)*.19)}
.ai05-layer[data-state=locked] .ai05-path{height:calc(var(--ai05-size)*.35);opacity:.12}
/* Prototype H1.38: understated legible white status rather than a dark green banner. */
.ai05-hint{position:absolute;left:var(--cx);top:calc(var(--cy) - var(--ai05-hint-y));transform:translateX(-50%);margin:0;max-width:calc(100vw - 44px);width:max-content;white-space:normal;text-align:center;font-size:14px;line-height:1.42;font-weight:550;letter-spacing:0;color:#fffcf3;padding:0 4px;text-shadow:0 2px 8px rgba(10,38,25,.78);background:transparent}
/* Physical 44px target, visually scaled down rounded 31px mark. */
.ai05-lock,.ai05-stop{position:absolute;top:calc(var(--cy) - var(--ai05-control-y));height:44px;width:44px;display:grid;place-items:center;border:0;background:transparent;color:#34664b;transform:translate(-50%,-50%);cursor:pointer;pointer-events:auto;filter:drop-shadow(0 2px 5px rgba(23,50,34,.35))}
.ai05-lock::before,.ai05-stop::before{content:'';position:absolute;inset:6px;border-radius:50%;border:1px solid rgba(255,237,208,.7);background:rgba(254,247,227,.94);box-shadow:0 0 9px rgba(226,169,103,.3)}
.ai05-lock{left:calc(var(--cx) - var(--ai05-offset));color:#aa7447}
.ai05-stop{left:calc(var(--cx) + var(--ai05-offset))}
.ai05-lock svg,.ai05-stop svg{width:17px;height:17px;position:relative;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ai05-stop svg{fill:currentColor;stroke:none;width:11px;height:11px}
.ai05-lock[hidden],.ai05-stop[hidden]{display:none!important}
.ai05-layer[data-state=recording] .ai05-lock,.ai05-layer[data-state=locked] .ai05-lock,.ai05-layer[data-state=locked] .ai05-stop{pointer-events:auto}
.ai05-layer[data-state=locked] .ai05-lock{color:#2c694b}
.ai05-layer[data-state=locked] .ai05-lock::before,.ai05-layer[data-state=locked] .ai05-stop::before{background:#e0eee0;border-color:#96b7a0;box-shadow:0 0 0 3px #a8d4b626,0 0 12px #93c2a24c}
.ai05-actions .btn.ghost:not(:disabled){opacity:1;border-color:var(--edge);background:var(--glass2);color:var(--fg)}
@keyframes ai05-hold-ring{from{transform:scale(1);filter:brightness(1.06)}to{transform:scale(1.065);filter:brightness(1.28) drop-shadow(0 0 3px rgba(255,169,67,.55))}}
@keyframes ai05-record-ring{0%,100%{transform:scale(1.006);filter:brightness(1.03)}55%{transform:scale(1.048);filter:brightness(1.17) drop-shadow(0 0 4px rgba(246,180,102,.38))}}
@keyframes ai05-breathe{0%,100%{opacity:.73;transform:scale(.98)}50%{opacity:.96;transform:scale(1.018)}}
@keyframes ai05-swirl{from{transform:rotate(-16deg) scale(1)}to{transform:rotate(28deg) scale(1.06)}}
@keyframes ai05-drift{from{transform:translate(-9%,-4%) rotate(-8deg)}to{transform:translate(12%,6%) rotate(14deg)}}
@keyframes ai05-aura{0%,100%{transform:scale(.95);opacity:.43}50%{transform:scale(1.10);opacity:.76}}
@keyframes ai05-organic-a{from{transform:rotate(-13deg) scale(.93);border-radius:45% 55% 53% 47%}to{transform:rotate(26deg) scale(1.05);border-radius:58% 42% 44% 56%}}
@keyframes ai05-organic-b{from{transform:rotate(14deg) scale(1.01)}to{transform:rotate(-28deg) scale(.96)}}
@keyframes ai05-organic-c{from{transform:rotate(-7deg) translate(-3%,3%)}to{transform:rotate(12deg) translate(6%,-4%)}}
@keyframes ai05-cloud-shape{from{border-radius:46% 54% 42% 58%/58% 51% 49% 42%}to{border-radius:56% 44% 52% 48%/48% 63% 37% 52%}}
@keyframes ai05-rotate{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){body.ai05-focused #app,body.ai05-focused #tabs nav button:not(#hub){transition:none!important}body.ai05-focused #hub .drugoy-ring,.ai05-visual::before,.ai05-aura-mesh i,.ai05-core,.ai05-core::before,.ai05-core::after,.ai05-radar,.ai05-path,.ai05-path::before,.ai05-path::after{animation:none!important;transition:none!important}}
`;
document.head.append(style);
const LOCK_OPEN='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7a4.5 4.5 0 0 1 8.7-1.5"/></svg>';
const LOCK_CLOSED='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const STOP='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
function center(){const r=$('#hub')?.getBoundingClientRect();return r&&r.width&&r.height?{x:r.left+r.width/2,y:r.top+r.height/2,d:Math.min(r.width,r.height)}:null}
function updateGeometry(){const p=center();if(!p||!layer)return;
 const ratio=p.d/138; // Every optical measurement is scaled from the 138px H1.38 prototype.
 const props={'--cx':`${p.x}px`,'--cy':`${p.y}px`,'--ai05-size':`${p.d}px`,
 '--ai05-offset':`${106*ratio}px`,'--ai05-control-y':`${106*ratio}px`,
 '--ai05-hint-y':`${Math.max(101,244*ratio)}px`,'--ai05-trail-width':`${132*ratio}px`,
 '--ai05-blur':`${Math.max(3.1,9*ratio)}px`};
 for(const [k,v] of Object.entries(props))layer.style.setProperty(k,v);
}
function show(state,hint){
  if(!layer){layer=document.createElement('div');layer.className='ai05-layer';layer.innerHTML=`<div class="ai05-backdrop" aria-hidden="true"></div><div class="ai05-path" aria-hidden="true"></div><div class="ai05-visual" aria-hidden="true"><div class="ai05-face"></div><div class="ai05-aura-mesh"><i></i><i></i><i></i></div><div class="ai05-core"></div><div class="ai05-radar"></div></div><p class="ai05-hint" role="status" aria-live="polite"></p><button type="button" class="ai05-lock" data-ai05="lock" hidden></button><button type="button" class="ai05-stop" data-ai05="stop" hidden aria-label="Завершить запись">${STOP}</button>`;document.body.appendChild(layer);
   const source=$('#hub .drugoy-ring');if(source){const copy=source.cloneNode(true);copy.className='ai05-ring-copy';copy.removeAttribute('id');copy.removeAttribute('style');layer.querySelector('.ai05-visual').appendChild(copy)}
  }
  updateGeometry();layer.dataset.state=state;document.body.classList.remove('ai05-holding','ai05-recording','ai05-locked');document.body.classList.add('ai05-focused',`ai05-${state}`);layer.querySelector('.ai05-hint').textContent=hint||'';
  const lock=layer.querySelector('.ai05-lock'),stop=layer.querySelector('.ai05-stop');
  lock.hidden=!['recording','locked'].includes(state);lock.innerHTML=state==='locked'?LOCK_CLOSED:LOCK_OPEN;
  lock.setAttribute('aria-label',state==='locked'?'Отменить запись':'Закрепить запись');stop.hidden=state!=='locked';
}
function hide(){layer?.remove();layer=null;document.body.classList.remove('ai05-focused','ai05-holding','ai05-recording','ai05-locked')}
window.addEventListener('resize',updateGeometry,{passive:true});window.addEventListener('scroll',updateGeometry,{passive:true});
const vibrateOn=()=>get('ai05_haptic','on')!=='off';
function haptic(){if(!vibrateOn())return;const strength=get('ai05_strength','gentle');const ms=strength==='strong'?36:strength==='medium'?24:12;
 const H=window.Capacitor?.Plugins?.Haptics;
 if(H?.impact){Promise.resolve(H.impact({style:strength==='strong'?'HEAVY':strength==='medium'?'MEDIUM':'LIGHT'})).catch(()=>safe(()=>navigator.vibrate?.(ms)));return}
 safe(()=>navigator.vibrate?.(ms));}
function endPulse(){clearInterval(hapticTimer);clearTimeout(hapticEcho);hapticTimer=0;hapticEcho=0}
function pulse(active){endPulse();haptic();const rhythm=get('ai05_rhythm','breath');const period=rhythm==='steady'?1250:rhythm==='heart'?1700:1950;
 hapticTimer=setInterval(()=>{if(!active()){endPulse();return}haptic();if(rhythm==='heart')hapticEcho=setTimeout(()=>{if(active())haptic()},160)},period)}
function clearHold(){clearTimeout(holdTimeout);holdTimeout=0;endPulse()}
function stopTracks(){if(stream){stream.getTracks().forEach(t=>safe(()=>t.stop()));stream=null}}
function stopVolume(){if(raf)cancelAnimationFrame(raf);raf=0;safe(()=>audioSource?.disconnect());audioSource=null;analyser=null;const c=audioContext;audioContext=null;if(c)Promise.resolve(c.close()).catch(()=>{})}
function volume(sourceStream){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audioContext=new C();Promise.resolve(audioContext.resume?.()).catch(()=>{});audioSource=audioContext.createMediaStreamSource(sourceStream);analyser=audioContext.createAnalyser();analyser.fftSize=512;audioSource.connect(analyser);
 const values=new Uint8Array(512);let filtered=0;const frame=()=>{if(!layer||!analyser||!run||run.done)return;analyser.getByteTimeDomainData(values);let energy=0;for(const x of values){const a=(x-128)/128;energy+=a*a}const v=Math.min(1,Math.sqrt(energy/512)*6);filtered=filtered*.8+v*.2;layer.style.setProperty('--ai05-volume',filtered.toFixed(3));raf=requestAnimationFrame(frame)};raf=requestAnimationFrame(frame)
 }catch(_){stopVolume()}}
/* This speech session never replaces VOX methods. Other app microphone fields keep their own engine. */
function makeSpeech(owner){let on=true,mode='',N=null,web=null,listeners=[],timer=0,retry=0,busy=false,partial='',segments=[],reason='',pending=null;
 const alive=()=>on&&run===owner&&!owner.done;
 const notice=t=>{const value=String(t||'').trim();if(value)partial=value};
 const commit=()=>{if(partial){if(segments[segments.length-1]!==partial)segments.push(partial);partial=''}};
 const result=()=>[...segments,partial].filter(Boolean).join(' ').trim();
 const startNative=async()=>{N=window.Capacitor?.Plugins?.SpeechRecognition||safe(()=>PLG('SpeechRecognition'));
  if(!N?.start||!N?.addListener)return false;
  mode='native';try{
   const available=await N.available?.();if(!alive())return false;
   if(available?.available===false)throw new Error('На телефоне недоступна служба распознавания речи');
   const permission=await N.requestPermissions?.();if(!alive())return false;
   if(permission?.speechRecognition&&permission.speechRecognition!=='granted')throw new Error('Нет разрешения на распознавание речи');
   listeners.push(await N.addListener('partialResults',d=>{if(alive()||owner.finishing)notice(d?.matches?.[0])}));
   listeners.push(await N.addListener('listeningState',st=>{if(st?.status==='stopped'&&alive()){
    commit();clearTimeout(retry);retry=setTimeout(()=>{if(alive()&&!busy)nativeGo()},360)
   }}));
   const begin=()=>nativeGo();begin();
   timer=setInterval(async()=>{if(!alive()||busy)return;try{const st=await N.isListening?.();if(st?.listening===false&&alive())nativeGo()}catch(_){ }},1100);
   return true;
  }catch(e){reason=String(e?.message||e||'Служба распознавания не запустилась');return false}}
 const nativeGo=()=>{if(!alive()||busy)return;busy=true;
  pending=Promise.resolve().then(()=>N.start({language:'ru-RU',maxResults:1,partialResults:true,popup:false})).then(d=>{
   if(d?.matches?.[0]&&(alive()||owner.finishing))notice(d.matches[0]);
  }).catch(e=>{if(alive())reason=String(e?.message||e||'Ошибка распознавания')}).finally(()=>{busy=false;
   if(alive()&&partial){commit()} });
 };
 const startWeb=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return false;mode='web';
  const launch=()=>{if(!alive())return;try{web=new SR();web.lang='ru-RU';web.continuous=true;web.interimResults=true;
    web.onresult=e=>{if(!alive()&&!owner.finishing)return;for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];notice(r[0]?.transcript);if(r.isFinal)commit()}};
    web.onerror=e=>{if(['not-allowed','service-not-allowed','network'].includes(e.error)){reason=e.error==='network'?'Распознавание в браузере может требовать интернет':'Нет разрешения на распознавание речи';on=false}};
    web.onend=()=>{if(alive())retry=setTimeout(launch,320)};web.start();
   }catch(e){reason=String(e?.message||e||'Распознавание в браузере не запустилось')}};
  launch();return true};
 const start=async()=>{if(!alive())return false;
  if(window.Capacitor?.Plugins?.SpeechRecognition||safe(()=>PLG('SpeechRecognition'))){const ok=await startNative();if(!ok&&alive()&&startWeb())return true;return ok}
  if(startWeb())return true;
  reason='На этом устройстве нет доступного распознавания речи';return false};
 const stop=async()=>{on=false;clearInterval(timer);clearTimeout(retry);
  try{if(mode==='native'&&N?.stop)await Promise.race([Promise.resolve(N.stop()),wait(1250)]);else if(web)web.stop()}catch(e){if(!reason)reason=String(e?.message||e)}
  // Android may deliver the last partialResults only after stop() resolves.
  await Promise.race([Promise.resolve(pending).catch(()=>{}),wait(500)]);
  await wait(mode==='native'?520:300);commit();
  for(const h of listeners){try{await h.remove?.()}catch(_){}}listeners=[];
  return {text:result(),issue:reason};
 };
 const cancel=()=>{on=false;clearInterval(timer);clearTimeout(retry);safe(()=>N?.stop?.());safe(()=>web?.abort?.());for(const h of listeners)safe(()=>h.remove?.());listeners=[]};
 return {start,stop,cancel,result,get issue(){return reason}};
}
function invalidate(){clearHold();stopVolume();const previous=run;if(previous)previous.done=true;
 asr?.cancel();asr=null;if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;safe(()=>recorder.stop())}
 recorder=null;stopTracks();recordPending=null;recordChunks=[];recordBlob=null;spoken='';speechIssue='';run=null;gesture=null;hide()}
function startCapture(owner){recordChunks=[];recordBlob=null;recordStarted=Date.now();recordDuration=0;
 recordPending=(async()=>{let requested=null;try{
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Запись аудио не поддерживается');
  requested=navigator.mediaDevices.getUserMedia({audio:true});
  const captured=await Promise.race([requested,wait(25000).then(()=>{throw new Error('Микрофон не отвечает')})]);
  if(owner.done||run!==owner)return; // finally releases a late granted stream exactly once
  stream=captured;const format=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
  recorder=new MediaRecorder(stream,format?{mimeType:format}:{});
  recorder.ondataavailable=e=>{if(e.data?.size)recordChunks.push(e.data)};
  recorder.start(250);volume(stream);
 }catch(e){if(run===owner&&!owner.done){owner.captureError=String(e?.message||e||'Микрофон недоступен');show(owner.state,'Нет аудио · можно попробовать диктовку')}}
 finally{if(requested)Promise.resolve(requested).then(s=>{if(owner.done||run!==owner)s?.getTracks?.().forEach(t=>safe(()=>t.stop()))},()=>{})}
 })();return recordPending;
}
function begin(){if(run)return;run={state:'recording',done:false,finishing:false};const owner=run;
 spoken='';speechIssue='';show('recording','Записываю · отпусти, чтобы закончить');pulse(()=>run===owner&&owner.state==='recording'&&!owner.finishing);
 asr=makeSpeech(owner);Promise.resolve(asr.start()).catch(e=>{if(run===owner)speechIssue=String(e?.message||e)});
 startCapture(owner);
}
async function finish(){const owner=run;if(!owner||owner.done||owner.finishing)return;owner.finishing=true;clearHold();show('recording','Завершаю запись…');
 await Promise.race([Promise.resolve(recordPending).catch(()=>{}),wait(5000)]);
 if(run!==owner||owner.done)return;
 if(recorder&&recorder.state!=='inactive')await new Promise(resolve=>{let settled=false;const complete=()=>{if(settled)return;settled=true;clearTimeout(fallback);resolve()};const fallback=setTimeout(complete,1750);recorder.onstop=complete;try{recorder.stop()}catch(_){complete()}});
 if(recordChunks.length)recordBlob=new Blob(recordChunks,{type:recorder?.mimeType||'audio/webm'});
 recordDuration=Math.max(0,Date.now()-recordStarted);recorder=null;stopVolume();stopTracks();
 const output=asr?await asr.stop():{text:'',issue:'Движок распознавания недоступен'};
 if(run!==owner||owner.done)return;
 spoken=output.text||'';speechIssue=output.issue||speechIssue||owner.captureError||'';
 if(!spoken&&!speechIssue)speechIssue='Распознавание не вернуло текст. Проверь доступ к микрофону и настройки службы речи.';
 owner.done=true;asr=null;run=null;gesture=null;hide();showActions();
}
function cancel(){invalidate()}
function showActions(){stagedMenu=true;
 const audio=!!recordBlob;const t=spoken;
 const warning=!t&&speechIssue?`<p class="small mut" id="ai05-warning" style="margin:0 0 10px">${esc(speechIssue)}</p>`:'';
 openSheet(`<h3>Запись завершена</h3><p class="sub">${audio?'Выбери, что сделать с записью.':t?'Текст распознан, но аудио не сохранилось.':'Аудио не сохранилось, но можно ввести текст вручную.'}</p>
 ${warning}<label class="lb" for="ai05-transcript">Текст речи · можно исправить</label>
 <textarea id="ai05-transcript" rows="3" placeholder="Речь не распозналась? Введи текст здесь." style="width:100%;min-height:86px;resize:vertical;margin:4px 0 11px" aria-label="Распознанный текст"></textarea>
 ${audio?'<label class="small mut" style="display:flex;align-items:center;gap:9px;margin:3px 0 12px"><input id="ai05-both" type="checkbox"> Сохранить аудио вместе с текстом</label>':''}
 <div class="stack ai05-actions"><button type="button" class="btn w" data-ai05="text">В дневник текст</button>
 <button type="button" class="btn ghost w" data-ai05="audio" ${audio?'':'disabled'}>В дневник аудио</button>
 <button type="button" class="btn ghost w" data-ai05="tasks">Распознать задачи</button>
 <button type="button" class="lnk" data-ai05="discard">Удалить запись</button></div>`);
 const input=$('#ai05-transcript');if(input)input.value=t;
}
function stagedText(){return ($('#ai05-transcript')?.value||'').trim()}
const dataUrl=blob=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(blob)});
function clearStaged(st){if(!st?.ai05Blob)return;safe(()=>URL.revokeObjectURL(st.ai05PreviewUrl));st.ai05Blob=null;st.ai05PreviewUrl=null}
const oldCloseSheet=closeSheet;
closeSheet=function(...args){if(SH?.nst?.ai05Blob)clearStaged(SH.nst);
 if(stagedMenu){stagedMenu=false;recordBlob=null;spoken=''}
 return oldCloseSheet(...args)};
const oldNoteSave=A.nsave;
A.nsave=async function(e){const st=SH?.nst;if(!st?.ai05Blob)return oldNoteSave(e);
 const blob=st.ai05Blob;const id=phNew();
 try{await PH.put(id,await dataUrl(blob))}catch(_){toast('Аудио не удалось сохранить. Попробуй ещё раз');return}
 st.audio={id,mime:blob.type,ms:recordDuration};clearStaged(st);return oldNoteSave(e)};
const oldNoteRemove=A.naudremove;
A.naudremove=function(e){if(SH?.nst?.ai05Blob)clearStaged(SH.nst);return oldNoteRemove(e)};
async function action(type){
 if(type==='discard'){recordBlob=null;spoken='';closeSheet();return}
 if(type==='text'||type==='tasks'){
  const value=stagedText();
  if(!value){const t=$('#ai05-transcript');if(t){t.setAttribute('aria-invalid','true');t.placeholder='Сначала напиши текст или повтори запись';}toast('Текста пока нет. Введи его здесь или сохрани аудио.');return}
  stagedMenu=false;recordBlob=null;
  if(type==='text'){sheetNote(TODAY(),null);const box=$('#ntx');if(box){box.value=value;box.dispatchEvent(new Event('input',{bubbles:true}))}}
  else { // Task parsing must not inherit the active evening/diary context.
    sheetQuick(true);if(SH?.st){SH.st.ctx='today';SH.st.force=null}
    const box=$('#qq');if(box){box.placeholder='Проверь, что нужно сделать';box.value=value;box.dispatchEvent(new Event('input',{bubbles:true}))}
  }
  return;
 }
 if(type==='audio'){
  const blob=recordBlob;if(!blob)return;const both=$('#ai05-both')?.checked;const value=stagedText();
  stagedMenu=false;sheetNote(TODAY(),null);const st=SH?.nst;
  if(!st){toast('Дневник не открылся');return}
  st.ai05Blob=blob;st.ai05PreviewUrl=URL.createObjectURL(blob);
  if(both&&value){const box=$('#ntx');if(box){box.value=value;box.dispatchEvent(new Event('input',{bubbles:true}))}}
  const box=$('#naudioprev');if(box){const player=document.createElement('audio');player.controls=true;player.preload='metadata';player.src=st.ai05PreviewUrl;
   const remove=document.createElement('button');remove.type='button';remove.className='lnk';remove.dataset.a='naudremove';remove.textContent='Убрать аудио';box.replaceChildren(player,remove)}
  recordBlob=null;toast('Аудио подготовлено. Сохранится, когда нажмёшь «Сохранить».');
 }
}
window.addEventListener('click',e=>{const b=e.target.closest?.('[data-ai05]');if(!b)return;
 const kind=b.dataset.ai05;if(!['lock','stop','cancel','text','audio','tasks','discard'].includes(kind))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(kind==='lock'){if(run?.state==='recording'&&!run.finishing){run.state='locked';show('locked','Запись закреплена · нажми «Стоп»');pulse(()=>!!run&&run.state==='locked'&&!run.finishing)}else if(run?.state==='locked')cancel()}
 else if(kind==='stop')finish();else if(kind==='cancel')cancel();else Promise.resolve(action(kind)).catch(()=>toast('Не удалось выполнить действие'));
},true);
function lockZone(x,y){if(!layer)return false;const box=layer.querySelector('.ai05-lock')?.getBoundingClientRect();return !!box&&Math.hypot(x-(box.left+box.width/2),y-(box.top+box.height/2))<=30}
function nearHub(x,y){const c=center();return !!c&&Math.hypot(x-c.x,y-c.y)<c.d*.49}
function moved(e){if(!gesture||gesture.id!==e.pointerId)return;
 const dy=e.clientY-gesture.y;
 if(!run&&dy< -24){gesture.used=true;begin()}
 if(!run||run.finishing)return;
 gesture.lock=lockZone(e.clientX,e.clientY);
 gesture.cancel=nearHub(e.clientX,e.clientY)&&dy>-14;
 if(gesture.lock)show(run.state,'Отпусти у замочка, чтобы закрепить');
 else if(gesture.cancel)show(run.state,'Отпусти в центре для отмены');
 else if(run.state==='recording')show('recording','Записываю · отпусти, чтобы закончить');
 {const c=center();const ratio=(c?.d||58)/138;const focus=Math.max(0,Math.min(1,-dy/(64*ratio/0.42)));layer?.style.setProperty('--ai05-rise',`${Math.min(145*ratio,Math.max(55*ratio,-dy*.75))}px`);layer?.style.setProperty('--ai05-focus',String(focus));layer?.style.setProperty('--ai05-move-x',`${Math.max(-20*ratio,Math.min(20*ratio,(e.clientX-gesture.x)*.18))}px`)}
}
window.addEventListener('pointerdown',e=>{
 if(!e.isPrimary||gesture||run||!e.target.closest?.('#hub'))return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,used:false,lock:false,cancel:false};
 clearHold();holdTimeout=setTimeout(()=>{
  if(!gesture||run)return;gesture.used=true;show('holding','Проведи вверх для записи');pulse(()=>!!gesture&&!run);
 },420);
 // Intercept before legacy document-level hold/quick handlers; tap still bubbles as click.
 e.stopPropagation();
},true);
window.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;moved(e);if(gesture?.used)e.preventDefault()},{capture:true,passive:false});
window.addEventListener('pointerup',e=>{
 if(!gesture||gesture.id!==e.pointerId)return;
 const g=gesture;clearHold();
 // Some Android WebViews deliver a fast swipe only as down/up (no move).
 if(!run&&e.clientY-g.y< -24){g.used=true;begin()}
 const used=g.used;
 if(run&&g.cancel)cancel();else if(run&&g.lock&&!run.finishing){run.state='locked';show('locked','Запись закреплена · нажми «Стоп»');pulse(()=>!!run&&run.state==='locked'&&!run.finishing)}
 else if(run)finish();else hide();
 gesture=null;if(used){lastGesture=Date.now();e.preventDefault();e.stopPropagation()}
},true);
window.addEventListener('pointercancel',e=>{if(gesture?.id!==e.pointerId)return;const used=gesture.used;cancel();if(used)lastGesture=Date.now()},true);
window.addEventListener('click',e=>{if(e.target.closest?.('#hub')&&Date.now()-lastGesture<900){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('pagehide',cancel);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&run)cancel()});
const oldSettings=sheetSettings;
sheetSettings=function(){oldSettings();const sheet=$('#sheet');if(!sheet||sheet.querySelector('#ai05-haptic-settings'))return;
 const on=vibrateOn(),strength=get('ai05_strength','gentle'),rhythm=get('ai05_rhythm','breath');
 const card=document.createElement('div');card.id='ai05-haptic-settings';card.className='card';card.style.marginTop='14px';
 card.innerHTML=`<h4 style="margin:4px 0 11px">Тактильный отклик</h4>
 <div class="op"><span class="grow">Вибрация живой кнопки</span><button type="button" class="tog${on?' on':''}" data-ai05-setting="on" aria-label="Вибрация кнопки" aria-pressed="${on}"></button></div>
 <label class="lb">Интенсивность</label><div class="seg" style="margin-top:4px">${[['gentle','Нежная'],['medium','Средняя'],['strong','Сильная']].map(([v,t])=>`<button type="button" data-ai05-setting="strength" data-v="${v}" class="${strength===v?'on':''}" aria-pressed="${strength===v}">${t}</button>`).join('')}</div>
 <label class="lb">Ритм</label><div class="seg" style="margin-top:4px">${[['breath','Дыхание'],['heart','Сердцебиение'],['steady','Ровный']].map(([v,t])=>`<button type="button" data-ai05-setting="rhythm" data-v="${v}" class="${rhythm===v?'on':''}" aria-pressed="${rhythm===v}">${t}</button>`).join('')}</div>
 <p class="small mut" style="margin:10px 1px 0">Точная сила вибрации зависит от телефона. В веб-режиме меняется рисунок импульсов.</p>`;
 sheet.append(card);
};
window.addEventListener('click',e=>{const b=e.target.closest?.('[data-ai05-setting]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();const key=b.dataset.ai05Setting;
 if(key==='on')put('ai05_haptic',vibrateOn()?'off':'on');
 if(key==='strength'&&['gentle','medium','strong'].includes(b.dataset.v))put('ai05_strength',b.dataset.v);
 if(key==='rhythm'&&['breath','heart','steady'].includes(b.dataset.v))put('ai05_rhythm',b.dataset.v);
 sheetSettings();
},true);
})();
