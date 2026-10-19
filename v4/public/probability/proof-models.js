// All intervals use (left, right]; the drawing suppresses boundary thickness.
export const rectangle=(x0,x1,y0,y1)=>({x0,x1,y0,y1});
export const area=r=>Math.max(0,r.x1-r.x0)*Math.max(0,r.y1-r.y0);
export const contains=(r,x,y)=>r.x0<x&&x<=r.x1&&r.y0<y&&y<=r.y1;
export const intersect=(a,b)=>rectangle(Math.max(a.x0,b.x0),Math.min(a.x1,b.x1),Math.max(a.y0,b.y0),Math.min(a.y1,b.y1));
export function rectangleMass(r,weighted=false){
 if(!area(r))return 0;
 return weighted?(r.x1**2-r.x0**2)*(r.y1**3-r.y0**3):area(r);
}
export const scatteredRectangles=[rectangle(.08,.45,.12,.32),rectangle(.18,.6,.55,.9),rectangle(.65,.92,.08,.5),rectangle(.68,.85,.7,.94)];
export function complementPieces(r,scheme=0){
 const {x0:a,x1:b,y0:c,y1:d}=r;
 if(scheme===0)return [[rectangle(0,1,0,c)],[rectangle(0,1,d,1)],[rectangle(0,a,c,d)],[rectangle(b,1,c,d)]];
 // Abstract products may appear as several disconnected coordinate rectangles.
 const sides=[rectangle(0,a,c,d),rectangle(b,1,c,d)];
 const caps=[rectangle(a,b,0,c),rectangle(a,b,d,1)];
 const corners=[rectangle(0,a,0,c),rectangle(b,1,0,c),rectangle(0,a,d,1),rectangle(b,1,d,1)];
 return scheme===1?[sides,caps,corners]:[[...sides,...corners],caps];
}
export function refineRectangles(parents,level=1){
 if(!level)return parents;
 const pieces=parents.flatMap(r=>{
  const x=r.x0+.37*(r.x1-r.x0),y=r.y0+.63*(r.y1-r.y0);
  return [rectangle(r.x0,x,r.y0,y),rectangle(x,r.x1,r.y0,y),rectangle(r.x0,x,y,r.y1),rectangle(x,r.x1,y,r.y1)];
 });
 return refineRectangles(pieces,level-1);
}
export const stripParent=rectangle(.1,.9,.15,.85);
export function countableStrips(n){
 const r=stripParent,h=r.y1-r.y0;
 const pieces=Array.from({length:n},(_,j)=>rectangle(r.x0,r.x1,r.y0+h*2**(-j-1),r.y0+h*2**(-j)));
 const remainder=rectangle(r.x0,r.x1,r.y0,r.y0+h*2**(-n));
 return {pieces,remainder,total:area(r),partial:area(r)*(1-2**(-n)),missing:area(r)*2**(-n)};
}
export const simpleEvents=[[0,.65],[.2,.85],[.5,1]];
export function commonRefinement(weights){
 const ends=[...new Set(simpleEvents.flat())].sort((a,b)=>a-b);
 return ends.slice(1).map((end,i)=>{
  const start=ends[i],mid=(start+end)/2;
  const membership=simpleEvents.map(([a,b])=>a<mid&&mid<=b);
  const height=weights.reduce((s,w,j)=>s+(membership[j]?w:0),0);
  return {start,end,membership,height,mass:end-start};
 });
}
// Every infinite tail includes both parities. Its minimum is the earliest
// unlifted term: the lift of 1 exceeds any subsequent increase of the baseline.
export function fatouSequence(k,x){return x+1-1/k+Number((k%2===1)===(x<=.5));}
export function fatouTailInf(n,x){
 const j=n+Number((n%2===1)===(x<=.5));
 return x+1-1/j;
}
export function fubiniModel(stage,n=2){
 const N=2**n;
 const parents=[rectangle(.1,.65,.15,.7),rectangle(.4,.9,.4,.9)];
 const value=(x,y)=>stage===0?Number(contains(parents[0],x,y)):stage===1?Number(contains(parents[0],x,y))+2*Number(contains(parents[1],x,y)):stage===2?(Math.min(N-1,Math.floor(N*x))+Math.min(N-1,Math.floor(N*y)))/N:x-y;
 const slice=x=>stage===0?(parents[0].x0<x&&x<=parents[0].x1?.55:0):stage===1?(parents[0].x0<x&&x<=parents[0].x1?.55:0)+(parents[1].x0<x&&x<=parents[1].x1?1:0):stage===2?(Math.min(N-1,Math.floor(N*x))+(N-1)/2)/N:x-.5;
 return {value,slice,N,parents,total:[.55*.55,.55*.55+2*.5*.5,1-1/N,0][stage]};
}
