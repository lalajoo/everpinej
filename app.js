const apps=[
{id:'6794129450',name:'맞은자로',desc:'주사 기록부터 체중 변화까지, 나를 돌보는 기록.',category:'HEALTH & ROUTINE',color:'#9180db',tint:'#f3effc',play:'com.songminsuk.majeunjaro',crop:[34,107,153,333]},
{id:'6809697035',name:'책있나',desc:'읽고 싶은 책, 빌릴 수 있는 도서관부터.',category:'BOOKS & DISCOVERY',color:'#285240',tint:'#edf3ec',play:'kr.chaekitna.app',crop:[38,136,145,316]},
{id:'6823535266',name:'하루돌봄',desc:'아이의 작은 변화를, 함께 기록해요.',category:'FAMILY & CARE',color:'#648457',tint:'#f6f7e8',play:'com.csjlabs.harucare',crop:[32,104,157,346]},
{id:'6822413349',name:'수당노트',desc:'활동은 끝났으니까, 정산은 간편하게.',category:'WORK & ORGANIZE',color:'#3f7bdc',tint:'#edf3ff',play:'com.sudangnote.sudang_note',crop:[27,105,167,351]},
{id:'6811624891',name:'끝말잇기의 왕',desc:'다음 단어까지 20초. 당신의 한 수는?',category:'WORDS & PLAY',color:'#292a29',tint:'#f0f0ec',play:'com.csjlabs.kkeutmal_king',crop:[33,115,155,344]},
{id:'6817563339',name:'착한 스캐너',desc:'종이는 가볍게. 문서는 또렷하게.',category:'SCAN & SIMPLIFY',color:'#292a29',tint:'#f2f2ef',play:'app.chakhan.chakhan_scan',crop:[31,115,159,354]}
];
const english = document.documentElement.lang === 'en';
const translations = [
['Majeunjaro', 'Injection logs and weight trends. A little care for yourself.'],
['Chaekitna', 'Find your next read. And a library to borrow it from.'],
['Haru Care', 'Little changes, lovingly recorded together.'],
['Sudang Note', 'Work done. Keep your fees and payments in order.'],
['Word Chain King', '20 seconds. One word. Your next move?'],
['Kind Scanner', 'Less paper. Clearer documents.']
];
const labels=english?{prev:'Previous app',next:'Next app',phone:'App preview. Drag left or right, or use the arrow keys to switch apps.',collection:'App collection',apps:'Six apps',choose:'Choose an app',hint:'Move to tilt · Swipe to explore',tagline:'Small things. Everyday usefulness.',hello:'Say hello',home:'everpinej home',screen:' app screenshot',store:'View on ',legal:'Cheongsol J · Business no. 263-21-02579 · Mail-order no. 2026-Jeju Nohyeong-0096'}:{prev:'이전 앱',next:'다음 앱',phone:'앱 화면. 좌우로 쓸거나 화살표 키로 앱을 바꾸세요',collection:'앱 컬렉션',apps:'여섯 가지 앱',choose:'앱 선택',hint:'움직이면 입체적으로 · 좌우로 넘기면 다음 앱',tagline:'일상에, 작은 쓸모.',hello:'문의하기',home:'everpinej 홈',screen:' 실제 앱 화면',store:'에서 보기',legal:'상호 청솔제이 · 사업자등록번호 263-21-02579 · 통신판매업신고 제2026-제주노형-0096호'};
if(english)apps.forEach((a,i)=>{a.name=translations[i][0];a.desc=translations[i][1]});
const screenSource=a=>`/assets/${a.id}${a.id==='6817563339'?'-store-hd.png':'-screen.png'}`;
const $=s=>document.querySelector(s);let current=0,busy=false,requested=0,selectionToken=0;const dock=$('.dock');
$('.prev').setAttribute('aria-label',labels.prev);$('.next').setAttribute('aria-label',labels.next);$('.phone').setAttribute('aria-label',labels.phone);$('main').setAttribute('aria-label',labels.collection);$('.showcase').setAttribute('aria-label',labels.apps);dock.setAttribute('aria-label',labels.choose);$('.brand').setAttribute('aria-label',labels.home);$('.hint').textContent='↔  '+labels.hint;$('#tagline').textContent=labels.tagline;$('#contact-label').textContent=labels.hello;$('#legal').textContent=labels.legal;

apps.forEach((a,i)=>{const b=document.createElement('button');b.className='app-tab';b.setAttribute('role','tab');b.setAttribute('aria-label',a.name);b.innerHTML=`<img src="/assets/${a.id}-icon.jpg" alt="" draggable="false">`;b.onclick=()=>select(i);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?5:(i+(e.key==='ArrowRight'?1:5))%6;select(n);dock.children[n].focus()}};dock.append(b)});
function render(preparedImage){const a=apps[current];$('#name').textContent=a.name;$('#description').textContent=a.desc;$('#category').textContent=a.category;$('#counter').textContent=`${String(current+1).padStart(2,'0')} / 06`;$('#apple').href=`https://apps.apple.com/kr/app/id${a.id}`;$('#google').href=`https://play.google.com/store/apps/details?id=${a.play}`;$('#apple').setAttribute('aria-label',english?'View '+a.name+' on the App Store':a.name+' App Store에서 보기');$('#google').setAttribute('aria-label',english?'View '+a.name+' on Google Play':a.name+' Google Play에서 보기');document.documentElement.style.setProperty('--accent',a.color);document.documentElement.style.setProperty('--tint',a.tint);const previous=$('#screen');const im=preparedImage||new Image();im.id='screen';im.draggable=false;if(!preparedImage)im.src=screenSource(a);im.alt=a.name+labels.screen;if(a.id==='6817563339'){const [x,y,w,h]=a.crop;Object.assign(im.style,{width:221/w*100+'%',height:480/h*100+'%',left:-x/w*100+'%',top:-y/h*100+'%'});}else{Object.assign(im.style,{width:'100%',height:'100%',left:'0',top:'0',objectFit:'contain'});}previous.replaceWith(im);[...dock.children].forEach((b,i)=>{b.setAttribute('aria-selected',String(i===current));b.tabIndex=i===current?0:-1});}
async function select(i){
 i=(i+apps.length)%apps.length;
 if(i===requested)return;
 const from=requested;requested=i;const token=++selectionToken;
 const nextImage=new Image();nextImage.src=screenSource(apps[i]);
 try{await nextImage.decode()}catch{if(token===selectionToken)requested=current;return}
 if(token!==selectionToken)return;
 const direction=(i-from+apps.length)%apps.length===apps.length-1?-1:1;
 current=i;render(nextImage);
 if(!reducedMotion.matches)nextImage.animate([{transform:`translateX(${direction*28}%)`,opacity:.4},{transform:'translateX(0)',opacity:1}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});
}
$('.prev').onclick=()=>select(requested-1);$('.next').onclick=()=>select(requested+1);$('.phone').onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();select(requested+(e.key==='ArrowRight'?1:-1))}};const phone=$('.phone'),area=$('.phone-area'),shadow=$('.shadow');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let start=null;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function tilt(x,y,drag=false){if(reducedMotion.matches)return;const r=area.getBoundingClientRect();const nx=clamp((x-r.left)/r.width*2-1,-1,1),ny=clamp((y-r.top)/r.height*2-1,-1,1);phone.style.setProperty('--rx',(-ny*11)+'deg');phone.style.setProperty('--ry',(nx*(drag?28:19))+'deg');phone.style.setProperty('--rz',(-3+nx*2)+'deg');phone.style.setProperty('--light-x',((nx+1)*50)+'%');phone.style.setProperty('--light-y',((ny+1)*50)+'%');shadow.style.transform=`translateX(${nx*12}px) scaleX(${1-Math.abs(nx)*.12})`;}
function resetTilt(){phone.style.setProperty('--rx','2deg');phone.style.setProperty('--ry','-11deg');phone.style.setProperty('--rz','-4deg');shadow.style.transform='';phone.classList.remove('dragging');}
area.onpointermove=e=>{if(e.pointerType==='mouse'&&!start)tilt(e.clientX,e.clientY)};
area.onpointerleave=()=>{if(!start)resetTilt()};
phone.onpointerdown=e=>{if(e.button!==0||busy)return;start={x:e.clientX,y:e.clientY,id:e.pointerId};phone.classList.add('dragging');phone.setPointerCapture(e.pointerId);tilt(e.clientX,e.clientY,true)};
phone.onpointermove=e=>{if(start&&start.id===e.pointerId)tilt(e.clientX,e.clientY,true)};
phone.onpointerup=e=>{if(!start||start.id!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;resetTilt();if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)*1.2)select(requested+(dx<0?1:-1))};
phone.onpointercancel=()=>{start=null;resetTilt()};phone.onlostpointercapture=()=>{start=null;resetTilt()};
reducedMotion.addEventListener('change',resetTilt);resetTilt();$('#year').textContent=new Date().getFullYear();render();apps.forEach(a=>{const im=new Image();im.src=screenSource(a)});
