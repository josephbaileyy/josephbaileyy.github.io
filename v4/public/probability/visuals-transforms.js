// Chapter 3 models for transforms, inversion, memoryless waits and the vector CLT.
// Every curve is an exact formula or a fixed-seed sample; nothing is re-randomized on redraw.
const green='#315e4e',gold='#a36b25',grey='#8a9189';
const fmt=(x,d=3)=>Number(x).toFixed(d);
const clamp=x=>Math.max(0,Math.min(1,x));
export const sinc=x=>Math.abs(x)<1e-9?1:Math.sin(x)/x;

// S(r)=∫_0^r sin(u)/u du, tabulated once by Simpson's rule and interpolated linearly.
const STEP=.01,LIMIT=260;let table=null;
function buildTable(){
 const N=Math.round(LIMIT/STEP);table=new Float64Array(N+1);
 for(let j=1;j<=N;j++){const a=(j-1)*STEP,b=j*STEP;table[j]=table[j-1]+STEP/6*(sinc(a)+4*sinc((a+b)/2)+sinc(b));}
}
export function sineIntegral(r){
 if(r<0)return -sineIntegral(-r);
 if(!table)buildTable();
 if(r>=LIMIT)return Math.PI/2-Math.cos(r)/r; // leading asymptotic term beyond the table
 const j=Math.floor(r/STEP),w=r/STEP-j;return table[j]+(j<table.length-1?w*(table[j+1]-table[j]):0);
}
// The inversion example: X=0 with mass .4 and X=1 with mass .6; the left endpoint a is not an atom.
export const inversionLaw={atoms:[0,1],masses:[.4,.6],a:-.5};
export function inversionIntegral(T,b,{atoms,masses,a}=inversionLaw){
 return atoms.reduce((s,x,j)=>s+masses[j]*(Math.sign(x-a)*sineIntegral(T*Math.abs(x-a))-Math.sign(x-b)*sineIntegral(T*Math.abs(x-b)))/Math.PI,0);
}
export function inversionLimit(b,{atoms,masses,a}=inversionLaw){
 return atoms.reduce((s,x,j)=>s+masses[j]*(x>a&&x<b?1:x===a||x===b?.5:0),0);
}
// Three uniform families for Lévy's continuity theorem: [transform, CDF, mass kept in the limit].
export const escapeFamilies=[
 {label:'Uniform(−1/n, 1/n): concentrates',transform:(t,n)=>sinc(t/n),cdf:(x,n)=>clamp((x*n+1)/2),kept:1},
 {label:'Uniform(−n, n): spreads out',transform:(t,n)=>sinc(t*n),cdf:(x,n)=>clamp((x+n)/(2*n)),kept:0},
 {label:'Half at 0, half Uniform(−n, n)',transform:(t,n)=>.5+.5*sinc(t*n),cdf:(x,n)=>.5*(x>=0?1:0)+.5*clamp((x+n)/(2*n)),kept:.5}
];
export const gapLaws=[
 {label:'Exponential, mean 1',survival:u=>Math.exp(-Math.max(0,u))},
 {label:'Uniform on (0, 2), mean 1',survival:u=>clamp(1-Math.max(0,u)/2)}
];
export const residualSurvival=(law,s,u)=>gapLaws[law].survival(s+u)/gapLaws[law].survival(s);
// Fixed-seed fair signs, reused for every n and ρ so that changing a control never reshuffles the sample.
const SAMPLES=300,MAXN=64;let signs=null;
function buildSigns(){let state=3516;signs=new Int8Array(SAMPLES*MAXN*2);for(let j=0;j<signs.length;j++){state=(1664525*state+1013904223)>>>0;signs[j]=state&0x80000000?1:-1;}}
// Normalized sums of i.i.d. vectors (ξ, ρξ+√(1−ρ²)η) with independent fair signs ξ, η: covariance [[1,ρ],[ρ,1]].
export function vectorSums(n,rho){
 if(!signs)buildSigns();
 const c=Math.sqrt(1-rho*rho),out=[];
 for(let s=0;s<SAMPLES;s++){let a=0,b=0;for(let k=0;k<n;k++){a+=signs[2*(s*MAXN+k)];b+=signs[2*(s*MAXN+k)+1];}
  a/=Math.sqrt(n);b/=Math.sqrt(n);out.push([a,rho*a+c*b,a*a+b*b]);}
 return out; // [first coordinate, second coordinate, squared Mahalanobis distance]
}
export const ellipseMass=1-Math.exp(-2); // N(0,V) mass of {x: xᵀV⁻¹x ≤ 4}

export function frame(body,label,height=220){return `<svg viewBox="0 0 360 ${height}" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>`;}
export function plot(series,{xmin=0,xmax=1,ymin=0,ymax=1,xlabel='',ylabel='',height=220,marks=[],dots=[],label,xticks,extra}={}){
 const x=t=>46+(t-xmin)/(xmax-xmin)*290,y=t=>height-44-(t-ymin)/(ymax-ymin)*(height-90);
 const ticks=(a,b)=>[a,b].map(v=>Number.isInteger(v)?String(v):fmt(v,1));
 const [x0,x1]=xticks||ticks(xmin,xmax),[y0,y1]=ticks(ymin,ymax);
 return frame(`<text x="8" y="20" font-size="14">${ylabel}</text><path d="M46 38V${height-44}H338" fill="none" stroke="#888"/>`
  +(ymin<0?`<line x1="46" x2="338" y1="${y(0)}" y2="${y(0)}" stroke="#c9cec6"/>`:'')
  +`<text x="40" y="${y(ymin)+5}" text-anchor="end" font-size="13">${y0}</text><text x="40" y="${y(ymax)+5}" text-anchor="end" font-size="13">${y1}</text>`
  +`<text x="${x(xmin)}" y="${height-24}" text-anchor="middle" font-size="13">${x0}</text><text x="${x(xmax)}" y="${height-24}" text-anchor="middle" font-size="13">${x1}</text>`
  +`<text x="192" y="${height-3}" text-anchor="middle" font-size="14">${xlabel}</text>`
  +(extra?extra(x,y):'')
  +series.map(s=>`<polyline points="${s.points.map(([a,b])=>`${x(a).toFixed(1)},${y(Math.max(ymin,Math.min(ymax,b))).toFixed(1)}`).join(' ')}" fill="none" stroke="${s.color||green}" stroke-width="${s.width||2.5}" ${s.dash?'stroke-dasharray="5 4"':''}/>`).join('')
  +dots.map(d=>`<circle cx="${x(d[0]).toFixed(1)}" cy="${y(d[1]).toFixed(1)}" r="${d[2]||2.2}" fill="${d[3]||green}" fill-opacity="${d[4]??1}"/>`).join('')
  +marks.map(m=>`<circle cx="${x(m[0]).toFixed(1)}" cy="${y(m[1]).toFixed(1)}" r="5" fill="${gold}" stroke="white" stroke-width="1.5"/>`).join(''),label||`${ylabel} against ${xlabel}`,height);
}
export const grid=(a,b,f,N=160)=>Array.from({length:N+1},(_,j)=>{const x=a+(b-a)*j/N;return [x,f(x)]});
export const legend=(a,b)=>`<p class="small"><span style="color:${green}">━ ${a}</span>${b?` · <span style="color:${gold}">┄ ${b}</span>`:''}</p>`;
export const select=(name,label,options)=>`<label>${label}<select data-control="${name}" aria-label="${label}">${options.map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select></label>`;
const pair=(a,b)=>`<div class="tf-pair">${a}${b}</div>`;

export function mountVisual(root,name,{setup,range}){
 if(!name.startsWith('tf-'))return false;
 const run=(controls,draw)=>{setup(root,controls,draw);return true;};
 switch(name){
 case 'tf-inversion':return run(range('b','Right endpoint b',.25,1.5,1,.25)+range('T','Frequency cutoff T',1,40,12),v=>{
  const limit=inversionLimit(v.b),now=inversionIntegral(v.T,v.b);
  const endpoint=v.b===1?'b sits on the atom at 1, which counts with weight one half':v.b<1?'the atom at 1 lies outside the interval':'both atoms lie strictly inside';
  return [legend('integral over [−T, T]','its limit')+plot([{points:grid(.5,40,T=>inversionIntegral(T,v.b),400)},{points:[[0,limit],[40,limit]],color:gold,dash:true}],{xmin:0,xmax:40,ymin:.2,ymax:1.2,xlabel:'frequency cutoff T',ylabel:'recovered probability',marks:[[v.T,now]]}),
   `X = 0 with probability 0.4 and X = 1 with probability 0.6; the interval is (−0.5, ${v.b}). At T = ${v.T} the integral is ${fmt(now,4)}. Its limit is ${fmt(limit,1)}: ${endpoint}.`];});
 case 'tf-escape':return run(select('family','Laws',escapeFamilies.map(f=>f.label))+range('n','Index n',1,40,4),v=>{
  const f=escapeFamilies[v.family];
  const story=v.family===0?'The pointwise limit is 1 at every frequency. It is continuous at zero and is the transform of the point mass at 0, so the laws converge weakly to that point mass.'
   :v.family===1?'The pointwise limit is 0 at every nonzero frequency and 1 at zero. That jump at zero rules out a probability limit: at each threshold the CDF tends to 1/2, which is not a CDF.'
   :'The pointwise limit is 1/2 at every nonzero frequency and 1 at zero. Here the height beside zero is the mass that stays, 1/2; the CDFs tend to 1/4 below zero and 3/4 above it, so half the mass has escaped.';
  return [legend('transform of the n-th law','pointwise limit away from zero')+pair(
    plot([{points:grid(-6,6,t=>f.transform(t,v.n),480)},{points:[[-6,f.kept],[6,f.kept]],color:gold,dash:true}],{xmin:-6,xmax:6,ymin:-.3,ymax:1,xlabel:'frequency θ',ylabel:'transform',marks:[[0,1]]}),
    plot([{points:grid(-4,4,x=>f.cdf(x,v.n),480)}],{xmin:-4,xmax:4,xlabel:'threshold x',ylabel:'CDF'})),
   `n = ${v.n}. ${story}`];});
 case 'tf-memoryless':return run(select('law','Gap law',gapLaws.map(g=>g.label))+range('s','Time already waited s',0,1.5,.5,.1),v=>{
  const g=gapLaws[v.law],fresh=g.survival(1),aged=residualSurvival(v.law,v.s,1);
  return [legend('remaining wait, given no arrival by time s','a fresh gap')+plot([{points:grid(0,3,u=>g.survival(u)),color:gold,dash:true},{points:grid(0,3,u=>residualSurvival(v.law,v.s,u))}],{xmin:0,xmax:3,xlabel:'further time u',ylabel:'P(wait exceeds u)'}),
   `After waiting s = ${fmt(v.s,1)}: P(at least one more unit) = ${fmt(aged)}; for a fresh gap it is ${fmt(fresh)}. ${v.law===0?'The two curves coincide for every s: e⁻⁽ˢ⁺ᵘ⁾/e⁻ˢ = e⁻ᵘ.':v.s===0?'At s = 0 nothing has been learned, so the curves agree.':`A uniform gap ages: the remaining wait is uniform on (0, ${fmt(2-v.s,1)}), which is shorter than a fresh gap.`}`];});
 case 'tf-vector-clt':return run(range('k','Number of summands n = 2ᵏ, k',0,6,2)+range('rho','Correlation ρ',-.9,.9,.6,.1),v=>{
  const n=2**v.k,pts=vectorSums(n,v.rho),inside=pts.filter(p=>p[2]<=4).length;
  const a=Math.sqrt(1+v.rho),b=Math.sqrt(1-v.rho);
  const ellipse=grid(0,2*Math.PI,t=>t,160).map(([t])=>[2*(a*Math.cos(t)+b*Math.sin(t))/Math.SQRT2,2*(a*Math.cos(t)-b*Math.sin(t))/Math.SQRT2]);
  const distinct=new Set(pts.map(p=>p[0].toFixed(6)+','+p[1].toFixed(6))).size;
  return [legend(`${pts.length} normalized sums (fixed sample)`,'ellipse xᵀV⁻¹x = 4')+plot([{points:ellipse,color:gold,dash:true,width:2}],{xmin:-3.5,xmax:3.5,ymin:-3.5,ymax:3.5,xlabel:'first coordinate',ylabel:'second coordinate',height:380,dots:pts.map(p=>[p[0],p[1],2.4,green,.45]),label:'Normalized vector sums with the limiting covariance ellipse'}),
   `n = ${n}: the ${pts.length} sums land on ${distinct} distinct point${distinct===1?'':'s'}, and ${inside} (${fmt(100*inside/pts.length,1)}%) lie inside the ellipse. The limit N(0, V) puts ${fmt(100*ellipseMass,1)}% there.`];});
 case 'tf-product':return run(range('m','Number of independent uniform summands m',1,12,2),v=>[
  legend('transform of the sum, sinc(θ/2)ᵐ','normal transform with the same variance')+plot([{points:grid(-14,14,t=>sinc(t/2)**v.m,560)},{points:grid(-14,14,t=>Math.exp(-v.m*t*t/24),280),color:gold,dash:true}],{xmin:-14,xmax:14,ymin:-.3,ymax:1,xlabel:'frequency θ',ylabel:'transform'}),
  `Each summand is uniform on (−1/2, 1/2) with transform sinc(θ/2) and variance 1/12. The sum of ${v.m} has variance ${fmt(v.m/12)} and transform sinc(θ/2)${v.m===1?'':'<sup>'+v.m+'</sup>'}; at θ = 4 it equals ${fmt(sinc(2)**v.m,4)}, against ${fmt(Math.exp(-v.m*16/24),4)} for the normal law.`]);
 }
 return false;
}
