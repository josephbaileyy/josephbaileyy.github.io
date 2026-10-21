import {fubiniSlices} from './independence-models.js?v=fubini3';
const GREEN='#315e4e',GOLD='#986729',PALE='#d8e8df',INK='#343a35';
const fmt=n=>Math.abs(n)<1e-12?'0':Number(n.toPrecision(4)).toString();
const text=(x,y,s,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const line=(x,y,u,v,color=INK)=>`<line x1="${x}" y1="${y}" x2="${u}" y2="${v}" stroke="${color}" stroke-width="2"/>`;
export const fubiniSteps=[
 {label:'Read a slice',title:'Fix x. Let y run.',
  body:'Here h is 1 inside the triangle x + y ≤ 1 and 0 outside it. Fixing x leaves y free to run from 0 to 1 − x. The inner integral adds those 1s along y, so it returns the segment’s length. That length becomes a height on the length graph.',
  question:'Move t and compare the gold segment with its point on the length graph.',
  why:'The two pictures have different vertical axes: the first shows y; the second shows the number L(x) produced by integrating over y. At x = 0.4 the segment reaches y = 0.6, so the dot is at (0.4, 0.6). We have replaced a function of two variables by a function of one variable. A single vertical line has area zero: 0.6 is a length, not an area contribution yet.'},
 {label:'Add the slices',title:'Give the lengths their widths.',
  body:'A thin strip near x has height L(x) and width Δx, so its area is approximately L(x)Δx. Adding narrower and narrower strips gives the outer integral. The gold shading follows this accumulation in both pictures: one collects part of the original region; the other collects area under the length graph.',
  question:'Sweep to 1 and compare the gold area in the region and length graph.',
  why:'For this triangle L(x) = 1 − x. Up to a cutoff t, the accumulated area is ∫₀ᵗ(1 − x) dx = t − t²/2; at t = 0.4 it is 0.32. The outer integral runs over every x, so the full area is ∫₀¹(1 − x) dx = 1/2. Fubini identifies this iterated integral with the integral of h on the square. Neither the length at one x nor a plain sum of lengths includes the widths needed to compute area.'},
 {label:'Change the order',title:'Different intermediate functions. One total.',
  body:'Now use the uneven triangle x + 2y ≤ 1. Vertical slices have length (1 − x)/2. Horizontal slices have length max(1 − 2y, 0), and disappear above y = 1/2. Switch direction: the length graph changes because you are integrating out a different variable. The region itself stays fixed.',
  question:'Predict: does changing the order change the final integral?',
  why:'Vertically, ∫₀¹[(1 − x)/2] dx = 1/4. Horizontally, ∫₀¹ max(1 − 2y, 0) dy = ∫₀¹ᐟ²(1 − 2y) dy = 1/4. In the first calculation x labels the slices and y is integrated out; in the second, y labels the slices and x is integrated out. Fubini equates the two totals, not the two slice-length functions. This example uses nonnegative h and finite length measures, so it satisfies the theorem’s hypotheses.'}
];

export function fubiniFrame({stage=0,t=.4,dir=0,view=0}){
 const a=stage===2?2:1,horizontal=stage===2&&!!dir,m=fubiniSlices(1,a,t,Number(horizontal));
 const X=x=>48+190*x,Y=y=>215-190*y;
 const polygon=(points,color,opacity=1)=>points.length?`<polygon points="${points.map(([x,y])=>`${X(x)},${Y(y)}`).join(' ')}" fill="${color}" opacity="${opacity}"/>`:'';
 let region=`<rect x="48" y="25" width="190" height="190" fill="#f0f2eb"/>`+polygon(m.polygon,PALE);
 if(stage>0)region+=polygon(m.sweptPolygon,GOLD,.35);
 region+=line(48,215,238,215)+line(48,25,48,215);
 region+=horizontal?line(48,Y(t),X(m.length),Y(t),GOLD):line(X(t),215,X(t),Y(m.length),GOLD);
 region+=text(48,239,'0')+text(238,239,'x = 1','end')+text(39,30,'y = 1','end');
 const P=u=>48+190*u,Q=l=>215-190*l;
 const knots=[0,1,...(horizontal?[1/a,0]:[1,1-a])].filter(u=>u>=0&&u<=1).sort((a,b)=>a-b);
 const points=knots.map(u=>`${P(u)},${Q(m.profile(u))}`),cut=[...knots.filter(u=>u<t),t];
 let profile=`<polygon points="48,215 ${points.join(' ')} 238,215" fill="${PALE}"/>`;
 if(stage>0)profile+=`<polygon points="48,215 ${cut.map(u=>`${P(u)},${Q(m.profile(u))}`).join(' ')} ${P(t)},215" fill="${GOLD}" opacity=".35"/>`;
 profile+=line(48,25,48,215)+line(48,215,238,215)+`<polyline points="${points.join(' ')}" fill="none" stroke="${GREEN}" stroke-width="3"/>`+line(P(t),215,P(t),Q(m.length),GOLD)+`<circle cx="${P(t)}" cy="${Q(m.length)}" r="4.5" fill="${GOLD}"/>`;
 profile+=text(39,30,'L = 1','end')+text(39,220,'0','end')+text(48,239,'0')+text(238,239,horizontal?'y = 1':'x = 1','end');
 const diagram=(body,label)=>`<svg viewBox="0 0 275 250" role="img" aria-label="${label}">${body}</svg>`;
 const drawing=`<div class="fubini-pictures" data-picture="${view}"><section class="fubini-region"><h5>Region · axes x and y</h5>${diagram(region,'Region with the selected gold slice')}</section><section class="fubini-profile"><h5>Length · axes ${horizontal?'y':'x'} and L</h5>${diagram(profile,'Each slice length becomes a graph height')}</section></div>`;
 const inner=horizontal?'∫₀¹ h(x,t) dx':'∫₀¹ h(t,y) dy';
 const result=`<div class="fubini-reading"><span>At ${horizontal?'y':'x'} = ${fmt(t)}: <b>L = ${fmt(m.length)}</b></span><span>${stage===0?'Inner integral':`Area up to t: <b>${fmt(m.swept)}</b>`}</span></div><div class="fubini-equation">${stage===0?`L(t) = ${inner} = 1 − t`:`∫₀¹ L(${horizontal?'y':'x'}) d${horizontal?'y':'x'} = ${fmt(m.total)} = ∫∫ h`}</div>`;
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
  const next=+stageInput.value;
  if(next!==stage){
   stop();stage=next;const s=fubiniSteps[stage];viewInput.value=stage===0?'0':'1';
   story.innerHTML=`<h4>${s.title}</h4><p>${s.body}</p><p class="walkthrough-task">${s.question}</p>`;
   more.querySelector('p').textContent=s.why;more.open=false;
   challenge.hidden=stage!==2;challenge.querySelector('.walkthrough-feedback').textContent='';
   context.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.step===stage));
   controls.querySelector('.fubini-direction').hidden=stage!==2;
   actions.hidden=stage!==1;
  }
  context.querySelector('.walkthrough-anchor').textContent=`h = 1{x + ${stage===2?'2y':'y'} ≤ 1} on [0,1]² · both measures are length`;
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
