import {definitions} from './definitions.js?v=navigation2';
const normalize=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}.]+/gu,' ').trim();
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&(?:lt|gt|amp|quot|#39);/g,' ');
export function searchEntries(entries,query='',type='') {
 const tokens=normalize(query).split(/\s+/).filter(Boolean);
 return entries.filter(e=>!type||e.type===type).map(e=>{
  const names=definitions.filter(d=>d.entry===e.n).flatMap(d=>[d.label,...d.aliases]).join(' ');
  // Search the reading material; closed hints and solutions do not enter the index.
  const heading=normalize(`${e.type} ${e.n} ${e.title} ${names}`);
  const text=heading+' '+normalize(plain(e.statement)+' '+plain(e.plain));
  const matches=tokens.every(t=>text.includes(t));
  const rank=normalize(query)===e.n?0:tokens.every(t=>heading.includes(t))?1:2;
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
   const label=definitions.filter(d=>d.entry===e.n).map(d=>d.label).join(' · ');
   const strong=document.createElement('strong');strong.textContent=`${e.type} ${e.n}`;
   const title=document.createElement('span');title.textContent=e.title;
   a.append(strong,title);
   if(label){const small=document.createElement('small');small.textContent=label;a.append(small)}
   results.append(a);
  }
 }
 trigger.addEventListener('click',()=>{update();dialog.showModal();input.focus();input.select()});
 dialog.querySelector('[data-close-search]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>trigger.focus());
 input.addEventListener('input',update);filter.addEventListener('change',update);
 results.addEventListener('click',event=>{if(event.target.closest('a'))dialog.close()});
 dialog.addEventListener('keydown',event=>{
  const links=[...results.querySelectorAll('a')];
  if(event.target===input&&event.key==='Enter'){event.preventDefault();links[0]?.click()}
  if((event.target===input||links.includes(event.target))&&['ArrowDown','ArrowUp'].includes(event.key)){
   event.preventDefault();const i=links.indexOf(document.activeElement);
   if(event.key==='ArrowUp'&&i<=0)input.focus();else links[Math.min(links.length-1,Math.max(0,i+(event.key==='ArrowDown'?1:-1)))]?.focus();
  }
 });
}
