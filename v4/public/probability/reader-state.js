// Source labels may be a single page or an inclusive range such as "8–9".
export const sourcePage=entry=>parseInt(entry.page,10);
export function coversPage(entry,page){
 const numbers=String(entry.page).match(/\d+/g)?.map(Number)||[];
 return numbers.length>0&&page>=numbers[0]&&page<=numbers.at(-1);
}
export function sourceHeading(text,preceding){
 const types='Definition|Exercise|Example|Lemma|Theorem|Proposition|Corollary|Remark';
 return text.match(new RegExp(`^(?:${types})\\s+(\\d+\\.\\d+\\.\\d+)`))?.[1]
  ||(new RegExp(`^(?:${types})$`).test(preceding)?text.match(/^(\d+\.\d+\.\d+)(?:\.?\s*$|\s*\()/)?.[1]:null)
  ||null;
}
