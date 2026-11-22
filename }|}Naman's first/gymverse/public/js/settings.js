/*
 * GymVerse | settings.js
 * Owner settings: gym, closed days, auto check-out, branding, backups, account.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
function oSettings(){
  const main=S.settings.main||{};
  const f=ui.forms.settings||(ui.forms.settings={gymName:main.gymName||'',pin:main.pin||''});
  return `<div class="panel"><h3>Gym settings</h3><div class="form">
    ${field('Gym name',`<input id="fs-name" data-in="f" data-f="settings" data-k="gymName" value="${esc(f.gymName)}" placeholder="My Gym">`)}
    ${field('Owner PIN (4 to 6 digits)',`<input id="fs-pin" type="password" inputmode="numeric" autocomplete="off" data-in="f" data-f="settings" data-k="pin" value="${esc(f.pin)}">`)}
    </div><p class="muted small">Leave the PIN empty to let anyone open the Owner area. The PIN keeps members out of owner screens on the gym device; it is not strong security.</p>
    ${errMsg('settings')}<div class="row"><button class="btn primary" data-a="settingsSave">Save settings</button></div></div>
  ${closedPanel()}
  ${autoPanel()}
  ${brandPanel()}
  ${backupPanel()}
  ${accountPanel()}
  <div class="panel"><h3>About GymVerse</h3><p style="margin:0">Version ${esc(ui.version||'')}. GymVerse is free, open-source software under the GNU AGPL-3.0 license.</p>
    <div class="row back"><a class="btn" href="https://github.com/namanguptaa/gymverse" target="_blank" rel="noopener">Source code</a><a class="btn ghost" href="https://github.com/namanguptaa/gymverse/issues" target="_blank" rel="noopener">Report a problem</a></div></div>`;
}
function closedPanel(){
  const c=closedCfg(), f=ui.forms.closed||(ui.forms.closed={weekdays:[...c.weekdays],newDate:''});
  const up=c.dates.filter(d=>d>=today()).sort();
  return `<div class="panel"><h3>Days the gym is closed</h3><p class="muted small" style="margin-top:0">On closed days members can’t check in, and the day isn’t counted as absent. You can still mark attendance from the Attendance tab.</p>
    <div class="field"><span>Closed every week on</span></div>
    <div class="wdays">${[1,2,3,4,5,6,0].map(i=>`<label class="check"><input type="checkbox" data-wd="${i}" ${f.weekdays.includes(i)?'checked':''}> ${WD[i]}</label>`).join('')}</div>
    <div class="row" style="margin-top:6px"><button class="btn primary" data-a="closedSave">Save weekly closed days</button></div>
    <h3 style="margin-top:22px">Other closed dates</h3><p class="muted small" style="margin-top:0">Add specific dates the gym will be closed, for example a maintenance day.</p>
    <div class="addex"><input id="cl-date" type="date" min="${today()}" data-in="cldate" value="${esc(f.newDate)}" aria-label="Closed date"><button class="btn" data-a="closedAdd">Add closed date</button></div>${errMsg('closed')}
    ${up.length?`<div class="tbl"><table><thead><tr><th>Date</th><th>Day</th><th></th></tr></thead><tbody>${up.map(d=>`<tr><td class="strong">${fmtDate(d)}</td><td>${WD[parseYmd(d).getDay()]}</td><td class="right"><button class="btn sm" data-a="closedRemove" data-v="${d}">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty-inline">No other closed dates coming up.</p>'}
  </div>`;
}
function brandPanel(){
  const f=ui.forms.brand||(ui.forms.brand={...brandCfg()});
  return `<div class="panel"><h3>Branding</h3><p class="muted small" style="margin-top:0">Choose what shows under the gym name and at the bottom of every page.</p>
    <label class="check"><input id="fb-sp" type="checkbox" data-in="f" data-f="brand" data-k="showPowered" ${f.showPowered?'checked':''}> Show the \u201cPowered by\u201d line</label>
    <div class="form">${field('Powered by (name)',`<input id="fb-pn" data-in="f" data-f="brand" data-k="poweredName" value="${esc(f.poweredName)}">`)}
      ${field('Powered by (website link)',`<input id="fb-pu" type="url" inputmode="url" data-in="f" data-f="brand" data-k="poweredUrl" value="${esc(f.poweredUrl)}" placeholder="https://example.com">`)}</div>
    <label class="check" style="margin-top:8px"><input id="fb-sm" type="checkbox" data-in="f" data-f="brand" data-k="showMadeBy" ${f.showMadeBy?'checked':''}> Show the \u201cMade with \u2665 by\u201d footer</label>
    <div class="form">${field('Made by (name)',`<input id="fb-mb" data-in="f" data-f="brand" data-k="madeBy" value="${esc(f.madeBy)}">`)}</div>
    <div class="row"><button class="btn" data-a="brandReset">Reset to default</button><button class="btn primary" data-a="brandSave">Save branding</button></div></div>`;
}
function backupPanel(){
  const last=S.settings.main&&S.settings.main.lastBackup;
  const old=!last||daysBetween(last.slice(0,10),today())>=7;
  return `<div class="panel"><h3>Backup and export</h3>
    <p class="muted small" style="margin-top:0">The server saves a backup copy of the database every day. Also download a backup file regularly and keep it somewhere else, for example in Google Drive.</p>
    <p style="margin:0 0 6px">Last backup downloaded: <b>${last?fmtDate(last.slice(0,10)):'Never'}</b> ${old?'<span class="tag yellow">Due</span>':'<span class="tag green">Up to date</span>'}</p>
    <div class="row"><button class="btn" data-a="exportXlsx">Export to Excel</button><button class="btn primary" data-a="backupJson">Download backup file</button></div>
    <h3 style="margin-top:22px">Restore from a backup file</h3>
    <p class="muted small" style="margin-top:0">Loads a backup file you downloaded earlier. Records in the file replace the same records in the app; nothing else is deleted.</p>
    <div class="addex"><input id="restore-file" type="file" accept=".json,application/json" aria-label="Backup file"><button class="btn ${ui.armed==='restore'?'armed':''}" data-a="restoreDel">${ui.armed==='restore'?'Tap again to restore':'Restore backup'}</button></div>
  </div>`;
}
function downloadFile(name,blob){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function markBackup(){save('settings','main',{...(S.settings.main||{}),lastBackup:new Date().toISOString()})}
function backupJson(){
  const data={app:'gymverse',version:1,exportedAt:new Date().toISOString(),data:{}};
  COLS.forEach(c=>data.data[c]=S[c]);
  downloadFile('gymverse-backup-'+today()+'.json',new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));
  markBackup(); toast('Backup file downloaded. Keep it somewhere safe, like Google Drive.');
}
function loadXlsx(){return window.XLSX?Promise.resolve(window.XLSX):new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=()=>res(window.XLSX);s.onerror=rej;document.head.appendChild(s)})}
async function exportXlsx(){
  let X; try{X=await loadXlsx()}catch(e){toast('Couldn\u2019t load the Excel tool. Check your internet connection.');return}
  const nm=id=>(S.members[id]&&S.members[id].name)||'Former member';
  const members=sortedMembers().map(m=>({Name:m.name,Phone:m.phone||'',Plan:(S.plans[m.planId]||{}).name||'',Start:m.startDate||'',End:m.endDate||'',Status:statusOf(m).label,'Fee paid':m.planId?(m.paid?'Yes':'No'):'',Joined:joinDate(m)}));
  const att=[];Object.keys(S.attendance).sort().forEach(d=>{const p=(S.attendance[d]||{}).present||{};Object.entries(p).forEach(([id,r])=>att.push({Date:d,Member:nm(id),'Check-in':r.time||'','Check-out':r.out||'','Minutes':durOf(r)??'','Marked by':r.by||'','Check-out by':r.outBy||''}))});
  const wk=[];Object.values(S.logs).sort((a,b)=>a.date.localeCompare(b.date)).forEach(l=>(l.entries||[]).forEach(e=>(e.sets||[]).forEach((s,i)=>wk.push({Date:l.date,Member:nm(l.memberId),Exercise:e.exercise,Set:i+1,'Weight (kg)':s.kg,Reps:s.reps}))));
  const bw=[];Object.entries(S.weights).forEach(([id,w])=>(w.entries||[]).forEach(e=>bw.push({Member:nm(id),Date:e.date,'Weight (kg)':e.kg})));
  const plans=sortedPlans().map(p=>({Plan:p.name,Months:p.months,'Price (INR)':p.price}));
  const wb=X.utils.book_new();
  [['Members',members],['Attendance',att],['Workouts',wk],['Body weight',bw],['Plans',plans]].forEach(([n,rows])=>X.utils.book_append_sheet(wb,X.utils.json_to_sheet(rows.length?rows:[{Note:'No data yet'}]),n));
  X.writeFile(wb,'gymverse-data-'+today()+'.xlsx'); markBackup(); toast('Excel file downloaded.');
}
async function restoreBackup(){
  const inp=document.getElementById('restore-file'), file=inp&&inp.files&&inp.files[0];
  if(!file){toast('Choose a backup file first.');return}
  let parsed; try{parsed=JSON.parse(await file.text())}catch(e){toast('That file isn\u2019t a valid backup.');return}
  if(!parsed||!['gymverse','gym-desk'].includes(parsed.app)||!parsed.data){toast('That file isn\u2019t a GymVerse backup.');return}
  try{const r=await api('/api/import',{method:'POST',body:{data:parsed.data}});toast('Backup restored: '+r.count+' records.');loadAll()}
  catch(e){toast(e.status===0?'You\u2019re offline. Try the restore again when connected.':'Restore failed: '+e.message)}
}
function accountPanel(){
  const f=ui.forms.pw||(ui.forms.pw={});
  return `<div class="panel"><h3>Account</h3><p style="margin:0 0 4px">Signed in as <b>${esc(user&&user.email||'')}</b></p>
    <p class="muted small" style="margin:0">Your data is stored on your own GymVerse server, not on this device.</p>
    <h3 style="margin-top:20px">Change password</h3><div class="form">
      ${field('Current password',`<input id="pw-cur" type="password" autocomplete="current-password" data-in="f" data-f="pw" data-k="cur" value="${esc(f.cur||'')}">`)}
      ${field('New password (at least 8 characters)',`<input id="pw-new" type="password" autocomplete="new-password" data-in="f" data-f="pw" data-k="next" value="${esc(f.next||'')}">`)}
    </div>${errMsg('pw')}
    <div class="row"><button class="btn" data-a="signout">Sign out</button><button class="btn primary" data-a="pwChange">Change password</button></div></div>`;
}
function autoPanel(){
  const af=ui.forms.auto||(ui.forms.auto={...autoCfg()});
  return `<div class="panel"><h3>Automatic check-out</h3><p class="muted small" style="margin-top:0">If a member forgets to check out, the app does it for them.</p><div class="form">
    ${field('When to check out',`<select id="fa-mode" data-in="f" data-f="auto" data-k="mode">
      <option value="closing" ${af.mode==='closing'?'selected':''}>At a set time each day</option>
      <option value="after" ${af.mode==='after'?'selected':''}>After a number of hours</option>
      <option value="off" ${af.mode==='off'?'selected':''}>Never, I’ll fix it myself</option></select>`)}
    ${af.mode==='closing'?field('Check-out time',`<input id="fa-close" type="time" data-in="f" data-f="auto" data-k="closing" value="${esc(af.closing)}">`):''}
    ${af.mode==='after'?field('Hours after check-in',`<input id="fa-hours" type="number" min="0.5" max="12" step="0.5" inputmode="decimal" data-in="f" data-f="auto" data-k="hours" value="${esc(af.hours)}">`):''}
    </div>${errMsg('auto')}<div class="row"><button class="btn primary" data-a="autoSave">Save check-out settings</button></div>
    <p class="muted small" style="margin-bottom:0">Changes apply to visits that are still open. Past check-outs stay as they are.</p></div>`;
}
function pinModal(){
  return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="pinh"><div class="panel"><h3 id="pinh">Enter owner PIN</h3>
    <input id="pin" type="password" inputmode="numeric" autocomplete="off" data-in="pin" value="${esc(ui.pinVal)}" aria-label="Owner PIN">
    ${ui.pinErr?`<p class="err">${esc(ui.pinErr)}</p>`:''}
    <div class="row"><button class="btn primary" data-a="pinSubmit">Unlock</button><button class="btn" data-a="pinCancel">Cancel</button></div></div></div>`;
}
