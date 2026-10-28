import {definitions} from './definitions.js?v=navigation2';
const normalize=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/['’]s\b/g,'').replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&(?:lt|gt|amp|quot|#39);/g,' ');
// Search-only names supplement the reviewed link index without changing in-text links.
// Destinations are the statements themselves, not later applications or exercises.
const searchNames=[
 ['1.1.30','Carathéodory’s extension theorem',['Caratheodory extension theorem']],
 ['1.3.1','Integral / expectation',['Lebesgue integral','expectation','expected value']],
 ['1.3.2','Integrability / L1',['integrable','absolute integrability','L^1']],
 ['1.3.4','Monotone convergence theorem',['MON','monotone convergence']],
 ['1.3.22','Convergence in probability',['converge in probability','converges in probability','convergence in measure']],
 ['1.3.26','Lq convergence',['L^q convergence','convergence in Lq','convergence in L^q','L1 convergence','L2 convergence','convergence in mean','mean square convergence']],
 ['1.3.32','Monotone convergence for random variables',['MON']],
 ['1.3.33','Fatou’s lemma',['Fatou lemma','reverse Fatou']],
 ['1.3.34','Dominated convergence theorem',['DOM','DCT','dominated convergence']],
 ['1.3.35','Scheffé’s lemma',['Scheffe lemma']],
 ['1.3.47','Uniform integrability',['uniformly integrable']],
 ['1.3.49','Vitali’s convergence theorem',['Vitali theorem']],
 ['1.3.59','Lebesgue measurability / Lebesgue integration',['Lebesgue measurable','Lebesgue integrable']],
 ['1.3.61','Change of variables for expectation',['change of variables']],
 ['1.3.63','Riemann integrability',['Riemann integral','Riemann integrable']],
 ['1.3.67','Mean / variance / moments',['mean','variance','moment','moments']],
 ['1.4.3','Mutual independence of collections',['independent collections']],
 ['1.4.22','Kolmogorov’s extension theorem',['Kolmogorov extension','consistency theorem']],
 ['2.1.3','L² weak law of large numbers',['L2 weak law']],
 ['2.1.8','Coupon collector',['coupon collection']],
 ['2.1.11','Weak law for triangular arrays',['triangular arrays','truncation weak law']],
 ['2.1.14','Weak law of large numbers',['weak law','WLLN']],
 ['2.1.15','St. Petersburg paradox',['Petersburg']],
 ['2.2.9','Kochen–Stone lemma',['Kochen Stone']],
 ['2.3.3','Strong law of large numbers',['SLLN','Etemadi strong law']],
 ['2.3.6','Glivenko–Cantelli theorem',['Glivenko Cantelli','uniform empirical convergence']],
 ['1.4.28','Fubini’s theorem',['Fubini theorem','Fubini']]
].map(([entry,label,aliases])=>({entry,label,aliases}));
const concepts=[...definitions,...searchNames];
const namesFor=e=>concepts.filter(d=>d.entry===e.n);
export function entrySearchLabel(e){
 const names=namesFor(e).map(d=>d.label).join(' · ');
 return `${e.type} ${e.n}${names?` (${names})`:''}`;
}
export function searchEntries(entries,query='',type='') {
 const normalized=normalize(query),tokens=normalized.split(/\s+/).filter(Boolean);
 return entries.filter(e=>!type||e.type===type).map(e=>{
  const names=namesFor(e).flatMap(d=>[d.label,...d.aliases]).map(normalize);
  // Search the reading material; closed hints and solutions do not enter the index.
  const heading=normalize(`${e.type} ${e.n} ${e.title} ${names.join(' ')}`);
  const text=heading+' '+normalize(plain(e.statement)+' '+plain(e.plain));
  const matches=tokens.every(t=>text.includes(t));
  // Prefer the canonical concept over a title or statement that merely mentions it.
  // With no query, retain the course's source order.
  const rank=!tokens.length?0:normalized===e.n?0:names.includes(normalized)?1:
   names.some(name=>tokens.every(t=>name.includes(t)))?2:tokens.every(t=>heading.includes(t))?3:4;
  return {e,matches,rank};
 }).filter(x=>x.matches).sort((a,b)=>a.rank-b.rank).map(x=>x.e);
}
export function initEntrySearch(entries) {
 const dialog=document.querySelector('#entry-search'),input=dialog.querySelector('input'),filter=dialog.querySelector('select');
 const results=dialog.querySelector('.entry-search-results'),count=dialog.querySelector('[role="status"]'),trigger=document.querySelector('#go-to-entry');
 function update(){
  const found=searchEntries(entries,input.value,filter.value);results.replaceChildren();
  count.textContent=found.length?`${found.length} ${found.length===1?'entry':'entries'}`:'No matching entries. Try a number, a result name, or fewer words.';
  for(const e of found){
   const a=document.createElement('a');a.href='#entry-'+e.n.replaceAll('.','-');
   const strong=document.createElement('strong');strong.textContent=entrySearchLabel(e);
   const title=document.createElement('span');title.textContent=e.title;
   a.append(strong,title);
   const small=document.createElement('small');small.textContent=`${e.type==='Definition'?'Definition starts here · ':''}p. ${e.page}`;a.append(small);
   results.append(a);
  }
 }
 trigger.addEventListener('click',()=>{update();dialog.showModal();input.focus();input.select()});
 dialog.querySelector('[data-close-search]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>trigger.focus());
 input.addEventListener('input',update);filter.addEventListener('change',update);
 results.addEventListener('click',event=>{if(event.target.closest('a'))dialog.close()});
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();dialog.close();return}
  const links=[...results.querySelectorAll('a')];
  if(event.target===input&&event.key==='Enter'){event.preventDefault();links[0]?.click()}
  if((event.target===input||links.includes(event.target))&&['ArrowDown','ArrowUp'].includes(event.key)){
   event.preventDefault();const i=links.indexOf(document.activeElement);
   if(event.key==='ArrowUp'&&i<=0)input.focus();else links[Math.min(links.length-1,Math.max(0,i+(event.key==='ArrowDown'?1:-1)))]?.focus();
  }
 });
}
