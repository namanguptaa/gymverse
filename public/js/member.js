/*
 * GymVerse | member.js
 * Member screens on the front-desk device: check-in, workout log, PRs, history.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
/* ---------- member side ---------- */
function picker(){
  const all=sortedMembers();
  if(!all.length) return empty('No members yet','Ask the gym owner to add members from the Owner area.');
  const q=ui.search.toLowerCase(), list=all.filter(m=>m.name.toLowerCase().includes(q));
  return `${isClosed(today())?'<p class="note">The gym is closed today, so members can’t check in. The owner can still mark attendance.</p>':''}<h2 class="h">Who’s training today?</h2>
  <input id="search" class="search" type="search" placeholder="Search your name" value="${esc(ui.search)}" data-in="search" autocomplete="off">
  <div class="names">${list.map(m=>`<button class="name" data-a="pick" data-v="${m.id}"><span class="av">${ini(m.name)}</span><span>${esc(m.name)}</span>${(()=>{const r=recOf(m.id);return r?(r.out?'<span class="tag grey">Done</span>':'<span class="tag green">In</span>'):''})()}</button>`).join('')||'<p class="muted">No one matches that name.</p>'}</div>`;
}
function memberArea(){
  if(!ui.memberId||!S.members[ui.memberId]){ui.memberId=null;return picker()}
  const m={...S.members[ui.memberId],id:ui.memberId}, s=statusOf(m), plan=S.plans[m.planId];
  const tabs=[['today','Today'],['workout','Workout'],['prs','My PRs'],['history','History'],['weight','Body weight']];
  return `<div class="who"><span class="av lg" aria-hidden="true">${ini(m.name)}</span><div class="who-main"><h2>${esc(m.name)}</h2><p><span class="tag ${s.cls}">${s.label}</span> <span class="muted">${plan?esc(plan.name):''}</span></p></div>
    <button class="btn" data-a="switch">Switch member</button></div>
  <nav class="tabs">${tabs.map(([k,l])=>`<button data-a="mtab" data-v="${k}" class="${ui.mTab===k?'on':''}">${l}</button>`).join('')}</nav>
  ${({today:mToday,workout:mWorkout,prs:m=>qBox('hist','Search exercises')+prTable(m.id),history:m=>qBox('hist','Search by exercise or date, e.g. bench or Nov')+'<h2 class="h">Visits</h2>'+visitsTable(m.id,30)+'<h2 class="h">Workouts</h2>'+historyTable(m.id,30),weight:m=>weightPanel(m.id)})[ui.mTab](m)}`;
}
function membershipTable(m){
  const plan=S.plans[m.planId], s=statusOf(m);
  return `<div class="tbl"><table class="kv"><tbody>
    <tr><th>Plan</th><td>${plan?esc(plan.name):'No plan'}</td></tr>
    <tr><th>Started</th><td>${fmtDate(m.startDate)}</td></tr>
    <tr><th>Ends</th><td>${fmtDate(m.endDate)}</td></tr>
    <tr><th>Days left</th><td>${s.left==null?'—':s.left<0?'Expired':s.left}</td></tr>
    <tr><th>Fee</th><td>${m.planId?(m.paid?'<span class="tag green">Paid</span>':'<span class="tag red">Not paid</span>'):'—'}</td></tr>
  </tbody></table></div>`;
}
function mToday(m){
  const p=recOf(m.id), g=calendar(m.id,today().slice(0,7),false), s=statusOf(m), at=autoText();
  const autoNote=at?`<p class="muted small">If you forget to check out, it happens automatically ${at}.</p>`:'';
  let top;
  if(!p&&isClosed(today())) top=`<div class="closed-note">The gym is closed today<small>Check-in isn’t available today. See you on the next open day.</small></div>`;
  else if(!p) top=`<button class="btn big primary" data-a="checkin">Check in for today</button>${autoNote}`;
  else if(!p.out) top=`<div class="done">Checked in at ${fmtT(p.time)}${p.time?'. '+fmtDur(sinceIn(p))+' so far':''} <button class="link" data-a="uncheck">Undo</button></div>
    <div class="row back" style="margin-top:12px"><button class="btn big primary" data-a="checkout">Check out</button></div>${autoNote}`;
  else top=`<div class="done">Visit done: ${fmtT(p.time)} to ${fmtT(p.out)}${durOf(p)!=null?' ('+fmtDur(durOf(p))+')':''} <button class="link" data-a="uncheckout">Undo check-out</button></div>
    ${p.outBy==='auto'?'<p class="muted small">You were checked out automatically.</p>':''}`;
  return `<section class="checkin">${top}</section>
  <div class="cols">
    <section><h3>This month</h3><p class="muted">${plural(g.present,'day')} at the gym</p>${g.html}</section>
    <section><h3>Membership</h3>${membershipTable(m)}
    ${s.cls==='red'||s.cls==='yellow'?'<p class="note" style="margin-top:12px">Talk to the front desk to renew your plan.</p>':''}</section>
  </div>`;
}
function visitsTable(mid,limit){
  const days=Object.keys(S.attendance).filter(d=>isIn(mid,d)).sort().reverse().slice(0,limit||100000);
  if(!days.length) return '<p class="empty-inline">No visits yet.</p>';
  const durs=days.map(d=>durOf(recOf(mid,d))).filter(x=>x!=null);
  const avg=durs.length?Math.round(durs.reduce((a,b)=>a+b,0)/durs.length):null;
  return `${avg!=null?`<p class="muted" style="margin-top:-4px">Average time per visit: <b>${fmtDur(avg)}</b></p>`:''}
  <div class="tbl" data-qt="hist"><table><thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th><th>Time spent</th></tr></thead><tbody>
  ${days.map(d=>{const r=recOf(mid,d);return `<tr><td class="strong">${fmtDate(d)}</td><td>${r.time?fmtT(r.time):'<span class="muted">Not recorded</span>'}</td>
    <td>${r.out?fmtT(r.out)+(r.outBy==='auto'?' <small class="muted">auto</small>':''):(d===today()&&r.time?'<span class="tag green">Inside now</span>':'<span class="muted">—</span>')}</td>
    <td>${fmtDur(durOf(r))}</td></tr>`}).join('')}
  </tbody></table></div>`;
}
function ensureDraft(mid){
  const key=mid+'_'+today();
  if(ui.draftKey===key) return;
  const log=S.logs[key];
  ui.draft=log?clone(log.entries||[]).map(e=>({exercise:e.exercise,sets:e.sets.map(s=>({kg:String(s.kg),reps:String(s.reps)}))})):[];
  ui.draftKey=key; ui.dirty=false;
}
function mWorkout(m){
  ensureDraft(m.id);
  const rs=sortedRoutines(), d=ui.draft;
  return `${rs.length?`<div class="row wrap"><select id="rsel" data-ch="routine" aria-label="Start from a routine" style="max-width:420px"><option value="">Start from a routine…</option>${rs.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></div>`:''}
  ${d.length?d.map((e,i)=>`<section class="ex"><div class="exhead"><h3>${esc(e.exercise)}</h3><button class="link danger" data-a="delEx" data-v="${i}">Remove</button></div>
    <div class="tbl"><table class="sets"><thead><tr><th>Set</th><th>Weight (kg)</th><th>Reps</th><th></th></tr></thead><tbody>
    ${e.sets.map((s,j)=>`<tr><td>${j+1}</td>
      <td><input id="kg-${i}-${j}" type="number" inputmode="decimal" min="0" step="0.5" data-in="kg" data-i="${i}" data-j="${j}" value="${esc(s.kg)}" aria-label="Set ${j+1} weight in kg"></td>
      <td><input id="rp-${i}-${j}" type="number" inputmode="numeric" min="0" step="1" data-in="reps" data-i="${i}" data-j="${j}" value="${esc(s.reps)}" aria-label="Set ${j+1} reps"></td>
      <td class="right"><button class="x" data-a="delSet" data-v="${i}" data-j="${j}" aria-label="Remove set ${j+1}">×</button></td></tr>`).join('')}
    </tbody></table></div><button class="btn sm" data-a="addSet" data-v="${i}">Add set</button></section>`).join('')
  :`<p class="empty-inline">No exercises yet. Pick a routine above, or choose an exercise below.</p>`}
  <div class="addex"><select id="newex" data-in="newEx" aria-label="Choose an exercise"><option value="">Choose an exercise…</option>${exOptions(ui.newEx)}</select>
    <button class="btn" data-a="addEx">Add exercise</button></div>
  <div class="savebar"><button class="btn primary big" data-a="saveWorkout">Save workout</button><span id="dirty" class="muted">${ui.dirty?'Unsaved changes':''}</span></div>`;
}
