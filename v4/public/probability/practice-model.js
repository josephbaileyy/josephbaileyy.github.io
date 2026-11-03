import {escapeHTML,paragraphsHTML} from './lecture-model.js';
export {escapeHTML,paragraphsHTML};
export const entryHref=n=>`./#entry-${n.replaceAll('.','-')}`;
export const lectureHref=id=>`lectures.html#${id}`;
export function makePracticeCards(repairs,lp,exams){
 return [...repairs.map(p=>({...p,group:'repairs',kind:'repair'})),...lp.map(p=>({...p,group:'lp',kind:'proof'})),...exams.map(p=>({...p,group:'examples',kind:'proof'}))].map(p=>({
  id:`practice-${p.id}`,entry:p.entries[0],subsection:`practice.${p.group}`,kind:p.kind,name:p.title,
  prompt:[...p.prompt,...(p.flawed?.length?['Proposed argument — find the gap:',...p.flawed]:[])].join('\n\n'),
  answer:p.solution.join('\n\n'),checks:p.checks,sourceStatement:p.prompt.join('\n\n'),sourceRemark:'',sourceLabel:p.source||'Additional study exercise',
  readHref:`#${p.id}`,readLabel:'Return to this problem →',companionHref:entryHref(p.entries[0]),companionLabel:`Open Dembo ${p.entries[0]} →`,page:''
 }));
}
