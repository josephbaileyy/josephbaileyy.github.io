import {cdfExperiment} from './intuition-models.js';
const r=String.raw;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=s=>s.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g,esc);
const eq=s=>`<div class="rr-equation">${esc('$'+s+'$')}</div>`;
const typeset=node=>globalThis.renderMathInElement?.(node,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});
const fmt=n=>Number(n.toFixed(4)).toString();
const text=(x,y,s,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${esc(s)}</text>`;

// One fixed outcome, with an explicitly specified infinite continuation.
// Every later even term rises toward 1; every later odd term is at least 1.
export function tailRemoval(n=1){
  const value=k=>(k%2?2:1)-1/k;
  const witness=n+(n%2),minimum=value(witness);
  return {n,value,witness,minimum,nextWitness:n+1+((n+1)%2),nextMinimum:value(n+1+((n+1)%2)),
    values:Array.from({length:8},(_,i)=>value(i+1))};
}

export function tailRemovalPicture(n=1){
  const m=tailRemoval(n),X=k=>55+(k-1)*54,Y=v=>220-90*v;
  let body=`<rect x="${X(n)-20}" y="24" width="${465-X(n)+20}" height="196" fill="var(--pale)"/><path d="M40 24V220H466" stroke="currentColor" fill="none"/>`;
  for(const v of [0,.5,1,1.5,2])body+=text(32,Y(v)+4,v,'end');
  body+=text(40,15,'Value fₖ(s) at one fixed outcome s');
  body+=`<path d="M${X(n)-20} ${Y(m.minimum)}H466" stroke="#986729" stroke-width="2" stroke-dasharray="5 4"/>`;
  for(let k=1;k<=8;k++){
    const removed=k<n;
    body+=`<g data-index="${k}" opacity="${removed?.25:1}"><path d="M${X(k)} 220V${Y(m.value(k))}" stroke="#9ba69f"/><circle cx="${X(k)}" cy="${Y(m.value(k))}" r="${k===m.witness?7:5}" fill="${k===m.witness?'#986729':'#315e4e'}"/>${removed?`<path d="M${X(k)-8} ${Y(m.value(k))-8}l16 16" stroke="currentColor" stroke-width="2"/>`:''}</g>`;
    body+=text(X(k),242,k,'middle');
  }
  body+=text(465,257,'index k','end')+text(477,135,'…');
  return `<svg viewBox="0 0 500 270" role="img" aria-label="Fixed sequence values, with indices below ${n} discarded. The exact tail infimum is ${fmt(m.minimum)} at index ${m.witness}.">${body}</svg>`;
}

function fatouProof(){
  return `<div class="rr-proof-chain"><section><h3>Construct the increasing sequence we need.</h3>${eq(r`h_n=\inf_{k\ge n}f_k\quad\uparrow\quad\liminf_k f_k`)}<p>For every outcome, a smaller tail has an infimum at least as large. Its limit is liminf fₖ by definition. Countable infima are measurable; when fₖ ≥ 0, the hₙ are nonnegative too.</p></section><section><h3>Apply MON to this sequence, then compare.</h3><div class="rr-justified"><div>${eq(r`\int\liminf f_k=\lim_n\int h_n`)}<span>MON: the hₙ are nonnegative and increasing.</span></div><div>${eq(r`\lim_n\int h_n\le\liminf_n\int f_n`)}<span>Monotonicity: hₙ ≤ fₙ at every n.</span></div></div><p>The construction supplies the monotonicity missing from the original sequence. These two steps prove nonnegative Fatou.</p></section></div><details class="rr-extension"><summary>How the integrable lower bound handles signed functions</summary><p>${rich(r`For $f_n\ge g$ a.e. with $g\in L^1$, remove the union of the exceptional null sets and put $q_n=(f_n-g)_+$. Then $f_n=g+q_n$ there. Apply nonnegative Fatou to the qₙ and add the finite number $\int g$ using linearity. Negating the sequence gives reverse Fatou under an integrable upper bound.`)}</p></details>`;
}

function mountFatou(root){
  root.innerHTML=`<p class="rr-lead">MON needs an increasing sequence. The original fₙ may oscillate, so Fatou’s proof builds increasing <em>lower bounds</em> instead.</p>${eq(r`h_n(s)=\inf_{k\ge n}f_k(s)`)}<p>Fix one outcome s: each dot is one function’s value fₖ(s) there. Remove the first value while keeping all later values fixed. <strong>Can the infimum go down?</strong></p><div class="rr-tail-drawing"></div><p class="rr-tail-value"></p><div class="rr-actions"><button type="button" data-remove>Remove f₁(s)</button><button type="button" data-reset>Start over</button></div><p class="rr-change" role="status" aria-live="polite"></p><p class="rr-caption">Crossed-out dots have left the tail. The gold line is its infimum. Later even values keep rising to 1, and later odd values rise to 2.</p><details class="rr-example-formula"><summary>The exact sequence used here</summary>${eq(r`f_k(s)=\begin{cases}1-1/k,&k\text{ even},\\2-1/k,&k\text{ odd}.\end{cases}`)}<p>Every tail has infinitely many even terms. Their first remaining value is the smallest, and every odd term is at least 1. The gold line therefore uses the exact infinite-tail infimum.</p></details><div class="rr-print-tail"><h3>Remove a value; keep all later values fixed.</h3>${tailRemovalPicture(1)}<p>Removing f₁(s)=1 leaves f₂(s)=1/2, so the infimum stays 1/2. Removing f₂(s) then leaves f₄(s)=3/4 as the minimum, so the infimum rises.</p>${tailRemovalPicture(3)}</div>${fatouProof()}`;
  let n=1;
  const draw=root.querySelector('.rr-tail-drawing'),value=root.querySelector('.rr-tail-value'),remove=root.querySelector('[data-remove]'),status=root.querySelector('.rr-change');
  const update=()=>{
    const m=tailRemoval(n);draw.innerHTML=tailRemovalPicture(n);
    value.innerHTML=`Current tail: k ≥ ${n}. <strong>h${n}(s) = ${fmt(m.minimum)}</strong>, attained at f${m.witness}(s).`;
    remove.textContent=n<7?`Remove f${n}(s)`:'End of this preview';remove.disabled=n===7;
  };
  remove.addEventListener('click',()=>{
    if(n>=7)return;
    const before=tailRemoval(n),discarded=n;n++;
    const after=tailRemoval(n);
    status.textContent=`Removed f${discarded}(s) = ${fmt(before.value(discarded))}. ${after.minimum===before.minimum?`The minimum f${after.witness}(s) is still present, so the infimum stays ${fmt(after.minimum)}.`:`The smallest remaining value is f${after.witness}(s) = ${fmt(after.minimum)}, so the infimum rises from ${fmt(before.minimum)} to ${fmt(after.minimum)}.`}`;
    update();
  });
  root.querySelector('[data-reset]').addEventListener('click',()=>{n=1;status.textContent='';update()});
  update();typeset(root);
}

export function cdfSummary(alpha=1){
  const m=cdfExperiment(alpha,.5),included=m.values.filter(x=>x<=alpha),terms=m.masses.filter((_,i)=>m.values[i]<=alpha);
  return {...m,alpha,included,terms};
}

export function compactCDFPicture(alpha=1){
  const m=cdfSummary(alpha),X=x=>55+(x+2)*62,Y=p=>215-270*p;
  let body=`<path d="M55 35V215H427" fill="none" stroke="currentColor"/>`+text(55,18,'Probability mass')+text(47,220,'0','end');
  m.values.forEach((x,i)=>{
    const included=x<=alpha;
    body+=`<rect data-atom="${x}" x="${X(x)-18}" y="${Y(m.masses[i])}" width="36" height="${215-Y(m.masses[i])}" fill="${included?'#315e4e':'#cbd1cc'}"/><text x="${X(x)}" y="${Y(m.masses[i])-10}" text-anchor="middle">${m.masses[i]}</text>`+text(X(x),240,x,'middle');
  });
  body+=`<path d="M${X(alpha)} 28V220" stroke="#986729" stroke-width="2" stroke-dasharray="4 3"/>`+text(X(alpha),270,`α = ${fmt(alpha)}`,'middle')+text(455,240,'X','end');
  return `<svg viewBox="0 0 480 285" role="img" aria-label="Masses 0.2 at minus 1, 0.5 at 1, and 0.3 at 3. Count values at or left of alpha ${fmt(alpha)}; the cumulative mass is ${fmt(m.cdf)}.">${body}</svg>`;
}

function mountCDF(root){
  root.innerHTML=`<p class="rr-lead">Move α. The CDF adds the mass <strong>at or to its left</strong>.</p><div class="rr-cdf-drawing"></div><label class="rr-range">Include values up to α<input aria-label="Include values up to α" type="range" min="-2" max="4" step="0.01" value="1"></label><div class="rr-cdf-result" role="status" aria-live="polite"></div><p class="rr-caption">Green bars are included. The ≤ in the definition includes an atom exactly at α.</p><div class="rr-print-cdf">${compactCDFPicture(1)}${eq(r`F_X(1)=\mathbf P(X\le1)=0.2+0.5=0.7`)}<p>Just below 1, only the mass 0.2 is included. At 1, include the atom of mass 0.5 as well.</p></div>`;
  const input=root.querySelector('input'),draw=root.querySelector('.rr-cdf-drawing'),result=root.querySelector('.rr-cdf-result');let alpha=1,pointer=null;
  const update=()=>{
    const m=cdfSummary(alpha);draw.innerHTML=compactCDFPicture(alpha);
    result.innerHTML=eq(`F_X(${fmt(alpha)})=\\mathbf P(X\\le ${fmt(alpha)})=${m.terms.length>1?m.terms.map(fmt).join('+')+'=':''}${fmt(m.cdf)}`);typeset(result);
  };
  input.addEventListener('input',()=>{alpha=+input.value;update()});
  const move=e=>{
    if(pointer!==e.pointerId)return;
    const box=draw.querySelector('svg').getBoundingClientRect(),scale=Math.min(box.width/480,box.height/285),left=box.left+(box.width-480*scale)/2;
    alpha=Math.round(Math.max(-2,Math.min(4,((e.clientX-left)/scale-55)/62-2))*100)/100;input.value=alpha;update();
  };
  draw.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer=e.pointerId;draw.setPointerCapture(pointer);move(e)});
  draw.addEventListener('pointermove',move);
  const stop=e=>{if(pointer===e.pointerId){if(draw.hasPointerCapture(pointer))draw.releasePointerCapture(pointer);pointer=null}};
  draw.addEventListener('pointerup',stop);draw.addEventListener('pointercancel',stop);
  update();typeset(root.querySelector('.rr-print-cdf'));
}

export const machineBridges=[
  {operation:'Add the identities',from:'Indicators',to:'Simple functions',title:'Build a simple function out of indicators.',
   introduction:r`Write a simple function as $\varphi=\sum_i c_i\mathbf1_{B_i}$ with $c_i\ge0$. Each summand comes with a known identity. Add those identities.`,
   equations:[
     {formula:r`\mathbf P(\varphi)=\sum_i c_i\mathbf P(\mathbf1_{B_i})`,reason:'Linearity under P.'},
     {formula:r`\sum_i c_i\mathbf P(\mathbf1_{B_i})=\sum_i c_i\lambda(f\mathbf1_{B_i})`,reason:'Use the already-known indicator identity for each term.'},
     {formula:r`\sum_i c_i\lambda(f\mathbf1_{B_i})=\lambda\!\left(f\sum_i c_i\mathbf1_{B_i}\right)=\lambda(f\varphi)`,reason:'Linearity under λ recombines the same terms.'}
   ],coverage:r`Every nonnegative simple function with finite coefficients has the form $\varphi=\sum_i c_i\mathbf1_{B_i}$, with $c_i\ge0$ and measurable Bᵢ. This explains why knowing the indicator identities covers the whole class. If an extended simple function has an infinite coefficient, increase finite coefficients to it and use the MON argument in the next bridge. The product fφ need not be simple.`},
  {operation:'Pass the identities to the limit',from:'Simple functions',to:'Nonnegative functions',title:'Approximate h by simple functions whose identities are already known.',
   introduction:'Every nonnegative measurable h is an increasing limit of nonnegative simple functions. Choose 0 ≤ φₙ ↑ h. The first bridge gives P(φₙ) = λ(fφₙ) for every n; carry this equality to the limit on both sides.',
   equations:[],coverage:r`Every nonnegative measurable h admits increasing simple approximations. For example, take $\varphi_n=\min(2^n,2^{-n}\lfloor2^nh\rfloor)$, assigning $2^n$ where $h=\infty$. Nonnegative f preserves the increase: $f\varphi_n\uparrow fh$, with $0\cdot\infty=0$. MON therefore applies under P and under λ. Both limits may be infinite; no subtraction is involved.`},
  {operation:'Subtract finite identities',from:'Nonnegative functions',to:'P-integrable signed functions',title:'Use the nonnegative identity twice, then subtract.',
   introduction:'Write h = h₊ − h₋. Both parts belong to the class already reached by the second bridge. First establish that subtracting their integrals is allowed.',
   equations:[
     {formula:r`\mathbf P(|h|)=\lambda(f|h|)<\infty`,reason:'Apply the nonnegative identity to |h|. This makes both parts finite under both routes.'},
     {formula:r`\mathbf P(h_+)=\lambda(fh_+),\qquad \mathbf P(h_-)=\lambda(fh_-)`,reason:'Use the known identity separately for the two nonnegative parts.'},
     {formula:r`\mathbf P(h)=\mathbf P(h_+)-\mathbf P(h_-)=\lambda(fh_+)-\lambda(fh_-)=\lambda(fh)`,reason:'Subtract the two finite equalities using linearity.'}
   ],coverage:r`Every signed h with $\lambda(f|h|)<\infty$ has this positive/negative decomposition. The second bridge proves $\mathbf P(|h|)=\lambda(f|h|)$, so integrability under P follows from the exercise’s hypothesis. Because f≥0, $(fh)_+=fh_+$ and $(fh)_-=fh_-$. This is why the last subtraction recovers the desired identity without forming $\infty-\infty$.`}
];

function limitSquare(){
  return `<div class="rr-limit-square" aria-label="Equal simple-function integrals pass through monotone convergence on both sides"><div>${eq(r`\mathbf P(\varphi_n)`)}</div><span>=</span><div>${eq(r`\lambda(f\varphi_n)`)}</div><div class="rr-limit-arrow">↓ MON<br><small>φₙ ↑ h</small></div><span></span><div class="rr-limit-arrow">↓ MON<br><small>fφₙ ↑ fh, since f ≥ 0</small></div><div>${eq(r`\mathbf P(h)`)}</div><span>=</span><div>${eq(r`\lambda(fh)`)}</div></div><p class="rr-square-conclusion">Each pair is equal before taking limits. MON identifies both limits, so the equality survives.</p>`;
}

export function bridgeMarkup(i,print=false){
  const b=machineBridges[i];
  return `<h3>${b.title}</h3><p>${rich(b.introduction)}</p>${i===1?limitSquare():`<div class="rr-derivation">${b.equations.map(e=>`<div>${eq(e.formula)}<p>${e.reason}</p></div>`).join('')}</div>`}<details class="rr-coverage" ${print?'open':''}><summary>Why this reaches every function in the next class</summary><p>${rich(b.coverage)}</p></details>`;
}

function mountMachine(root){
  root.innerHTML=`<p class="rr-lead">We know the identity for indicators. <strong>How does that let us prove it for a much larger class?</strong></p><div class="rr-start">Starting point, supplied by the hypothesis:${eq(r`\mathbf P(\mathbf1_B)=\mathbf P(B)=\lambda(f\mathbf1_B)\quad\text{for every Borel }B`)}</div><p class="rr-map-instruction">Choose an arrow to follow how the known identities are carried into the next class.</p><div class="rr-machine-map" role="group" aria-label="Bridges between function classes"><span class="rr-class">Indicators</span>${machineBridges.map((b,i)=>`<button type="button" data-bridge="${i}" aria-pressed="${i===0}"><span class="rr-map-arrow" aria-hidden="true">→</span><span>${b.operation}</span></button><span class="rr-class">${b.to}</span>`).join('')}</div><div class="rr-bridge-panels">${machineBridges.map((_,i)=>`<section data-bridge-panel="${i}" ${i?'hidden':''}>${bridgeMarkup(i)}</section>`).join('')}</div><div class="rr-print-bridges">${machineBridges.map((b,i)=>`<section><h3>${b.from} → ${b.to}</h3>${bridgeMarkup(i,true)}</section>`).join('')}</div>`;
  root.querySelector('.rr-machine-map').addEventListener('click',e=>{
    const button=e.target.closest('[data-bridge]');if(!button)return;
    const selected=button.dataset.bridge;
    root.querySelectorAll('[data-bridge]').forEach(b=>b.setAttribute('aria-pressed',b===button));
    root.querySelectorAll('[data-bridge-panel]').forEach(p=>p.hidden=p.dataset.bridgePanel!==selected);
    root.dataset.bridge=selected;
  });
  root.dataset.bridge='0';typeset(root);
}

export function mountReasoningGuide(root,topic){
  root.classList.add('reasoning-guide');root.dataset.topic=topic;
  ({fatou:mountFatou,cdf:mountCDF,machine:mountMachine})[topic](root);
  if(topic==='fatou'){
    const extension=root.querySelector('.rr-extension');let wasOpen=false;
    window.addEventListener('beforeprint',()=>{wasOpen=extension.open;extension.open=true});
    window.addEventListener('afterprint',()=>extension.open=wasOpen);
  }
}

// Used by the same numbered-entry renderer as the other course visuals.
export function mountVisual(root,name){
  const topic={'guide-cdf':'cdf','guide-fatou':'fatou','guide-machine':'machine'}[name];
  if(!topic)return false;
  mountReasoningGuide(root,topic);return true;
}
