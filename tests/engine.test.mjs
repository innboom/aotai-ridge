import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, LEVELS, PLAYER_H, PLAYER_W } from '../public/engine.mjs';

const dt=1/120;
function advance(s,input,n){for(let i=0;i<n;i++)step(s,input,dt);}

test('ground collision, buffered jump and early release',()=>{
  const s=createGame();advance(s,{},120);
  assert.equal(s.player.y,620-PLAYER_H);
  step(s,{jumpPressed:true,jumpHeld:true},dt);
  assert.ok(s.player.vy<0);assert.equal(s.player.grounded,false);
  advance(s,{jumpHeld:true},20);const high=s.player.y;
  advance(s,{},120);assert.equal(s.player.grounded,true);assert.equal(s.player.y,620-PLAYER_H);assert.ok(high<520);
});

test('camp saves checkpoint; falls restore player without losing notes',()=>{
  const s=createGame(1);const c=s.level.camps[0];
  Object.assign(s.player,{x:c.x-12,y:c.y-PLAYER_H,warmth:24});
  step(s,{interact:true},dt);assert.equal(s.checkpoint.id,c.id);assert.equal(s.player.warmth,100);
  s.collected.add('1-0');s.player.y=1200;
  step(s,{},dt);assert.equal(s.player.x,c.x-12);assert.equal(s.falls,1);assert.ok(s.collected.has('1-0'));assert.equal(s.player.warmth,80);
});

test('notes collected once and terminal interaction completes level',()=>{
  const s=createGame();const n=s.level.notes[0];
  Object.assign(s.player,{x:n.x-12,y:n.y-24,grounded:false});
  step(s,{},dt);step(s,{},dt);assert.equal(s.events.filter(e=>e.type==='note').length,1);
  Object.assign(s.player,{x:s.level.goal.x-12,y:s.level.goal.y-PLAYER_H,vy:0});
  step(s,{interact:true},dt);assert.equal(s.status,'complete');
  const elapsed=s.elapsed;step(s,{},dt);assert.equal(s.elapsed,elapsed);
});

test('cold recovers at checkpoint and stamina remains bounded',()=>{
  const s=createGame(2);s.player.warmth=.001;step(s,{},dt);assert.equal(s.falls,1);assert.equal(s.player.warmth,80);
  advance(s,{right:true,sprint:true},1000);assert.ok(s.player.stamina>=0&&s.player.stamina<=100);
});

for(const level of LEVELS)test(`chapter ${level.index+1}: every consecutive platform is reachable with a normal jump`,()=>{
  for(let i=0;i<level.platforms.length-1;i++){
    const a=level.platforms[i],b=level.platforms[i+1];let reachable=false;
    for(const lead of [35,20,8]){
      const s=createGame(level.index);
      // Check the least favorable wind direction as well as ordinary movement.
      Object.assign(s.player,{x:a.x+a.w-PLAYER_W-lead,y:a.y-PLAYER_H,vx:285,grounded:true});
      step(s,{right:true,jumpPressed:true,jumpHeld:true},dt);
      for(let frame=0;frame<180;frame++){
        step(s,{right:true,jumpHeld:true},dt);
        if(s.player.grounded&&s.player.x+PLAYER_W>b.x&&s.player.x<b.x+b.w&&Math.abs(s.player.y+PLAYER_H-b.y)<1){reachable=true;break;}
        if(s.falls>0)break;
      }
      if(reachable)break;
    }
    assert.ok(reachable,`unreachable gap ${i} to ${i+1}`);
  }
});
