/*
 * GymVerse | reminders.js
 * Fee and plan reminders over WhatsApp and SMS.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
/* ---------- reminders ---------- */
const DEFAULT_TPL={
  unpaid:'Hi {name}, {gym} se reminder hai. Aapke {plan} plan ki fee {amount} abhi pending hai. Please jaldi pay kar dijiye. Thank you!',
  ending:'Hi {name}, {gym} se reminder hai. Aapka {plan} plan {when} ({date}) khatam ho raha hai. Training continue rakhne ke liye time par renew kar lijiye. Thank you!'
};
const tplOf=k=>((S.settings.main&&S.settings.main.tpl&&S.settings.main.tpl[k])||DEFAULT_TPL[k]);
function phone91(p){const d=String(p||'').replace(/\D/g,'');if(d.length===10)return '91'+d;if(d.length===11&&d[0]==='0')return '91'+d.slice(1);if(d.length===12&&d.startsWith('91'))return d;return d.length>10?d:''}
const whenText=left=>left<=0?'aaj':left===1?'kal':left+' din mein';
function fillMsg(kind,m){
  const p=S.plans[m.planId]||{}, left=m.endDate?daysBetween(today(),m.endDate):0;
  const vals={name:m.name,gym:(S.settings.main&&S.settings.main.gymName)||'gym',plan:p.name||'membership',amount:inr(p.price),date:fmtDate(m.endDate),when:whenText(left),days:String(Math.max(0,left))};
  return tplOf(kind).replace(/\{(\w+)\}/g,(x,k)=>vals[k]!=null?vals[k]:x);
}
function dueReminders(){
  const out={unpaid:[],soon3:[],soon7:[]}, t=today();
  sortedMembers().forEach(m=>{
    if(m.planId&&!m.paid&&S.plans[m.planId]) out.unpaid.push(m);
    if(m.endDate){const l=daysBetween(t,m.endDate); if(l>=0&&l<=3) out.soon3.push(m); else if(l>=4&&l<=7) out.soon7.push(m)}
  });
  const byEnd=(a,b)=>a.endDate.localeCompare(b.endDate); out.soon3.sort(byEnd); out.soon7.sort(byEnd);
  return out;
}
function reminderRows(list,kind){
  return `<div class="tbl" data-qt="rem"><table><thead><tr><th>Member</th><th>Phone</th><th>${kind==='unpaid'?'Amount due':'Plan ends'}</th><th>Last reminder</th><th></th></tr></thead><tbody>
  ${list.map(m=>{const p=S.plans[m.planId]||{}, ph=phone91(m.phone), msg=encodeURIComponent(fillMsg(kind,m)), r=m.reminded&&m.reminded[kind];
    const sentToday=r&&r.date===today();
    return `<tr><td>${nameBtn(m)}</td><td>${esc(m.phone)||'<span class="muted">Not saved</span>'}</td>
    <td>${kind==='unpaid'?inr(p.price):fmtDate(m.endDate)+' <span class="muted">('+whenText(daysBetween(today(),m.endDate))+')</span>'}</td>
    <td>${r?`${sentToday?'<span class="tag green">Today</span>':fmtDate(r.date)} <small class="muted">via ${esc(r.via)}</small>`:'<span class="muted">Not yet</span>'}</td>
    <td class="right"><div class="actions">${ph
      ?`<a class="btn sm primary" href="https://wa.me/${ph}?text=${msg}" target="_blank" rel="noopener" data-a="remind" data-v="${m.id}" data-k="${kind}" data-via="WhatsApp">WhatsApp</a><a class="btn sm" href="sms:+${ph}?&body=${msg}" target="_blank" rel="noopener" data-a="remind" data-v="${m.id}" data-k="${kind}" data-via="SMS">SMS</a>`
      :`<button class="btn sm" data-a="addPhone" data-v="${m.id}">Add phone number</button>`}
      <button class="btn sm ghost" data-a="copyMsg" data-v="${m.id}" data-k="${kind}">Copy message</button>${kind==='unpaid'?`<button class="btn sm" data-a="paid" data-v="${m.id}">Mark as paid</button>`:''}</div></td></tr>`}).join('')}
  </tbody></table></div>`;
}
function oReminders(){
  const d=dueReminders(), total=d.unpaid.length+d.soon3.length+d.soon7.length;
  const f=ui.forms.tpl||(ui.forms.tpl={unpaid:tplOf('unpaid'),ending:tplOf('ending')});
  const sec=(title,hint,list,kind)=>`<h2 class="h">${title} <span class="tag ${list.length?'yellow':'grey'}">${list.length}</span></h2>
    <p class="muted" style="margin-top:-4px">${hint}</p>${list.length?reminderRows(list,kind):'<p class="empty-inline">No one here right now.</p>'}`;
  return `${total?qBox('rem','Search by name or phone'):''}${total?'':'<p class="note">No reminders due right now. Members show up here when a fee is pending or their plan ends within 7 days.</p>'}
  ${sec('Fee not paid','Members with a plan whose fee isn’t marked as paid.',d.unpaid,'unpaid')}
  ${sec('Plan ends within 3 days','Includes plans ending today.',d.soon3,'ending')}
  ${sec('Plan ends in 4 to 7 days','An early heads-up so they can renew on time.',d.soon7,'ending')}
  <p class="muted small">WhatsApp and SMS open with the message already typed. Press send there. The reminder is logged here when you tap the button.</p>
  <details class="panel" ${ui.tplOpen?'open':''}><summary data-a="tplToggle">Edit reminder messages</summary>
    <p class="muted small">These blanks are filled in for each member: {name}, {gym}, {plan}, {amount}, {date}, {when}.</p>
    <div class="form">
      ${field('Fee not paid',`<textarea id="tpl-unpaid" style="min-height:110px" data-in="f" data-f="tpl" data-k="unpaid">${esc(f.unpaid)}</textarea>`,'full')}
      ${field('Plan ending soon',`<textarea id="tpl-ending" style="min-height:110px" data-in="f" data-f="tpl" data-k="ending">${esc(f.ending)}</textarea>`,'full')}
    </div>${errMsg('tpl')}
    <div class="row"><button class="btn" data-a="tplReset">Reset to default</button><button class="btn primary" data-a="tplSave">Save messages</button></div>
  </details>`;
}
function copyText(t){
  const done=()=>toast('Message copied. Paste it in WhatsApp or SMS.');
  const fallback=()=>{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();ok?done():toast('Couldn’t copy on this device. Use the WhatsApp or SMS button instead.')};
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done,fallback); else fallback();
}
