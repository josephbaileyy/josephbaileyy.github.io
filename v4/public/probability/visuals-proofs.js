import {rectangle,area,intersect,rectangleMass,scatteredRectangles,complementPieces,refineRectangles,stripParent,countableStrips,simpleEvents,commonRefinement,fatouSequence,fatouTailInf,fubiniModel} from './proof-models.js';

const colors=['#42735c','#9a6828','#696191','#326b85'];
const pale=['#d8e8df','#f0e1c9','#e4dff0','#d8e8f0'];
const f=x=>Number(x.toFixed(5)).toString();
const text=(x,y,s,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const line=(x1,y1,x2,y2,color='#8d9b91',dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${dash?'stroke-dasharray="5 4"':''}/>`;
const box=(x,y,w,h,fill,stroke='white')=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${fill}" stroke="${stroke}"/>`;
const svg=(body,h=340,label='',w=600)=>`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
const select=(name,label,options)=>`<label>${label}<select data-control="${name}" aria-label="${label}">${options.map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select></label>`;
const panel=(title,body,note='')=>`<section class="proof-panel"><h4>${title}</h4>${body}${note?`<p class="proof-note">${note}</p>`:''}</section>`;
const equation=s=>`<div class="proof-equation">${s}</div>`;
const plane=(x=90,y=30,w=440,h=270)=>({X:t=>x+w*t,Y:t=>y+h*(1-t),x,y,w,h});
function frame(p,axes=true){return box(p.x,p.y,p.w,p.h,'#f4f4ee','#c1cbc2')+(axes?text(p.x+p.w, p.y+p.h+38,'Ω₁ · x','end')+text(p.x, p.y-12,'Ω₂ · y'): '');}
function drawRect(p,r,color,stroke='white'){return area(r)?box(p.X(r.x0),p.Y(r.y1),p.w*(r.x1-r.x0),p.h*(r.y1-r.y0),color,stroke):'';}
function outline(p,r,color){return area(r)?box(p.X(r.x0),p.Y(r.y1),p.w*(r.x1-r.x0),p.h*(r.y1-r.y0),'none',color):'';}
function productUnion(v){
 v={...v,i:v.i-1};
 const p=plane(95,45,435,275),active=scatteredRectangles[v.i];
 let b=frame(p);
 scatteredRectangles.forEach((r,i)=>{b+=drawRect(p,r,pale[i])+outline(p,r,colors[i])+text(p.X((r.x0+r.x1)/2),p.Y((r.y0+r.y1)/2)+5,`R${i+1}`,'middle');});
 b+=line(p.X(active.x0),338,p.X(active.x1),338,colors[v.i])+text(p.X((active.x0+active.x1)/2),362,`A${v.i+1}`,'middle');
 b+=line(75,p.Y(active.y0),75,p.Y(active.y1),colors[v.i])+text(65,p.Y((active.y0+active.y1)/2),`B${v.i+1}`,'end');
 const a=v.law?active.x1**2-active.x0**2:active.x1-active.x0,bm=v.law?active.y1**3-active.y0**3:active.y1-active.y0;
 const rows=scatteredRectangles.map((r,i)=>`<tr ${i===v.i?'class="proof-selected"':''}><th scope="row">R${i+1} = A${i+1} × B${i+1}</th><td>${f(v.law?r.x1**2-r.x0**2:r.x1-r.x0)}</td><td>${f(v.law?r.y1**3-r.y0**3:r.y1-r.y0)}</td><td>${f(rectangleMass(r,v.law))}</td></tr>`).join('');
 return [panel('Disjoint rectangles; side projections may overlap',svg(b,395,'Four disjoint rectangles with horizontal A and vertical B projections'),v.law?'Coordinates still show x and y. Mass uses densities 2x and 3y², so colored area no longer equals mass.':'Here Ω₁ = Ω₂ = (0,1] with length measure; colored area equals product mass.')+`<div class="proof-table-wrap"><table class="proof-table"><caption>Side measures and rectangle masses</caption><thead><tr><th>Rectangle</th><th>ν₁(Aᵢ)</th><th>ν₂(Bᵢ)</th><th>Product</th></tr></thead><tbody>${rows}</tbody></table></div>`+equation(`ν₁(A${v.i+1})ν₂(B${v.i+1}) = ${f(a)} × ${f(bm)} = ${f(a*bm)}`),`μ(E) = Σᵢ ν₁(Aᵢ)ν₂(Bᵢ) = ${f(scatteredRectangles.reduce((s,r)=>s+rectangleMass(r,v.law),0))}. Select a rectangle to match its two side projections with its row. Disjointness is required of the rectangles, not separately of all Aᵢ or all Bᵢ.`];
}
function productProof(v){
 const p=plane(85,45,450,265);
 if(v.step===0){
  const a=rectangle(.15,.65,.2,.7),c=rectangle(v.shift,Math.min(1,v.shift+.35),.4,.9),hit=intersect(a,c);
  let b=frame(p)+drawRect(p,a,pale[0])+drawRect(p,c,pale[1])+drawRect(p,hit,colors[2])+outline(p,a,colors[0])+outline(p,c,colors[1]);
  b+=text(p.X(.15),335,'A')+text(p.X(v.shift),360,'C')+line(p.X(.15),324,p.X(.65),324,colors[0])+line(p.X(c.x0),349,p.X(c.x1),349,colors[1]);
  return [panel('Intersect in each coordinate',svg(b,390,'Two rectangles and their highlighted intersection'), 'Green is A × B; gold is C × D; violet belongs to both.')+equation('(A × B) ∩ (C × D) = (A ∩ C) × (B ∩ D)'),area(hit)?`The intersection is a rectangle with area ${f(area(hit))}. Pairwise intersections also refine intersections of finite rectangular unions.`:'A ∩ C is empty, so the product intersection is empty. Move C left to recover a nonempty rectangle.'];
 }
 if(v.step===1){
  const r=rectangle(.25,.7,.25,.75),groups=complementPieces(r,v.scheme);
  let b=frame(p)+drawRect(p,r,'#e1e3db');
  groups.forEach((group,i)=>group.forEach(s=>{b+=drawRect(p,s,pale[i])+outline(p,s,colors[i]);}));
  b+=text(p.X(.475),p.Y(.5),'A × B','middle');
  const labels=[['bottom','top','left','right'],['Aᶜ × B','A × Bᶜ','Aᶜ × Bᶜ'],['Aᶜ × Ω₂','A × Bᶜ']][v.scheme];
  const formulas=['Four disjoint interval rectangles surround A × B.','(A × B)ᶜ = (Aᶜ × B) ⊔ (A × Bᶜ) ⊔ (Aᶜ × Bᶜ)','(A × B)ᶜ = (Aᶜ × Ω₂) ⊔ (A × Bᶜ)'];
  const legend=`<ul class="proof-legend">${labels.map((s,i)=>`<li><span style="background:${colors[i]}"></span>${s}</li>`).join('')}</ul>`;
  return [panel('Take the complement in Ω₁ × Ω₂',svg(b,365,'Disjoint pieces covering the complement of a rectangle')+legend,v.scheme===0?'Four surrounding pieces use interval geometry. All intervals are left open and right closed, so shared boundaries belong to one piece.':'Aᶜ or Bᶜ can be disconnected. Regions of the same color together form one measurable product rectangle.')+equation(formulas[v.scheme]),'The complement has mass 1 − 0.45 × 0.5 = 0.775. For a finite union, De Morgan turns its complement into an intersection of these finite unions; intersection closure finishes the algebra argument.'];
 }
 if(v.step===2){
  const parents=v.shape?[rectangle(.08,.45,.12,.55),rectangle(.58,.93,.38,.88)]:[rectangle(.1,.9,.15,.85)];
  const pieces=refineRectangles(parents,v.level),P=plane(85,30,450,235);
  const plot=(rects,title)=>{let b=frame(P);rects.forEach((r,i)=>{b+=drawRect(P,r,pale[i%4])+outline(P,r,colors[i%4]);});return panel(title,svg(b,315,'The same set represented by a different rectangular partition'));};
  const total=parents.reduce((s,r)=>s+area(r),0);
  return [plot(parents,`One description · ${parents.length} rectangle${parents.length>1?'s':''}`)+plot(pieces,`Same E · ${pieces.length} unequal rectangles`)+equation(`Σⱼ ν₁(Aⱼ)ν₂(Bⱼ) = ${f(total)} = Σᵢ ν₁(Cᵢ)ν₂(Dᵢ)`),`Equation (1.4.2) compares two disjoint decompositions of exactly the same E. The smallest piece has area ${f(Math.min(...pieces.map(area)))}; the largest has area ${f(Math.max(...pieces.map(area)))}. Increase the refinement or switch to a disconnected E; the total stays ${f(total)}.`];
 }
 const m=countableStrips(v.n),x=v.x,r=stripParent,inside=r.x0<x&&x<=r.x1;
 let b=frame(p);
 m.pieces.forEach((s,i)=>{b+=drawRect(p,s,pale[i%4]);});
 b+=drawRect(p,m.remainder,'#ecebe6')+outline(p,r,colors[0])+line(p.X(x),p.Y(0),p.X(x),p.Y(1),colors[1]);
 const full=inside?r.y1-r.y0:0,partial=full*(1-2**(-v.n));
 if(inside)b+=line(p.X(x),p.Y(r.y1),p.X(x),p.Y(m.remainder.y1),colors[2]);
 // Slice-integral profiles share the same 0..1 horizontal scale as the plane.
 const base=520,Y=t=>base-130*t;
 b+=text(85,385,'After integrating in y: a function of x')+line(p.X(0),base,p.X(1),base);
 b+=box(p.X(r.x0),Y(.7),p.w*.8,130*.7,'#e1e3db')+box(p.X(r.x0),Y(.7*(1-2**(-v.n))),p.w*.8,130*.7*(1-2**(-v.n)),pale[2]);
 b+=line(p.X(x),390,p.X(x),base,colors[1])+text(85,545,'0')+text(535,545,'1','end')+text(76,Y(.7)+5,'0.7','end');
 return [panel('Countably many strips: integrate once, then again',svg(b,570,'Partial strip union, selected vertical slice, and integrated slice profile'),'E = (0.1,0.9] × (0.15,0.85]. Strip i has height 0.7·2⁻ⁱ. The gray remainder has positive height for every finite n.')+equation(`At x = ${f(x)}: hₙ(x) = ${f(partial)} ↑ g(x) = ${f(full)}`)+equation(`∫hₙ dν₁ = ${f(m.partial)} ↑ 0.56 = ∫g dν₁`),`First use monotone convergence in y to get hₙ(x) ↑ g(x); then use it in x to get (1.4.2). Shown: ${v.n} strips; omitted mass = 0.56·2⁻${v.n} = ${f(m.missing)}. Their infinite union is exactly E. For general disjoint Eᵢ in the algebra with union E still in the algebra, expand every Eᵢ into its finitely many rectangles and apply the same identity.`];
}
function refinementProof(v){
 const weights=[v.a,v.b,v.c],cells=commonRefinement(weights),X=t=>70+460*t;
 let b='';
 simpleEvents.forEach(([a,bound],i)=>{const y=40+i*55;b+=text(15,y+25,'ABC'[i])+box(X(a),y,460*(bound-a),35,pale[i])+text(X((a+bound)/2),y+24,`weight ${f(weights[i])}`,'middle');});
 b+=text(70,225,'Cut at every change of membership');
 cells.forEach((c,i)=>{b+=box(X(c.start),245,460*c.mass,48,pale[i%4])+text(X((c.start+c.end)/2),276,`C${i+1}`,'middle')+line(X(c.start),25,X(c.start),205,'#a0aca3',true)+line(X(c.start),245,X(c.start),295,'#a0aca3',true);});
 const rows=cells.map((c,i)=>`<tr><th scope="row">C${i+1}</th><td>${c.membership.map((on,j)=>on?'ABC'[j]:'').join('')}</td><td>${f(c.mass)}</td><td>${f(c.height)}</td><td>${f(c.mass*c.height)}</td></tr>`).join('');
 const total=cells.reduce((s,c)=>s+c.mass*c.height,0);
 return [panel('Three overlapping events → one common partition',svg(b,325,'Three event intervals refined into disjoint membership cells'),'The new cells are Boolean atoms: each event is either present throughout a cell or absent throughout it. Ω = (0,1] carries length measure.')+`<div class="proof-table-wrap"><table class="proof-table"><caption>The same height, cell by cell</caption><thead><tr><th>Cell</th><th>In events</th><th>μ(Cᵢ)</th><th>Height</th><th>Contribution</th></tr></thead><tbody>${rows}</tbody></table></div>`+equation(`0.65a + 0.65b + 0.5c = ${f(total)} = Σᵢ height(Cᵢ) μ(Cᵢ)`),'Change any weight. Both descriptions still assign the same height to each cell, and finite additivity gives the same integral. For two arbitrary representations, form atoms using all events from both; equality of the functions forces equality of their cell heights.'];
}
function fatouProof(v){
 const X=t=>70+460*t,Y=t=>315-80*t,n=v.n,k=n+v.later;
 let b=line(X(0),Y(0),X(1),Y(0))+line(X(0),Y(0),X(0),Y(3.1))+text(60,Y(0)+5,'0','end')+text(60,Y(3)+5,'3','end')+text(X(1),345,'s = 1','end');
 for(const j of [0,1]){
  const a=j/2,c=(j+1)/2,mid=(a+c)/2,high=fatouSequence(k,mid)-mid,low=fatouTailInf(n,mid)-mid;
  b+=`<polygon points="${X(a)},${Y(0)} ${X(c)},${Y(0)} ${X(c)},${Y(c+low)} ${X(a)},${Y(a+low)}" fill="${pale[0]}"/>`;
  b+=`<polygon points="${X(a)},${Y(a+low)} ${X(c)},${Y(c+low)} ${X(c)},${Y(c+high)} ${X(a)},${Y(a+high)}" fill="${pale[1]}"/>`+line(X(a),Y(a+high),X(c),Y(c+high),colors[1])+line(X(a),Y(a+low),X(c),Y(c+low),colors[0]);
 }
 b+=line(X(0),Y(1),X(1),Y(2),'#79877e',true)+line(X(v.x),Y(0),X(v.x),Y(fatouSequence(k,v.x)),colors[2]);
 const fk=fatouSequence(k,v.x),hn=fatouTailInf(n,v.x),integral=1.5-.5*(1/n+1/(n+1));
 const future=Array.from({length:6},(_,i)=>{const j=n+i;return `<li>k=${j}: ${f(fatouSequence(j,v.x))}</li>`;}).join('');
 return [panel('Discard early functions; the lower envelope rises',svg(b,365,'Increasing tail infimum below a later oscillating function, with one outcome fixed'),`On (0,1], fₖ(s) = s+1−1/k, with an extra 1 on the left half for odd k and on the right half for even k. Gold shows f${k}; green shows h${n}. Dashed: liminf fₖ(s) = s+1.`)+`<p class="proof-note">At the selected s = ${f(v.x)}, the next six values are:</p><ul class="proof-values">${future}</ul>`+equation(`h${n}(${f(v.x)}) = ${f(hn)} ≤ f${k}(${f(v.x)}) = ${f(fk)}`)+equation(`∫h${n} = ${f(integral)} ≤ ∫f${k} = 2−1/${k} = ${f(2-1/k)}`),'The exact tail infimum is hₙ(s) = s+1−1/j, where j is the first unlifted index at or after n (n or n+1). Both parities occur in every infinite tail; the six values are only a preview. Increasing n makes hₙ ↑ s+1, so MON gives ∫liminf fₙ = 1.5, while liminf∫fₙ = 2. For the signed theorem subtract the integrable lower bound g first; apply the result to −fₙ for reverse Fatou.'];
}
const fubiniClaims=[
 ['Rectangle indicators satisfy all three goals.', 'Start with finite measures and bounded h. Fix x. The section is either 1ᴮ or zero, so it is measurable. Its integral is the step function μ₂(B)1ᴬ(x), also measurable. Integrating that step gives μ₁(A)μ₂(B), exactly the product measure of A×B.'],
 ['Adding functions preserves all three goals.', 'The overlap has height 1 + 2 = 3. Integrating a slice adds its contributions, including the overlap: F₍a·h+b·k₎ = aFₕ + bFₖ. Measurability and both integrals respect the same linear combination. At this stage the measures are finite and the functions bounded, so subtraction is safe.'],
 ['Increasing bounded limits preserve all three goals.', 'On the grid interior, hₙ = (⌊2ⁿx⌋ + ⌊2ⁿy⌋)/2ⁿ rises toward x+y (top/right null edges use adjacent cell values); the dashed profile is Fₕ(x) = x+1/2. Measurable sections stay measurable under increasing limits. MON in y gives Fₕₙ ↑ Fₕ, making Fₕ measurable; MON on the product and in x carries the integral identity to the limit.'],
 ['Truncation and exhaustion reach every nonnegative h.', 'Choose finite-measure Aₙ ↑ X and Bₙ ↑ Y. Then hₙ = (h ∧ n)1₍Aₙ×Bₙ₎ ↑ h. Each hₙ belongs to the finite, bounded case. Apply MON inside each slice and again to the two outer integrals. The picture takes h = 1 on the unbounded quadrant: the squares grow and both totals tend to infinity.'],
 ['Absolute integrability makes subtraction legitimate.', 'For h = x−y, green contributes h⁺ and gold contributes h⁻. Their nonnegative slice integrals are x²/2 and (1−x)²/2. Subtracting gives Fₕ(x) = x−1/2. In general ∫|h| &lt; ∞ makes Fₕ⁺ + Fₕ⁻ finite almost everywhere, so this subtraction never asks for ∞−∞ outside a null set.']
];
function fubiniProof(v){
 const stage=v.stage,m=fubiniModel([0,1,2,2,3][stage],v.n),p=plane(45,20,190,190),x=v.x;
 let b=frame(p,false),profile='',formula='',bridge='';
 if(stage===3){
  const n=v.n,extent=5,r=rectangle(0,n/extent,0,n/extent),next=rectangle(0,(n+1)/extent,0,(n+1)/extent);
  b+=outline(p,next,colors[1])+drawRect(p,r,pale[0])+outline(p,r,colors[0]);
  b+=text(p.X(n/extent),p.Y(0)+22,`n = ${n}`,'middle')+text(p.X(0)-8,p.Y(n/extent)+5,String(n),'end')+text(p.X(1),245,'x → ∞','end')+text(45,13,'y → ∞');
  profile=line(45,210,235,210)+line(45,20,45,210)+box(45,210-190*n/extent,190*n/extent,190*n/extent,pale[0])+text(235,245,'x → ∞','end')+text(35,210-190*n/extent,String(n),'end');
  formula=`For 0 &lt; x ≤ ${n}, Fₕₙ(x) = ${n}; elsewhere 0.  ∫hₙ = ${n}² = ${n*n} = ∫Fₕₙ`;
 }else{
  if(stage<2){m.parents.slice(0,stage?2:1).forEach((r,i)=>{b+=drawRect(p,r,pale[i]);});if(stage===1)b+=drawRect(p,intersect(...m.parents),pale[2])+text(p.X(.525),p.Y(.55),'3','middle');}
  else{const N=stage===2?m.N:16;for(let i=0;i<N;i++)for(let j=0;j<N;j++){const r=rectangle(i/N,(i+1)/N,j/N,(j+1)/N),z=m.value((i+.5)/N,(j+.5)/N);b+=drawRect(p,r,`rgba(${z<0?'154,104,40':'49,94,78'},${.12+.75*Math.min(1,Math.abs(z)/2)})`);}}
  b+=line(p.X(x),p.Y(0),p.X(x),p.Y(1),colors[2])+text(45,239,'0')+text(235,239,'x = 1','end')+text(35,25,'y = 1','end');
  const base=stage===4?150:210,Y=z=>base-75*z;
  profile=line(45,base,235,base)+line(45,20,45,220)+text(35,base+4,'0','end')+text(235,245,'x = 1','end');
  const breaks=stage<2?[0,.1,.4,.65,.9,1]:Array.from({length:(stage===2?m.N:1)+1},(_,i)=>i/(stage===2?m.N:1));
  for(let i=0;i<breaks.length-1;i++){
   const a=breaks[i],c=breaks[i+1],z=m.slice((a+c)/2);
   if(stage===4){
    const us=Array.from({length:81},(_,i)=>i/80),curve=(fn,color,dash='')=>`<polyline points="${us.map(u=>`${p.X(u)},${Y(fn(u))}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" ${dash?'stroke-dasharray="4 3"':''}/>`;
    profile+=curve(u=>u*u/2,colors[0],'dash')+curve(u=>(1-u)**2/2,colors[1],'dash')+curve(u=>u-.5,colors[2]);
   }else profile+=box(p.X(a),Y(z),p.w*(c-a),75*z,pale[0])+line(p.X(a),Y(z),p.X(c),Y(z),colors[0]);
  }
  if(stage===2)profile+=line(p.X(0),Y(.5),p.X(1),Y(1.5),colors[1],true);
  profile+=line(p.X(x),base,p.X(x),Y(m.slice(x)),colors[2])+text(140,269,`F(${f(x)}) = ${f(m.slice(x))}`,'middle');
  formula=stage===4?'∫h⁺ = 1/6,  ∫h⁻ = 1/6;  ∫h = 0 = ∫Fₕ':stage===2?`∫hₙ = 1 − 2⁻${v.n} = ${f(m.total)} = ∫Fₕₙ  ↑  1 = ∫h`:`∫h = ${f(m.total)} = ∫Fₕ`;
 }
 const labels=['h = 1₍A×B₎','h = 1₍A×B₎ + 2·1₍C×D₎','hₙ = (⌊2ⁿx⌋ + ⌊2ⁿy⌋)/2ⁿ','hₙ = 1 on (0,n]²; zero outside','h = x−y · green + / gold −'];
 const rightLabels=['Fₕ = μ₂(B)1ᴬ','Fₕ = F₁ + 2F₂','Fₕₙ ↑ Fₕ · dashed limit','Fₕₙ = n on (0,n]; zero outside','solid: Fₕ⁺ − Fₕ⁻ · dashed: parts'];
 if(stage===1)bridge='This establishes the vector-space part of the argument. The next step supplies closure under increasing limits.';
 if(stage===2)bridge='Now use the <a href="#entry-1-2-7" class="definition-link">functional monotone-class theorem (1.2.7)</a>: the class satisfying the three goals is a vector space, contains every rectangle indicator, and is closed under bounded increasing nonnegative limits. Since rectangles form a generating pi-system, the class contains every bounded product-measurable h. The dyadic picture shows the limit operation; the theorem supplies the extension to all bounded h.';
 if(stage===4)bridge='The exceptional set {Fₕ⁺ + Fₕ⁻ = ∞} is measurable and null. Set Fₕ = 0 there; subtract the two finite outer integrals. Exchanging X and Y repeats the argument and gives the other order of integration.';
 const pictures=`<div class="fubini-proof-pictures"><section><h5>${labels[stage]}</h5>${svg(b,280,'Function on the product space for this proof step',280)}</section><section><h5>${rightLabels[stage]}</h5>${svg(profile,280,'Slice integral and the operation preserving the proof goals',280)}</section></div>`;
 return [`<section class="fubini-proof-claim"><h4>Claim ${stage+1} · ${fubiniClaims[stage][0]}</h4><p><b>Why:</b> ${fubiniClaims[stage][1]}</p></section>${pictures}${equation(formula)}`,bridge||'Track the selected slice in both pictures. The same operation acts on h and on its slice integral.'];
}
export function mountVisual(root,name,{range,setup}){
 if(!['product-union','product-proof','proof-refinement','proof-fatou','proof-fubini'].includes(name))return false;
 root.classList?.add('proof-lab');
 if(name==='product-union')setup(root,range('i','Selected rectangle',1,4,1)+select('law','Side measures',['Length on each axis','Densities 2x and 3y²']),productUnion);
 if(name==='product-proof')setup(root,select('step','Proof step',['Intersection closure','Complement closure','Equation 1.4.2: same E','Countable sums: two integrations'])+`<div data-proof-controls="0">${range('shift','Move C horizontally',0,.8,.4,.05)}</div><div data-proof-controls="1">${select('scheme','Complement partition',['Four surrounding pieces','Three products (as in the notes)','Two products'])}</div><div data-proof-controls="2">${select('shape','Set E',['One rectangle','Two separated rectangles'])}${range('level','Refinement level',1,3,1)}</div><div data-proof-controls="3">${range('n','First n strips',1,8,3)}${range('x','Fix x for the slice',0,1,.4,.01)}</div>`,productProof);
 if(name==='proof-refinement')setup(root,range('a','Weight a on A',0,3,1,.25)+range('b','Weight b on B',0,3,2,.25)+range('c','Weight c on C',0,3,.5,.25),refinementProof);
 if(name==='proof-fatou')setup(root,range('n','Start of tail n',1,16,2)+range('later','Inspect k = n + offset',0,8,0)+range('x','Fix outcome s',.01,1,.3,.01),fatouProof);
 if(name==='proof-fubini'){
  root.classList?.add('fubini-proof-lab');
  setup(root,select('stage','Proof claim',['1 · Rectangles','2 · Add functions','3 · Increasing limits → all bounded h','4 · Nonnegative h on sigma-finite spaces','5 · Subtract integrable parts'])+`<div data-proof-controls="2,3">${range('n','Approximation level n',1,4,2)}</div><div data-proof-controls="0,1,2,4">${range('x','Fix x for the slice',0,1,.45,.01)}</div>`,fubiniProof);
  const controls=root.querySelector('.controls');
  if(controls){const goal=document.createElement('section');goal.className='fubini-proof-goal';goal.innerHTML='<h4>What we want to show</h4><p>For measurable h on a product of sigma-finite spaces, with h ≥ 0 or ∫|h| &lt; ∞:</p><ol><li>Every section y ↦ h(x,y) is measurable.</li><li>Fₕ(x) = ∫h(x,y)dμ₂(y) is measurable.</li><li>∫h d(μ₁×μ₂) = ∫Fₕ dμ₁.</li></ol><p>In the signed case, define Fₕ measurably on the exceptional null set. Swapping x and y gives the other order. In the exploration above, Fₕ was called L.</p>';controls.before(goal);
   const actions=document.createElement('div');actions.className='fubini-proof-actions';actions.innerHTML='<button type="button" data-claim-prev>Previous claim</button><span></span><button type="button" data-claim-next>Next claim</button>';controls.after(actions);
   const input=controls.querySelector('[data-control="stage"]');
   const syncClaims=()=>{actions.querySelector('[data-claim-prev]').disabled=+input.value===0;actions.querySelector('[data-claim-next]').disabled=+input.value===4;actions.querySelector('span').textContent=`${+input.value+1} / 5`;};
   actions.addEventListener('click',event=>{if(event.target.closest('[data-claim-prev]'))input.value=String(+input.value-1);else if(event.target.closest('[data-claim-next]'))input.value=String(+input.value+1);else return;root.dispatchEvent(new Event('change',{bubbles:true}));});root.addEventListener('change',syncClaims);syncClaims();
   const transcript=document.createElement('div');transcript.className='fubini-proof-print';transcript.innerHTML=fubiniClaims.map((_,stage)=>{const [drawing,reason]=fubiniProof({stage,n:2,x:.45});return `<section>${drawing}<p>${reason}</p></section>`;}).join('');root.append(transcript);
  }
 }
 const sync=()=>{const input=root.querySelector('[data-control="step"], [data-control="stage"]');if(input)root.querySelectorAll('[data-proof-controls]').forEach(el=>{el.hidden=!el.dataset.proofControls.split(',').includes(input.value);});};
 root.addEventListener?.('change',sync);sync();
 return true;
}
