import {mountFubiniPrototypes, prototypeStyles} from './visuals-fubini-prototypes.js';
import {entries} from './content/section-1-4-3.js';
const params=new URLSearchParams(location.search);
const initial=prototypeStyles.some(s=>s.id===params.get('style'))?params.get('style'):'manipulate';
mountFubiniPrototypes(document.getElementById('comparison'),{initial,onSelect:style=>{
  const url=new URL(location.href);url.searchParams.set('style',style);history.replaceState(history.state,'',url);
}});
const entry=entries.find(e=>e.n==='1.4.28');
// Same escaping order as the reader: protect TeX, insert the trusted course HTML,
// then typeset. No course source or proof assumptions are duplicated here.
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const [selector,content] of [['.fp-theorem .fp-source-body',entry.statement],['.fp-proof .fp-source-body',entry.proof]]) {
  const node=document.querySelector(selector);
  node.innerHTML=content.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g,escape);
  window.renderMathInElement(node,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});
}
// A closed theorem does not otherwise request its fonts until beforeprint,
// which can capture KaTeX's font-display:block period as blank mathematics.
const mathFonts=new Set([...document.querySelectorAll('.fp-source-body .katex *')].map(node=>getComputedStyle(node).font).filter(Boolean));
await Promise.all([...mathFonts].map(font=>document.fonts.load(font)));
const theme=document.querySelector('.fp-theme select');theme.value=document.documentElement.dataset.theme;
const syncLinks=()=>document.querySelectorAll('.fp-reader-link').forEach(a=>a.href=`./?theme=${theme.value}#entry-1-4-28`);
theme.addEventListener('change',()=>{
  document.documentElement.dataset.theme=theme.value;
  const url=new URL(location.href);url.searchParams.set('theme',theme.value);history.replaceState(history.state,'',url);syncLinks();
});syncLinks();
let theoremOpen=false;
window.addEventListener('beforeprint',()=>{const theorem=document.querySelector('.fp-theorem');theoremOpen=theorem.open;theorem.open=true});
window.addEventListener('afterprint',()=>{document.querySelector('.fp-theorem').open=theoremOpen});
