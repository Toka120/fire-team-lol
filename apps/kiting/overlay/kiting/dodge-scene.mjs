import * as THREE from './vendor/three.module.mjs';
import {WORLD} from './engine.mjs';
const S=.02,COS=29/Math.hypot(29,24),wx=x=>(x-800)*S,wz=y=>(y-667)*S/COS;
const worldAngle=angle=>Math.atan2(Math.sin(angle),Math.cos(angle)/COS);
const mat=(color,extra={})=>new THREE.MeshLambertMaterial({color,flatShading:true,...extra});
const G={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.SphereGeometry(1,10,7),stone:new THREE.DodecahedronGeometry(1,0),cone:new THREE.ConeGeometry(1,1,7),cylinder:new THREE.CylinderGeometry(1,1,1,10)};
function mesh(parent,geometry,material,x,y,z,sx=1,sy=sx,sz=sx){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function ring(parent,color,radius,width=.035){const m=new THREE.Mesh(new THREE.RingGeometry(radius-width,radius+width,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.035;parent.add(m);return m;}
function label(text,color='#e7f0ff'){
 const c=document.createElement('canvas');c.width=256;c.height=64;const a=c.getContext('2d');a.font='600 24px Segoe UI';a.textAlign='center';a.fillStyle='#101919d9';a.fillRect(13,20,230,37);a.fillStyle=color;a.fillText(text,128,47);
 const texture=new THREE.CanvasTexture(c),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.scale.set(2.3,.575,1);sprite.position.y=2.8;return sprite;
}
function health(parent,color=0x77e24e){const group=new THREE.Group();parent.add(group);const bg=mesh(group,G.box,new THREE.MeshBasicMaterial({color:0x101417}),0,0,0,1.2,.12,.025);const bar=mesh(group,G.box,new THREE.MeshBasicMaterial({color}),0,0,.018,1.13,.075,.025);group.position.y=2.35;return{group,bar,bg};}
// Personnages ajoutés par l'équipe (menu admin) : silhouette reconstruite à partir de formes simples, comme les autres.
export const CUSTOM_CHARACTERS={};
export function registerCharacter(id,def){CUSTOM_CHARACTERS[id]=def;}
// Lanceurs ajoutés : silhouettes génériques (formes simples et couleurs propres), avec le nom et les sorts du champion.
CUSTOM_CHARACTERS.velkoz={name:"Vel'Koz",tag:'Q / W / E / R',colors:{skin:'#6a4c8c',outfit:'#3a2452',hair:'#2a1838',accent:'#c77dff',glow:'#e85cff'},style:{hair:'none',robe:true,weapon:'orb',size:115}};
CUSTOM_CHARACTERS.brand={name:'Brand',tag:'Q / W',colors:{skin:'#7a3a1a',outfit:'#4a2212',hair:'#ff8a2a',accent:'#ffb02e',glow:'#ff6a1a'},style:{hair:'short',weapon:'gauntlet',bulky:false,size:105}};
CUSTOM_CHARACTERS.veigar={name:'Veigar',tag:'Q / W / E',colors:{skin:'#5a4a7a',outfit:'#2c2550',hair:'#1c1636',accent:'#9b6bff',glow:'#b58cff'},style:{hair:'none',robe:true,cape:true,weapon:'staff',size:75}};
const hex=(v,d)=>{const n=parseInt(String(v||'').replace('#',''),16);return Number.isFinite(n)?n:d;};
function customCharacter(d){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const c=d.colors||{},skin=mat(hex(c.skin,0xd7a67d)),outfit=mat(hex(c.outfit,0x3d4f7a)),hairM=mat(hex(c.hair,0x2a2230)),accent=mat(hex(c.accent,0xe8ba4d)),
  glow=new THREE.MeshBasicMaterial({color:hex(c.glow,0x8fe9ff)}),dark=mat(0x202c37),boots=mat(0x16202a),st=d.style||{},bulky=!!st.bulky;
 const legs=[];for(const side of [-1,1]){const limb=new THREE.Group();limb.position.set(side*(bulky?.26:.19),.73,0);body.add(limb);mesh(limb,G.cylinder,dark,0,-.27,0,bulky?.18:.13,.56,bulky?.19:.14);mesh(limb,G.box,boots,0,-.56,.08,bulky?.3:.24,.17,.4);legs.push(limb);}
 const torso=mesh(body,G.cylinder,outfit,0,1.12,0,bulky?.58:.4,.77,bulky?.44:.29);
 if(st.robe)mesh(body,G.cone,outfit,0,.77,0,.48,.9,.4);
 const head=mesh(body,G.ball,skin,0,1.77,0,.245,.28,.23);
 if(st.hair!=='none'){mesh(body,G.ball,hairM,0,1.98,-.035,.28,.14,.26);for(let i=0;i<6;i++){const lock=mesh(body,G.cone,hairM,-.23+i*.086,1.93,.13,.1,.31,.11);lock.rotation.x=.5;lock.rotation.z=(i-2.5)*-.15;}
  if(st.hair==='long')mesh(body,G.ball,hairM,0,1.62,-.2,.29,.52,.16);}
 if(st.ears)for(const side of [-1,1]){const ear=mesh(body,G.cone,hairM,side*.17,2.14,0,.13,.31,.11);ear.rotation.z=side*-.25;}
 if(st.horns)for(const side of [-1,1]){const horn=mesh(body,G.cone,accent,side*.2,2.12,.02,.08,.38,.08);horn.rotation.z=side*-.55;}
 const tails=Math.max(0,Math.min(9,Number(st.tails)||0));for(let i=0;i<tails;i++){const tail=new THREE.Group();tail.position.set(0,.72,-.22);tail.rotation.y=(i-(tails-1)/2)*.24;tail.rotation.x=.65+Math.abs(i-(tails-1)/2)*.06;body.add(tail);mesh(tail,G.ball,hairM,0,.08,-.55,.17,.2,.65);mesh(tail,G.cone,accent,0,.08,-1.08,.18,.42,.18).rotation.x=-Math.PI/2;}
 if(st.cape){const cape=mesh(body,G.box,mat(hex(c.accent,0x8d2138)),0,1.05,-.32,.62,1.05,.04);cape.rotation.x=.12;}
 mesh(body,G.box,accent,0,1.18,.3,.19,.4,.035);
 const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*(bulky?.62:.42),1.4,0);body.add(arm);mesh(arm,G.cylinder,outfit,0,-.22,0,bulky?.22:.12,.45,.14);mesh(arm,G.ball,skin,0,-.46,0,bulky?.26:.12,.16,.14);
  if(side===1){const w=st.weapon;
   if(w==='staff'){mesh(arm,G.cylinder,accent,0,-.2,.18,.035,2.0,.035);mesh(arm,G.ball,glow,0,.85,.18,.16,.23,.16);}
   if(w==='sword'){const blade=mesh(arm,G.box,mat(0xd8e0e9),0,-.55,.45,.07,.07,1.0);blade.rotation.x=.2;mesh(arm,G.box,accent,0,-.5,.0,.22,.07,.07);}
   if(w==='bow'){const bow=mesh(arm,G.cylinder,accent,0,-.45,.25,.04,1.3,.04);bow.rotation.x=.1;}
   if(w==='gauntlet'){mesh(arm,G.box,accent,0,-.4,.07,.3,.28,.26);mesh(arm,G.ball,glow,0,-.38,.22,.1,.1,.04);}
   if(w==='orb')mesh(arm,G.ball,glow,0,-.5,.3,.18,.18,.18);}
  arms.push(arm);}
 const size=Math.max(.7,Math.min(1.6,(Number(st.size)||100)/100));body.scale.setScalar(size);
 const hp=health(root,0xdb5252);hp.group.position.y=2.35*size;
 const l=label(String(d.name||'Personnage').slice(0,22)+(d.tag?' · '+String(d.tag).slice(0,12):''));l.position.y=2.8*size;root.add(l);
 return{root,body,legs,arms,hp,animate(time,moving,casting){const stride=moving?Math.sin(time*12)*.72:Math.sin(time*2)*.025;legs[0].rotation.x=stride;legs[1].rotation.x=-stride;arms[0].rotation.x=casting?-.7:-stride*.65;arms[1].rotation.x=casting?-1.35:stride*.65;body.position.y=moving?Math.abs(Math.sin(time*12))*.04:Math.sin(time*2)*.018;}};
}
function character(kind='ezreal',player=false){
 if(CUSTOM_CHARACTERS[kind])return customCharacter(CUSTOM_CHARACTERS[kind]);
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const skin=mat(kind==='blitz'?0xc69737:0xd7a67d),dark=mat(0x202c37),boots=mat(0x16202a),brown=mat(0x63462d),gold=mat(0xe8ba4d),white=mat(0xd8e0e9),red=mat(0x8d2138),blue=mat(0x344a71),hair=mat(kind==='ahri'?0x171d32:0xe7bb4d),glow=new THREE.MeshBasicMaterial({color:0x6be8ff});
 const legs=[];for(const side of [-1,1]){const limb=new THREE.Group();limb.position.set(side*.19,.73,0);body.add(limb);mesh(limb,G.cylinder,dark,0,-.27,0,.13,.56,.14);mesh(limb,G.box,boots,0,-.56,.08,.24,.17,.4);legs.push(limb);}
 const torso=mesh(body,G.cylinder,kind==='ahri'?red:kind==='lux'?white:kind==='blitz'?gold:brown,0,1.12,0,.4,.77,.29);
 const head=mesh(body,G.ball,skin,0,1.77,0,.245,.28,.23);
 if(kind==='blitz'){
  torso.scale.set(.63,.9,.47);head.scale.set(.3,.24,.26);head.position.y=1.8;
  mesh(body,G.cylinder,dark,0,1.12,.42,.28,.3,.09).rotation.x=Math.PI/2;
  mesh(body,G.ball,glow,0,1.17,.49,.16,.16,.08);
  for(const side of [-1,1]){mesh(body,G.cylinder,gold,side*.45,1.88,-.15,.1,.45,.1);mesh(body,G.ball,glow,side*.11,1.85,.245,.06,.06,.03);}
 }else{
  mesh(body,G.ball,hair,0,1.98,-.035,.28,.14,.26);
  for(let i=0;i<6;i++){const lock=mesh(body,G.cone,hair,-.23+i*.086,1.93,.13,.1,.31,.11);lock.rotation.x=.5;lock.rotation.z=(i-2.5)*-.15;}
  if(kind==='ahri'){
   mesh(body,G.ball,hair,0,1.69,-.2,.29,.49,.16);
   for(const side of [-1,1]){const ear=mesh(body,G.cone,hair,side*.17,2.14,0,.13,.31,.11);ear.rotation.z=side*-.25;}
   for(let i=0;i<9;i++){const tail=new THREE.Group();tail.position.set(0,.72,-.22);tail.rotation.y=(i-4)*.24;tail.rotation.x=.65+Math.abs(i-4)*.06;body.add(tail);mesh(tail,G.ball,white,0,.08,-.55,.17,.2,.65);mesh(tail,G.cone,white,0,.08,-1.08,.18,.42,.18).rotation.x=-Math.PI/2;}
  }
  if(kind==='lux'){
   mesh(body,G.cone,white,0,.77,0,.46,.9,.38);
   mesh(body,G.box,blue,0,1.18,.3,.19,.52,.035);
   mesh(body,G.cylinder,gold,.65,1.28,.15,.035,2.0,.035);mesh(body,G.ball,glow,.65,2.35,.15,.16,.23,.16);
  }
  if(kind==='ezreal'){
   mesh(body,G.box,blue,0,1.03,.3,.48,.4,.025);
   for(const side of [-1,1])mesh(body,G.box,gold,side*.14,1.9,.23,.19,.09,.09);
   const scarf=mesh(body,G.box,mat(0xb39b64),.14,1.47,-.3,.32,.12,.48);scarf.rotation.x=.2;
  }
 }
 const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*(kind==='blitz'?.62:.42),1.4,0);body.add(arm);mesh(arm,G.cylinder,kind==='blitz'?gold:kind==='ahri'?white:brown,0,-.22,0,kind==='blitz'?.23:.12,.45,.14);mesh(arm,G.ball,skin,0,-.46,0,kind==='blitz'?.29:.12,.16,.14);if(kind==='ezreal'&&side===-1){mesh(arm,G.box,gold,0,-.36,.07,.24,.23,.22);mesh(arm,G.ball,glow,0,-.34,.2,.1,.1,.04);}arms.push(arm);}
 if(player)ring(root,0x63e3af,.48,.025);const hp=health(root,player?0x75df42:0xdb5252);
 if(!player)root.add(label({ezreal:'Ezreal · Q',ahri:'Ahri · Q',lux:'Lux · Q / E / R',blitz:'Blitzcrank · Q'}[kind]));
 return{root,body,legs,arms,hp,animate(time,moving,casting){const stride=moving?Math.sin(time*12)*.72:Math.sin(time*2)*.025;legs[0].rotation.x=stride;legs[1].rotation.x=-stride;arms[0].rotation.x=casting?-1.35:-stride*.65;arms[1].rotation.x=casting?-.7:stride*.65;body.position.y=moving?Math.abs(Math.sin(time*12))*.04:Math.sin(time*2)*.018;}};
}
function pavement(){
 const c=document.createElement('canvas');c.width=c.height=1024;const a=c.getContext('2d');a.fillStyle='#4a5441';a.fillRect(0,0,1024,1024);let seed=123;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let row=0;row<32;row++)for(let col=-1;col<32;col++){
  const x=col*34+(row%2)*17,y=row*34,t=80+Math.floor(random()*35);a.fillStyle=`rgb(${t+9},${t+15},${t+2})`;a.fillRect(x+1,y+1,32,32);a.strokeStyle='#b3b49a40';a.beginPath();a.moveTo(x+2,y+31);a.lineTo(x+2,y+2);a.lineTo(x+31,y+2);a.stroke();a.strokeStyle='#28352b65';a.beginPath();a.moveTo(x+33,y+2);a.lineTo(x+33,y+33);a.lineTo(x+2,y+33);a.stroke();
  if(random()<.19){a.fillStyle='#677b3d55';a.fillRect(x+random()*20,y+random()*20,18,8);}
 }
 for(let i=0;i<5000;i++){a.fillStyle=i%2?'#263b2010':'#c5c3a00d';a.fillRect(random()*1024,random()*1024,random()*8,random()*8);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);t.anisotropy=4;return t;
}
export class DodgeScene{
 constructor(container){
  this.canvas=document.createElement('canvas');this.canvas.id='arena3d';this.canvas.setAttribute('aria-hidden','true');container.append(this.canvas);
  this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x354535);this.scene.fog=new THREE.Fog(0x344333,38,72);
  this.camera=new THREE.OrthographicCamera(-15,15,10,-10,.1,130);this.target=new THREE.Vector3(0,0,0);this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);this.intersection=new THREE.Vector3();
  this.scene.add(new THREE.HemisphereLight(0xdcecff,0x526137,2.0));const sun=new THREE.DirectionalLight(0xffedc8,2.15);sun.position.set(-10,22,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-21,right:21,top:21,bottom:-21,near:1,far:65});sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;sun.shadow.camera.updateProjectionMatrix();this.scene.add(sun);
  this.buildArena();this.player=character('ezreal',true);this.scene.add(this.player.root);this.actors=new Map();this.spellMeshes=new Map();this.spellPool=[];this.visualFx=[];
  for(let i=0;i<64;i++){const group=new THREE.Group();this.scene.add(group);group.visible=false;const line=mesh(group,G.box,new THREE.MeshBasicMaterial({color:0xff3c24,transparent:true,opacity:.6,depthWrite:false}),0,.04,0,1,.025,.02);const core=mesh(group,G.ball,new THREE.MeshBasicMaterial({color:0xb8f9ff}),0,.55,0,.23);const glow=mesh(group,G.ball,new THREE.MeshBasicMaterial({color:0x4cbfe9,transparent:true,opacity:.3,depthWrite:false}),0,.55,0,.4);const circle=ring(group,0x86aaff,1,.025);this.spellPool.push({group,line,core,glow,circle});}
  this.goalRing=ring(this.scene,0x8df148,.22,.035);this.flashRing=ring(this.scene,0xffe692,.8,.06);this.flashRing.visible=false;this.contextLost=false;this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;});
 }
 buildArena(){
  this.mapReady=false;this.barriers=[];
  const texture=new THREE.TextureLoader().load(new URL('./mid-riot.png',document.baseURI).href,()=>{this.mapReady=true;},undefined,()=>{this.mapError='Impossible de charger le visuel de la midlane.';});
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
  // Compensate the camera tilt so the official screenshot keeps its original
  // proportions; world coordinates and the navigation trace remain registered.
  const geometry=new THREE.PlaneGeometry(WORLD.w*S,WORLD.h*S/COS);
  const ground=mesh(this.scene,geometry,new THREE.MeshBasicMaterial({map:texture,fog:false}),0,0,0);
  ground.rotation.x=-Math.PI/2;ground.castShadow=false;ground.receiveShadow=false;
  const shadow=mesh(this.scene,geometry,new THREE.ShadowMaterial({opacity:.22}),0,.008,0);
  shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=true;
 }
 point(clientX,clientY){const r=this.canvas.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),this.camera);if(this.ray.ray.intersectPlane(this.plane,this.intersection))return{x:this.intersection.x/S+800,y:this.intersection.z/S+667};return{x:800,y:667};}
 resize(width,height,zoom=150){this.renderer.setSize(width,height,false);const span=30*100/zoom,aspect=width/height;this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;this.camera.top=span/2;this.camera.bottom=-span/2;this.camera.updateProjectionMatrix();}
 render(game,width,height,zoom){
  if(this.contextLost)throw new Error('WebGL context lost');if(this.mapError)throw new Error(this.mapError);
  if(this.width!==width||this.height!==height||this.zoom!==zoom){this.width=width;this.height=height;this.zoom=zoom;this.resize(width,height,zoom);}
  const p=game.player,t=game.time;const halfH=(this.camera.top-this.camera.bottom)/S/2,halfW=(this.camera.right-this.camera.left)/S/2;const centerX=halfW>=WORLD.w/2?800:Math.max(halfW,Math.min(WORLD.w-halfW,p.x));const centerY=halfH>=WORLD.h/2?667:Math.max(halfH,Math.min(WORLD.h-halfH,p.y));this.target.lerp(new THREE.Vector3(wx(centerX),0,wz(centerY)),.08);this.camera.position.copy(this.target).add(new THREE.Vector3(0,29,24));this.camera.lookAt(this.target);this.camera.updateMatrixWorld();
  this.player.root.position.set(wx(p.x),0,wz(p.y));this.player.body.rotation.y=worldAngle(game.facing);this.player.animate(t,game.moving,false);this.player.hp.group.quaternion.copy(this.camera.quaternion);this.player.hp.bar.scale.x=1.13*p.hp/p.maxHp;
  const liveIds=new Set();for(const c of game.casters){liveIds.add(c.id);let actor=this.actors.get(c.id);if(!actor){actor=character(c.kind);this.scene.add(actor.root);this.actors.set(c.id,actor);}actor.root.position.set(wx(c.x),0,wz(c.y));actor.body.rotation.y=worldAngle(c.angle);actor.animate(t,false,c.age<c.warning);const enter=Math.min(1,c.age/.2),leave=Math.min(1,(c.life-c.age)/.3);actor.root.scale.setScalar(Math.max(.01,Math.min(enter,leave)));actor.hp.group.quaternion.copy(this.camera.quaternion);}
  for(const[id,actor]of this.actors)if(!liveIds.has(id)){this.scene.remove(actor.root);const materials=new Set();actor.root.traverse(o=>{if(o.material)materials.add(o.material);if(o.geometry?.type==='RingGeometry')o.geometry.dispose();});for(const m of materials){m.map?.dispose();m.dispose();}this.actors.delete(id);}
  for(let i=0;i<64;i++){
   const h=game.hazards[i],v=this.spellPool[i];v.group.visible=h.active;if(!h.active)continue;
   const b=h.behave||h.type,warning=h.age<h.warning,beam=b==='laser'||b==='line'||b==='ray',zone=b==='zone'||b==='cage',custom=h.color?hex(h.color,0x80e4ff):null,color=custom??(b==='hook'?0xe9ae38:b==='orb'?0x619eff:h.type==='binding'?0xd6aaff:0x80e4ff);
   v.group.position.set(wx(h.x),0,wz(h.y));v.group.rotation.y=0;v.line.rotation.set(0,0,0);v.line.visible=beam||warning||b==='hook';v.circle.visible=zone;v.core.visible=!warning&&!beam&&!zone;v.glow.visible=v.core.visible;
   if(beam){const stretch=Math.hypot(h.dx,h.dy/COS);v.group.rotation.y=Math.atan2(h.dx,h.dy/COS);v.line.position.set(0,warning?.05:.7,3*stretch);v.line.scale.set(warning?.035:h.width*S,warning?.025:.12,44*stretch);v.line.material.color.set(warning?0xff4935:(custom??0xfff4ce));v.line.material.opacity=warning?.6:1;}
   else if(zone){const radius=h.width*S*(warning?.65+.35*h.age/h.warning:1);v.circle.scale.set(radius,radius/COS,1);v.circle.material.opacity=warning?.55:1;v.circle.material.color.set(warning?0x83a3ff:(custom??0xd5e9ff));}
   else{
    v.core.material.color.set(color);v.glow.material.color.set(color);const radius=h.width*S;v.core.scale.set(radius*.65,radius*.65,radius*.65);v.glow.scale.setScalar(radius*1.3);v.core.position.y=v.glow.position.y=.65+Math.sin(t*13)*.04;
    if(warning){v.group.position.set(wx(h.originX),0,wz(h.originY));const stretch=Math.hypot(h.dx,h.dy/COS);v.group.rotation.y=Math.atan2(h.dx,h.dy/COS);v.line.position.set(0,.025,4.7*stretch);v.line.scale.set(.025,.02,9.4*stretch);v.line.material.color.set(0xf0bd67);v.line.material.opacity=.18+.16*Math.sin(t*15);}
    else if(b==='hook'){const dx=(h.originX-h.x)*S,dz=(h.originY-h.y)*S/COS,d=Math.hypot(dx,dz);v.line.position.set(dx/2,.65,dz/2);v.line.rotation.y=Math.atan2(dx,dz);v.line.scale.set(.035,.035,d);v.line.material.color.set(0xb88a45);v.line.material.opacity=.9;}
   }
  }
  this.goalRing.visible=game.moving;this.goalRing.position.set(wx(game.goal.x),.035,wz(game.goal.y));this.goalRing.scale.setScalar(.8+Math.sin(t*8)*.15);
  this.flashRing.visible=game.flashEffect>0;this.flashRing.position.set(wx(game.flashFrom.x),.05,wz(game.flashFrom.y));this.flashRing.scale.setScalar(1+(1-game.flashEffect/.35)*2);this.flashRing.material.opacity=game.flashEffect/.35;
  for(const b of this.barriers)b.material.opacity=.2+Math.sin(t*2)*.035;
  this.renderer.render(this.scene,this.camera);
 }
 get info(){return{terrain:'mid-riot-3d',mapReady:this.mapReady,engine:'Three.js',camera:'orthographic-inclined',characters:this.actors.size+1,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
}


