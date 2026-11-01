 'use strict';
const TOTAL = 29;
const KEY = 'madrasatuna-issue2-v1'; // Keep existing answers and saved selections.
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzHnNXtT7FXhmr2o2UjI9cpzZVoSaUHn_JRV2KNxgzb0DKsSeTXCmAi-BfBrinp/exec';
const $ = id => document.getElementById(id);
const img = $('pageImage');
const overlay = $('overlay');
let page = 1, mode = 'browse';
// Page-flip audio is separate from saved answers and does not affect page layout.
const TURN_SOUND_KEY = 'madrasatuna-page-flip-sound';
let turnSoundEnabled = true;
try { turnSoundEnabled = localStorage.getItem(TURN_SOUND_KEY) !== 'off'; } catch (_) {}
let turnAudioContext = null;
let turnAudioBuffer = null;
function playTurnSound(){
 if(!turnSoundEnabled)return;
 try{
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if(!AudioContextClass)return;
  if(!turnAudioContext)turnAudioContext = new AudioContextClass();
  if(turnAudioContext.state === 'suspended')turnAudioContext.resume().catch(()=>{});
  if(!turnAudioBuffer){
   const length=Math.ceil(turnAudioContext.sampleRate*.23);
   turnAudioBuffer=turnAudioContext.createBuffer(1,length,turnAudioContext.sampleRate);
   const samples=turnAudioBuffer.getChannelData(0);
   // A short, quiet paper-rustle sound; no external audio file needed.
   for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1);
  }
  const t=turnAudioContext.currentTime+.008;
  const source=turnAudioContext.createBufferSource();source.buffer=turnAudioBuffer;
  const filter=turnAudioContext.createBiquadFilter();filter.type='bandpass';filter.Q.value=.65;
  filter.frequency.setValueAtTime(1650,t);
  filter.frequency.exponentialRampToValueAtTime(610,t+.21);
  const gain=turnAudioContext.createGain();
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.linearRampToValueAtTime(.095,t+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,t+.21);
  source.connect(filter);filter.connect(gain);gain.connect(turnAudioContext.destination);
  source.start(t);source.stop(t+.22);
 }catch(_){/* Audio is optional; navigation must always work. */}
}
// Replace ONLY the now-unnecessary writing-size slider with a sound switch.
// Existing overlays, checkmarks, and all other buttons are left untouched.
const fontSizeSlider = $('scale');
const fixedManualWritingSize = Math.min(24,Number(fontSizeSlider?.value ?? 27));
if(fontSizeSlider){
 const soundButton=document.createElement('button');
 soundButton.id='turnSound';soundButton.type='button';soundButton.className='tool';
 soundButton.style.cssText='border-radius:999px;background:#eaf4fb;color:#254768;padding:10px 14px;';
 const refreshSoundButton=()=>{
  soundButton.textContent=turnSoundEnabled?'🔊 صوت التقليب: يعمل':'🔇 صوت التقليب: متوقف';
  soundButton.setAttribute('aria-pressed',String(turnSoundEnabled));
  soundButton.title=turnSoundEnabled?'اضغطي لإيقاف صوت تقليب الصفحات':'اضغطي لتشغيل صوت تقليب الصفحات';
 };
 soundButton.addEventListener('click',()=>{
  turnSoundEnabled=!turnSoundEnabled;
  try{localStorage.setItem(TURN_SOUND_KEY,turnSoundEnabled?'on':'off');}catch(_){}
  refreshSoundButton();
 });
 fontSizeSlider.closest('.setting').replaceWith(soundButton);
 refreshSoundButton();
}
let lastEditedKey = null;
let state;
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { state = {}; }
state.answers = state.answers && typeof state.answers === 'object' ? state.answers : {};
state.manual = state.manual && typeof state.manual === 'object' ? state.manual : {};

// The artwork is never modified. Areas below are mapped to the exact printed boxes.
// Reference artwork (each page): 1347 × 1908 px, displayed here on a 1022 × 1448 reference canvas.
const REF_W = 1022, REF_H = 1448;
function box(type,cx,cy,w,h,label,extra={}) {
 return {type,x:100*(cx-w/2)/REF_W,y:100*(cy-h/2)/REF_H,
  w:100*w/REF_W,h:100*h/REF_H,label,...extra};
}
function old(type,x,y,w,h,label){return {type,x,y,w,h,label};}
const regions = {
 // The following narrative pages have no printed answer boxes; retain their previous free-answer areas.
 8:[old('text',69,22,23,8,'قصة الأمانة')],
 10:[old('text',11,92,76,4,'سؤال الأمانة')],
 17:Array.from({length:4},(_,r)=>[
  box('tick',317,1199+r*43.3,31,31,`صح ${r+1}`),
  box('tick',212,1199+r*43.3,31,31,`خطأ ${r+1}`)
 ]).flat(),
 19:Array.from({length:5},(_,c)=>Array.from({length:4},(_,r)=>
  box('tick',[92,205,319,432,545][c],[1126,1171,1216,1261][r],28,29,`النجوم ${c+1}-${r+1}`)
 )).flat(),
 20:[
  ...[47,94,142,191,239,291,347,398].map((cx,i)=>box('tick',cx,533,34,46,`كوب الماء ${i+1}`)),
  box('text',215,849,295,43,'سؤال الأسبوع')
 ],
 23:[
  box('text',219,447,146,30,'لغز العدد 1'),
  box('text',143,506,60,29,'لغز العدد 2'),
  box('text',72,573,74,29,'لغز العدد 3'),
  box('text',552,631,175,30,'لغز العدد 4'),
  box('text',531,1185,82,31,'أكملي النمط 1'),
  box('text',529,1237,92,30,'أكملي النمط 2'),
  box('text',387,1284,172,28,'أكملي النمط 3'),
  box('text',730,1039,345,31,'الشفرة السرية'),
  // Pyramid: one input in each printed blank box; printed numbers stay unchanged.
  box('number',247,837,85,49,'قمة هرم الأرقام'),
  box('number',194,896,85,51,'هرم الأرقام، الوسط الأيسر'),
  box('number',296,896,86,51,'هرم الأرقام، الوسط الأيمن'),
  box('number',247,953,84,51,'هرم الأرقام، الصف الثالث')
 ],
 24:[
  // Only empty squares. Preprinted ١ ٢ ٣ ٤ ٥ ٦ are NOT editable fields.
  box('cell',387,427,79,70,'الأفقي الأعلى: المربع 1'),
  box('cell',551,427,79,70,'الأفقي الأعلى: المربع 2'),
  box('cell',716,427,78,70,'الأفقي الأعلى: المربع 3'),
  box('cell',221,501,84,69,'الرأسي الأيسر: المربع 2'),
  box('cell',221,594,84,104,'الرأسي الأيسر: المربع 3'),
  box('cell',307,618,77,61,'الأفقي الأيسر: المربع 1'),
  box('cell',386,618,77,61,'الأفقي الأيسر: المربع 2'),
  box('cell',469,501,77,68,'الرأسي الثاني: المربع 2'),
  box('cell',633,501,77,69,'الرأسي الثالث: المربع 2'),
  box('cell',633,575,77,68,'الرأسي الثالث: المربع 3'),
  box('cell',633,650,77,68,'الرأسي الثالث: المربع 4'),
  box('cell',800,501,78,68,'الرأسي الأيمن: المربع 2'),
  box('cell',800,575,78,67,'الرأسي الأيمن: المربع 3'),
  box('cell',800,721,78,69,'الرأسي الأيمن: المربع 5')
 ],
 // Page 26 is an answer key (a fully completed Sudoku), not an input grid.
 27:[old('text',12,80,45,8,'مشاركة الطالبة')]
};
const constrainedPages = new Set([17,19,20,23,24]);
const srcFor = p => `pages/${String(p).padStart(2,'0')}.jpg`;
const cache = new Map();
function prefetch(p){
 if(p<1||p>TOTAL||cache.has(p))return;
 const pic=new Image();pic.decoding='async';pic.src=srcFor(p);cache.set(p,pic);
 if(pic.decode)pic.decode().catch(()=>{});
}
function warmNeighbors(){
 [page+1,page-1,page+2,page-2].forEach(prefetch);
 for(const k of cache.keys())if(Math.abs(k-page)>4)cache.delete(k);
}
function idFor(i){return `${page}:${i}`;}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){console.warn('Could not store answers',e);}}
function note(msg){$('notice').textContent=msg;}
function setMode(m){
 mode=m;
 overlay.className='overlay '+(m==='write'?'write-mode':m==='check'?'check-mode':'');
 for(const [id,v] of [['write','write'],['check','check'],['cancel','browse']])$(id).classList.toggle('active',v===m);
}
function markBox(el,reg){
 el.style.left=reg.x+'%';el.style.top=reg.y+'%';
 el.style.width=reg.w+'%';el.style.height=reg.h+'%';
}
// Scale ONLY typed text to fit inside its original printed answer box.
// Inputs keep a 16px native font (avoids Safari focus zoom), while a CSS
// transform reduces their visible text and restores their precise box bounds.
// Checkbox positions, dimensions and drawing are intentionally untouched.
const fieldRegions = new WeakMap();
function fitField(el,reg){
 const boxRect=$('pageWrap').getBoundingClientRect();
 if(!boxRect.width || !boxRect.height)return;
 const width=boxRect.width*reg.w/100;
 const height=boxRect.height*reg.h/100;
 const charCount=Math.max(1,Array.from(el.value||'').length);
 // Leave vertical/horizontal breathing room so digits never clip their cells.
 const maxByHeight=height*(reg.type==='text'?0.68:0.73);
 const maxByWidth=width*0.84/(charCount*(reg.type==='text'?0.68:0.75));
 const maxFont=reg.type==='cell'?16:reg.type==='number'?16:15;
 const renderedFont=Math.max(1,Math.min(maxByHeight,maxByWidth,maxFont));
 const factor=Math.max(0.1,Math.min(1,renderedFont/16));
 // The transformed input's *visible* rectangle remains identical to reg.
 el.style.width=(reg.w/factor)+'%';
 el.style.height=(reg.h/factor)+'%';
 el.style.transform='scale('+factor.toFixed(5)+')';
 el.style.transformOrigin='top left';
}
function fitFields(){
 overlay.querySelectorAll('.precise-field').forEach(el=>{
  const reg=fieldRegions.get(el);
  if(reg)fitField(el,reg);
 });
}
function addRegion(reg,i,fragment){
 const key=idFor(i);
 const tick=reg.type==='tick';
 const el=document.createElement(tick?'button':'input');
 el.className=tick?'tick precise-tick':'field precise-field'+(reg.type==='cell'?' cell':reg.type==='number'?' number':'');
 el.type=tick?'button':'text';
 el.title=reg.label;
 el.setAttribute('aria-label',reg.label);
 markBox(el,reg);
 if(!tick)fieldRegions.set(el,reg);
 if(tick){
  el.classList.toggle('selected',!!state.answers[key]);
  el.setAttribute('aria-pressed',String(!!state.answers[key]));
  el.addEventListener('click',()=>{
   lastEditedKey=key;state.answers[key]=!state.answers[key];persist();
   el.classList.toggle('selected',!!state.answers[key]);
   el.setAttribute('aria-pressed',String(!!state.answers[key]));
  });
 } else {
  el.dir='auto';
  el.autocomplete='off';el.spellcheck=false;
  if(reg.type==='cell'){el.maxLength=1;el.enterKeyHint='next';}
  if(reg.type==='number'){el.maxLength=3;el.inputMode='numeric';}
  el.value=state.answers[key]||'';
  el.addEventListener('input',()=>{
   if(reg.type==='cell')el.value=Array.from(el.value).slice(0,1).join('');
   if(reg.type==='number')el.value=Array.from(el.value).slice(0,3).join('');
   lastEditedKey=key;state.answers[key]=el.value;persist();fitField(el,reg);
  });
  if(reg.type==='cell')el.addEventListener('keydown',event=>{
   if(event.key==='Enter'){
    event.preventDefault();const fields=[...overlay.querySelectorAll('.precise-field.cell')];
    const at=fields.indexOf(el);if(at>=0&&at+1<fields.length)fields[at+1].focus({preventScroll:true});else el.blur();
   }
  });
 }
 fragment.appendChild(el);
}
function draw(){
 img.src=srcFor(page);
 img.alt=`الصفحة ${page} من المجلة`;
 $('counter').textContent=`${page} / ${TOTAL}`;
 const frag=document.createDocumentFragment();
 (regions[page]||[]).forEach((reg,i)=>addRegion(reg,i,frag));
 // Old freehand marks are preserved in storage. For pages with printed boxes,
 // don't render loose marks outside the boxes; inputs must use the mapped fields.
 if(!constrainedPages.has(page)){
  (state.manual[page]||[]).forEach((m,i)=>{
   const el=document.createElement('div');el.className='manual';
   el.style.cssText=`left:${m.x}%;top:${m.y}%;width:${m.w||12}%;min-height:2%`;
   el.textContent=m.text;
   el.title='اضغطي لتعديل أو حذف الإضافة';
   el.onclick=()=>{
    const v=prompt('عدّلي النص، أو امسحيه بالكامل لحذف الإضافة:',m.text);
    if(v===null)return;
    if(v==='')state.manual[page].splice(i,1);else m.text=v;
    persist();draw();
   };
   frag.appendChild(el);
  });
 }
 overlay.replaceChildren(frag);
 fitFields();
 // Let the current image paint first; warm adjacent pages without blocking taps.
 setTimeout(warmNeighbors,0);
}
// Visual page-turn effect ONLY. All page images, answer overlays, storage,
// navigation targets and controls retain their existing behavior.
function showPageTurn(direction){
 const wrap=$('pageWrap');
 // A rapid second tap cancels only the previous visual animation.
 if(wrap._finishPageCurl)wrap._finishPageCurl();
 wrap.querySelector('.magazine-turn-layer')?.remove();
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const bounds=wrap.getBoundingClientRect();
 const W=bounds.width,H=bounds.height;
 if(!W||!H)return;
 // The rest of the reader, inputs, sound, saved answers and layout stay as-is.
 if(!document.getElementById('magazine-turn-style')){
  const style=document.createElement('style');
  style.id='magazine-turn-style';
  style.textContent=`
   .magazine-turn-layer{position:absolute;inset:0;z-index:30;overflow:hidden;
     pointer-events:none;isolation:isolate;perspective:1450px;-webkit-perspective:1450px;
     transform-style:preserve-3d;-webkit-transform-style:preserve-3d}
   .magazine-turn-strip{position:absolute;top:0;height:100%;line-height:0;
     transform-style:preserve-3d;-webkit-transform-style:preserve-3d;
     will-change:transform;pointer-events:none}
   .magazine-turn-face{position:absolute;inset:0;background-repeat:no-repeat;
     -webkit-backface-visibility:hidden;backface-visibility:hidden;
     pointer-events:none;transform:translateZ(.4px)}
   .magazine-turn-back{transform:rotateY(180deg) translateZ(.4px);
     -webkit-transform:rotateY(180deg) translateZ(.4px)}
   .magazine-turn-back::after{content:'';position:absolute;inset:0;
     background:rgba(255,255,255,.58);pointer-events:none}
   .magazine-turn-shading{position:absolute;inset:0;pointer-events:none;
     background:linear-gradient(90deg,rgba(0,0,0,.62),rgba(0,0,0,.12) 27%,
       rgba(255,255,255,.43) 52%,rgba(0,0,0,.42));opacity:0}
   .magazine-turn-floor-shadow{position:absolute;top:0;bottom:0;
     pointer-events:none;background:linear-gradient(90deg,transparent,
       rgba(0,0,0,.1) 19%,rgba(0,0,0,.35) 50%,rgba(0,0,0,.1) 81%,transparent);
     filter:blur(9px);opacity:0;will-change:transform,opacity}
  `;
  document.head.appendChild(style);
 }
 const layer=document.createElement('div');
 layer.className='magazine-turn-layer';
 layer.setAttribute('aria-hidden','true');
 layer.inert=true;
 // A visual-only snapshot of answers on the *old* page keeps them on the
 // turning paper. This canvas never changes the real answer fields or data.
 let inkURL='';
 try{
  const selected=[...overlay.children].filter(el=>
   (el.matches('.tick')&&el.classList.contains('selected'))||
   (el.matches('input')&&el.value)||
   (el.matches('.manual')&&el.textContent));
  if(selected.length){
   const canvas=document.createElement('canvas');
   const ratio=Math.min(window.devicePixelRatio||1,2);
   canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);
   const ctx=canvas.getContext('2d');
   ctx.scale(ratio,ratio);
   for(const el of selected){
    const r=el.getBoundingClientRect();
    const x=r.left-bounds.left+r.width/2;
    const y=r.top-bounds.top+r.height/2;
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
    if(el.matches('.tick')){
     ctx.fillStyle='#08734c';ctx.font=`900 ${Math.max(7,Math.min(r.width,r.height)*.78)}px Arial`;
     ctx.fillText('✓',x,y);
    }else{
     const isManual=el.matches('.manual');
     const transform=isManual?1:(Number(el.style.transform.match(/scale\(([\d.]+)\)/)?.[1])||1);
     const font=Math.max(5,(isManual?Math.min(r.height*.74,18):16*transform));
     ctx.fillStyle=isManual?'#145d9b':'#134e77';
     ctx.direction='rtl';ctx.font=`700 ${font}px Tahoma,Arial,sans-serif`;
     ctx.fillText(isManual?el.textContent:el.value,x,y,Math.max(3,r.width-2));
    }
    ctx.restore();
   }
   inkURL=canvas.toDataURL('image/png');
  }
 }catch(_){/* Page flipping must work even without the optional ink snapshot. */}
 const original=img.currentSrc||img.src;
 const slices=Math.max(28,Math.min(46,Math.round(W/15)));
 const step=W/slices;
 const shadow=document.createElement('div');
 shadow.className='magazine-turn-floor-shadow';
 shadow.style.width=`${Math.round(W*.29)}px`;
 layer.appendChild(shadow);
 const strips=[];
 for(let i=0;i<slices;i++){
  const x=i*step-.45;
  const strip=document.createElement('div');
  strip.className='magazine-turn-strip';
  strip.style.left=x+'px';
  strip.style.width=(step+.9)+'px';
  const bg=inkURL?`url("${inkURL}"),url("${original}")`:`url("${original}")`;
  for(const back of [false,true]){
   const face=document.createElement('div');
   face.className='magazine-turn-face'+(back?' magazine-turn-back':'');
   face.style.backgroundImage=bg;
   face.style.backgroundSize=inkURL?`${W}px ${H}px,${W}px ${H}px`:`${W}px ${H}px`;
   face.style.backgroundPosition=inkURL?`${-x}px 0,${-x}px 0`:`${-x}px 0`;
   const shade=document.createElement('div');shade.className='magazine-turn-shading';
   face.appendChild(shade);strip.appendChild(face);
  }
  strips.push(strip);layer.appendChild(strip);
 }
 wrap.appendChild(layer);
 const forward=direction>0;
 const bendWidth=.31;
 const angleAt=(u,front)=>{
  const raw=(forward?front-u:u-front)/bendWidth;
  const v=Math.max(0,Math.min(1,raw));
  return Math.PI*v*v*(3-2*v); // continuous curved page, never a rigid flat flip
 };
 function paint(t){
  const eased=t*t*(3-2*t);
  const front=forward?(-.04+1.42*eased):(1.04-1.42*eased);
  let edgeX=forward?W:0,edgeZ=0;
  const start=forward?slices-1:0;
  for(let k=0;k<slices;k++){
   const i=forward?start-k:k;
   const u=(i+.5)/slices;
   const angle=angleAt(u,front);
   const cos=Math.cos(angle),sin=Math.sin(angle);
   const centerX=edgeX+(forward?-1:1)*step*.5*cos;
   const centerZ=edgeZ+step*.5*sin;
   edgeX+=(forward?-1:1)*step*cos;
   edgeZ+=step*sin;
   const shiftX=centerX-(i+.5)*step;
   const degree=(forward?1:-1)*angle*180/Math.PI;
   strips[i].style.transform=`translate3d(${shiftX.toFixed(2)}px,0,${centerZ.toFixed(2)}px) rotateY(${degree.toFixed(2)}deg)`;
   const curvature=Math.sin(angle);
   const shadeOpacity=Math.min(.72,.04+.5*curvature+.13*Math.sin(Math.PI*eased));
   strips[i].children[0].firstElementChild.style.opacity=shadeOpacity.toFixed(3);
   strips[i].children[1].lastElementChild.style.opacity=(shadeOpacity*.75).toFixed(3);
  }
  // Moving shadow cast onto the page underneath, independent of the artwork.
  const foldX=Math.max(0,Math.min(W,(forward?front-bendWidth*.42:front+bendWidth*.42)*W));
  shadow.style.transform=`translate3d(${(foldX-W*.145).toFixed(1)}px,0,0)`;
  shadow.style.opacity=(Math.sin(Math.PI*eased)*.85).toFixed(3);
 }
 let frame=0,ended=false;
 const finish=()=>{
  if(ended)return;ended=true;
  cancelAnimationFrame(frame);layer.remove();
  if(wrap._finishPageCurl===finish)delete wrap._finishPageCurl;
 };
 wrap._finishPageCurl=finish;
 const startTime=performance.now();
 const duration=640;
 const tick=now=>{
  if(ended)return;
  const t=Math.min(1,(now-startTime)/duration);
  paint(t);
  if(t<1)frame=requestAnimationFrame(tick);else finish();
 };
 paint(0);frame=requestAnimationFrame(tick);
}

function go(delta){
 const target=page+delta;
 if(target<1||target>TOTAL)return;
 playTurnSound();
 showPageTurn(delta);
 page=target;draw();
 // DO NOT scroll: keep exactly the same magazine reading position.
}
$('next').addEventListener('click',()=>go(1));
$('prev').addEventListener('click',()=>go(-1));
$('write').onclick=()=>setMode('write');
$('check').onclick=()=>setMode('check');
$('cancel').onclick=()=>setMode('browse');
// Large finger-tap tolerance without ever placing a mark outside printed boxes.
function nearestRegion(x,y,desired){
 let best=null,score=Infinity;
 (regions[page]||[]).forEach((r,i)=>{
  if(desired==='check'&&r.type!=='tick')return;
  if(desired==='write'&&r.type==='tick')return;
  const cx=r.x+r.w/2,cy=r.y+r.h/2;
  const dx=Math.max(0,Math.abs(x-cx)-r.w/2),dy=Math.max(0,Math.abs(y-cy)-r.h/2);
  // The tolerance extends beyond the small printed checkbox for fingers,
  // but not so far that a tap on the heading creates a new entry.
  if(dx>1.6||dy>1.25)return;
  const s=(dx/1.6)**2+(dy/1.25)**2;
  if(s<score){score=s;best=i;}
 });
 return best;
}
overlay.addEventListener('click',e=>{
 if(e.target!==overlay)return;
 const b=overlay.getBoundingClientRect();
 const x=(e.clientX-b.left)*100/b.width;
 const y=(e.clientY-b.top)*100/b.height;
 if(constrainedPages.has(page)){
  const kind=mode==='check'?'check':mode==='write'?'write':null;
  // In browse mode, nearby targets can still be selected directly.
  const desired=kind||([17,19,20].includes(page)?'check':'write');
  const i=nearestRegion(x,y,desired);
  if(i!==null){
   const field=overlay.children[i];
   if(field?.matches('.precise-tick'))field.click();
   else if(field?.matches('.precise-field'))field.focus({preventScroll:true});
  }else if(mode!=='browse')note('اختاري المربع أو مكان الإجابة المخصص داخل الصفحة.');
  return;
 }
 if(mode==='browse')return;
 const text=mode==='check'?'✓':prompt('اكتبي الإجابة التي تريدين إضافتها هنا:');
 if(text===null||!String(text).trim())return;
 (state.manual[page]??=[]).push({x:Math.min(92,x),y:Math.min(96,y),text,
  size:mode==='check'?18:fixedManualWritingSize,
  w:mode==='check'?4:Math.min(38,Math.max(12,text.length*2))});
 persist();draw();setMode('browse');
});
$('undo').onclick=()=>{
 if(constrainedPages.has(page)){
  // Undo the most recently edited field, without creating a loose mark.
  if(lastEditedKey?.startsWith(page+':')&&state.answers[lastEditedKey]){
   delete state.answers[lastEditedKey];lastEditedKey=null;persist();draw();return;
  }
  note('حددي المربع الذي تريدين إلغاءه واضغطي عليه، أو امسحي محتواه.');return;
 }
 const a=state.manual[page]||[];
 if(a.length){a.pop();persist();draw();}else note('لا توجد إضافات يدوية لحذفها في هذه الصفحة.');
};
$('reset').onclick=()=>{
 if(confirm('هل تريدين حذف جميع الإجابات المحفوظة على هذا الجهاز؟')){
  state={answers:{},manual:{}};persist();draw();
 }
};
function printElement(tag,cl,css,txt,parent){
 const el=document.createElement(tag);el.className=cl;el.style.cssText=css;el.textContent=txt;parent.appendChild(el);
}
$('pdf').onclick=()=>{
 const root=$('printArea');root.innerHTML='';
 for(let p=1;p<=TOTAL;p++){
  const container=document.createElement('div');container.className='print-page';
  const pic=document.createElement('img');pic.src=srcFor(p);container.appendChild(pic);
  const layer=document.createElement('div');layer.className='print-layer';container.appendChild(layer);
  (regions[p]||[]).forEach((r,i)=>{
   const val=state.answers[`${p}:${i}`];if(!val)return;
   const size=r.type==='tick'?'font-size:13px;':r.type==='cell'?'font-size:17px;':r.type==='number'?'font-size:17px;':'font-size:13px;';
   printElement('div','precise-print-answer'+(r.type==='tick'?' precise-print-tick':''),
    `left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%;${size}`,
    r.type==='tick'?'✓':val,layer);
  });
  if(!constrainedPages.has(p))(state.manual[p]||[]).forEach(m=>printElement('div','print-text',
   `left:${m.x}%;top:${m.y}%;width:${m.w||12}%;font-size:${Math.max(8,(m.size||27)*.52)}px`,m.text,layer));
  root.appendChild(container);
 }
 note('في نافذة الطباعة اختاري «حفظ بتنسيق PDF».');
 setTimeout(()=>window.print(),400);
};
$('save').onclick=async()=>{
 const payload={version:1,submissionId:(globalThis.crypto?.randomUUID?.()||String(Date.now())),
  submittedAt:new Date().toISOString(),answers:{...state.answers,manual:state.manual}};
 try{
  await fetch(GOOGLE_SCRIPT_URL,{method:'POST',mode:'no-cors',
   headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
  note('تم الحفظ'); // No-cors: the server acknowledgement cannot be read from the browser.
 }catch(e){note('تم الحفظ على هذا الجهاز، وتعذر المزامنة حاليًا.');}
};
window.addEventListener('keydown',e=>{
 if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(e.key==='ArrowLeft')go(1);
 if(e.key==='ArrowRight')go(-1);
});
// Refit typed answers when the viewport rotates/resizes; never touch ticks.
if(typeof ResizeObserver!=='undefined'){
 new ResizeObserver(fitFields).observe($('pageWrap'));
}else window.addEventListener('resize',fitFields,{passive:true});
setMode('browse');
img.decoding='async';
// Start requesting the next image immediately, before the first user tap.
[1,2,3].forEach(prefetch);
draw();
