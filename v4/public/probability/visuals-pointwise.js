// Exact models separate convergence of each path from probability or area.
const number=x=>Number(x.toFixed(4)).toString();
export function pathValue(outcome,n){return outcome===3?(-1)**n:[1,2,-1][outcome]/n;}
export function pathModel(outcome,p){return {mass:outcome===3?p:(1-p)/3,lower:outcome===3?-1:0,upper:outcome===3?1:0,converges:outcome!==3,convergenceProbability:1-p};}
export function monotoneModel(kind,n,x){
 const spike=kind===0,value=k=>spike?(x>0&&x<1/k?k:0):x*(1-1/k);
 return {current:value(n),next:value(n+1),integral:spike?1:(1-1/n)/2,limitIntegral:spike?0:.5,
  zeroFrom:x===0||x===1?1:Math.ceil(1/x),dropLeft:1/(n+1),dropRight:1/n};
}
const text=(x,y,s,anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const picture=(body,label)=>`<svg viewBox="0 0 360 220" role="img" aria-label="${label}">${body}</svg>`;
function pathPicture(outcome){
 const X=n=>40+(n-1)*300/23,Y=y=>98-34*y;
 const points=Array.from({length:24},(_,i)=>`${X(i+1)},${Y(pathValue(outcome,i+1))}`).join(' ');
 return picture(`<path d="M40 20V170H340" class="pw-axis"/>`+
  [-2,-1,0,1,2].map(y=>`<line x1="40" x2="340" y1="${Y(y)}" y2="${Y(y)}" class="pw-grid"/>${text(28,Y(y)+5,y)}`).join('')+
  `<polyline points="${points}" class="pw-path ${outcome===3?'pw-exception':''}"/>`+
  Array.from({length:24},(_,i)=>`<circle cx="${X(i+1)}" cy="${Y(pathValue(outcome,i+1))}" r="3" class="${outcome===3?'pw-gold-dot':'pw-dot'}"/>`).join('')+
  [1,8,16,24].map(n=>text(X(n),190,n)).join('')+text(190,213,'Time n →'),`Values along the fixed outcome ${['a','b','c','z'][outcome]} over time. Vertical axis: Xₙ at this outcome.`);
}
export function almostSureView(outcome,p){
 const m=pathModel(outcome,p),name=['a','b','c','z'][outcome],formula=['1/n','2/n','−1/n','(−1)ⁿ'][outcome];
 return `<h4>1. Fix an outcome. Follow it through time.</h4>
 <div class="pw-identity">At ω = ${name}: <b>Xₙ(${name}) = ${formula}</b><span>Probability of this outcome: ${number(m.mass)}</span></div>
 <p class="pw-axis-label">Vertical axis: value Xₙ(${name}), on the same scale for every path</p>${pathPicture(outcome)}
 <p class="pw-reading">${m.converges?`This path tends to 0: for every ε &gt; 0, all n &gt; ${outcome===1?'2':'1'}/ε have |Xₙ(${name})| &lt; ε.`:'This path never settles: every odd term is −1 and every even term is +1. Its liminf is −1; its limsup is +1.'}</p>
 <h4>2. Weigh the outcomes whose paths converge.</h4>
 <div class="pw-mass-bar" role="img" aria-label="Convergent outcomes a, b, c: probability ${number(1-p)}. Nonconvergent outcome z: probability ${number(p)}."><span style="width:${100*(1-p)}%"></span><span style="width:${100*p}%"></span></div>
 <div class="pw-masses"><span><b>a, b, c → 0</b>Convergent mass: ${number(1-p)}</span><span><b>z oscillates</b>Exceptional mass: ${number(p)}</span></div>`;
}
const asReason=`<details class="pw-reason"><summary>Why can a nonempty exception be harmless?</summary><p>Here Ω = {a,b,c,z}, every subset is measurable, P({z}) = p, and each other outcome has probability (1−p)/3. The convergence event is Ω₀ = {a,b,c} for every p. Changing p changes how much probability that event carries; it does not change any path.</p><p>At p = 0, convergence fails at z but P(Ω₀) = 1, so convergence to 0 holds almost surely. At p &gt; 0, P(Ω₀) = 1−p &lt; 1, so it fails. Almost sure convergence asks for one set of probability one on which the entire sequence converges. In this example the limit on that set is finite; the definition also permits infinite limits.</p></details>`;
export function mountAlmostSure(root,{setup,range}){
 root.classList?.add('pointwise-lab');
 setup(root,'<p class="pw-question">Can a sequence converge almost surely while one outcome keeps oscillating?</p><p class="pw-space">Ω = {a,b,c,z}, with all subsets measurable. Each of a,b,c has probability (1−p)/3.</p><label>Follow outcome<select data-control="outcome" aria-label="Follow outcome"><option value="0">a · 1/n → 0</option><option value="1">b · 2/n → 0</option><option value="2">c · −1/n → 0</option><option value="3" selected>z · alternates −1, +1</option></select></label>'+range('p','Probability p of z',0,.5,0,.01),v=>[
  almostSureView(v.outcome,v.p),`<b>P(Ω₀) = P({a,b,c}) = ${number(1-v.p)}.</b> ${v.p===0?'Almost sure convergence holds. The oscillating outcome z still exists, but has probability zero.':'Almost sure convergence fails. The oscillating outcome carries positive probability.'}`]);
 root.insertAdjacentHTML?.('beforeend',asReason+`<div class="pw-print"><h4>Almost sure convergence: paths first, probability second</h4>${[0,1,2,3].map(i=>`<section><b>ω = ${['a','b','c','z'][i]}</b>${pathPicture(i)}<p>${i===3?'Odd terms −1, even terms +1: no limit.':'Xₙ = '+['1/n','2/n','−1/n'][i]+' → 0.'}</p></section>`).join('')}<p>Ω₀ = {a,b,c}. With p = 0, P(Ω₀) = 1 and convergence holds almost surely. With p = 0.1, P(Ω₀) = 0.9 and it fails. The paths are the same in both cases.</p></div>`);
}
function monotonePicture(kind,n,x){
 const spike=kind===0,max=spike?13:1,X=t=>40+300*t,Y=y=>170-145*y/max,m=monotoneModel(kind,n,x);
 let body=`<path d="M40 25V170H340" class="pw-axis"/>`;
 for(const y of spike?[0,4,8,13]:[0,.5,1])body+=`<line x1="40" x2="340" y1="${Y(y)}" y2="${Y(y)}" class="pw-grid"/>${text(26,Y(y)+5,y)}`;
 if(spike){
  body+=`<rect x="40" y="${Y(n)}" width="${300/n}" height="${170-Y(n)}" class="pw-area"/>
   <rect x="${X(m.dropLeft)}" y="${Y(n)}" width="${300*(m.dropRight-m.dropLeft)}" height="${170-Y(n)}" class="pw-lost"/>
   <path d="M40 170V${Y(n)}H${X(1/n)}V170" class="pw-path"/>
   <path d="M40 170V${Y(n+1)}H${X(1/(n+1))}V170" class="pw-next"/>`;
  // Open upper endpoints and closed zero values preserve the user's strict intervals.
  for(const k of [n,n+1])for(const t of [0,1/k])body+=`<circle cx="${X(t)}" cy="${Y(k)}" r="3" class="pw-open"/><circle cx="${X(t)}" cy="170" r="2.5" class="pw-dot"/>`;
 }else{
  body+=`<path d="M40 170L340 ${Y(1-1/n)}V170Z" class="pw-area"/><path d="M40 170L340 ${Y(1-1/n)}" class="pw-path"/><path d="M40 170L340 ${Y(1-1/(n+1))}" class="pw-next"/>`;
 }
 body+=`<line x1="${X(x)}" x2="${X(x)}" y1="20" y2="170" class="pw-tracker"/><circle cx="${X(x)}" cy="${Y(m.current)}" r="4" class="pw-dot"/><circle cx="${X(x)}" cy="${Y(m.next)}" r="5" class="pw-open"/>`;
 body+=[0,.5,1].map(t=>text(X(t),191,t)).join('')+text(190,214,'Position x in [0,1] →');
 return picture(body,`${spike?'Shrinking spike':'Increasing comparison'} at n=${n} and n+1=${n+1}. Solid curve is the current term, dashed curve is the next. Vertical dotted line fixes x=${x}.`);
}
export function monotoneView(kind,n,x){
 const m=monotoneModel(kind,n,x),spike=kind===0;
 return `<h4>${spike?'Can every point tend to zero while the area stays 1?':'What changes when heights only increase?'}</h4>
 <p class="pw-identity">${spike?'hₙ(x) = n for 0 &lt; x &lt; 1/n; 0 otherwise.':'gₙ(x) = x(1−1/n) → x.'}<span>Lebesgue measure dx on [0,1]</span></p>
 <p class="pw-axis-label">Vertical axis: function height · fixed scale 0–${spike?'13':'1'}</p>${monotonePicture(kind,n,x)}
 <div class="pw-legend"><span>━ Current term, n = ${n}</span><span>┄ Next term, n+1 = ${n+1}</span></div>
 ${spike?'<p class="pw-reading">Shaded gold strip: points where the next spike loses all its height. Open circles exclude the top endpoints.</p>':''}
 <div class="pw-masses"><span><b>At the fixed point x = ${number(x)}</b>${spike?'h':'g'}ₙ(x) = ${number(m.current)} → ${spike?'h':'g'}ₙ₊₁(x) = ${number(m.next)}</span><span><b>${m.next<m.current?'A drop: MON’s ordering fails here.':m.next>m.current?'A rise at this point.':'No change at this point.'}</b>${spike?'A rise at some points cannot repair a drop elsewhere.':'Every x ≥ 0 rises or stays fixed.'}</span></div>
 <div class="pw-integrals"><b>${spike?`∫₀¹ hₙ dx = n × (1/n) = 1`:`∫₀¹ gₙ dx = (1−1/n)/2 = ${number(m.integral)}`}</b><span>${spike?'∫₀¹ lim hₙ dx = ∫₀¹ 0 dx = 0':'∫₀¹ lim gₙ dx = ∫₀¹ x dx = 1/2'}</span></div>
 <p class="pw-reading">${spike?(x===0||x===1?`At x = ${x}, every term is already zero.`:`Hold x = ${number(x)} fixed: hₖ(x) = 0 for every k ≥ ${m.zeroFrom}.`):'At every x, gₙ₊₁(x)−gₙ(x) = x/[n(n+1)] ≥ 0.'}</p>`;
}
const monReason=`<details class="pw-reason"><summary>Why the spike converges, and exactly which hypothesis fails</summary><p>Fix x &gt; 0. As soon as n ≥ 1/x, we have 1/n ≤ x, so x lies outside (0,1/n) and hₙ(x) = 0 forever after. At x = 0 every term is zero. Thus hₙ → 0 at every point of [0,1], while ∫₀¹ hₙ dx = n(1/n) = 1 for every n. Consequently limₙ ∫ hₙ = 1 ≠ 0 = ∫ limₙ hₙ.</p><p>Measurability and nonnegativity both hold. The missing hypothesis is hₙ(x) ≤ hₙ₊₁(x) at every fixed x. On [1/(n+1),1/n), the value falls from n to 0; on (0,1/(n+1)), it rises from n to n+1. The interval of drops has positive length 1/[n(n+1)], so allowing an almost-everywhere ordering would not fix it. The sequence is neither increasing nor decreasing.</p><p>For example, h₃(0.3) = 3 but h₄(0.3) = 0; at 0.1 the same two terms rise from 3 to 4. MON orders whole functions point by point. Increasing peak heights, or even nondecreasing integrals, do not supply that ordering.</p></details>`;
export function mountMonotone(root,{setup,range}){
 root.classList?.add('pointwise-lab');
 setup(root,'<label>Compare sequences<select data-control="kind" aria-label="Compare sequences"><option value="0">Spike: MON fails</option><option value="1">Increasing: MON holds</option></select></label>'+range('n','Current term n',1,12,3)+range('x','Keep this point x fixed',0,1,.3,.01),v=>[
  monotoneView(v.kind,v.n,v.x),v.kind===0?'<b>MON does not apply.</b> The functions are measurable, nonnegative and converge pointwise, but they do not increase pointwise. The conclusion fails: 1 ≠ 0.':'<b>MON applies.</b> These measurable, nonnegative functions increase pointwise to x, and their integrals increase to 1/2.']);
 root.insertAdjacentHTML?.('beforeend',monReason+`<div class="pw-print"><h4>Shrinking support preserves area, not pointwise order</h4>${[2,4,8].map(n=>`<section>${monotoneView(0,n,.3)}</section>`).join('')}<p>For every fixed x &gt; 0, n ≥ 1/x puts x outside (0,1/n), so hₙ(x) = 0 thereafter; hₙ(0) = 0 as well. Yet every spike has area 1. On [1/(n+1),1/n), hₙ = n falls to hₙ₊₁ = 0, so pointwise increase fails on a set of positive length.</p><p>In contrast, gₙ(x) = x(1−1/n) increases to x, and ∫gₙ = (1−1/n)/2 increases to ∫x = 1/2. This sequence satisfies MON.</p></div>`);
}
