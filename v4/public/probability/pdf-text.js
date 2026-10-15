// ReadableStream.getReader works in Safari releases whose streams do not expose
// Symbol.asyncIterator (which PDF.js 6 getTextContent currently assumes).
// Preserve the text, styles and language used by fitting and selectable text.
export async function readPageText(page){
 const reader=page.streamTextContent().getReader();
 const text={items:[],styles:Object.create(null),lang:null};
 try{
  while(true){
   const {value,done}=await reader.read();if(done)break;
   text.lang??=value.lang;
   Object.assign(text.styles,value.styles);
   text.items.push(...value.items);
  }
  return text;
 }finally{reader.releaseLock()}
}
