export const WORLD_HEIGHT = 810;
export const PLAYER_W = 24;
export const PLAYER_H = 48;
export const PHYSICS = Object.freeze({ gravity: 1680, jumpSpeed: 680, walkSpeed: 285, sprintSpeed: 395 });

export const NOTES = [
  { id: '0-0', chapter: '鳌山 · 高山草甸', title: '风的方向', text: '清晨的草甸像一片安静的海。我站了一会儿，才发现风并不催人赶路。它只是经过。' },
  { id: '0-1', chapter: '鳌山 · 高山草甸', title: '山不需要被征服', text: '今天把“征服”从笔记里划掉了。山一直在那里，而我只是一个短暂的来访者。' },
  { id: '0-2', chapter: '鳌山 · 高山草甸', title: '把消息带回去', text: '出发前，有人说：风景可以慢慢看，记得回来。现在想来，那是这趟旅程最重要的一句话。' },
  { id: '1-0', chapter: '秦岭主梁 · 石海', title: '石头的年纪', text: '冰川离开了，留下满山沉默的石头。我们的脚步只是它们漫长岁月里，极轻的一声。' },
  { id: '1-1', chapter: '秦岭主梁 · 石海', title: '等一等云', text: '雾升起来的时候，远处的山峰不见了。我决定坐下，等云走过。停下来，也是一种前进。' },
  { id: '1-2', chapter: '秦岭主梁 · 石海', title: '一盏暖灯', text: '避风点亮着一盏小灯。微弱的光落在石头上，让人想起家里的窗户。' },
  { id: '2-0', chapter: '太白山 · 风雪之上', title: '雪线', text: '雪把所有声音都收小了。只有呼吸、衣角和脚下的细响，提醒我还在这里。' },
  { id: '2-1', chapter: '太白山 · 风雪之上', title: '为归途留力气', text: '从前总想着能走多远。后来才明白，真正珍贵的是，有力气走回去。' },
  { id: '2-2', chapter: '太白山 · 风雪之上', title: '山脊来信', text: '如果你读到这封信，我大概已经回家。山那边的风很大，天很蓝。下次见面，慢慢讲给你听。' },
];

function platforms(spec) { return spec.map(([x, y, w], i) => ({ x, y, w, h: WORLD_HEIGHT + 220 - y, id: i })); }
const specs = [
  [[0,620,600],[690,600,300],[1090,550,300],[1480,590,380],[1950,540,270],[2310,500,320],[2730,560,340],[3160,510,290],[3540,560,320],[3960,510,460]],
  [[0,620,430],[520,570,260],[880,510,280],[1250,565,320],[1670,505,250],[2010,550,350],[2460,485,270],[2820,535,300],[3220,480,290],[3600,530,300],[4000,470,450]],
  [[0,620,430],[530,570,280],[910,525,280],[1290,580,340],[1730,520,290],[2110,470,300],[2510,525,310],[2910,470,300],[3300,520,300],[3700,465,300],[4080,510,320],[4490,460,460]],
];

export const LEVELS = [
  { title: '鳌山 · 高山草甸', english: 'THE MEADOW', weather: '晨光 · 微风', startLabel: '草甸起点', cold: 0.22, wind: 0, theme: 'meadow', intro: '第一程 / 让风告诉你方向', finish: '草甸在身后慢慢变小。前方的石海，正在云下等待。', platforms: platforms(specs[0]), camps: [3,6], notePlatforms: [1,4,8], rocks: [] },
  { title: '秦岭主梁 · 石海', english: 'THE STONE SEA', weather: '山雾 · 间歇落石', startLabel: '石海边缘', cold: 0.55, wind: 0, theme: 'stone', intro: '第二程 / 每一块石头，都记得冰川', finish: '你穿过了石海，也学会在云雾中停一停。下一程，风雪将至。', platforms: platforms(specs[1]), camps: [3,7], notePlatforms: [2,5,9], rocks: [{ x: 1810, phase: 1 },{ x: 3340, phase: 2.8 }] },
  { title: '太白山 · 风雪之上', english: 'THE SNOWLINE', weather: '飞雪 · 山脊阵风', startLabel: '太白雪线', cold: 1.05, wind: 80, theme: 'snow', intro: '第三程 / 穿过风雪，把来信带回家', finish: '信号穿过云层。山那边的人，终于听见了你的消息。', platforms: platforms(specs[2]), camps: [3,6,9], notePlatforms: [2,5,10], rocks: [] },
].map((level, index) => {
  const end = level.platforms.at(-1);
  return { ...level, index, width: end.x + end.w, goal: { x: end.x + end.w - 110, y: end.y }, camps: level.camps.map(i => ({ x: level.platforms[i].x + level.platforms[i].w * .55, y: level.platforms[i].y, id: i })), notes: level.notePlatforms.map((p,i) => ({ x: level.platforms[p].x + level.platforms[p].w * .52, y: level.platforms[p].y - 105, id: `${index}-${i}` })) };
});

export function createGame(levelIndex = 0, collected = []) {
  const level = LEVELS[Math.max(0,Math.min(2,levelIndex))];
  return { level, player: { x: 150, y: 620 - PLAYER_H, vx:0, vy:0, grounded:true, facing:1, warmth:100, stamina:100, invulnerable:0, coyote:.12, jumpBuffer:0 }, checkpoint: {x:150,y:620-PLAYER_H,id:-1}, collected:new Set(collected), elapsed:0, falls:0, ticks:0, wind:0, rocks:[], rockTimes:level.rocks.map(r => r.phase), status:'playing', events:[], prompt:null, travelled:150 };
}
function overlaps(a,b) { return a.x < b.x+b.w && a.x+PLAYER_W > b.x && a.y < b.y+b.h && a.y+PLAYER_H > b.y; }
export function respawn(state, reason = 'fall') {
  Object.assign(state.player, {x:state.checkpoint.x,y:state.checkpoint.y,vx:0,vy:0,grounded:false,invulnerable:1.8,coyote:0,jumpBuffer:0,warmth:80,stamina:100});
  state.falls++; state.rocks=[];
  state.events.push({type:'respawn',reason});
}

export function step(state, input, dt) {
  if (state.status !== 'playing') return;
  dt = Math.min(dt,1/30);
  const { player:p, level } = state;
  state.elapsed += dt; state.ticks++;
  p.invulnerable = Math.max(0,p.invulnerable-dt);
  if(input.respawn) { respawn(state,'restart'); return; }
  p.coyote = p.grounded ? .12 : Math.max(0,p.coyote-dt);
  p.jumpBuffer = input.jumpPressed ? .14 : Math.max(0,p.jumpBuffer-dt);
  const dir = Number(!!input.right)-Number(!!input.left);
  const sprint = input.sprint && p.stamina > 1 && dir !== 0;
  p.stamina = Math.max(0,Math.min(100,p.stamina + (sprint ? -24 : 17)*dt));
  const target = dir * (sprint ? PHYSICS.sprintSpeed : PHYSICS.walkSpeed);
  const acceleration = p.grounded ? 2300 : 1400;
  p.vx += Math.sign(target-p.vx)*Math.min(Math.abs(target-p.vx),acceleration*dt);
  if (dir) p.facing = dir;
  state.wind = level.wind * (.4 + .6*Math.sin(state.elapsed*.65)) * (p.grounded ? .35 : 1);
  if(p.jumpBuffer>0 && p.coyote>0) { p.vy=-PHYSICS.jumpSpeed; p.grounded=false; p.coyote=0; p.jumpBuffer=0; state.events.push({type:'jump'}); }
  if(!input.jumpHeld && p.vy < -240) p.vy = Math.min(-240,p.vy + 2200*dt);
  p.vy += PHYSICS.gravity*dt;
  p.x += (p.vx+state.wind)*dt;
  p.x = Math.max(12,Math.min(level.width-PLAYER_W-12,p.x));
  for(const plat of level.platforms) {
    if(overlaps(p,plat) && p.y + PLAYER_H > plat.y + 8) {
      if(p.vx + state.wind > 0) p.x = plat.x-PLAYER_W;
      else if(p.vx + state.wind < 0) p.x = plat.x+plat.w;
      p.vx = 0;
    }
  }
  const oldBottom = p.y+PLAYER_H;
  p.y += p.vy*dt;
  p.grounded=false;
  for(const plat of level.platforms) {
    if(p.x+PLAYER_W>plat.x && p.x<plat.x+plat.w && oldBottom<=plat.y+2 && p.y+PLAYER_H>=plat.y && p.vy>=0) {
      p.y=plat.y-PLAYER_H;p.vy=0;p.grounded=true;break;
    }
  }
  state.travelled=Math.max(state.travelled,p.x);
  const nearbyCamp=level.camps.find(c=>Math.abs(p.x+PLAYER_W/2-c.x)<83 && Math.abs(p.y+PLAYER_H-c.y)<15);
  const nearGoal=Math.abs(p.x+PLAYER_W/2-level.goal.x)<72 && Math.abs(p.y+PLAYER_H-level.goal.y)<15;
  state.prompt=nearGoal ? 'goal' : nearbyCamp ? 'camp' : null;
  p.warmth=Math.max(0,Math.min(100,p.warmth+(nearbyCamp?8:-level.cold)*dt));
  if(input.interact && nearbyCamp) {
    state.checkpoint={x:nearbyCamp.x-PLAYER_W/2,y:nearbyCamp.y-PLAYER_H,id:nearbyCamp.id};
    p.warmth=100;p.stamina=100;state.events.push({type:'camp'});
  }
  if(input.interact && nearGoal) { state.status='complete';state.events.push({type:'complete'}); }
  for(const note of level.notes) {
    if(!state.collected.has(note.id) && Math.abs(p.x+PLAYER_W/2-note.x)<31 && Math.abs(p.y+PLAYER_H/2-note.y)<47) {
      state.collected.add(note.id);state.events.push({type:'note',id:note.id});
    }
  }
  for(let i=0;i<level.rocks.length;i++) {
    state.rockTimes[i]-=dt;
    if(state.rockTimes[i]<=0) {
      const source=level.rocks[i];
      state.rocks.push({x:source.x+Math.sin(state.elapsed)*24,y:220,vy:0,r:13});
      state.rockTimes[i]=3.9;
    }
  }
  for(const rock of state.rocks) {
    rock.vy+=800*dt;rock.y+=rock.vy*dt;
    if(p.invulnerable===0 && Math.abs(p.x+PLAYER_W/2-rock.x)<PLAYER_W/2+rock.r && Math.abs(p.y+PLAYER_H/2-rock.y)<PLAYER_H/2+rock.r) {
      p.warmth=Math.max(0,p.warmth-22);p.invulnerable=1.5;p.vx=-p.facing*130;state.events.push({type:'hit'});
    }
    if(level.platforms.some(plat=>rock.x>plat.x && rock.x<plat.x+plat.w && rock.y>plat.y)) rock.y=1200;
  }
  state.rocks=state.rocks.filter(r=>r.y<1000);
  if(p.y>WORLD_HEIGHT+120) respawn(state,'fall');
  else if(p.warmth<=0) respawn(state,'cold');
}
