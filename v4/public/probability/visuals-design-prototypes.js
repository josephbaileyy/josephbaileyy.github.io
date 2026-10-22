import {cdfPrototype, fatouPrototype, machinePrototype} from './prototype-models.js';
import {lessons, styles} from './prototype-lessons.js';
import {mountReasoningRevision} from './visuals-reasoning-revision.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=s=>s.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g,esc);
const fmt=n=>Number(n.toFixed(4)).toString();
const math=s=>`<div class="ep-equation">${esc('$'+s+'$')}</div>`;
const typeset=node=>globalThis.renderMathInElement?.(node,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});
const range=(name,label,min,max,value,step)=>`<label class="ep-range">${label}<input type="range" min="${min}" max="${max}" value="${value}" step="${step}" data-ep="${name}"><output>${fmt(value)}</output></label>`;
const txt=(x,y,s,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${esc(s)}</text>`;
const svg=(body,label)=>`<svg viewBox="0 0 360 260" role="img" aria-label="${esc(label)}">${body}</svg>`;
let serial=0;
export const defaultState=()=>({stage:0,n:2,s:.3,offset:1,alpha:1,p:.5,cut:.5,height:2,level:2,part:0});

function fatouDrawing(state,revealed=true) {
  const m=fatouPrototype(state.n,state.s,state.offset);
  if(state.stage===3)return `<div class="ep-reduction"><p><b>Original sequence</b><br>fₙ ≥ g a.e., with ∫|g| &lt; ∞</p><span>↓ remove the common floor</span><p><b>Nonnegative sequence</b><br>qₙ = (fₙ − g)₊ ≥ 0</p><span>↓ apply nonnegative Fatou</span><p><b>Restore the original integrals</b><br>Add the finite number ∫g to both sides.</p></div>`;
  const X=x=>42+276*x,Y=y=>214-56*y;
  let body=`<path d="M42 25V214H318" fill="none" stroke="currentColor"/>`;
  for(const y of [0,1,2,3])body+=txt(34,Y(y)+4,y,'end');
  body+=txt(42,239,'0')+txt(318,239,'s = 1','end')+txt(42,18,'Function value');
  const line=(fn,color,dash='')=>{
    let out='';
    for(const [a,b,mid] of [[0,.5,.25],[.5,1,.75]]) {
      const d=fn(mid)-mid;
      out+=`<path d="M${X(a)} ${Y(a+d)}L${X(b)} ${Y(b+d)}" fill="none" stroke="${color}" stroke-width="3" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
      out+=`<circle cx="${X(.5)}" cy="${Y(.5+d)}" r="3" fill="${a===0?color:'var(--paper)'}" stroke="${color}"/>`;
    }
    return out;
  };
  body+=line(m.value,'#986729');
  if(revealed) {
    body+=`<path d="M${X(0)} ${Y(1)}L${X(1)} ${Y(2)}" stroke="#6d746f" stroke-dasharray="3 5" stroke-width="2"/>`;
    if(state.stage===1)body+=line(m.nextLower,'#326b85','7 3');
    body+=line(m.lower,'#315e4e');
    body+=`<path d="M${X(state.s)} 25V214" stroke="#7b817d" stroke-dasharray="3 4"/><circle cx="${X(state.s)}" cy="${Y(m.envelope)}" r="6" fill="#315e4e"/>`;
  }
  const terms=Array.from({length:6},(_,i)=>{
    const term=fatouPrototype(state.n,state.s,i);
    return `<span class="${i===state.offset?'ep-inspected':''}"><b>f${state.n+i}(s)</b>${fmt(term.current)}</span>`;
  }).join('');
  return `<div class="ep-fatou-workspace"><div>${svg(body,'An oscillating later function and the exact increasing tail-infimum construction')}<p class="ep-legend">Gold: f${m.k}. ${revealed?`Green: h${m.n}. ${state.stage===1?'Blue dashed: h'+(m.n+1)+'. ':''}Dotted: liminf fₖ.`:''}</p></div><div><p class="ep-small">At the fixed outcome s = ${fmt(state.s)}, six values in the tail:</p><div class="ep-tail">${terms}</div>${revealed?`<p class="ep-readout">Exact infinite-tail infimum: <b>h${m.n}(s) = ${fmt(m.envelope)}</b></p><p class="ep-small">Both parities occur in every infinite tail. The minimum is attained at its first unlifted term, k = ${m.witness}; the six values are a preview.</p><p class="ep-readout">∫h${m.n} = ${fmt(m.envelopeIntegral)} → 1.5<br>∫f${m.k} = ${fmt(m.termIntegral)} → 2</p>`:''}</div></div>`;
}

function cdfDrawing(state,revealed=true) {
  const m=cdfPrototype(state.alpha,state.p),X=x=>42+(x+2)*46,Y=y=>214-170*y;
  const cards=`<div class="ep-outcomes" aria-label="Original outcomes">${m.outcomes.map(o=>`<div class="ep-outcome ${revealed&&o.included?'ep-included':''}"><b>${o.name}</b><span>X = ${o.value}</span><span>Mass ${fmt(o.mass)}</span>${revealed?`<strong>${o.included?'Included':'Excluded'}</strong>`:''}</div>`).join('')}</div>`;
  if(!revealed)return cards;
  let body=`<path d="M42 30V214H318" stroke="currentColor" fill="none"/>`;
  body+=txt(33,Y(1)+4,'1','end')+txt(33,218,'0','end')+txt(42,20,'Cumulative probability F(α)');
  let start=-2,cumulative=0;
  for(let i=0;i<3;i++){
    const x=m.values[i],p=m.masses[i];
    body+=`<path d="M${X(start)} ${Y(cumulative)}H${X(x)}" stroke="#315e4e" stroke-width="3"/><circle cx="${X(x)}" cy="${Y(cumulative)}" r="4" fill="var(--paper)" stroke="#315e4e"/><path d="M${X(x)} ${Y(cumulative)}V${Y(cumulative+p)}" stroke="#315e4e" stroke-dasharray="3 4"/>`;
    cumulative+=p;body+=`<circle cx="${X(x)}" cy="${Y(cumulative)}" r="4" fill="#315e4e"/>`;start=x;
  }
  body+=`<path d="M${X(start)} ${Y(1)}H${X(4)}" stroke="#315e4e" stroke-width="3"/><path d="M${X(state.alpha)} 30V214" stroke="#986729" stroke-width="2"/><circle cx="${X(state.alpha)}" cy="${Y(m.cdf)}" r="6" fill="#986729"/>`;
  for(const x of [-1,1,3])body+=txt(X(x),239,x,'middle');body+=txt(336,239,'α');
  return `${cards}<div class="ep-cdf-workspace"><div class="ep-law"><h4>Group by X-value</h4>${m.values.map((x,i)=>`<div><span>X = ${x}</span><b>Mass ${fmt(m.masses[i])}</b><span>${x<=state.alpha?'Included':'Excluded'}</span></div>`).join('')}<p class="ep-readout">Aα = ${m.event.length?'{'+m.event.join(', ')+'}':'∅'}<br>P(Aα) = ${fmt(m.cdf)}</p></div><div>${svg(body,'CDF of the displayed finite law, including the atom at the selected threshold')}<p class="ep-small">Filled dots include the atom; open dots show the left limit.</p></div></div><p class="ep-readout">F(${fmt(state.alpha)}) = mass below ${fmt(m.below)} + mass at the threshold ${fmt(m.at)} = <b>${fmt(m.cdf)}</b></p>`;
}

function machinePlot(state,weighted) {
  const stage=state.stage,m=machinePrototype(stage,state.level,state.cut,state.height),signed=stage===3;
  const X=x=>42+276*x,top=signed?2.2:stage===0?2.2:Math.max(4.4,2*state.height+.2),low=signed?-1.2:0;
  const Y=y=>214-(y-low)/(top-low)*180;
  const weight=x=>weighted?2*x:1;
  const pieces=stage===0?(state.cut===1?[]:[[state.cut,1,()=>1]]):stage===1?[[0,.5,()=>1],[.5,1,()=>state.height]]:stage===2?Array.from({length:m.m},(_,j)=>[j/m.m,(j+1)/m.m,()=>2*j/m.m]):Array.from({length:120},(_,j)=>[j/120,(j+1)/120,x=>2*x-1]);
  let body='';
  for(const [a,b,h] of pieces){
    const ya=h(a)*weight(a),yb=h(b)*weight(b),negative=(ya+yb)<0;
    const faded=signed&&(state.part===1&&negative||state.part===2&&!negative);
    body+=`<path d="M${X(a)} ${Y(0)}L${X(a)} ${Y(ya)}L${X(b)} ${Y(yb)}L${X(b)} ${Y(0)}Z" fill="${negative?'#986729':'#315e4e'}" fill-opacity="${faded?.04:.2}" stroke="${negative?'#986729':'#315e4e'}" stroke-opacity="${faded?.2:1}" stroke-width="${signed?0:1.5}"/>`;
  }
  if(stage>=2){
    const target=x=>(stage===2?2*x:2*x-1)*weight(x);
    body+=`<path d="${Array.from({length:121},(_,i)=>`${i?'L':'M'}${X(i/120)} ${Y(target(i/120))}`).join(' ')}" fill="none" stroke="${stage===2?'#986729':'#315e4e'}" stroke-width="2.5" ${stage===2?'stroke-dasharray="5 4"':''}/>`;
  }
  body+=`<path d="M42 30V214M42 ${Y(0)}H318" fill="none" stroke="currentColor"/>`;
  for(const x of [0,.5,1])body+=txt(X(x),239,x,'middle');
  for(const y of (signed?[-1,0,1,2]:[0,1,2,4]).filter(y=>y<=top))body+=txt(34,Y(y)+4,y,'end');
  const symbol=stage===1?'φ':stage===2?'φₙ':'h';
  body+=txt(336,239,'x')+txt(42,20,weighted?`Multiplied heights: f·${symbol}`:`Original heights: ${symbol}`);
  if(stage===2)body+=`<circle cx="${X(1)}" cy="${Y(2*weight(1))}" r="3" fill="#315e4e"/>`;
  if(stage===0)for(const [x,y,closed] of [[state.cut,0,true],...(state.cut<1?[[state.cut,weight(state.cut),false],[1,weight(1),true]]:[])])body+=`<circle cx="${X(x)}" cy="${Y(y)}" r="3" stroke="#315e4e" fill="${closed?'#315e4e':'var(--paper)'}"/>`;
  return svg(body,weighted?'Function multiplied by density 2x, on the same vertical scale as the original heights':'Original function heights, whose plain area is distinct from its P integral');
}

function machineDrawing(state,revealed=true) {
  if(!revealed)return '<p class="ep-neutral">The assumed identity concerns every Borel set. Follow how it extends to a larger function class at each step.</p>';
  const m=machinePrototype(state.stage,state.level,state.cut,state.height);
  const symbol=state.stage===1?'φ':state.stage===2?'φₙ':'h';
  const fn=state.stage===0?`h = 1_(${fmt(state.cut)},1]`:state.stage===1?`φ = 1_(0,½] + ${fmt(state.height)}·1_(½,1]`:state.stage===2?`h(x) = 2x; φₙ = 2⁻ⁿ floor(2ⁿh); n = ${state.level}`:'h(x) = 2x − 1; h = h₊ − h₋';
  return `<p class="ep-model-label">Pictured function: ${fn}, zero outside [0,1].</p><div class="ep-machine-pair"><div>${machinePlot(state,false)}<p class="ep-small">Plain integral under length: λ(${symbol}) = ${fmt(m.total)}.<br>The P integral includes the density f.</p></div><div>${machinePlot(state,true)}<p class="ep-small">Weighted integral: λ(f${symbol}) = <b>${fmt(m.weighted)}</b>.<br>The proof establishes that this equals P(${symbol}).</p></div></div>${state.stage===2?`<p class="ep-small">Green: the lower approximation φₙ (left) and fφₙ (right). Dashed gold: their limits h and fh. Refinement raises both approximations.</p><p class="ep-readout">Exact remainder to 4/3: 1/${m.m} + 1/(3·${m.m}²) = ${fmt(4/3-m.weighted)}</p>`:state.stage===3?'<div class="ep-parts"><p>Positive contribution: P(h₊) = λ(fh₊) = 5/12</p><p>Negative magnitude: P(h₋) = λ(fh₋) = 1/12</p><p>Absolute integral = 1/2 &lt; ∞. Difference = 1/3.</p></div>':`<p class="ep-readout">In this example: P(${symbol}) = λ(f${symbol}) = <b>${fmt(m.weighted)}</b></p>`}`;
}

export function lessonDrawing(topic,state,revealed=true){return ({fatou:fatouDrawing,cdf:cdfDrawing,machine:machineDrawing})[topic](state,revealed)}

function controlMarkup(topic){
  if(topic==='fatou')return `<div data-controls-stage="0 1 2">${range('n','Start of tail n',1,12,2,1)}<button type="button" data-discard>Discard the first function</button>${range('s','Fixed outcome s',.01,1,.3,.01)}${range('offset','Inspect later term: k = n + offset',0,5,1,1)}</div>`;
  if(topic==='cdf')return `${range('alpha','Threshold α',-2,4,1,.01)}<div class="ep-presets" role="group" aria-label="Threshold around the atom at 1"><button type="button" data-alpha="0.99">Just below 1</button><button type="button" data-alpha="1">At 1</button><button type="button" data-alpha="1.01">Just above 1</button></div>${range('p','Mass p at X = 1',0,1,.5,.01)}`;
  return `<div data-controls-stage="0">${range('cut','Left endpoint of B = (t,1]',0,1,.5,.01)}</div><div data-controls-stage="1">${range('height','Height on the second half',0,3,2,.1)}</div><div data-controls-stage="2">${range('level','Dyadic approximation level n',1,4,2,1)}</div><div data-controls-stage="3"><label class="ep-select">Highlight the signed split<select data-ep="part"><option value="0">Both contributions</option><option value="1">Positive part</option><option value="2">Negative part</option></select></label></div>`;
}

function updateControls(root,state){
  root.querySelectorAll('[data-ep]').forEach(e=>{e.value=state[e.dataset.ep];if(e.nextElementSibling?.tagName==='OUTPUT')e.nextElementSibling.value=fmt(+e.value)});
  root.querySelectorAll('[data-controls-stage]').forEach(e=>e.hidden=!e.dataset.controlsStage.split(' ').includes(String(state.stage)));
  const discard=root.querySelector('[data-discard]');if(discard)discard.disabled=state.n>=12;
}

function bindControls(root,getState,update){
  root.addEventListener('input',e=>{const name=e.target.dataset.ep;if(!name)return;getState()[name]=+e.target.value;update()});
  root.addEventListener('change',e=>{if(e.target.tagName==='SELECT'&&e.target.dataset.ep){getState()[e.target.dataset.ep]=+e.target.value;update()}});
  root.addEventListener('click',e=>{
    if(e.target.closest('[data-discard]')){getState().n=Math.min(12,getState().n+1);update()}
    const preset=e.target.closest('[data-alpha]');if(preset){getState().alpha=+preset.dataset.alpha;update()}
  });
}

function claimMarkup(step){return `<h4>${step.claim}</h4>${math(step.equation)}<p>${rich(step.reason)}</p><p class="ep-next">${rich(step.next)}</p>`}

function bindCDFDrag(root,state,update){
  let pointer=null;
  const move=e=>{
    if(pointer!==e.pointerId)return;
    const plot=root.querySelector('.ep-cdf-workspace svg');if(!plot)return;
    const box=plot.getBoundingClientRect(),scale=Math.min(box.width/360,box.height/260),left=box.left+(box.width-360*scale)/2;
    state.alpha=Math.round(Math.max(-2,Math.min(4,((e.clientX-left)/scale-42)/46-2))*100)/100;update();
  };
  root.addEventListener('pointerdown',e=>{if(e.button!==0||!e.target.closest('.ep-cdf-workspace svg'))return;pointer=e.pointerId;root.setPointerCapture(pointer);move(e)});
  root.addEventListener('pointermove',move);
  const stop=e=>{if(e.pointerId===pointer){if(root.hasPointerCapture(pointer))root.releasePointerCapture(pointer);pointer=null}};
  root.addEventListener('pointerup',stop);root.addEventListener('pointercancel',stop);
}

function mountExploration(root,topic){
  const lesson=lessons[topic],state=defaultState();
  root.innerHTML=`<div class="ep-stage-choices" role="group" aria-label="${topic==='cdf'?'Parts of the definition':'Steps in the argument'}">${lesson.stages.map((s,i)=>`<button type="button" data-stage="${i}" aria-pressed="${i===0}">${i+1}. ${s.label}</button>`).join('')}</div><div class="ep-drawing"></div><div class="ep-controls">${controlMarkup(topic)}</div><div class="ep-claim" aria-live="polite"></div>`;
  const update=()=>{
    root.dataset.step=state.stage;
    root.querySelector('.ep-drawing').innerHTML=lessonDrawing(topic,state);
    updateControls(root,state);
  };
  const select=i=>{
    state.stage=i;root.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.stage===i));
    const claim=root.querySelector('.ep-claim');claim.innerHTML=claimMarkup(lesson.stages[i]);typeset(claim);update();
  };
  root.querySelector('.ep-stage-choices').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b)select(+b.dataset.stage)});
  bindControls(root,()=>state,update);if(topic==='cdf')bindCDFDrag(root.querySelector('.ep-drawing'),state,update);
  select(0);
}

function mountConnections(root,topic){
  const lesson=lessons[topic],state=defaultState();
  root.innerHTML=`<p class="ep-small">Choose a claim to connect its equation, reason, and mathematical operation.</p><div class="ep-connected"><div class="ep-claim-list" role="group" aria-label="${topic==='cdf'?'Definition connections':'Proof claims'}">${lesson.stages.map((s,i)=>`<button type="button" data-claim="${i}" aria-pressed="${i===0}"><span>${i+1}. ${s.label}</span><b>${s.claim}</b></button>`).join('')}</div><div class="ep-claim" aria-live="polite"></div></div><div class="ep-drawing"></div><div class="ep-controls">${controlMarkup(topic)}</div><details class="ep-whole-argument"><summary>${topic==='cdf'?'Read the complete connection':'Read the argument in order'}</summary>${lesson.stages.map(s=>`<section>${claimMarkup(s)}</section>`).join('')}</details>`;
  const update=()=>{root.dataset.step=state.stage;root.querySelector('.ep-drawing').innerHTML=lessonDrawing(topic,state);updateControls(root,state)};
  const select=i=>{
    state.stage=i;root.dataset.claim=i;
    root.querySelectorAll('[data-claim]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.claim===i));
    const claim=root.querySelector('.ep-claim');claim.innerHTML=claimMarkup(lesson.stages[i]);typeset(claim);update();
  };
  root.querySelector('.ep-claim-list').addEventListener('click',e=>{const b=e.target.closest('[data-claim]');if(b)select(+b.dataset.claim)});
  bindControls(root,()=>state,update);select(0);typeset(root.querySelector('.ep-whole-argument'));
}

function mountPrediction(root,topic){
  const lesson=lessons[topic],states=lesson.questions.map(()=>defaultState()),answers=lesson.questions.map(()=>null);let current=0;
  root.innerHTML=`<p class="ep-small">Questions refer to the stated starting example. Answer or skip to reveal the operation and its reason; nothing is scored.</p><div class="ep-question-choices" role="group" aria-label="Prediction question">${lesson.questions.map((q,i)=>`<button type="button" data-question="${i}" aria-pressed="${i===0}">Question ${i+1}</button>`).join('')}</div><h3 class="ep-question"></h3><div class="ep-options"></div><button type="button" class="ep-skip">Show the reasoning without answering</button><p class="ep-feedback" role="status" aria-live="polite"></p><div class="ep-drawing"></div><div class="ep-after" hidden><div class="ep-controls">${controlMarkup(topic)}</div><div class="ep-claim"></div></div><details><summary>${topic==='cdf'?'Read the whole definition connection':'Read the whole argument'}</summary>${lesson.stages.map(s=>`<section>${claimMarkup(s)}</section>`).join('')}</details>`;
  const drawing=root.querySelector('.ep-drawing'),after=root.querySelector('.ep-after'),skip=root.querySelector('.ep-skip'),feedback=root.querySelector('.ep-feedback'),options=root.querySelector('.ep-options');
  const updatePicture=()=>{drawing.innerHTML=lessonDrawing(topic,states[current],answers[current]!==null);updateControls(root,states[current])};
  const updateQuestion=()=>{
    const q=lesson.questions[current],answer=answers[current],revealed=answer!==null;
    root.querySelector('.ep-question').textContent=q.title;
    root.querySelectorAll('[data-question]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.question===current));
    options.innerHTML=q.options.map((o,i)=>`<button type="button" data-answer="${i}" aria-pressed="${answer===i}">${o}</button>`).join('');
    after.hidden=!revealed;skip.hidden=revealed;
    feedback.textContent=revealed?`${answer==='skip'?'Here is the reasoning.':answer===q.correct?'Yes.':'Follow the reason for this step.'} ${q.reason}`:'';
    const claim=root.querySelector('.ep-claim');claim.innerHTML=revealed?claimMarkup(lesson.stages[q.stage]):'';typeset(claim);updatePicture();
  };
  const answer=value=>{
    const q=lesson.questions[current];
    if(answers[current]===null)Object.assign(states[current],{stage:q.stage},q.after||{});
    answers[current]=value;updateQuestion();
    (value==='skip'?after.querySelector('input,select')||root.querySelector('.ep-question-choices button'):options.querySelector(`[data-answer="${value}"]`)).focus({preventScroll:true});
  };
  options.addEventListener('click',e=>{const b=e.target.closest('[data-answer]');if(b)answer(+b.dataset.answer)});
  skip.addEventListener('click',()=>answer('skip'));
  root.querySelector('.ep-question-choices').addEventListener('click',e=>{const b=e.target.closest('[data-question]');if(b){current=+b.dataset.question;updateQuestion()}});
  bindControls(root,()=>states[current],updatePicture);updateQuestion();typeset(root.querySelector('details'));
}

function transcript(topic){
  const lesson=lessons[topic];
  return `<div class="ep-print"><p>${rich(lesson.context)}</p>${lesson.stages.map((s,i)=>`<section><h3>${i+1}. ${s.label}</h3>${claimMarkup(s)}${topic==='machine'||topic==='cdf'&&i===2||topic==='fatou'&&i===1?lessonDrawing(topic,{...defaultState(),stage:i}):''}</section>`).join('')}</div>`;
}

function bindTabs(nav,tabs,select){
  nav.addEventListener('click',e=>{const b=e.target.closest('[role=tab]');if(b)select(b.dataset.style)});
  nav.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const i=tabs.indexOf(e.target);if(i<0)return;e.preventDefault();
    const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    select(tabs[j].dataset.style);tabs[j].focus();
  });
}

export function mountDesignPrototypes(root,topic,{initial='explore',onSelect=()=>{}}={}){
  const lesson=lessons[topic],uid=`ep-${++serial}`;root.classList.add('explanation-prototypes');root.dataset.topic=topic;
  root.innerHTML=`<div class="ep-screen"><p class="ep-goal">${rich(lesson.goal)}</p><p class="ep-context">${rich(lesson.context)}</p><div class="ep-style-tabs" role="tablist" aria-label="Explanation style">${styles.map((s,i)=>`<button type="button" role="tab" data-style="${s.id}" id="${uid}-tab-${s.id}" aria-controls="${uid}-${s.id}" aria-selected="${s.id===initial}" tabindex="${s.id===initial?0:-1}"><span>${String.fromCharCode(65+i)}</span>${s.label}</button>`).join('')}</div>${styles.map(s=>`<section role="tabpanel" id="${uid}-${s.id}" aria-labelledby="${uid}-tab-${s.id}" data-style-panel="${s.id}" hidden></section>`).join('')}<details class="ep-design-notes"><summary>What are we comparing?</summary><p>Each version explains the same ${topic==='cdf'?'definition':'argument'}. A puts the mathematical operation first, B puts its connected claims and reasons first, and C offers a prediction before the explanation. These are original implementations of design patterns.</p>${styles.map(s=>`<p><a href="${s.url}" target="_blank" rel="noopener">${s.source}</a></p>`).join('')}<p><a href="https://blog.ncase.me/how-i-make-an-explorable-explanation/" target="_blank" rel="noopener">Nicky Case’s teaching sequence</a> also informs C. Try explaining the argument after each version. Which action supplied a reason, and which interrupted reading?</p></details></div>${transcript(topic)}`;
  const mounts={explore:mountExploration,connect:mountConnections,predict:mountPrediction},mounted=new Set();
  const tabs=[...root.querySelectorAll('.ep-style-tabs [role=tab]')];
  const select=id=>{
    if(!mounts[id])id='explore';
    styles.forEach(s=>{const panel=root.querySelector(`[data-style-panel="${s.id}"]`);panel.hidden=s.id!==id;if(s.id===id&&!mounted.has(id)){mounts[id](panel,topic);mounted.add(id)}});
    tabs.forEach(b=>{const selected=b.dataset.style===id;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1});
    root.dataset.style=id;onSelect(id);
  };
  bindTabs(root.querySelector('.ep-style-tabs'),tabs,select);select(initial);typeset(root.querySelector('.ep-goal'));typeset(root.querySelector('.ep-context'));typeset(root.querySelector('.ep-print'));
}

export function installDesignPrototypes(entriesRoot){
  for(const [topic,lesson] of Object.entries(lessons)){
    const entry=entriesRoot.querySelector(`#entry-${lesson.number.replaceAll('.','-')}`);if(!entry)continue;
    const wrapper=document.createElement('details');wrapper.className='ep-entry-wrapper';
    wrapper.innerHTML=`<summary>${topic==='cdf'?'Read the CDF in one diagram':topic==='fatou'?'Why the tail infima increase':'How the identity extends between function classes'}</summary><p><a href="design-prototypes.html?topic=${topic}">Open this explanation in a full page →</a></p><div class="ep-embedded"></div>`;
    if(topic==='cdf')entry.querySelector('figure.visual').after(wrapper);
    else entry.querySelector(topic==='machine'?'.solution':'.proof').append(wrapper);
    wrapper.addEventListener('toggle',()=>{if(wrapper.open&&!wrapper.dataset.mounted){mountReasoningRevision(wrapper.querySelector('.ep-embedded'),topic);wrapper.dataset.mounted='true'}});
  }
}
