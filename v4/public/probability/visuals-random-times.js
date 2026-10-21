import {typewriter} from './intuition-models.js';
const GREEN='#507b61',PALE='#d8e8df',GOLD='#b58a48',INK='#35483e';
const text=(x,y,s,anchor='start')=>`<text x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const fmt=x=>Number(x).toFixed(4);
export function randomTimeModel(k,w) {
 const first=k*(k-1)/2+1,cell=Math.max(1,Math.ceil(k*w)),selected=first+cell-1;
 return {k,first,cell,selected,fixedValue:typewriter(first,w).value,selectedValue:typewriter(selected,w).value,fixedProbability:1/k};
}
export function rowAfterCutoff(n){return Math.ceil((1+Math.sqrt(1+8*(n-1)))/2)}
export function mountRandomTimes(root,name,{setup,range,svg}) {
 const subsequence=name==='conv-random-subsequence';
 root.classList?.add('intuition-lab','random-time-lab');
 const controls=(subsequence?'<label>Sequence<select data-control="family" aria-label="Sequence"><option value="1">Settling paths: Yⱼ(ω) = ω/j</option><option value="0">Moving window: Yⱼ(ω) = 0 or 1</option></select></label>'+range('k','Sweep k (number of cells)',1,20,4):range('n','Late cutoff n (earliest allowed time)',1,150,8))
  +range('w','Outcome ω (point in the unit interval)',.01,1,.37,.01);
 setup(root,controls,v=>{
  const k=subsequence?v.k:rowAfterCutoff(v.n),m=randomTimeModel(k,v.w),settling=subsequence&&v.family===1,letter=subsequence?'Y':'X',selector=subsequence?'Nₖ':'M';
  const fixed=settling?v.w/m.first:m.fixedValue,selected=settling?v.w/m.selected:m.selectedValue;
  let strips='';
  for(const [row,cell,color,label] of [[0,1,GREEN,'Time fixed first'],[1,m.cell,GOLD,'Time chosen using ω']]){
   const y=48+row*108;
   strips+=text(45,y-12,label)+`<rect x="45" y="${y}" width="510" height="32" fill="#f2f3ed"/>`;
   for(let i=1;i<=k;i++)strips+=`<rect x="${45+510*(i-1)/k}" y="${y}" width="${510/k}" height="32" fill="${i===cell?color:'transparent'}" stroke="${PALE}"/>`;
   strips+=`<line x1="${45+510*v.w}" x2="${45+510*v.w}" y1="${y-5}" y2="${y+39}" stroke="${INK}" stroke-width="3"/>`+text(45,y+60,'0')+text(300,y+60,'outcomes ω','middle')+text(555,y+60,'1','end');
  }
  const metrics=`<div class="intuition-metrics"><div><span>Fixed time j = ${m.first}</span><strong>${letter}ⱼ(ω) = ${fmt(fixed)}</strong></div><div><span>Chosen time ${selector}(ω) = ${m.selected}</span><strong>${letter}<sub>${selector}</sub>(ω) = ${fmt(selected)}</strong></div></div>`;
  const instructions=settling?`<p>Every path settles: at time j the value is ω/j. The strips below show two ways to choose a time in the same sweep. Both choices move later as k grows.</p>`:`<p>The moving window from <a href="#entry-1-3-25">1.3.25</a> sweeps across (0,1]. At each time j, ${letter}ⱼ is 1 inside the active cell and 0 outside. A sweep with k cells takes k consecutive times.</p>`;
  const status=settling?`Both chosen values are at most 1/${m.first} = ${fmt(1/m.first)}. Increase k: even a choice made after seeing ω cannot keep these values away from zero.`:`At the fixed time j=${m.first}, P(${letter}ⱼ=1)=1/${k}=${fmt(m.fixedProbability)}. With a separate time ${selector}(ω) for each outcome, ${letter}<sub>${selector}</sub>=1 for every ω, so P(${letter}<sub>${selector}</sub>=1)=1. Increase ${subsequence?'k':'n'}: the window shrinks, but the outcome-dependent choice still finds a 1.`;
  let history='';
  if(subsequence){
   const X=j=>45+510*(j-1)/19,Y=value=>160-115*value;
   let lines=`<path d="M45 45V160H555" fill="none" stroke="${PALE}"/>`+text(30,50,'1','end')+text(30,165,'0','end')+text(45,185,'k=1')+text(555,185,'20','end');
   for(const [which,color] of [['fixed',GREEN],['selected',GOLD]]){
    const points=Array.from({length:k},(_,i)=>{
     const m=randomTimeModel(i+1,v.w),value=settling?v.w/(which==='fixed'?m.first:m.selected):(which==='fixed'?m.fixedValue:m.selectedValue);
     return {x:X(i+1),y:Y(value)};
    });
    lines+=`<polyline points="${points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" ${which==='selected'?'stroke-dasharray="7 4"':''}/>`;
    lines+=points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}"/>`).join('');
   }
   history=`<div class="intuition-panel"><h4>Keep ω fixed; increase the sweep k</h4>${svg(lines,200)}<p class="intuition-note">Green: values at the fixed first time of each sweep. Dashed gold: values at the time chosen using ω. ${settling?'Both curves shrink toward zero.':'Gold stays at 1, however late the chosen times become.'}</p></div>`;
  }
  const question=settling?'What would choosing a later time have to do to defeat a path that has already settled?':'A small chance of being in one fixed window does not mean a path avoids all later windows. Move ω: which time changes with it?';
  return [`<div class="intuition-panel"><h4>${settling?'Follow one settling path':'One fixed window versus a window chosen for you'}</h4>${instructions}<p class="intuition-note">ω is the uniformly chosen point in (0,1]; k=${k} is the number of cells in this sweep. Its times run from ${m.first} to ${m.first+k-1}.${subsequence?'':` Every time shown is at least the cutoff n=${v.n}.`}</p></div>`+svg(strips,245)+`<p class="intuition-note">Green chooses the first cell before seeing the outcome. Gold chooses cell ${m.cell}, which contains ω=${v.w}. The dark line marks that same outcome in both strips.${settling?' Cell shading marks the choice of time; values are ω/j.':' Shading marks where the value at that time is 1. Closed endpoints belong to both neighboring windows.'}</p>`+metrics+history+`<p class="intuition-prompt">${question}</p>`,status];
 });
 root.insertAdjacentHTML?.('afterbegin',`<p class="intuition-prompt">${subsequence?'A random index is a rule: see the outcome ω, choose a time Nₖ(ω), then read that same outcome’s value at that time. Compare two sequences below before working through parts (a)–(d).':'“Every random time” allows a different late time for each outcome. Can looking at the outcome help you find a future value equal to 1?'}</p>`);
 return true;
}
