import {fubiniSliceView, fubiniFrame} from './visuals-fubini.js';

export const prototypeStyles = [
  {id:'manipulate', label:'Move the picture', precedent:'Red Blob Games', question:'Does moving the mathematical object make the invariant easier to see?', url:'https://www.redblobgames.com/making-of/diagram-design/'},
  {id:'article', label:'Read the connections', precedent:'Distill', question:'Do equations and pictures explain more when their parts are linked?', url:'https://distill.pub/2020/communicating-with-interactive-articles/'},
  {id:'predict', label:'Predict, then explore', precedent:'Mathigon / Nicky Case', question:'Does a prediction reveal a misconception without interrupting reading?', url:'https://mathigon.org/about'}
];
const fmt = n => Number(n.toFixed(4)).toString();
const clamp = n => Math.max(0, Math.min(1, n));
const range = (name, label, value) => `<label class="fp-range">${label}<input type="range" min="0" max="1" step="0.01" value="${value}" data-fp="${name}"><output>${fmt(value)}</output></label>`;
const directions = '<div class="fp-direction" role="group" aria-label="Slice direction"><button type="button" data-dir="0" aria-pressed="true">Vertical slices</button><button type="button" data-dir="1" aria-pressed="false">Horizontal slices</button></div>';
const model = (t, dir) => fubiniSliceView({stage:2, t, dir});
const totalEquation = '<p class="fp-formula">∫₀¹ (2x − 2x²) dx = ⅓ = ∫₀¹ (√y + √(1 − y) − 1) dy</p>';
const orderReason = '<p>The intermediate functions differ. Both totals measure the same region: h = 1 on R and 0 outside, with length measure on each axis. Its continuous boundaries make R Borel; h is nonnegative, so Fubini applies.</p>';
const sliceFormula = dir => dir ? 'Lᵧ(y) = √y − [1 − √(1 − y)]' : 'Lₓ(x) = (2x − x²) − x² = 2x − 2x²';
let instance = 0;

// Moving each section by the same amount at both endpoints preserves its length.
// These are translated sets; the original integrand h stays fixed throughout.
export function translatedSlice(t, dir, slide) {
  const m = model(t, dir);
  const offset = clamp(slide) * m.bottom;
  return {...m, lower:m.bottom-offset, upper:m.top-offset, offset};
}

function movingPicture(t, dir, slide) {
  const m = translatedSlice(t, dir, slide), horizontal = !!dir;
  const X = x => 52 + 320*x, Y = y => 354 - 320*y;
  const point = (u,v) => horizontal ? [X(v),Y(u)] : [X(u),Y(v)];
  const path = (fn, reverse=false) => Array.from({length:161},(_,i) => {
    const u = (reverse ? 160-i : i)/160;
    return point(u,fn(u)).join(',');
  }).join(' ');
  const section = u => translatedSlice(u,dir,slide);
  const polygon = `${path(u=>section(u).lower)} ${path(u=>section(u).upper,true)}`;
  const original = `${path(u=>model(u,dir).bottom)} ${path(u=>model(u,dir).top,true)}`;
  const a=point(t,m.lower), b=point(t,m.upper), originalA=point(t,m.bottom), originalB=point(t,m.top);
  const name = horizontal ? 'y' : 'x';
  return `<svg class="fp-movable" viewBox="0 0 410 400" data-drag="${horizontal?'y':'x'}" role="img" aria-label="${horizontal?'Horizontal':'Vertical'} sections slid toward zero; the selected section keeps length ${fmt(m.length)}"><title>Move the ${name}-position with the slider or drag across the picture.</title>
    <rect x="52" y="34" width="320" height="320" fill="var(--pale)" fill-opacity=".35"/>
    ${slide>0 ? `<polygon points="${original}" fill="none" stroke="#778179" stroke-dasharray="5 4"/>` : ''}
    <polygon points="${polygon}" fill="#d8e8df" stroke="#315e4e" stroke-width="2"/>
    <path d="M52 34V354H372" fill="none" stroke="currentColor"/>
    ${slide>0 ? `<path d="M${originalA}L${originalB}" stroke="#778179" stroke-width="2" stroke-dasharray="4 4"/>` : ''}
    <path d="M${a}L${b}" stroke="#986729" stroke-width="5"/>
    ${[a,b].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="var(--paper)" stroke="#986729" stroke-width="2"/>`).join('')}
    <circle cx="${(a[0]+b[0])/2}" cy="${(a[1]+b[1])/2}" r="15" fill="#986729" fill-opacity=".15"/>
    <text x="44" y="360" text-anchor="end">0</text><text x="372" y="378" text-anchor="end">x = 1</text><text x="44" y="28" text-anchor="end">y = 1</text>
    <text x="212" y="398" text-anchor="middle">${horizontal?'Slide left toward x = 0':'Slide down toward y = 0'}</text>
  </svg>`;
}

function bindRange(root, name, callback) {
  const input=root.querySelector(`[data-fp="${name}"]`);
  input.addEventListener('input',()=>{input.nextElementSibling.value=fmt(+input.value);callback(+input.value)});
  return input;
}

// Capture belongs to a persistent container, because the SVG is redrawn while dragging.
// Vertical dragging only handles horizontal slices; page scrolling remains possible otherwise.
function bindDrag(root, getDir, callback) {
  let pointer=null, start=null, svg=null;
  root.addEventListener('pointerdown',e=>{
    svg=e.target.closest('svg[data-drag]');
    if(!svg || e.button!==0)return;
    pointer=e.pointerId;start={x:e.clientX,y:e.clientY};
    if(e.pointerType!=='touch') {root.setPointerCapture(pointer);move(e)}
  });
  const move=e=>{
    if(pointer!==e.pointerId || !svg)return;
    if(e.pointerType==='touch' && Math.hypot(e.clientX-start.x,e.clientY-start.y)<8)return;
    if(e.pointerType==='touch' && !getDir() && Math.abs(e.clientY-start.y)>Math.abs(e.clientX-start.x)) {pointer=null;return}
    if(!root.hasPointerCapture(pointer))root.setPointerCapture(pointer);
    svg=root.querySelector('svg[data-drag]');
    if(!svg)return;
    const box=svg.getBoundingClientRect(), view=svg.viewBox.baseVal;
    // Preserve the actual viewBox fit rather than treating letterboxing as data.
    const scale=Math.min(box.width/view.width,box.height/view.height);
    const left=box.left+(box.width-view.width*scale)/2, top=box.top+(box.height-view.height*scale)/2;
    const x=(e.clientX-left)/scale, y=(e.clientY-top)/scale;
    const large=view.width===410;
    callback(clamp(getDir() ? ((large?354:215)-y)/(large?320:190) : (x-(large?52:48))/(large?320:190)));
  };
  root.addEventListener('pointermove',move);
  const end=e=>{if(e.pointerId!==pointer)return;if(root.hasPointerCapture(pointer))root.releasePointerCapture(pointer);pointer=null;svg=null};
  root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
}

function bindDirections(root, state, update) {
  root.querySelector('.fp-direction').addEventListener('click',e=>{
    const button=e.target.closest('[data-dir]');if(!button)return;
    state.dir=+button.dataset.dir;
    root.querySelectorAll('[data-dir]').forEach(b=>b.setAttribute('aria-pressed',b===button));
    update();
  });
}

function mountManipulation(root) {
  const state={t:.4,dir:0,slide:0};
  root.innerHTML=`<h3>What survives when you move every slice?</h3><p>Slide every section toward zero. Both endpoints move by the same amount, so their difference stays fixed.</p>${directions}
    <div class="fp-hands-workspace"><div class="fp-moving-drawing"></div><div class="fp-hands-reading">
    ${range('position','Slice position',.4)}${range('slide','Slide each section toward zero',0)}
    <p class="fp-drag-hint">Drag across the picture, or use the position slider.</p>
    <div class="fp-move-result" role="status" aria-live="polite"></div>
    <div class="fp-invariant"><strong>Area stays ⅓</strong><span>Every section keeps its length.</span></div></div></div>
    <details><summary>Why do the two orders agree?</summary>${totalEquation}${orderReason}<p>Sliding the sections constructs a new region with the same section lengths. At the end of the slide, those lengths start at zero. The original region R and its integrand h have not changed.</p></details>`;
  const draw=root.querySelector('.fp-moving-drawing'),result=root.querySelector('.fp-move-result');
  const update=()=>{
    const m=translatedSlice(state.t,state.dir,state.slide), coordinate=state.dir?'x':'y';
    draw.innerHTML=movingPicture(state.t,state.dir,state.slide);
    draw.style.touchAction=state.dir?'pan-x':'pan-y';
    result.innerHTML=`<p>At ${state.dir?'y':'x'} = <b>${fmt(state.t)}</b></p><p>Original ${coordinate}-endpoints: ${fmt(m.bottom)} → ${fmt(m.top)}</p><p>After sliding: ${fmt(m.lower)} → ${fmt(m.upper)}</p><p class="fp-numeric">Length = ${fmt(m.upper)} − ${fmt(m.lower)} = <strong>${fmt(m.length)}</strong></p><p class="fp-formula">${sliceFormula(state.dir)}</p>`;
  };
  const position=bindRange(root,'position',v=>{state.t=v;update()});
  bindRange(root,'slide',v=>{state.slide=v;update()});
  bindDirections(root,state,update);
  bindDrag(draw,()=>state.dir,v=>{state.t=Math.round(v*100)/100;position.value=state.t;position.nextElementSibling.value=fmt(state.t);update()});
  update();
}

function pairedPicture(t, dir, accumulated=false) {
  return fubiniFrame({stage:accumulated?2:0, t, dir, view:0})[0];
}

function mountArticle(root) {
  const state={t:.4,dir:0,term:'gap'};
  root.innerHTML=`<h3>One section becomes one number.</h3><p>Fix a position. Integrating h over that section counts its length. The point on the second graph records that entire section as one value.</p>${directions}
    <div class="fp-paired-drawing"></div>${range('position','Slice position',.4)}
    <div class="fp-linked-equation" role="group" aria-label="Link each equation term to the picture"></div>
    <p class="fp-term-explanation" role="status"></p>
    <details open><summary>Then integrate the length function</summary><p>The first integration removes one coordinate. The second adds the resulting lengths across the remaining coordinate.</p>${totalEquation}${orderReason}</details>`;
  const drawing=root.querySelector('.fp-paired-drawing'),equation=root.querySelector('.fp-linked-equation'),explanation=root.querySelector('.fp-term-explanation');
  const highlight=()=>{
    const m=model(state.t,state.dir),coord=state.dir?'x':'y';
    root.dataset.term=state.term;
    equation.querySelectorAll('[data-term]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.term===state.term));
    explanation.textContent=state.term==='upper'?`Upper ${coord}-coordinate: ${fmt(m.top)}. This locates an endpoint; it includes the distance from zero to the start of the section.`:state.term==='lower'?`Lower ${coord}-coordinate: ${fmt(m.bottom)}. Subtract this offset because h is zero between zero and the section.`:`Slice integral: ${fmt(m.length)}. The gold section on the left and the marked height on the right have this same length.`;
  };
  const update=()=>{
    const m=model(state.t,state.dir);
    root.style.setProperty('--fp-upper',state.dir?'#326b85':'#696191');
    root.style.setProperty('--fp-lower',state.dir?'#696191':'#326b85');
    // Stage 2 enables both orientations; keep sweep shading out of this version.
    drawing.innerHTML=pairedPicture(state.t,state.dir,true);
    drawing.querySelectorAll('polygon[fill="#986729"]').forEach(e=>e.remove());
    const region=drawing.querySelector('.fubini-region svg');
    region.dataset.drag=state.dir?'y':'x';
    const circles=region.querySelectorAll('circle');
    circles[0].classList.add('fp-lower-point');circles[1].classList.add('fp-upper-point');
    equation.innerHTML=`<span>L${state.dir?'ᵧ':'ₓ'}(${fmt(state.t)}) =</span><button type="button" data-term="upper" aria-pressed="false">${state.dir?'√y':'2x − x²'} <b>${fmt(m.top)}</b></button><span>−</span><button type="button" data-term="lower" aria-pressed="false">${state.dir?'1 − √(1 − y)':'x²'} <b>${fmt(m.bottom)}</b></button><span>=</span><button type="button" data-term="gap" aria-pressed="true">Slice integral <b>${fmt(m.length)}</b></button>`;
    highlight();
  };
  const position=bindRange(root,'position',v=>{state.t=v;update()});
  equation.addEventListener('click',e=>{const b=e.target.closest('[data-term]');if(b){state.term=b.dataset.term;highlight()}});
  bindDirections(root,state,update);
  bindDrag(drawing,()=>state.dir,v=>{state.t=Math.round(v*100)/100;position.value=state.t;position.nextElementSibling.value=fmt(state.t);update()});
  update();
}

export const predictionQuestions=[
  {label:'Read a slice', title:'At x = 0.4, what does the inner integral return?',
    options:['The upper endpoint: 0.64','The gap: 0.48','The lower endpoint: 0.16'], correct:1, correction:'Compare the endpoint with the interval.',
    reason:'The integral counts where h = 1 along the y-axis. That interval starts at 0.16 and ends at 0.64, so its length is 0.64 − 0.16 = 0.48. An endpoint is a position, not a length.'},
  {label:'Move the slice', title:'Move from x = 0.4 to x = 0.8. Does the slice get longer?',
    options:['Longer: the upper curve rises','Shorter: the gap narrows','It keeps the same length'], correct:1, correction:'Watch the gap between both endpoints.',
    reason:'At x = 0.8 the endpoints are 0.64 and 0.96: the length is 0.32, down from 0.48. Both curves rise, but the lower curve catches up. The inner integral follows the gap.'},
  {label:'Change the order', title:'Switch to horizontal slices. What changes?',
    options:['Same length curve and same total','Different length curve, same total','The total area changes'], correct:1, correction:'Distinguish the slice-length curve from its integral.',
    reason:'Horizontal slices run from x = 1 − √(1 − y) to x = √y. Their length curve differs from 2x − 2x², but each order counts all of the same region. Both integrals are ⅓.'}
];

function mountPrediction(root) {
  const state={step:0, answers:[null,null,null], positions:[.4,.4,.4], dirs:[0,0,0]};
  root.innerHTML=`<h3>Try a prediction. See the reason.</h3><p>You can answer, skip, or move freely between questions. Nothing is scored.</p>
    <div class="fp-question-nav" role="group" aria-label="Prediction question">${predictionQuestions.map((q,i)=>`<button type="button" data-question="${i}" aria-pressed="${i===0}">${i+1}. ${q.label}</button>`).join('')}</div>
    <h4 class="fp-question-title"></h4><div class="fp-answer-options"></div><button type="button" class="fp-skip">Explore without answering</button>
    <p class="fp-prediction-feedback" role="status" aria-live="polite"></p><div class="fp-prediction-drawing"></div>
    <div class="fp-explore-controls">${directions}${range('position','Slice position',.4)}</div>
    <div class="fp-prediction-reading"></div>
    <details><summary>Explain it in your own words</summary><p>Why does moving an endpoint upward not necessarily increase the integral? Why may the two slice-length curves differ even though their integrals agree?</p><p>Try explaining the answers before returning to the pictures.</p></details>`;
  const title=root.querySelector('.fp-question-title'),options=root.querySelector('.fp-answer-options'),skip=root.querySelector('.fp-skip'),feedback=root.querySelector('.fp-prediction-feedback'),drawing=root.querySelector('.fp-prediction-drawing'),controls=root.querySelector('.fp-explore-controls'),reading=root.querySelector('.fp-prediction-reading');
  const position=bindRange(root,'position',v=>{state.positions[state.step]=v;updatePicture()});
  const updatePicture=()=>{
    const revealed=state.answers[state.step]!==null,t=state.positions[state.step],dir=state.dirs[state.step];
    drawing.innerHTML=pairedPicture(t,dir,true);
    drawing.querySelectorAll('polygon[fill="#986729"]').forEach(e=>e.remove());
    drawing.classList.toggle('fp-before-answer',!revealed);
    controls.hidden=!revealed;reading.hidden=!revealed;
    const m=model(t,dir);
    reading.innerHTML=`<p class="fp-formula">At ${dir?'y':'x'} = ${fmt(t)}: ${fmt(m.top)} − ${fmt(m.bottom)} = <b>${fmt(m.length)}</b></p>${state.step===2?totalEquation+orderReason:''}`;
    position.value=t;position.nextElementSibling.value=fmt(t);
    root.querySelectorAll('[data-dir]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.dir===dir));
  };
  const updateQuestion=()=>{
    const q=predictionQuestions[state.step],answer=state.answers[state.step],revealed=answer!==null;
    title.textContent=q.title;
    options.innerHTML=q.options.map((option,i)=>`<button type="button" data-answer="${i}" aria-pressed="${answer===i}">${option}</button>`).join('');
    skip.hidden=revealed;
    feedback.textContent=revealed?`${answer==='skip'?'Here is the reasoning.':answer===q.correct?'Yes.':q.correction} ${q.reason}`:'';
    root.querySelectorAll('[data-question]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.question===state.step));
    updatePicture();
  };
  const answer=value=>{
    const first=state.answers[state.step]===null;state.answers[state.step]=value;
    if(first){state.positions[state.step]=state.step===1?.8:.4;state.dirs[state.step]=state.step===2?1:0}
    updateQuestion();
    // Preserve keyboard continuity when the chosen answer button is redrawn.
    (value==='skip'?position:options.querySelector(`[data-answer="${value}"]`)).focus({preventScroll:true});
  };
  options.addEventListener('click',e=>{const b=e.target.closest('[data-answer]');if(b)answer(+b.dataset.answer)});
  skip.addEventListener('click',()=>answer('skip'));
  root.querySelector('.fp-question-nav').addEventListener('click',e=>{const b=e.target.closest('[data-question]');if(b){state.step=+b.dataset.question;updateQuestion()}});
  controls.querySelector('.fp-direction').addEventListener('click',e=>{const b=e.target.closest('[data-dir]');if(b){state.dirs[state.step]=+b.dataset.dir;updatePicture()}});
  updateQuestion();
}

function printSequence() {
  return `<div class="fp-print"><h3>From a section to an integral</h3><p>At x = 0.4, the section is [0.16, 0.64], of length 0.48. At x = 0.8, both endpoints have risen to [0.64, 0.96], but the length falls to 0.32.</p>${pairedPicture(.4,0,true)}<p>Moving each section toward zero preserves its length and hence the area ⅓. The resulting height is Lₓ(x) = 2x − 2x².</p>${pairedPicture(.4,1,true)}<p>Horizontal sections give Lᵧ(y) = √y + √(1 − y) − 1. The profiles differ; their integrals agree.</p>${totalEquation}${orderReason}</div>`;
}

export function mountFubiniPrototypes(root, {initial='manipulate', onSelect=()=>{}}={}) {
  const uid=`fp-${++instance}`;
  root.classList.add('fubini-prototypes');
  root.innerHTML=`<div class="fp-screen"><p class="fp-example"><strong>The same example in every version.</strong> R = {(x,y) ∈ [0,1]² : x² ≤ y ≤ 2x − x²}. We integrate h = 1 on R and 0 outside, using length measures.</p>
    <div class="fp-tabs" role="tablist" aria-label="Explanation style">${prototypeStyles.map((s,i)=>`<button type="button" role="tab" id="${uid}-tab-${s.id}" aria-controls="${uid}-${s.id}" aria-selected="${s.id===initial}" tabindex="${s.id===initial?0:-1}" data-style="${s.id}"><span>${String.fromCharCode(65+i)}</span> ${s.label}</button>`).join('')}</div>
    ${prototypeStyles.map(s=>`<section class="fp-panel" role="tabpanel" aria-labelledby="${uid}-tab-${s.id}" id="${uid}-${s.id}" data-panel="${s.id}" ${s.id!==initial?'hidden':''}></section>`).join('')}
    <details class="fp-comparison"><summary>What are we comparing?</summary><p>All versions use the same region and exact slice formulas. These are independent interpretations of interaction patterns, not copies of the sites’ layouts or code.</p>${prototypeStyles.map(s=>`<p><a href="${s.url}" target="_blank" rel="noopener">${s.precedent}</a>: ${s.question}</p>`).join('')}<p><a href="https://blog.ncase.me/how-i-make-an-explorable-explanation/" target="_blank" rel="noopener">Nicky Case’s teaching sequence</a> also informs version C.</p><p>After trying each version: can you distinguish endpoint from length, explain the second graph, and explain why changing order preserves the total? Notice which actions help and which interrupt you.</p></details></div>${printSequence()}`;
  // The static transcript explains whole integrals; omit the unrelated partial sweep.
  root.querySelectorAll('.fp-print polygon[fill="#986729"]').forEach(e=>e.remove());
  const mounts={manipulate:mountManipulation,article:mountArticle,predict:mountPrediction},mounted=new Set();
  const tabs=[...root.querySelectorAll('[role="tab"]')];
  const select=id=>{
    if(!mounts[id])id='manipulate';
    for(const s of prototypeStyles){const panel=root.querySelector(`[data-panel="${s.id}"]`);panel.hidden=s.id!==id;if(s.id===id&&!mounted.has(id)){mounts[id](panel);mounted.add(id)}}
    tabs.forEach(b=>{const active=b.dataset.style===id;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1});
    root.dataset.style=id;onSelect(id);
  };
  root.querySelector('.fp-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-style]');if(b)select(b.dataset.style)});
  root.querySelector('.fp-tabs').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const i=tabs.indexOf(e.target);if(i<0)return;
    const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    select(tabs[next].dataset.style);tabs[next].focus();
  });
  select(initial);
}

export function installFubiniPrototypes(entry) {
  if(!entry)return;
  const details=document.createElement('details');details.className='fp-entry-comparison';
  details.innerHTML='<summary>Try three alternative explanations</summary><p><a href="fubini-prototypes.html">Open the comparison in a full page →</a></p><div class="fp-entry-host"></div>';
  entry.querySelector('figure.visual').after(details);
  details.addEventListener('toggle',()=>{if(details.open&&!details.dataset.mounted){mountFubiniPrototypes(details.querySelector('.fp-entry-host'));details.dataset.mounted='true'}});
}
