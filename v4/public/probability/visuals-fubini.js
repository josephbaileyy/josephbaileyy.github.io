const GREEN='#315e4e',GOLD='#986729',PALE='#d8e8df',INK='#343a35',BLUE='#326b85',PURPLE='#696191';
const fmt=n=>Math.abs(n)<1e-12?'0':Number(n.toPrecision(4)).toString();
const text=(x,y,s,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const line=(x,y,u,v,color=INK)=>`<line x1="${x}" y1="${y}" x2="${u}" y2="${v}" stroke="${color}" stroke-width="2"/>`;
export const fubiniSteps=[
 {label:'Read a slice',title:'From two curves to one gap.',
  body:'The blue lower curve is f(x) = x²; the purple upper curve is g(x) = 2x − x². Both rise, but their gap grows and then shrinks. Fix x: the left plot locates the two endpoints; the right plot records their difference, L(x) = g(x) − f(x).',
  question:'Move x. Watch the two endpoints on the left become one height on the right.',
  why:'At x = 0.4 the slice runs from y = 0.16 to y = 0.64. Its length is 0.48, so the right graph contains the point (0.4, 0.48). Integrating over y removes the y-coordinate and produces one number for each x: L(x) = ∫h(x,y)dy = g(x) − f(x) = 2x − 2x². The right graph moves every slice down to start at zero, preserving its length. For a general h this output is a weighted integral; it is a length here because h is an indicator.'},
 {label:'Add the slices',title:'Slide the slices down. Keep the same area.',
  body:'Imagine sliding every vertical slice down to start at zero. The rising band becomes the arch under L(x), with the same slice lengths at every x. A thin strip contributes approximately L(x)Δx. The gold shading tracks the accumulated area in both pictures.',
  question:'Play the sweep. Both gold areas grow together to 1/3.',
  why:'Up to x = t, the area is ∫₀ᵗ(2x − 2x²)dx = t² − 2t³/3. At t = 0.4 this is about 0.1173; at t = 1 it is 1/3. The first plot keeps the region’s original location. The second puts its slice lengths above a common baseline, making the outer integral an ordinary area under a curve.'},
 {label:'Change the order',title:'A new slice function. The same region and total.',
  body:'Switch to horizontal slices of the same curved band. Solving the two boundary equations for x gives endpoints 1 − √(1 − y) and √y. Their gap is √y + √(1 − y) − 1. This is a different length curve, but adding all its slices must recover the same area.',
  question:'Predict: does changing the order change the final integral?',
  why:'Vertical slices give ∫₀¹(2x − 2x²)dx = 1/3. Horizontal slices give ∫₀¹[√y + √(1 − y) − 1]dy = 2/3 + 2/3 − 1 = 1/3. Fubini equates these totals; it does not say that the two intermediate functions are equal. Here h is nonnegative and measurable, and both factors are finite length measures.'}
];

// R = {(x,y) in [0,1]^2 : x^2 <= y <= 2x-x^2}.
// Slice integrals and primitives are analytic; polygons are only for drawing.
export function fubiniSliceView({stage=0,t=.4,dir=0}={}){
 const horizontal=stage===2&&!!dir;
 const lower=u=>horizontal?1-Math.sqrt(1-u):u*u;
 const upper=u=>horizontal?Math.sqrt(u):2*u-u*u;
 const profile=u=>Math.max(0,upper(u)-lower(u));
 const primitive=u=>horizontal?2/3*(u**1.5+1-(1-u)**1.5)-u:u*u-2*u**3/3;
 const polygonTo=cut=>{
  const us=Array.from({length:161},(_,i)=>cut*i/160);
  const coords=(u,v)=>horizontal?[v,u]:[u,v];
  return [...us.map(u=>coords(u,lower(u))),...us.toReversed().map(u=>coords(u,upper(u)))];
 };
 return {horizontal,bottom:lower(t),top:upper(t),length:profile(t),profile,total:1/3,swept:primitive(t),polygon:polygonTo(1),sweptPolygon:polygonTo(t)};
}

export function fubiniFrame({stage=0,t=.4,dir=0,view=0}){
 const m=fubiniSliceView({stage,t,dir}),horizontal=m.horizontal;
 const X=x=>48+190*x,Y=y=>215-190*y;
 const polygon=(points,color,opacity=1)=>`<polygon points="${points.map(([x,y])=>`${X(x)},${Y(y)}`).join(' ')}" fill="${color}" opacity="${opacity}"/>`;
 let region=`<rect x="48" y="25" width="190" height="190" fill="#f0f2eb"/>`+polygon(m.polygon,PALE);
 if(stage>0)region+=polygon(m.sweptPolygon,GOLD,.35);
 region+=`<path d="M48 215 Q143 215 238 25" fill="none" stroke="${BLUE}" stroke-width="2.5"/><path d="M48 215 Q143 25 238 25" fill="none" stroke="${PURPLE}" stroke-width="2.5"/>`;
 region+=line(48,215,238,215)+line(48,25,48,215);
 if(horizontal)region+=line(X(m.bottom),Y(t),X(m.top),Y(t),GOLD);
 else region+=line(X(t),Y(m.bottom),X(t),Y(m.top),GOLD);
 for(const u of [m.bottom,m.top])region+=`<circle cx="${X(horizontal?u:t)}" cy="${Y(horizontal?t:u)}" r="3.5" fill="white" stroke="${GOLD}" stroke-width="2"/>`;
 region+=text(48,239,'0')+text(238,239,'x = 1','end')+text(39,30,'y = 1','end');
 const P=u=>48+190*u,Q=l=>215-190*l;
 const us=Array.from({length:161},(_,i)=>i/160),cut=us.filter(u=>u<t).concat(t);
 const points=us.map(u=>`${P(u)},${Q(m.profile(u))}`);
 let profile=`<polygon points="48,215 ${points.join(' ')} 238,215" fill="${PALE}"/>`;
 if(stage>0)profile+=`<polygon points="48,215 ${cut.map(u=>`${P(u)},${Q(m.profile(u))}`).join(' ')} ${P(t)},215" fill="${GOLD}" opacity=".35"/>`;
 profile+=line(48,25,48,215)+line(48,215,238,215)+`<polyline points="${points.join(' ')}" fill="none" stroke="${GREEN}" stroke-width="3"/>`+line(P(t),215,P(t),Q(m.length),GOLD)+`<circle cx="${P(t)}" cy="${Q(m.length)}" r="4.5" fill="${GOLD}"/>`;
 profile+=text(39,30,'L = 1','end')+text(39,220,'0','end')+text(48,239,'0')+text(238,239,horizontal?'y = 1':'x = 1','end');
 const diagram=(body,label)=>`<svg viewBox="0 0 275 250" role="img" aria-label="${label}">${body}</svg>`;
 const drawing=`<div class="fubini-pictures" data-picture="${view}"><section class="fubini-region"><h5>Original region · positions (x, y)</h5>${diagram(region,'Region between y=x² and y=2x−x² with both endpoints of a selected slice')}<p class="fubini-axis-reading">${horizontal?'x':'y'} runs from ${fmt(m.bottom)} to ${fmt(m.top)}</p></section><section class="fubini-profile"><h5>After integrating · length L</h5>${diagram(profile,'Slice lengths moved down to a common zero baseline')}<p class="fubini-axis-reading">${fmt(m.top)} − ${fmt(m.bottom)} = <b>${fmt(m.length)}</b></p></section></div>`;
 const formula=horizontal?'√t + √(1 − t) − 1':'(2t − t²) − t² = 2t − 2t²';
 const result=`<div class="fubini-reading"><span>At ${horizontal?'y':'x'} = ${fmt(t)}: <b>L = ${fmt(m.length)}</b></span><span>${stage===0?'Top − bottom':`Area up to t: <b>${fmt(m.swept)}</b>`}</span></div><div class="fubini-equation">${stage===0?`L(t) = ${formula}`:`∫₀¹ L(${horizontal?'y':'x'}) d${horizontal?'y':'x'} = 1/3 = ∫∫ h`}</div>`;
 return [drawing,result];
}

export function mountFubini(root,{setup,range}){
 root.classList?.add('fubini-lab');
 const selector=(name,label,options)=>`<select hidden aria-label="${label}" data-control="${name}">${options.map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select>`;
 setup(root,selector('stage','Walkthrough step',fubiniSteps.map(s=>s.label))+selector('view','Picture',['Region','Length graph'])+range('t','Slice position t',0,1,.4,.01)+`<label class="fubini-direction" hidden>Direction<select aria-label="Slice direction" data-control="dir"><option value="0">Vertical</option><option value="1">Horizontal</option></select></label>`,fubiniFrame);
 const controls=root.querySelector('.controls');if(!controls)return true;
 const stageInput=controls.querySelector('[data-control="stage"]'),viewInput=controls.querySelector('[data-control="view"]'),tInput=controls.querySelector('[data-control="t"]');
 const context=document.createElement('div');context.className='walkthrough-context';
 context.innerHTML=`<div class="walkthrough-steps" role="group" aria-label="Fubini walkthrough">${fubiniSteps.map((s,i)=>`<button type="button" data-step="${i}" aria-pressed="${i===0}"><span>${i+1}</span> ${s.label}</button>`).join('')}</div><div class="walkthrough-anchor"></div>`;
 controls.before(context);
 const story=document.createElement('section');story.className='walkthrough-story';context.after(story);
 const more=document.createElement('details');more.className='walkthrough-more';more.innerHTML='<summary>Unpack this step</summary><p></p>';root.append(more);
 const challenge=document.createElement('section');challenge.className='walkthrough-challenge';challenge.hidden=true;
 challenge.innerHTML='<div><button type="button" data-answer="same">Same total</button><button type="button" data-answer="different">Different total</button></div><p role="status" class="walkthrough-feedback"></p>';more.before(challenge);
 const pictures=document.createElement('div');pictures.className='fubini-picture-switch';pictures.setAttribute('role','group');pictures.setAttribute('aria-label','Picture to show');pictures.innerHTML='<button type="button" data-view="0" aria-pressed="true">Region</button><button type="button" data-view="1" aria-pressed="false">Length graph</button>';controls.after(pictures);
 const actions=document.createElement('div');actions.className='fubini-sweep-actions';actions.innerHTML='<button type="button" data-sweep="play" aria-pressed="false">Play sweep</button><button type="button" data-sweep="finish">Finish</button>';controls.append(actions);
 const playButton=actions.querySelector('[data-sweep="play"]');let timer=null,stage=-1;
 const stop=()=>{clearInterval(timer);timer=null;playButton.textContent='Play sweep';playButton.setAttribute('aria-pressed','false')};
 const update=()=>root.dispatchEvent(new Event('input',{bubbles:true}));
 const sync=()=>{
  const next=+stageInput.value,changed=next!==stage;
  if(changed){
   stop();stage=next;viewInput.value=stage===0?'0':'1';
   more.open=false;challenge.hidden=stage!==2;challenge.querySelector('.walkthrough-feedback').textContent='';
   context.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.step===stage));
   controls.querySelector('.fubini-direction').hidden=stage!==2;
   actions.hidden=stage!==1;
  }
  if(changed){
   const s=fubiniSteps[stage];
   story.innerHTML=`<h4>${s.title}</h4><p>${s.body}</p><p class="walkthrough-task">${s.question}</p>`;
   more.querySelector('p').textContent=s.why;
  }
  context.querySelector('.walkthrough-anchor').textContent='h = 1 if x² ≤ y ≤ 2x − x², 0 otherwise · [0,1]² · length measures';
  pictures.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===viewInput.value));
  root.querySelector('.fubini-pictures').dataset.picture=viewInput.value;
 };
 root.addEventListener('input',sync);root.addEventListener('change',sync);
 context.addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(!b)return;stageInput.value=b.dataset.step;update();root.scrollIntoView({block:'start',behavior:'instant'})});
 pictures.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;viewInput.value=b.dataset.view;update()});
 challenge.addEventListener('click',e=>{const b=e.target.closest('[data-answer]');if(!b)return;challenge.querySelector('.walkthrough-feedback').textContent=b.dataset.answer==='same'?'Yes. Both orders give 1/3. Switch direction and compare the two length curves.':'The intermediate curve changes, but the total stays 1/3. Each order adds all of the same nonnegative h.'});
 actions.addEventListener('click',e=>{
  const b=e.target.closest('[data-sweep]');if(!b)return;
  if(b.dataset.sweep==='finish'){stop();tInput.value='1';update();return}
  if(timer){stop();return}if(+tInput.value>=1)tInput.value='0';playButton.textContent='Pause';playButton.setAttribute('aria-pressed','true');
  timer=setInterval(()=>{if(!root.isConnected||document.hidden||(document.body.classList.contains('split-view')&&!root.closest('.entry')?.classList.contains('is-selected'))||+tInput.value>=1){stop();return}tInput.value=String(Math.min(1,+tInput.value+.02));update()},80);
 });
 root.addEventListener('keydown',e=>{if(e.key==='Escape')stop()});tInput.addEventListener('pointerdown',stop);
 // Print is a linear explanation, so every stage remains available on paper.
 const transcript=document.createElement('div');transcript.className='walkthrough-print';transcript.innerHTML=fubiniSteps.map((s,i)=>`<section><h4>${i+1} · ${s.title}</h4><p>${s.body}</p>${fubiniFrame({stage:i,t:.4,dir:0})[0]}<p>${s.why}</p></section>`).join('');root.append(transcript);
 sync();return true;
}
