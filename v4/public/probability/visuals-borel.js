import {cantorIntervals} from './visuals-distributions.js';

// Reduced fractions of bounded denominator; their increasing union is Q ∩ [0,1].
export function borelRationals(n){
 const gcd=(a,b)=>b?gcd(b,a%b):a;
 const points=[{x:0,label:'0'},{x:1,label:'1'}];
 for(let q=2;q<=n;q++)for(let p=1;p<q;p++)if(gcd(p,q)===1)points.push({x:p/q,label:`${p}/${q}`});
 return points.sort((a,b)=>a.x-b.x);
}

export const borelExamples=[
 {name:'An open interval',set:String.raw`$(1/4,3/4)$`,recipe:String.raw`$\displaystyle (1/4,3/4)=\bigcup_{k\geq1}[1/4+1/(8k),\,3/4-1/(8k)]$`,kind:'Open · also a countable union of closed sets',operation:'Countable union: keep every point that appears at any stage.',limit:'The closed intervals expand toward both endpoints, but never include them. The union is the open interval.',finite:n=>`Closed interval A${sub(n)}`,shape:'interval'},
 {name:'A single point',set:String.raw`$\{1/2\}$`,recipe:String.raw`$\displaystyle \{1/2\}=\bigcap_{k\geq1}(1/2-1/(4k),\,1/2+1/(4k))$`,kind:'Closed · also a countable intersection of open sets',operation:'Countable intersection: keep only points present at every stage.',limit:'Every point other than 1/2 is eventually excluded. The intersection is exactly one point, even though each stage is an interval.',finite:n=>`Open neighborhood U${sub(n)}`,shape:'point'},
 {name:'The rational points',set:String.raw`$\mathbb Q\cap[0,1]$`,recipe:String.raw`$\displaystyle \mathbb Q\cap[0,1]=\bigcup_{k\geq1}F_k$, where $F_k=\{p/q:0\leq p\leq q\leq k,\ p,q\in\mathbb Z,\ q\geq1\}$`,kind:'Countable union of closed sets (Fσ)',operation:'Countable union of finite sets: every rational point eventually appears.',limit:'The union is dense: every nonempty open subinterval contains a rational. No irrational ever enters. Finite dots cannot show this density.',finite:n=>`Denominator ≤ ${n}`,shape:'rationals'},
 {name:'The irrational points',set:String.raw`$[0,1]\setminus\mathbb Q$`,recipe:String.raw`$\displaystyle [0,1]\setminus\mathbb Q=\bigcap_{k\geq1}\bigl((-1/k,\,1+1/k)\setminus F_k\bigr)$, where $F_k=\{p/q:0\leq p\leq q\leq k,\ p,q\in\mathbb Z,\ q\geq1\}$. Each set in this intersection is open; only its part in $[0,1]$ is drawn.`,kind:'Countable intersection of open sets (Gδ)',operation:'Complement, then intersect: remove every rational point, one finite batch at a time.',limit:'Every irrational remains and every rational eventually disappears. Both this set and the rationals meet every open subinterval of (0,1). Visible solid segments belong only to the finite stages.',finite:n=>`Remove denominators ≤ ${n}`,shape:'irrationals'},
 {name:'The Cantor set',set:String.raw`$C$`,recipe:String.raw`$\displaystyle C=\bigcap_{k\geq0}C_k$, where $C_0=[0,1]$ and each next stage removes the open middle third of every remaining interval.`,kind:'Closed · uncountable · no nontrivial intervals',operation:'Countable intersection of closed sets: keep only points surviving every removal.',limit:'The intersection has uncountably many points and contains no nonempty open interval. All surviving endpoints remain. Every finite stage still contains intervals.',finite:n=>`C${sub(n)} · ${2**n} intervals`,shape:'cantor'}
];
const sub=n=>String(n).replace(/\d/g,d=>'₀₁₂₃₄₅₆₇₈₉'[d]);

export function borelStage(shape,n){
 if(shape==='interval')return {intervals:[[.25+1/(8*n),.75-1/(8*n)]],closed:true};
 if(shape==='point')return {intervals:[[.5-1/(4*n),.5+1/(4*n)]],closed:false};
 if(shape==='cantor')return {intervals:cantorIntervals(n),closed:true};
 return {points:borelRationals(n),complement:shape==='irrationals'};
}

export function mountVisual(root,name,{renderMath}){
 if(name!=='borel-sets')return false;
 root.classList.add('borel-explorer');
 root.innerHTML=`<div class="controls"><label class="borel-choice">Choose a Borel set<select aria-label="Choose a Borel set">${borelExamples.map((e,i)=>`<option value="${i}" ${i===4?'selected':''}>${e.name}</option>`).join('')}</select></label><label class="borel-stage">Finite stage n <output>3</output><input type="range" min="1" max="7" value="3" aria-label="Finite stage n"></label></div><div class="borel-selected"></div><div class="borel-drawing"></div><div class="small borel-key"></div><div class="borel-recipe"></div><div class="result" aria-live="polite"></div><details class="borel-meaning"><summary>What does the whole σ-algebra look like?</summary><p>Each choice above is one subset of the line. The Borel σ-algebra is the collection of all sets generated from open sets by complements and countable unions; countable intersections follow by De Morgan’s law. It contains all these examples and much more.</p><p>A useful second picture is a construction tree: open sets at its leaves, operations at its branches, and one resulting set at the root. There is no fixed finite depth that reaches all Borel sets. Countable unions may combine sets of increasingly complex construction.</p><p>Drawing every point separately does not settle which sets are Borel. All singletons are Borel, but an arbitrary set is an <em>uncountable</em> union of them in general; σ-algebra closure only guarantees countable unions. Some subsets of ℝ are not Borel.</p></details>`;
 const choice=root.querySelector('select'),slider=root.querySelector('input'),drawing=root.querySelector('.borel-drawing');
 const draw=()=>{
  const e=borelExamples[+choice.value],n=+slider.value;
  root.querySelector('output').value=n;
  root.querySelector('.borel-selected').innerHTML=`<strong>${e.set}</strong><span>${e.kind}</span>`;
  const width=Math.max(240,Math.round(drawing.getBoundingClientRect().width||480)),left=18,right=width-18,X=x=>left+x*(right-left);
  const point=(x,y,closed)=>`<circle cx="${X(x)}" cy="${y}" r="4" class="${closed?'borel-in':'borel-out'}"/>`;
  let body='';
  for(let row=0;row<2;row++){
   const k=n+row,y=52+row*100,s=borelStage(e.shape,k);
   body+=`<text x="${left}" y="${y-23}">${e.finite(k)}</text><line x1="${left}" x2="${right}" y1="${y}" y2="${y}" class="borel-axis"/>`;
   if(s.intervals){body+=s.intervals.map(([a,b])=>`<rect x="${X(a)}" y="${y-6}" width="${X(b)-X(a)}" height="12" class="borel-fill"/>${e.shape==='cantor'?'':point(a,y,s.closed)+point(b,y,s.closed)}`).join('');}
   else{
    if(s.complement)body+=`<rect x="${left}" y="${y-6}" width="${right-left}" height="12" class="borel-fill"/>`;
    body+=s.points.map(p=>point(p.x,y,!s.complement)).join('');
   }
   for(const t of [0,.5,1])body+=`<text x="${X(t)}" y="${y+29}" text-anchor="${t===0?'start':t===1?'end':'middle'}">${t===.5?'1/2':t}</text>`;
  }
  drawing.innerHTML=`<svg viewBox="0 0 ${width} 203" role="img" aria-label="Two finite stages for ${e.name.toLowerCase()} on the unit interval"><title>${e.name}: stages ${n} and ${n+1}. These are finite stages, not a drawing of the infinite set.</title>${body}</svg>`;
  root.querySelector('.borel-key').textContent='Filled marks: included · hollow circles: excluded · window: [0,1]';
  root.querySelector('.borel-recipe').innerHTML=`<span class="label">EXACT INFINITE CONSTRUCTION</span><div>${e.recipe}</div><p>${e.operation}</p>`;
  root.querySelector('.result').textContent=e.limit;
  renderMath(root.querySelector('.borel-selected'));renderMath(root.querySelector('.borel-recipe'));
 };
 root.addEventListener('input',draw);root.addEventListener('change',draw);
 new ResizeObserver(draw).observe(drawing);draw();return true;
}
