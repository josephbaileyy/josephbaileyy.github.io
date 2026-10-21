import {fubiniSlices} from './independence-models.js?v=fubini3';
const GREEN='#315e4e',GOLD='#986729',PALE='#d8e8df',INK='#343a35';
const fmt=n=>Math.abs(n)<1e-12?'0':Number(n.toPrecision(4)).toString();
const text=(x,y,s,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const line=(x,y,u,v,color=INK)=>`<line x1="${x}" y1="${y}" x2="${u}" y2="${v}" stroke="${color}" stroke-width="2"/>`;
export const fubiniSteps=[
 {label:'Read a slice',title:'Fix x. Let y run.',
  body:'The left y-axis tells you where a point is in the square. The right L-axis tells you the length of the whole slice at each x. These are different jobs. Here each slice starts at y = 0, so its length happens to equal its top y-coordinate. Try the slice above zero to separate those numbers.',
  question:'Compare the two examples: read the slice’s endpoints, then subtract to find L.',
  why:'At x = 0.4, the original slice contains all y from 0 to 0.6. Each y is a different point along that slice. Integrating over y produces one number for the entire slice: L(0.4) = 0.6 − 0 = 0.6. The right graph records that result as the point (0.4, 0.6). If the bottom is y = 0.2 instead, the top stays 0.6 but the length is 0.4. For a general h, the right-hand height is ∫h(x,y)dy; it is a geometric length here because h is an indicator.'},
 {label:'Add the slices',title:'Give the lengths their widths.',
  body:'A thin strip near x has height L(x) and width Δx, so its area is approximately L(x)Δx. Adding narrower and narrower strips gives the outer integral. The gold shading follows this accumulation in both pictures: one collects part of the original region; the other collects area under the length graph.',
  question:'Sweep to 1 and compare the gold area in the region and length graph.',
  why:'For this triangle L(x) = 1 − x. Up to a cutoff t, the accumulated area is ∫₀ᵗ(1 − x) dx = t − t²/2; at t = 0.4 it is 0.32. The outer integral runs over every x, so the full area is ∫₀¹(1 − x) dx = 1/2. Fubini identifies this iterated integral with the integral of h on the square. Neither the length at one x nor a plain sum of lengths includes the widths needed to compute area.'},
 {label:'Change the order',title:'Different intermediate functions. One total.',
  body:'Now use the uneven triangle x + 2y ≤ 1. Vertical slices have length (1 − x)/2. Horizontal slices have length max(1 − 2y, 0), and disappear above y = 1/2. Switch direction: the length graph changes because you are integrating out a different variable. The region itself stays fixed.',
  question:'Predict: does changing the order change the final integral?',
  why:'Vertically, ∫₀¹[(1 − x)/2] dx = 1/4. Horizontally, ∫₀¹ max(1 − 2y, 0) dy = ∫₀¹ᐟ²(1 − 2y) dy = 1/4. In the first calculation x labels the slices and y is integrated out; in the second, y labels the slices and x is integrated out. Fubini equates the two totals, not the two slice-length functions. This example uses nonnegative h and finite length measures, so it satisfies the theorem’s hypotheses.'}
];

// The raised-floor example stays inside the same unit square. Translate the
// triangle x+u<=1-b by y=u+b, so its sections have length max(1-b-x,0).
export function fubiniSliceView({stage=0,t=.4,dir=0,floor=0}){
 const bottom=stage===0&&floor?.2:0,a=stage===2?2:1,horizontal=stage===2&&!!dir;
 const m=fubiniSlices(1-bottom,a,t,Number(horizontal));
 const translate=points=>points.map(([x,y])=>[x,y+bottom]);
 return {...m,bottom,top:bottom+m.length,horizontal,polygon:translate(m.polygon),sweptPolygon:translate(m.sweptPolygon)};
}

export function fubiniFrame({stage=0,t=.4,dir=0,view=0,floor=0}){
 const m=fubiniSliceView({stage,t,dir,floor}),horizontal=m.horizontal;
 const X=x=>48+190*x,Y=y=>215-190*y;
 const polygon=(points,color,opacity=1)=>points.length?`<polygon points="${points.map(([x,y])=>`${X(x)},${Y(y)}`).join(' ')}" fill="${color}" opacity="${opacity}"/>`:'';
 let region=`<rect x="48" y="25" width="190" height="190" fill="#f0f2eb"/>`+polygon(m.polygon,PALE);
 if(stage>0)region+=polygon(m.sweptPolygon,GOLD,.35);
 region+=line(48,215,238,215)+line(48,25,48,215);
 if(m.bottom)region+=`<line x1="48" y1="${Y(m.bottom)}" x2="238" y2="${Y(m.bottom)}" stroke="${GOLD}" stroke-dasharray="4 4"/>`;
 if(m.length>0)region+=horizontal?line(48,Y(t),X(m.length),Y(t),GOLD):line(X(t),Y(m.bottom),X(t),Y(m.top),GOLD);
 if(!horizontal&&m.length>0)for(const y of [m.bottom,m.top])region+=`<circle cx="${X(t)}" cy="${Y(y)}" r="3.5" fill="white" stroke="${GOLD}" stroke-width="2"/>`;
 region+=text(48,239,'0')+text(238,239,'x = 1','end')+text(39,30,'y = 1','end');
 const P=u=>48+190*u,Q=l=>215-190*l;
 const a=stage===2?2:1,z=1-m.bottom;
 const knots=[0,1,...(horizontal?[z/a,(z-1)/a]:[z,z-a])].filter(u=>u>=0&&u<=1).sort((a,b)=>a-b);
 const points=knots.map(u=>`${P(u)},${Q(m.profile(u))}`),cut=[...knots.filter(u=>u<t),t];
 let profile=`<polygon points="48,215 ${points.join(' ')} 238,215" fill="${PALE}"/>`;
 if(stage>0)profile+=`<polygon points="48,215 ${cut.map(u=>`${P(u)},${Q(m.profile(u))}`).join(' ')} ${P(t)},215" fill="${GOLD}" opacity=".35"/>`;
 profile+=line(48,25,48,215)+line(48,215,238,215)+`<polyline points="${points.join(' ')}" fill="none" stroke="${GREEN}" stroke-width="3"/>`+line(P(t),215,P(t),Q(m.length),GOLD)+`<circle cx="${P(t)}" cy="${Q(m.length)}" r="4.5" fill="${GOLD}"/>`;
 profile+=text(39,30,'L = 1','end')+text(39,220,'0','end')+text(48,239,'0')+text(238,239,horizontal?'y = 1':'x = 1','end');
 const diagram=(body,label)=>`<svg viewBox="0 0 275 250" role="img" aria-label="${label}">${body}</svg>`;
 const drawing=`<div class="fubini-pictures" data-picture="${view}"><section class="fubini-region"><h5>y = position in the square</h5>${diagram(region,'y is a position coordinate; gold marks a whole slice')}<p class="fubini-axis-reading">${m.length>0?(horizontal?`x runs from 0 to ${fmt(m.length)}`:`y runs from ${fmt(m.bottom)} to ${fmt(m.top)}`):'No positive-length slice here'}</p></section><section class="fubini-profile"><h5>L = whole slice’s length</h5>${diagram(profile,'L is the result of integrating the whole slice')}<p class="fubini-axis-reading">${!horizontal&&m.length>0?`${fmt(m.top)} − ${fmt(m.bottom)} = `:''}L(${fmt(t)}) = ${fmt(m.length)}</p></section></div>`;
 const inner=horizontal?'∫₀¹ h(x,t) dx':'∫₀¹ h(t,y) dy';
 const result=`<div class="fubini-reading"><span>At ${horizontal?'y':'x'} = ${fmt(t)}: <b>L = ${fmt(m.length)}</b></span><span>${stage===0?'Inner integral':`Area up to t: <b>${fmt(m.swept)}</b>`}</span></div><div class="fubini-equation">${stage===0?`L(t) = ${inner} = ${m.bottom?'max(0.8 − t, 0)':'1 − t'}`:`∫₀¹ L(${horizontal?'y':'x'}) d${horizontal?'y':'x'} = ${fmt(m.total)} = ∫∫ h`}</div>`;
 return [drawing,result];
}

export function mountFubini(root,{setup,range}){
 root.classList?.add('fubini-lab');
 const selector=(name,label,options)=>`<select hidden aria-label="${label}" data-control="${name}">${options.map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select>`;
 setup(root,selector('stage','Walkthrough step',fubiniSteps.map(s=>s.label))+selector('view','Picture',['Region','Length graph'])+range('t','Slice position t',0,1,.4,.01)+`<label class="fubini-floor">Example<select aria-label="Slice example" data-control="floor"><option value="0">Starts at y = 0</option><option value="1">Starts at y = 0.2</option></select></label><label class="fubini-direction" hidden>Direction<select aria-label="Slice direction" data-control="dir"><option value="0">Vertical</option><option value="1">Horizontal</option></select></label>`,fubiniFrame);
 const controls=root.querySelector('.controls');if(!controls)return true;
 const stageInput=controls.querySelector('[data-control="stage"]'),viewInput=controls.querySelector('[data-control="view"]'),tInput=controls.querySelector('[data-control="t"]'),floorInput=controls.querySelector('[data-control="floor"]');
 const context=document.createElement('div');context.className='walkthrough-context';
 context.innerHTML=`<div class="walkthrough-steps" role="group" aria-label="Fubini walkthrough">${fubiniSteps.map((s,i)=>`<button type="button" data-step="${i}" aria-pressed="${i===0}"><span>${i+1}</span> ${s.label}</button>`).join('')}</div><div class="walkthrough-anchor"></div>`;
 controls.before(context);
 const story=document.createElement('section');story.className='walkthrough-story';context.after(story);
 const more=document.createElement('details');more.className='walkthrough-more';more.innerHTML='<summary>Unpack this step</summary><p></p>';root.append(more);
 const challenge=document.createElement('section');challenge.className='walkthrough-challenge';challenge.hidden=true;
 challenge.innerHTML='<div><button type="button" data-answer="same">Same total</button><button type="button" data-answer="different">Different total</button></div><p role="status" class="walkthrough-feedback"></p>';more.before(challenge);
 const pictures=document.createElement('div');pictures.className='fubini-picture-switch';pictures.setAttribute('role','group');pictures.setAttribute('aria-label','Picture to show');pictures.innerHTML='<button type="button" data-view="0" aria-pressed="true">Region</button><button type="button" data-view="1" aria-pressed="false">Length graph</button>';controls.after(pictures);
 const actions=document.createElement('div');actions.className='fubini-sweep-actions';actions.innerHTML='<button type="button" data-sweep="play" aria-pressed="false">Play sweep</button><button type="button" data-sweep="finish">Finish</button>';controls.append(actions);
 const playButton=actions.querySelector('[data-sweep="play"]');let timer=null,stage=-1,shownFloor=-1;
 const stop=()=>{clearInterval(timer);timer=null;playButton.textContent='Play sweep';playButton.setAttribute('aria-pressed','false')};
 const update=()=>root.dispatchEvent(new Event('input',{bubbles:true}));
 const sync=()=>{
  const next=+stageInput.value,changed=next!==stage;
  if(changed){
   stop();stage=next;viewInput.value=stage===0?'0':'1';
   if(stage!==0)floorInput.value='0';
   more.open=false;challenge.hidden=stage!==2;challenge.querySelector('.walkthrough-feedback').textContent='';
   context.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.step===stage));
   controls.querySelector('.fubini-direction').hidden=stage!==2;
   controls.querySelector('.fubini-floor').hidden=stage!==0;
   actions.hidden=stage!==1;
  }
  const raised=stage===0&&+floorInput.value===1;
  if(changed||Number(raised)!==shownFloor){
   shownFloor=Number(raised);const s=raised?{...fubiniSteps[0],
    body:'Now the green region starts at y = 0.2. At x = 0.4 its top is still y = 0.6, but its length is 0.6 − 0.2 = 0.4. The left picture locates both endpoints. The right picture records their difference as one height: L(0.4) = 0.4.',
    question:'Move t: compare the top y-coordinate with the length L(t).',
    why:'Here h is 1 where y ≥ 0.2 and x + y ≤ 1, and 0 elsewhere in the square. For x ≤ 0.8, the y-interval is [0.2, 1 − x], so L(x) = (1 − x) − 0.2 = 0.8 − x. For x > 0.8 the slice is empty and L(x) = 0. The left vertical axis describes positions of individual points. The right vertical axis describes the integral over all y at a fixed x. L is the output of that integration, not a second position coordinate.'}:fubiniSteps[stage];
   story.innerHTML=`<h4>${s.title}</h4><p>${s.body}</p><p class="walkthrough-task">${s.question}</p>`;
   more.querySelector('p').textContent=s.why;
  }
  context.querySelector('.walkthrough-anchor').textContent=`h = 1{${raised?'y ≥ 0.2, ':''}x + ${stage===2?'2y':'y'} ≤ 1} on [0,1]² · both measures are length`;
  pictures.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===viewInput.value));
  root.querySelector('.fubini-pictures').dataset.picture=viewInput.value;
 };
 root.addEventListener('input',sync);root.addEventListener('change',sync);
 context.addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(!b)return;stageInput.value=b.dataset.step;update();root.scrollIntoView({block:'start',behavior:'instant'})});
 pictures.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;viewInput.value=b.dataset.view;update()});
 challenge.addEventListener('click',e=>{const b=e.target.closest('[data-answer]');if(!b)return;challenge.querySelector('.walkthrough-feedback').textContent=b.dataset.answer==='same'?'Yes. Both orders give 1/4. Switch direction and compare the two length curves.':'The intermediate curve changes, but the total stays 1/4. Each order adds all of the same nonnegative h.'});
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
