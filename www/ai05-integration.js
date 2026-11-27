/* AI-05 H1.55: GigaAM local ASR; H1.54a gestures retained. */
/* AI-05 H1.54a: simplified gesture; frozen H1.53f visual, no legacy renderer. */
(()=>{
'use strict';
const get=(k,d)=>{try{return localStorage.getItem(k)??d}catch(_){return d}};
const put=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
if(get('ai05_enabled','1')==='0')return;
const $=s=>document.querySelector(s);
const safe=f=>{try{return f()}catch(_){return null}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const SCENE_CSS="\n:host{display:block;position:fixed;inset:-48px 0;pointer-events:none;z-index:39;overflow:visible;contain:layout style;font-family:system-ui,-apple-system,sans-serif;color:#fff}\n:host([hidden]),:host(:not([data-overlay=\"on\"])){visibility:hidden;pointer-events:none}\n#app{position:absolute;width:356px;height:784.03125px;transform-origin:0 0;pointer-events:none}.stage{position:absolute;inset:0;--voice-level:0;}\n.hint{position:absolute;top:calc(80.5% - 190px);left:10px;right:10px;text-align:center;text-shadow:0 1px 5px #173c2e;opacity:0}.active .hint,.locked .hint{opacity:1}.hint h2{font-size:25px;font-weight:600;line-height:1.2;margin:0 0 7px}.hint p{font-size:12px;line-height:1.4;margin:0}#status{font-size:12px;margin:7px auto 0;max-width:270px;color:#fff2d6}#status:empty{display:none}\n.lock-target,#quickFinish{box-sizing:border-box;position:absolute;left:calc(50% - 22px);top:calc(80.5% - 70px);width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#fef7e7;border:1px solid #e7b986;color:#b16c39;box-shadow:0 2px 12px #173c2e35;visibility:hidden;pointer-events:none;padding:0}.recording .lock-target,.lock-aim .lock-target,.cancel .lock-target{visibility:visible}.cancel .lock-target{opacity:.36}.lock-target svg{width:27px;height:27px}.lock-aim .lock-target{background:#e5f0e4;border-color:#8eb69b;color:#2e654a;box-shadow:0 0 0 5px #ade3b340}.lock-aim .lock-target::after{content:'Отпусти';position:absolute;top:calc(100% + 5px);font-size:11px;color:white;white-space:nowrap;text-shadow:0 1px 5px #173c2e}\n.locked #quickFinish{visibility:visible;pointer-events:auto;background:#e0eee0;border-color:#89aa96;color:#315b44;cursor:pointer}.stop-square{width:13px;height:13px;border-radius:3px;background:currentColor}#quickFinish:focus-visible{outline:2px solid white;outline-offset:4px}\n.cloud{position:absolute;left:50%;top:89.125%;width:132px;height:132px;margin:-66px 0 0 -66px;border-radius:50%;background:radial-gradient(ellipse at center,#f1d4a65c 0%,#abd6ac35 41%,transparent 72%);opacity:0;transform:scale(calc(.9 + var(--voice-level) * .38));transition:transform .13s ease-out,opacity .2s;pointer-events:none}.active .cloud,.locked .cloud{opacity:.85}.cancel .cloud{opacity:.3}\n.cancel .hint h2{color:#f9e3d5}\n@media(prefers-reduced-motion:reduce){.cloud{transition:none;transform:none}}\n\n/* H1.69: stationary voice contours with independent CSS movement; no finger trail. */\n.voice-waves{position:absolute;left:50%;top:89.125%;width:144px;height:144px;margin:-72px 0 0 -72px;overflow:visible;pointer-events:none;visibility:hidden}\n.recording .voice-waves,.locked .voice-waves{visibility:visible}.cancel .voice-waves{visibility:hidden}\n.voice-waves path{fill:none;stroke-linecap:round;transform-origin:72px 72px;transform-box:view-box;transition:transform .14s ease-out,opacity .14s ease-out;opacity:0;vector-effect:non-scaling-stroke}\n.voice-waves .w1{stroke:#f3d5a0;stroke-width:7;transform:scale(calc(.89 + var(--voice-level) * .20));opacity:calc(.21 + var(--voice-level) * .40)}\n.voice-waves .w2{stroke:#d2eccb;stroke-width:6;transform:scale(calc(.85 + var(--voice-level) * .19));opacity:calc(.13 + var(--voice-level) * .34)}\n.voice-waves .w3{stroke:#f0dfae;stroke-width:5;transform:scale(calc(.78 + var(--voice-level) * .17));opacity:calc(.07 + var(--voice-level) * .22)}\n.lock-target .shackle{transform-origin:10px 15px;transform:rotate(-30deg);transition:transform .24s cubic-bezier(.2,.8,.2,1)}\n.lock-aim .lock-target .shackle{transform:rotate(0deg)}\n@keyframes ai05-stop-settle{0%{transform:scale(.86);opacity:.6}65%{transform:scale(1.05);opacity:1}100%{transform:scale(1);opacity:1}}\n.locked #quickFinish{animation:ai05-stop-settle .22s ease-out both}\n@media(prefers-reduced-motion:reduce){.voice-waves{display:none}.lock-target .shackle{transition:none}.locked #quickFinish{animation:none}}\n\n@keyframes ai05-wave-sway{0%,100%{rotate:-15deg;scale:.95 1.02}50%{rotate:14deg;scale:1.07 .96}}\n.recording .voice-waves path,.locked .voice-waves path{animation:ai05-wave-sway 1.65s ease-in-out infinite}\n.recording .voice-waves .w2,.locked .voice-waves .w2{animation-duration:2.05s;animation-delay:-.65s;animation-direction:reverse}\n.recording .voice-waves .w3,.locked .voice-waves .w3{animation-duration:2.55s;animation-delay:-1.1s}\n@media(prefers-reduced-motion:reduce){.voice-waves path{animation:none!important}}\n";
const SCENE_HTML="<div class=\"stage\" id=\"stage\"><div class=\"cloud\" aria-hidden=\"true\"></div><svg class=\"voice-waves\" aria-hidden=\"true\" viewBox=\"0 0 144 144\"><path class=\"w1\" d=\"M111.24 72.00 C111.85 75.35 112.13 79.22 111.35 82.54 C110.57 85.87 108.58 89.17 106.57 91.96 C104.55 94.74 101.77 96.98 99.24 99.24 C96.70 101.50 94.17 103.65 91.35 105.51 C88.52 107.37 85.51 109.41 82.29 110.40 C79.06 111.39 75.34 111.77 72.00 111.44 C68.66 111.11 65.33 109.63 62.25 108.40 C59.16 107.17 56.44 105.55 53.49 104.06 C50.54 102.57 47.38 101.39 44.52 99.48 C41.67 97.56 38.38 95.39 36.36 92.58 C34.33 89.77 32.87 86.05 32.35 82.62 C31.83 79.19 32.63 75.38 33.24 72.00 C33.85 68.62 35.05 65.53 36.01 62.36 C36.97 59.18 37.67 56.00 39.02 52.96 C40.36 49.91 41.86 46.58 44.08 44.08 C46.31 41.58 49.35 39.47 52.35 37.96 C55.35 36.46 58.83 35.81 62.10 35.06 C65.38 34.30 68.61 33.77 72.00 33.44 C75.39 33.11 79.02 32.55 82.43 33.06 C85.85 33.57 89.62 34.63 92.49 36.51 C95.36 38.39 97.77 41.48 99.68 44.32 C101.58 47.17 102.57 50.56 103.91 53.58 C105.24 56.60 106.47 59.37 107.70 62.44 C108.92 65.51 110.63 68.65 111.24 72.00 Z\"/><path class=\"w2\" d=\"M119.34 72.00 C118.83 76.04 117.07 79.96 115.65 83.70 C114.24 87.43 112.56 90.82 110.83 94.42 C109.09 98.01 107.63 101.89 105.25 105.25 C102.87 108.61 100.01 112.26 96.57 114.56 C93.13 116.85 88.70 118.35 84.60 119.03 C80.51 119.71 76.08 119.10 72.00 118.63 C67.92 118.16 64.05 117.24 60.15 116.22 C56.25 115.20 52.24 114.28 48.61 112.51 C44.99 110.74 41.24 108.46 38.41 105.59 C35.59 102.72 33.40 98.92 31.65 95.29 C29.91 91.66 28.98 87.69 27.93 83.81 C26.88 79.93 25.85 76.07 25.34 72.00 C24.83 67.93 24.18 63.47 24.86 59.37 C25.54 55.27 27.10 50.85 29.42 47.42 C31.74 43.98 35.42 41.16 38.78 38.78 C42.14 36.40 45.99 34.91 49.57 33.15 C53.15 31.39 56.53 29.66 60.27 28.24 C64.01 26.82 67.97 25.10 72.00 24.63 C76.03 24.16 80.55 24.34 84.48 25.42 C88.42 26.50 92.21 28.82 95.61 31.10 C99.01 33.39 101.97 36.25 104.88 39.12 C107.79 41.98 110.75 44.90 113.06 48.29 C115.37 51.69 117.68 55.53 118.73 59.48 C119.77 63.43 119.85 67.96 119.34 72.00 Z\"/><path class=\"w3\" d=\"M126.62 72.00 C126.17 76.77 125.19 81.36 124.00 85.93 C122.81 90.50 121.62 95.20 119.49 99.42 C117.37 103.64 114.62 107.94 111.24 111.24 C107.87 114.54 103.49 117.14 99.26 119.22 C95.03 121.30 90.41 122.51 85.87 123.75 C81.32 124.99 76.76 126.15 72.00 126.67 C67.24 127.20 62.05 127.76 57.29 126.90 C52.52 126.04 47.44 124.19 43.41 121.51 C39.39 118.84 36.00 114.71 33.13 110.87 C30.27 107.02 28.32 102.61 26.21 98.44 C24.10 94.26 22.07 90.21 20.47 85.81 C18.87 81.40 17.08 76.72 16.62 72.00 C16.17 67.28 16.48 62.06 17.75 57.46 C19.01 52.87 21.61 48.42 24.23 44.42 C26.85 40.42 30.12 36.87 33.46 33.46 C36.80 30.05 40.27 26.62 44.26 23.96 C48.25 21.30 52.77 18.71 57.40 17.50 C62.02 16.29 67.27 16.15 72.00 16.67 C76.73 17.20 81.36 19.06 85.76 20.65 C90.16 22.25 94.22 24.18 98.41 26.25 C102.61 28.32 107.07 30.22 110.92 33.08 C114.76 35.95 118.84 39.39 121.47 43.44 C124.11 47.48 125.86 52.58 126.72 57.34 C127.58 62.10 127.08 67.23 126.62 72.00 Z\"/></svg><div class=\"hint\" aria-live=\"polite\"><h2 id=\"headline\">Говори…</h2><p id=\"explain\">Вверх — закрепить · в сторону — отменить</p><div id=\"status\"></div></div><div class=\"lock-target\" id=\"lockTarget\" aria-hidden=\"true\"><svg fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2.2\" viewBox=\"0 0 32 32\"><rect height=\"13\" rx=\"3\" width=\"16\" x=\"8\" y=\"15\"></rect><path class=\"shackle\" d=\"M10 15V11a6 6 0 0 1 12 0v4\"></path><circle cx=\"16\" cy=\"21\" fill=\"currentColor\" r=\"1\" stroke=\"none\"></circle></svg></div><button id=\"quickFinish\" type=\"button\" aria-label=\"Стоп. Завершить закреплённую запись\"><span class=\"stop-square\" aria-hidden=\"true\"></span></button></div>";
const OUTER_CSS="\nbody.ai05-h153-ready #hub{opacity:1!important;touch-action:none!important;transform:none!important;transition:none!important;border-radius:50%!important;margin:var(--ai05-hub-margin,0px) 4px!important;align-self:center!important;flex:none!important;box-shadow:none!important}\nbody.ai05-h153-ready #hub img{visibility:visible}\n\nbody.ai05-h153-ready #hub.drugoy-hub-preview{overflow:visible!important}\nbody.ai05-h153-ready #hub .drugoy-ring{width:117%;height:117%;max-width:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);transition:transform .28s cubic-bezier(.2,.75,.25,1);animation:ai05-idle-native 12.3s ease-in-out infinite;filter:drop-shadow(0 0 3px rgba(249,190,119,.24))}\n@keyframes ai05-idle-native{0%,13%,29%,49%,76%,100%{scale:1}21%{scale:1.009}61%{scale:1.016}86%{scale:1.005}}\n@media(prefers-reduced-motion:reduce){body.ai05-h153-ready #hub .drugoy-ring{animation:none}}\n#ai05-scene:not([data-overlay=\"on\"]){visibility:hidden!important}\n#ai05-scene[hidden]{display:none!important}\nbody.ai05-h153-ready #app{transition:filter .32s,opacity .32s}\nbody.ai05-h153-ready #tabs{transition:filter .32s}\nbody.ai05-h153-ready.ai05-focused #app{opacity:.68}\n\nbody.ai05-h153-ready.ai05-focused #tabs nav button:not(#hub){pointer-events:none}\n#ai05-veil{position:fixed;inset:0;z-index:38;pointer-events:none;background:rgba(18,43,34,.51);opacity:0;transition:opacity .3s}\nbody.ai05-focused #ai05-veil{opacity:.29;pointer-events:auto}\nbody.ai05-h153-ready #hub:focus-visible{outline:2px solid var(--acc);outline-offset:2px}\n\n/* H1.53c: post-recording panel only. Reuse the product's own theme and fields. */\n#ai05-result{display:grid;gap:10px;padding-top:2px}\n#ai05-result .ai05-result-title{margin:0;padding-right:34px}\n#ai05-result .ai05-result-meta{font-size:12px;color:var(--mut);margin:0;line-height:1.4}\n#ai05-result .ai05-result-card{background:var(--glass);border:1px solid var(--hair);border-radius:18px;padding:12px;display:grid;gap:7px}\n#ai05-result .ai05-result-card > label[for='ai05-transcript']{font-size:12px;color:var(--mut);font-weight:600}\n#ai05-result textarea.field{min-height:68px;margin:0;resize:vertical;max-height:180px;line-height:1.4;font-size:15px}\n#ai05-result .ai05-status{font-size:12px;color:var(--mut);line-height:1.4;margin:0}\n#ai05-result .ai05-result-card audio{width:100%;height:36px}\n#ai05-result .ai05-result-card audio[hidden],#ai05-result [hidden]{display:none!important}\n#ai05-result .ai05-result-options{display:grid;gap:6px}\n#ai05-result .ai05-choice{display:flex;gap:12px;align-items:center;text-align:left;padding:10px 12px;min-height:54px;border-radius:16px;border:1px solid var(--hair);background:var(--glass);color:var(--fg);font:inherit;width:100%}\n#ai05-result .ai05-choice:disabled{opacity:.45}\n#ai05-result .ai05-choice .ai05-ico{display:grid;place-items:center;width:32px;height:32px;flex:none;border-radius:11px;background:var(--accsoft);color:var(--acc)}\n#ai05-result .ai05-choice strong{display:block;font-size:14px;font-weight:700}\n#ai05-result .ai05-choice small{display:block;font-size:11px;color:var(--mut);margin-top:2px;line-height:1.3}\n#ai05-result .ai05-choice .ai05-chevron{margin-left:auto;color:var(--mut)}\n#ai05-result .ai05-both-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mut);margin:0}\n#ai05-result .ai05-discard{justify-self:center;color:var(--mut);padding:8px;font-size:13px}\n#ai05-result .ai05-retry{justify-self:start;font-size:12px;padding:6px 0;color:var(--acc);text-align:left;min-height:30px}\n\n/* H1.53c: compact, four-slot result panel; no changes to scene CSS. */\n#ai05-result .ai05-result-options{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}\n#ai05-result .ai05-choice{display:grid;grid-template-columns:30px minmax(0,1fr);gap:8px;align-items:start;min-height:80px;padding:10px 9px}\n#ai05-result .ai05-choice .ai05-ico{width:30px;height:30px}\n#ai05-result .ai05-choice .ai05-chevron{display:none}\n#ai05-result .ai05-choice strong{font-size:13px;line-height:1.25;overflow-wrap:normal}\n#ai05-result .ai05-choice small{font-size:11px;line-height:1.25}\n#ai05-result .ai05-choice[data-ai05=\"ai\"]:disabled{opacity:1;border-style:dashed;background:transparent;color:var(--mut)}\n#ai05-result .ai05-choice[data-ai05=\"ai\"] .ai05-ico{background:var(--glass);color:var(--mut)}\n#ai05-result .ai05-choice[data-ai05=\"ai\"] small{font-size:11px}\n@media(max-width:350px){#ai05-result .ai05-choice{grid-template-columns:1fr;gap:5px;min-height:94px}#ai05-result .ai05-choice strong{font-size:12px}}\n\n/* Native stationary disc uses the identical soft radial mask as the shadow scene. */\nbody.ai05-h153-ready #hub.drugoy-hub-preview{background:transparent!important;isolation:isolate}\nbody.ai05-h153-ready #hub.drugoy-hub-preview::before{content:\"\";position:absolute;inset:0;border-radius:50%;background:var(--acc);pointer-events:none;box-shadow:0 5px 12px rgba(22,58,38,.19),inset 0 1px 1px rgba(255,255,255,.14);-webkit-mask-image:radial-gradient(circle closest-side at center,#000 0%,#000 48%,rgba(0,0,0,.76) 67%,rgba(0,0,0,.30) 86%,transparent 100%);mask-image:radial-gradient(circle closest-side at center,#000 0%,#000 48%,rgba(0,0,0,.76) 67%,rgba(0,0,0,.30) 86%,transparent 100%)}\n:root[data-theme=\"dark\"] body.ai05-h153-ready #hub.drugoy-hub-preview::before{background:var(--acc2)}\n@media(prefers-color-scheme:dark){:root:not([data-theme=\"light\"]) body.ai05-h153-ready #hub.drugoy-hub-preview::before{background:var(--acc2)}}\n\nbody.ai05-adaptive.ai05-focused #app,body.ai05-adaptive.ai05-focused #tabs{filter:none!important}\nbody.ai05-h153-ready #hub .drugoy-ring{will-change:transform;backface-visibility:hidden}\n\nbody.ai05-h153-ready.ai05-focused #hub .drugoy-ring{transform:translate(-50%,-50%) rotate(180deg)}\n@media(prefers-reduced-motion:reduce){body.ai05-h153-ready #hub .drugoy-ring,body.ai05-h153-ready.ai05-focused #hub .drugoy-ring{transform:translate(-50%,-50%);transition:none;animation:none}}\n\n";

let gesture=null,run=null,holdTimeout=0,lastGesture=0,noteAnchor=null,noteTimer=0,lastNoteGesture=0,gestureClickUntil=0;
let stream=null,recorder=null,recordPending=null,recordChunks=[],recordBlob=null,recordDuration=0,recordStarted=0;
let asr=null,spoken='',speechIssue='',audioContext=null,audioSource=null,analyser=null,raf=0,stagedMenu=false;
const external=document.createElement('style');external.id='ai05-h153-layout';external.textContent=OUTER_CSS+`#sheet:not(.open),#scrim:not(.open){pointer-events:none!important}body.ai05-note-mode #ai05-scene{z-index:43!important}body.ai05-note-mode #ai05-veil{z-index:42}body.ai05-note-mode.ai05-focused #hub .drugoy-ring{transform:translate(-50%,-50%)}#sheet [data-a=naudrec]{touch-action:none;user-select:none}#sheet [data-a=naudrec]{position:relative;overflow:visible}#sheet [data-a=naudrec]::after{content:"";position:absolute;inset:-4px;pointer-events:none;background:url(brand/12a1-ring-foreground.png) center/100% 100% no-repeat;opacity:0;transform:rotate(0deg);transition:transform .28s cubic-bezier(.2,.75,.25,1),opacity .28s}#sheet [data-a=naudrec].ai05-note-live::after{opacity:1;transform:rotate(180deg)}@media(prefers-reduced-motion:reduce){#sheet [data-a=naudrec]::after{transition:none!important;transform:none!important}}`;document.head.append(external);
const host=document.createElement('div');host.id='ai05-scene';host.hidden=true;document.body.append(host);
const root=host.attachShadow({mode:'open'});root.innerHTML='<style>'+SCENE_CSS+':host([data-note]) .hint{transform:translateX(var(--note-hint-shift,0px));top:calc(80.5% - 173px)}:host([data-note]) .lock-target,:host([data-note]) #quickFinish{top:calc(80.5% - 57px)}'+'</style><div class="app" id="app">'+SCENE_HTML+'</div>';
const sceneApp=root.getElementById('app'),stage=root.getElementById('stage');
const veil=document.createElement('div');veil.id='ai05-veil';veil.setAttribute('aria-hidden','true');document.body.insertBefore(veil,host);
const REF={w:356,h:784.03125,navW:331.8125,navH:60.75,idle:.89125,scene:.805};
let geometry=null,visualState='idle',observedHub=null,geometryPending=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// H1.67: no lifted ring or continuous JS visual frame loop.
let frameCount=0,overlayWanted=false;
function overlay(on){overlayWanted=on;host.dataset.overlay=on&&!!geometry&&!document.hidden?'on':'off'}
function syncGeometry(){geometryPending=false;if(noteAnchor&&noteAnchor.isConnected&&SH?.nst){const r=noteAnchor.getBoundingClientRect();if(r.width&&r.height){host.hidden=false;const h=host.getBoundingClientRect(),s=Math.max(.35,Math.min(.85,r.width/60,(r.top+r.height/2-14)/220)),x=r.left+r.width/2-h.left,y=r.top+r.height/2-h.top;geometry={x,y,scale:s,d:r.width,hostTop:h.top};sceneApp.style.left=(x-REF.w*s/2)+'px';sceneApp.style.top=(y-REF.h*REF.idle*s)+'px';sceneApp.style.transform=`scale(${s})`;sceneApp.style.setProperty('--note-hint-shift',((Math.max(10,Math.min(innerWidth-10,innerWidth/2))-r.left-r.width/2)/s)+'px');host.dataset.note='1';overlay(overlayWanted);return}}delete host.dataset.note;const hub=$('#hub'),nav=$('#tabs nav');if(!hub||!nav||!nav.getClientRects().length){host.hidden=true;geometry=null;overlay(visualState!=='idle');document.body.classList.remove('ai05-h153-ready','ai05-focused');return}
 let n=nav.getBoundingClientRect();if(n.width<1||n.height<1){host.hidden=true;geometry=null;overlay(visualState!=='idle');document.body.classList.remove('ai05-h153-ready');return}
 // Use only the other navigation items and padding to determine the stable dock height.
 // The hub must never change the measurement from which its own size is calculated.
 const nc=getComputedStyle(nav),pad=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+(parseFloat(nc[key])||0),0);
 const contentH=Math.max(44,...Array.from(nav.querySelectorAll('[data-a="tab"]'),el=>el.getBoundingClientRect().height));
 const stableH=contentH+pad,availableW=nav.classList.contains('few')?Math.min(460,document.documentElement.clientWidth-24):n.width;
 const s=Math.min(availableW/REF.navW,stableH/REF.navH,Math.max(.1,(n.top+n.height/2-12)/300));
 const d=60*s,margin=Math.min(0,(contentH-d)/2);
 if(hub!==observedHub||Math.abs(parseFloat(hub.style.width||'0')-d)>.1){observedHub=hub;hub.style.width=d+'px';hub.style.height=d+'px';}
 const m=margin.toFixed(3)+'px';if(hub.style.getPropertyValue('--ai05-hub-margin')!==m)hub.style.setProperty('--ai05-hub-margin',m);
 // Make the fixed host measurable before using its coordinate origin.
 host.hidden=false;
 n=nav.getBoundingClientRect();const hr=hub.getBoundingClientRect(),hostRect=host.getBoundingClientRect();
 if(!Number.isFinite(s)||s<=0||!hr.width||!hr.height||!hostRect.width||!hostRect.height){host.hidden=true;geometry=null;overlay(visualState!=='idle');document.body.classList.remove('ai05-h153-ready');return}
 const x=hr.left+hr.width/2-hostRect.left,y=n.top+n.height/2-hostRect.top;
 geometry={x,y,scale:s,d,navWidth:n.width,navHeight:n.height,hostTop:hostRect.top};
 const styles={left:(x-REF.w*s/2)+'px',top:(y-REF.h*REF.idle*s)+'px',transform:`scale(${s})`};for(const [k,v] of Object.entries(styles))if(sceneApp.style[k]!==v)sceneApp.style[k]=v;
 host.hidden=false;document.body.classList.add('ai05-h153-ready');overlay(overlayWanted);
}
new MutationObserver(queueGeometry).observe(document.documentElement,{attributes:true,attributeFilter:['style','data-theme','class','data-skin']});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>queueGeometry());
function queueGeometry(){if(!geometryPending){geometryPending=true;requestAnimationFrame(syncGeometry)}}
const observer=new MutationObserver(queueGeometry);observer.observe($('#tabs'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
if(typeof ResizeObserver!=='undefined'){const ro=new ResizeObserver(queueGeometry);ro.observe($('#tabs'))}
$('#sheet')?.addEventListener('scroll',()=>{if(noteAnchor)queueGeometry()},{passive:true});window.addEventListener('resize',queueGeometry,{passive:true});window.visualViewport?.addEventListener('resize',queueGeometry,{passive:true});window.visualViewport?.addEventListener('scroll',queueGeometry,{passive:true});window.addEventListener('orientationchange',()=>{queueGeometry();setTimeout(queueGeometry,180)},{passive:true});window.addEventListener('pageshow',queueGeometry);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueGeometry()});document.fonts?.ready?.then(queueGeometry).catch(()=>{});
queueGeometry();
function putVisual(s,hint=''){
 visualState=s;const active=['recording','lock-aim','cancel'].includes(s);sceneApp.classList.toggle('active',active);sceneApp.classList.toggle('recording',s==='recording'||s==='lock-aim');sceneApp.classList.toggle('lock-aim',s==='lock-aim');sceneApp.classList.toggle('cancel',s==='cancel');sceneApp.classList.toggle('locked',s==='locked');
 document.body.classList.toggle('ai05-focused',active||s==='locked');if(noteAnchor){noteAnchor.classList.toggle('ai05-note-live',active||s==='locked');document.body.classList.toggle('ai05-note-mode',active||s==='locked');}host.dataset.state=s;overlay(s!=='idle');if(s==='idle')root.getElementById('status').textContent='';
 const lines={recording:['Говори…','Вверх — закрепить · в сторону — отменить'],'lock-aim':['Отпусти для закрепления','Вниз – вернуться · по диагонали – отмена'],locked:['Запись закреплена','Нажми «Стоп», чтобы завершить'],cancel:['Отмена','Отпусти, чтобы отменить']};
 const line=lines[s];if(line){root.getElementById('headline').textContent=line[0];root.getElementById('explain').textContent=line[1]}
 // Real capture failure is surfaced without changing the agreed gesture or moving the scene.
 if(hint.startsWith('Нет аудио'))root.getElementById('status').textContent=hint;
}
function show(s,hint=''){syncGeometry();putVisual(s,hint)}
function hide(){stage.style.setProperty('--voice-level','0');putVisual('idle')}
function offsets(e,g){return {dx:(e.clientX-g.x)/g.scale,dy:(e.clientY-g.y)/g.scale}}
function lockGeometry(g,dx,dy){const r=root.getElementById('lockTarget').getBoundingClientRect();return {px:g.x/g.scale+dx,py:g.y/g.scale+dy,cx:(r.left+r.width/2)/g.scale,cy:(r.top+r.height/2)/g.scale,w:r.width/g.scale,h:r.height/g.scale}}
// H1.54a: hold starts recording; up aims at lock; lateral cancel is symmetrical.
const HOLD_MS=285,SIDE_CANCEL=48,LOCK_SIDE=48,LOCK_ENTRY_MARGIN=44,LOCK_EXIT_DROP=42;
function classify(g,dx,dy){
 const b=g.lockBounds||(g.lockBounds=lockGeometry(g,dx,dy)),rise=g.y/g.scale-b.cy;
 // Once acquired, ordinary sideways movement cannot accidentally cancel the lock.
 // A downward diagonal from the highest acquired point can cancel, on either side.
 const entry=-Math.max(45,rise-LOCK_ENTRY_MARGIN)/2;
 if(g.lock){g.highest=Math.min(g.highest,dy);if(dy-g.highest>=LOCK_EXIT_DROP){g.lock=false;if(Math.abs(dx)>=SIDE_CANCEL){g.cancel=true;return 'cancel'}g.unlockAt=dy;return 'recording'}return 'lock-aim'}
 if(g.unlockAt!=null&&(dy>entry||dy<=g.unlockAt-12))g.unlockAt=null;
 if(g.unlockAt==null&&Math.abs(dx)<=LOCK_SIDE&&dy<=entry){g.lock=true;g.highest=dy;g.cancel=false;return 'lock-aim'}
 if(g.cancel|| (Math.abs(dx)>=SIDE_CANCEL&&Math.abs(dx)>=Math.abs(dy)*.85)){g.cancel=true;return 'cancel'}
 return 'recording';
}
// H1.72: recognize an upward swipe before the hold timer; physical taps never start diary capture.
function advance(g,dx,dy){
 g.dx=dx;g.dy=dy;
 if(!run){
  if(Math.hypot(dx,dy)>24)g.used=true;
  const next=classify(g,dx,dy);
  if(next==='lock-aim'){g.used=true;begin();if(run)putVisual(next)}
  else if(next==='cancel'){clearHold();g.used=true}
  return;
 }
 if(run.finishing)return;const next=classify(g,dx,dy);if(next!==visualState)putVisual(next)
}
function moved(e){const g=gesture;if(!g||g.id!==e.pointerId)return;const {dx,dy}=offsets(e,g);advance(g,dx,dy)}
function noteButton(e){return e.target.closest?.('#sheet [data-a="naudrec"]')}
function canNote(b){return b&&SH?.nst&&!b.disabled&&!NOTE_AUDIO&&!NOTE_AUDIO_PENDING&&!NOTE_AUDIO_SAVING&&!VOX.session}
function setNoteAnchor(b){noteAnchor=b;document.body.classList.toggle('ai05-note-mode',!!b);syncGeometry()}
function resetNoteAnchor(){clearTimeout(noteTimer);noteTimer=0;noteAnchor?.classList.remove('ai05-note-live');noteAnchor=null;document.body.classList.remove('ai05-note-mode');delete host.dataset.note;queueGeometry()}
window.addEventListener('pointerdown',e=>{
 if(e.isPrimary&&e.button===0)gestureClickUntil=0;
 const note=noteButton(e),hub=e.target.closest?.('#hub');if(!e.isPrimary||e.button!==0||gesture||run||(!note&&!hub))return;if(note?!canNote(note):$('#sheet')?.classList.contains('open'))return;
 // A new genuine pointer sequence must not inherit click suppression from a previous recording.
 if(note){lastNoteGesture=0;setNoteAnchor(note);e.preventDefault()}else{lastGesture=0;if(!geometry||geometryPending)syncGeometry()}if(!geometry)return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,scale:geometry.scale,used:false,lock:false,cancel:false,dx:0,dy:0,note:!!note};clearHold();
 try{(note||hub).setPointerCapture(e.pointerId)}catch(_){}
 holdTimeout=setTimeout(()=>{const g=gesture;if(!g||run||g.cancel)return;g.used=true;begin();const next=classify(g,g.dx,g.dy);if(next!==visualState)putVisual(next)},HOLD_MS);
 e.stopPropagation();
},true);
window.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;moved(e);if(gesture?.used)e.preventDefault()},{capture:true,passive:false});
window.addEventListener('pointerup',e=>{
 if(!gesture||gesture.id!==e.pointerId)return;const g=gesture,{dx,dy}=offsets(e,g);clearHold();
 // A very fast swipe can deliver its final displacement only on pointerup.
 if(!run&&Math.hypot(dx,dy)>24)advance(g,dx,dy);
 if(run&&!run.finishing){const next=classify(g,dx,dy);if(next==='lock-aim'){run.state='locked';show('locked')}else if(next==='recording')finish();else cancel()}
 else if(!run){hide();if(g.note)resetNoteAnchor()}gesture=null;if(g.note)lastNoteGesture=Date.now();if(g.used||Math.hypot(dx,dy)>24){gestureClickUntil=Date.now()+900;if(!g.note)lastGesture=Date.now();e.preventDefault();e.stopPropagation()}
},true);
window.addEventListener('pointercancel',e=>{if(gesture?.id!==e.pointerId)return;const used=gesture.used,note=gesture.note;cancel();if(used||note){if(note)lastNoteGesture=Date.now();else lastGesture=Date.now()}},true);
window.addEventListener('click',e=>{if(gestureClickUntil>Date.now()&&(e.detail>0||e.pointerType)){gestureClickUntil=0;e.preventDefault();e.stopImmediatePropagation();return}const b=noteButton(e);if(!b)return;e.preventDefault();e.stopImmediatePropagation();
 // Preserve explicit keyboard/assistive activation, not the compatibility click after touch or mouse.
 if(e.detail!==0||e.pointerType||Date.now()-lastNoteGesture<500)return;
 if(run?.note&&run.state==='locked'&&!run.finishing){finish();return}if(run||!canNote(b))return;setNoteAnchor(b);begin();if(run){run.state='locked';show('locked')}},true);
window.addEventListener('keydown',e=>{const b=noteButton(e);if(b&&e.repeat&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();return}if(b&&!run&&!gesture&&!e.repeat&&['Enter',' '].includes(e.key)&&canNote(b)){e.preventDefault();e.stopImmediatePropagation();setNoteAnchor(b);begin();if(run){run.state='locked';show('locked')}return}if(!run?.note||run.finishing||!['Escape','Enter',' ','Tab'].includes(e.key))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel()}else if(e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();if(run.state==='locked')root.getElementById('quickFinish').focus({preventScroll:true})}else if(noteButton(e)&&run.state==='locked'){e.preventDefault();e.stopImmediatePropagation();finish()}},true);
window.addEventListener('click',e=>{if(e.target.closest?.('#hub')&&Date.now()-lastGesture<900){e.preventDefault();e.stopImmediatePropagation()}},true);
const stopButton=root.getElementById('quickFinish');let stopPointer=null;
stopButton.addEventListener('pointerdown',e=>{if(e.isPrimary&&e.button===0&&run?.state==='locked'){stopPointer=e.pointerId;e.preventDefault()}});
stopButton.addEventListener('pointercancel',()=>{stopPointer=null});
stopButton.addEventListener('pointerup',e=>{if(stopPointer!==e.pointerId)return;stopPointer=null;e.preventDefault();e.stopPropagation();if(run?.state==='locked'){gestureClickUntil=Date.now()+900;finish()}});
stopButton.addEventListener('click',e=>{e.stopPropagation();if(run?.state==='locked')finish()});
window.addEventListener('pagehide',()=>{cancel();overlay(false)});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(run||gesture)cancel();overlay(false)}else queueGeometry()});
// Frames now counts audio envelope samples, not visual animation frames.
window.__AI05_H153={get geometry(){return geometry?{...geometry}:null},get state(){return visualState},get frames(){return frameCount},get overlay(){return overlayWanted},get quality(){return "lightweight"},get stats(){return {speech:lastSpeechTiming}}};
// Single fixed light impact at recording start; no repeating pulse or AI-05 settings.
function haptic(owner){const H=window.Capacitor?.Plugins?.Haptics;
 if(H?.impact){try{Promise.resolve(H.impact({style:'LIGHT'})).catch(()=>{});return}catch(_){return}}
 if(run===owner&&!owner.done)safe(()=>navigator.vibrate?.(12));
}
function clearHold(){clearTimeout(holdTimeout);holdTimeout=0}
function stopTracks(){if(stream){stream.getTracks().forEach(t=>safe(()=>t.stop()));stream=null}}
function stopVolume(){stage.style.setProperty('--voice-level','0');if(raf)clearInterval(raf);raf=0;safe(()=>audioSource?.disconnect());audioSource=null;analyser=null;const c=audioContext;audioContext=null;if(c)Promise.resolve(c.close()).catch(()=>{})}
function volume(sourceStream){try{if(reduced.matches)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audioContext=new C();Promise.resolve(audioContext.resume?.()).catch(()=>{});audioSource=audioContext.createMediaStreamSource(sourceStream);analyser=audioContext.createAnalyser();analyser.fftSize=256;audioSource.connect(analyser);const values=new Uint8Array(256);let filtered=0,lastValue='';raf=setInterval(()=>{if(!analyser||!run||run.done||run.finishing||document.hidden)return;analyser.getByteTimeDomainData(values);let energy=0;for(const x of values){const a=(x-128)/128;energy+=a*a}const v=Math.min(1,Math.sqrt(energy/values.length)*6);filtered=filtered*.76+v*.24;const value=filtered.toFixed(2);if(value!==lastValue||stage.style.getPropertyValue('--voice-level')!==value){stage.style.setProperty('--voice-level',value);lastValue=value}frameCount++},50)}catch(_){stopVolume()}}
/* This speech session never replaces VOX methods. Other app microphone fields keep their own engine. */
function gigaPlugin(){return window.Capacitor?.Plugins?.GigaSpeech||null}
let localState=null,localJob=null,lastSpeechTiming=null;
function cancelLocal(owner){if(localJob?.owner===owner&&localJob.native&&!localJob.cancelSent){localJob.cancelSent=true;try{Promise.resolve(localJob.plugin.cancel?.()).catch(()=>{})}catch(_){}}}
async function transcribeLocal(blob,owner,allowDownload=false,knownStatus=null){
 const N=gigaPlugin();if(!N)return {text:'',issue:'Локальное распознавание доступно в Android APK.',ready:false,supported:false};
 if(!blob)return {text:'',issue:'Аудиозапись не получена.',ready:false,supported:true};
 if(owner.done)return {text:'',issue:'Отменено'};
 if(localJob)throw Error('Распознавание уже выполняется. Попробуй чуть позже.');
 const job={owner,plugin:N,native:false};localJob=job;const t=performance.now(),timing={};let status;
 try{
 status=knownStatus||await N.status();localState=status;timing.statusMs=performance.now()-t;
 if(!status.supported)return {text:'',issue:'На этом устройстве локальная модель недоступна.',...status};
 if(owner.done)return {text:'',issue:'Отменено',...status};
 if(!status.ready){if(!allowDownload)return {text:'',issue:'Для расшифровки скачай локальную модель один раз.',...status};job.native=true;try{await N.prepare()}finally{job.native=false}status=await N.status();localState=status;}
 if(owner.done)return {text:'',issue:'Отменено',...status};
 const C=window.AudioContext||window.webkitAudioContext;const O=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!C)throw Error('Декодирование аудио недоступно');
 let mark=performance.now();const ctx=new C();let decoded;try{decoded=await ctx.decodeAudioData(await blob.arrayBuffer())}finally{await ctx.close().catch(()=>{})}
 timing.decodeMs=performance.now()-mark;
 if(decoded.duration>300)throw Error('Запись длиннее 5 минут. Аудио можно сохранить без текста.');
 if(owner.done)return {text:'',issue:'Отменено',...status};
 mark=performance.now();let pcm;
 if(decoded.sampleRate===16000&&decoded.numberOfChannels===1)pcm=decoded.getChannelData(0);
 else{if(!O)throw Error('Преобразование аудио недоступно');const render=new O(1,Math.max(1,Math.ceil(decoded.duration*16000)),16000),src=render.createBufferSource();src.buffer=decoded;src.connect(render.destination);src.start();pcm=(await render.startRendering()).getChannelData(0)}
 timing.resampleMs=performance.now()-mark;
 if(owner.done)return {text:'',issue:'Отменено',...status};
 mark=performance.now();const bytes=new Uint8Array(pcm.length*2),dv=new DataView(bytes.buffer);
 for(let i=0;i<pcm.length;i++){const x=Math.max(-1,Math.min(1,pcm[i]));dv.setInt16(i*2,x<0?x*32768:x*32767,true)}
 const encoded=(await dataUrl(new Blob([bytes]))).split(',')[1];timing.encodeMs=performance.now()-mark;
 if(owner.done)return {text:'',issue:'Отменено',...status};
 mark=performance.now();job.native=true;let result;try{result=await N.transcribe({pcm:encoded})}finally{job.native=false}
 timing.bridgeMs=performance.now()-mark;if(result.timing)timing.native=result.timing;
 if(owner.done)return {text:'',issue:'Отменено',...status};
 return {text:result.text||'',issue:result.text?'':'Слова не распознаны. Можно исправить текст вручную.',...status};
 }finally{timing.totalMs=performance.now()-t;lastSpeechTiming=timing;if(localJob===job)localJob=null}
}
if(window.Commands56)window.Commands56.transcribe=async(blob,active)=>{const N=gigaPlugin();if(!N)throw Error('Расшифровка доступна в Android APK');if(!active())return '';const status=await N.status();if(!status.supported)throw Error('Модель недоступна на устройстве');if(!status.ready&&!confirm('Скачать модель русского языка (около 226 МБ)?'))return '';if(!active())return '';const owner={get done(){return !active()}};const poll=setInterval(()=>{if(owner.done)cancelLocal(owner)},300);try{const out=await transcribeLocal(blob,owner,true,status);if(!active())return '';if(out.issue&&!out.text)throw Error(out.issue);return out.text}finally{clearInterval(poll)}};
function invalidate(){clearHold();stopVolume();const previous=run;if(previous)previous.done=true;
 if(previous?.finishing)cancelLocal(previous);asr=null;if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;safe(()=>recorder.stop())}
 recorder=null;stopTracks();recordPending=null;recordChunks=[];recordBlob=null;spoken='';speechIssue='';run=null;gesture=null;hide();resetNoteAnchor()}
function startCapture(owner){recordChunks=[];recordBlob=null;recordStarted=Date.now();recordDuration=0;
 return (async()=>{let requested=null;try{
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Запись аудио не поддерживается');
  requested=navigator.mediaDevices.getUserMedia({audio:true});
  const captured=await Promise.race([requested,wait(25000).then(()=>{throw new Error('Микрофон не отвечает')})]);
  if(owner.done||owner.finishing||run!==owner)return; // finally releases a late granted stream exactly once
  stream=captured;const format=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
  recorder=new MediaRecorder(stream,format?{mimeType:format}:{});
  recorder.ondataavailable=e=>{if(run===owner&&!owner.done&&e.data?.size)recordChunks.push(e.data)};
  recorder.start(250);volume(stream);
 }catch(e){if(run===owner&&!owner.done){owner.captureError=String(e?.message||e||'Микрофон недоступен');if(owner.state==='locked'||visualState==='recording')show(owner.state,'Нет аудио · проверь доступ к микрофону')}}
 finally{if(requested)Promise.resolve(requested).then(s=>{if(owner.done||owner.finishing||run!==owner)s?.getTracks?.().forEach(t=>safe(()=>t.stop()))},()=>{})}
 })();
}
function begin(){if(run)return;clearHold();run={state:'recording',done:false,finishing:false,note:noteAnchor?SH?.nst:null};const owner=run;
 spoken='';speechIssue='';recordChunks=[];recordBlob=null;recordStarted=0;recordDuration=0;show('recording','Записываю · отпусти, чтобы закончить');haptic(owner);
 localState=null;recordPending=startCapture(owner);if(owner.note){naudStatus('Запись…');noteTimer=setTimeout(()=>{if(run===owner&&!owner.finishing)finish()},120000)}
}
let resultUrl=null, resultCommands56=null, resultCommandContext=null;
function releaseResultUrl(){if(resultUrl){safe(()=>URL.revokeObjectURL(resultUrl));resultUrl=null}}
async function finishNote(owner){
 clearTimeout(noteTimer);noteTimer=0;const st=owner.note,rec=recorder;NOTE_AUDIO_SAVING=true;naudStatus('Сохраняем аудио…');
 try{if(rec&&rec.state!=='inactive')await new Promise(resolve=>{let settled=false;const complete=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve()};const timer=setTimeout(complete,1750);rec.onstop=complete;try{rec.stop()}catch(_){complete()}});
 if(run!==owner||owner.done||SH?.nst!==st)return;
 const blob=recordChunks.length?new Blob(recordChunks,{type:rec?.mimeType||'audio/webm'}):null,ms=recordStarted?Date.now()-recordStarted:0;recorder=null;stopTracks();stopVolume();
 if(!blob){naudStatus(owner.captureError?'Не удалось включить микрофон':'Запись не получилась');return}
 const id=phNew();await PH.put(id,await dataUrl(blob));if(run!==owner||owner.done||SH?.nst!==st){await PH.del(id);return;}
 setNoteAudios(st,[...noteAudios(st),{id,mime:blob.type,ms}]);refreshNoteAudio(st);NOTE_AUDIO_SAVING=false;owner.audioReady=true;naudStatus('Аудио добавлено · сохрани запись');
 }catch(e){if(SH?.nst===st)naudStatus('Не удалось сохранить аудио. Попробуй ещё раз.')}finally{if(run===owner){NOTE_AUDIO_SAVING=false;owner.done=true;run=null;gesture=null;stopTracks();stopVolume();recorder=null;recordChunks=[];resetNoteAnchor()}}
}
async function finish(){const owner=run;if(!owner||owner.done||owner.finishing)return;owner.finishing=true;clearHold();hide();if(owner.note){stopVolume();return finishNote(owner)}
 // UI opens immediately; neither recorder stop nor recognition can delay it.
 const rec=recorder;stopVolume();
 spoken='';speechIssue='';showActions(true);
 const audioJob=(async()=>{if(rec&&rec.state!=='inactive')await new Promise(resolve=>{let settled=false;const complete=()=>{if(settled)return;settled=true;clearTimeout(fallback);resolve()};const fallback=setTimeout(complete,1750);rec.onstop=complete;try{rec.stop()}catch(_){complete()}});
 if(run!==owner||owner.done)return;
 recordBlob=recordChunks.length?new Blob(recordChunks,{type:rec?.mimeType||'audio/webm'}):null;
 recordDuration=recordStarted?Math.max(0,Date.now()-recordStarted):0;recorder=null;stopVolume();stopTracks();owner.audioReady=true;
 })();
 await audioJob;
 if(run!==owner||owner.done)return;
 if(recordBlob){const player=$('#ai05-player');if(player){releaseResultUrl();resultUrl=URL.createObjectURL(recordBlob);player.src=resultUrl;player.hidden=false}}syncResultButtons();
 // First-run model download is opt-in, never automatic. Audio stays available even on ASR failure.
 let output;try{output=await transcribeLocal(recordBlob,owner)}catch(e){output={text:'',issue:String(e?.message||e)}}
 if(run!==owner||owner.done)return;
 spoken=output.text||'';speechIssue=output.issue||owner.captureError||'';
 owner.done=true;asr=null;run=null;gesture=null;updateActions();
}
function cancel(){const note=run?.note||gesture?.note,ready=run?.audioReady;invalidate();if(note){NOTE_AUDIO_SAVING=false;naudStatus(ready?'Аудио добавлено · распознавание отменено':'Запись отменена')}}
const resultIcons={text:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',audio:'<path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/>',tasks:'<path d="m4 7 2 2 4-4M13 7h7M4 15l2 2 4-4M13 15h7"/>',ai:'<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z"/>'};
function resultChoice(type,title,sub){return `<button type="button" class="ai05-choice" data-ai05="${type}" disabled><span class="ai05-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${resultIcons[type]}</svg></span><span><strong>${title}</strong><small>${sub}</small></span><span class="ai05-chevron" aria-hidden="true">›</span></button>`}
function showActions(pending=false){stagedMenu=true;releaseResultUrl();const captureClock=recordStarted||Date.now();resultCommandContext={date:iso(new Date(captureClock)),diary:true,clock:captureClock,compact:true};
 openSheet(`<section id="ai05-result"><h3 class="ai05-result-title">Запись завершена</h3><p class="ai05-result-meta" id="ai05-result-meta">${pending?'Завершаю запись…':'Выбери, что сохранить'}</p>
 <div class="ai05-result-card"><audio id="ai05-player" controls preload="metadata" hidden></audio><label for="ai05-transcript">Текст записи</label><textarea id="ai05-transcript" class="field" rows="2" placeholder="${pending?'Распознаю речь…':'Здесь можно исправить текст'}" aria-label="Распознанный текст"></textarea>
 <div id="ai05-command56" class="nactmenu" hidden></div><p class="ai05-status" id="ai05-warning" role="status">${pending?'Обрабатываю запись. Можно ввести текст вручную.':''}</p>
 <button type="button" class="lnk ai05-retry" data-ai05="retry-speech" hidden>Расшифровать запись</button><p class="ai05-status" id="ai05-repeat-info" hidden>Распознавание на телефоне. Аудио никуда не отправляется.</p></div>
 <label class="ai05-both-row" id="ai05-both-row" hidden><input id="ai05-both" type="checkbox"> Сохранить аудио вместе с текстом</label>
 <div class="ai05-result-options">${resultChoice('text','В дневник текст','Сохранить мысль')}${resultChoice('audio','В дневник аудио','Оставить голосовую запись')}${resultChoice('ai','Обсудить с ИИ','Будущая функция · подписка')}</div>
 <button type="button" class="lnk ai05-discard" data-ai05="discard">Удалить запись</button></section>`);
 const input=$('#ai05-transcript');if(input){input.value=spoken;resultCommands56=window.Commands56?.mount(input,$('#ai05-command56'),resultCommandContext);input.addEventListener('input',()=>{input.dataset.edited='1';syncResultButtons()})}if(!pending)updateActions();
}
function syncResultButtons(){if(!stagedMenu||!$('#ai05-result'))return;const text=!!stagedText(),waiting=!!run?.finishing&&!run.audioReady;for(const k of ['text','audio']){const b=$(`[data-ai05="${k}"]`);if(b)b.disabled=waiting||(k==='audio'?!recordBlob:!text)}const both=$('#ai05-both-row');if(both&&run?.finishing)both.hidden=!recordBlob||!text}
function updateActions(){if(!stagedMenu||!$('#ai05-result'))return;const input=$('#ai05-transcript'),audio=!!recordBlob;
 if(input&&!input.dataset.edited&&input.value!==spoken){input.value=spoken;input.dispatchEvent(new Event('input',{bubbles:true}));delete input.dataset.edited}if(input)input.placeholder='Можно ввести или исправить текст';
 const meta=$('#ai05-result-meta');if(meta)meta.textContent=audio?'Аудиозапись · выбери, что сохранить': 'Аудио не сохранилось';
 const status=$('#ai05-warning');if(status){status.textContent=spoken?'Проверь текст перед сохранением.':audio?(speechIssue||'Текст не получен. Аудио можно сохранить.'):'Не удалось получить текст. Можно ввести его вручную.';if(speechIssue)status.title=speechIssue;}
 const player=$('#ai05-player');if(audio&&player){if(!resultUrl){resultUrl=URL.createObjectURL(recordBlob);player.src=resultUrl}player.hidden=false}
 const both=$('#ai05-both-row');if(both)both.hidden=!audio;const retry=$('[data-ai05="retry-speech"]'),info=$('#ai05-repeat-info');if(retry){retry.hidden=!!spoken||!audio||!gigaPlugin()||localState?.supported===false;retry.textContent=localState?.ready===false?'Скачать модель (≈226 МБ)':'Расшифровать запись'}if(info)info.hidden=!retry||retry.hidden;
 syncResultButtons();
}
function stagedText(){return ($('#ai05-transcript')?.value||'').trim()}
let retryOwner=null;
async function retrySpeech(){
 const session=$('#ai05-result'),button=$('[data-ai05="retry-speech"]'),N=gigaPlugin(),blob=recordBlob;
 if(!session||!N||!blob||retryOwner)return;
 const owner={done:false};retryOwner=owner;const note=$('#ai05-repeat-info');let poll=0;
 try{
  button.disabled=true;const status=await N.status();localState=status;
  if(!status.ready&&!window.confirm('Скачать модель русского языка (около 226 МБ)? Лучше через Wi-Fi. Запись не отправляется в интернет.'))return;
  button.textContent=status.ready?'Распознаю…':'Загружаю модель…';
  poll=setInterval(async()=>{try{const p=await N.status();if(!owner.done&&note&&p.progress>=0&&p.progress<100)note.textContent='Загрузка модели: '+p.progress+'%'}catch(_){}},500);
  const out=await transcribeLocal(blob,owner,true,status);
  if(owner.done||!stagedMenu||$('#ai05-result')!==session)return;
  const box=$('#ai05-transcript');spoken=out.text||'';speechIssue=out.issue||'';
  updateActions();if(note)note.textContent=out.issue||'Проверь текст перед сохранением.';
 }catch(e){if(!owner.done&&note)note.textContent='Не удалось распознать: '+String(e?.message||e)}
 finally{clearInterval(poll);if(retryOwner===owner)retryOwner=null;if(!owner.done&&button){button.disabled=false;button.textContent=localState?.ready?'Расшифровать запись':'Скачать модель (≈226 МБ)';syncResultButtons()}}
}
function cancelRetry(){if(retryOwner){retryOwner.done=true;cancelLocal(retryOwner);retryOwner=null}}
const dataUrl=blob=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error);fr.readAsDataURL(blob)});
function clearStaged(st){if(!st?.ai05Blob)return;safe(()=>URL.revokeObjectURL(st.ai05PreviewUrl));st.ai05Blob=null;st.ai05PreviewUrl=null;st.ai05Duration=null}
const oldCloseSheet=closeSheet;
closeSheet=function(...args){if(run?.note||gesture?.note){invalidate();NOTE_AUDIO_SAVING=false}if(SH?.nst?.ai05Blob)clearStaged(SH.nst);
 if(stagedMenu){cancelRetry();stagedMenu=false;releaseResultUrl();if(run?.finishing)invalidate();recordBlob=null;spoken='';resultCommands56=null;resultCommandContext=null}
 return oldCloseSheet(...args)};
const oldOpenSheet= openSheet;openSheet=function(...args){if(run?.note||gesture?.note){invalidate();NOTE_AUDIO_SAVING=false}return oldOpenSheet(...args)};
const oldNoteSave=A.nsave;
A.nsave=async function(e){if(run?.note&&!run.audioReady){toast('Сначала закончи запись аудио');return}const st=SH?.nst;if(!st?.ai05Blob)return oldNoteSave(e);
 if(NOTE_AUDIO||NOTE_AUDIO_PENDING||NOTE_AUDIO_SAVING||st.ai05Saving){toast('Сначала закончи запись аудио');return}
 const blob=st.ai05Blob;const id=phNew();st.ai05Saving=true;
 try{await PH.put(id,await dataUrl(blob))}catch(_){toast('Аудио не удалось сохранить. Попробуй ещё раз');return}finally{st.ai05Saving=false}
 if(SH?.nst!==st||st.ai05Blob!==blob)return;setNoteAudios(st,[{id,mime:blob.type,ms:st.ai05Duration??recordDuration},...noteAudios(st)]);clearStaged(st);return oldNoteSave(e)};
const oldNoteRemove=A.naudremove;
A.naudremove=function(e){const st=SH?.nst;if(st?.ai05Blob&&e?.dataset.staged==='1'){clearStaged(st);refreshNoteAudio(st);return}return oldNoteRemove(e)};
async function action(type){
 if(type==='discard'){closeSheet();return}
 if(run?.finishing){if(!run.audioReady||type==='retry-speech'||(type==='audio'&&!recordBlob)||(type==='text'&&!stagedText()))return;const owner=run;owner.done=true;cancelLocal(owner);run=null;gesture=null;}
 if(type==='retry-speech'){await retrySpeech();return}
 if(type==='text'){
  const value=stagedText();
  if(!value){const t=$('#ai05-transcript');if(t){t.setAttribute('aria-invalid','true');t.placeholder='Сначала напиши текст или расшифруй запись';}toast('Текста пока нет. Введи его здесь или сохрани аудио.');return}
  if(type==='text'&&recordBlob&&$('#ai05-both')?.checked)return action('audio');
  cancelRetry();stagedMenu=false;releaseResultUrl();recordBlob=null;
  if(type==='text'){sheetNote(resultCommandContext?.date||TODAY(),null);if(SH?.nst){SH.nst.command56=[...(resultCommands56?.seen||[])];SH.nst.commandClock=resultCommandContext?.clock||recordStarted||Date.now()}resultCommands56=null;resultCommandContext=null;const box=$('#ntx');if(box){box.value=value;box.dispatchEvent(new Event('input',{bubbles:true}))}}

  return;
 }
 if(type==='audio'){
  const blob=recordBlob;if(!blob)return;const both=$('#ai05-both')?.checked;const value=stagedText();
  cancelRetry();stagedMenu=false;releaseResultUrl();sheetNote(resultCommandContext?.date||TODAY(),null);const st=SH?.nst;
  if(!st){toast('Дневник не открылся');return}
  st.command56=[...(resultCommands56?.seen||[])];st.commandClock=resultCommandContext?.clock||recordStarted||Date.now();resultCommands56=null;resultCommandContext=null;st.ai05Blob=blob;st.ai05Duration=recordDuration;st.ai05PreviewUrl=URL.createObjectURL(blob);
  if(both&&value){const box=$('#ntx');if(box){box.value=value;box.dispatchEvent(new Event('input',{bubbles:true}))}}
  refreshNoteAudio(st);
  recordBlob=null;toast('Аудио подготовлено. Сохранится, когда нажмёшь «Сохранить».');
 }
}
window.addEventListener('click',e=>{const b=e.target.closest?.('[data-ai05]');if(!b)return;
 const kind=b.dataset.ai05;if(!['text','audio','discard','retry-speech'].includes(kind))return;
 e.preventDefault();e.stopImmediatePropagation();
 Promise.resolve(action(kind)).catch(()=>toast('Не удалось выполнить действие'));
},true);


})();
