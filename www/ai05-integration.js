/* AI-05 H1.46 integration test. Builds on the H1.45 pilot and keeps the H1.4 data model.
 * Native/offline recognition is NOT verified; the device test must use airplane mode.
 * Kill-switch in emergency: localStorage.setItem('ai05_enabled','0'); reload.
 */
(()=>{
'use strict';
const get=(key,def)=>{try{return localStorage.getItem(key)??def}catch(_){return def}};
const put=(key,value)=>{try{localStorage.setItem(key,value)}catch(_){}};
if(get('ai05_enabled','1')==='0')return;
const $=s=>document.querySelector(s),safely=f=>{try{return f()}catch(_){return null}};
let pointer=null,session=null,lastGesture=0,holdTimeout=null,holdTimer=null;
let layer=null,hidden=null,stream=null,rec=null,chunks=[],recordPromise=null,recordDone=false;
let asr=false,asrStartPromise=null,asrError='',asrEvents=0,audioBlob=null,transcript='',startedAt=0,analyser=null,audioContext=null,source=null,raf=0,menuOpen=false;
const styles=document.createElement('style');styles.textContent=`
#hub.drugoy-hub-preview{touch-action:none}
.ai05-layer{position:fixed;inset:0;z-index:39;pointer-events:none;background:transparent;--ai05-volume:0}
.ai05-visual{position:absolute;left:var(--cx);top:var(--cy);transform:translate(-50%,-50%);width:68px;height:68px;pointer-events:none}
.ai05-orb{position:relative;width:100%;height:100%;border-radius:50%;overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at 42% 37%,#fff6c4 0%,#bdcb91 17%,#799c72 40%,#416e58 65%,#1a4338 100%);box-shadow:0 0 18px #cce9a566,0 0 30px #336f5b44;animation:ai05-breathe 2.7s ease-in-out infinite}
.ai05-orb::before{content:'';position:absolute;inset:-15%;border-radius:45%;background:radial-gradient(ellipse at 65% 38%,#fff9dfbb 0%,transparent 46%),radial-gradient(ellipse at 35% 65%,#b7d59c77 0%,transparent 54%);filter:blur(8px);animation:ai05-cloud 4.8s ease-in-out infinite alternate;transform:scale(calc(1 + var(--ai05-volume)*.3))}
.ai05-orb::after{content:'';position:absolute;inset:-22%;background:conic-gradient(from 75deg,transparent 0deg,#fff2bbbd 28deg,transparent 78deg,transparent 360deg);animation:ai05-radar 3.8s linear infinite;mix-blend-mode:screen;opacity:.6}
.ai05-layer[data-state=recording] .ai05-orb,.ai05-layer[data-state=locked] .ai05-orb{filter:brightness(calc(1 + var(--ai05-volume)*.28));box-shadow:0 0 calc(18px + var(--ai05-volume)*12px) #cce9a588,0 0 34px #38735b55}
.ai05-layer[data-state=recording] .ai05-orb::after,.ai05-layer[data-state=locked] .ai05-orb::after{animation:none;opacity:.15}
.ai05-layer[data-state=locked] .ai05-orb{animation-duration:3.6s}
.ai05-ring{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:3;filter:drop-shadow(0 0 5px #fff1c5)}
.ai05-label{position:absolute;left:12px;right:12px;top:calc(var(--cy) - 91px);text-align:center;font-weight:700;font-size:13px;color:#f5f8ed;text-shadow:0 1px 4px #172f24;line-height:1.35}
.ai05-lock,.ai05-stop{position:absolute;width:40px;height:40px;border:0;border-radius:50%;background:#d7e8d0;color:#244b34;font-size:19px;font-weight:750;box-shadow:0 2px 12px #15291f44;display:grid;place-items:center}
.ai05-lock{left:calc(var(--cx) - 49px);top:calc(var(--cy) - 49px);transform:translate(-50%,-50%)}
.ai05-stop{left:calc(var(--cx) + 49px);top:calc(var(--cy) - 49px);transform:translate(-50%,-50%)}
.ai05-layer[data-state=recording] .ai05-lock{opacity:.82;pointer-events:none}
.ai05-layer[data-state=locked] .ai05-lock,.ai05-layer[data-state=locked] .ai05-stop{pointer-events:auto;cursor:pointer}
.ai05-layer[data-state=locked] .ai05-lock{font-size:19px}
@keyframes ai05-breathe{0%,100%{transform:scale(.985);opacity:.97}50%{transform:scale(1.025);opacity:1}}
@keyframes ai05-cloud{from{transform:translate(-6%,4%) rotate(-10deg) scale(1)}to{transform:translate(6%,-5%) rotate(12deg) scale(1.07)}}
@keyframes ai05-radar{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.ai05-orb,.ai05-orb::before,.ai05-orb::after{animation:none!important}}
`;
document.head.append(styles);
const enabled=()=>get('ai05_haptic','on')!=='off';
function haptic(){
  if(!enabled())return;
  const strength=get('ai05_strength','gentle'),pattern=strength==='strong'?[36]:strength==='medium'?[24]:[12];
  const native=window.Capacitor?.Plugins?.Haptics;
  if(native?.impact){Promise.resolve(native.impact({style:strength==='strong'?'HEAVY':strength==='medium'?'MEDIUM':'LIGHT'})).catch(()=>safely(()=>navigator.vibrate?.(pattern)));return}
  safely(()=>navigator.vibrate?.(pattern));
}
function pulseStop(){clearInterval(holdTimer);holdTimer=null}
function pulseStart(active){pulseStop();haptic();const rhythm=get('ai05_rhythm','breath');const interval=rhythm==='steady'?1250:rhythm==='heart'?1700:1950;
  holdTimer=setInterval(()=>{if(!active())return pulseStop();haptic();if(rhythm==='heart')setTimeout(()=>{if(active())haptic()},160)},interval)}
function clearHold(){clearTimeout(holdTimeout);holdTimeout=null;pulseStop()}
function position(){const r=$('#hub')?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null}
function ui(state,text){
  if(!layer){layer=document.createElement('div');layer.className='ai05-layer';layer.innerHTML='<div class="ai05-visual"><div class="ai05-orb"><img class="ai05-ring" src="brand/12a1-ring-foreground.png" alt=""></div></div><div class="ai05-label" role="status" aria-live="polite"></div><button type="button" class="ai05-lock" hidden aria-label="Закрепить запись">🔓</button><button type="button" class="ai05-stop" hidden data-ai05="stop">■</button>';document.body.append(layer)}
  const p=position();if(p){layer.style.setProperty('--cx',p.x+'px');layer.style.setProperty('--cy',p.y+'px')}
  layer.dataset.state=state;layer.querySelector('.ai05-label').textContent=text||'';
  const lock=layer.querySelector('.ai05-lock'),stop=layer.querySelector('.ai05-stop');
  lock.hidden=!(state==='recording'||state==='locked');lock.textContent=state==='locked'?'×':'🔓';lock.setAttribute('aria-label',state==='locked'?'Отменить запись':'Закрепить запись');
  stop.hidden=state!=='locked';stop.setAttribute('aria-label','Завершить запись');
}
function removeUI(){layer?.remove();layer=null}
function stopTracks(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
function stopVolume(){cancelAnimationFrame(raf);raf=0;safely(()=>source?.disconnect());source=null;analyser=null;const c=audioContext;audioContext=null;if(c)Promise.resolve(c.close()).catch(()=>{})}
function startVolume(s){try{
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  audioContext=new C();Promise.resolve(audioContext.resume?.()).catch(()=>{});source=audioContext.createMediaStreamSource(s);analyser=audioContext.createAnalyser();analyser.fftSize=512;source.connect(analyser);
  const data=new Uint8Array(analyser.fftSize);let smoothed=0;
  const frame=()=>{if(!layer||!analyser)return;analyser.getByteTimeDomainData(data);let energy=0;for(const b of data){const z=(b-128)/128;energy+=z*z}
    const v=Math.min(1,Math.sqrt(energy/data.length)*6);smoothed=smoothed*.78+v*.22;layer.style.setProperty('--ai05-volume',smoothed.toFixed(3));raf=requestAnimationFrame(frame)};
  raf=requestAnimationFrame(frame);
}catch(_){stopVolume()}}
function installASRBridge(){
  if(typeof VOX==='undefined'||VOX.__ai05Bridge)return;
  VOX.__ai05Bridge=true;VOX._ai05Generation=0;VOX._ai05AcceptFinal=false;VOX._ai05LastError='';
  // The v6 plugin emits the last partial result asynchronously. Keep the listener alive
  // through stop(), then commit it before the hidden field is read by AI-05.
  VOX.go=async function(N){
    this.busy=true;
    try{const result=await N.start({language:'ru-RU',maxResults:1,partialResults:true,popup:false});const match=result&&result.matches&&result.matches[0];if(match){this.cur=String(match).trim();this.put();asrEvents++}return true}
    catch(e){this._ai05LastError=String(e?.message||e||'Не удалось запустить распознавание');return false}
    finally{setTimeout(()=>{this.busy=false},520)}
  };
  VOX.native=async function(N){
    const generation=++this._ai05Generation;
    try{
      if(typeof N.available==='function'){
        const a=await N.available();
        if(a&&a.available===false){this._ai05LastError='На телефоне недоступна служба распознавания речи';this.off();return false}
      }
      const p=await N.requestPermissions();
      if(p&&p.speechRecognition&&p.speechRecognition!=='granted'){
        this._ai05LastError='Нет разрешения на распознавание речи';this.off();permHint('mic');return false;
      }
      this.L.push(await N.addListener('partialResults',d=>{
        if(this._ai05Generation!==generation||(!this.on&&!this._ai05AcceptFinal))return;
        const m=d&&d.matches&&d.matches[0];
        if(m&&String(m).trim()){
          this.cur=String(m).trim();this.put();asrEvents++;
        }
      }));
      this.L.push(await N.addListener('listeningState',st=>{
        if(this._ai05Generation===generation&&st&&st.status==='stopped'&&this.on)setTimeout(()=>this.again(N),450);
      }));
      const ok=await this.go(N);
      if(!ok){this.off();return false}
      this.wd=setInterval(async()=>{
        if(!this.on||this.busy)return;
        try{const st=await N.isListening();if(st&&st.listening===false)this.again(N)}catch(_){ }
      },700);
      return true;
    }catch(e){this._ai05LastError=String(e?.message||e||'Системное распознавание не запустилось');this.off();return false}
  };
  VOX.stop=function(quick){
    if(!this.on)return Promise.resolve(this.tgt?document.getElementById(this.tgt)?.value||'':'');
    this.on=false;this._ai05AcceptFinal=true;clearInterval(this.wd);this.wd=null;
    const N=PLG('SpeechRecognition');let stopping;
    try{stopping=N?N.stop():this.web&&this.web.stop()}catch(e){stopping=Promise.reject(e)}
    return new Promise(resolve=>{
      let finished=false;
      const finalize=()=>{
        if(finished)return;finished=true;
        this.commit();this.put();
        this.L.forEach(h=>{try{h.remove()}catch(_){ }});this.L=[];
        this.web=null;this.bar(false);this.live(false);this._ai05AcceptFinal=false;this.busy=false;
        resolve(this.tgt?document.getElementById(this.tgt)?.value||'':'');
      };
      const grace=quick?160:(N?420:760);
      Promise.resolve(stopping).catch(()=>{}).then(()=>setTimeout(finalize,grace));
      setTimeout(finalize,quick?750:1600);
    });
  };
  const previousStart=VOX.start.bind(VOX);
  VOX.start=async function(id,mode){
    if(this.on)await this.stop(true);
    return previousStart(id,mode);
  };
}
installASRBridge();
async function stopASR(){
  if(asrStartPromise)await Promise.race([asrStartPromise,new Promise(r=>setTimeout(r,1800))]);
  if(asr||safely(()=>VOX.on)){
    asr=false;
    try{return await VOX.stop(false)}catch(e){asrError=String(e?.message||e||'Ошибка завершения распознавания')}
  }
  return hidden?.value?.trim()||'';
}
function abort(){
  clearHold();stopASR();stopVolume();
  if(rec&&rec.state!=='inactive'){rec.onstop=null;safely(()=>rec.stop())}
  rec=null;stopTracks();recordDone=true;audioBlob=null;transcript='';session=null;pointer=null;removeUI();hidden?.remove();hidden=null;
}
window.addEventListener('pagehide',abort);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session)abort()});
function asrField(){if(hidden)return;hidden=document.createElement('textarea');hidden.id='ai05-asr';hidden.setAttribute('aria-hidden','true');hidden.style.cssText='position:fixed;left:-10000px;top:-10000px;width:1px;height:1px';document.body.append(hidden)}
function begin(){if(!session||session.state!=='recording'||session.started)return;session.started=true;
  clearHold();chunks=[];audioBlob=null;transcript='';asrError='';asrEvents=0;asrStartPromise=null;recordDone=false;startedAt=Date.now();ui('recording','Записываю · отпусти, чтобы закончить');
  pulseStart(()=>!!session&&session.state==='recording');asrField();
  // ASR is best-effort. The existing plugin may select cloud recognition: Android offline is NOT proven.
  if(typeof VOX!=='undefined'&&VOX.can()){
    const active=session;asr=true;
    asrStartPromise=Promise.resolve(VOX.start('ai05-asr','toggle')).then(ok=>{
      // Android's permission dialog can resolve after a swipe was cancelled.
      if(!session||session!==active||recordDone){if(VOX.on)safely(()=>VOX.stop(true));asr=false;return false}
      if(!ok){asr=false;asrError=VOX._ai05LastError||'Системное распознавание не запустилось';}
      return !!ok;
    }).catch(e=>{asr=false;asrError=String(e?.message||e||'Ошибка запуска распознавания');return false});
  }else asrError='В этой сборке не найден системный движок распознавания речи';
  recordPromise=(async()=>{try{
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Аудиозапись не поддерживается');
    const req=navigator.mediaDevices.getUserMedia({audio:true});
    const granted=await Promise.race([req,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Микрофон долго не отвечает')),25000))]);
    req.then(s=>{if(!session||recordDone)s?.getTracks?.().forEach(t=>t.stop())},()=>{});
    if(!session||recordDone){granted.getTracks().forEach(t=>t.stop());return}
    stream=granted;const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
    rec=new MediaRecorder(stream,mime?{mimeType:mime}:{});
    rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
    rec.start(300);startVolume(stream);
  }catch(e){if(session){session.error=e?.name||String(e);ui(session.state,'Аудио недоступно · можно попробовать диктовку')}}})();
}
async function finish(){if(!session||recordDone)return;recordDone=true;clearHold();ui('recording','Завершаю запись…');
  const s=session;await Promise.resolve(recordPromise).catch(()=>{});if(session!==s)return;
  if(rec&&rec.state!=='inactive')await new Promise(resolve=>{const old=rec.onstop;let done=false;const end=()=>{if(done)return;done=true;clearTimeout(timeout);resolve()};const timeout=setTimeout(end,1600);
    rec.onstop=()=>{old?.();end()};try{rec.stop()}catch(_){end()}});
  if(chunks.length)audioBlob=new Blob(chunks,{type:rec?.mimeType||'audio/webm'});
  rec=null;stopVolume();
  const finalASR=await stopASR();
  stopTracks();
  if(session!==s)return;
  transcript=hidden?.value?.trim()||String(finalASR||'').trim();
  if(!transcript&&!asrError)asrError=asrEvents?'Распознавание запускалось, но не вернуло готовый текст.':'Распознаватель не вернул текст. Проверь разрешение на микрофон и установленный русский пакет.';
  hidden?.remove();hidden=null;session=null;removeUI();showActions();
}
function showActions(){
  menuOpen=true;const available=!!audioBlob,recognised=!!transcript;
  const asrNote=!recognised&&available?`<p class="small mut" style="margin:0 0 10px">${esc(asrError||'Системный распознаватель не вернул текст. Можно добавить его вручную.')}</p>`:'';
  openSheet(`<h3>Запись завершена</h3><p class="sub">${recognised?'Проверь распознанный текст перед сохранением.':available?'Аудио записано, но текст не получен. Его можно добавить вручную.':'Захватить запись не удалось. Попробуй ещё раз.'}</p>${asrNote}
  ${available&&recognised?'<label class="small mut" style="display:flex;gap:9px;align-items:center;margin:6px 0 12px"><input type="checkbox" id="ai05-both"> Добавить расшифровку и к аудио</label>':''}
  <div class="stack"><button type="button" class="btn w" data-ai05="text">В дневник текст</button>
  <button type="button" class="btn ghost w" data-ai05="audio" ${available?'':'disabled'}>В дневник аудио</button>
  <button type="button" class="btn ghost w" data-ai05="tasks">Распознать задачи</button>
  <button type="button" class="lnk" data-ai05="discard">Удалить запись</button></div>`);
}
async function asDataUrl(b){return new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=()=>rej(f.error);f.readAsDataURL(b)})}
// Nothing is written to IndexedDB until the user confirms «Сохранить» in the diary.
function clearStagedAudio(st){if(!st?.ai05Blob)return;try{URL.revokeObjectURL(st.ai05PreviewUrl)}catch(_){};st.ai05Blob=null;st.ai05PreviewUrl=null}
const priorCloseSheet=closeSheet;
closeSheet=function(...args){
  if(SH?.nst?.ai05Blob)clearStagedAudio(SH.nst);
  if(menuOpen){menuOpen=false;audioBlob=null;transcript=''}
  return priorCloseSheet(...args);
};
const priorNoteSave=A.nsave;
A.nsave=async function(e){
  const st=SH?.nst;
  if(!st?.ai05Blob)return priorNoteSave(e);
  const b=st.ai05Blob,id=phNew();
  try{await PH.put(id,await asDataUrl(b))}
  catch(_){toast('Не удалось сохранить аудио. Попробуй ещё раз');return}
  st.audio={id,mime:b.type,ms:Math.max(0,Date.now()-startedAt)};
  clearStagedAudio(st);
  return priorNoteSave(e);
};
const priorNoteRemove=A.naudremove;
A.naudremove=function(e){if(SH?.nst?.ai05Blob)clearStagedAudio(SH.nst);return priorNoteRemove(e)};
async function action(type){
  if(type==='discard'){audioBlob=null;transcript='';closeSheet();return}
  if(type==='text'){menuOpen=false;const t=transcript;sheetNote(TODAY(),null);const q=$('#ntx');if(q){q.value=t;q.dispatchEvent(new Event('input',{bubbles:true}))}if(!t)toast('Текст не распознался. Его можно ввести вручную.');audioBlob=null;return}
  if(type==='tasks'){menuOpen=false;const t=transcript;sheetQuick(false);const q=$('#qq');if(q){q.value=t;q.dispatchEvent(new Event('input',{bubbles:true}))}if(!t)toast('Текст не распознался. Можно ввести задачи вручную.');audioBlob=null;return}
  if(type==='audio'){
    const b=audioBlob,alsoText=$('#ai05-both')?.checked;if(!b)return;
    menuOpen=false;sheetNote(TODAY(),null);const st=SH?.nst;
    if(!st){toast('Не удалось открыть дневник');return}
    st.ai05Blob=b;st.ai05PreviewUrl=URL.createObjectURL(b);
    if(alsoText&&transcript){const q=$('#ntx');if(q)q.value=transcript}
    const box=$('#naudioprev');if(box){
      const player=document.createElement('audio');player.controls=true;player.preload='metadata';player.src=st.ai05PreviewUrl;
      const remove=document.createElement('button');remove.type='button';remove.className='lnk';remove.dataset.a='naudremove';remove.textContent='Убрать аудио';box.replaceChildren(player,remove);
    }
    toast('Аудио подготовлено. Сохранится только после нажатия «Сохранить».');
    audioBlob=null;return;
  }
}
// A single capture handler handles all AI-05 menu controls without disturbing legacy actions.
window.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-ai05]');if(!b)return;
  const type=b.dataset.ai05;if(!['stop','cancel','text','audio','tasks','discard'].includes(type))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(type==='stop')finish();else if(type==='cancel')abort();else Promise.resolve(action(type)).catch(()=>toast('Не удалось выполнить действие'));
},true);
function inLock(x,y){const p=position();return !!p&&Math.hypot(x-(p.x-49),y-(p.y-49))<31}
function inCenter(x,y){const p=position();return !!p&&Math.hypot(x-p.x,y-p.y)<30}
function moved(e){if(!pointer||e.pointerId!==pointer.id)return;
  const dy=e.clientY-pointer.y,dx=e.clientX-pointer.x;
  if(!session&&dy< -25){session={state:'recording',started:false};pointer.used=true;begin()}
  if(session){
    pointer.lockCandidate=inLock(e.clientX,e.clientY);
    pointer.cancelCandidate=inCenter(e.clientX,e.clientY)&&dy>-15;
    if(pointer.lockCandidate)ui('recording','Отпусти на замочке, чтобы закрепить');
    else if(pointer.cancelCandidate)ui('recording','Отпусти в центре для отмены');
    else ui(session.state,'Записываю · отпусти, чтобы закончить');
    if(Math.abs(dx)>170&&dy>25){abort();lastGesture=Date.now()}
  }
}
window.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||pointer||session)return;
  if(!e.target.closest?.('#hub'))return;
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,used:false,lockCandidate:false,cancelCandidate:false};
  clearHold();holdTimeout=setTimeout(()=>{
    if(!pointer||session)return;
    pointer.used=true;ui('holding','Проведи вверх для записи');pulseStart(()=>!!pointer&&!session);
  },420);
  // Keep existing quick menu for a short tap, but prevent the legacy hold handler.
  e.stopPropagation();
},true);
window.addEventListener('pointermove',e=>{if(pointer&&pointer.id===e.pointerId){moved(e);if(pointer?.used)e.preventDefault()}},{capture:true,passive:false});
window.addEventListener('pointerup',e=>{
  if(!pointer||e.pointerId!==pointer.id)return;
  const p=pointer;clearHold();const used=p.used;
  if(session&&p.cancelCandidate)abort();
  else if(session&&p.lockCandidate){session.state='locked';ui('locked','Запись закреплена · нажми «Стоп»');pulseStart(()=>!!session&&session.state==='locked')}
  else if(session)finish();
  else removeUI();
  pointer=null;if(used){lastGesture=Date.now();e.preventDefault();e.stopPropagation()}
},true);
window.addEventListener('pointercancel',e=>{
  if(pointer?.id!==e.pointerId)return;
  clearHold();if(session)abort();else removeUI();pointer=null;lastGesture=Date.now();
},true);
window.addEventListener('click',e=>{
  if(e.target.closest?.('#hub')&&Date.now()-lastGesture<750){e.stopImmediatePropagation();e.preventDefault()}
},true);
// Controls live in general settings, not inside the button. Web vibration patterns
// change perceived strength only; Android Haptics impact styles are hardware-dependent.
const oldSettings=sheetSettings;
sheetSettings=function(){
  oldSettings();const sh=$('#sheet');if(!sh||sh.querySelector('#ai05-haptic-settings'))return;
  const on=enabled(),strength=get('ai05_strength','gentle'),rhythm=get('ai05_rhythm','breath');
  const card=document.createElement('div');card.id='ai05-haptic-settings';card.className='card';card.style.marginTop='14px';
  card.innerHTML=`<h4 style="margin:4px 0 11px">Тактильный отклик</h4>
  <div class="op"><span class="grow">Вибрация живой кнопки</span><button type="button" class="tog${on?' on':''}" data-ai05-setting="on" aria-label="Вибрация кнопки" aria-pressed="${on}"></button></div>
  <label class="lb">Интенсивность</label><div class="seg" style="margin-top:4px">${[['gentle','Нежная'],['medium','Средняя'],['strong','Сильная']].map(([v,t])=>`<button type="button" data-ai05-setting="strength" data-v="${v}" class="${strength===v?'on':''}" aria-pressed="${strength===v}">${t}</button>`).join('')}</div>
  <label class="lb">Ритм</label><div class="seg" style="margin-top:4px">${[['breath','Дыхание'],['heart','Сердцебиение'],['steady','Ровный']].map(([v,t])=>`<button type="button" data-ai05-setting="rhythm" data-v="${v}" class="${rhythm===v?'on':''}" aria-pressed="${rhythm===v}">${t}</button>`).join('')}</div>
  <p class="small mut" style="margin:10px 1px 0">Фактическая сила вибрации зависит от телефона. В браузере меняется рисунок импульсов.</p>`;
  sh.append(card);
};
window.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-ai05-setting]');if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const k=b.dataset.ai05Setting;
  if(k==='on')put('ai05_haptic',enabled()?'off':'on');
  if(k==='strength'&&['gentle','medium','strong'].includes(b.dataset.v))put('ai05_strength',b.dataset.v);
  if(k==='rhythm'&&['breath','heart','steady'].includes(b.dataset.v))put('ai05_rhythm',b.dataset.v);
  sheetSettings();
},true);
})();
