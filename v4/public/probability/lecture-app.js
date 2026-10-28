import {lectureDiagramHTML} from './lecture-diagrams.js';
import {initStudy} from './study.js?v=lectures1';
import {escapeHTML as esc,paragraphsHTML,companionHref,pageLabel,createLectureCards,lectureSearch} from './lecture-model.js';
const main=document.getElementById('lecture-reading');
function math(root){window.renderMathInElement(root,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false,strict:'warn'});}
try{
 const manifest=await fetch('lectures/manifest.json').then(r=>{if(!r.ok)throw Error();return r.json()});
 const lectures=await Promise.all(manifest.map(l=>fetch(`lectures/lecture-${l.number}.json`).then(r=>{if(!r.ok)throw Error();return r.json()})));
 const all=new URLSearchParams(location.search).get('all')==='1';let current=1;
 const days=document.getElementById('lecture-days');
 days.innerHTML=lectures.map(l=>`<a href="#lecture-${l.number}" style="--lecture-color:${esc(l.color)}" title="Lecture ${l.number}: ${esc(l.title)}" aria-label="Lecture ${l.number}: ${esc(l.title)}"><b>${l.number}</b><strong class="day-title">${esc(l.title)}</strong><span>${esc(l.ink)} · handwritten ${pageLabel(l.pages)}</span></a>`).join('');
 function sectionHTML(l,s){return `<section class="lecture-section" id="${esc(s.id)}"><div class="lecture-source"><span>Handwritten ${pageLabel(s.pages)}</span>${s.entry?`<a href="${companionHref(s.entry)}">Dembo ${esc(s.entry)} · explanation & visuals ↗</a>`:''}</div><h3>${esc(s.title)}</h3>${paragraphsHTML(s.paragraphs)}${s.proof?.length?`<details class="lecture-proof" open><summary>Lecture proof</summary><div>${paragraphsHTML(s.proof)}</div></details>`:''}${s.diagram?lectureDiagramHTML(s.diagram):''}${s.editorial?.length?`<div class="lecture-editorial"><h4>Added explanation / correction</h4>${paragraphsHTML(s.editorial)}</div>`:''}${s.recall?`<details class="lecture-recall"><summary>Try recalling this</summary><div><p class="recall-question">${esc(s.recall.question)}</p><details class="recall-answer"><summary>Reveal answer & checks</summary><div>${paragraphsHTML(s.recall.answer)}<ul>${s.recall.checks.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></div></details><button type="button" data-open-study data-study-section="lecture.${l.number}" aria-haspopup="dialog" aria-controls="study-dialog">Practice this lecture</button></div></details>`:''}</section>`}
 main.innerHTML=lectures.map((l,i)=>`<article class="lecture" id="lecture-${l.number}" style="--lecture-color:${esc(l.color)}"><header class="lecture-heading"><div class="eyebrow">LECTURE ${l.number} · ${esc(l.ink.toUpperCase())}</div><h2>${esc(l.title)}</h2><p>Handwritten ${pageLabel(l.pages)} · edited lecture notes</p><ul class="lecture-section-list">${l.sections.map(s=>`<li><a href="#${esc(s.id)}">${esc(s.title)}</a></li>`).join('')}</ul></header>${l.sections.map(s=>sectionHTML(l,s)).join('')}<nav class="lecture-pager" aria-label="Adjacent lectures">${i?`<a href="#lecture-${l.number-1}">← Lecture ${l.number-1}</a>`:'<span></span>'}${i<lectures.length-1?`<a href="#lecture-${l.number+1}">Lecture ${l.number+1} →</a>`:'<a href="./">Return to companion →</a>'}</nav></article>`).join('');
 math(main);main.setAttribute('aria-busy','false');
 function navigate(){
  const hash=location.hash.slice(1);const l=lectures.find(l=>hash===`lecture-${l.number}`||l.sections.some(s=>s.id===hash));
  current=l?.number||1;
  document.querySelectorAll('.lecture').forEach(a=>a.hidden=!all&&a.id!==`lecture-${current}`);
  for(const a of days.querySelectorAll('a'))if(a.hash===`#lecture-${current}`)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  document.title=`${all?'All lectures':`Lecture ${current}`} · Probability`;
  if(hash){requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView({block:'start'}))}
 }
 window.addEventListener('hashchange',navigate);navigate();
 document.getElementById('lecture-query').addEventListener('input',event=>{
  const matches=lectureSearch(lectures,event.target.value),results=document.getElementById('lecture-results');
  results.innerHTML=matches.map(({lecture:l,section:s})=>`<a href="#${esc(s.id)}">${esc(s.title)}<small>Lecture ${l.number} · handwritten ${pageLabel(s.pages)}${s.entry?` · ${esc(s.entry)}`:''}</small></a>`).join('')|| (event.target.value.trim()?'<p>No matching passages.</p>':'');
 });
 document.getElementById('lecture-query').addEventListener('keydown',e=>{if(e.key==='Enter'){const first=document.querySelector('#lecture-results a');if(first){e.preventDefault();location.hash=first.hash;main.focus({preventScroll:true})}}if(e.key==='Escape'){e.target.value='';e.target.dispatchEvent(new Event('input'))}});
 let printProofs=[];window.addEventListener('beforeprint',()=>{printProofs=[...document.querySelectorAll('.lecture-proof')].map(d=>[d,d.open]);for(const [d] of printProofs)d.open=true});window.addEventListener('afterprint',()=>{for(const [d,open] of printProofs)d.open=open;printProofs=[]});
 document.getElementById('lecture-print').addEventListener('click',()=>window.print());
 initStudy({cards:createLectureCards(lectures),sections:lectures.map(l=>({n:`lecture.${l.number}`,title:`Lecture ${l.number} · ${l.title}`})),groups:[],sectionGroupLabel:'Choose a lecture',sectionLabel:'Lecture',sourceDisclosureLabel:'Lecture statement & added explanation',allSectionsLabel:'All eight lectures',storageKey:'probability-notebook-lecture-study-v1',intro:'Reconstruct the argument before revealing it. State the assumptions and justify each step.',renderRich(root,text){root.innerHTML=paragraphsHTML(text.split('\n\n').filter(Boolean));math(root)}});
}catch(error){main.setAttribute('aria-busy','false');main.innerHTML='<h2>The lectures could not be opened.</h2><p>Please reload, or return to the <a href="./">probability companion</a>.</p>';console.error('Unable to load lecture notes',error)}
