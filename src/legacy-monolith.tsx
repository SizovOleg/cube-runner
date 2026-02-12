// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";

const W=800,H=400,GRAV=0.45,JF=-8,FF=-0.55;
const GND=H-60,SZ=30,SP0=3.2,BLS=9,SCD=20;
const CL={bg:"#0a0a2e",gd:"#1a1a4e",gl:"#4444ff",cb:"#00ff88",gw:"rgba(0,255,136,0.4)",sk:"#ff4466",en:"#ff3333",ey:"#fff",pl:"#3355ff",st:"rgba(255,255,255,0.6)",tx:"#fff",ne:"#00ffcc",bt:"#ffff00",sh:"#44ddff",bm:"#ff8800",rk:"#ff44ff"};
const PN=["shield","bomb","rocket"],PL={shield:"SH",bomb:"BM",rocket:"RK"};
const PC={shield:CL.sh,bomb:CL.bm,rocket:CL.rk},PD={shield:300,rocket:180};

function buildLevel(){
  const o=[],e=[],p=[];let x=400;
  for(let i=0;50>i;i++){
    const m=i%6;
    if(m===0){o.push({x:x+220,y:GND-20,w:20,h:20,t:1});e.push({x:x+460,y:GND-SZ,id:i*10});}
    else if(m===1){o.push({x:x+160,y:GND-20,w:20,h:20,t:1});o.push({x:x+400,y:GND-20,w:20,h:20,t:1});}
    else if(m===2){o.push({x:x+180,y:GND-70,w:80,h:15,t:2});e.push({x:x+200,y:GND-70-SZ,id:i*10});o.push({x:x+450,y:GND-20,w:20,h:20,t:1});}
    else if(m===3){e.push({x:x+220,y:GND-SZ,id:i*10});e.push({x:x+440,y:GND-SZ,id:i*10+1});}
    else if(m===4){o.push({x:x+160,y:GND-20,w:20,h:20,t:1});o.push({x:x+300,y:GND-90,w:70,h:15,t:2});e.push({x:x+310,y:GND-90-SZ,id:i*10});}
    else{o.push({x:x+200,y:GND-20,w:20,h:20,t:1});e.push({x:x+400,y:GND-SZ,id:i*10});}
    if(i%3===1)p.push({x:x+320,y:GND-60,tp:PN[i%3],id:i*100});
    if(i%3===2)p.push({x:x+280,y:GND-80,tp:PN[(i+1)%3],id:i*100+1});
    x+=600;
  }
  return{o,e,p};
}
const LVL=buildLevel();

export default function CubeRunner(){
  const cvRef=useRef(null),gRef=useRef(null),rafRef=useRef(null),inpRef=useRef({j:0,s:0}),scrRef=useRef("menu");
  const[screen,setScreen]=useState("menu");
  const[score,setScore]=useState(0);
  const[kills,setKills]=useState(0);
  const[best,setBest]=useState(0);
  const[inv,setInv]=useState([null,null,null]);

  const mkGame=useCallback((cp)=>{
    const prev=gRef.current;
    const ds=cp&&prev?new Set(prev.ds):new Set();
    const ts=cp&&prev?new Set(prev.ts):new Set();
    const cam=cp&&prev?prev.cc:0,sc=cp&&prev?prev.cs:0,kl=cp&&prev?prev.ck:0;
    const ci=cp&&prev?prev.ci.slice():[null,null,null];
    const ens=LVL.e.map(e=>({x:e.x,y:e.y,id:e.id,a:ds.has(e.id)?0:1}));
    const pups=LVL.p.map(p=>({x:p.x,y:p.y,tp:p.tp,id:p.id,tk:ts.has(p.id)?1:0}));
    const stars=[];for(let i=0;50>i;i++)stars.push({x:Math.random()*W*4,y:Math.random()*(GND-20),s:Math.random()*2+1,b:Math.random()*6});
    gRef.current={c:{x:100,y:GND-SZ,vy:0,og:1,rt:0},cam,en:ens,pu:pups,ds,ts,bl:[],pa:[],bo:[],st:stars,sc,kl,sp:SP0,dead:0,scd:0,mz:0,inv:ci.slice(),shT:0,rkT:0,cc:cam,cs:sc,ck:kl,ci:ci.slice(),ct:0,fr:0};
    setScore(sc);setKills(kl);setInv(ci.slice());
  },[]);

  const boom=(x,y,col,n)=>{const g=gRef.current;if(!g)return;for(let i=0;(n||8)>i;i++)g.pa.push({x,y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,l:25+Math.random()*15,ml:40,c:col,s:3+Math.random()*4});};
  const bboom=(x,y)=>{const g=gRef.current;if(!g)return;const cs=["#ff8800","#ffcc00","#ff4400","#ffff00"];for(let i=0;20>i;i++)g.pa.push({x,y,vx:(Math.random()-.5)*12,vy:(Math.random()-.5)*12,l:30+Math.random()*20,ml:50,c:cs[i%4],s:4+Math.random()*6});};

  const usePw=useCallback((sl)=>{
    const g=gRef.current;if(!g||g.dead)return;
    const pw=g.inv[sl];if(!pw)return;
    g.inv[sl]=null;setInv(g.inv.slice());
    if(pw==="shield")g.shT=PD.shield;
    else if(pw==="bomb")g.bo.push({x:g.c.x+SZ,y:g.c.y,vx:6,vy:-5,tm:45});
    else if(pw==="rocket")g.rkT=PD.rocket;
  },[]);

  const doDie=useCallback(()=>{const g=gRef.current;g.dead=1;setBest(p=>Math.max(p,g.sc));scrRef.current="dead";setScreen("dead");},[]);
  const startGame=useCallback((cp)=>{mkGame(cp);scrRef.current="play";setScreen("play");},[mkGame]);

  useEffect(()=>{
    if(screen!=="play")return;
    const cv=cvRef.current;if(!cv)return;
    const cx=cv.getContext("2d");let run=true;
    const loop=()=>{
      if(!run)return;rafRef.current=requestAnimationFrame(loop);
      const g=gRef.current;if(!g||g.dead||scrRef.current!=="play")return;
      const c=g.c,inp=inpRef.current,rk=g.rkT>0;g.fr++;
      g.ct++;if(g.ct>180){g.ct=0;g.cc=g.cam;g.cs=g.sc;g.ck=g.kl;g.ci=g.inv.slice();}
      g.sp=SP0+Math.min(g.cam/6000,1.8)+(rk?3:0);
      if(!rk){if(inp.j&&c.og){c.vy=JF;c.og=0;}if(inp.j&&!c.og){c.vy+=FF;if(-5>c.vy)c.vy=-5;}}
      else{c.vy+=((GND/2-30)-c.y)*0.02;c.vy*=0.9;if(inp.j)c.vy-=0.8;}
      if(g.scd>0)g.scd--;
      if(inp.s&&1>g.scd){g.bl.push({x:c.x+SZ+5,y:c.y+SZ/2-3});g.mz=6;g.scd=rk?10:SCD;}
      if(!rk)c.vy+=GRAV;c.y+=c.vy;
      if(!rk){for(let i=0;LVL.o.length>i;i++){const o=LVL.o[i];if(o.t!==2)continue;const ox=o.x-g.cam;if(c.x+SZ>ox&&ox+o.w>c.x&&c.vy>=0&&c.y+SZ>=o.y&&o.y+15>=c.y+SZ){c.y=o.y-SZ;c.vy=0;c.og=1;}}if(c.y>=GND-SZ){c.y=GND-SZ;c.vy=0;c.og=1;}}
      if(5>c.y)c.y=5;if(c.y>GND-SZ)c.y=GND-SZ;
      c.rt+=g.sp*(rk?4:2);g.cam+=g.sp;g.sc=Math.floor(g.cam/10);setScore(g.sc);
      for(let i=g.bl.length-1;i>=0;i--){g.bl[i].x+=BLS;if(g.bl[i].x>W+50)g.bl.splice(i,1);}
      for(let i=g.bo.length-1;i>=0;i--){const b=g.bo[i];b.x+=b.vx;b.y+=b.vy;b.vy+=0.2;b.tm--;if(1>b.tm||b.y>=GND){bboom(b.x,Math.min(b.y,GND));for(let j=0;g.en.length>j;j++){const e=g.en[j];if(!e.a)continue;const ex=e.x-g.cam,dx=ex-b.x,dy=e.y-Math.min(b.y,GND);if(14400>dx*dx+dy*dy){e.a=0;g.ds.add(e.id);g.kl++;boom(ex+SZ/2,e.y+SZ/2,"#ff3333",8);}}g.bo.splice(i,1);}}
      for(let j=0;g.en.length>j;j++){const e=g.en[j];if(!e.a)continue;const ex=e.x-g.cam;for(let i=g.bl.length-1;i>=0;i--){const b=g.bl[i];if(b.x+12>ex&&ex+SZ>b.x&&b.y+6>e.y&&e.y+SZ>b.y){e.a=0;g.ds.add(e.id);g.kl++;setKills(g.kl);boom(ex+SZ/2,e.y+SZ/2,"#ff3333",12);g.bl.splice(i,1);break;}}}
      for(let j=0;g.pu.length>j;j++){const p=g.pu[j];if(p.tk)continue;const px=p.x-g.cam;if(c.x+SZ>px-10&&px+20>c.x&&c.y+SZ>p.y-10&&p.y+20>c.y){p.tk=1;g.ts.add(p.id);const sl=g.inv.indexOf(null);if(sl!==-1){g.inv[sl]=p.tp;setInv(g.inv.slice());}boom(px+5,p.y+5,PC[p.tp],10);}}
      for(let j=0;g.en.length>j;j++){const e=g.en[j];if(!e.a)continue;const ex=e.x-g.cam;if(c.x+SZ>ex+4&&ex+SZ-4>c.x&&c.y+SZ>e.y+4&&e.y+SZ-4>c.y){if(rk||g.shT>0){e.a=0;g.ds.add(e.id);g.kl++;setKills(g.kl);boom(ex+SZ/2,e.y+SZ/2,"#ff3333",12);}else if(c.vy>0&&e.y+SZ/2+10>c.y+SZ){e.a=0;g.ds.add(e.id);c.vy=JF*0.7;c.og=0;g.kl++;setKills(g.kl);boom(ex+SZ/2,e.y+SZ/2,"#ff3333",12);}else{boom(c.x+SZ/2,c.y+SZ/2,CL.cb,15);doDie();return;}}}
      if(!rk){for(let i=0;LVL.o.length>i;i++){const o=LVL.o[i];if(o.t!==1)continue;const ox=o.x-g.cam;if(c.x+SZ>ox+5&&ox+o.w-5>c.x&&c.y+SZ>o.y+5){if(g.shT>0){g.shT=Math.max(g.shT-30,0);boom(ox+o.w/2,o.y,CL.sh,6);}else{boom(c.x+SZ/2,c.y+SZ/2,CL.sk,15);doDie();return;}}}}
      if(g.shT>0)g.shT--;if(g.rkT>0)g.rkT--;if(g.mz>0)g.mz--;
      for(let i=g.pa.length-1;i>=0;i--){const p=g.pa[i];p.x+=p.vx;p.y+=p.vy;p.l--;p.vy+=0.1;if(1>p.l)g.pa.splice(i,1);}
      cx.fillStyle=CL.bg;cx.fillRect(0,0,W,H);
      for(let i=0;g.st.length>i;i++){const s=g.st[i],sx=((s.x-g.cam*0.3)%W+W)%W;s.b+=0.02;cx.globalAlpha=0.3+Math.sin(s.b)*0.3;cx.fillStyle=CL.st;cx.fillRect(sx,s.y,s.s,s.s);}cx.globalAlpha=1;
      cx.fillStyle=CL.gd;cx.fillRect(0,GND,W,H-GND);cx.strokeStyle=CL.gl;cx.lineWidth=2;cx.beginPath();cx.moveTo(0,GND);cx.lineTo(W,GND);cx.stroke();
      cx.globalAlpha=0.15;for(let i=0;25>i;i++){const lv=((i*40-g.cam)%1000+1000)%1000;if(W>lv){cx.beginPath();cx.moveTo(lv,GND);cx.lineTo(lv,H);cx.stroke();}}cx.globalAlpha=1;
      for(let i=0;LVL.o.length>i;i++){const o=LVL.o[i],ox=o.x-g.cam;if(-60>ox||ox>W+60)continue;if(o.t===1){cx.fillStyle=CL.sk;cx.shadowColor=CL.sk;cx.shadowBlur=8;cx.beginPath();cx.moveTo(ox,o.y+o.h);cx.lineTo(ox+o.w/2,o.y-5);cx.lineTo(ox+o.w,o.y+o.h);cx.closePath();cx.fill();cx.shadowBlur=0;}else{cx.fillStyle=CL.pl;cx.shadowColor=CL.pl;cx.shadowBlur=6;cx.fillRect(ox,o.y,o.w,o.h);cx.shadowBlur=0;}}
      for(let i=0;g.pu.length>i;i++){const p=g.pu[i];if(p.tk)continue;const px=p.x-g.cam;if(-30>px||px>W+30)continue;const bob=Math.sin(g.fr*0.06+p.id)*5;cx.shadowColor=PC[p.tp];cx.shadowBlur=12;cx.fillStyle=PC[p.tp];cx.globalAlpha=0.3;cx.beginPath();cx.arc(px+5,p.y+5+bob,14,0,Math.PI*2);cx.fill();cx.globalAlpha=1;cx.font="bold 14px monospace";cx.fillStyle="#fff";cx.fillText(PL[p.tp],px-4,p.y+9+bob);cx.shadowBlur=0;}
      for(let i=0;g.en.length>i;i++){const e=g.en[i];if(!e.a)continue;const ex=e.x-g.cam;if(-60>ex||ex>W+60)continue;cx.fillStyle=CL.en;cx.shadowColor=CL.en;cx.shadowBlur=10;cx.fillRect(ex,e.y,SZ,SZ);cx.shadowBlur=0;cx.fillStyle=CL.ey;const bk=Math.sin(g.fr*0.1)>0.85;cx.fillRect(ex+6,e.y+8,6,bk?1:5);cx.fillRect(ex+18,e.y+8,6,bk?1:5);cx.strokeStyle=CL.ey;cx.lineWidth=2;cx.beginPath();cx.moveTo(ex+5,e.y+5);cx.lineTo(ex+13,e.y+7);cx.stroke();cx.beginPath();cx.moveTo(ex+25,e.y+5);cx.lineTo(ex+17,e.y+7);cx.stroke();}
      cx.fillStyle=CL.bm;for(let i=0;g.bo.length>i;i++){const b=g.bo[i];cx.beginPath();cx.arc(b.x,b.y,8,0,Math.PI*2);cx.fill();}
      cx.fillStyle=CL.bt;cx.shadowColor=CL.bt;cx.shadowBlur=8;for(let i=0;g.bl.length>i;i++){const b=g.bl[i];cx.fillRect(b.x,b.y,12,6);cx.globalAlpha=0.4;cx.fillRect(b.x-8,b.y+1,8,4);cx.globalAlpha=1;}cx.shadowBlur=0;
      cx.save();cx.translate(c.x+SZ/2,c.y+SZ/2);
      if(rk){cx.rotate(g.fr*0.3);cx.shadowColor=CL.rk;cx.shadowBlur=20;cx.fillStyle=CL.rk;cx.beginPath();cx.moveTo(SZ/2+8,0);cx.lineTo(-SZ/2,-SZ/2-2);cx.lineTo(-SZ/2,SZ/2+2);cx.closePath();cx.fill();cx.shadowBlur=0;const fc=["#ff4400","#ffaa00","#ffff00"];for(let i=0;3>i;i++)g.pa.push({x:c.x-5+Math.random()*10,y:c.y+SZ/2+Math.random()*8-4,vx:-3-Math.random()*3,vy:(Math.random()-.5)*2,l:10+Math.random()*10,ml:20,c:fc[i%3],s:3+Math.random()*4});}
      else{cx.rotate(c.rt*Math.PI/180);cx.shadowColor=CL.gw;cx.shadowBlur=15;cx.fillStyle=CL.cb;cx.fillRect(-SZ/2,-SZ/2,SZ,SZ);cx.shadowBlur=0;cx.fillStyle="#000";cx.fillRect(-7,-5,4,4);cx.fillRect(3,-5,4,4);cx.fillRect(-5,3,10,2);}
      cx.restore();
      if(g.shT>0){cx.globalAlpha=0.2+Math.sin(g.fr*0.15)*0.1;cx.strokeStyle=CL.sh;cx.lineWidth=3;cx.shadowColor=CL.sh;cx.shadowBlur=15;cx.beginPath();cx.arc(c.x+SZ/2,c.y+SZ/2,SZ+6+Math.sin(g.fr*0.1)*2,0,Math.PI*2);cx.stroke();cx.globalAlpha=0.08;cx.fillStyle=CL.sh;cx.fill();cx.shadowBlur=0;cx.globalAlpha=1;}
      if(g.mz>0){cx.globalAlpha=g.mz/6;cx.fillStyle="#ffff88";cx.beginPath();cx.arc(c.x+SZ+8,c.y+SZ/2,6+g.mz,0,Math.PI*2);cx.fill();cx.globalAlpha=1;}
      if(inp.j&&!c.og&&!rk){for(let i=0;2>i;i++)g.pa.push({x:c.x+Math.random()*10,y:c.y+SZ+Math.random()*5,vx:(Math.random()-.5)*2,vy:Math.random()*2+1,l:15,ml:15,c:CL.ne,s:2+Math.random()*3});}
      for(let i=0;g.pa.length>i;i++){const p=g.pa[i];cx.globalAlpha=p.l/p.ml;cx.fillStyle=p.c;cx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);}cx.globalAlpha=1;
      cx.fillStyle=CL.tx;cx.font="bold 18px monospace";cx.fillText("Score: "+g.sc,20,30);cx.fillText("Kills: "+g.kl,20,55);
      if(g.shT>0){cx.fillStyle=CL.sh;cx.font="14px monospace";cx.fillText("SHIELD "+Math.ceil(g.shT/60)+"s",160,30);}
      if(g.rkT>0){cx.fillStyle=CL.rk;cx.font="14px monospace";cx.fillText("ROCKET "+Math.ceil(g.rkT/60)+"s",160,g.shT>0?50:30);}
      for(let i=0;3>i;i++){const sx=W-160+i*50,sy=10;cx.strokeStyle=g.inv[i]?PC[g.inv[i]]:"#444";cx.lineWidth=2;cx.strokeRect(sx,sy,42,42);cx.fillStyle="rgba(0,0,0,0.4)";cx.fillRect(sx,sy,42,42);if(g.inv[i]){cx.font="bold 16px monospace";cx.fillStyle="#fff";cx.fillText(PL[g.inv[i]],sx+8,sy+28);}cx.fillStyle="#888";cx.font="10px monospace";cx.fillText(""+(i+1),sx+2,sy+39);}
    };
    rafRef.current=requestAnimationFrame(loop);
    return()=>{run=false;cancelAnimationFrame(rafRef.current);};
  },[screen,doDie]);

  useEffect(()=>{
    const kd=(e)=>{if(e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW"){e.preventDefault();inpRef.current.j=1;}if(e.code==="KeyX"||e.code==="KeyF"||e.code==="ShiftLeft"||e.code==="ShiftRight"||e.code==="KeyZ"){e.preventDefault();inpRef.current.s=1;}if(e.code==="Digit1")usePw(0);if(e.code==="Digit2")usePw(1);if(e.code==="Digit3")usePw(2);};
    const ku=(e)=>{if(e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW")inpRef.current.j=0;if(e.code==="KeyX"||e.code==="KeyF"||e.code==="ShiftLeft"||e.code==="ShiftRight"||e.code==="KeyZ")inpRef.current.s=0;};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    return()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[usePw]);

  const jD=(e)=>{e.preventDefault();inpRef.current.j=1;};
  const jU=()=>{inpRef.current.j=0;};
  const sD=(e)=>{e.preventDefault();e.stopPropagation();inpRef.current.s=1;};
  const sU=(e)=>{e.preventDefault();e.stopPropagation();inpRef.current.s=0;};
  const pD=(i)=>(e)=>{e.preventDefault();e.stopPropagation();usePw(i);};

  const bS=(bg)=>({padding:"14px 32px",fontSize:18,fontWeight:"bold",border:"none",borderRadius:12,cursor:"pointer",color:"#fff",background:bg,boxShadow:"0 0 20px "+bg+"80",margin:8,fontFamily:"monospace",minWidth:200});
  const cS=(bg,br)=>({width:54,height:54,borderRadius:27,border:"3px solid "+br,background:bg,color:"#fff",fontSize:14,fontWeight:"bold",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"});

  if(screen==="menu"){return(
    <div style={{width:W,maxWidth:"100%",height:H,background:CL.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:12,margin:"0 auto",fontFamily:"monospace"}}>
      <div style={{fontSize:40,fontWeight:"bold",color:CL.cb,textShadow:"0 0 30px "+CL.gw,marginBottom:8}}>CUBE RUNNER</div>
      <div style={{fontSize:18,color:CL.ne,marginBottom:24}}>Battle Dash</div>
      <button style={bS("#00aa66")} onClick={()=>startGame(false)}>Play!</button>
      <div style={{color:"#8888cc",marginTop:16,fontSize:12,textAlign:"center",lineHeight:"2.2"}}>Tap/Space = jump+fly | X/Z/Shift = shoot<br/>Collect SH/BM/RK powerups, use with 1,2,3</div>
    </div>
  );}

  if(screen==="dead"){return(
    <div style={{width:W,maxWidth:"100%",height:H,background:CL.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:12,margin:"0 auto",fontFamily:"monospace"}}>
      <div style={{fontSize:36,fontWeight:"bold",color:CL.sk,marginBottom:10}}>Crash!</div>
      <div style={{color:"#fff",fontSize:20,marginBottom:5}}>Score: {score} | Kills: {kills}</div>
      <div style={{color:CL.ne,fontSize:16,marginBottom:25}}>Best: {best}</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        <button style={bS("#ffaa00")} onClick={()=>startGame(true)}>Continue</button>
        <button style={bS("#00aa66")} onClick={()=>startGame(false)}>Restart</button>
      </div>
    </div>
  );}

  return(
    <div style={{margin:"0 auto",width:W,maxWidth:"100%",borderRadius:12,overflow:"hidden",touchAction:"none",position:"relative"}}>
      <canvas ref={cvRef} width={W} height={H} style={{display:"block",cursor:"pointer"}}
        onMouseDown={jD} onMouseUp={jU} onTouchStart={jD} onTouchEnd={jU} onContextMenu={e=>e.preventDefault()}/>
      <button onMouseDown={sD} onMouseUp={sU} onTouchStart={sD} onTouchEnd={sU}
        style={{position:"absolute",bottom:12,right:12,...cS("rgba(255,255,0,0.7)","#ffaa00")}}>GUN</button>
      <div style={{position:"absolute",bottom:12,left:12,display:"flex",gap:6}}>
        {[0,1,2].map(i=>(
          <button key={i} onMouseDown={pD(i)} onTouchStart={pD(i)}
            style={{...cS(inv[i]?PC[inv[i]]+"33":"rgba(60,60,60,0.5)",inv[i]?PC[inv[i]]:"#444"),opacity:inv[i]?1:0.3}}>
            {inv[i]?PL[inv[i]]:(i+1)}
          </button>
        ))}
      </div>
      <div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",color:CL.ne,fontSize:11,fontFamily:"monospace",background:"rgba(0,0,0,0.5)",padding:"3px 10px",borderRadius:6,pointerEvents:"none",whiteSpace:"nowrap"}}>
        Tap=jump | GUN=shoot | 1,2,3=powers
      </div>
    </div>
  );
}
