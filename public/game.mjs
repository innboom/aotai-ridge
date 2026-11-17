import { drawBackground, drawPlatform, drawHiker, drawTent, drawBoulder } from './scenery.mjs';
import { LEVELS, NOTES, WORLD_HEIGHT, PLAYER_W, PLAYER_H, createGame, step } from './engine.mjs';

const $ = id => document.getElementById(id);
const canvas=$('game'), ctx=canvas.getContext('2d',{alpha:false});
const saveKey='aotai-ridgeline-v1';
let save={unlocked:0,notes:[],started:false,level:0,finished:[],checkpoints:{}};
try {
  const stored=JSON.parse(localStorage.getItem(saveKey));
  if(stored && typeof stored==='object') {
    save={unlocked:Math.floor(Math.max(0,Math.min(2,Number(stored.unlocked)||0))),notes:Array.isArray(stored.notes)?stored.notes.filter(id=>NOTES.some(n=>n.id===id)):[],started:!!stored.started,level:Math.floor(Math.max(0,Math.min(2,Number(stored.level)||0))),finished:Array.isArray(stored.finished)?stored.finished.filter(n=>[0,1,2].includes(n)):[],checkpoints:stored.checkpoints && typeof stored.checkpoints==='object'?stored.checkpoints:{}};
  }
} catch { /* Storage can be disabled in private browsing. */ }
const store=()=>{try{const old=JSON.parse(localStorage.getItem(saveKey));if(old&&typeof old==='object'){save.notes=[...new Set([...save.notes,...(Array.isArray(old.notes)?old.notes.filter(id=>NOTES.some(n=>n.id===id)):[])])];save.unlocked=Math.max(save.unlocked,Math.floor(Math.max(0,Math.min(2,Number(old.unlocked)||0))));save.finished=[...new Set([...save.finished,...(Array.isArray(old.finished)?old.finished.filter(n=>[0,1,2].includes(n)):[])])];}localStorage.setItem(saveKey,JSON.stringify(save));}catch{}};
let state=createGame(),mode='home',viewW=1440,camera=0,clock=0,last=0,accumulator=0,lastHud=0;
let keyState={},jumpQueued=false,interactQueued=false,respawnQueued=false,touchState={},toastTimer,chapterTimer,dialogReturn='home';
let audioEnabled=false,audioContext=null;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const colors={
  meadow:{top:'#2b4c52',mid:'#698b83',horizon:'#cccfac',far:'#90a79b',mountain:'#668b82',middle:'#416c67',near:'#234b48',rock:'#203d3d',face:'#35534b',grass:'#9eac80',snow:'#b8c9b8'},
  stone:{top:'#253b48',mid:'#647d86',horizon:'#c2c8ba',far:'#91a6a4',mountain:'#718b8e',middle:'#4c6970',near:'#2e4a55',rock:'#273a43',face:'#49565b',grass:'#9eaaa1',snow:'#cad0bd'},
  snow:{top:'#233446',mid:'#648291',horizon:'#c7d6d0',far:'#a9bec1',mountain:'#819ea9',middle:'#547786',near:'#314f60',rock:'#263c4e',face:'#4b6473',grass:'#dee6dc',snow:'#edf0e6'},
};
function resize(){const rect=canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);viewW=WORLD_HEIGHT*rect.width/rect.height;}
new ResizeObserver(resize).observe(canvas);resize();
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function line(points,color,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function random(n){return ((Math.sin(n*127.1+311.7)*43758.5453)%1+1)%1;}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');circle(x,y,r,g);}
function text(value,x,y,size=12,color='#d3dfd0',align='left',family='"Segoe UI","Microsoft YaHei",sans-serif'){ctx.font=`${size}px ${family}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);}

function background(theme,t,cam,home=false){drawBackground(ctx,theme,t,cam,viewW,home);}
function platform(plat,theme){drawPlatform(ctx,plat,theme);}
function hiker(...args){drawHiker(ctx,...args);}
function tent(camp,active){drawTent(ctx,camp,active);}
function noteDraw(note){const bob=Math.sin(clock*2.5+note.x)*5;glow(note.x,note.y+bob,37,'#e9c17a42');ctx.save();ctx.translate(note.x,note.y+bob);ctx.rotate(Math.sin(clock+note.x)*.08);ctx.fillStyle='#e8d1a2';ctx.fillRect(-11,-8,22,16);line([[-10,-7],[0,1],[10,-7]],'#967348');line([[-10,7],[-3,0]],'#b2945e',.7);line([[10,7],[3,0]],'#b2945e',.7);ctx.restore();}
function flag(goal,theme){const {x,y}=goal;glow(x,y-60,80,'#e4cda521');line([[x,y],[x,y-110]],'#ced5c1',3);const wave=Math.sin(clock*3)*5;poly([[x+2,y-108],[x+45,y-101+wave],[x+37,y-79+wave],[x+2,y-84]],'#c48657');line([[x-18,y],[x-7,y-12],[x+8,y-17],[x+22,y]],colors[theme].snow,3);text('山脊信标',x,y-127,11,'#e6dab8','center');}
function weather(theme,t){
  if(theme==='stone'){
    const fog=ctx.createLinearGradient(0,410,0,810);fog.addColorStop(0,'transparent');fog.addColorStop(.65,'#c5d4d21c');fog.addColorStop(1,'#dbe2d43b');ctx.fillStyle=fog;ctx.fillRect(0,410,viewW,400);
  }
  if(theme==='snow'){
    const count=reduceMotion?25:85;for(let i=0;i<count;i++){const x=((random(i+912)*viewW+t*(30+random(i)*65))%(viewW+60))-30;const y=(random(i+44)*900+t*(25+random(i+6)*55))%900-40;circle(x,y,.8+random(i+12)*1.8,'#f6f4e2'+(i%2?'99':'55'));}
    if(Math.abs(state.wind)>35)for(let i=0;i<8;i++){const x=(i*210+clock*180)%(viewW+240)-180;const y=190+i*69;line([[x,y],[x+60,y-8]],'#dfe8df14',1);}
  }
}
function render(){
  ctx.setTransform(canvas.width/viewW,0,0,canvas.height/WORLD_HEIGHT,0,0);
  if(mode==='home') {background('meadow',reduceMotion?0:clock,0,true);return;}
  const {level,player:p}=state;
  const target=Math.max(0,Math.min(level.width-viewW,p.x-viewW*.32));camera+=(target-camera)*.12;
  background(level.theme,clock,camera);
  ctx.save();ctx.translate(-camera,0);
  for(const plat of level.platforms){if(plat.x+plat.w<camera-100 || plat.x>camera+viewW+100)continue;platform(plat,level.theme,plat.id);}
  for(const camp of level.camps)tent(camp,state.checkpoint.id===camp.id);
  for(const note of level.notes)if(!state.collected.has(note.id))noteDraw(note);
  flag(level.goal,level.theme);
  for(const source of level.rocks){const ground=level.platforms.find(p=>source.x>=p.x&&source.x<=p.x+p.w);if(!ground)continue;poly([[source.x,ground.y-17],[source.x-8,ground.y-3],[source.x+8,ground.y-3]],'#bd945d');text('落石',source.x,ground.y-30,9,'#c1af8b','center');}
  for(const rock of state.rocks)drawBoulder(ctx,rock.x,rock.y,14,13,rock.x%17,level.theme);
  circle(p.x+PLAYER_W/2,p.y+PLAYER_H+2,p.grounded?14:8,'#0a222940');
  hiker(p.x+PLAYER_W/2,p.y+PLAYER_H,p.facing,p.vx,!p.grounded,1.15,clock,p.invulnerable>0?(Math.sin(clock*22)>.1?.45:1):1);
  if(p.x<420&&state.elapsed<15){ctx.save();ctx.shadowColor='#14232b';ctx.shadowBlur=6;text('往右走，旅程开始了。',230,500,15,'#d9dfc6','center');text('← → 移动    Space 跳跃',230,525,11,'#f2ead2','center');ctx.restore();}
  ctx.restore();weather(level.theme,clock);
  if(p.warmth<35){const frost=ctx.createRadialGradient(viewW/2,405,viewW*.15,viewW/2,405,viewW*.7);frost.addColorStop(0,'transparent');frost.addColorStop(1,`rgba(165,208,225,${(35-p.warmth)/100})`);ctx.fillStyle=frost;ctx.fillRect(0,0,viewW,810);}
}

function showToast(message,duration=3200){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,duration);}
function clearInput(){keyState={};touchState={};jumpQueued=false;interactQueued=false;respawnQueued=false;}
function setMode(next){mode=next;$('home').hidden=mode!=='home';$('pause').hidden=mode!=='paused';$('finish').hidden=mode!=='finished';$('hud').hidden=mode==='home';$('progress').hidden=mode==='home';$('touchControls').hidden=mode!=='playing';if(mode!=='playing'){$('prompt').hidden=true;clearInput();}}
function startLevel(index,resume=false){
  if(index>save.unlocked){showToast('先完成上一程，这段山脊就会为你展开。');return;}
  state=createGame(index,save.notes);camera=0;accumulator=0;clearInput();
  const camp=resume?state.level.camps.find(c=>c.id===save.checkpoints[index]):null;
  if(camp){state.checkpoint={x:camp.x-PLAYER_W/2,y:camp.y-PLAYER_H,id:camp.id};Object.assign(state.player,{x:state.checkpoint.x,y:state.checkpoint.y});camera=Math.max(0,state.player.x-viewW*.32);}else save.checkpoints[index]=-1;
  setMode('playing');save.started=true;save.level=index;store();updateCards();
  $('chapterSubtitle').textContent=state.level.intro;$('chapterTitle').textContent=state.level.title;
  const banner=$('chapterBanner');banner.hidden=true;void banner.offsetWidth;banner.hidden=false;clearTimeout(chapterTimer);chapterTimer=setTimeout(()=>banner.hidden=true,3500);
  canvas.focus({preventScroll:true});canvas.scrollIntoView({block:'center',behavior:reduceMotion?'instant':'smooth'});updateHud();
}
function updateCards(){
  document.querySelectorAll('.chapter-card').forEach((el,i)=>{el.setAttribute('aria-disabled',i>save.unlocked?'true':'false');el.classList.toggle('active',i===(mode==='home'?save.level:state.level.index));el.querySelector('.chapter-state').textContent=save.finished.includes(i)?'重访 ↗':i<=save.unlocked?'启程 ↗':'未抵达';});
  $('continueButton').hidden=!save.started;$('journalCount').textContent=`${String(save.notes.length).padStart(2,'0')} / 09`;
}
const formatTime=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
function updateHud(){
  const p=state.player;$('hudNumber').textContent=`0${state.level.index+1} / 03`;$('hudPlace').textContent=state.level.title;$('hudWeather').textContent=state.level.weather;
  $('warmthBar').style.width=`${p.warmth}%`;$('warmthValue').textContent=`${Math.ceil(p.warmth)}%`;$('staminaBar').style.width=`${p.stamina}%`;$('staminaValue').textContent=`${Math.ceil(p.stamina)}%`;
  $('elapsed').textContent=formatTime(state.elapsed);$('progressBar').style.width=`${Math.min(100,Math.max(0,(p.x-150)/(state.level.goal.x-150)*100))}%`;$('routeLabel').textContent=state.level.startLabel;
  $('prompt').hidden=!state.prompt||mode!=='playing';$('prompt').textContent=state.prompt==='camp'?'按 E · 在避风点休息并记录进度':state.level.index===2?'按 E · 点亮信标，把消息带回家':'按 E · 点亮信标，完成这一程';
  // Exposed as DOM status for accessibility and black-box verification.
  canvas.dataset.level=String(state.level.index);canvas.dataset.progress=String(Math.round((p.x-150)/(state.level.goal.x-150)*100));canvas.dataset.status=mode;
}
function finishLevel(){
  save.unlocked=Math.max(save.unlocked,Math.min(2,state.level.index+1));save.notes=[...state.collected];if(!save.finished.includes(state.level.index))save.finished.push(state.level.index);save.level=Math.min(2,state.level.index+1);store();
  setMode('finished');$('chapterBanner').hidden=true;
  const lastLevel=state.level.index===2;
  $('finishEyebrow').textContent=lastLevel?'THE LETTER HAS ARRIVED':'CHAPTER COMPLETE';$('finishTitle').textContent=lastLevel?'山脊的来信，已送达。':'这一程，平安抵达。';$('finishText').textContent=state.level.finish;
  $('resultTime').textContent=formatTime(state.elapsed);$('resultNotes').textContent=`${state.level.notes.filter(n=>state.collected.has(n.id)).length} / 3`;$('resultFalls').textContent=state.falls;
  $('nextButton').innerHTML=lastLevel?'再走一程 <span>↗</span>':'前往下一程 <span>→</span>';updateCards();tone('complete');
}
function events(){
  for(const event of state.events){
    if(event.type==='note'){save.notes=[...state.collected];store();updateCards();const note=NOTES.find(n=>n.id===event.id);showToast(`拾得手记 · ${note.title}  /  ${save.notes.length} of 9`);tone('note');}
    else if(event.type==='camp'){save.checkpoints[state.level.index]=state.checkpoint.id;store();showToast('避风点已记录 · 体温与体力恢复');tone('camp');}
    else if(event.type==='respawn'){showToast(event.reason==='cold'?'风雪太冷了。已回到避风点，重新暖起来。':event.reason==='restart'?'回到最近的避风点。再慢慢出发。':'没关系，回到避风点，再试一次。');tone('fall');camera=Math.max(0,state.player.x-viewW*.32);}
    else if(event.type==='hit'){showToast('留意落石 · 体温降低，前往避风点恢复');tone('fall');}
    else if(event.type==='jump')tone('jump');
    else if(event.type==='complete')finishLevel();
  }
  state.events=[];
}
function tone(kind){if(!audioEnabled)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const notes=kind==='note'?[523,659,784]:kind==='complete'?[392,523,659,784]:kind==='camp'?[330,440]:kind==='fall'?[190,140]:[250];notes.forEach((f,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain(),when=audioContext.currentTime+i*.12;osc.type='sine';osc.frequency.setValueAtTime(f,when);gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(kind==='jump'?.025:.06,when+.012);gain.gain.exponentialRampToValueAtTime(.001,when+.3);osc.connect(gain);gain.connect(audioContext.destination);osc.start(when);osc.stop(when+.31);});}catch{audioEnabled=false;$('soundButton').setAttribute('aria-pressed','false');}}
function pauseGame(){if(mode==='playing'){setMode('paused');tone('camp');}else if(mode==='paused'){setMode('playing');canvas.focus({preventScroll:true});}}
function home(){setMode('home');$('chapterBanner').hidden=true;$('toast').hidden=true;updateCards();window.scrollTo({top:0,behavior:reduceMotion?'instant':'smooth'});}
$('startButton').addEventListener('click',()=>startLevel(0));$('continueButton').addEventListener('click',()=>startLevel(save.level,true));
$('pauseButton').addEventListener('click',pauseGame);$('resumeButton').addEventListener('click',pauseGame);$('restartButton').addEventListener('click',()=>startLevel(state.level.index));$('backHomeButton').addEventListener('click',home);$('finishHomeButton').addEventListener('click',home);$('nextButton').addEventListener('click',()=>startLevel(state.level.index===2?0:state.level.index+1));
document.querySelectorAll('.chapter-card').forEach(el=>el.addEventListener('click',()=>startLevel(Number(el.dataset.level))));
$('soundButton').addEventListener('click',()=>{audioEnabled=!audioEnabled;$('soundButton').setAttribute('aria-pressed',String(audioEnabled));$('soundButton').setAttribute('aria-label',audioEnabled?'关闭音效':'开启音效');if(audioEnabled)tone('note');});
function openDialog(dialog){dialogReturn=mode;clearInput();if(mode==='playing'){mode='dialog';$('touchControls').hidden=true;$('prompt').hidden=true;}dialog.showModal();}
function closeDialog(dialog){dialog.close();}
for(const dialog of [$('helpDialog'),$('journalDialog')]){dialog.querySelector('.close-dialog').addEventListener('click',()=>closeDialog(dialog));dialog.addEventListener('close',()=>{if(mode==='dialog'){setMode(dialogReturn);canvas.focus({preventScroll:true});}});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}});}
$('helpButton').addEventListener('click',()=>openDialog($('helpDialog')));$('helpDialog').querySelector('.close-help').addEventListener('click',()=>closeDialog($('helpDialog')));
$('journalButton').addEventListener('click',()=>{const list=$('journalEntries');list.replaceChildren();NOTES.forEach((note,i)=>{const unlocked=save.notes.includes(note.id),el=document.createElement('article');el.className=`journal-entry${unlocked?'':' locked'}`;const small=document.createElement('small');small.textContent=`0${i+1} / ${note.chapter}`;const title=document.createElement('h3');title.textContent=unlocked?note.title:'尚未拾得';const p=document.createElement('p');p.textContent=unlocked?note.text:'沿着山脊，寻找一封发光的来信。';el.append(small,title,p);list.append(el);});openDialog($('journalDialog'));});
const jumpKeys=['Space','ArrowUp','KeyW'];const controlKeys=[...jumpKeys,'ArrowLeft','ArrowRight','KeyA','KeyD','KeyE','KeyR','ShiftLeft','ShiftRight'];
addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]'))return;
  if(e.code==='Escape'||e.code==='KeyP'){if(mode==='playing'||mode==='paused'){e.preventDefault();if(!e.repeat)pauseGame();}return;}
  if(mode!=='playing')return;
  if(controlKeys.includes(e.code))e.preventDefault();
  if(jumpKeys.includes(e.code)&&!keyState[e.code])jumpQueued=true;
  if(e.code==='KeyE'&&!e.repeat)interactQueued=true;
  if(e.code==='KeyR'&&!e.repeat)respawnQueued=true;
  keyState[e.code]=true;
});
addEventListener('keyup',e=>{keyState[e.code]=false;});
addEventListener('blur',()=>{clearInput();if(mode==='playing')setMode('paused');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(mode==='playing')setMode('paused');}});
document.querySelectorAll('[data-control]').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);const control=button.dataset.control;touchState[control]=true;if(control==='jump')jumpQueued=true;if(control==='interact')interactQueued=true;});const release=()=>{touchState[button.dataset.control]=false;};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);});
canvas.addEventListener('pointerdown',()=>{if(mode==='playing')canvas.focus({preventScroll:true});});
function frame(timestamp){
  const delta=Math.min((timestamp-last)/1000||0,0.08);last=timestamp;clock+=delta;
  if(mode==='playing'){
    accumulator+=delta;
    while(accumulator>=1/120){const input={left:keyState.ArrowLeft||keyState.KeyA||touchState.left,right:keyState.ArrowRight||keyState.KeyD||touchState.right,jumpPressed:jumpQueued,jumpHeld:jumpKeys.some(k=>keyState[k])||touchState.jump,sprint:keyState.ShiftLeft||keyState.ShiftRight,interact:interactQueued,respawn:respawnQueued};step(state,input,1/120);jumpQueued=false;interactQueued=false;respawnQueued=false;events();accumulator-=1/120;if(mode!=='playing'){accumulator=0;break;}}
  } else accumulator=0;
  render();if(timestamp-lastHud>90){updateHud();lastHud=timestamp;}requestAnimationFrame(frame);
}
updateCards();setMode('home');requestAnimationFrame(frame);
