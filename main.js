(function(){
// Real board scale: 74 cm playing surface = 740 units, so 1 cm = 10 units
const S=740,CR=15.5,SR=20.5,PR=22.25,EC=15.9,LN=16.5,PX=[[16,16],[S-16,16],[16,S-16],[S-16,S-16]],BASE=[S-118,118],LO=[151,S-151],MAXV=2600,K=1.6,PULL=160;
const $=i=>document.getElementById(i),cv=$('cv'),g=cv.getContext('2d'),KS=cv.width/S;
const NAMES=['Player 1','Player 2'],COL=['w','b'],AV=['🙂','😎'];
let mode='pnp',lvl=1,coins,striker,Q,cur=0,phase='home',setNo=1,totals=[0,0],wins=[0,0],sx=.5,drag=null,blocked=false,shot=null,qPend=null,qCov=null,muted=false,msgT='';

// sound (synthesised)
const AC=window.AudioContext?new AudioContext():null;
let sil=false;function snd(f,d,v,t){if(sil||muted||!AC)return;const o=AC.createOscillator(),n=AC.createGain();o.type=t||'sine';o.frequency.value=f;n.gain.setValueAtTime(v,AC.currentTime);n.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);o.connect(n);n.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}

function layout(){
 coins=[{x:S/2,y:S/2,c:'q'}];const d=2*CR+.6;
 for(let i=0;i<6;i++){const a=i*Math.PI/3;coins.push({x:S/2+d*Math.cos(a),y:S/2+d*Math.sin(a),c:i%2?'b':'w'})}
 for(let i=0;i<6;i++){const a=i*Math.PI/3,b=a+Math.PI/6;
  coins.push({x:S/2+2*d*Math.cos(a),y:S/2+2*d*Math.sin(a),c:i%2?'w':'b'});
  coins.push({x:S/2+d*Math.sqrt(3)*Math.cos(b),y:S/2+d*Math.sqrt(3)*Math.sin(b),c:i%2?'b':'w'})}
 coins.forEach(c=>{c.r=CR;c.m=1;c.vx=c.vy=0;c.in=false});Q=coins[0];
 striker={r:SR,m:2.86,c:'s',vx:0,vy:0,in:false,x:0,y:0};
}
const all=()=>coins.concat(striker);
const left=c=>coins.filter(x=>x.c===c&&!x.in).length;
function spot(o){o.vx=o.vy=0;o.in=false;for(let k=0;k<300;k++){const a=k*2.4,r=k*1.1;o.x=S/2+r*Math.cos(a);o.y=S/2+r*Math.sin(a);if(!coins.some(c=>c!==o&&!c.in&&Math.hypot(c.x-o.x,c.y-o.y)<2*CR+1))return}}
function placeStriker(){
 striker.in=false;striker.vx=striker.vy=0;striker.x=LO[0]+(LO[1]-LO[0])*sx;striker.y=BASE[cur];
 blocked=coins.some(c=>!c.in&&Math.hypot(c.x-striker.x,c.y-striker.y)<SR+CR);
 $('msg').textContent=blocked?'A coin is on your base. Slide the striker to a free spot.':msgT;
}
function newSet(){layout();qPend=qCov=null;cur=(setNo-1)%2;sx=.5;$('sl').value=50;phase='place';msgT=NAMES[cur]+' to play';placeStriker();hud();after()}
function newMatch(){setNo=1;totals=[0,0];wins=[0,0];newSet()}

function hud(){
 [0,1].forEach(p=>{const n=coins.filter(c=>c.c===COL[p]&&c.in).length,el=$('c'+p);
  el.className='pl'+(p?' r':'')+(cur===p&&phase==='place'||cur===p&&phase==='move'?' act':'');
  el.innerHTML='<div class="av">'+AV[p]+'</div><small>'+NAMES[p]+'</small><div class="n">'+(p?'<i class="d b"></i>'+n:n+'<i class="d w"></i>')+'</div>';});
 $('mid').innerHTML='Set '+setNo+'/3<small>'+totals[0]+' - '+totals[1]+' pts</small>';
}

function fire(dx,dy,p){
 const l=Math.hypot(dx,dy);striker.vx=dx/l*MAXV*p;striker.vy=dy/l*MAXV*p;
 shot={hit:false,wall:false,behind:false,sIn:false,pk:[]};phase='move';snd(180,.1,.3,'square');hud();
}
const behind=c=>cur===0?c.y>BASE[0]+CR:c.y<BASE[1]-CR;

function step(dt){
 const A=all().filter(o=>!o.in),f=Math.exp(-K*dt);
 for(const o of A){
  o.x+=o.vx*dt;o.y+=o.vy*dt;o.vx*=f;o.vy*=f;
  let w=false;
  if(o.x<o.r){o.x=o.r;o.vx=Math.abs(o.vx)*.8;w=true}else if(o.x>S-o.r){o.x=S-o.r;o.vx=-Math.abs(o.vx)*.8;w=true}
  if(o.y<o.r){o.y=o.r;o.vy=Math.abs(o.vy)*.8;w=true}else if(o.y>S-o.r){o.y=S-o.r;o.vy=-Math.abs(o.vy)*.8;w=true}
  if(w){if(o===striker&&!shot.hit)shot.wall=true;if(Math.hypot(o.vx,o.vy)>250)snd(140,.05,.12,'triangle')}
  for(const p of PX)if(Math.hypot(o.x-p[0],o.y-p[1])<PR){o.in=true;o.vx=o.vy=0;shot.pk.push(o);if(o===striker)shot.sIn=true;snd(110,.3,.35);break}
 }
 const B=A.filter(o=>!o.in);
 for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){
  const a=B[i],b=B[j];let dx=b.x-a.x,dy=b.y-a.y;const m=a.r+b.r,d2=dx*dx+dy*dy;
  if(d2>=m*m||d2===0)continue;
  const d=Math.sqrt(d2);dx/=d;dy/=d;const ia=1/a.m,ib=1/b.m,ov=(m-d)/(ia+ib);
  a.x-=dx*ov*ia;a.y-=dy*ov*ia;b.x+=dx*ov*ib;b.y+=dy*ov*ib;
  const vn=(a.vx-b.vx)*dx+(a.vy-b.vy)*dy;
  if(vn>0){const J=1.92*vn/(ia+ib);a.vx-=J*ia*dx;a.vy-=J*ia*dy;b.vx+=J*ib*dx;b.vy+=J*ib*dy;if(vn>120)snd(300+Math.random()*200,.05,Math.min(.3,vn/3000),'triangle')}
  if((a===striker||b===striker)&&!shot.hit){shot.hit=true;const o=a===striker?b:a;if(!shot.wall&&behind(o))shot.behind=true}
 }
}

function resolve(){
 const me=COL[cur],op=COL[1-cur],P=shot.pk.filter(o=>o!==striker),own=P.filter(o=>o.c===me),opp=P.filter(o=>o.c===op),q=P.includes(Q);
 const foul=shot.sIn||opp.length>0||shot.behind;let m=[],ill=false;
 if(shot.sIn)m.push('Striker pocketed');if(opp.length)m.push('Opponent coin pocketed');if(shot.behind)m.push('Direct hit on a coin behind your line');
 if(qPend===cur){if(own.length&&!foul){qCov=cur;qPend=null;m.push('Queen covered')}else{spot(Q);qPend=null;m.push('Queen not covered, back to centre')}}
 if(q){if(foul){spot(Q);m.push('Queen back to centre')}else if(own.length){qCov=cur;m.push('Queen pocketed and covered')}else{qPend=cur;m.push('Queen pocketed, cover it now')}}
 if(own.length&&left(me)===0&&qCov!==cur&&(qPend===cur||!Q.in)){ill=true;spot(own[own.length-1]);m.push('Last coin before the queen is illegal: coin back, turn lost')}
 if(foul&&!ill){const r=coins.filter(x=>x.c===me&&x.in).pop();if(r){spot(r);m.push('Foul: one of your coins goes back')}}
 const cont=!foul&&!ill&&(own.length>0||q);
 striker.in=false;
 const a=left('w'),b=left('b');
 if(a===0||b===0){endSet(a===0?0:1);return}
 if(!cont)cur=1-cur;
 msgT=(m.join('. ')||(cont?'':'No coin pocketed'))+(m.length||!cont?'. ':'')+NAMES[cur]+(cont?' plays again':' to play');
 phase='place';placeStriker();hud();after();
}
function dlg(t,p,b,f){$('dt').textContent=t;$('dp').textContent=p;$('dok').textContent=b;$('dlg').hidden=false;$('dok').onclick=()=>{$('dlg').hidden=true;f()}}
function endSet(w){
 phase='over';const pts=left(COL[1-w])+(qCov===w?3:0);totals[w]+=pts;wins[w]++;hud();snd(520,.4,.3);
 if(setNo<3)dlg(NAMES[w]+' wins set '+setNo,'+'+pts+' points. Score '+totals[0]+' - '+totals[1],'Next set',()=>{setNo++;newSet()});
 else{const t=totals[0]-totals[1]||wins[0]-wins[1],r=t>0?0:1;dlg(t===0?'Match drawn':NAMES[r]+' wins the match','Points '+totals[0]+' - '+totals[1]+', sets '+wins[0]+' - '+wins[1],'Play again',newMatch)}
}

// computer player
const LV=[{n:6,err:.2,sim:0},{n:14,err:.07,sim:1},{n:36,err:.03,sim:1},{n:90,err:.012,sim:1}];
const snap=()=>({c:coins.map(c=>[c.x,c.y,c.vx,c.vy,c.in]),s:[striker.x,striker.y,striker.vx,striker.vy,striker.in]});
function rest(z){coins.forEach((c,i)=>{[c.x,c.y,c.vx,c.vy,c.in]=z.c[i]});[striker.x,striker.y,striker.vx,striker.vy,striker.in]=z.s}
function trial(sxv,ang,p){
 const z=snap(),sv=shot;sil=true;let sc=-99;
 striker.in=false;striker.x=LO[0]+(LO[1]-LO[0])*sxv;striker.y=BASE[cur];
 if(!coins.some(c=>!c.in&&Math.hypot(c.x-striker.x,c.y-striker.y)<SR+CR)){
  striker.vx=Math.cos(ang)*MAXV*p;striker.vy=Math.sin(ang)*MAXV*p;shot={hit:false,wall:false,behind:false,sIn:false,pk:[]};
  for(let i=0;i<1000;i++){step(1/240);if(i%10===9&&all().every(o=>o.in||Math.hypot(o.vx,o.vy)<12))break}
  const me=COL[cur],P=shot.pk.filter(o=>o!==striker),own=P.filter(o=>o.c===me).length,opp=P.filter(o=>o.c===COL[1-cur]).length,q=P.includes(Q);
  sc=own*10+(q?(own?9:3):0)+(own?3:0)-opp*12-(shot.sIn?18:0)-(shot.behind?18:0);
 }
 rest(z);shot=sv;sil=false;return sc;
}
function aiPlan(){
 const L=LV[lvl],mine=coins.filter(c=>c.c===COL[cur]&&!c.in),tg=mine.concat(Q.in?[]:[Q]),sy=BASE[cur],cands=[];
 for(let k=0;k<L.n*4&&cands.length<L.n;k++){
  const sxc=lvl===0?.3+Math.random()*.4:Math.random(),sxp=LO[0]+(LO[1]-LO[0])*sxc,c=tg[Math.random()*tg.length|0];
  let ang,p;
  if(lvl===3&&k%4===0){ang=Math.atan2(Math.random()*S-sy,Math.random()*S-sxp);p=.5+Math.random()*.5}
  else if(lvl===0){ang=Math.atan2(c.y-sy,c.x-sxp);p=.4+Math.random()*.5}
  else{const pk=PX[Math.random()*4|0],dx=pk[0]-c.x,dy=pk[1]-c.y,dl=Math.hypot(dx,dy),gx=c.x-dx/dl*(CR+SR),gy=c.y-dy/dl*(CR+SR);
   ang=Math.atan2(gy-sy,gx-sxp);if(Math.cos(ang)*dx/dl+Math.sin(ang)*dy/dl<.25)continue;
   p=Math.min(1,.3+(Math.hypot(gx-sxp,gy-sy)+dl)/1300+Math.random()*.15)}
  cands.push([sxc,ang,p]);
 }
 if(!cands.length)cands.push([.5,Math.atan2(S/2-sy,0),.6]);
 let best=cands[0];
 if(L.sim){let bs=-1e9;for(const c of cands){const v=trial(c[0],c[1],c[2])+Math.random()*2;if(v>bs){bs=v;best=c}}}
 return best;
}
function after(){if(mode==='bot'&&cur===1&&phase==='place')setTimeout(ai,900)}
function ai(){
 if(mode!=='bot'||cur!==1||phase!=='place'||$('game').hidden)return;
 let [sxc,ang,p]=aiPlan();sx=sxc;placeStriker();
 for(let t=0;blocked&&t<=20;t++){sx=t/20;placeStriker();ang=Math.atan2(S/2-striker.y,S/2-striker.x)}
 $('sl').value=sx*100;
 const j=lvl===0?.25:lvl===1?.1:.03,a=ang+(Math.random()*2-1)*LV[lvl].err,pw=Math.min(1,Math.max(.1,p*(1+(Math.random()*2-1)*j)));
 drag={x:striker.x-Math.cos(a)*PULL*pw,y:striker.y-Math.sin(a)*PULL*pw};
 setTimeout(()=>{if(phase!=='place'||cur!==1)return;drag=null;fire(Math.cos(a),Math.sin(a),pw)},800);
}

// static board layer, drawn once
const bgc=document.createElement('canvas');bgc.width=bgc.height=1480;
function grain(c){for(let i=0;i<260;i++){const y=Math.random()*S,a=.03+Math.random()*.07;c.strokeStyle='rgba('+(Math.random()<.5?'110,60,20':'255,235,200')+','+a+')';c.lineWidth=.5+Math.random()*2.5;c.beginPath();c.moveTo(0,y);for(let x=0;x<=S;x+=60)c.lineTo(x,y+Math.sin(x/90+i)*3);c.stroke()}}
function buildBoard(){const g=bgc.getContext('2d');g.setTransform(KS,0,0,KS,0,0);
 const w=g.createLinearGradient(0,0,S,S);w.addColorStop(0,'#f0c898');w.addColorStop(.5,'#e2ae7c');w.addColorStop(1,'#eab98a');g.fillStyle=w;g.fillRect(0,0,S,S);grain(g);
 g.strokeStyle='#8a5a34';g.lineWidth=2.5;g.beginPath();g.arc(S/2,S/2,85,0,7);g.stroke();
 // baselines: thin outline capsules, orange end circles
 g.globalAlpha=.9;
 for(const y of BASE){g.lineCap='round';g.strokeStyle='#8a5a34';g.lineWidth=3;g.beginPath();g.moveTo(LO[0],y-EC);g.lineTo(LO[1],y-EC);g.moveTo(LO[0],y+LN);g.lineTo(LO[1],y+LN);g.stroke();
  for(const x of LO){g.fillStyle='#e8860c';g.beginPath();g.arc(x,y,EC,0,7);g.fill();g.beginPath();g.arc(x,y,LN,0,7);g.stroke()}}
 for(const x of BASE){g.beginPath();g.moveTo(x-EC,LO[0]);g.lineTo(x-EC,LO[1]);g.moveTo(x+LN,LO[0]);g.lineTo(x+LN,LO[1]);g.stroke();
  for(const y of LO){g.fillStyle='#e8860c';g.beginPath();g.arc(x,y,EC,0,7);g.fill();g.beginPath();g.arc(x,y,LN,0,7);g.stroke()}}
 g.globalAlpha=1;
 // orange corners + pockets
 g.strokeStyle='#f08a0a';g.lineWidth=16;g.lineCap='butt';
 for(const [x,y,sx,sy] of [[0,0,1,1],[S,0,-1,1],[0,S,1,-1],[S,S,-1,-1]]){g.beginPath();g.moveTo(x+sx*110,y+sy*8);g.lineTo(x+sx*8,y+sy*8);g.lineTo(x+sx*8,y+sy*110);g.stroke()}
 for(const p of PX){const pg=g.createRadialGradient(p[0],p[1],4,p[0],p[1],PR+2);pg.addColorStop(0,'#000');pg.addColorStop(.75,'#111');pg.addColorStop(1,'#3a2410');g.fillStyle=pg;g.beginPath();g.arc(p[0],p[1],PR+2,0,7);g.fill()}
 g.strokeStyle='#e8860c';g.lineWidth=4;g.beginPath();g.arc(S/2,S/2,15.9,0,7);g.stroke();
 for(const [x,y,a,b] of [[0,0,1,1],[S,0,-1,1],[0,S,1,-1],[S,S,-1,-1]]){g.strokeStyle='#8a5a34';g.lineWidth=2.5;g.beginPath();g.moveTo(x+a*70,y+b*70);g.lineTo(x+a*150,y+b*150);g.stroke();g.beginPath();g.arc(x+a*190,y+b*190,28,0,7);g.stroke()}
 const vg=g.createRadialGradient(S/2,S/2,S*.35,S/2,S/2,S*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(60,20,0,.35)');g.fillStyle=vg;g.fillRect(0,0,S,S);
}
// drawing
function disc(o){
 const r=o.r,x=o.x,y=o.y,C={w:['#fffdf6','#e9dcc0','#b9a47c'],b:['#8a8a8a','#262626','#000'],q:['#ff7a66','#d41818','#7a0000'],s:['#c6fffb','#1fc4c8','#06666b']}[o.c];
 g.save();g.shadowColor='#0009';g.shadowBlur=9;g.shadowOffsetY=4;
 const gr=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);gr.addColorStop(0,C[0]);gr.addColorStop(.6,C[1]);gr.addColorStop(1,C[2]);
 g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.restore();
 g.lineWidth=1.6;g.strokeStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(x,y,r-.8,0,7);g.stroke();
 g.strokeStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(x,y,r*.72,0,7);g.stroke();
 g.strokeStyle='rgba(0,0,0,.28)';g.beginPath();g.arc(x,y,r*.5,0,7);g.stroke();
 g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(x-r*.3,y-r*.42,r*.34,r*.17,-.6,0,7);g.fill();
 if(o.c==='s'){g.fillStyle='#fff';g.font='bold 20px sans-serif';g.textAlign='center';g.fillText('★',x,y+7)}
}
function capsule(x1,y1,x2,y2){
 g.lineCap='round';g.strokeStyle='#8a5a34';g.lineWidth=2*(SR+4);g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
 g.strokeStyle='#e9b283';g.lineWidth=2*(SR+1);g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
 for(const [x,y] of [[x1,y1],[x2,y2]]){g.fillStyle='#e8860c';g.strokeStyle='#8a5a34';g.lineWidth=3;g.beginPath();g.arc(x,y,SR-3,0,7);g.fill();g.stroke()}
}
function draw(){
 g.setTransform(KS,0,0,KS,0,0);g.textAlign='center';
 g.drawImage(bgc,0,0,S,S);
 for(const c of coins)if(!c.in)disc(c);
 if(!striker.in&&phase!=='home'){
  if(drag&&phase==='place'&&!blocked){
   let dx=striker.x-drag.x,dy=striker.y-drag.y;const l=Math.hypot(dx,dy),p=Math.min(l,PULL)/PULL;
   g.setLineDash([3,9]);g.lineCap='round';g.strokeStyle='#3a2a1a';g.lineWidth=4;g.beginPath();g.arc(striker.x,striker.y,PULL,0,7);g.stroke();
   if(l>14){dx/=l;dy/=l;
    let ex=striker.x,ey=striker.y,hitC=false;
    for(let t=SR;t<1400&&!hitC;t+=4){ex=striker.x+dx*t;ey=striker.y+dy*t;
     if(ex<SR||ex>S-SR||ey<SR||ey>S-SR)break;
     hitC=coins.some(c=>!c.in&&Math.hypot(c.x-ex,c.y-ey)<SR+CR)}
    g.strokeStyle='#fff';g.lineWidth=2.5;g.setLineDash([2,10]);g.beginPath();g.moveTo(striker.x,striker.y);g.lineTo(ex,ey);g.stroke();
    g.setLineDash([]);g.beginPath();g.arc(ex,ey,SR,0,7);g.stroke();
    const L=40+p*90,tx=striker.x+dx*L,ty=striker.y+dy*L;
    g.strokeStyle='#ff9a1a';g.fillStyle='#ff9a1a';g.lineWidth=7;g.beginPath();g.moveTo(striker.x+dx*SR,striker.y+dy*SR);g.lineTo(tx,ty);g.stroke();
    g.beginPath();g.moveTo(tx+dx*18,ty+dy*18);g.lineTo(tx-dy*11,ty+dx*11);g.lineTo(tx+dy*11,ty-dx*11);g.fill();
    $('pw').style.width=p*100+'%';
   }
   g.setLineDash([]);
  }else $('pw').style.width='0';
  if(phase==='place'){g.strokeStyle='rgba(255,214,70,.95)';g.lineWidth=3;g.beginPath();g.arc(striker.x,striker.y,SR+4,0,7);g.stroke()}
  disc(striker);
  if(blocked&&phase==='place'){g.strokeStyle='#f33';g.lineWidth=4;g.beginPath();g.arc(striker.x,striker.y,SR+5,0,7);g.stroke()}
 }
}
let last=0,acc=0;
function loop(t){
 const dt=Math.min(.05,(t-last)/1000||0);last=t;
 if(phase==='move'){acc+=dt;while(acc>=1/60){for(let i=0;i<4;i++)step(1/240);acc-=1/60}
  const A=all().filter(o=>!o.in);
  if(A.every(o=>Math.hypot(o.vx,o.vy)<12)){A.forEach(o=>o.vx=o.vy=0);acc=0;resolve()}}
 if(phase!=='home')draw();
 requestAnimationFrame(loop);
}

// input
const pt=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*S,y:(e.clientY-r.top)/r.height*S}};
cv.onpointerdown=e=>{if(AC&&AC.state==='suspended')AC.resume();if(phase!=='place'||blocked||(mode==='bot'&&cur===1))return;drag=pt(e);cv.setPointerCapture(e.pointerId)};
cv.onpointermove=e=>{if(drag)drag=pt(e)};
cv.onpointerup=e=>{if(!drag)return;const d=drag;drag=null;const dx=striker.x-d.x,dy=striker.y-d.y,l=Math.hypot(dx,dy);if(l>14)fire(dx,dy,Math.max(.06,Math.min(l,PULL)/PULL))};
cv.onpointercancel=()=>{drag=null};
$('game').addEventListener('touchmove',e=>{if(e.cancelable)e.preventDefault()},{passive:false});
document.addEventListener('touchmove',e=>{if(phase!=='home'&&e.target!==$('sl')&&e.cancelable)e.preventDefault()},{passive:false});
$('sl').oninput=e=>{if(phase!=='place'||(mode==='bot'&&cur===1))return;sx=e.target.value/100;placeStriker()};
$('mute').onclick=()=>{muted=!muted;$('mute').textContent=muted?'🔇':'🔊'};
function show(id){$('home').hidden=id!=='home';$('game').hidden=id!=='game'}
$('pnp').onclick=()=>{mode='pnp';NAMES[0]='Player 1';NAMES[1]='Player 2';show('game');newMatch()};
$('bot').onclick=()=>{mode='bot';NAMES[0]='You';NAMES[1]='Computer';show('game');newMatch()};
document.querySelectorAll('#lv button').forEach(b=>b.onclick=()=>{lvl=+b.dataset.v;document.querySelectorAll('#lv button').forEach(x=>x.classList.toggle('on',x===b))});
$('menu').onclick=()=>{if(confirm('Are you sure you want to leave this game?')){phase='home';show('home')}};
buildBoard();requestAnimationFrame(loop);

// install
let ip=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();ip=e;$('install').hidden=false});
$('install').onclick=async()=>{if(ip){ip.prompt();await ip.userChoice;ip=null;$('install').hidden=true}};
if(/iphone|ipad/i.test(navigator.userAgent)&&!navigator.standalone)$('ios').hidden=false;

// network-based updates
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js?v='+V,{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
let loaded=null;
const stamp=async()=>{const t=await (await fetch('index.html?c='+Date.now(),{cache:'no-store'})).text();return t.length+':'+t.slice(0,1500)};
stamp().then(s=>loaded=s).catch(()=>{});
document.addEventListener('visibilitychange',async()=>{
 if(document.visibilityState!=='visible'||!loaded||phase==='move')return;
 try{if(await stamp()!==loaded)location.reload()}catch(e){}
});
})();
