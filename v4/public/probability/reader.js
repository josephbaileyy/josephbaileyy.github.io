import {sourcePage,coversPage,sourceHeading,bodyTextSize,matchedSplit} from './reader-state.js?v=curves2';
import {readPageText} from './pdf-text.js';
// Reader state lives separately from the mathematical content and annotations.
export function initReader({entries,sections,id,toast}){
 const $=s=>document.querySelector(s), body=document.body;
 const layout=$('.reader-layout'), source=$('.source-scroll'), companion=$('.companion-pane');
 const params=new URLSearchParams(location.search);
 let split=params.get('view')!=='continuous'&&!params.has('print');
 let active=entries[0], pageNumber=sourcePage(active), pdf, pdfLibrary, renderTask, textLayer, revision=0, zoom=1, resizeTimer, zoomTimer, zoomAnchor, renderedZoom=1, initialNavigation=true;
 const entryForHash=()=>entries.find(e=>'#'+id(e.n)===location.hash)||sections.find(s=>'#'+s.anchor===location.hash)?.entries[0];
 const stored=(key,fallback)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
 const persist=(key,value)=>{try{localStorage.setItem(key,String(value))}catch{}};
 let matchText=stored('probability-notebook-layout','matched')==='matched';
 const ratio=Number(stored('probability-notebook-split','54'));
 layout.style.setProperty('--split',`${Number.isFinite(ratio)?Math.max(30,Math.min(70,ratio)):54}%`);
 body.classList.toggle('nav-hidden',stored('probability-notebook-contents','hidden')==='hidden');
 if(params.has('print'))body.classList.add('print-layout');
 const toolsMenu=$('.tools-menu'), compactTools=matchMedia('(max-width:1100px)');
 const arrangeTools=()=>{toolsMenu.open=!compactTools.matches};arrangeTools();compactTools.addEventListener('change',arrangeTools);
 new ResizeObserver(()=>body.style.setProperty('--toolbar-height',`${$('.toolbar').offsetHeight}px`)).observe($('.toolbar'));

 // Browser history carries the reading position, independent of personal notes.
 const historyKey='probabilityReader';
 const fitRevision='matched-explanation-1';
 const restoredZoom=p=>p.fitRevision===fitRevision?(p.zoom||1):1;
 const historyTrail=history.state?.[historyKey]?.trail||crypto.randomUUID();
 let historyIndex=history.state?.[historyKey]?.index||0;
 let historyEnd=historyIndex, restoring=false, pendingRestore=null, positionTimer;
 try{historyEnd=Math.max(historyIndex,Number(sessionStorage.getItem(historyTrail))||0)}catch{}
 let lastURL=location.href;
 history.scrollRestoration='manual';
 function position(){return {index:historyIndex,trail:historyTrail,entry:active?.n||null,page:pageNumber,split,zoom,fitRevision,
  pane:body.dataset.mobilePane||'companion',sourceTop:source.scrollTop,sourceLeft:source.scrollLeft,
  companionTop:companion.scrollTop,windowTop:window.scrollY,
  sourceReady:$('.pdf-loading').hidden&&$('.pdf-error').hidden&&!!source.querySelector(`canvas[aria-label="Original course notes, page ${pageNumber}"]`)};}
 function rememberPosition(){
  clearTimeout(positionTimer);if(restoring)return;
  history.replaceState({...history.state,[historyKey]:position()},'',location.href);
 }
 function historyButtons(){
  $('#history-back').disabled=historyIndex<=0;
  $('#history-forward').disabled=historyIndex>=historyEnd;
 }
 function pushURL(url){
  restoreReadingPosition();pendingRestore=null;restoring=false;
  rememberPosition();historyIndex++;historyEnd=historyIndex;
  try{sessionStorage.setItem(historyTrail,String(historyEnd))}catch{}
  history.pushState({...history.state,[historyKey]:{...position(),index:historyIndex}},'',url);
  lastURL=location.href;historyButtons();
 }
 function setPane(pane){
  body.dataset.mobilePane=pane;
  document.querySelectorAll('[data-pane]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pane===pane)));
 }
 function restoreReadingPosition(){
  if(!pendingRestore||pendingRestore.readingRestored)return;
  companion.scrollTo({top:pendingRestore.companionTop||0,behavior:'instant'});
  window.scrollTo({top:pendingRestore.windowTop||0,behavior:'instant'});
  pendingRestore.readingRestored=true;
 }
 function finishRestore(){
  if(!pendingRestore)return;
  restoreReadingPosition();
  const p=pendingRestore;pendingRestore=null;
  // A failed load leaves zero scroll offsets, not a real reading position.
  if(p.fitRevision===fitRevision&&(p.sourceReady??(p.sourceTop>0||p.sourceLeft>0)))source.scrollTo({top:p.sourceTop||0,left:p.sourceLeft||0,behavior:'instant'});
  restoring=false;rememberPosition();
 }
 for(const target of [source,companion,window])target.addEventListener('scroll',()=>{
  if(restoring)return;clearTimeout(positionTimer);positionTimer=setTimeout(rememberPosition,100);
 },{passive:true});
 window.addEventListener('pagehide',rememberPosition);
 $('#history-back').onclick=()=>{rememberPosition();history.back()};
 $('#history-forward').onclick=()=>{rememberPosition();history.forward()};

 function updateSelection({scrollSource=false}={}){
  document.querySelectorAll('.entry').forEach(a=>a.classList.toggle('is-selected',a.dataset.entry===active?.n));
  document.querySelectorAll('#toc a').forEach(a=>{const selected=a.hash==='#'+id(active?.n||'');a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
  document.querySelectorAll('.toc-group').forEach((group,i)=>{if(sections[i].n===active?.subsection)group.open=true});
  const index=entries.indexOf(active);
  $('#entry-prev').disabled=index<=0;$('#entry-next').disabled=index<0||index===entries.length-1;
  $('#entry-position').textContent=active?`${index+1} / ${entries.length}`:'Companion ends at p. 70';
  $('#companion-label').textContent=active?`${active.type} ${active.n}`:`Source p. ${pageNumber}`;
  $('.companion-empty').classList.toggle('is-visible',!active);
  const choices=entries.filter(e=>coversPage(e,pageNumber));
  $('#page-entries').replaceChildren();
  const label=document.createElement('span');label.textContent=choices.length?'ON THIS PAGE':'No companion entries on this page';$('#page-entries').append(label);
  for(const e of choices){const b=document.createElement('button');b.className='entry-choice';b.textContent=e.n;b.title=`${e.type}: ${e.title}`;b.setAttribute('aria-label',`${e.type} ${e.n}: ${e.title}`);b.setAttribute('aria-pressed',String(e.n===active?.n));b.onclick=()=>select(e,{scrollSource:true});$('#page-entries').append(b)}
  highlightSource(scrollSource);
 }
 function highlightSource(scroll=false){
  document.querySelectorAll('.source-entry-link').forEach(span=>span.classList.toggle('selected',span.dataset.entry===active?.n));
  if(scroll){const target=document.querySelector('.source-entry-link.selected');if(target)source.scrollTo({top:Math.max(0,target.getBoundingClientRect().top-source.getBoundingClientRect().top+source.scrollTop-80),behavior:'instant'})}
 }
 function select(e,{push=true,scrollSource=false}={}){
  if(!e)return;
  if(push){const url=new URL(location);url.hash=id(e.n);url.searchParams.delete('page');pushURL(url)}
  active=entries.find(item=>item.n===e.n)||e;const changed=pageNumber!==sourcePage(e);pageNumber=sourcePage(e);
  if(push)setPane('companion');
  updateSelection({scrollSource:scrollSource&&!changed});companion.scrollTop=0;
  if(split&&(changed||!pdf||matchText))drawPage({scrollSource});
  if(!split)document.getElementById(id(e.n)).scrollIntoView({behavior:'instant'});
  if(push)rememberPosition();
 }
 async function loadPDF(){
  if(!pdf){
   if(!pdfLibrary){pdfLibrary=import('./vendor/pdfjs/pdf.legacy.min.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.legacy.min.mjs',import.meta.url).href;return lib})}
   const lib=await pdfLibrary;
   if(!pdf)pdf=lib.getDocument({url:new URL('./source/230anotes.pdf',import.meta.url).href,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href}).promise;
  }
  return await pdf;
 }
 async function drawPage({scrollSource=false,preservePosition=false}={}){
  const anchor=preservePosition&&zoomAnchor?{...zoomAnchor}:null, drawingZoom=zoom;
  if(!preservePosition){clearTimeout(zoomTimer);zoomAnchor=null}
  if(!split)return;
  const current=++revision;renderTask?.cancel();textLayer?.cancel();
  $('.pdf-loading').hidden=false;$('.pdf-error').hidden=true;
  try{
   const documentPDF=await loadPDF();if(current!==revision)return;
   pageNumber=Math.max(1,Math.min(documentPDF.numPages,pageNumber));
   if(document.activeElement!==$('#page-number'))$('#page-number').value=pageNumber;
   $('#page-number').max=documentPDF.numPages;$('#page-total').textContent=`/ ${documentPDF.numPages}`;
   $('#page-prev').disabled=pageNumber===1;$('#page-next').disabled=pageNumber===documentPDF.numPages;
   const page=await documentPDF.getPage(pageNumber);if(current!==revision)return;
   const base=page.getViewport({scale:1});
   // Fit the printed text, rather than the PDF's wide paper margins.
   const text=await readPageText(page);if(current!==revision)return;
   const boxes=text.items.filter(item=>item.str?.trim()).map(item=>{
    const [x,y]=base.convertToViewportPoint(item.transform[4],item.transform[5]);
    return {left:x,right:x+item.width,top:y-item.height};
   });
   const left=boxes.length?Math.min(...boxes.map(b=>b.left)):0;
   const right=boxes.length?Math.max(...boxes.map(b=>b.right)):base.width;
   const top=boxes.length?Math.min(...boxes.map(b=>b.top)):0;
   const padding=parseFloat(getComputedStyle(source).paddingLeft);
   if(matchText&&!matchMedia('(max-width:900px)').matches){
    const guide=$('.entry.is-selected .walkthrough-story p')||$('.entry.is-selected .plain')||$('.plain');
    const pct=matchedSplit({width:layout.clientWidth,textWidth:Math.max(base.width*.5,right-left),sourceFont:bodyTextSize(text.items),guideFont:parseFloat(getComputedStyle(guide).fontSize),padding});
    // Set the pane width before measuring it for the PDF render. The observer
    // may schedule one further render, but the stable ratio prevents a loop.
    layout.style.setProperty('--split',`${pct}%`);
    $('.pane-divider').setAttribute('aria-valuenow',String(Math.round(pct)));
   }
   // Leave a little breathing room around the printed text.
   const scale=.9*Math.max(200,source.clientWidth-2*padding)/Math.max(base.width*.5,right-left)*drawingZoom;
   const viewport=page.getViewport({scale}), density=Math.min(devicePixelRatio||1,2);
   const canvas=document.createElement('canvas');canvas.width=Math.floor(viewport.width*density);canvas.height=Math.floor(viewport.height*density);
   canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;canvas.setAttribute('aria-label',`Original course notes, page ${pageNumber}`);
   const container=$('.pdf-page');
   renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:density===1?null:[density,0,0,density,0,0]});await renderTask.promise;if(current!==revision)return;
   container.style.width=`${viewport.width}px`;container.style.height=`${viewport.height}px`;container.style.setProperty('--total-scale-factor',String(viewport.scale*page.userUnit));container.style.setProperty('--scale-round-x','1px');container.style.setProperty('--scale-round-y','1px');container.replaceChildren(canvas);
   const layer=document.createElement('div');layer.className='textLayer';container.append(layer);
   const lib=await pdfLibrary;textLayer=new lib.TextLayer({textContentSource:text,container:layer,viewport});await textLayer.render();if(current!==revision)return;
   let preceding='';for(const span of textLayer.textDivs){const text=span.textContent.trim();const number=sourceHeading(text,preceding);if(text)preceding=text;const e=entries.find(e=>e.n===number);if(!e)continue;span.classList.add('source-entry-link');span.dataset.entry=e.n;span.title=`Open companion: ${e.type} ${e.n}`;span.setAttribute('role','link');span.tabIndex=0;span.setAttribute('aria-label',`Open companion for ${e.type} ${e.n}`);span.onclick=()=>select(e);span.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();select(e)}}}
   $('.pdf-loading').hidden=true;$('#zoom-value').textContent=`${Math.round(drawingZoom*100)}%`;
   renderedZoom=drawingZoom;
   if(anchor){
    const bounds=container.getBoundingClientRect(), pane=source.getBoundingClientRect();
    source.scrollLeft+=bounds.left-pane.left+anchor.x*viewport.width-anchor.clientX;
    source.scrollTop+=bounds.top-pane.top+anchor.y*viewport.height-anchor.clientY;
   }else{
    source.scrollLeft=(left+right)/2*scale-source.clientWidth/2+padding;
    source.scrollTop=Math.max(0,top*scale-12);
   }
   updateSelection({scrollSource});if(initialNavigation){if(!pendingRestore)companion.scrollTop=0;initialNavigation=false}
   finishRestore();rememberPosition();
  }catch(error){if(current!==revision||error.name==='RenderingCancelledException'||error.name==='AbortException')return;$('.pdf-loading').hidden=true;$('.pdf-error').hidden=false;$('.pdf-error p').textContent='The notes could not load. You can still open the original PDF and read the companion.';finishRestore();console.error('PDF reader:',error)}
 }
 function setPage(n,{push=true}={}){
  if(!Number.isInteger(n)||n<1||n>Number($('#page-number').max||386)){ $('#page-number').value=pageNumber;return }
  const nextEntry=entries.find(e=>coversPage(e,n))||null;
  if(push){const url=new URL(location);if(nextEntry){url.hash=id(nextEntry.n);url.searchParams.delete('page')}else{url.hash='';url.searchParams.set('page',String(n))}pushURL(url)}
  pageNumber=n;$('#page-number').value=n;active=entries.find(e=>coversPage(e,n))||null;
  updateSelection();companion.scrollTop=0;drawPage();
  if(push)rememberPosition();
 }
 function applyView(){body.classList.toggle('split-view',split);body.classList.toggle('continuous-view',!split);$('#view-toggle').textContent=split?'Continuous':'Split reader';$('#toggle-nav').setAttribute('aria-expanded',String(!body.classList.contains('nav-hidden')));if(split)drawPage();else if(active)document.getElementById(id(active.n)).scrollIntoView()}
 $('#view-toggle').onclick=()=>{const url=new URL(location);if(!split)url.searchParams.delete('view');else url.searchParams.set('view','continuous');pushURL(url);split=!split;applyView();rememberPosition()};
 $('#toggle-nav').onclick=()=>{body.classList.toggle('nav-hidden');persist('probability-notebook-contents',body.classList.contains('nav-hidden')?'hidden':'shown');$('#toggle-nav').setAttribute('aria-expanded',String(!body.classList.contains('nav-hidden')));scheduleResize()};
 $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('Use your browser’s full-screen command to expand the reader.')}};
 document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';scheduleResize()});
 $('#entry-prev').onclick=()=>select(entries[entries.indexOf(active)-1],{scrollSource:true});$('#entry-next').onclick=()=>select(entries[entries.indexOf(active)+1],{scrollSource:true});
 $('#page-prev').onclick=()=>setPage(pageNumber-1);$('#page-next').onclick=()=>setPage(pageNumber+1);$('#page-number').onchange=()=>setPage(Number($('#page-number').value));$('#page-number').onblur=()=>{const n=Number($('#page-number').value);if(n!==pageNumber)setPage(n)};$('#page-number').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();setPage(Number($('#page-number').value))}};
 function rememberZoomPoint(clientX,clientY){
  const bounds=$('.pdf-page').getBoundingClientRect(),pane=source.getBoundingClientRect();
  if(!bounds.width)return;
  zoomAnchor={x:(clientX-bounds.left)/bounds.width,y:(clientY-bounds.top)/bounds.height,clientX:clientX-pane.left,clientY:clientY-pane.top};
 }
 function changeZoom(value,clientX,clientY,{defer=false}={}){
  if(!split)return;
  const next=Math.max(.5,Math.min(4,value));if(next===zoom)return;
  if(!zoomAnchor||zoom===renderedZoom)rememberZoomPoint(clientX,clientY);
  else{const pane=source.getBoundingClientRect();zoomAnchor.clientX=clientX-pane.left;zoomAnchor.clientY=clientY-pane.top}
  zoom=next;
  // Resize the current raster immediately, then replace it with a sharp render.
  const container=$('.pdf-page'),canvas=container.querySelector('canvas');
  if(canvas&&zoomAnchor){
   const factor=zoom/renderedZoom,width=parseFloat(canvas.style.width),height=parseFloat(canvas.style.height);
   container.style.width=`${width*factor}px`;container.style.height=`${height*factor}px`;
   canvas.style.transformOrigin='0 0';canvas.style.transform=`scale(${factor})`;
   const layer=container.querySelector('.textLayer');
   if(layer){layer.style.width=`${width}px`;layer.style.height=`${height}px`;layer.style.transform=`scale(${factor})`}
   const bounds=container.getBoundingClientRect(),pane=source.getBoundingClientRect();
   source.scrollLeft+=bounds.left-pane.left+zoomAnchor.x*width*factor-zoomAnchor.clientX;
   source.scrollTop+=bounds.top-pane.top+zoomAnchor.y*height*factor-zoomAnchor.clientY;
  }
  $('#zoom-value').textContent=`${Math.round(zoom*100)}%`;
  clearTimeout(zoomTimer);
  if(defer)zoomTimer=setTimeout(()=>drawPage({preservePosition:true}),50);
  else drawPage({preservePosition:true});
 }
 function buttonZoom(value){const pane=source.getBoundingClientRect();zoomAnchor=null;changeZoom(value,pane.left+pane.width/2,pane.top+pane.height/2)}
 $('#zoom-out').onclick=()=>buttonZoom(zoom-.25);$('#zoom-in').onclick=()=>buttonZoom(zoom+.25);
 $('#match-text').onclick=()=>{matchText=true;persist('probability-notebook-layout','matched');clearTimeout(zoomTimer);zoomAnchor=null;zoom=1;drawPage()};
 $('#zoom-fit').onclick=()=>{clearTimeout(zoomTimer);zoomAnchor=null;zoom=1;drawPage()};
 // Trackpads send pinch as control-wheel; ordinary two-finger scrolling stays native.
 source.addEventListener('wheel',event=>{
  if(!event.ctrlKey||!split)return;event.preventDefault();
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?source.clientHeight:1);
  changeZoom(zoom*Math.exp(-delta*.01),event.clientX,event.clientY,{defer:true});
 },{passive:false});
 // Safari exposes native trackpad pinch through gesture events instead.
 let gestureZoom=null,touchPinch=null;
 source.addEventListener('gesturestart',event=>{if(!split)return;event.preventDefault();zoomAnchor=null;gestureZoom=zoom},{passive:false});
 source.addEventListener('gesturechange',event=>{if(gestureZoom===null)return;event.preventDefault();changeZoom(gestureZoom*event.scale,event.clientX,event.clientY,{defer:true})},{passive:false});
 source.addEventListener('gestureend',event=>{if(gestureZoom===null)return;event.preventDefault();gestureZoom=null},{passive:false});
 const touchGeometry=touches=>({distance:Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY),x:(touches[0].clientX+touches[1].clientX)/2,y:(touches[0].clientY+touches[1].clientY)/2});
 source.addEventListener('touchstart',event=>{if(split&&event.touches.length===2){event.preventDefault();zoomAnchor=null;touchPinch={...touchGeometry(event.touches),zoom}}},{passive:false});
 source.addEventListener('touchmove',event=>{if(!touchPinch||event.touches.length!==2)return;event.preventDefault();if(gestureZoom!==null)return;const point=touchGeometry(event.touches);if(touchPinch.distance)changeZoom(touchPinch.zoom*point.distance/touchPinch.distance,point.x,point.y,{defer:true})},{passive:false});
 const endTouch=event=>{if(event.touches.length<2)touchPinch=null};
 source.addEventListener('touchend',endTouch);source.addEventListener('touchcancel',endTouch);
 document.querySelectorAll('[data-pane]').forEach(button=>button.onclick=()=>{setPane(button.dataset.pane);rememberPosition();if(button.dataset.pane==='source')scheduleResize()});
 document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const hash=link.getAttribute('href');const e=entries.find(e=>'#'+id(e.n)===hash)||sections.find(s=>'#'+s.anchor===hash)?.entries[0];if(!e)return;event.preventDefault();select(e,{scrollSource:true});if(matchMedia('(max-width:850px)').matches){body.classList.add('nav-hidden');$('#toggle-nav').setAttribute('aria-expanded','false')}});
 function fromURL(){
  if(lastURL===location.href&&historyIndex===history.state?.[historyKey]?.index)return;lastURL=location.href;clearTimeout(positionTimer);
  const p=history.state?.[historyKey];
  const e=entryForHash();const n=Number(new URLSearchParams(location.search).get('page'));
  if(p){
   restoring=true;pendingRestore={...p,readingRestored:false};historyIndex=p.index;historyEnd=Math.max(historyEnd,historyIndex);
   active=entries.find(e=>e.n===p.entry)||null;pageNumber=p.page;zoom=restoredZoom(p);split=p.split;
   setPane(p.pane);updateSelection();applyView();restoreReadingPosition();if(!split)finishRestore();
  }else{
   split=new URLSearchParams(location.search).get('view')!=='continuous';
   if(e)select(e,{push:false,scrollSource:true});else if(n)setPage(n,{push:false});else select(entries[0],{push:false});
   applyView();rememberPosition();
  }
  historyButtons();
 }
 window.addEventListener('popstate',fromURL);window.addEventListener('hashchange',fromURL);
 function setRatio(value){matchText=false;persist('probability-notebook-layout','manual');const pct=Math.max(30,Math.min(70,value));layout.style.setProperty('--split',`${pct}%`);$('.pane-divider').setAttribute('aria-valuenow',String(Math.round(pct)));persist('probability-notebook-split',pct);scheduleResize()}
 const divider=$('.pane-divider');divider.setAttribute('aria-valuenow',String(Math.round(Number.parseFloat(layout.style.getPropertyValue('--split')))));
 divider.addEventListener('pointerdown',event=>{divider.setPointerCapture(event.pointerId);body.classList.add('resizing');event.preventDefault()});
 divider.addEventListener('pointermove',event=>{if(!divider.hasPointerCapture(event.pointerId))return;const bounds=layout.getBoundingClientRect();setRatio((event.clientX-bounds.left)/bounds.width*100)});
 divider.addEventListener('pointerup',event=>{if(divider.hasPointerCapture(event.pointerId))divider.releasePointerCapture(event.pointerId);body.classList.remove('resizing');scheduleResize()});
 divider.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')$('#match-text').click();else setRatio(Number.parseFloat(layout.style.getPropertyValue('--split'))+(event.key==='ArrowLeft'?-3:3))}});
 function scheduleResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(split&&$('.source-pane').clientWidth){if(!restoring&&$('.pdf-page canvas')){pendingRestore=position();restoring=true}drawPage()}},180)}
 new ResizeObserver(scheduleResize).observe($('.source-pane'));
 setPane('companion');
 const initial=entryForHash();if(initial){active=initial;pageNumber=sourcePage(initial)}else if(params.has('page')){const n=Number(params.get('page'));if(Number.isInteger(n)&&n>=1&&n<=386){pageNumber=n;active=entries.find(e=>coversPage(e,n))||null}}
 const saved=history.state?.[historyKey];
 if(saved){restoring=true;pendingRestore={...saved,readingRestored:false};active=entries.find(e=>e.n===saved.entry)||null;pageNumber=saved.page;zoom=restoredZoom(saved);setPane(saved.pane);historyEnd=Math.max(historyEnd,saved.index)}
 updateSelection();applyView();restoreReadingPosition();if(!split)finishRestore();rememberPosition();historyButtons();
}
