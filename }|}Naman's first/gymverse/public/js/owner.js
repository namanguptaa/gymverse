/*
 * GymVerse | owner.js
 * Owner screens: attendance, members, profiles, plans, exercises, reports.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
/* ---------- owner side ---------- */
function ownerArea(){
  const pin=S.settings.main&&S.settings.main.pin;
  const due=dueReminders(), nDue=due.unpaid.length+due.soon3.length+due.soon7.length;
  const tabs=[['today','Attendance'],['members','Members'],['reminders','Reminders'+(nDue?' ('+nDue+')':'')],['plans','Plans'],['reports','Reports'],['settings','Settings']];
  return `<nav class="tabs">${tabs.map(([k,l])=>`<button data-a="otab" data-v="${k}" class="${ui.oTab===k?'on':''}">${l}</button>`).join('')}</nav>
  ${!pin?`<p class="note">Set an owner PIN in Settings so members can’t open this area.</p>`:''}
  ${({today:oToday,members:oMembers,reminders:oReminders,plans:oPlans,reports:oReports,settings:oSettings})[ui.oTab]()}`;
}
function oToday(){
  const ms=sortedMembers();
  if(!ms.length) return empty('No members yet','Add your first member in the Members tab.');
  const t=today(); if(!ui.attDate||ui.attDate>t) ui.attDate=t;
  const d=ui.attDate, isToday=d===t, a=S.attendance[d], pres=(a&&a.present)||{}, at=autoText();
  const active=ms.filter(m=>{const c=statusOf(m).cls;return c==='green'||c==='yellow'}).length;
  const ending=ms.filter(m=>statusOf(m).cls==='yellow').length;
  const unpaid=ms.filter(m=>m.planId&&!m.paid).length;
  const q=ui.osearch.toLowerCase(), rows=ms.filter(m=>m.name.toLowerCase().includes(q));
  const presentCount=Object.keys(pres).filter(id=>S.members[id]).length;
  const inside=isToday?ms.filter(m=>pres[m.id]&&!pres[m.id].out):[];
  const insideHtml=isToday?`<h2 class="h">Inside the gym now <span class="tag ${inside.length?'green':'grey'}">${inside.length}</span></h2>
    ${inside.length?`<div class="tbl" data-qt="att"><table><thead><tr><th>Member</th><th>Since</th><th>Time inside</th><th></th></tr></thead><tbody>
    ${inside.map(m=>{const r=pres[m.id];return `<tr><td>${nameBtn(m)}</td><td>${fmtT(r.time)}</td><td>${fmtDur(sinceIn(r))}</td>
      <td class="right"><button class="btn sm primary" data-a="oout" data-v="${m.id}">Check out</button></td></tr>`}).join('')}
    </tbody></table></div>`:'<p class="empty-inline">No one is inside right now.</p>'}
    <p class="muted small">${at?'Anyone who forgets is checked out automatically '+at+'. ':'Automatic check-out is off. '}You can change this in Settings.</p>`:'';
  return `<div class="stats">${isToday?`<div><b>${inside.length}</b><span>Inside now</span></div>`:''}<div><b>${presentCount}</b><span>${isToday?'Checked in today':'Present that day'}</span></div>
    <div><b>${active}</b><span>Active members</span></div><div><b>${ending}</b><span>Ending within 7 days</span></div><div><b>${unpaid}</b><span>Fees not paid</span></div></div>
  ${insideHtml}
  <div class="datebar"><button class="btn sm" data-a="dayShift" data-v="-1">Previous day</button>
    <input id="attdate" type="date" max="${t}" data-in="attDate" value="${d}" aria-label="Attendance date">
    <button class="btn sm" data-a="dayShift" data-v="1" ${isToday?'disabled':''}>Next day</button>
    ${isToday?'':'<button class="btn sm" data-a="dayToday">Back to today</button>'}</div>
  <h2 class="h" style="margin-top:14px">${isToday?'Attendance for today':'Attendance for '+fmtDay(d)}${isClosed(d)?' <span class="tag grey">Closed</span>':''}</h2>
  ${isClosed(d)?`<p class="note">${isToday?'The gym is closed today':'The gym was closed on this day'}. Members can’t check in, but you can still mark attendance here.</p>`:''}
  <input id="osearch" class="search" type="search" placeholder="Search members" value="${esc(ui.osearch)}" data-in="osearch" autocomplete="off">
  <div class="tbl"><table><thead><tr><th>Member</th><th>Membership</th><th>Check-in</th><th>Check-out</th><th>Time spent</th><th></th></tr></thead><tbody>
  ${rows.map(m=>{const p=pres[m.id], s=statusOf(m);
    const tin=p?`<input class="tinput" type="time" id="tin-${m.id}" data-tt="time" data-v="${m.id}" value="${esc(p.time||'')}" aria-label="Check-in time for ${esc(m.name)}"> <small class="muted">${p.by==='owner'?'by owner':'self'}</small>`:`<span class="muted">${isToday?'Not yet':'Absent'}</span>`;
    const tout=p?`<input class="tinput" type="time" id="tout-${m.id}" data-tt="out" data-v="${m.id}" value="${esc(p.out||'')}" aria-label="Check-out time for ${esc(m.name)}">${p.out?' <small class="muted">'+(p.outBy==='auto'?'auto':p.outBy==='owner'?'by owner':'self')+'</small>':''}`:'<span class="muted">—</span>';
    const spent=p?(p.out?fmtDur(durOf(p)):(isToday&&p.time?'<span class="tag green">Inside now</span>':'—')):'—';
    return `<tr><td>${nameBtn(m)}</td><td><span class="tag ${s.cls}">${s.label}</span></td><td>${tin}</td><td>${tout}</td><td>${spent}</td>
    <td class="right"><div class="actions">${p?`${isToday&&!p.out?`<button class="btn sm primary" data-a="oout" data-v="${m.id}">Check out</button>`:''}<button class="btn sm" data-a="ounmark" data-v="${m.id}">${isToday?'Undo check-in':'Mark absent'}</button>`:`<button class="btn sm primary" data-a="omark" data-v="${m.id}">Mark present</button>`}</div></td></tr>`}).join('')||'<tr><td colspan="6" class="muted">No one matches that name.</td></tr>'}
  </tbody></table></div><p class="muted small">Tap a time to change it. Tap a name to open that member’s profile.</p>`;
}
function delBtn(action,id,key){const armed=ui.armed===key;return `<button class="btn sm ${armed?'armed':''}" data-a="${action}" data-v="${id}">${armed?'Tap again to delete':'Delete'}</button>`}
function oProfile(){
  const id=ui.profileId, m={...S.members[id],id}, s=statusOf(m), plan=S.plans[m.planId];
  const month=ui.profMonth||today().slice(0,7), thisMonth=today().slice(0,7);
  const tabs=[['attendance','Attendance'],['workouts','Workouts'],['prs','PRs'],['weight','Body weight'],['membership','Membership']];
  let body='';
  if(ui.pTab==='attendance'){
    const g=calendar(id,month,true), marked=g.present+g.absent;
    const allDays=Object.keys(S.attendance).filter(k=>isIn(id,k)).sort();
    body=`<div class="cols"><section><div class="monthbar"><button class="btn sm" data-a="monthShift" data-v="-1">Previous month</button><h3>${fmtMonth(month)}</h3>
        <button class="btn sm" data-a="monthShift" data-v="1" ${month>=thisMonth?'disabled':''}>Next month</button></div>${g.html}
        <p class="muted small">Tap any past day to switch it between present and absent.</p></section>
      <section><h3>Summary</h3><div class="tbl"><table class="kv"><tbody>
        <tr><th>Present in ${fmtMonth(month)}</th><td class="strong">${plural(g.present,'day')}</td></tr>
        <tr><th>Absent in ${fmtMonth(month)}</th><td class="strong">${plural(g.absent,'day')}</td></tr>
        <tr><th>Attendance rate</th><td>${marked?Math.round(g.present/marked*100)+'%':'—'}</td></tr>
        <tr><th>Total visits, all time</th><td>${allDays.length}</td></tr>
        <tr><th>Last visit</th><td>${allDays.length?fmtDate(allDays[allDays.length-1]):'Never'}</td></tr>
        <tr><th>Member since</th><td>${fmtDate(joinDate(m))}</td></tr>
      </tbody></table></div><p class="muted small">Absent counts past open days since joining with no check-in. Closed days aren’t counted.</p></section></div>
      <h2 class="h">Visits</h2>${visitsTable(id,60)}`;
  } else if(ui.pTab==='workouts') body=qBox('hist','Search by exercise or date, e.g. bench or Nov')+historyTable(id);
  else if(ui.pTab==='prs') body=qBox('hist','Search exercises')+prTable(id);
  else if(ui.pTab==='weight') body=weightPanel(id);
  else body=`<div style="max-width:520px">${membershipTable(m)}<div class="row">${plan?`<button class="btn" data-a="renew" data-v="${id}">Renew plan</button>`:''}${m.planId&&!m.paid?`<button class="btn" data-a="paid" data-v="${id}">Mark fee paid</button>`:''}</div></div>`;
  return `<div class="row back" style="margin:0 0 14px"><button class="btn sm ghost" data-a="profBack">All members</button></div>
  <div class="who"><span class="av lg" aria-hidden="true">${ini(m.name)}</span><div class="who-main"><h2>${esc(m.name)}</h2><p><span class="tag ${s.cls}">${s.label}</span> <span class="muted">${plan?esc(plan.name):''}${m.phone?' &nbsp; '+esc(m.phone):''}</span></p></div>
    <button class="btn" data-a="memberEdit" data-v="${id}">Edit member</button></div>
  <nav class="tabs">${tabs.map(([k,l])=>`<button data-a="ptab" data-v="${k}" class="${ui.pTab===k?'on':''}">${l}</button>`).join('')}</nav>${body}`;
}
function oMembers(){
  if(ui.profileId&&S.members[ui.profileId]&&!ui.editMember) return oProfile();
  const f=ui.forms.member, plans=sortedPlans(), ms=sortedMembers();
  const form=ui.editMember?`<div class="panel"><h3>${ui.editMember==='new'?'Add member':'Edit member'}</h3><div class="form">
    ${field('Name',`<input id="fm-name" data-in="f" data-f="member" data-k="name" value="${esc(f.name||'')}" autocomplete="off">`)}
    ${field('Phone',`<input id="fm-phone" type="tel" inputmode="tel" data-in="f" data-f="member" data-k="phone" value="${esc(f.phone||'')}">`)}
    ${field('Membership plan',`<select id="fm-plan" data-in="f" data-f="member" data-k="planId"><option value="">No plan</option>${plans.map(p=>`<option value="${p.id}" ${f.planId===p.id?'selected':''}>${esc(p.name)} (${plural(p.months,'month')}, ${inr(p.price)})</option>`).join('')}</select>`)}
    ${field('Start date',`<input id="fm-start" type="date" data-in="f" data-f="member" data-k="startDate" value="${esc(f.startDate||today())}">`)}
    <label class="check"><input id="fm-paid" type="checkbox" data-in="f" data-f="member" data-k="paid" ${f.paid?'checked':''}> Fee paid</label>
    </div>${!plans.length?'<p class="muted small">Tip: add membership plans in the Plans tab first.</p>':''}${errMsg('member')}
    <div class="row"><button class="btn primary" data-a="memberSave">Save member</button><button class="btn" data-a="cancel">Cancel</button></div></div>`
    :`<div class="row" style="margin:0 0 16px"><button class="btn primary" data-a="memberNew">Add member</button></div>`;
  return form+(ms.length?qBox('members','Search by name, phone, plan or status')+`<div class="tbl" data-qt="members"><table><thead><tr><th>Name</th><th>Phone</th><th>Plan</th><th>Ends</th><th>Status</th><th>Fee</th><th></th></tr></thead><tbody>
  ${ms.map(m=>{const s=statusOf(m), p=S.plans[m.planId];return `<tr><td>${nameBtn(m)}</td><td>${esc(m.phone)||'<span class="muted">—</span>'}</td>
    <td>${p?esc(p.name):'<span class="muted">No plan</span>'}</td><td style="white-space:nowrap">${fmtDate(m.endDate)}</td><td><span class="tag ${s.cls}">${s.label}</span></td>
    <td>${m.planId?(m.paid?'<span class="tag green">Paid</span>':`<button class="btn sm" data-a="paid" data-v="${m.id}">Mark paid</button>`):'—'}</td>
    <td class="right"><div class="actions"><button class="btn sm" data-a="memberEdit" data-v="${m.id}">Edit</button>${p?`<button class="btn sm" data-a="renew" data-v="${m.id}">Renew</button>`:''}${delBtn('memberDel',m.id,'m'+m.id)}</div></td></tr>`}).join('')}
  </tbody></table></div><p class="muted small">Tap a name to see attendance, workouts, PRs and body weight.</p>`:empty('No members yet','Add your first member to start tracking attendance and fees.'));
}
function oPlans(){
  const pf=ui.forms.plan, rf=ui.forms.routine, ef=ui.forms.exercise, plans=sortedPlans(), rs=sortedRoutines();
  const custom=Object.entries(S.exercises).map(([id,e])=>({...e,id})).sort((a,b)=>a.name.localeCompare(b.name));
  const planForm=ui.editPlan?`<div class="panel"><h3>${ui.editPlan==='new'?'Add membership plan':'Edit membership plan'}</h3><div class="form">
    ${field('Plan name',`<input id="fp-name" data-in="f" data-f="plan" data-k="name" value="${esc(pf.name||'')}" placeholder="e.g. Quarterly">`)}
    ${field('Length (months)',`<input id="fp-months" type="number" min="1" step="1" inputmode="numeric" data-in="f" data-f="plan" data-k="months" value="${esc(pf.months||'')}">`)}
    ${field('Price (₹)',`<input id="fp-price" type="number" min="0" step="1" inputmode="numeric" data-in="f" data-f="plan" data-k="price" value="${esc(pf.price??'')}">`)}
    </div>${errMsg('plan')}
    <div class="row"><button class="btn primary" data-a="planSave">Save plan</button><button class="btn" data-a="cancel">Cancel</button></div></div>`
    :`<div class="row" style="margin:0 0 14px"><button class="btn primary" data-a="planNew">Add membership plan</button></div>`;
  const rows=rf.rows||[];
  const routineForm=ui.editRoutine?`<div class="panel"><h3>${ui.editRoutine==='new'?'Add workout routine':'Edit workout routine'}</h3>
    <div class="form">${field('Routine name',`<input id="fr-name" data-in="f" data-f="routine" data-k="name" value="${esc(rf.name||'')}" placeholder="e.g. Push day">`,'full')}</div>
    <div class="tbl" style="margin-top:14px"><table class="rt"><thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Target kg</th><th></th></tr></thead><tbody>
    ${rows.map((r,i)=>`<tr><td><select id="rt-n-${i}" data-in="rt" data-i="${i}" data-k="name" aria-label="Exercise ${i+1}"><option value="">Choose an exercise…</option>${exOptions(r.name)}</select></td>
      <td><input id="rt-s-${i}" type="number" min="1" step="1" inputmode="numeric" data-in="rt" data-i="${i}" data-k="sets" value="${esc(r.sets)}" aria-label="Exercise ${i+1} sets"></td>
      <td><input id="rt-r-${i}" type="number" min="1" step="1" inputmode="numeric" data-in="rt" data-i="${i}" data-k="reps" value="${esc(r.reps)}" aria-label="Exercise ${i+1} reps"></td>
      <td><input id="rt-k-${i}" type="number" min="0" step="0.5" inputmode="decimal" data-in="rt" data-i="${i}" data-k="kg" value="${esc(r.kg)}" placeholder="Optional" aria-label="Exercise ${i+1} target kg"></td>
      <td class="right"><button class="x" data-a="rtDel" data-v="${i}" aria-label="Remove exercise ${i+1}">×</button></td></tr>`).join('')||'<tr><td colspan="5" class="muted">No exercises yet.</td></tr>'}
    </tbody></table></div><div class="row"><button class="btn sm" data-a="rtAdd">Add exercise</button></div>
    <p class="muted small">Can’t find an exercise? Add it in the Exercise list below.</p>${errMsg('routine')}
    <div class="row"><button class="btn primary" data-a="routineSave">Save routine</button><button class="btn" data-a="cancel">Cancel</button></div></div>`
    :`<div class="row" style="margin:0 0 14px"><button class="btn primary" data-a="routineNew">Add workout routine</button></div>`;
  return `${qBox('plans','Search plans, routines or exercises')}<h2 class="h">Membership plans</h2>${planForm}
  ${plans.length?`<div class="tbl" data-qt="plans"><table><thead><tr><th>Plan</th><th>Length</th><th>Price</th><th>Members</th><th></th></tr></thead><tbody>
  ${plans.map(p=>`<tr><td class="strong">${esc(p.name)}</td><td>${plural(p.months,'month')}</td><td>${inr(p.price)}</td><td>${Object.values(S.members).filter(m=>m.planId===p.id).length}</td>
    <td class="right"><div class="actions"><button class="btn sm" data-a="planEdit" data-v="${p.id}">Edit</button>${delBtn('planDel',p.id,'p'+p.id)}</div></td></tr>`).join('')}
  </tbody></table></div>`:'<p class="empty-inline">No membership plans yet. Add one, like Monthly for ₹1,500.</p>'}
  <h2 class="h">Workout routines</h2>${routineForm}
  ${rs.length?`<div class="tbl" data-qt="plans"><table><thead><tr><th>Routine</th><th>Exercises (sets × reps, target)</th><th></th></tr></thead><tbody>
  ${rs.map(r=>`<tr><td class="strong">${esc(r.name)}</td><td>${(r.exercises||[]).map(e=>`${esc(e.name)} <span class="muted">${e.sets}×${e.reps}${e.kg?' at '+kgFmt(e.kg)+' kg':''}</span>`).join('<br>')}</td>
    <td class="right"><div class="actions"><button class="btn sm" data-a="routineEdit" data-v="${r.id}">Edit</button>${delBtn('routineDel',r.id,'r'+r.id)}</div></td></tr>`).join('')}
  </tbody></table></div>`:'<p class="empty-inline">No routines yet. Add one, like Push day or Leg day, so members can load it in one tap.</p>'}
  <h2 class="h">Exercise list</h2>
  <p class="muted" style="margin-top:0">The app comes with ${LIB_COUNT} common exercises grouped by muscle. Exercises you add here show up in every exercise dropdown.</p>
  <div class="panel"><h3>Add an exercise</h3><div class="form">
    ${field('Exercise name',`<input id="fe-name" data-in="f" data-f="exercise" data-k="name" value="${esc(ef.name||'')}" placeholder="e.g. Smith machine squat" autocomplete="off">`)}
    ${field('Muscle group',`<select id="fe-muscle" data-in="f" data-f="exercise" data-k="muscle">${[...MUSCLES,'Other'].map(m=>`<option ${ef.muscle===m?'selected':''}>${m}</option>`).join('')}</select>`)}
    </div>${errMsg('exercise')}<div class="row"><button class="btn primary" data-a="exAdd">Add exercise</button></div></div>
  ${custom.length?`<div class="tbl" data-qt="plans" style="margin-bottom:18px"><table><thead><tr><th>Your exercises</th><th>Muscle group</th><th></th></tr></thead><tbody>
  ${custom.map(e=>`<tr><td class="strong">${esc(e.name)}</td><td>${esc(e.muscle)}</td><td class="right">${delBtn('exDel',e.id,'x'+e.id)}</td></tr>`).join('')}</tbody></table></div>`:''}
  <details class="panel" ${ui.q.plans?'open':''}><summary>See the built-in exercise list</summary><div class="tbl" data-qt="plans"><table><thead><tr><th>Muscle group</th><th>Exercises</th></tr></thead><tbody>
  ${MUSCLES.map(m=>`<tr><td class="strong">${m}</td><td>${LIB[m].join(', ')}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function oReports(){
  const ms=sortedMembers(), t=today();
  if(!ms.length) return empty('Nothing to report yet','Add members and start marking attendance.');
  const days30=[...Array(30)].map((_,i)=>shiftDay(t,-i));
  const allDays=Object.keys(S.attendance).sort().reverse();
  const att=ms.map(m=>{let n=0;days30.forEach(d=>{if(isIn(m.id,d))n++});const last=allDays.find(k=>isIn(m.id,k))||'';return {m,n,last}})
    .sort((a,b)=>b.n-a.n||a.m.name.localeCompare(b.m.name));
  const ending=ms.filter(m=>m.endDate&&daysBetween(t,m.endDate)<=14).sort((a,b)=>a.endDate.localeCompare(b.endDate));
  const unpaid=ms.filter(m=>m.planId&&!m.paid);
  const board=Object.values(prsFor(null)).sort((a,b)=>a.name.localeCompare(b.name));
  const nm=id=>esc((S.members[id]&&S.members[id].name)||'Former member');
  const open30=days30.filter(d=>!isClosed(d)).length;
  const allDur=[], perMember={}, hours=Array(24).fill(0); let openDays=0;
  days30.forEach(d=>{const a=S.attendance[d]; if(!a||!a.present) return; let any=false;
    Object.entries(a.present).forEach(([mid,r])=>{ if(!S.members[mid]||!r||!r.time) return; any=true;
      const du=durOf(r); if(du!=null){allDur.push(du);(perMember[mid]=perMember[mid]||[]).push(du)}
      const s0=toMin(r.time), e0=r.out?toMin(r.out):(d===t?toMin(nowTime()):s0+60), e=Math.max(e0,s0+1);
      for(let hr=Math.floor(s0/60);hr<=Math.min(23,Math.floor((e-1)/60));hr++) hours[hr]++; });
    if(any) openDays++; });
  const avgOf=l=>l&&l.length?Math.round(l.reduce((x,y)=>x+y,0)/l.length):null;
  const nz=hours.map((v,i)=>v?i:-1).filter(i=>i>=0), maxH=Math.max(...hours);
  const hl=hr=>((hr%12)||12)+(hr<12?' am':' pm');
  const peak=nz.length?`<div class="tbl"><table><thead><tr><th>Hour</th><th>How busy</th><th>Avg. members in the gym</th></tr></thead><tbody>
    ${hours.slice(nz[0],nz[nz.length-1]+1).map((v,k)=>{const hr=nz[0]+k, top=v===maxH&&v>0;return `<tr><td class="strong">${hl(hr)} to ${hl((hr+1)%24)}</td>
      <td><div class="hbar ${top?'top':''}"><span style="width:${maxH?Math.round(v/maxH*100):0}%"></span></div></td>
      <td>${(v/(openDays||1)).toFixed(1)}${top?' <span class="tag red">Busiest</span>':''}</td></tr>`}).join('')}
    </tbody></table></div><p class="muted small">Based on check-in and check-out times over the last 30 days, averaged over ${plural(openDays,'day')} the gym had visitors.</p>`
    :'<p class="empty-inline">Peak hours appear once members check in with a time.</p>';
  return `${qBox('rep','Search members or exercises in these reports')}<h2 class="h">Workout time, last 30 days</h2>
  ${allDur.length?`<div class="tbl" style="max-width:560px"><table class="kv"><tbody>
    <tr><th>Average time per visit</th><td class="strong">${fmtDur(avgOf(allDur))}</td></tr>
    <tr><th>Longest visit</th><td>${fmtDur(Math.max(...allDur))}</td></tr>
    <tr><th>Visits with check-out</th><td>${allDur.length}</td></tr></tbody></table></div>`:'<p class="empty-inline">Average workout time appears once members check out.</p>'}
  <h2 class="h">Peak hours</h2>${peak}
  <h2 class="h">Attendance, last 30 days</h2>
  <div class="tbl" data-qt="rep"><table><thead><tr><th>Member</th><th>Days present (of open days)</th><th>Avg. time per visit</th><th>Last visit</th></tr></thead><tbody>
  ${att.map(a=>`<tr><td>${nameBtn(a.m)}</td><td>${a.n} of ${open30}</td><td>${fmtDur(avgOf(perMember[a.m.id]))}</td><td>${a.last?fmtDate(a.last):'<span class="muted">Never</span>'}</td></tr>`).join('')}
  </tbody></table></div>
  <h2 class="h">Memberships ending soon or expired</h2>
  ${ending.length?`<div class="tbl" data-qt="rep"><table><thead><tr><th>Member</th><th>Phone</th><th>Plan</th><th>Ends</th><th>Status</th></tr></thead><tbody>
  ${ending.map(m=>{const s=statusOf(m);return `<tr><td>${nameBtn(m)}</td><td>${esc(m.phone)||'—'}</td><td>${esc((S.plans[m.planId]||{}).name||'—')}</td><td>${fmtDate(m.endDate)}</td><td><span class="tag ${s.cls}">${s.label}</span></td></tr>`}).join('')}
  </tbody></table></div>`:'<p class="empty-inline">No memberships end in the next 14 days.</p>'}
  <h2 class="h">Fees not paid</h2>
  ${unpaid.length?`<div class="tbl" data-qt="rep"><table><thead><tr><th>Member</th><th>Plan</th><th>Amount</th><th></th></tr></thead><tbody>
  ${unpaid.map(m=>{const p=S.plans[m.planId]||{};return `<tr><td>${nameBtn(m)}</td><td>${esc(p.name||'—')}</td><td>${inr(p.price)}</td><td class="right"><button class="btn sm" data-a="paid" data-v="${m.id}">Mark paid</button></td></tr>`}).join('')}
  </tbody></table></div>`:'<p class="empty-inline">Everyone with a plan has paid.</p>'}
  <h2 class="h">Gym PR board</h2>
  ${board.length?`<div class="tbl" data-qt="rep"><table><thead><tr><th>Exercise</th><th>Heaviest lift</th><th>Best est. 1-rep max</th></tr></thead><tbody>
  ${board.map(b=>`<tr><td class="strong">${esc(b.name)}</td><td><div class="num">${kgFmt(b.top.kg)} kg <small>× ${b.top.reps}</small></div><small class="muted">${nm(b.top.mid)}</small></td>
    <td><div class="num">${kgFmt(b.e1.v)} kg</div><small class="muted">${nm(b.e1.mid)}</small></td></tr>`).join('')}
  </tbody></table></div>`:'<p class="empty-inline">PRs appear here once members save workouts.</p>'}`;
}
