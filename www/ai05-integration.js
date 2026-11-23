/* AI-05 H1.48: one existing 12A-1 ring, gesture layer and isolated speech session.
 * Browser-tested with mocks; real Android recognition, offline ASR and competing
 * microphone capture still require device acceptance. Emergency opt-out:
 * localStorage.setItem('ai05_enabled','0'); location.reload();
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
style.id='ai05-h148-styles';
style.textContent=`
#hub.drugoy-hub-preview{touch-action:none;-webkit-user-select:none;user-select:none}
.ai05-layer{position:fixed;inset:0;z-index:39;pointer-events:none;background:transparent;--ai05-volume:0;--ai05-rise:75px;--ai05-size:58px}
.ai05-visual{position:absolute;left:var(--cx);top:var(--cy);width:var(--ai05-size);height:var(--ai05-size);transform:translate(-50%,-50%);pointer-events:none;isolation:isolate}
.ai05-visual::before{content:'';position:absolute;inset:-14%;border-radius:50%;background:radial-gradient(circle,#a4c8994d 4%,#c7dba137 45%,transparent 72%);filter:blur(7px);animation:ai05-aura 4.9s ease-in-out infinite}
.ai05-core{position:absolute;inset:6%;border-radius:50%;overflow:hidden;clip-path:circle(49%);background:radial-gradient(ellipse at 41% 34%,#fbf3c1af 0%,#c3d8a58c 19%,#759f8480 44%,transparent 76%);mix-blend-mode:screen;animation:ai05-breathe 3.4s ease-in-out infinite}
.ai05-core::before{content:'';position:absolute;inset:-13%;border-radius:46% 54% 47% 53% / 52% 43% 57% 48%;background:conic-gradient(from 65deg,transparent 0deg,#d3e4bc77 38deg,transparent 98deg,#f4c1896b 173deg,transparent 240deg,#8ab39d55 310deg,transparent 360deg);filter:blur(5px);animation:ai05-swirl 9.2s ease-in-out infinite alternate}
.ai05-core::after{content:'';position:absolute;inset:21%;border-radius:57% 43% 55% 45%;background:radial-gradient(ellipse at 38% 30%,#fff4d6bf,transparent 65%);filter:blur(5px);animation:ai05-drift 5.8s ease-in-out infinite alternate}
.ai05-radar{position:absolute;inset:6%;border-radius:50%;background:conic-gradient(from 20deg,transparent 0deg,transparent 285deg,#fef4d05e 332deg,transparent 355deg);mask:radial-gradient(circle,transparent 20%,#000 42% 76%,transparent 88%);-webkit-mask:radial-gradient(circle,transparent 20%,#000 42% 76%,transparent 88%);opacity:0}
.ai05-layer[data-state=holding] .ai05-radar{opacity:.8;animation:ai05-rotate 4.6s linear infinite}
.ai05-layer[data-state=recording] .ai05-core{filter:brightness(calc(1 + var(--ai05-volume)*.4));transform:scale(calc(1 + var(--ai05-volume)*.08));animation-duration:2.1s}
.ai05-layer[data-state=locked] .ai05-core{animation-duration:4.7s;filter:brightness(calc(1 + var(--ai05-volume)*.3))}
.ai05-layer[data-state=locked] .ai05-visual::before{animation-duration:6s}
.ai05-path{position:absolute;left:var(--cx);bottom:calc(100% - var(--cy) + var(--ai05-size)*.18);width:66px;height:var(--ai05-rise);transform:translateX(-50%);transform-origin:bottom;opacity:0;pointer-events:none;filter:blur(3px);background:radial-gradient(ellipse at 50% 100%,#f7c88c9e,transparent 62%),linear-gradient(to top,#d5d7a06b 0%,#7dbe9c5a 47%,transparent 100%);clip-path:polygon(6% 100%,94% 100%,67% 51%,53% 0%,47% 0%,33% 51%);transition:height .12s ease,opacity .15s ease}
.ai05-path::after{content:'';position:absolute;left:38%;right:38%;bottom:0;top:10%;border-radius:50%;background:linear-gradient(to top,#ffe2a58c,#d9ead07a,transparent);filter:blur(3px)}
.ai05-layer[data-state=holding] .ai05-path{height:88px;opacity:.48}
.ai05-layer[data-state=recording] .ai05-path,.ai05-layer[data-state=locked] .ai05-path{opacity:.82}
.ai05-hint{position:absolute;left:var(--cx);top:calc(var(--cy) - 138px);transform:translateX(-50%);margin:0;max-width:calc(100vw - 24px);width:max-content;white-space:normal;text-align:center;font-size:12px;line-height:1.35;font-weight:600;letter-spacing:.005em;color:#fffdf3;padding:6px 12px;border-radius:30px;background:rgba(28,60,44,.87);box-shadow:0 3px 14px #102c1935}
.ai05-lock,.ai05-stop{position:absolute;top:calc(var(--cy) - var(--ai05-offset));height:44px;width:44px;display:grid;place-items:center;border-radius:50%;border:1px solid #ffffff85;background:#dcebd9;color:#225040;box-shadow:0 2px 13px #142c2759;transform:translate(-50%,-50%);font-weight:700;cursor:pointer}
.ai05-lock{left:calc(var(--cx) - var(--ai05-offset))}.ai05-stop{left:calc(var(--cx) + var(--ai05-offset))}
.ai05-lock svg,.ai05-stop svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ai05-stop svg{fill:currentColor;stroke:none;width:13px;height:13px}
.ai05-lock[hidden],.ai05-stop[hidden]{display:none!important}
.ai05-actions .btn.ghost:not(:disabled){opacity:1;border-color:var(--edge);background:var(--glass2);color:var(--fg)}
.ai05-layer[data-state=recording] .ai05-lock,.ai05-layer[data-state=locked] .ai05-lock,.ai05-layer[data-state=locked] .ai05-stop{pointer-events:auto}
.ai05-layer[data-state=locked] .ai05-lock{background:#f4eee0;color:#486253}
@keyframes ai05-breathe{0%,100%{opacity:.74;transform:scale(.98)}50%{opacity:.97;transform:scale(1.018)}}
@keyframes ai05-swirl{from{transform:rotate(-16deg) scale(1)}to{transform:rotate(28deg) scale(1.06)}}
@keyframes ai05-drift{from{transform:translate(-9%,-4%) rotate(-8deg)}to{transform:translate(12%,6%) rotate(14deg)}}
@keyframes ai05-aura{0%,100%{transform:scale(.96);opacity:.46}50%{transform:scale(1.1);opacity:.8}}
@keyframes ai05-rotate{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.ai05-visual::before,.ai05-core,.ai05-core::before,.ai05-core::after,.ai05-radar{animation:none!important}.ai05-path{transition:none!important}}
`;
document.head.append(style);
const LOCK_OPEN='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7a4.5 4.5 0 0 1 8.7-1.5"/></svg>';
const LOCK_CLOSED='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
const STOP='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';
function center(){const r=$('#hub')?.getBoundingClientRect();return r&&r.width&&r.height?{x:r.left+r.width/2,y:r.top+r.height/2,d:Math.min(r.width,r.height)}:null}
function updateGeometry(){const p=center();if(!p||!layer)return;layer.style.setProperty('--cx',`${p.x}px`);layer.style.setProperty('--cy',`${p.y}px`);layer.style.setProperty('--ai05-size',`${p.d}px`);layer.style.setProperty('--ai05-offset',`${Math.max(49,p.d*.94)}px`)}
function show(state,hint){
  if(!layer){layer=document.createElement('div');layer.className='ai05-layer';layer.innerHTML=`<div class="ai05-path" aria-hidden="true"></div><div class="ai05-visual" aria-hidden="true"><div class="ai05-core"></div><div class="ai05-radar"></div></div><p class="ai05-hint" role="status" aria-live="polite"></p><button type="button" class="ai05-lock" data-ai05="lock" hidden></button><button type="button" class="ai05-stop" data-ai05="stop" hidden aria-label="Завершить запись">${STOP}</button>`;document.body.appendChild(layer)}
  updateGeometry();layer.dataset.state=state;layer.querySelector('.ai05-hint').textContent=hint||'';
  const lock=layer.querySelector('.ai05-lock'),stop=layer.querySelector('.ai05-stop');
  lock.hidden=!['recording','locked'].includes(state);lock.innerHTML=state==='locked'?LOCK_CLOSED:LOCK_OPEN;
  lock.setAttribute('aria-label',state==='locked'?'Отменить запись':'Закрепить запись');stop.hidden=state!=='locked';
}
function hide(){layer?.remove();layer=null}
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
 const warning=audio&&!t&&speechIssue?`<p class="small mut" id="ai05-warning" style="margin:0 0 10px">${esc(speechIssue)}</p>`:'';
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
  const value=stagedText();stagedMenu=false;recordBlob=null;
  if(type==='text'){sheetNote(TODAY(),null);const box=$('#ntx');if(box){box.value=value;box.dispatchEvent(new Event('input',{bubbles:true}))}}
  else {sheetQuick(false);const box=$('#qq');if(box){box.value=value;box.dispatchEvent(new Event('input',{bubbles:true}))}}
  if(!value)toast('Речь не распозналась. Текст можно ввести вручную.');return;
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
 layer?.style.setProperty('--ai05-rise',`${Math.min(156,Math.max(60,-dy*1.35))}px`);
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
