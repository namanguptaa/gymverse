/*
 * GymVerse | sync.js
 * Talks to the GymVerse server. Changes are saved on this device first (outbox),
 * then sent to the server, so nothing is lost if the connection drops.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
const OUTBOX_KEY='gymverse-outbox';
let outbox=[];
try{outbox=JSON.parse(localStorage.getItem(OUTBOX_KEY)||'[]')||[]}catch(e){outbox=[]}
let lastSeq=0, flushing=false, pollTimer=null;

async function api(path,opts={}){
  const init={method:opts.method||'GET',credentials:'same-origin',headers:{}};
  if(opts.body!==undefined){init.headers['Content-Type']='application/json';init.body=JSON.stringify(opts.body)}
  let r;
  try{r=await fetch(path,init)}catch(e){const err=new Error('offline');err.status=0;throw err}
  let data=null; try{data=await r.json()}catch(e){}
  if(!r.ok){const err=new Error((data&&data.error)||('Request failed ('+r.status+')'));err.status=r.status;throw err}
  return data;
}
function persistOutbox(){try{localStorage.setItem(OUTBOX_KEY,JSON.stringify(outbox))}catch(e){}}
function setOnline(v){if(online!==v){online=v;scheduleRender()}}
function signedOut(){authState='out';ready=false;stopPolling();render()}
function queueOp(op){
  // keep only the newest pending change per record
  outbox=outbox.filter(o=>!(o.c===op.c&&o.id===op.id));
  outbox.push(op); persistOutbox(); flush();
}
async function flush(){
  if(flushing||!outbox.length||authState!=='in') return;
  flushing=true;
  try{
    while(outbox.length){
      const op=outbox[0], url='/api/docs/'+op.c+'/'+encodeURIComponent(op.id);
      try{
        if(op.t==='put') await api(url,{method:'PUT',body:op.d}); else await api(url,{method:'DELETE'});
      }catch(e){
        if(e.status===401){signedOut();return}
        if(e.status>=400&&e.status<500){console.error(e);toast('A change was rejected by the server: '+e.message)}
        else {setOnline(false);return}
      }
      const i=outbox.indexOf(op); if(i>=0) outbox.splice(i,1);
      persistOutbox();
    }
    setOnline(true);
  }finally{flushing=false}
}
function save(c,id,d){S[c]={...S[c],[id]:d};queueOp({t:'put',c,id,d})}
function remove(c,id){if(!S[c][id])return;const n={...S[c]};delete n[id];S[c]=n;queueOp({t:'del',c,id})}
function applyOutbox(){
  outbox.forEach(o=>{if(!S[o.c])return;if(o.t==='put')S[o.c]={...S[o.c],[o.id]:o.d};else{const n={...S[o.c]};delete n[o.id];S[o.c]=n}});
}
async function loadAll(){
  ready=false; loadErr=false; render();
  try{
    const r=await api('/api/data');
    COLS.forEach(c=>{S[c]=(r.data&&r.data[c])||{}});
    applyOutbox(); lastSeq=r.seq||0; ready=true; setOnline(true);
    render(); flush(); startPolling(); setTimeout(sweep,1500);
  }catch(e){ if(e.status===401) return signedOut(); loadErr=true; render(); setTimeout(loadAll,5000) }
}
async function pull(){
  if(authState!=='in'||!ready) return;
  try{
    const r=await api('/api/changes?since='+lastSeq);
    const pending=new Set(outbox.map(o=>o.c+'/'+o.id)); let changed=false;
    (r.upserts||[]).forEach(x=>{if(!S[x.c]||pending.has(x.c+'/'+x.id))return;S[x.c]={...S[x.c],[x.id]:x.d};changed=true});
    (r.deletes||[]).forEach(x=>{if(!S[x.c]||!S[x.c][x.id]||pending.has(x.c+'/'+x.id))return;const n={...S[x.c]};delete n[x.id];S[x.c]=n;changed=true});
    lastSeq=r.seq; setOnline(true); flush();
    if(changed) scheduleRender();
  }catch(e){ if(e.status===401) return signedOut(); setOnline(false) }
}
function startPolling(){stopPolling();pollTimer=setInterval(pull,5000)}
function stopPolling(){if(pollTimer)clearInterval(pollTimer);pollTimer=null}
window.addEventListener('online',()=>{flush();pull()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){flush();pull()}});
