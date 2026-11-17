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

function tree(x,y,scale=1,color='#143b38',wind=0){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle=color;ctx.fillRect(-2,-110,4,112);for(let j=0;j<5;j++){const top=-135+j*21;const width=17+j*7;poly([[wind+2,top],[-width,top+55],[width+wind,top+55]],color);}ctx.restore();}
function mountainShape(cx,cy,w,h,color,snow){const pts=[[cx-w*.6,cy],[cx-w*.43,cy-h*.26],[cx-w*.31,cy-h*.35],[cx-w*.21,cy-h*.63],[cx-w*.14,cy-h*.57],[cx,cy-h],[cx+w*.085,cy-h*.85],[cx+w*.15,cy-h*.58],[cx+w*.27,cy-h*.46],[cx+w*.32,cy-h*.3],[cx+w*.52,cy]];poly(pts,color);poly([[cx,cy-h],[cx+w*.085,cy-h*.85],[cx+w*.15,cy-h*.58],[cx+w*.27,cy-h*.46],[cx+w*.32,cy-h*.3],[cx+w*.52,cy],[cx+w*.09,cy],[cx+w*.07,cy-h*.36],[cx-w*.04,cy-h*.52]],'#102d3825');if(snow){poly([[cx-w*.1,cy-h*.75],[cx,cy-h],[cx+w*.085,cy-h*.85],[cx+w*.15,cy-h*.58],[cx+w*.06,cy-h*.69],[cx+w*.025,cy-h*.61],[cx-w*.015,cy-h*.77],[cx-w*.055,cy-h*.69]],snow);line([[cx-w*.01,cy-h*.91],[cx-w*.06,cy-h*.76],[cx-w*.02,cy-h*.8]],'#f7f3d94a',2);}}
function background(theme,t,cam,home=false){
  const c=colors[theme],w=viewW;
  const sky=ctx.createLinearGradient(0,0,0,700);sky.addColorStop(0,c.top);sky.addColorStop(.55,c.mid);sky.addColorStop(1,c.horizon);ctx.fillStyle=sky;ctx.fillRect(0,0,w,810);
  const sunX=home?w*.7:w*.78-cam*.018,sunY=home?164:151;
  glow(sunX,sunY,160,theme==='snow'?'#f4f1d922':'#f5dab43b');circle(sunX,sunY,home?43:31,theme==='snow'?'#e0e3ce88':'#eddfb6bb');
  // The ranges move at different speeds, preserving a wide, layered landscape.
  const farShift=(cam*.07)%650;
  for(let i=-1;i<5;i++)mountainShape(i*620+280-farShift,600,1050,240+random(i+9)*165,c.far,c.snow+'80');
  const haze=ctx.createLinearGradient(0,350,0,690);haze.addColorStop(0,'#c9d4bd00');haze.addColorStop(.65,theme==='snow'?'#d4e1d33b':'#d8debf2e');haze.addColorStop(1,'transparent');ctx.fillStyle=haze;ctx.fillRect(0,350,w,340);
  for(let i=-1;i<5;i++)mountainShape(i*700+435-(cam*.14)%700,730,1100,290+random(i+45)*155,c.mountain,theme==='meadow'?'#c2ccac99':c.snow+'b3');
  mountainShape(w*.72-(cam*.11)%160,755,710,home?475:435,c.middle,c.snow);
  for(let layer=0;layer<2;layer++){
    const pts=[[-100,850]];for(let x=-100;x<=w+160;x+=55){const v=x+cam*(.2+layer*.1);const y=645+layer*65-Math.sin(v*.0028+layer*3)*55-Math.sin(v*.0081+2)*30-random(Math.floor(v/55))*12;pts.push([x,y]);}pts.push([w+170,850]);poly(pts,layer?c.near:c.middle+'cc');
  }
  for(let i=0;i<4;i++){
    const cloudX=((i*463+t*(3+i)+(cam*.06))%(w+800))-300;const y=300+i*85;
    ctx.save();ctx.globalAlpha=theme==='stone'?.13:.065;const cloud=ctx.createRadialGradient(cloudX,y,10,cloudX,y,280);cloud.addColorStop(0,'#f4f0d2');cloud.addColorStop(1,'#f4f0d200');ctx.translate(0,y);ctx.scale(1,.22);ctx.fillStyle=cloud;ctx.fillRect(cloudX-300,-1500,600,3000);ctx.restore();
  }
  if(home){
    const ridge=[[w*.33,810],[w*.48,713],[w*.57,689],[w*.64,619],[w*.71,607],[w*.79,536],[w*.84,549],[w*.88,578],[w*.96,599],[w+40,574],[w+40,810]];
    poly(ridge,'#1b3637');line(ridge.slice(1,-1),'#788d6b',4);
    poly([[w*.79,539],[w*.84,549],[w*.88,578],[w*.82,698],[w*.72,810],[w*.64,810],[w*.72,681]],'#2b4842');
    for(let i=0;i<18;i++){const x=w*.82+i*17;const y=561+i*1.9;line([[x,y],[x+4,y-13-random(i)*9]],'#8f9e6e',1.4);}
    hiker(w*.796,533,1,0,false,1.1,t);
    for(let i=0;i<9;i++)tree(w*.05+i*39,840,.85+random(i)*.65,'#112b2c',Math.sin(t)*3);
    tree(w-40,830,1.4,'#132c2e');tree(w-95,845,.85,'#143030');
    const foreground=ctx.createLinearGradient(0,690,0,810);foreground.addColorStop(0,'transparent');foreground.addColorStop(1,'#10252b88');ctx.fillStyle=foreground;ctx.fillRect(0,690,w,120);
    for(let i=0;i<5;i++){const bx=w*.52+i*35+Math.sin(t*.2+i)*10;const by=205+i*13;line([[bx-5,by],[bx,by+3],[bx+6,by-1]],'#294c4b',1.5);}
  }
}

function platform(plat,theme,index){
  const c=colors[theme],{x,y,w}=plat;
  const top=[];for(let dx=0;dx<=w;dx+=Math.min(35,w))top.push([x+dx,y+((dx===0)?1:random(dx+index)*3)]);top.push([x+w,y]);
  poly([...top,[x+w-15,850],[x+20,850]],c.rock);
  poly([[x+w*.15,y+8],[x+w*.54,y+15],[x+w*.72,y+80],[x+w*.51,850],[x+w*.09,850],[x+w*.22,y+120]],c.face);
  poly([[x+w*.65,y+14],[x+w,y],[x+w-15,850],[x+w*.52,850],[x+w*.76,y+150]],'#0f252c4d');
  line([[x+2,y+1],[x+w-2,y+1]],c.grass,theme==='snow'?8:5);
  if(theme==='snow'){
    for(let i=0;i<w/35;i++)poly([[x+i*35,y-3],[x+i*35+34,y-3],[x+i*35+27,y+9+random(i+index)*11],[x+i*35+16,y+7]],'#d7e3dd');
  }
  for(let i=0;i<w/45;i++){
    const xx=x+random(i+index*27)*w,yy=y+25+random(i*6+index)*175;
    line([[xx,yy],[xx+8+random(i)*18,yy+5],[xx+15,yy+27]],theme==='snow'?'#b1c8c331':'#9cac8a29',1);
  }
  if(theme==='meadow')for(let i=7;i<w-8;i+=12){const h=6+random(i+index)*14;line([[x+i,y],[x+i+Math.sin(clock*1.6+i)*3,y-h]],i%3?'#82956d':'#b7b989',1.2);if(i%7===0)circle(x+i,y-h,1.5,'#d6c291');}
  if(theme==='stone')for(let i=25;i<w-15;i+=80){const r=8+random(i)*15;poly([[x+i-r,y],[x+i-r*.6,y-r*.5],[x+i+r*.3,y-r],[x+i+r,y-3]],'#72817c');}
}

function hiker(x,feet,facing=1,speed=0,air=false,scale=1,t=0,alpha=1){
  ctx.save();ctx.translate(x,feet);ctx.scale(facing*scale,scale);ctx.globalAlpha=alpha;
  const stride=air?-.6:Math.sin(t*15)*Math.min(1,Math.abs(speed)/200),bob=air?0:Math.abs(stride)*2;
  ctx.translate(0,-bob);
  // Boots, trouser legs, expedition jacket, backpack and a moving scarf.
  line([[-2,-23],[-6-stride*7,-10],[-7-stride*9,-2]],'#15272a',7);line([[5,-24],[6+stride*7,-12],[8+stride*10,-2]],'#263438',7);
  line([[-10-stride*9,-1],[-4-stride*9,-1]],'#b0b2a1',4);line([[6+stride*10,-1],[14+stride*10,-1]],'#b0b2a1',4);
  ctx.fillStyle='#b76040';ctx.beginPath();ctx.roundRect(-9,-43,19,23,5);ctx.fill();
  ctx.fillStyle='#b78a55';ctx.beginPath();ctx.roundRect(-17,-43,12,24,4);ctx.fill();line([[-16,-36],[-7,-36]],'#d5ba80',2);line([[-12,-42],[-10,-22]],'#6a694e',2);
  line([[5,-38],[12+stride*3,-30],[18,-24]],'#d28b59',6);
  line([[18,-26],[24+stride*4,-2]],'#c0b997',1.8);
  circle(2,-48,7,'#e3b18a');ctx.fillStyle='#2d4141';ctx.fillRect(-5,-56,13,6);ctx.fillRect(-7,-51,18,3);
  poly([[-2,-43],[-9,-42],[-24,-46+Math.sin(t*4)*3],[-22,-42+Math.sin(t*4)*4],[-8,-38],[1,-40]],'#e1ad6c');
  circle(7,-48,1,'#263333');ctx.restore();
}
function tent(camp,active){
  const {x,y}=camp;
  glow(x,y-24,100,active?'#d7bf6b28':'#e4be5820');
  poly([[x-47,y],[x-11,y-60],[x+48,y]],'#b68650');poly([[x-11,y-60],[x+15,y-13],[x+48,y]],'#d0ad70');poly([[x-11,y-50],[x-33,y],[x+9,y]],'#3e4439');poly([[x-11,y-42],[x-28,y],[x+5,y]],'#9e88542b');line([[x-11,y-60],[x-62,y+2]],'#bdc1a861');line([[x-11,y-60],[x+65,y+2]],'#bdc1a861');
  const lx=x+55;line([[lx,y],[lx,y-25]],'#778777',2);glow(lx,y-24,23,'#eec68280');ctx.fillStyle='#e8c68b';ctx.fillRect(lx-3,y-29,6,10);text(active?'已记录':'避风点',x,y-76,10,active?'#ddc38b':'#c3cfb8','center');
}
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
  for(const plat of level.platforms){if(plat.x+plat.w<camera-100 || plat.x>camera+viewW+100)continue;platform(plat,level.theme,plat.id);if(level.theme==='meadow' && plat.w>300 && plat.id!==3 && plat.id!==6){tree(plat.x+65,plat.y,.53,'#315d4d',Math.sin(clock+plat.id)*3);}}
  for(const camp of level.camps)tent(camp,state.checkpoint.id===camp.id);
  for(const note of level.notes)if(!state.collected.has(note.id))noteDraw(note);
  flag(level.goal,level.theme);
  for(const source of level.rocks){const ground=level.platforms.find(p=>source.x>=p.x&&source.x<=p.x+p.w);if(!ground)continue;poly([[source.x,ground.y-17],[source.x-8,ground.y-3],[source.x+8,ground.y-3]],'#bd945d');text('落石',source.x,ground.y-30,9,'#c1af8b','center');}
  for(const rock of state.rocks){poly([[rock.x-12,rock.y-5],[rock.x-4,rock.y-13],[rock.x+9,rock.y-10],[rock.x+13,rock.y+5],[rock.x+3,rock.y+12],[rock.x-10,rock.y+8]],'#b9bca9');line([[rock.x-6,rock.y-6],[rock.x+3,rock.y],[rock.x-2,rock.y+8]],'#697d76',2);}
  circle(p.x+PLAYER_W/2,p.y+PLAYER_H+2,p.grounded?14:8,'#0a222940');
  hiker(p.x+PLAYER_W/2,p.y+PLAYER_H,p.facing,p.vx,!p.grounded,1.15,clock,p.invulnerable>0?(Math.sin(clock*22)>.1?.45:1):1);
  if(p.x<420&&state.elapsed<15){text('往右走，旅程开始了。',230,500,15,'#d9dfc6','center');text('← → 移动    Space 跳跃',230,525,11,'#c4d1b3','center');}
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
