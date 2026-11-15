// Chapter 2 models: event limits, zero-one recurrence, extremes, renewal rewards and slow series.
// Samples are fixed-seed and reused across control changes, so a control never reshuffles the data.
import {normalCDF} from './visuals-distributions.js?v=intuition1';
import {plot,grid,legend,select} from './visuals-transforms.js?v=transforms1';
const green='#315e4e',gold='#a36b25',faint='#dfe5dc';
const fmt=(x,d=3)=>Number(x).toFixed(d);
function uniforms(seed,count){let state=seed;const out=new Float64Array(count);for(let j=0;j<count;j++){state=(1664525*state+1013904223)>>>0;out[j]=(state+.5)/4294967296;}return out;}

// --- 2.2.2: four example sequences of events in [0,1] with Lebesgue measure. Each set is one interval.
const dyadic=n=>{const k=Math.floor(Math.log2(n)),j=n-2**k;return [j/2**k,(j+1)/2**k];};
export const eventExamples=[
 {label:'Sliding dyadic intervals',set:dyadic,limsup:[0,1],liminf:null,values:[0,0,0,1]},
 {label:'Two overlapping intervals in turn',set:n=>n%2?[.4,1]:[0,.6],limsup:[0,1],liminf:[.4,.6],values:[.2,.6,.6,1]},
 {label:'A long and a short interval in turn',set:n=>n%2?[0,.3]:[0,.7],limsup:[0,.7],liminf:[0,.3],values:[.3,.3,.7,.7]},
 {label:'Intervals shrinking to [0, 1/2]',set:n=>[0,Math.min(1,.5+1/n)],limsup:[0,.5],liminf:[0,.5],values:[.5,.5,.5,.5]}
]; // values: P(liminf A_n), liminf P(A_n), limsup P(A_n), P(limsup A_n)

// --- 2.2.8: independent events with P(A_n)=n^{-α}, n≥2. Probability that some A_n with n≥N occurs.
const CUT=200000;const suffixCache=new Map();
function logSurvivalSuffix(alpha){
 if(!suffixCache.has(alpha)){const s=new Float64Array(CUT+2);
  // Beyond the cutoff log(1−x)≈−x, and Σ_{n>CUT} n^{-α} ≈ CUT^{1−α}/(α−1).
  s[CUT+1]=alpha>1?-(CUT**(1-alpha))/(alpha-1):-Infinity;
  for(let n=CUT;n>=2;n--)s[n]=s[n+1]+Math.log1p(-(n**-alpha));suffixCache.set(alpha,s);}
 return suffixCache.get(alpha);
}
export const laterHitProbability=(alpha,N)=>1-Math.exp(logSurvivalSuffix(alpha)[N]);
export function partialMass(alpha,N){let s=0;for(let n=2;n<=N;n++)s+=n**-alpha;return s;}

// --- 2.2.23, 2.2.24, 2.3.4: one independent sequence against a growing threshold.
const LENGTH=3000,base=uniforms(22023,LENGTH+1),base2=uniforms(22024,LENGTH+1);
export const sequences=[
 {label:'Exponential(1), scale log n',scale:n=>Math.log(n),value:n=>-Math.log(base[n]),tail:x=>Math.exp(-x),limit:'limsup Zₙ / log n = 1'},
 {label:'Standard normal, scale √(2 log n)',scale:n=>Math.sqrt(2*Math.log(n)),value:n=>Math.sqrt(-2*Math.log(base[n]))*Math.cos(2*Math.PI*base2[n]),tail:x=>1-normalCDF(x),limit:'limsup Gₙ / √(2 log n) = 1'}
];
export function exceedances(law,c,N=LENGTH){const s=sequences[law];let count=0,expected=0;for(let n=2;n<=N;n++){const level=c*s.scale(n);if(s.value(n)>level)count++;expected+=s.tail(level);}return {count,expected};}
// Pareto sample with P(|X|>x)=x^{-β} for x≥1; E|X| is infinite exactly when β≤1.
export const paretoValue=(beta,n)=>base[n]**(-1/beta);
export function jumpCount(beta,k,N=LENGTH){let count=0,expected=0;for(let n=1;n<=N;n++){if(paretoValue(beta,n)>k*n)count++;expected+=Math.min(1,(k*n)**-beta);}return {count,expected};}

// --- 2.3.10: alternating working and dark periods with exponential lengths of means a and b.
const CYCLES=2500,HORIZON=600,work=Array.from(uniforms(23101,CYCLES),u=>-Math.log(u)),dark=Array.from(uniforms(23102,CYCLES),u=>-Math.log(u));
export function litIntervals(a,b,T){const out=[];let t=0;for(let i=0;i<CYCLES&&t<T;i++){out.push([t,Math.min(T,t+a*work[i])]);t+=a*work[i]+b*dark[i];}return out;}
// The whole curve in one pass: cumulative lit time sampled on a grid.
function litCurve(a,b,steps=600){const pts=[];let i=0,start=0,done=0;for(let j=1;j<=steps;j++){const t=HORIZON*j/steps;while(start+a*work[i]+b*dark[i]<=t){done+=a*work[i];start+=a*work[i]+b*dark[i];i++;}pts.push([t,(done+Math.min(a*work[i],t-start))/t]);}return pts;}
export function litFraction(a,b,t){if(t<=0)return 1;return litIntervals(a,b,t).reduce((s,[u,v])=>s+v-u,0)/t;}

// --- 2.3.13: |X_n|/|X_0| is a product of radii R_k=√U_k (radial density 2r on (0,1)).
const DISKS=1000,radial=uniforms(23131,DISKS);
export function logRadiusRate(n,areaUniform=true){let s=0;for(let k=0;k<n;k++)s+=Math.log(radial[k]);return (areaUniform?.5:1)*s/n;}

// --- 2.1.13: P(X=(−1)^k k)=1/(c k² log k), k≥2. Signed and absolute truncated means.
const TERMS=100000;let series=null;
function buildSeries(){let c=0;for(let k=2;k<=2000000;k++)c+=1/(k*k*Math.log(k));c+=1/(2000000*Math.log(2000000));
 const signed=new Float64Array(TERMS+1),absolute=new Float64Array(TERMS+1);
 for(let k=2;k<=TERMS;k++){const term=1/(c*k*Math.log(k));signed[k]=signed[k-1]+(k%2?-term:term);absolute[k]=absolute[k-1]+term;}
 series={c,signed,absolute};}
export function truncatedMeans(K){if(!series)buildSeries();return {signed:series.signed[K],absolute:series.absolute[K],c:series.c};}

// --- 2.2.5: three hit patterns; an exit is a hit followed by a miss.
const CELLS=48,hitsAt=list=>Array.from({length:CELLS},(_,j)=>list.includes(j+1));
export const exitPaths=[
 {label:'Finitely many hits',hits:hitsAt([2,3,4,9,10,15]),verdict:'Three exits, then no hit at all. This is the only pattern the hypotheses allow: Aₙ occurs finitely often.'},
 {label:'Isolated hits that keep returning',hits:hitsAt([3,7,12,18,25,33,42]),verdict:'Every isolated hit is followed by a miss, so infinitely many hits would mean infinitely many exits. Summable exit probabilities rule this out almost surely (Borel–Cantelli I).'},
 {label:'Hits that never stop',hits:Array.from({length:CELLS},(_,j)=>[2,3,8].includes(j+1)||j+1>=21),verdict:'Only two exits, and then an unbroken run of hits. Such an outcome lies in lim inf Aₙ, whose probability is at most lim inf P(Aₙ) = 0.'}
];
export const exitCount=hits=>hits.reduce((s,h,j)=>s+(h&&j+1<hits.length&&!hits[j+1]?1:0),0);

const logTicks=N=>['1',String(N)];
function strip(sets,labels,height){
 const row=22,x=t=>70+t*270;
 return `<svg viewBox="0 0 360 ${height}" role="img" aria-label="Events drawn as intervals of the unit interval"><title>Events drawn as intervals of the unit interval</title>`
  +sets.map((s,i)=>`<text x="62" y="${18+i*row}" text-anchor="end" font-size="13">${labels[i]}</text><rect x="${x(0)}" y="${6+i*row}" width="270" height="14" fill="${faint}"/>${s?`<rect x="${x(s[0]).toFixed(1)}" y="${6+i*row}" width="${Math.max(1.5,(s[1]-s[0])*270).toFixed(1)}" height="14" fill="${i>=sets.length-2?gold:green}"/>`:''}`).join('')+'</svg>';
}

export function mountVisual(root,name,{setup,range}){
 if(!name.startsWith('as-'))return false;
 const run=(controls,draw)=>{setup(root,controls,draw);return true;};
 switch(name){
 case 'as-event-limits':return run(select('example','Events Aₙ ⊆ [0, 1]',eventExamples.map(e=>e.label))+range('start','First index shown',1,57,1),v=>{
  const e=eventExamples[v.example],rows=Array.from({length:8},(_,j)=>v.start+j);
  const [a,b,c,d]=e.values,rel=(p,q)=>p===q?'=':'&lt;';
  return [strip([...rows.map(e.set),e.limsup,e.liminf],[...rows.map(n=>'A'+n),'lim sup','lim inf'],228),
   `P(lim inf Aₙ) = ${a} ${rel(a,b)} lim inf P(Aₙ) = ${b} ${rel(b,c)} lim sup P(Aₙ) = ${c} ${rel(c,d)} P(lim sup Aₙ) = ${d}. ${e.liminf?'':'No point stays in the sets from some index on, so lim inf Aₙ is empty. '}Gold bars are the points hit infinitely often and the points hit from some index on.`];});
 case 'as-zero-one':return run(range('alpha','Exponent α in P(Aₙ) = n⁻ᵅ',.5,2,1.5,.1)+range('N','Look only at indices n ≥ N',2,200,20),v=>{
  const q=laterHitProbability(v.alpha,v.N),converges=v.alpha>1;
  return [legend('P(some Aₙ with n ≥ N occurs)')+plot([{points:grid(2,200,N=>laterHitProbability(v.alpha,Math.round(N)),198)}],{xmin:2,xmax:200,xlabel:'starting index N',ylabel:'probability of a later hit',marks:[[v.N,q]]}),
   `α = ${fmt(v.alpha,1)}: the first 200 probabilities add to ${fmt(partialMass(v.alpha,200),2)}, and the full series ${converges?'converges':'diverges'}. P(a hit at or after ${v.N}) = ${fmt(q,4)}. ${converges?'These probabilities fall to 0 as N grows, so P(Aₙ i.o.) = 0.':'They equal 1 for every N, so P(Aₙ i.o.) = 1.'}`];});
 case 'as-extremes':return run(select('law','Sequence',sequences.map(s=>s.label))+range('c','Level c',.5,1.5,.8,.05),v=>{
  const s=sequences[v.law],{count,expected}=exceedances(v.law,v.c),dots=[];
  for(let n=2;n<=LENGTH;n++){const y=s.value(n)/s.scale(n);if(y>=0&&y<=2.2)dots.push([Math.log10(n),y,y>v.c?2.6:1.5,y>v.c?gold:green,y>v.c?1:.35]);}
  return [legend('each term divided by its scale','level c')+plot([{points:[[0,v.c],[Math.log10(LENGTH),v.c]],color:gold,dash:true,width:2}],{xmin:0,xmax:Math.log10(LENGTH),ymin:0,ymax:2.2,xlabel:'index n (logarithmic)',ylabel:'term ÷ scale',xticks:logTicks(LENGTH),dots,label:'Scaled terms of one fixed sample against the level c'}),
   `c = ${fmt(v.c,2)}: ${count} of the first ${LENGTH} terms lie above the level; the expected number is ${fmt(expected,1)}. ${v.c>1?'Over all n the exceedance probabilities have a finite sum, so almost surely only finitely many terms exceed the level.':v.law===0||v.c<1?'Over all n the exceedance probabilities have an infinite sum and the terms are independent, so almost surely infinitely many exceed it.':'At c = 1 the normal tail carries an extra factor 1/√(log n), yet the sum still diverges.'} Hence ${s.limit}.`];});
 case 'as-jumps':return run(range('beta','Tail exponent β in P(|X| > x) = x⁻ᵝ',.5,2.5,1,.25)+range('k','Multiple k',1,5,1),v=>{
  const {count,expected}=jumpCount(v.beta,v.k),dots=[],heavy=v.beta<=1;
  for(let n=1;n<=LENGTH;n++){const y=Math.log10(paretoValue(v.beta,n)/n);if(y>=-4)dots.push([Math.log10(n),Math.min(y,2),y>Math.log10(v.k)?2.6:1.5,y>Math.log10(v.k)?gold:green,y>Math.log10(v.k)?1:.35]);}
  return [legend('|Xₙ| / n for one fixed sample','level k')+plot([{points:[[0,Math.log10(v.k)],[Math.log10(LENGTH),Math.log10(v.k)]],color:gold,dash:true,width:2}],{xmin:0,xmax:Math.log10(LENGTH),ymin:-4,ymax:2,xlabel:'index n (logarithmic)',ylabel:'log₁₀ of |Xₙ| / n',xticks:logTicks(LENGTH),dots,label:'Normalized terms of one fixed heavy-tailed sample'}),
   `β = ${fmt(v.beta,2)}: E|X| is ${heavy?'infinite':'finite'}. ${count} of the first ${LENGTH} terms exceed ${v.k}·n; the expected number is ${fmt(expected,1)}. ${heavy?'The exceedance probabilities sum to infinity for every k, so jumps larger than kn keep occurring and neither |Xₙ|/n nor Sₙ/n can stay bounded.':'The exceedance probabilities have a finite sum, so such jumps stop, as the strong law requires.'}`];});
 case 'as-lit':return run(range('a','Mean working time',.5,3,2,.25)+range('b','Mean dark time',.5,3,1,.25)+range('t','Time t',10,600,100,10),v=>{
  const limit=v.a/(v.a+v.b),now=litFraction(v.a,v.b,v.t),lit=litIntervals(v.a,v.b,HORIZON);
  return [legend('fraction of [0, t] with working light','E(working) ÷ E(cycle)')+plot([{points:litCurve(v.a,v.b)},{points:[[0,limit],[HORIZON,limit]],color:gold,dash:true}],{xmin:0,xmax:HORIZON,xlabel:'time t',ylabel:'fraction lit',marks:[[v.t,now]],
    extra:(x,y)=>lit.map(([p,q])=>`<rect x="${x(p).toFixed(1)}" y="${y(0)-7}" width="${Math.max(.6,x(q)-x(p)).toFixed(1)}" height="6" fill="${green}" fill-opacity=".55"/>`).join('')}),
   `At t = ${v.t} the light has worked ${fmt(100*now,1)}% of the time. The limit is ${fmt(v.a,2)} / (${fmt(v.a,2)} + ${fmt(v.b,2)}) = ${fmt(limit)}. The bars along the axis are the working periods; the unfinished cycle at time t matters less and less.`];});
 case 'as-disks':return run(range('k','Number of steps n = 10ᵏ, k',1,3,2,.25),v=>{
  const n=Math.round(10**v.k),steps=Array.from({length:121},(_,j)=>Math.max(1,Math.round(10**(3*j/120))));
  return [legend('(1/n) log(|Xₙ| / |X₀|), points uniform in the disk','the same sample with a uniform radius instead')+plot([{points:steps.map(m=>[Math.log10(m),logRadiusRate(m,false)]),color:gold,dash:true},{points:steps.map(m=>[Math.log10(m),logRadiusRate(m)])},{points:[[0,-.5],[3,-.5]],color:green,width:1},{points:[[0,-1],[3,-1]],color:gold,width:1}],{xmin:0,xmax:3,ymin:-1.6,ymax:0,xlabel:'steps n (logarithmic)',ylabel:'growth rate',xticks:logTicks(1000),marks:[[Math.log10(n),logRadiusRate(n)]]}),
   `n = ${n}: (1/n) log(|Xₙ| / |X₀|) = ${fmt(logRadiusRate(n))}, approaching −1/2. A point uniform in area has radius √U with U uniform, so each log-radius is half of log U and the rate is half of E log U = −1. Treating the radius itself as uniform would give −1.`];});
 case 'as-signed-mean':return run(range('k','Terms kept: values up to K = 10ᵏ, k',1,5,3,.25),v=>{
  const K=Math.round(10**v.k),m=truncatedMeans(K),steps=Array.from({length:141},(_,j)=>Math.max(2,Math.round(10**(.3+4.7*j/140))));
  return [legend('signed truncated mean E[X; |X| ≤ K]','absolute truncated mean E[|X|; |X| ≤ K]')+plot([{points:steps.map(k=>[Math.log10(k),truncatedMeans(k).absolute]),color:gold,dash:true},{points:steps.map(k=>[Math.log10(k),truncatedMeans(k).signed])}],{xmin:.3,xmax:5,ymin:0,ymax:6,xlabel:'truncation level K (logarithmic)',ylabel:'truncated mean',xticks:['2','100000'],marks:[[Math.log10(K),m.signed]]}),
   `K = ${K}: the signed mean is ${fmt(m.signed,4)} and the absolute mean is ${fmt(m.absolute,3)}. The alternating signs make the signed means settle near ${fmt(truncatedMeans(TERMS).signed,3)}, the limit of Sₙ/n in probability. The absolute means grow like log log K without bound, so E|X| = ∞: the averages converge in probability but not almost surely.`];});
 case 'as-exits':return run(select('path','One outcome',exitPaths.map(p=>p.label)),v=>{
  const p=exitPaths[v.path],w=6.6;
  const cells=p.hits.map((h,j)=>`<rect x="${20+j*w}" y="26" width="${w-1}" height="22" fill="${h?green:faint}"/>${h&&j+1<CELLS&&!p.hits[j+1]?`<path d="M${20+(j+1)*w-.5} 20v34" stroke="${gold}" stroke-width="2"/>`:''}`).join('');
  return [`<p class="small"><span style="color:${green}">■ n with the outcome in Aₙ</span> · <span style="color:${gold}">| exit: in Aₙ but not in Aₙ₊₁</span></p><svg viewBox="0 0 360 78" role="img" aria-label="Hits and exits along the first 48 indices"><title>Hits and exits along the first 48 indices</title>${cells}<text x="20" y="72" font-size="13">n = 1</text><text x="${20+CELLS*w}" y="72" text-anchor="end" font-size="13">${CELLS}${v.path===0?'':' …'}</text></svg>`,
   `${p.hits.filter(Boolean).length} hits and ${exitCount(p.hits)} exits among the first ${CELLS} indices${v.path===0?'':', with the pattern continuing'}. ${p.verdict}`];});
 }
 return false;
}
