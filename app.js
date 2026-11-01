'use strict';
const TOTAL=29, KEY='madrasatuna-issue2-v1';
let page=1,mode='browse',state=JSON.parse(localStorage.getItem(KEY)||'{"answers":{},"manual":{}}');
const $=id=>document.getElementById(id), img=$('pageImage'), overlay=$('overlay');
// Coordinates are percentages of the ORIGINAL page. Every overlay is transparent and removable.
const regions={
 8:[['text',69,22,23,8,'قصة الأمانة']],
 10:[['text',11,92,76,4,'سؤال الأمانة']],
 17:[...Array.from({length:4},(_,r)=>[['tick',20.9,78.2+r*3.45,3.8,2.7,`صح ${r+1}`],['tick',9.6,78.2+r*3.45,3.8,2.7,`خطأ ${r+1}`]]).flat()],
 19:[...Array.from({length:5},(_,c)=>Array.from({length:4},(_,r)=>['tick',11.3+c*11.8,74.5+r*4.7,4.7,3.5,`النجوم ${c+1}-${r+1}`])).flat()],
 20:[...Array.from({length:8},(_,i)=>['tick',67.3+i*3.9,37.1,3.3,4.2,`كوب الماء ${i+1}`]),['text',5,54,31,5,'سؤال الأسبوع']],
 23:[...Array.from({length:4},(_,i)=>['text',12,34.2+i*4.9,48,3.7,`لغز العدد ${i+1}`]),...Array.from({length:3},(_,i)=>['text',11,81.0+i*4.6,34,3.5,`أكملي النمط ${i+1}`]),['text',52,64,36,4,'الشفرة السرية']],
 24:[
   ...Array.from({length:6},(_,i)=>['cell',40.5+i*7.5,27.0,7.4,4.7,`أفقي أعلى ${i+1}`]),
   ...Array.from({length:3},(_,i)=>['cell',9.0,27+i*4.9,7.4,4.7,`عمودي يسار ${i+1}`]),
   ...Array.from({length:3},(_,i)=>['cell',24.0+i*7.5,41.7,7.4,4.7,`أفقي يسار ${i+1}`]),
   ...Array.from({length:3},(_,i)=>['cell',48.0,31.9+i*4.9,7.4,4.7,`عمودي وسط ${i+1}`]),
   ...Array.from({length:3},(_,i)=>['cell',63.0,31.9+i*4.9,7.4,4.7,`عمودي ثان ${i+1}`]),
   ...Array.from({length:4},(_,i)=>['cell',86.0,31.9+i*4.9,7.4,4.7,`عمودي يمين ${i+1}`]),
   ...Array.from({length:2},(_,i)=>['cell',71+i*7.5,46.6,7.4,4.7,`أفقي أسفل ${i+1}`])
  ],
 26:[...Array.from({length:16},(_,i)=>['cell',11+(i%4)*6.7,72+Math.floor(i/4)*4.0,6,3.5,`شبكة ${i+1}`])],
 27:[['text',12,80,45,8,'مشاركة الطالبة']]
};
function idFor(i){return `${page}:${i}`}
function persist(){localStorage.setItem(KEY,JSON.stringify(state))}
function note(msg){$('notice').textContent=msg}
function setMode(m){mode=m;overlay.className='overlay '+(m==='write'?'write-mode':m==='check'?'check-mode':'');for(const [id,v] of [['write','write'],['check','check'],['cancel','browse']])$(id).classList.toggle('active',v===m)}
function draw(){img.src=`pages/${String(page).padStart(2,'0')}.jpg`;img.alt=`الصفحة ${page} من المجلة`;$('counter').textContent=`${page} / ${TOTAL}`;overlay.innerHTML='';
 (regions[page]||[]).forEach((r,i)=>{let [type,x,y,w,h,label]=r,id=idFor(i),el=document.createElement(type==='tick'?'button':'input');el.className=type==='tick'?'tick':type==='cell'?'field cell':'field';el.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%`;if(type==='tick')el.type='button';el.title=label;el.setAttribute('aria-label',label);
 if(type!=='tick'){el.dir='rtl';if(type==='cell'){el.maxLength=1;el.inputMode='text';} el.value=state.answers[id]||'';el.addEventListener('input',()=>{state.answers[id]=el.value;persist()})}else{el.classList.toggle('selected',!!state.answers[id]);el.onclick=()=>{state.answers[id]=!state.answers[id];persist();el.classList.toggle('selected',state.answers[id])}}overlay.appendChild(el)});
 (state.manual[page]||[]).forEach((m,i)=>{const el=document.createElement('div');el.className='manual';el.style.cssText=`left:${m.x}%;top:${m.y}%;width:${m.w||12}%;min-height:2%;font-size:clamp(10px, ${Math.round(27*.55)}px, 18px)`;el.textContent=m.text;el.title='اضغطي لتعديل أو حذف الإضافة';el.onclick=()=>{const v=prompt('عدّلي النص، أو امسحيه بالكامل لحذف الإضافة:',m.text);if(v===null)return;if(v==='')state.manual[page].splice(i,1);else m.text=v;persist();draw()};overlay.appendChild(el)});
}
$('next').onclick=()=>{if(page<TOTAL){page++;draw();window.scrollTo(0,0)}};$('prev').onclick=()=>{if(page>1){page--;draw();window.scrollTo(0,0)}};
$('write').onclick=()=>setMode('write');$('check').onclick=()=>setMode('check');$('cancel').onclick=()=>setMode('browse');
overlay.addEventListener('click',e=>{if(mode==='browse'||e.target!==overlay)return;const b=overlay.getBoundingClientRect(),x=(e.clientX-b.left)/b.width*100,y=(e.clientY-b.top)/b.height*100;const text=mode==='check'?'✓':prompt('اكتبي الإجابة التي تريدين إضافتها هنا:');if(text===null||!text.trim())return;(state.manual[page]??=[]).push({x:Math.min(92,x),y:Math.min(96,y),text,size:mode==='check'?18:Math.min(24,+$('scale').value),w:mode==='check'?4:Math.min(38,Math.max(12,text.length*2))});persist();draw();setMode('browse')});
$('undo').onclick=()=>{const a=state.manual[page]||[];if(a.length){a.pop();persist();draw()}else note('لا توجد إضافات يدوية لحذفها في هذه الصفحة.')};
$('reset').onclick=()=>{if(confirm('هل تريدين حذف جميع الإجابات المحفوظة على هذا الجهاز؟')){state={answers:{},manual:{}};persist();draw()}};
function printElement(tag,cl,css,txt,parent){const el=document.createElement(tag);el.className=cl;el.style.cssText=css;el.textContent=txt;parent.appendChild(el)}
$('pdf').onclick=()=>{const root=$('printArea');root.innerHTML='';for(let p=1;p<=TOTAL;p++){let container=document.createElement('div');container.className='print-page';let pic=document.createElement('img');pic.src=`pages/${String(p).padStart(2,'0')}.jpg`;container.appendChild(pic);let layer=document.createElement('div');layer.className='print-layer';container.appendChild(layer);(regions[p]||[]).forEach((r,i)=>{const [type,x,y,w,h]=r,val=state.answers[`${p}:${i}`];if(!val)return;printElement('div',type==='tick'?'print-tick':'print-text',`left:${x}%;top:${y}%;width:${w}%;font-size:${type==='tick'?12:type==='cell'?11:12}px`,type==='tick'?'✓':val,layer)});(state.manual[p]||[]).forEach(m=>printElement('div','print-text',`left:${m.x}%;top:${m.y}%;width:${m.w||12}%;font-size:${Math.max(8,(m.size||27)*.52)}px`,m.text,layer));root.appendChild(container)}note('في نافذة الطباعة اختاري «حفظ بتنسيق PDF». تأكدي من إلغاء الهوامش وتفعيل طباعة الخلفيات عند الحاجة.');setTimeout(()=>window.print(),400)};
const GOOGLE_SCRIPT_URL='https://script.google.com/macros/s/AKfycbzHnNXtT7FXhmr2o2UjI9cpzZVoSaUHn_JRV2KNxgzb0DKsSeTXCmAi-BfBrinp/exec';
$('save').onclick=async()=>{
 const payload={version:1,submissionId:(globalThis.crypto?.randomUUID?.()||String(Date.now())),submittedAt:new Date().toISOString(),answers:{...state.answers,manual:state.manual}};
 try{
  // text/plain avoids the cross-origin preflight; body matches doPost's JSON.parse(e.postData.contents).
  await fetch(GOOGLE_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
  note('تم الحفظ');
 }catch(e){note('تم الحفظ على هذا الجهاز، وتعذر المزامنة حاليًا.');}
};
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key==='ArrowLeft')$('next').click();if(e.key==='ArrowRight')$('prev').click()});setMode('browse');draw();
