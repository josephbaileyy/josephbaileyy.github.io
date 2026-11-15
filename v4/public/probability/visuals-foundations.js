// Chapter 1 models that replace text-only outlines: closure systems on a four-point space,
// threshold sets of monotone and semicontinuous functions, jumps of a CDF, and interval masses from a CDF.
import {frame,legend,plot} from './visuals-transforms.js?v=transforms1';
const green='#315e4e',gold='#a36b25',pale='#d8e8df',faint='#eeeee8',grey='#8a9189';
const fmt=(x,d=2)=>Number(x).toFixed(d).replace(/\.?0+$/,'')||'0';
const pick=(name,label,options,selected=0)=>`<label>${label}<select data-control="${name}" aria-label="${label}">${options.map((s,i)=>`<option value="${i}"${i===selected?' selected':''}>${s}</option>`).join('')}</select></label>`;

// ---------- Closure systems on Ω={1,2,3,4}; a set is a 4-bit mask.
const FULL=15;
export const setName=m=>m===0?'∅':m===FULL?'Ω':'{'+[1,2,3,4].filter(j=>m&(1<<(j-1))).join(',')+'}';
const mask=(...xs)=>xs.reduce((m,x)=>m|(1<<(x-1)),0);
export const families=[
 {label:'{1,2} and {2,3}',sets:[mask(1,2),mask(2,3)]},
 {label:'{1,2}, {2,3} and {2}',sets:[mask(1,2),mask(2,3),mask(2)]},
 {label:'{1,2} and {1,2,3}',sets:[mask(1,2),mask(1,2,3)]},
 {label:'{1,2} and {3,4}',sets:[mask(1,2),mask(3,4)]}
];
// Smallest λ-system: contains Ω and B∖A for nested A⊆B. On a finite space increasing limits add nothing.
export function lambdaSystem(sets){const L=new Set([FULL,...sets]);let grew=true;while(grew){grew=false;for(const a of [...L])for(const b of [...L])if((a&b)===a&&!L.has(b&~a)){L.add(b&~a);grew=true;}}return L;}
export function sigmaAlgebra(sets){const S=new Set([0,FULL,...sets]);let grew=true;while(grew){grew=false;for(const a of [...S]){if(!S.has(FULL&~a)){S.add(FULL&~a);grew=true;}for(const b of [...S])if(!S.has(a|b)){S.add(a|b);grew=true;}}}return S;}
export function missingIntersections(sets){const out=new Set();for(const a of sets)for(const b of sets)if(!sets.includes(a&b))out.add(a&b);return [...out];}
const bits=m=>[0,1,2,3].filter(j=>m&(1<<j)).length;
const rows=[0,1,2,3,4].map(k=>Array.from({length:16},(_,m)=>m).filter(m=>bits(m)===k));
function subsetGrid(style,label){
 const w=52,h=26;
 return frame(rows.map((row,r)=>row.map((m,i)=>{const x=180-row.length*w/2+i*w,y=8+r*(h+8),s=style(m);
  return `<rect x="${x+2}" y="${y}" width="${w-4}" height="${h}" rx="4" fill="${s.fill}" stroke="${s.stroke||'none'}" stroke-width="2"${s.dash?' stroke-dasharray="4 3"':''}/><text x="${x+w/2}" y="${y+18}" text-anchor="middle" font-size="12" style="fill:${s.text||'#4f6156'}">${setName(m)}</text>`;}).join('')).join(''),label,180);
}
// ---------- 1.1.46(b): ∅, Ω and all two-point subsets of a four-point space.
export const pairFamily=[0,FULL,...rows[2]];

// ---------- Threshold sets {g ≤ b}. A function is a list of linear pieces on intervals with open or closed ends.
const piece=(lo,hi,loClosed,hiClosed,slope,at)=>({lo,hi,loClosed,hiClosed,f:x=>at+slope*(x-lo),slope,at});
export const thresholdFunctions={
 monotone:[piece(-2,-1,true,false,.5,-2),piece(-1,.5,true,true,.4,-1),piece(.5,2,false,true,.5,.6)],
 lsc:[piece(-2,-1,true,false,0,1.6),piece(-1,0,true,false,0,1),piece(0,0,true,true,0,0),piece(0,1,false,false,0,1),piece(1,2,true,true,0,.4)],
 notLsc:[piece(-2,-1,true,false,0,1.6),piece(-1,0,true,false,0,1),piece(0,0,true,true,0,0),piece(0,1,false,true,0,1),piece(1,2,false,true,0,.4)]
};
// Exact sublevel set as a union of intervals; adjacent pieces merge when a shared endpoint belongs to either.
export function sublevel(pieces,b){
 const parts=[];
 for(const p of pieces){
  if(p.slope===0){if(p.at<=b+1e-12)parts.push({lo:p.lo,hi:p.hi,loClosed:p.loClosed,hiClosed:p.hiClosed});continue;}
  const cut=p.lo+(b-p.at)/p.slope; // increasing piece: g ≤ b exactly for x ≤ cut
  if(cut<p.lo-1e-12||(Math.abs(cut-p.lo)<1e-12&&!p.loClosed))continue;
  if(cut>=p.hi-1e-12)parts.push({lo:p.lo,hi:p.hi,loClosed:p.loClosed,hiClosed:p.hiClosed&&cut>=p.hi-1e-12});
  else parts.push({lo:p.lo,hi:cut,loClosed:p.loClosed,hiClosed:true});
 }
 const out=[];for(const q of parts){const last=out[out.length-1];if(last&&Math.abs(last.hi-q.lo)<1e-12&&(last.hiClosed||q.loClosed)){last.hi=q.hi;last.hiClosed=q.hiClosed;}else out.push({...q});}
 return out;
}
// Closed relative to the window [−2,2]: every finite endpoint inside the window belongs to the set.
export const isClosed=set=>set.every(s=>s.loClosed&&s.hiClosed);
const interval=s=>s.lo===s.hi?`{${fmt(s.lo)}}`:`${s.loClosed?'[':'('}${fmt(s.lo)}, ${fmt(s.hi)}${s.hiClosed?']':')'}`;
function thresholdPlot(pieces,b,ymin,ymax){
 const x=t=>40+(t+2)/4*300,y=t=>150-(t-ymin)/(ymax-ymin)*125,set=sublevel(pieces,b);
 const dot=(px,py,solid,color)=>`<circle cx="${x(px).toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${solid?color:'#fffefa'}" stroke="${color}" stroke-width="2"/>`;
 return frame(`<path d="M40 20V150H340" fill="none" stroke="#888"/><text x="34" y="${y(ymax)+4}" text-anchor="end" font-size="12">${fmt(ymax)}</text><text x="34" y="${y(ymin)+4}" text-anchor="end" font-size="12">${fmt(ymin)}</text><text x="40" y="190" text-anchor="middle" font-size="12">−2</text><text x="340" y="190" text-anchor="middle" font-size="12">2</text>`
  +`<line x1="40" x2="340" y1="${y(b).toFixed(1)}" y2="${y(b).toFixed(1)}" stroke="${gold}" stroke-width="2" stroke-dasharray="5 4"/><text x="344" y="${y(b)+4}" font-size="12" style="fill:${gold}">b</text>`
  +pieces.map(p=>p.lo===p.hi?'':`<line x1="${x(p.lo).toFixed(1)}" y1="${y(p.f(p.lo)).toFixed(1)}" x2="${x(p.hi).toFixed(1)}" y2="${y(p.f(p.hi)).toFixed(1)}" stroke="${green}" stroke-width="2.5"/>`).join('')
  +pieces.map(p=>p.lo===p.hi?dot(p.lo,y(p.at),true,green):(p.lo>-2?dot(p.lo,y(p.f(p.lo)),p.loClosed,green):'')+(p.hi<2?dot(p.hi,y(p.f(p.hi)),p.hiClosed,green):'')).join('')
  +set.map(s=>(s.lo===s.hi?'':`<line x1="${x(s.lo).toFixed(1)}" x2="${x(s.hi).toFixed(1)}" y1="168" y2="168" stroke="${gold}" stroke-width="6"/>`)+(s.lo>-2||s.lo===s.hi?dot(s.lo,168,s.loClosed,gold):'')+(s.hi<2&&s.lo!==s.hi?dot(s.hi,168,s.hiClosed,gold):'')).join(''),'A function, a threshold b, and the set where the function is at most b',200);
}

// ---------- 1.2.39: a CDF with a continuous part of mass .4 and ten atoms with geometric masses.
const PHI=(Math.sqrt(5)-1)/2;
export const atoms=Array.from({length:10},(_,j)=>({x:((j+1)*PHI)%1,mass:.6*2**-(j+1)/(1-2**-10)}));
export const jumpCDF=x=>x<0?0:.4*Math.min(1,x)+atoms.reduce((s,a)=>s+(x>=a.x?a.mass:0),0);
export const jumpsAtLeast=size=>atoms.filter(a=>a.mass>=size-1e-15);

// ---------- 1.2.45: uniform mass .7 on [−2,2] plus an atom of mass .3 at 0.
export const mixedCDF=x=>.7*Math.max(0,Math.min(1,(x+2)/4))+(x>=0?.3:0);
export const mixedLeft=x=>.7*Math.max(0,Math.min(1,(x+2)/4))+(x>0?.3:0);
export function intervalMasses(a,b){return {openClosed:mixedCDF(b)-mixedCDF(a),closed:mixedCDF(b)-mixedLeft(a),open:mixedLeft(b)-mixedCDF(a),point:mixedCDF(b)-mixedLeft(b)};}

// ---------- 1.3.23: error events E_n on [0,1) as arcs of a circle, and the tail unions A_N.
const GOLDEN=(Math.sqrt(5)-1)/2,LAST=400;
const arc=(start,length)=>{const a=((start%1)+1)%1;return a+length<=1?[[a,a+length]]:[[a,1],[0,a+length-1]];};
export const errorKinds=[
 {label:'Lengths 2⁻ⁿ at scattered positions',length:n=>2**-n,set:n=>arc(n*GOLDEN,2**-n)},
 {label:'Lengths 1/(n+1), each starting where the last ended',length:n=>1/(n+1),set:n=>{let start=0;for(let k=1;k<n;k++)start+=1/(k+1);return arc(start,1/(n+1));}}
];
export function unionMeasure(intervals){const sorted=[...intervals].sort((p,q)=>p[0]-q[0]);let total=0,end=-Infinity;for(const [lo,hi] of sorted){if(hi<=end)continue;total+=hi-Math.max(lo,end);end=hi;}return total;}
export function mergeIntervals(intervals){const out=[];for(const [lo,hi] of [...intervals].sort((p,q)=>p[0]-q[0])){const last=out[out.length-1];if(last&&lo<=last[1])last[1]=Math.max(last[1],hi);else out.push([lo,hi]);}return out;}
export const tailUnion=(kind,N)=>{const all=[];for(let n=N;n<=LAST;n++)all.push(...errorKinds[kind].set(n));return mergeIntervals(all);};

// ---------- 1.2.3: a two-coordinate observation of ω∈[0,1] and the preimage of a rectangle.
export const X1=w=>.5+.42*Math.cos(2*Math.PI*w),X2=w=>.5+.42*Math.sin(4*Math.PI*w);
const HALF=.16,GRID=1200;
export function preimages(c1,c2){const one=[],two=[],both=[];for(let j=0;j<GRID;j++){const w=(j+.5)/GRID,a=Math.abs(X1(w)-c1)<=HALF,b=Math.abs(X2(w)-c2)<=HALF;one.push(a);two.push(b);both.push(a&&b);}return {one,two,both};}
const runs=flags=>{const out=[];let start=-1;flags.forEach((f,j)=>{if(f&&start<0)start=j;if(!f&&start>=0){out.push([start/GRID,j/GRID]);start=-1;}});if(start>=0)out.push([start/GRID,1]);return out;};

// ---------- 1.2.15: a disk approximated by finite unions of dyadic squares.
const DISK={x:.5,y:.5,r:.33},inDisk=(x,y)=>(x-DISK.x)**2+(y-DISK.y)**2<=DISK.r**2;
export function dyadicApproximation(level){const n=2**level,chosen=[];for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(inDisk((i+.5)/n,(j+.5)/n))chosen.push([i,j]);
 const M=512,cell=M/n;let mismatch=0;const pick=new Set(chosen.map(([i,j])=>i*n+j));
 for(let a=0;a<M;a++)for(let b=0;b<M;b++){const inB=pick.has(Math.floor(a/cell)*n+Math.floor(b/cell));if(inB!==inDisk((a+.5)/M,(b+.5)/M))mismatch++;}
 return {n,chosen,mismatch:mismatch/(M*M),area:chosen.length/(n*n)};}

// ---------- 1.2.28: local envelopes of a function with one jump and one isolated spike.
export const SPIKE=-1,JUMP=.5;
export const gEnvelope=x=>x===SPIKE?1.3:.5*Math.sin(1.5*x)+(x>=JUMP?.8:0);
// Supremum and infimum of g over the open ball (x−δ,x+δ): a fine grid plus the two special points.
export function envelopes(x,delta){let lo=Infinity,hi=-Infinity;const N=Math.max(40,Math.ceil(delta/.002));
 for(let j=1;j<2*N;j++){const y=x-delta+j*delta/N;if(y===SPIKE)continue;const v=.5*Math.sin(1.5*y)+(y>=JUMP?.8:0);lo=Math.min(lo,v);hi=Math.max(hi,v);}
 if(Math.abs(x-SPIKE)<delta)hi=Math.max(hi,1.3);
 if(x-delta<JUMP&&JUMP<x+delta){lo=Math.min(lo,.5*Math.sin(1.5*JUMP));hi=Math.max(hi,.5*Math.sin(1.5*JUMP)+.8);}
 return [lo,hi];}

// ---------- 1.1.30: outer length of a set from covers by cells of a dyadic grid.
export const TARGET=[[.13,.41],[.62,.71]];
export function gridCover(level){const n=2**level,cells=[];for(let j=0;j<n;j++){const lo=j/n,hi=(j+1)/n;if(TARGET.some(([a,b])=>lo<b&&hi>a))cells.push(j);}return {n,cells,length:cells.length/n};}

export function mountVisual(root,name,{setup,range}){
 if(!name.startsWith('fd-'))return false;
 const run=(controls,draw)=>{setup(root,controls,draw);return true;};
 switch(name){
 case 'fd-dynkin':case 'fd-dynkin-pi':return run(pick('family','Generators 𝒫 on Ω = {1,2,3,4}',families.map(f=>f.label),name==='fd-dynkin'?0:1),v=>{
  const P=families[v.family].sets,L=lambdaSystem(P),S=sigmaAlgebra(P),missing=missingIntersections(P);
  const style=m=>P.includes(m)?{fill:green,text:'#fff'}:L.has(m)?{fill:pale,stroke:green}:S.has(m)?{fill:'#fffefa',stroke:gold,dash:true}:{fill:faint,text:grey};
  const same=L.size===S.size;
  return [`<p class="small"><span style="color:${green}">■ generator</span> · <span style="color:${green}">▢ in the smallest λ-system</span> · <span style="color:${gold}">┄ only in σ(𝒫)</span> · <span style="color:${grey}">grey: in neither</span></p>`+subsetGrid(style,'The sixteen subsets of a four-point space, marked by membership'),
   `${missing.length?`𝒫 is not a π-system: ${missing.map(setName).join(', ')} ${missing.length===1?'is an intersection':'are intersections'} of generators but not in 𝒫.`:'𝒫 is a π-system: every intersection of generators is a generator.'} The smallest λ-system has ${L.size} sets and σ(𝒫) has ${S.size}. ${same?(missing.length?'They still agree here: intersection closure is sufficient for Dynkin’s conclusion, not necessary.':'They agree, as Dynkin’s theorem guarantees.'):`The λ-system stops short: it contains {1,2} and {2,3} but not their intersection {2}, so a property verified on 𝒫 and preserved by λ-operations need not hold on all of σ(𝒫).`}`];});
 case 'fd-pairs':return run(pick('a','First set A',rows[2].map(setName),0)+pick('b','Second set B',rows[2].map(setName),5),v=>{
  const A=rows[2][v.a],B=rows[2][v.b],union=A|B,meet=A&B,inC=m=>pairFamily.includes(m);
  const style=m=>m===A||m===B?{fill:green,text:'#fff'}:m===union||m===meet?{fill:'#fffefa',stroke:gold,dash:!inC(m)}:inC(m)?{fill:pale}:{fill:faint,text:grey};
  return [`<p class="small"><span style="color:${green}">■ A and B</span> · <span style="color:${gold}">▢ A ∪ B and A ∩ B (dashed when outside 𝒞)</span> · pale: other members of 𝒞</p>`+subsetGrid(style,'The collection of the empty set, the whole space and all two-point sets'),
   `A = ${setName(A)}, B = ${setName(B)}. ${A===B?'The two sets coincide.':meet===0?`They are disjoint, and A ∪ B = Ω is in 𝒞, as the disjoint-union rule requires.`:`They overlap, so the rule says nothing. A ∪ B = ${setName(union)} and A ∩ B = ${setName(meet)} are both outside 𝒞: it is not an algebra.`} Every complement of a member is a member.`];});
 case 'fd-threshold':return run(range('b','Threshold b',-1.9,1.3,-.2,.1),v=>{
  const set=sublevel(thresholdFunctions.monotone,v.b),s=set[0];
  return [legend('nondecreasing g with two jumps','threshold b and the set {g ≤ b}')+thresholdPlot(thresholdFunctions.monotone,v.b,-2,1.4),
   `b = ${fmt(v.b)}: {g ≤ b} = ${s?(s.hi>=2?'everything shown':`(−∞, ${fmt(s.hi)}${s.hiClosed?']':')'}`):'∅ within the window'}. ${s&&s.hi<2?(s.hiClosed?'The endpoint belongs to the set.':'The endpoint is excluded: at the jump, g already exceeds b.'):''} Whatever b is, the set is a lower interval, hence Borel.`];});
 case 'fd-threshold-lsc':return run(pick('kind','Value at the jump x = 1',['The lower value (lower semicontinuous)','The upper value (not lower semicontinuous)'])+range('b','Threshold b',-.2,1.8,.6,.1),v=>{
  const pieces=v.kind?thresholdFunctions.notLsc:thresholdFunctions.lsc,set=sublevel(pieces,v.b),closed=isClosed(set);
  return [legend('g, with a filled dot for the value taken at each jump','threshold b and the set {g ≤ b}')+thresholdPlot(pieces,v.b,-.2,1.8),
   `b = ${fmt(v.b)}: {g ≤ b} = ${set.length?set.map(interval).join(' ∪ '):'∅'}. ${set.length?(closed?'Every endpoint belongs to the set, so it is closed.':'An endpoint is missing, so the set is not closed: points of the set approach x = 1 from the right, but g(1) is above b.'):'The empty set is closed.'}`];});
 case 'fd-jumps':return run(range('m','Count jumps of size at least 1/m, m',1,60,8),v=>{
  const big=jumpsAtLeast(1/v.m),xs=[0,...atoms.map(a=>a.x).sort((p,q)=>p-q),1],pts=[];
  for(let i=0;i<xs.length-1;i++){pts.push([xs[i],jumpCDF(xs[i])],[xs[i+1],jumpCDF(xs[i+1])-(atoms.find(a=>a.x===xs[i+1])?.mass||0)]);}
  const x=t=>46+t*290,y=t=>176-t*138;
  return [legend('a distribution function with ten jumps','jumps of size ≥ 1/m')+frame(`<path d="M46 38V176H338" fill="none" stroke="#888"/><text x="40" y="43" text-anchor="end" font-size="13">1</text><text x="40" y="181" text-anchor="end" font-size="13">0</text><text x="46" y="196" text-anchor="middle" font-size="13">0</text><text x="336" y="196" text-anchor="middle" font-size="13">1</text>`
    +atoms.map(a=>`<line x1="${x(a.x).toFixed(1)}" x2="${x(a.x).toFixed(1)}" y1="${y(jumpCDF(a.x)-a.mass).toFixed(1)}" y2="${y(jumpCDF(a.x)).toFixed(1)}" stroke="${big.includes(a)?gold:'#b9c2b8'}" stroke-width="${big.includes(a)?4:2}"/>`).join('')
    +pts.reduce((s,p,i)=>i%2?s+`<line x1="${x(pts[i-1][0]).toFixed(1)}" y1="${y(pts[i-1][1]).toFixed(1)}" x2="${x(p[0]).toFixed(1)}" y2="${y(p[1]).toFixed(1)}" stroke="${green}" stroke-width="2.5"/>`:s,''),'A distribution function with jumps; the large jumps are highlighted',204),
   `m = ${v.m}: ${big.length} jump${big.length===1?' has':'s have'} size at least 1/${v.m}. There can never be more than ${v.m}, because jumps of that size use up at least 1/${v.m} each of a total rise of 1. Every jump has size at least 1/m for some m, so the set of jumps is a countable union of finite sets.`];});
 case 'fd-cdf-interval':return run(range('a','Left endpoint a',-2,2,-1,.25)+range('b','Right endpoint b',-2,2,0,.25),v=>{
  const a=Math.min(v.a,v.b),b=Math.max(v.a,v.b),m=intervalMasses(a,b),x=t=>46+(t+2)/4*290,y=t=>176-t*138;
  const curve=[[-2,0],[0,mixedLeft(0)]],curve2=[[0,mixedCDF(0)],[2,1]];
  const seg=c=>`<line x1="${x(c[0][0])}" y1="${y(c[0][1]).toFixed(1)}" x2="${x(c[1][0])}" y2="${y(c[1][1]).toFixed(1)}" stroke="${green}" stroke-width="2.5"/>`;
  const level=(t,label)=>`<line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="176" y2="${y(mixedCDF(t)).toFixed(1)}" stroke="${gold}" stroke-width="2" stroke-dasharray="4 3"/><line x1="46" x2="${x(t).toFixed(1)}" y1="${y(mixedCDF(t)).toFixed(1)}" y2="${y(mixedCDF(t)).toFixed(1)}" stroke="${gold}" stroke-width="1" stroke-dasharray="2 3"/><text x="${x(t).toFixed(1)}" y="196" text-anchor="middle" font-size="13" style="fill:${gold}">${label}</text>`;
  return [legend('distribution function F: uniform mass 0.7 on [−2, 2] and an atom 0.3 at 0','the two thresholds')+frame(`<path d="M46 38V176H338" fill="none" stroke="#888"/><text x="40" y="43" text-anchor="end" font-size="13">1</text><text x="40" y="181" text-anchor="end" font-size="13">0</text>`
    +`<rect x="42" y="${y(mixedCDF(b)).toFixed(1)}" width="4" height="${Math.max(0,y(mixedCDF(a))-y(mixedCDF(b))).toFixed(1)}" fill="${gold}"/>`+seg(curve)+seg(curve2)+`<circle cx="${x(0)}" cy="${y(mixedLeft(0)).toFixed(1)}" r="4" fill="#fffefa" stroke="${green}" stroke-width="2"/><circle cx="${x(0)}" cy="${y(mixedCDF(0)).toFixed(1)}" r="4" fill="${green}"/>`+level(a,'a')+(b>a?level(b,'b'):''),'A distribution function with two thresholds and the rise between them',204),
   a===b?`a = b = ${fmt(b)}: the interval (a, b] is empty, and the single point has P({b}) = F(b) − F(b−) = ${fmt(m.point,4)}. Move one endpoint to open an interval.`:`P((a, b]) = F(b) − F(a) = ${fmt(mixedCDF(b),4)} − ${fmt(mixedCDF(a),4)} = ${fmt(m.openClosed,4)}. Left limits give the other shapes: P([a, b]) = F(b) − F(a−) = ${fmt(m.closed,4)}, P((a, b)) = F(b−) − F(a) = ${fmt(m.open,4)}, P({b}) = F(b) − F(b−) = ${fmt(m.point,4)}. The half-lines already fix the mass of every interval, and intervals generate the Borel sets.`];});
 case 'fd-late-errors':return run(pick('kind','Error events Eₙ = {|Xₙ − X| > ε}',errorKinds.map(k=>k.label))+range('N','First index N',1,40,3),v=>{
  const k=errorKinds[v.kind],rowsShown=Array.from({length:6},(_,j)=>v.N+j),tail=tailUnion(v.kind,v.N),mass=unionMeasure(tail),x=t=>70+t*270,row=22;
  // A single event is always drawn at least 1.2 units wide; in the union, slivers too thin to see are left out so the drawn length stays honest.
  const bars=(sets,i,color,floor=1.2)=>`<rect x="${x(0)}" y="${6+i*row}" width="270" height="14" fill="${faint}"/>`+sets.filter(([lo,hi])=>floor||(hi-lo)*270>=.3).map(([lo,hi])=>`<rect x="${x(lo).toFixed(2)}" y="${6+i*row}" width="${Math.max(floor,(hi-lo)*270).toFixed(2)}" height="14" fill="${color}"/>`).join('');
  return [frame(rowsShown.map((n,i)=>`<text x="62" y="${18+i*row}" text-anchor="end" font-size="13">E${n}</text>`+bars(k.set(n),i,green)).join('')+`<text x="62" y="${18+6*row}" text-anchor="end" font-size="13">A${v.N}</text>`+bars(tail,6,gold,0),'Error events on the unit interval and the union of all later ones',162),
   `P(E${v.N}) = ${fmt(k.length(v.N),4)}, while the gold set A${v.N}, where some error occurs at or after ${v.N}, has probability ${fmt(mass,4)}. ${v.kind===0?'Both tend to 0. An outcome outside every late A has all its late errors within tolerance: that is almost sure convergence, and P(E) ≤ P(A) then gives convergence in probability.':'The single errors become rare, yet the events keep sweeping across the whole interval, so A never shrinks. This sequence converges in probability but not almost surely: the implication in this exercise cannot be reversed.'}`];});
 case 'fd-coordinates':return run(range('c1','Centre of B₁',.2,.8,.5,.05)+range('c2','Centre of B₂',.2,.8,.7,.05),v=>{
  const p=preimages(v.c1,v.c2),X=t=>30+t*150,Y=t=>170-t*150,sx=t=>215+t*130;
  const curve=Array.from({length:301},(_,j)=>`${X(X1(j/300)).toFixed(1)},${Y(X2(j/300)).toFixed(1)}`).join(' ');
  const inside=runs(p.both).map(([a,b])=>`<polyline points="${Array.from({length:25},(_,j)=>{const w=a+(b-a)*j/24;return `${X(X1(w)).toFixed(1)},${Y(X2(w)).toFixed(1)}`}).join(' ')}" fill="none" stroke="${gold}" stroke-width="4"/>`).join('');
  const strip=(flags,i,color,label)=>`<text x="${sx(0)}" y="${34+i*46}" font-size="12">${label}</text><rect x="${sx(0)}" y="${40+i*46}" width="130" height="12" fill="${faint}"/>`+runs(flags).map(([a,b])=>`<rect x="${sx(a).toFixed(1)}" y="${40+i*46}" width="${Math.max(1,(b-a)*130).toFixed(1)}" height="12" fill="${color}"/>`).join('');
  const share=f=>fmt(f.filter(Boolean).length/GRID,3);
  return [frame(`<rect x="30" y="20" width="150" height="150" fill="none" stroke="#888"/><rect x="${X(v.c1-HALF).toFixed(1)}" y="${Y(v.c2+HALF).toFixed(1)}" width="${(2*HALF*150).toFixed(1)}" height="${(2*HALF*150).toFixed(1)}" fill="${pale}" stroke="${green}"/><polyline points="${curve}" fill="none" stroke="${grey}" stroke-width="1.5"/>${inside}<text x="105" y="188" text-anchor="middle" font-size="12">(X₁, X₂) and B₁ × B₂</text>`
    +strip(p.one,0,green,'X₁(ω) ∈ B₁')+strip(p.two,1,green,'X₂(ω) ∈ B₂')+strip(p.both,2,gold,'both tests pass')+`<text x="${sx(0)}" y="188" font-size="12">ω from 0 to 1</text>`,'A curve of values, a rectangle, and three sets of outcomes',196),
   `The gold outcomes are exactly those in both green sets: X⁻¹(B₁ × B₂) = X₁⁻¹(B₁) ∩ X₂⁻¹(B₂). Their probabilities here are ${share(p.one)}, ${share(p.two)} and ${share(p.both)}. Measurable coordinates therefore make every rectangle question measurable, and rectangles generate the Borel sets of the plane.`];});
 case 'fd-algebra-approx':return run(range('level','Dyadic level k (squares of side 2⁻ᵏ)',1,6,3),v=>{
  const d=dyadicApproximation(v.level),X=t=>90+t*180,s=180/d.n;
  return [legend(`union of ${d.chosen.length} dyadic squares, a set in the algebra`,'the event B, a disk')+frame(`<rect x="90" y="10" width="180" height="180" fill="${faint}"/>`+d.chosen.map(([i,j])=>`<rect x="${(X(0)+i*s).toFixed(2)}" y="${(10+j*s).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="${pale}" stroke="${green}" stroke-width=".6"/>`).join('')+`<circle cx="${X(DISK.x)}" cy="${10+DISK.y*180}" r="${DISK.r*180}" fill="none" stroke="${gold}" stroke-width="2.5"/>`,'A disk and its approximation by dyadic squares',200),
   `Level ${v.level}: the squares cover probability ${fmt(d.area,4)}; the disk has ${fmt(Math.PI*DISK.r**2,4)}. The two sets disagree on probability ${fmt(d.mismatch,4)} (numerical area). No finite union of squares equals the disk, but the disagreement can be made as small as desired.`];});
 case 'fd-envelopes':return run(range('delta','Radius δ of the neighbourhood',.02,.6,.3,.02),v=>{
  const xs=Array.from({length:401},(_,j)=>-2+j/100),env=xs.map(x=>envelopes(x,v.delta));
  const at=x=>{const [lo,hi]=envelopes(x,v.delta);return fmt(hi-lo,2);};
  const left=xs.filter(x=>x<JUMP).map(x=>[x,gEnvelope(x===SPIKE?SPIKE+1e-9:x)]),right=xs.filter(x=>x>=JUMP).map(x=>[x,gEnvelope(x)]);
  return [legend('g, with a jump at 0.5 and a single raised point at −1','upper and lower envelopes over (x − δ, x + δ)')+plot([{points:xs.map((x,j)=>[x,env[j][1]]),color:gold,dash:true,width:1.8},{points:xs.map((x,j)=>[x,env[j][0]]),color:gold,dash:true,width:1.8},{points:left},{points:right}],{xmin:-2,xmax:2,ymin:-.8,ymax:1.5,xlabel:'x',ylabel:'value',dots:[[SPIKE,1.3,3.5,green,1]]}),
   `δ = ${fmt(v.delta,2)}: the gap between the envelopes is ${at(SPIKE)} at the raised point, ${at(JUMP)} at the jump, and ${at(1.5)} at x = 1.5. As δ shrinks, the gap closes wherever g is continuous and stays open at the two discontinuities, which is how the envelopes pick out D_g.`];});
 case 'fd-covers':return run(range('level','Grid level k (cells of length 2⁻ᵏ)',1,9,3),v=>{
  const c=gridCover(v.level),x=t=>30+t*300,w=300/c.n,exact=TARGET.reduce((s,[a,b])=>s+b-a,0);
  return [legend('grid cells that meet the set','the set B = [0.13, 0.41] ∪ [0.62, 0.71]')+frame(`<rect x="30" y="20" width="300" height="26" fill="${faint}"/>`+c.cells.map(j=>`<rect x="${(x(0)+j*w).toFixed(2)}" y="20" width="${w.toFixed(2)}" height="26" fill="${pale}" stroke="${green}" stroke-width="${w>3?.8:0}"/>`).join('')+TARGET.map(([a,b])=>`<rect x="${x(a).toFixed(1)}" y="54" width="${((b-a)*300).toFixed(1)}" height="10" fill="${gold}"/>`).join('')+`<text x="30" y="84" font-size="13">0</text><text x="330" y="84" text-anchor="end" font-size="13">1</text>`,'A set on the unit interval and the grid cells covering it',92),
   `Level ${v.level}: ${c.cells.length} cells of length 1/${c.n} cover B, with total length ${fmt(c.length,4)}. The length of B is ${fmt(exact,2)}, and the excess ${fmt(c.length-exact,4)} shrinks as the grid refines. The extension assigns to a general set the infimum of such cover totals, using only lengths already known on the algebra.`];});
 }
 return false;
}
