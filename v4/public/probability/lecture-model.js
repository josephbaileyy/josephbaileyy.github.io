// Lecture prose is plain text with TeX, never executable HTML.
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const paragraphsHTML=paragraphs=>paragraphs.map(p=>`<p>${escapeHTML(p)}</p>`).join('');
export const companionHref=n=>`./#entry-${n.replaceAll('.','-')}`;
export const pageLabel=pages=>pages[0]===pages[1]?`p. ${pages[0]}`:`pp. ${pages[0]}–${pages[1]}`;
export function createLectureCards(lectures){
 return lectures.flatMap(lecture=>lecture.sections.filter(s=>s.recall).map(section=>({
  id:`lecture-${section.id}`,entry:section.entry||lecture.sections.find(s=>s.entry)?.entry||'1.1.1',
  subsection:`lecture.${lecture.number}`,kind:'proof',name:section.title,
  prompt:section.recall.question,answer:section.recall.answer.join('\n\n'),checks:section.recall.checks,
  sourceStatement:section.paragraphs.join('\n\n'),sourceRemark:(section.editorial||[]).join('\n\n'),
  sourceType:`Lecture ${lecture.number}`,sourceLabel:`Lecture ${lecture.number} · handwritten ${pageLabel(section.pages)}`,
  page:String(section.pages[0]),readHref:`#${section.id}`,readLabel:'Return to this lecture passage →',
  ...(section.entry?{companionHref:companionHref(section.entry),companionLabel:`Explore Dembo ${section.entry} →`}:{})
 })));
}
export function lectureSearch(lectures,query){
 const normalize=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const words=normalize(query.trim()).split(/\s+/).filter(Boolean);
 if(!words.length)return [];
 return lectures.flatMap(l=>l.sections.map(s=>({lecture:l,section:s,text:normalize(`${l.title} ${s.title} ${s.entry||''} ${s.paragraphs.join(' ')} ${(s.proof||[]).join(' ')} ${(s.editorial||[]).join(' ')}`)})))
  .filter(item=>words.every(word=>item.text.includes(word))).slice(0,40);
}
