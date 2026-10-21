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

// Weight font sizes by visible characters so page numbers, superscripts and
// headings do not determine the reading size of the main paragraph text.
export function bodyTextSize(items){
 const weights=new Map();
 for(const item of items){
  const weight=item.str?.trim().length||0,size=Math.round(item.height*10)/10;
  if(weight&&Number.isFinite(size)&&size>0)weights.set(size,(weights.get(size)||0)+weight);
 }
 return [...weights].sort((a,b)=>b[1]-a[1])[0]?.[0]||10;
}
export function matchedSplit({width,textWidth,sourceFont,guideFont,padding=10}){
 const sourceWidth=textWidth*guideFont/sourceFont/.9+2*padding;
 return Math.max(30,Math.min(70,100*sourceWidth/Math.max(1,width)));
}
