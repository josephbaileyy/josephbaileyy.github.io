
export function mountVisual(container,name){
 if(name!=='rv-eventual-bound')return false;
 container.innerHTML="<div id=\"eventual-bound\">\n  <h3>One outcome, then all outcomes</h3>\n  <div class=\"controls\">\n    <label class=\"bound-field\">Time n = N: <output id=\"eb-time\">4</output><input class=\"bound-range\" id=\"eb-n\" type=\"range\" min=\"1\" max=\"40\" value=\"4\"></label>\n    <label class=\"bound-field\">Selected \u03c9: <output id=\"eb-outcome\">0.180</output><input class=\"bound-range\" id=\"eb-w\" type=\"range\" min=\"0.01\" max=\"1\" step=\"0.001\" value=\"0.18\"></label>\n    <button  id=\"eb-play\" type=\"button\">Play time</button>\n  </div>\n  <div id=\"eb-line\"></div>\n  <div class=\"small tabular-nums\" id=\"eb-detail\" aria-live=\"polite\"></div>\n  <div id=\"eb-space\"></div>\n  <div class=\"bound-legend small\"><span><span class=\"eb-key eb-tail\"></span>Any violation at or after N</span><span><span class=\"eb-key eb-now\"></span>Violation at n = N</span></div>\n  <div class=\"tabular-nums\" id=\"eb-mass\" aria-live=\"polite\"></div>\n</div>\n";
 const root=container.querySelector('#eventual-bound');
 const el=id=>root.querySelector('#eb-'+id);
 let n=4,w=.18,timer=null;
 const svg=(width,height,content,label)=>`<svg viewBox="0 0 ${width} ${height}" height="${height}" role="img" aria-label="${label}">${content}</svg>`;
 const text=(x,y,value,anchor='start',cls='')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" class="small ${cls}">${value}</text>`;
 function draw(){
  const width=root.clientWidth||600,left=24,right=width-24,span=right-left;
  const k=Math.ceil(1/w),v=i=>w+(i===k?1:-1/i),x=z=>left+(z+1)/3.3*span;
  el('n').value=n;el('w').value=w;el('time').textContent=n;el('outcome').textContent=w.toFixed(3);
  let a=text(left,22,'Values for the selected outcome');
  a+=`<rect x="${x(w+.2)}" y="43" width="${right-x(w+.2)}" height="65" fill="var(--gold)" opacity=".12"/>`;
  a+=`<line x1="${left}" y1="96" x2="${right}" y2="96" class="eb-axis"/>`;
  a+=`<line x1="${x(w)}" y1="66" x2="${x(w)}" y2="108" stroke="var(--ink)"/>`;
  a+=text(x(w)-4,131,'X∞(ω)','end');
  a+=`<line x1="${x(w+.2)}" y1="43" x2="${x(w+.2)}" y2="108" stroke="var(--gold)" stroke-dasharray="4 4"/>`;
  a+=text(x(w+.2)+4,151,'X∞(ω) + ε');
  for(let i=1;i<n;i++)a+=`<circle cx="${x(v(i))}" cy="96" r="3" fill="var(--ink)" opacity=".22"/>`;
  a+=`<circle cx="${x(v(n))}" cy="96" r="6" fill="var(--green)"/>`;
  a+=text(Math.max(55,Math.min(width-55,x(v(n)))),58,`X${n} = ${v(n).toFixed(2)}`,'middle');
  el('line').innerHTML=svg(width,170,a,'Number line showing the current value, past values, the limit and the epsilon threshold.');
  el('detail').textContent=`Spike time: ${k}. ${k>=n?'A violation is still at or after N.':'The last violation is behind us.'}`;
  const end=n===1?1:1/(n-1),start=1/n,map=t=>left+t*span;
  let b=text(left,24,'Outcomes ω ∈ (0, 1] · uniform probability');
  b+=`<rect x="${left}" y="57" width="${span}" height="54" fill="var(--pale)"/>`;
  b+=`<rect x="${left}" y="57" width="${end*span}" height="54" fill="var(--gold)" opacity=".3"/>`;
  if(n>1)b+=`<rect x="${map(start)}" y="57" width="${(end-start)*span}" height="54" fill="var(--gold)"/>`;
  else b+=`<circle cx="${right}" cy="85" r="4" fill="var(--gold)"/>`;
  b+=`<line x1="${map(w)}" y1="48" x2="${map(w)}" y2="117" stroke="var(--ink)" stroke-width="2"/>`;
  b+=text(map(w),42,'ω',w>.94?'end':w<.06?'start':'middle');
  b+=text(left,133,'0');b+=text(right,133,'1','end');
  el('space').innerHTML=svg(width,145,b,'Uniform outcome space. Shaded area is the exact probability of outcomes with future violations; dark area is the current violation event.');
  el('mass').textContent=`P(A${n}) = ${end.toFixed(3)} ${end<.2?'<':'≥'} ε = 0.20${end<.2?' · common bound achieved':''}`;
 }
 function stop(){clearInterval(timer);timer=null;el('play').textContent='Play time';}
 el('n').addEventListener('input',()=>{stop();n=+el('n').value;draw();});
 el('w').addEventListener('input',()=>{w=+el('w').value;draw();});
 el('play').addEventListener('click',()=>{if(timer){stop();return;}if(n===40)n=1;el('play').textContent='Pause';timer=setInterval(()=>{n++;draw();if(n>=40){stop();}},window.matchMedia('(prefers-reduced-motion: reduce)').matches?1200:650);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 new MutationObserver(()=>{if(document.body.classList.contains('split-view')&&!root.closest('.entry').classList.contains('is-selected'))stop();}).observe(root.closest('.entry'),{attributes:true,attributeFilter:['class']});
 new ResizeObserver(draw).observe(root);draw();return true;
}
