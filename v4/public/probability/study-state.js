// A small transparent review schedule, independent of personal notebook annotations.
export const STUDY_KEY='probability-notebook-study-v1';
export const DAY=24*60*60*1000;
const defaults=()=>({version:1,reviews:{},settings:{section:'',mode:'due',size:10}});
export function parseStudyState(raw,cards){
 const state=defaults();let value;
 try{value=JSON.parse(raw)}catch{return state}
 if(!value||value.version!==1)return state;
 const ids=new Set(cards.map(c=>c.id));
 for(const [id,v] of Object.entries(value.reviews||{})){
  if(!ids.has(id)||!v||!Number.isFinite(v.due)||v.due<0||v.due>8.64e15||!Number.isFinite(v.reviewedAt)||v.reviewedAt<0||v.reviewedAt>8.64e15||!Number.isInteger(v.streak)||v.streak<0||v.streak>1000||!Number.isFinite(v.intervalDays)||v.intervalDays<0||v.intervalDays>30)continue;
  state.reviews[id]={due:v.due,reviewedAt:v.reviewedAt,streak:v.streak,intervalDays:v.intervalDays};
 }
 const s=value.settings;
 if(s&&typeof s==='object'){
  if(typeof s.section==='string'&&(s.section===''||cards.some(c=>c.subsection===s.section||c.subsection.startsWith(s.section+'.'))))state.settings.section=s.section;
  if(['due','all'].includes(s.mode))state.settings.mode=s.mode;
  if([5,10,20,1000].includes(s.size))state.settings.size=s.size;
 }
 return state;
}
export function scheduleReview(previous,rating,now=Date.now()){
 if(!['missed','partial','got'].includes(rating))throw Error('Unknown study rating');
 const streak=rating==='got'?Math.min(1000,(previous?.streak||0)+1):0;
 const intervalDays=rating==='missed'?0:rating==='partial'?1:Math.min(30,previous?.streak?Math.max(1,previous.intervalDays)*2:1);
 return {reviewedAt:now,due:now+(rating==='missed'?10*60*1000:intervalDays*DAY),streak,intervalDays};
}
export function cardsInSection(cards,section=''){
 return cards.filter(c=>!section||c.subsection===section||c.subsection.startsWith(section+'.'));
}
export function reviewCounts(cards,reviews,now=Date.now()){
 const learned=cards.filter(c=>reviews[c.id]);
 return {due:learned.filter(c=>reviews[c.id].due<=now).length,new:cards.length-learned.length,nextDue:Math.min(...learned.filter(c=>reviews[c.id].due>now).map(c=>reviews[c.id].due))};
}
export function selectStudyCards(cards,reviews,{section='',mode='due',size=10}={},now=Date.now(),random=Math.random){
 const eligible=cardsInSection(cards,section).filter(c=>mode==='all'||!reviews[c.id]||reviews[c.id].due<=now);
 // Shuffle ties so new sessions mix topics; overdue cards still come before unseen ones.
 const shuffled=[...eligible];
 for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 if(mode==='due')shuffled.sort((a,b)=>(reviews[a.id]?.due??Infinity)-(reviews[b.id]?.due??Infinity));
 return shuffled.slice(0,size);
}
export class StudySession{
 constructor(cards){this.queue=[...cards];this.attempts={};this.lastRatings={};this.answered=0;this.initialCount=cards.length;}
 get current(){return this.queue[0]}
 rate(rating){
  if(!this.current||!['missed','partial','got'].includes(rating))return false;
  const card=this.queue.shift();this.answered++;this.lastRatings[card.id]=rating;
  const attempts=this.attempts[card.id]=(this.attempts[card.id]||0)+1;
  // At most two retries. Space a retry behind two other prompts whenever available.
  if(rating!=='got'&&attempts<3)this.queue.splice(Math.min(2,this.queue.length),0,card);
  return true;
 }
}
