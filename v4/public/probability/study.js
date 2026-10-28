import {STUDY_KEY,parseStudyState,scheduleReview,cardsInSection,reviewCounts,selectStudyCards,StudySession} from './study-state.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const anchor=n=>'#entry-'+n.replaceAll('.','-');
const visible=element=>element&&element.getClientRects().length>0&&!element.closest('details:not([open])');
const defaultGroups=['1.1','1.2','1.3','1.4','2.1','2.2','2.3'].map((n,i)=>({n,title:['Probability spaces & measures','Random variables & laws','Integration & convergence','Independence & products','Weak laws','Event limits & Borel–Cantelli','Strong laws & random series'][i]}));
export function initStudy({cards,sections,renderRich,storageKey=STUDY_KEY,groups=defaultGroups,sectionGroupLabel='Specific subsection',sectionLabel='Section',sourceDisclosureLabel='Full course statement',allSectionsLabel='All covered sections',intro='Try recalling a definition before revealing it. Check the assumptions, then decide when to review it again.'}){
 const dialog=document.querySelector('#study-dialog'),body=dialog.querySelector('.study-body'),status=dialog.querySelector('[role=status]');
 const triggers=[...document.querySelectorAll('[data-open-study]')];let trigger=triggers[0],session=null,revealed=false,ended=false;
 let state=parseStudyState(null,cards),storageOK=true;
 try{state=parseStudyState(localStorage.getItem(storageKey),cards)}catch{storageOK=false}
 function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));storageOK=true}catch{storageOK=false}storageStatus();}
 function storageStatus(){status.textContent=storageOK?'':'Review progress could not be saved. You can keep studying for this visit.';}
 function focus(selector){body.querySelector(selector)?.focus();dialog.scrollTop=0;}
 function rich(selector,text){renderRich(body.querySelector(selector),text);}
 function date(timestamp){return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(timestamp);}
 function setup(){
  session=null;ended=false;revealed=false;
  body.innerHTML=`<p class="study-intro">${esc(intro)}</p>
   <form class="study-setup"><label for="study-section">${esc(sectionLabel)}</label><select id="study-section"><option value="">${esc(allSectionsLabel)}</option>
   ${groups.map(({n,title})=>`<option value="${esc(n)}">${esc(n)} · ${esc(title)}</option>`).join('')}
   <optgroup label="${esc(sectionGroupLabel)}">${sections.filter(s=>cardsInSection(cards,s.n).length).map(s=>`<option value="${s.n}">${s.n.startsWith('lecture.')?'':s.n+' · '}${esc(s.title)}</option>`).join('')}</optgroup></select>
   <div class="study-options"><div><label for="study-mode">Review</label><select id="study-mode"><option value="due">Due & new cards</option><option value="all">Practice all cards</option></select></div>
   <div><label for="study-size">Session size</label><select id="study-size"><option value="5">5 cards</option><option value="10">10 cards</option><option value="20">20 cards</option><option value="1000">All available cards</option></select></div></div>
   <p class="study-counts" aria-live="polite"></p><button class="study-primary" type="submit">Start studying</button></form>
   <details class="study-how"><summary>How reviews work</summary><p>Missed and partial answers return after other questions when possible, up to twice in a session. Missed cards are due again in 10 minutes; partial answers tomorrow. Got it starts at 1 day, then doubles up to 30 days after consecutive successful reviews.</p><p>Practice all includes cards scheduled for later and updates their review dates too. Ratings are your own assessment; answers are not automatically graded.</p></details>
   <p class="study-local">Review dates save in this browser and do not sync. Written attempts last only for this visit.</p>`;
  const section=body.querySelector('#study-section'),mode=body.querySelector('#study-mode'),size=body.querySelector('#study-size');
  section.value=state.settings.section;mode.value=state.settings.mode;size.value=String(state.settings.size);
  function update(){state.settings={section:section.value,mode:mode.value,size:Number(size.value)};const selected=cardsInSection(cards,section.value),counts=reviewCounts(selected,state.reviews);
   const available=mode.value==='all'?selected.length:counts.due+counts.new;
   body.querySelector('.study-counts').textContent=available?`${counts.due} due · ${counts.new} new · ${selected.length} ${selected.length===1?'card':'cards'} in these sections`:`You're caught up.${Number.isFinite(counts.nextDue)?` Next review: ${date(counts.nextDue)}.`:''} Choose Practice all to review now.`;
   body.querySelector('[type=submit]').disabled=!available;
  }
  body.querySelector('form').addEventListener('change',()=>{update();save()});
  body.querySelector('form').addEventListener('submit',event=>{event.preventDefault();update();save();const chosen=selectStudyCards(cards,state.reviews,state.settings);if(!chosen.length)return;session=new StudySession(chosen);showCard();});update();storageStatus();
 }
 function showCard(){
  if(!session.current){summary();return}
  revealed=false;const card=session.current;
  body.innerHTML=`<div class="study-progress"><span>${session.answered} answered · ${session.queue.length} left</span><button type="button" data-study-end>End session</button></div>
   <div class="study-question" data-study-card="${esc(card.id)}"><p class="study-kind">${card.kind==='proof'?'Reconstruct the argument':card.kind==='comparison'?'Compare & apply':'Recall a definition'}</p><h3 tabindex="-1">${esc(card.name)}</h3><p class="study-prompt"></p></div>
   <label for="study-attempt">Your attempt <span>(optional)</span></label><textarea id="study-attempt" placeholder="Recall it aloud or on paper, or write it here." rows="3"></textarea>
   <button type="button" class="study-primary" data-study-reveal aria-expanded="false" aria-controls="study-answer">Reveal answer</button>
   <section id="study-answer" hidden><h4 tabindex="-1">Compare with your answer</h4><div class="study-definition"></div><div class="study-check"><h4>Check these points</h4><ul></ul></div>
   <details class="study-source"><summary>${esc(sourceDisclosureLabel)}</summary><div class="study-source-statement"></div><div class="study-source-remark"></div></details>
   <p class="study-entry-links"><a href="${esc(card.readHref||anchor(card.entry))}" data-study-explanation>${esc(card.readLabel||'Open explanation & visualization →')}</a><span>${esc(card.sourceLabel||`${card.sourceType} ${card.entry} · p. ${card.page}`)}</span></p>
   ${card.companionHref?`<p><a href="${esc(card.companionHref)}" data-study-explanation>${esc(card.companionLabel)}</a></p>`:''}<div class="study-related"></div><fieldset class="study-rating"><legend>How well did you recall it?</legend><button type="button" data-study-rate="missed">Missed</button><button type="button" data-study-rate="partial">Partial</button><button type="button" data-study-rate="got">Got it</button></fieldset></section>`;
  rich('.study-prompt',card.prompt);
  body.querySelector('[data-study-end]').addEventListener('click',()=>{ended=true;summary()});
  body.querySelector('[data-study-reveal]').addEventListener('click',()=>{
   if(revealed)return;revealed=true;
   rich('.study-definition',card.answer);
   body.querySelector('.study-check ul').innerHTML=card.checks.map(check=>`<li>${esc(check)}</li>`).join('');
   rich('.study-source-statement',card.sourceStatement);rich('.study-source-remark',card.sourceRemark);
   body.querySelector('.study-source').hidden=card.answer===card.sourceStatement&&!card.sourceRemark;
   body.querySelector('.study-related').innerHTML=card.related?.length?`<p>Related definitions: ${card.related.map(n=>`<a href="${anchor(n)}" data-study-explanation>${n}</a>`).join(' · ')}</p>`:'';
   body.querySelector('#study-answer').hidden=false;
   body.querySelector('[data-study-reveal]').setAttribute('aria-expanded','true');body.querySelector('[data-study-reveal]').hidden=true;
   body.querySelector('#study-answer h4').focus();
  });
  for(const button of body.querySelectorAll('[data-study-rate]'))button.addEventListener('click',()=>{
   if(!revealed||session.current!==card)return;
   state.reviews[card.id]=scheduleReview(state.reviews[card.id],button.dataset.studyRate);save();session.rate(button.dataset.studyRate);showCard();
  });
  focus('.study-question h3');
 }
 function summary(){
  const ratings=Object.values(session.lastRatings),needs=ratings.filter(v=>v!=='got').length;
  body.innerHTML=`<div class="study-summary"><h3 tabindex="-1">${ended?'Session ended':'Session complete'}</h3><p>${ratings.length} ${ratings.length===1?'card reviewed':'cards reviewed'} · ${session.answered} recall ${session.answered===1?'attempt':'attempts'}</p><p>${needs?`${needs} ${needs===1?'card needs':'cards need'} more practice. They will return in your scheduled reviews.`:ratings.length?'You marked every reviewed card Got it. Come back for the next spaced review.':'No ratings saved yet.'}</p><button type="button" class="study-primary" data-study-another>Choose another session</button><button type="button" data-study-return>Return to reading</button></div>`;
  body.querySelector('[data-study-another]').addEventListener('click',()=>{setup();focus('#study-section')});body.querySelector('[data-study-return]').addEventListener('click',()=>dialog.close());focus('h3');
 }
 function open(event){const wanted=event?.currentTarget?.dataset.studySection;if(wanted&&session?.current?.subsection!==wanted)session=null;trigger=event?.currentTarget||triggers.find(visible)||triggers[0];if(!session){const requested=event?.currentTarget?.dataset.studySection;if(requested&&cardsInSection(cards,requested).length)state.settings.section=requested;setup();}const menu=document.querySelector('#appearance-menu');if(menu)menu.open=false;dialog.showModal();if(!session)focus('#study-section');storageStatus();}
 for(const t of triggers)t.addEventListener('click',open);
 dialog.querySelector('[data-close-study]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dialog.close()}});
 dialog.addEventListener('close',()=>{const url=new URL(location);if(url.searchParams.has('study')){url.searchParams.delete('study');history.replaceState(history.state,'',url)}(visible(trigger)?trigger:triggers.find(visible)||document.querySelector('#appearance-menu>summary')).focus();});
 dialog.addEventListener('click',event=>{if(event.target.closest('a[data-study-explanation]'))dialog.close()});
 if(new URLSearchParams(location.search).get('study')==='1')open();
}
