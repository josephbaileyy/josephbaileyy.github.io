import {lessons,styles} from './prototype-lessons.js';
import {mountDesignPrototypes} from './visuals-design-prototypes.js';
import {entries as cdfEntries} from './content/section-1-2-3.js';
import {entries as machineEntries} from './content/section-1-3-1.js';
import {entries as fatouEntries} from './content/section-1-3-3.js';
const entries={cdf:cdfEntries,machine:machineEntries,fatou:fatouEntries};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=s=>s.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g,esc);
const typeset=node=>window.renderMathInElement(node,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});
const warmFonts=node=>Promise.all([...new Set([...node.querySelectorAll('.katex *')].map(e=>getComputedStyle(e).font).filter(Boolean))].map(font=>document.fonts.load(font)));
const params=new URLSearchParams(location.search),mounted=new Set(),styleByTopic={};let current='fatou';
const startingStyle=styles.some(s=>s.id===params.get('style'))?params.get('style'):'explore';
const nav=document.getElementById('topics'),panels=document.getElementById('topic-panels');
nav.innerHTML=Object.entries(lessons).map(([topic,l])=>`<button type="button" role="tab" data-topic="${topic}" id="topic-${topic}" aria-controls="panel-${topic}" aria-selected="false" tabindex="-1">${l.number} · ${l.name}<br><small>${l.kind}</small></button>`).join('');
panels.innerHTML=Object.keys(lessons).map(topic=>`<section class="ep-topic-panel" role="tabpanel" id="panel-${topic}" aria-labelledby="topic-${topic}" hidden></section>`).join('');
const theme=document.querySelector('.ep-theme select');theme.value=document.documentElement.dataset.theme;
const syncURL=()=>{const url=new URL(location.href);url.searchParams.set('topic',current);url.searchParams.set('style',styleByTopic[current]||startingStyle);history.replaceState(history.state,'',url);document.querySelector('.ep-reader-link').href=`./?theme=${theme.value}#entry-${lessons[current].number.replaceAll('.','-')}`};
function mount(topic){
  const l=lessons[topic],entry=entries[topic].find(e=>e.n===l.number),panel=document.getElementById(`panel-${topic}`);
  const source=`<div class="ep-source-body">${rich(entry.statement)}</div>`;
  panel.innerHTML=`<h2>${l.title}</h2>${topic==='machine'?`<div class="ep-problem">${source}</div><p class="ep-gate-note">Try the exercise before opening its solution. The comparison below contains all four proof stages.</p><details class="ep-solution-gate"><summary>Reveal solution and compare three explanations</summary><div class="ep-solution-body"><div class="ep-host"></div><details class="ep-written"><summary>Concise written solution</summary><div class="ep-source-body">${rich(entry.solution)}</div></details></div></details>`:`<details class="ep-source"><summary>${topic==='cdf'?'Source definition':'Full statement and hypotheses'}</summary>${source}</details><div class="ep-host"></div>${entry.proof?`<details class="ep-written"><summary>Concise written proof</summary><div class="ep-source-body">${rich(entry.proof)}</div></details>`:''}`}<p class="ep-source-link"><a href="source/230anotes.pdf#page=${String(entry.page).split('–')[0]}">Original course source · p. ${entry.page}</a></p>`;
  const initialize=()=>{
    const host=panel.querySelector('.ep-host');if(host.dataset.mounted)return;
    mountDesignPrototypes(host,topic,{initial:styleByTopic[topic]||startingStyle,onSelect:style=>{styleByTopic[topic]=style;if(current===topic)syncURL()}});host.dataset.mounted='true';
    warmFonts(panel);
  };
  if(topic==='machine')panel.querySelector('.ep-solution-gate').addEventListener('toggle',e=>{if(e.target.open)initialize()});else initialize();
  panel.querySelectorAll('a[href^="#entry-"]').forEach(a=>a.setAttribute('href','./'+a.getAttribute('href')));
  typeset(panel);warmFonts(panel);
}
function select(topic){
  if(!lessons[topic])topic='fatou';current=topic;
  document.querySelectorAll('.ep-topic-panel').forEach(p=>p.hidden=p.id!==`panel-${topic}`);
  nav.querySelectorAll('[role=tab]').forEach(b=>{const active=b.dataset.topic===topic;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1});
  if(!mounted.has(topic)){mounted.add(topic);mount(topic)}syncURL();
}
nav.addEventListener('click',e=>{const b=e.target.closest('[data-topic]');if(b)select(b.dataset.topic)});
nav.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const tabs=[...nav.querySelectorAll('[role=tab]')],i=tabs.indexOf(e.target);if(i<0)return;e.preventDefault();
  const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  select(tabs[j].dataset.topic);tabs[j].focus();
});
theme.addEventListener('change',()=>{document.documentElement.dataset.theme=theme.value;const url=new URL(location.href);url.searchParams.set('theme',theme.value);history.replaceState(history.state,'',url);syncURL()});
select(params.get('topic'));
let sourceStates=[];
window.addEventListener('beforeprint',()=>{const active=document.getElementById(`panel-${current}`);sourceStates=[...active.querySelectorAll('.ep-source')].map(d=>[d,d.open]);sourceStates.forEach(([d])=>d.open=true)});
window.addEventListener('afterprint',()=>sourceStates.forEach(([d,open])=>d.open=open));
