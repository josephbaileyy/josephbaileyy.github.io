const r=String.raw;
const green='#42735c',gold='#9a6828';
const titles=['Indicators','Simple functions','Nonnegative functions','Integrable signed functions'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const math=s=>esc(s);
const fmt=x=>Number(x.toFixed(5)).toString();

// All examples vanish off [0,1]. The probability example has density 2x there.
export function machineModel(stage,n=2){
 const m=2**(n+1);
 const value=x=>x<0||x>1?0:stage===0?Number(x>.5):stage===1?(x===0?0:x<=.5?1:2):stage===2?(x===1?2:2*Math.floor(m*x)/m):2*x-1;
 const total=stage===0?.5:stage===1?1.5:stage===2?1-1/m:0;
 const weighted=stage===0?.75:stage===1?1.75:stage===2?4/3-1/m-1/(3*m*m):1/3;
 return {m,value,total,weighted,positive:stage===3?.25:total,negative:stage===3?.25:0,
  weightedPositive:stage===3?5/12:weighted,weightedNegative:stage===3?1/12:0};
}

function plot(stage,n,weighted=false,sharedScale=false){
 const model=machineModel(stage,n),X=x=>44+430*x;
 const max=sharedScale?(stage===0||stage===3?2.2:4.4):(stage===0||stage===3?1.2:2.4);
 const baseline=stage===3?155:238,scale=(stage===3?100:205)/max,Y=y=>baseline-scale*y;
 const weight=x=>weighted?2*x:1;
 const piece=(a,b,h)=>{
  const ya=h(a)*weight(a),yb=h(b)*weight(b),color=(ya+yb)/2<0?gold:green;
  return `<path d="M${X(a)},${Y(0)} L${X(a)},${Y(ya)} L${X(b)},${Y(yb)} L${X(b)},${Y(0)} Z" fill="${color}" fill-opacity=".2" stroke="${stage===3?'none':color}" stroke-width="1.5"/>`;
 };
 let b='';
 if(stage<2){
  if(stage===0)b+=piece(.5,1,()=>1);
  else b+=piece(0,.5,()=>1)+piece(.5,1,()=>2);
 }else if(stage===2){
  for(let j=0;j<model.m;j++)b+=piece(j/model.m,(j+1)/model.m,()=>2*j/model.m);
 }else{
  // Subdivide at the sign change; the weighted function is quadratic.
  for(let j=0;j<120;j++)b+=piece(j/120,(j+1)/120,x=>2*x-1);
 }
 if(stage===2||stage===3){
  const target=x=>(stage===2?2*x:2*x-1)*weight(x);
  const path=Array.from({length:121},(_,i)=>`${i?'L':'M'}${X(i/120)},${Y(target(i/120))}`).join(' ');
  b+=`<path d="${path}" fill="none" stroke="${stage===2?gold:green}" stroke-width="2.5" ${stage===2?'stroke-dasharray="7 4"':''}/>`;
 }
 b+=`<path d="M44,25 V${Y(stage===3?-1.4:0)} M44,${Y(0)} H480" fill="none" stroke="#87968c"/>`;
 const labelsY=stage===3?270:baseline+26;
 for(const x of [0,.5,1])b+=`<text x="${X(x)}" y="${labelsY}" text-anchor="middle">${x}</text>`;
 for(const y of (stage===3?[-1,1,2]:[1,2]).filter(y=>y<=max))b+=`<text x="35" y="${Y(y)+5}" text-anchor="end">${y}</text>`;
 b+=`<text x="490" y="${labelsY}">x</text>`;
 // Open/closed endpoints distinguish the half-open indicator intervals.
 if(stage<2){
  const points=stage===0?[[.5,0,true],[.5,1,false],[1,1,true]]:[[0,1,false],[.5,1,true],[.5,2,false],[1,2,true]];
  for(const [x,y,closed] of points)b+=`<circle cx="${X(x)}" cy="${Y(y*weight(x))}" r="3" fill="${closed?green:'white'}" stroke="${green}"/>`;
 }
 if(stage===2)b+=`<circle cx="${X(1)}" cy="${Y(2*weight(1))}" r="3" fill="${green}"/>`;
 return `<svg viewBox="0 0 520 290" role="img" aria-label="${weighted?'Density times the function':'Function heights'}: ${titles[stage]}">${b}</svg>`;
}

const general=[
 [r`$h=\mathbf1_A$`, 'One measurable set becomes a function: height 1 on the set and 0 outside it. Its integral is the measure of that set.',
  'Why this leads to step 2', 'A simple function takes only finitely many values. Each value can be attached to the indicator of its level set, so scaling and adding these building blocks produces every nonnegative simple function.'],
 [r`$\varphi=\sum_i c_i\mathbf1_{A_i}$, $c_i\geq0$`, 'Combine finitely many indicator functions. In this picture the two disjoint intervals carry heights 1 and 2; the sets in a general simple function need not be intervals.',
  'Why this leads to step 3', 'A finite sum cannot describe every measurable function. Increasing simple approximations add finer height levels, and monotone convergence passes an established integral identity to their limit. For a simple function with an infinite coefficient, increase finite coefficients to that value and use monotone convergence too.'],
 [r`$0\leq\varphi_n\uparrow h$`, 'The green staircase lies below h(x)=2x. Each refinement halves the cells and raises the staircase. The dashed curve is the limiting function, not another approximation.',
  'Why this leads to step 4', r`Every nonnegative measurable h has increasing simple approximations, including unbounded h: use $\varphi_n=\min(2^n,2^{-n}\lfloor2^nh\rfloor)$, with value $2^n$ where $h=\infty$. Once the property holds for nonnegative functions, it applies separately to the positive and negative parts of a signed function.`],
 [r`$h=h_+-h_-$, $\mu(|h|)<\infty$`, r`Here $h(x)=2x-1$. Green is the positive part; the gold region below zero has magnitude $h_-$. Both $h_+$ and $h_-$ are nonnegative, so step 3 already covers them.`,
  'Why subtraction is now allowed', r`Integrability gives $\mu(h_+)+\mu(h_-)=\mu(|h|)<\infty$. Both totals are finite, so linearity can subtract them without forming $\infty-\infty$.`]
];
const identities=[
 r`$\mathbf P(\mathbf1_B)=\mathbf P(B)=\lambda(f\mathbf1_B)$`,
 r`$\mathbf P(\varphi)=\sum_i c_i\mathbf P(A_i)=\sum_i c_i\lambda(f\mathbf1_{A_i})=\lambda(f\varphi)$`,
 r`$\mathbf P(h)=\lim_n\mathbf P(\varphi_n)=\lim_n\lambda(f\varphi_n)=\lambda(fh)$`,
 r`$\mathbf P(h)=\mathbf P(h_+)-\mathbf P(h_-)=\lambda(fh_+)-\lambda(fh_-)=\lambda(fh)$`
];
const reasons=[
 'This is precisely the hypothesis, for every Borel B. Here B=(1/2,1], so the density contributes the area under 2x from 1/2 to 1.',
 'Multiply each assumed indicator identity by its nonnegative height, then add. Linearity under P and under Lebesgue measure gives the same total. The function fφ need not be simple: f stays inside its integral.',
 r`The simple-function identity holds for each n by step 2. Because $f\geq0$, $f\varphi_n\uparrow fh$ as well as $\varphi_n\uparrow h$. Apply monotone convergence under P on the left and under λ on the right. Both limits may be infinite; use $0\cdot\infty=0$.`,
 r`First apply step 3 to $|h|$: $\mathbf P(|h|)=\lambda(f|h|)<\infty$. Hence both positive-part and negative-part integrals are finite under both routes. Subtract their identities; nonnegative f gives $(fh)_\pm=fh_\pm$.`
];

export function machineView(stage,n=2,density=false){
 const m=machineModel(stage,n),[generalFormula,description,bridge,why]=general[stage];
 const formula=density&&stage===3?r`$h=h_+-h_-$, $\lambda(f|h|)<\infty$`:generalFormula;
 const example=stage===0?r`$h=\mathbf1_{(1/2,1]}$`:stage===1?r`$\varphi=\mathbf1_{(0,1/2]}+2\mathbf1_{(1/2,1]}$`:stage===2?r`$h(x)=2x$, $\varphi_n(x)=2^{-n}\lfloor2^nh(x)\rfloor$`:r`$h(x)=2x-1$`;
 let readout=stage===0?'λ(A)=1/2':stage===1?'1 × 1/2 + 2 × 1/2 = 3/2':stage===2?`∫φₙ dλ = 1 − 1/${m.m} = ${fmt(m.total)} ↑ 1`:'∫h₊ dλ − ∫h₋ dλ = 1/4 − 1/4 = 0';
 if(density)readout=stage===0?'P(B) = ∫½¹ 2x dx = 3/4':stage===1?'1 × P((0,1/2]) + 2 × P((1/2,1]) = 1/4 + 2 × 3/4 = 7/4':stage===2?`P(φₙ) = λ(fφₙ) = ${fmt(m.weighted)} ↑ 4/3`:'P(h) = λ(fh) = 5/12 − 1/12 = 1/3';
 const leftNote=density?'These are function heights. P weights them using density 2x; the plain area in this plot is not P(h).':'Here μ is length on [0,1], so the integral is area, with negative contributions subtracted.';
 const plots=`<div class="machine-pictures"><section><h5>${density?'h · the original heights':'A representative function'}</h5>${plot(stage,n,false,density)}<p>${leftNote}</p></section>${density?`<section><h5>fh · heights multiplied by 2x</h5>${plot(stage,n,true,true)}<p>Ordinary signed area here equals λ(fh), hence P(h). Green contributes positively; gold below zero is subtracted.</p></section>`:''}</div>`;
 const approximation=stage===2?`<p class="machine-legend">Green: ${m.m} lower steps (n=${n}). Dashed gold: ${density?'h on the left, fh on the right':'h'}. ${density?`Exact remaining integral: 1/${m.m} + 1/(3·${m.m}²).`:`Exact remaining area: 1/${m.m}.`}</p>`:'';
 return `<section class="machine-stage"><p class="machine-kicker">STEP ${stage+1} OF 4</p><h4>${titles[stage]}</h4><div class="machine-formula">${math(formula)}</div><p>${math(description)}</p><p class="machine-example">Picture on [0,1], zero outside: ${math(example)}.</p>${plots}${approximation}<div class="machine-total">${readout}</div>${density?`<div class="machine-identity">${math(identities[stage])}</div><p>${math(reasons[stage])}</p>`:''}<div class="machine-bridge"><h5>${bridge}</h5><p>${math(why)}</p></div></section>`;
}

export function mountMachine(root,name,{setup,range,renderMath}){
 if(!['int-machine','int-machine-density'].includes(name))return false;
 const density=name==='int-machine-density';
 const controls=`<label>Proof step<select data-control="stage" aria-label="Standard machine step">${titles.map((s,i)=>`<option value="${i}">${i+1} · ${s}</option>`).join('')}</select></label><span class="machine-level">${range('n','Approximation level n',1,5,2)}</span>`;
 setup(root,controls,v=>{
  const level=root.querySelector('.machine-level');if(level)level.hidden=v.stage!==2;
  return [machineView(v.stage,v.n,density),density?'The same identity P(h)=λ(fh) survives each extension.':'Indicators → finite nonnegative sums → increasing limits → integrable differences. Each arrow uses a property you must justify.'];
 });
 // setup redraws only the diagram, preserving control focus and values.
 const updateMath=()=>renderMath?.(root);
 root.addEventListener?.('input',updateMath);root.addEventListener?.('change',updateMath);
 const result=root.querySelector('.result');
 if(result){
  root.classList.add('machine-lab');
  const intro=document.createElement('p');intro.className='machine-intro';
  intro.textContent=density?'Follow P(h)=λ(fh) through the four steps. Pictures use f(x)=2x on [0,1], zero outside.':'Build more functions at each step: first add, then take limits, then subtract. The pictures use length measure on [0,1].';
  root.prepend(intro);
  const transcript=document.createElement('div');transcript.className='machine-print';
  transcript.innerHTML=titles.map((_,i)=>machineView(i,2,density)).join('');root.append(transcript);
 }
 updateMath();return true;
}
