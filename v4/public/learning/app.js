const $ = id => document.getElementById(id);
const color = {dembo:'#55cab9',note:'#81bcef',lecture:'#8c9fb3',assessed:'#edb76d'};
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortCourse = {stats310a:'STATS 310A / MATH 230A',math116:'MATH 116',math120:'MATH 120',physics330:'PHYSICS 330'};
const titleOf = n => n.label || n.id;
const site = {
  data:null, course:'stats310a', kind:'all', mode:'local', selected:null,
  visible:[],visibleEdges:[],positions:new Map(),screen:{width:0,height:0,dpr:1},
  pan:{x:0,y:0},scale:1,dragging:false,down:null,hover:null
};

function setStatus(message,isError=false){$('asof').textContent=message;$('asof').classList.toggle('error',isError)}
function assertPayload(obj){
  if(!obj||obj.schema_version!==1||!Array.isArray(obj.nodes)||!Array.isArray(obj.edges)||!obj.course_summaries)throw Error('Not a Learning Atlas export');
  if(!['public_curriculum_only','private_learning_evidence'].includes(obj.visibility))throw Error('Unexpected export visibility');
  const text=v=>typeof v==='string'&&v.length>0;
  if(!obj.nodes.length)throw Error('Export contains no nodes');
  if(obj.nodes.some(n=>!n||!text(n.id)||!text(n.kind)||!text(n.course)||typeof n.label!=='string'))throw Error('A node is missing its id, kind, course, or label');
  if(obj.edges.some(e=>!e||!text(e.source)||!text(e.target)||!text(e.kind)))throw Error('An edge is missing its source, target, or kind');
  const ids=new Set(obj.nodes.map(x=>x.id));
  if(ids.size!==obj.nodes.length)throw Error('Duplicate node identifiers');
  if(obj.edges.some(e=>!ids.has(e.source)||!ids.has(e.target)))throw Error('An edge points to a missing node');
  return obj;
}
function setData(payload){
  site.data=assertPayload(payload);
  const privateMode=payload.visibility==='private_learning_evidence';
  $('privacy-pill').textContent=privateMode?'Private data loaded locally':'Public curriculum';
  $('privacy-pill').classList.toggle('private',privateMode);
  const assessedOption=$('assessed-option');
  if(assessedOption)assessedOption.disabled=!payload.nodes.some(n=>n.kind==='assessed');
  if(site.kind==='assessed'&&assessedOption?.disabled){site.kind='all';$('node-type').value='all'}
  $('footer-status').textContent=privateMode?'Private export stays in this browser tab; it is not uploaded or saved.':'Public mode contains no grades or assessment records.';
  setStatus('Source snapshot · '+payload.as_of+' · '+(privateMode?'private evidence mode':'public curriculum mode'));
  site.selected=payload.nodes.some(n=>n.id==='dembo:2.2.1')?'dembo:2.2.1':payload.nodes[0]?.id;
  refresh(true);
}

function nodeMap(){return new Map(site.data?.nodes.map(n=>[n.id,n])||[])}
function adjacency(){
  const a=new Map();
  for(const edge of site.data.edges){
    if(!a.has(edge.source))a.set(edge.source,new Set());
    if(!a.has(edge.target))a.set(edge.target,new Set());
    a.get(edge.source).add(edge.target);a.get(edge.target).add(edge.source);
  }
  return a;
}
function availableNodes(){
  if(!site.data)return [];
  const nodes=site.data.nodes.filter(n=>(site.course==='all'||n.course===site.course)&&(site.kind==='all'||n.kind===site.kind));
  if(site.mode==='global')return nodes;
  const byId=new Map(nodes.map(n=>[n.id,n]));
  if(!byId.has(site.selected))return nodes.slice(0,Math.min(nodes.length,25));
  const adj=adjacency();
  const ids=new Set([site.selected]);
  for(const item of adj.get(site.selected)||[])if(byId.has(item))ids.add(item);
  return [...ids].map(id=>byId.get(id)).filter(Boolean);
}

function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function relayout(){
  const nodes=availableNodes(),byId=new Set(nodes.map(n=>n.id));
  site.visible=nodes;
  site.visibleEdges=site.data.edges.filter(e=>byId.has(e.source)&&byId.has(e.target));
  site.positions=new Map();
  if(site.mode==='local'&&nodes.some(n=>n.id===site.selected)){
    site.positions.set(site.selected,{x:0,y:0});
    const around=nodes.filter(n=>n.id!==site.selected);
    around.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
    const count=around.length;
    around.forEach((n,i)=>{
      const angle=(i/count)*Math.PI*2-Math.PI/2;
      const ring=count>20?(i%3):0;
      const radius=145+ring*70;
      site.positions.set(n.id,{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});
    });
  }else{
    const courses=site.course==='all'?Object.keys(shortCourse):[site.course];
    const centerOf=(course)=>{
      if(courses.length===1)return {x:0,y:0};
      const index=courses.indexOf(course);return {x:(index%2===0?-1:1)*380,y:(index<2?-1:1)*300};
    };
    const kinds=['lecture','note','dembo','assessed'];
    const groups=new Map();
    for(const n of nodes){const k=n.course+':'+n.kind;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(n)}
    for(const [key,items] of groups){
      const [course,kind]=key.split(':'),center=centerOf(course),idx=kinds.indexOf(kind);
      const cx=center.x+[-200,-75,95,220][idx];
      const ys=items.sort((a,b)=>(a.lecture||0)-(b.lecture||0)||a.id.localeCompare(b.id));
      ys.forEach((node,i)=>{
        const j=(hash(node.id)%1000)/1000-.5;
        site.positions.set(node.id,{x:cx+j*65,y:center.y+(i-(ys.length-1)/2)*Math.max(10,Math.min(39,690/Math.max(ys.length,1)))+j*20});
      });
    }
  }
  fitView();
}

function fitView(){
  const pts=[...site.positions.values()];if(!pts.length)return;
  const padX=site.mode==='local'?95:30;// leave room for node labels drawn beside local-view nodes
  const minX=Math.min(...pts.map(p=>p.x))-padX,maxX=Math.max(...pts.map(p=>p.x))+padX;
  const minY=Math.min(...pts.map(p=>p.y))-30,maxY=Math.max(...pts.map(p=>p.y))+30;
  const box=$('graph').getBoundingClientRect();
  site.scale=Math.min(2.0,Math.max(.18,Math.min((box.width-100)/(maxX-minX||1),(box.height-140)/(maxY-minY||1))));
  site.pan={x:box.width/2-(minX+maxX)/2*site.scale,y:box.height/2-(minY+maxY)/2*site.scale};
  draw();
}
function toScreen(pos){return{x:pos.x*site.scale+site.pan.x,y:pos.y*site.scale+site.pan.y}}
function radius(n){return n.id===site.selected?11:n.kind==='lecture'?7:n.kind==='dembo'?7.7:5.6}
function draw(){
  const canvas=$('graph'),ctx=canvas.getContext('2d');if(!ctx)return;
  const {width,height,dpr}=site.screen;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
  if(!site.visible.length){ctx.fillStyle='#9ab5c8';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('No matching concepts in this view',width/2,height/2);return}
  const positions=site.positions;
  for(const edge of site.visibleEdges){
    const a=positions.get(edge.source),b=positions.get(edge.target);if(!a||!b)continue;
    const x=toScreen(a),y=toScreen(b);
    ctx.beginPath();ctx.moveTo(x.x,x.y);ctx.lineTo(y.x,y.y);
    ctx.strokeStyle=edge.kind==='proposed_supports'?'#70bfbf90':'#6f89a452';
    ctx.lineWidth=edge.kind==='proposed_supports'?1.3:.8;ctx.stroke();
  }
  for(const node of site.visible){
    const p=toScreen(positions.get(node.id)),active=node.id===site.selected,hover=node.id===site.hover;
    const r=radius(node)*(active?1.4:1);
    if(active||hover){ctx.beginPath();ctx.arc(p.x,p.y,r+6,0,Math.PI*2);ctx.fillStyle=active?'#ffffff1c':'#ffffff12';ctx.fill()}
    ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=color[node.kind]||'#8c9fb3';ctx.fill();
    ctx.strokeStyle=active?'#ecfcff':'#101b2b';ctx.lineWidth=active?2.7:1.4;ctx.stroke();
    if(active||hover||site.mode==='local'&&site.visible.length<=17||node.kind==='lecture'&&site.mode==='global'&&site.scale>.75){
      const label=titleOf(node).replace(/^Lecture \d+: /,'');
      const short=label.length>35?label.slice(0,32)+'…':label;
      ctx.font=(active?'600 ':'')+'11px ui-sans-serif,system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle=active?'#f6fdff':'#c1d5e2';
      ctx.fillText(short,p.x,p.y+r+16,230);
    }
  }
}
function resize(){
  const canvas=$('graph'),rect=canvas.getBoundingClientRect();
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
  site.screen={width:rect.width,height:rect.height,dpr};fitView();
}
function nearest(x,y){
  let found=null,distance=Infinity;
  for(const node of site.visible){const pos=site.positions.get(node.id),p=toScreen(pos);const d=Math.hypot(p.x-x,p.y-y);if(d<Math.max(13,radius(node)*site.scale+7)&&d<distance){found=node;distance=d}}
  return found;
}

function refresh(resetLayout=false){
  updateSummary();updateQueue();updateSearch();updateDetails();
  if(resetLayout)relayout();else draw();
}
function select(id){
  if(!site.data.nodes.some(n=>n.id===id))return;
  const n=site.data.nodes.find(n=>n.id===id);
  if(site.course!=='all'&&n.course!==site.course){site.course=n.course;$('course').value=n.course}
  if(site.kind!=='all'&&n.kind!==site.kind){site.kind='all';$('node-type').value='all'}
  site.selected=id;refresh(true);
}
function updateSearch(){
  const term=$('search').value.trim().toLocaleLowerCase();
  if(!term||!site.data){$('search-results').innerHTML='';return}
  const found=site.data.nodes.filter(n=>(site.course==='all'||n.course===site.course)&&titleOf(n).toLocaleLowerCase().includes(term)).slice(0,7);
  $('search-results').innerHTML=found.length?found.map(n=>`<button class="search-hit" role="option" data-id="${esc(n.id)}">${esc(titleOf(n))}</button>`).join(''):'<div class="fineprint">No matching concepts</div>';
  $('search-results').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{select(b.dataset.id);$('search').value='';updateSearch()}));
}
function updateSummary(){
  const root=$('summary');if(!site.data)return;
  const summaries=site.data.course_summaries;
  const courses=site.course==='all'?Object.keys(shortCourse):[site.course];
  const h=courses.map(course=>{
    const item=summaries[course];if(!item)return'';
    const scheduled=item.syllabus_blocks;
    return `<div><div class="panel-title">${esc(shortCourse[course])}</div>`+
      `<div class="metric"><span>Lecture blocks indexed</span><strong>${item.lecture_blocks}</strong></div>`+
      `<div class="metric"><span>Note headings</span><strong>${item.lecture_headings}</strong></div>`+
      (scheduled?`<div class="metric"><span>Syllabus blocks scheduled past</span><strong>${item.scheduled_past_blocks}/${scheduled}</strong></div><div class="bar"><span style="width:${Math.round(100*item.scheduled_past_blocks/scheduled)}%"></span></div><p class="fineprint">Scheduled dates only; teaching may differ from the published syllabus.</p>`:'<p class="fineprint">Verified course dates not yet indexed.</p>')+
      (item.assessed_topic_records!==undefined?`<div class="metric"><span>Assessed-skill records</span><strong>${item.assessed_topic_records}</strong></div><div class="metric"><span>Independently confirmed skill records</span><strong>${item.independently_confirmed_topic_records}</strong></div>`:'')+
      `<p class="fineprint">Independent mastery of the whole curriculum: unknown.</p></div>`;
  }).join('<div class="summary-break"></div>');
  root.innerHTML=h;
}
function updateQueue(){
  const panel=$('study-queue');if(!site.data)return;
  const q=site.data.diagnostic_queue;
  if(!q){panel.innerHTML='<h3 class="panel-title">Learning diagnostics</h3><p class="fineprint">Private assessments are deliberately absent. Export your private data from the ledger, then load that JSON in this tab to see evidence-based probes.</p>';return}
  const chosen=q.filter(n=>site.course==='all'||n.course===site.course).slice(0,5);
  panel.innerHTML='<h3 class="panel-title">Candidate diagnostics</h3><p class="fineprint">A practice queue, not a grade prediction. These tests can reveal knowledge boundaries.</p>'+chosen.map(item=>`<button class="queue-item" data-id="${esc(item.node_id)}">${esc(item.label)}<small>${item.retention_untested?'Retention untested':'Check retention'} · ${esc(shortCourse[item.course])}</small></button>`).join('');
  panel.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>select(b.dataset.id)));
}
function safeReaderUrl(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='josephrbailey.com'&&u.pathname.startsWith('/probability/')?u.href:null}catch{return null}}
function updateDetails(){
  const el=$('node-details');if(!site.data)return;
  const node=nodeMap().get(site.selected);
  if(!node){el.innerHTML='<p class="muted">Choose a concept to inspect it.</p>';return}
  const displayKind={dembo:'Dembo subsection',note:'Lecture note',lecture:'Lecture block',assessed:'Assessed skill'}[node.kind]||node.kind;
  const link=safeReaderUrl(node.reader_url);
  let html=`<div class="node-kind">${esc(displayKind)} · ${esc(shortCourse[node.course])}</div><h2>${esc(titleOf(node))}</h2><p class="detail-id">${esc(node.id)}</p>`;
  if(node.section)html+=`<div class="detail-metric"><span>Dembo section</span><strong>${esc(node.section)}</strong></div>`;
  if(node.lecture)html+=`<div class="detail-metric"><span>Lecture block</span><strong>${esc(node.lecture)}</strong></div>`;
  if(node.schedule_status)html+=`<div class="detail-metric"><span>Scheduled status</span><strong>${esc(node.schedule_status.replaceAll('_',' '))}</strong></div>`;
  if(node.scheduled_introduction)html+=`<div class="detail-metric"><span>First scheduled</span><strong>${esc(node.scheduled_introduction)}</strong></div>`;
  if(node.kind==='assessed'){
    const values=Object.entries(node.scores||{}).map(([k,v])=>`<div class="detail-metric"><span>${esc(k)}</span><strong>${v===null||v===undefined?'Untested':esc(v+'/4'+(node.assessment_status==='independently_confirmed'?'':' (provisional)'))}</strong></div>`).join('');
    html+=`<div class="detail-metric"><span>Evidence status</span><strong>${esc(node.assessment_status?.replaceAll('_',' ')||'Unknown')}</strong></div>${values}`;
    if(node.next_probe)html+=`<div class="detail-note"><strong>Independent next probe</strong><p>${esc(node.next_probe)}</p></div><button class="action-button" id="copy-probe">Copy diagnostic prompt</button>`;
    if(node.evidence_refs?.length)html+=`<p class="fineprint">Evidence records: ${node.evidence_refs.length}. See the private repo for context.</p>`;
  }else html+='<div class="detail-note">Curriculum presence is not a mastery assessment. Use an unfamiliar independent problem to establish what you know.</div>';
  if(link)html+=`<div class="detail-sources"><span class="eyebrow">Read and explore</span><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open probability companion ↗</a></div>`;
  const nodes=nodeMap(),neighbours=[...(adjacency().get(node.id)||[])].map(id=>nodes.get(id)).filter(Boolean)
    .sort((a,b)=>a.kind.localeCompare(b.kind)||titleOf(a).localeCompare(titleOf(b)));
  if(neighbours.length){
    const kindName={dembo:'Dembo',note:'Note',lecture:'Lecture',assessed:'Assessed skill'};
    html+=`<div class="connected"><span class="eyebrow">Connected concepts (${neighbours.length})</span>`+neighbours.slice(0,14).map(n=>`<button type="button" class="connected-item" data-id="${esc(n.id)}"><span>${esc(titleOf(n))}</span><small>${esc(kindName[n.kind]||n.kind)}${n.course!==node.course?' · '+esc(shortCourse[n.course]||n.course):''}</small></button>`).join('')+(neighbours.length>14?`<p class="fineprint">${neighbours.length-14} more shown in the graph.</p>`:'')+'</div>';
  }
  el.innerHTML=html;
  el.querySelectorAll('.connected-item').forEach(b=>b.addEventListener('click',()=>select(b.dataset.id)));
  const copy=$('copy-probe');if(copy)copy.addEventListener('click',()=>copyPrompt(node));
}
async function copyPrompt(node){
  const prompt=`I am studying ${shortCourse[node.course]}. Use the private ledger at https://github.com/josephbaileyy/academic-learning-ledger, AGENTS.md, protocols/tutoring.md, and the relevant evidence. Test me independently on: ${node.label}. Proposed diagnostic: ${node.next_probe}. Give no hints until I attempt it. Track independent reasoning separately from your hints; never infer mastery from an assisted solution.`;
  try{await navigator.clipboard.writeText(prompt);const b=$('copy-probe');if(b)b.textContent='Copied prompt ✓';}catch{window.prompt('Copy this diagnostic prompt:',prompt)}
}

function bind(){
  $('course').addEventListener('change',e=>{site.course=e.target.value;site.selected=site.data?.nodes.find(n=>n.course===site.course)?.id||site.data?.nodes[0]?.id;refresh(true)});
  $('node-type').addEventListener('change',e=>{site.kind=e.target.value;refresh(true)});
  $('search').addEventListener('input',updateSearch);
  $('view-local').addEventListener('click',()=>viewMode('local'));
  $('view-global').addEventListener('click',()=>viewMode('global'));
  $('zoom-in').addEventListener('click',()=>{site.scale=Math.min(3.5,site.scale*1.22);draw()});
  $('zoom-out').addEventListener('click',()=>{site.scale=Math.max(.1,site.scale/1.22);draw()});
  $('reset-view').addEventListener('click',fitView);
  const canvas=$('graph'),pointers=new Map();
  let pinch=null;
  const pinchState=()=>{const [a,b]=[...pointers.values()];return{d:Math.hypot(a.x-b.x,a.y-b.y)||1,x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
  canvas.addEventListener('pointerdown',e=>{
    canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    if(pointers.size===2){pinch={...pinchState(),scale:site.scale,pan:{...site.pan}};site.down=null;site.dragging=true;return}
    site.dragging=false;site.down={x:e.offsetX,y:e.offsetY,panX:site.pan.x,panY:site.pan.y};
  });
  const release=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;};
  canvas.addEventListener('pointermove',e=>{
    if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    if(pinch&&pointers.size===2){
      const now=pinchState(),scale=Math.max(.1,Math.min(3.5,pinch.scale*now.d/pinch.d));
      site.pan={x:now.x-(pinch.x-pinch.pan.x)*scale/pinch.scale,y:now.y-(pinch.y-pinch.pan.y)*scale/pinch.scale};site.scale=scale;draw();return;
    }
    if(site.down){const dx=e.offsetX-site.down.x,dy=e.offsetY-site.down.y;if(Math.hypot(dx,dy)>4)site.dragging=true;if(site.dragging){site.pan={x:site.down.panX+dx,y:site.down.panY+dy};canvas.classList.add('is-dragging');draw()}}
    else{const item=nearest(e.offsetX,e.offsetY);const next=item?.id||null;if(next!==site.hover){site.hover=next;canvas.style.cursor=next?'pointer':'grab';draw()}}
  });
  canvas.addEventListener('pointerup',e=>{const wasPinch=pinch!==null||pointers.size>1;release(e);if(!wasPinch&&site.down&&!site.dragging){const item=nearest(e.offsetX,e.offsetY);if(item)select(item.id)}if(!pointers.size){site.down=null;site.dragging=false;canvas.classList.remove('is-dragging')}});
  canvas.addEventListener('pointercancel',e=>{release(e);site.down=null;site.dragging=false;canvas.classList.remove('is-dragging')});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const old=site.scale,now=Math.max(.1,Math.min(3.5,old*(e.deltaY<0?1.09:.91)));site.pan.x=x-(x-site.pan.x)*now/old;site.pan.y=y-(y-site.pan.y)*now/old;site.scale=now;draw()},{passive:false});
  $('private-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{const payload=JSON.parse(await file.text());setData(payload)}catch(error){setStatus('Could not load private file: '+error.message,true)}
    e.target.value='';
  });
  new ResizeObserver(resize).observe(canvas);
}
function viewMode(mode){site.mode=mode;for(const option of ['local','global']){const b=$('view-'+option);b.classList.toggle('is-active',option===mode);b.setAttribute('aria-pressed',String(option===mode))}refresh(true)}
bind();
try{
  const response=await fetch('./data/atlas.public.json',{cache:'no-store'});
  if(!response.ok)throw Error('Public curriculum snapshot unavailable');
  setData(await response.json());
}catch(error){setStatus(error.message+' · Load an exported JSON to begin',true)}
