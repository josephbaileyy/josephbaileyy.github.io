// A flat index of the interactive models. Entries remain the single source of titles and captions.
import {entries} from './content/book.js?v=reader-fixes1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=n=>'entry-'+n.replaceAll('.','-');
export const sectionTitles={'1.1':'Probability spaces, measures and σ-algebras','1.2':'Random variables and their distribution','1.3':'Integration and the mathematical expectation','1.4':'Independence and product measures','2.1':'Weak laws of large numbers','2.2':'The Borel–Cantelli lemmas','2.3':'Strong law of large numbers','3.1':'The central limit theorem','3.2':'Weak convergence','3.3':'Characteristic functions','3.4':'Poisson approximation and the Poisson process','3.5':'Random vectors and the multivariate CLT'};
// Proof maps are static step lists, so only computed or interactive figures are indexed.
export const interactiveEntries=all=>all.filter(e=>e.visual&&e.visual!=='proof-map');
export function groupBySection(list){const groups=new Map();for(const e of list){const key=e.n.split('.').slice(0,2).join('.');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}return [...groups];}
export function matches(e,chapter,query){
 if(chapter&&!e.n.startsWith(chapter+'.'))return false;
 const q=query.trim().toLowerCase();if(!q)return true;
 return [e.n,e.type,e.title,e.caption||''].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').includes(q.normalize('NFD').replace(/[̀-ͯ]/g,''));
}
if(typeof document!=='undefined'){
 const models=interactiveEntries(entries),list=document.getElementById('visuals-list'),status=document.getElementById('visuals-status'),query=document.getElementById('visuals-query');
 let chapter='';
 document.getElementById('visuals-count').textContent=`${models.length} entries include an interactive model or computed figure. Each link opens the entry beside its page in the course notes.`;
 function render(){
  const shown=models.filter(e=>matches(e,chapter,query.value));
  list.innerHTML=groupBySection(shown).map(([key,items])=>`<section class="visuals-group"><h2>${key} · ${esc(sectionTitles[key]||'')}</h2><ul>${items.map(e=>`<li><a href="./#${id(e.n)}"><span class="kind">${esc(e.type)} ${e.n} · p. ${esc(e.page)}</span><strong>${esc(e.title)}</strong>${e.caption?`<span class="what">${e.caption.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g,esc)}</span>`:''}</a></li>`).join('')}</ul></section>`).join('');
  status.textContent=shown.length===models.length?'':shown.length?`${shown.length} of ${models.length} shown.`:'No model matches. Try a shorter word.';
  window.renderMathInElement?.(list,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});
 }
 document.querySelector('.visuals-filter').addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;chapter=b.dataset.chapter;document.querySelectorAll('.visuals-filter button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();});
 query.addEventListener('input',render);
 // KaTeX loads with defer; module scripts run after it, but guard against a slow vendor file.
 render();window.addEventListener('load',render,{once:true});
}
