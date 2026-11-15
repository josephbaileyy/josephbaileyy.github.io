// Chapter 1 models that replace text-only outlines: closure systems on a four-point space,
// threshold sets of monotone and semicontinuous functions, jumps of a CDF, and interval masses from a CDF.
import {frame,legend} from './visuals-transforms.js?v=transforms1';
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
 }
 return false;
}
