import {KitingGame, WORLD} from './engine.mjs';
import {MidNavigation,MAP_IMAGE} from './terrain.mjs';
export function segmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l)):0;return Math.hypot(px-ax-t*dx,py-ay-t*dy);}
// Movement is traced against the same official midlane image used by Kiting.
export class DodgeNavigation extends MidNavigation {
 contains(x,y,r=18){return super.contains(x,y,r);}
}
export const SPELLS={mystic:{caster:'ezreal',warning:.55,width:13,speed:510,life:2.2,damage:24},orb:{caster:'ahri',warning:.6,width:25,speed:360,life:3.6,damage:27},binding:{caster:'lux',warning:.7,width:20,speed:340,life:3.2,damage:28},laser:{caster:'lux',warning:1.25,width:48,life:.45,damage:36},hook:{caster:'blitz',warning:.75,width:22,speed:400,life:2.8,damage:30},zone:{caster:'lux',warning:1.4,width:110,life:.45,damage:26},fire:{caster:'ezreal',warning:.65,width:14,speed:380,life:3,damage:22},line:{caster:'lux',warning:1,width:62,life:.28,damage:28},
 // Vel'Koz : projectile qui se divise en deux à angle droit (Q), faille en ligne (W), zone au sol (E), rayon qui te suit (R).
 velkoz_q:{caster:'velkoz',behave:'split',warning:.45,width:14,speed:560,life:2.2,damage:26,color:'#c77dff'},
 velkoz_w:{caster:'velkoz',behave:'line',warning:.9,width:46,life:.3,damage:24,color:'#b46cff'},
 velkoz_e:{caster:'velkoz',behave:'zone',warning:.8,width:95,life:.35,damage:24,color:'#d7a6ff'},
 velkoz_r:{caster:'velkoz',behave:'ray',warning:.5,width:30,life:2.4,damage:40,color:'#e85cff'},
 // Brand : boule de feu (Q), pilier de flammes (W).
 brand_q:{caster:'brand',behave:'mystic',warning:.45,width:16,speed:640,life:1.8,damage:24,color:'#ff7a2e'},
 brand_w:{caster:'brand',behave:'zone',warning:.63,width:105,life:.35,damage:30,color:'#ffb02e'},
 // Veigar : frappe (Q), matière noire très large (W), cage à ne pas traverser (E).
 veigar_q:{caster:'veigar',behave:'mystic',warning:.45,width:18,speed:520,life:2,damage:24,color:'#9b6bff'},
 veigar_w:{caster:'veigar',behave:'zone',warning:1.25,width:110,life:.35,damage:34,color:'#7d5cff'},
 veigar_e:{caster:'veigar',behave:'cage',warning:.5,width:150,life:3,damage:30,color:'#b58cff'}};
// Formes de sort : projectile (mystic/fire/binding), orbe aller-retour (orb), grappin (hook), laser, ligne, zone.
export const BEHAVES=['mystic','orb','hook','laser','line','zone','split','ray','cage'];
export const CASTER_SPELLS={ezreal:['mystic'],ahri:['orb'],lux:['binding','zone','laser'],blitz:['hook'],velkoz:['velkoz_q','velkoz_w','velkoz_e','velkoz_r'],brand:['brand_q','brand_w'],veigar:['veigar_q','veigar_w','veigar_e']};
export function registerSpell(id,spec){SPELLS[id]={caster:'lux',warning:.8,width:20,speed:380,life:2.5,damage:25,...spec,behave:BEHAVES.includes(spec.behave)?spec.behave:'mystic'};}
const behave=h=>h.behave||h.type;
export class DodgeGame extends KitingGame{
 constructor(config={}){
  super({...config,terrain:'mid-riot-3d',mode:'dummy',enemies:1});this.config.mode='dodge';this.config.speed=370;this.nav=new DodgeNavigation();const start=this.nav.project(470*MAP_IMAGE.scale,390*MAP_IMAGE.scale);this.player.x=start.x;this.player.y=start.y;this.goal={...start};this.enemies=[];
  this.hazards=Array.from({length:64},()=>({active:false,type:'mystic',x:0,y:0,dx:0,dy:0,age:0,warning:0,life:0,width:0,hit:false}));
  this.casters=[];this.spawnClock=1.1;
  // Scénario d'un niveau (menu admin) : chaque sort part à son heure, de l'endroit choisi, dans la direction choisie.
  this.script=Array.isArray(this.config.script)?this.config.script.filter(e=>SPELLS[e.s]).slice().sort((a,b)=>a.t-b.t):null;if(this.script&&!this.script.length)this.script=null;this.scriptI=0;this.scriptBase=0;
  if(this.config.start&&Number.isFinite(this.config.start.x)){const s=this.nav.project(this.config.start.x,this.config.start.y);this.player.x=s.x;this.player.y=s.y;this.goal={...s};}
  this.flashCooldown=0;this.flashEffect=0;this.flashFrom={x:this.player.x,y:this.player.y};this.lastHit=-10;this.facing=0;
  this.stats.dodged=0;this.stats.impacts=0;this.stats.spawned=0;this.stats.flashes=0;
 }
 attack(){} focus(){}
 flash(x=this.aim.x,y=this.aim.y){
  if(this.phase!=='running'||this.paused||this.flashCooldown>0||this.config.noFlash)return false;
  let dx=x-this.player.x,dy=y-this.player.y,d=Math.hypot(dx,dy);if(d<1)return false;
  this.flashFrom={x:this.player.x,y:this.player.y};let length=Math.min(230,d),p;
  while(length>=5){p={x:this.player.x+dx/d*length,y:this.player.y+dy/d*length};if(this.nav.contains(p.x,p.y,this.player.radius))break;length-=5;}
  if(length<5)return false;
  this.player.x=p.x;this.player.y=p.y;this.goal={...p};this.flashCooldown=15;this.flashEffect=.35;this.stats.flashes++;this.events.push('flash');return true;
 }
 // Sort placé par l'admin : origine (x, y), vers un point fixe (ax, ay) ou vers le joueur (aim « player »).
 castScripted(e){
  const p=this.player,origin={x:Math.max(0,Math.min(WORLD.w,e.x)),y:Math.max(0,Math.min(WORLD.h,e.y))};
  const target=e.aim==='player'?{x:p.x,y:p.y}:{x:e.ax,y:e.ay};
  return this.launch(e.s,e.c,origin,target,true);
 }
 launch(type,casterKind,origin,target,scripted){
  const h=this.hazards.find(x=>!x.active);if(!h)return null;const spec=SPELLS[type]||SPELLS.mystic,sp=(this.config.speedPct||100)/100,warn=spec.warning/Math.sqrt(sp);
  const d=Math.hypot(target.x-origin.x,target.y-origin.y)||1,dx=(target.x-origin.x)/d,dy=(target.y-origin.y)/d;
  const caster={id:this.stats.spawned,kind:casterKind||spec.caster,x:origin.x,y:origin.y,angle:Math.atan2(dx,dy),age:0,life:warn+spec.life+.55,warning:warn};
  this.casters.push(caster);
  const b=spec.behave||type,zone=b==='zone'||b==='cage',beam=b==='laser'||b==='line'||b==='ray';
  // Un laser placé part du lanceur (le trait couvre 950 derrière le point de référence et 1250 devant).
  const bx=scripted&&beam?origin.x+dx*950:origin.x,by=scripted&&beam?origin.y+dy*950:origin.y;
  Object.assign(h,{color:null,...spec,behave:b,warning:warn,active:true,type,age:0,hit:false,returning:false,outHit:false,casterId:caster.id,x:zone?target.x:bx,y:zone?target.y:by,originX:origin.x,originY:origin.y,targetX:target.x,targetY:target.y,dx,dy,distance:0});
  this.stats.spawned++;return h;
 }
 spawnHazard(type,casterKind){
  const h=this.hazards.find(x=>!x.active);if(!h)return null;const spec=SPELLS[type]||SPELLS.mystic,p=this.player,sp=(this.config.speedPct||100)/100,warn=spec.warning/Math.sqrt(sp);
  const angle=this.random()*Math.PI*2,distance=420+this.random()*130;
  let origin=this.nav.project(p.x+Math.cos(angle)*distance,p.y+Math.sin(angle)*distance);
  if(Math.hypot(origin.x-p.x,origin.y-p.y)<240){const choices=[];for(let i=0;i<this.nav.walk.length;i++)if(this.nav.walk[i]){const x=(i%this.nav.cols+.5)*this.nav.cell,y=(Math.floor(i/this.nav.cols)+.5)*this.nav.cell,d=Math.hypot(x-p.x,y-p.y);if(d>300&&d<650)choices.push({x,y});}if(choices.length)origin=choices[Math.floor(this.random()*choices.length)];}
  const d=Math.hypot(p.x-origin.x,p.y-origin.y)||1,dx=(p.x-origin.x)/d,dy=(p.y-origin.y)/d;
  const caster={id:this.stats.spawned,kind:casterKind||spec.caster,x:origin.x,y:origin.y,angle:Math.atan2(dx,dy),age:0,life:warn+spec.life+.55,warning:warn};
  this.casters.push(caster);
  const zone=['zone','cage'].includes(spec.behave||type);Object.assign(h,{color:null,...spec,behave:spec.behave||type,warning:warn,active:true,type,age:0,hit:false,returning:false,outHit:false,casterId:caster.id,x:zone?p.x:origin.x,y:zone?p.y:origin.y,originX:origin.x,originY:origin.y,targetX:p.x,targetY:p.y,dx,dy,distance:0});
  this.stats.spawned++;return h;
 }
 finishHazard(h){if(!h.hit)this.stats.dodged++;h.active=false;}
 hitHazard(h){if(h.hit)return;h.hit=true;const damage=h.damage||25;this.player.hp=Math.max(0,this.player.hp-damage);this.stats.taken+=damage;this.stats.impacts++;this.lastHit=this.time;this.effect(this.player.x,this.player.y,3);this.events.push('hurt');}
 step(dt=1/120){
  if(this.paused||this.phase!=='running')return;dt=Math.max(0,Math.min(.05,dt));const oldX=this.player.x,oldY=this.player.y;super.step(dt);if(this.phase!=='running')return;
  if(this.moving)this.facing=Math.atan2(this.player.x-oldX,this.player.y-oldY);
  this.flashCooldown=Math.max(0,this.flashCooldown-dt);this.flashEffect=Math.max(0,this.flashEffect-dt);
  for(const c of this.casters)c.age+=dt;this.casters=this.casters.filter(c=>c.age<c.life);
  if(this.script){const T=this.time-this.scriptBase;while(this.scriptI<this.script.length&&this.script[this.scriptI].t<=T)this.castScripted(this.script[this.scriptI++]);
   const loop=Number(this.config.scriptLoop)||0;if(loop>0&&this.scriptI>=this.script.length&&T>=loop){this.scriptBase+=loop;this.scriptI=0;}}
  if(!this.script||this.config.scriptRandom)this.spawnClock-=dt;if(this.spawnClock<=0){const cx=(this.config.complexityPct||100)/100,pool=this.config.pool;if(pool&&pool.length){const n=1+(this.random()<Math.max(0,cx-1)/2?1:0)+(this.random()<Math.max(0,cx-2)/2?1:0);for(let i=0;i<n;i++){const e=pool[Math.floor(this.random()*pool.length)];this.spawnHazard(e.spell,e.caster);}}else{const def=['mystic','binding','orb','velkoz_q','laser','brand_q','hook','veigar_e','zone','velkoz_r','brand_w','veigar_q','velkoz_w','veigar_w','velkoz_e'];this.spawnHazard(def[this.stats.spawned%def.length]);}this.spawnClock=Math.max(.65/cx,(2.2-this.config.difficulty*.35-this.time*.008)/cx);}
  const p=this.player;
  for(const h of this.hazards){
   if(!h.active)continue;h.age+=dt;if(h.age<h.warning)continue;
   const t=h.age-h.warning;
   const b=behave(h);
   if(b==='ray'){
    // Le rayon pivote vers toi (0,9 rad/s au plus) : il faut sortir de sa course, pas juste reculer.
    const ox=h.originX,oy=h.originY,want=Math.atan2(p.y-oy,p.x-ox),cur=Math.atan2(h.dy,h.dx);let da=want-cur;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
    const a=cur+Math.max(-.9*dt,Math.min(.9*dt,da));h.dx=Math.cos(a);h.dy=Math.sin(a);h.x=ox+h.dx*950;h.y=oy+h.dy*950;
   }
   if(b==='cage'){
    // Cage : l'anneau blesse quand tu es sur son bord (en entrant ou en sortant).
    if(Math.abs(Math.hypot(p.x-h.x,p.y-h.y)-h.width)<p.radius+10)this.hitHazard(h);
   }else if(b==='laser'||b==='line'||b==='ray'){
    if(segmentDistance(p.x,p.y,h.x-h.dx*950,h.y-h.dy*950,h.x+h.dx*1250,h.y+h.dy*1250)<p.radius+h.width/2)this.hitHazard(h);
   }else if(b==='zone'){
    if(Math.hypot(p.x-h.x,p.y-h.y)<h.width+p.radius)this.hitHazard(h);
   }else{
    const ox=h.x,oy=h.y;let dx=h.dx,dy=h.dy;
    if((b==='orb'||b==='hook')&&h.distance>510)h.returning=true;
    if(h.returning){const d=Math.hypot(h.originX-h.x,h.originY-h.y)||1;dx=(h.originX-h.x)/d;dy=(h.originY-h.y)/d;if(d<20){this.finishHazard(h);continue;}}
    const speed=(h.speed||380)*(1+(this.config.difficulty-1)*.15)*((this.config.speedPct||100)/100);h.x+=dx*speed*dt;h.y+=dy*speed*dt;h.distance+=speed*dt;
    if(segmentDistance(p.x,p.y,ox,oy,h.x,h.y)<p.radius+h.width){this.hitHazard(h);if(!['orb','hook'].includes(b)){this.finishHazard(h);continue;}}
    // Projectile qui se divise : au bout de sa course, deux éclats partent à angle droit.
    if(b==='split'&&h.distance>=(h.splitAt||380)){for(const sg of [1,-1]){const c=this.hazards.find(x=>!x.active);if(!c)break;Object.assign(c,{...h,behave:'mystic',active:true,age:h.warning,hit:false,returning:false,distance:0,dx:-h.dy*sg,dy:h.dx*sg,life:.9,splitAt:0,child:true});}this.finishHazard(h);continue;}
    if(h.x<0||h.y<0||h.x>WORLD.w||h.y>WORLD.h){this.finishHazard(h);continue;}
   }
   if(t>h.life)this.finishHazard(h);
  }
  if(p.hp<=0)this.phase='dead';
 }
}
