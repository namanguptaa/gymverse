/*
 * GymVerse | actions.js
 * Everything a button does: saving members, plans, attendance, workouts and settings.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
/* ---------- actions ---------- */
let toastTimer=null;
function toast(msg){ui.toast=msg;render();clearTimeout(toastTimer);toastTimer=setTimeout(()=>{ui.toast='';render()},3200)}
function fail(k,msg){ui.formErr=msg;ui.errFor=k;render()}
function clearErr(){ui.formErr='';ui.errFor=''}
function markDirty(){ui.dirty=true;const el=document.getElementById('dirty');if(el)el.textContent='Unsaved changes'}
function setPresent(mid,on,by,date){
  const d=date||today(); const doc=S.attendance[d]?clone(S.attendance[d]):{date:d,present:{}};
  if(!doc.present)doc.present={};
  if(on) doc.present[mid]={time:d===today()?nowTime():'',by}; else delete doc.present[mid];
  save('attendance',d,doc);
}
function setOut(mid,on,by,date){
  const d=date||today(), cur=S.attendance[d]; if(!cur||!cur.present||!cur.present[mid]) return;
  const doc=clone(cur), r=doc.present[mid];
  if(on){r.out=nowTime(); if(r.time&&toMin(r.out)<toMin(r.time)) r.out=r.time; r.outBy=by; delete r.noAuto}
  else {delete r.out; delete r.outBy; r.noAuto=true}
  save('attendance',d,doc);
}
function setTimes(mid,date,key,val){
  const cur=S.attendance[date]; if(!cur||!cur.present||!cur.present[mid]) return;
  const doc=clone(cur), r=doc.present[mid];
  if(val) r[key]=val; else delete r[key];
  if(key==='out'){ if(val){r.outBy='owner';delete r.noAuto} else {delete r.outBy;r.noAuto=true} }
  if(r.time&&r.out&&toMin(r.out)<toMin(r.time)){toast('Check-out can’t be before check-in.');render();return}
  save('attendance',date,doc); toast(key==='out'?'Check-out time saved.':'Check-in time saved.');
}
function sweep(){
  if(!ready||authState!=='in') return;
  const t=today(), now=toMin(nowTime()), from=shiftDay(t,-60);
  Object.entries(S.attendance).forEach(([d,doc])=>{
    if(d<from||d>t||!doc||!doc.present) return; let ch=null;
    Object.entries(doc.present).forEach(([mid,r])=>{
      if(!r||!r.time||r.out||r.noAuto) return; const o=autoOutFor(r.time); if(!o) return;
      if(d<t||now>=toMin(o)){ch=ch||clone(doc);ch.present[mid]={...r,out:o,outBy:'auto'}}
    });
    if(ch) save('attendance',d,ch);
  });
}
function loadRoutine(id){
  const r=S.routines[id]; if(!r) return;
  const have=new Set(ui.draft.map(e=>e.exercise.toLowerCase()));
  (r.exercises||[]).forEach(e=>{if(!e.name||have.has(e.name.toLowerCase()))return;
    ui.draft.push({exercise:e.name,sets:[...Array(Math.max(1,+e.sets||1))].map(()=>({kg:e.kg?String(e.kg):'',reps:e.reps?String(e.reps):''}))})});
  markDirty(); render();
}
function addEx(){
  const name=(ui.newEx||'').trim(); if(!name){toast('Choose an exercise first.');return}
  ui.draft.push({exercise:name,sets:[{kg:'',reps:''}]}); ui.newEx=''; markDirty(); render();
  setTimeout(()=>{const el=document.getElementById('kg-'+(ui.draft.length-1)+'-0');if(el)el.focus()},0);
}
function saveWorkout(){
  const mid=ui.memberId, key=mid+'_'+today();
  const entries=ui.draft.map(e=>({exercise:e.exercise,sets:e.sets.filter(s=>s.kg!==''||s.reps!=='').map(s=>({kg:+s.kg||0,reps:+s.reps||0}))})).filter(e=>e.sets.length);
  if(!entries.length){ if(S.logs[key]) remove('logs',key); ui.dirty=false; toast('Nothing to save yet. Add weight or reps to a set first.'); return }
  const before=prsFor(mid);
  save('logs',key,{memberId:mid,date:today(),entries,updatedAt:Date.now()});
  const after=prsFor(mid), news=[];
  Object.keys(after).forEach(k=>{const b=before[k],a=after[k];if(b&&a.top.kg>b.top.kg)news.push(`${a.name} ${kgFmt(a.top.kg)} kg`)});
  ui.draft=entries.map(e=>({exercise:e.exercise,sets:e.sets.map(s=>({kg:String(s.kg),reps:String(s.reps)}))})); ui.dirty=false;
  let msg='Workout saved.';
  if(!isIn(mid)&&!isClosed(today())){setPresent(mid,true,'self');msg+=' You’re checked in for today.'}
  if(news.length) msg+=' New PR: '+news.join(', ')+'!';
  toast(msg);
}
function memberSave(){
  const f=ui.forms.member, name=(f.name||'').trim();
  if(!name) return fail('member','Enter the member’s name.');
  const id=ui.editMember==='new'?uid():ui.editMember, plan=S.plans[f.planId], start=f.startDate||today();
  const old=S.members[id]||{};
  const joined=old.joined||(old.createdAt?ymd(new Date(old.createdAt)):(plan&&start<today()?start:today()));
  save('members',id,{name,phone:(f.phone||'').trim(),planId:plan?f.planId:'',startDate:plan?start:'',endDate:plan?addMonths(start,+plan.months):'',paid:!!f.paid,joined,createdAt:old.createdAt||Date.now()});
  ui.editMember=null; clearErr();
  if(ui.returnProfile){ui.profileId=ui.returnProfile;ui.returnProfile=null}
  toast(old.name?'Member updated.':'Member added.');
}
function renew(id){
  const m=S.members[id], p=S.plans[m.planId]; if(!p) return;
  const start=(m.endDate&&daysBetween(today(),m.endDate)>=0)?shiftDay(m.endDate,1):today();
  const end=addMonths(start,+p.months);
  save('members',id,{...m,joined:joinDate(m)||m.startDate||today(),startDate:start,endDate:end,paid:false});
  toast(`Renewed till ${fmtDate(end)}. Mark the fee as paid once you collect it.`);
}
function planSave(){
  const f=ui.forms.plan, name=(f.name||'').trim(), months=parseInt(f.months,10), price=Number(f.price);
  if(!name) return fail('plan','Enter a plan name.');
  if(!(months>=1)) return fail('plan','Length must be at least 1 month.');
  if(f.price===''||f.price==null||!(price>=0)) return fail('plan','Enter a price of ₹0 or more.');
  const id=ui.editPlan==='new'?uid():ui.editPlan;
  save('plans',id,{name,months,price}); ui.editPlan=null; clearErr(); toast('Plan saved.');
}
function routineSave(){
  const f=ui.forms.routine, name=(f.name||'').trim();
  const exercises=(f.rows||[]).filter(r=>r.name).map(r=>({name:r.name,sets:Math.max(1,parseInt(r.sets,10)||3),reps:Math.max(1,parseInt(r.reps,10)||10),kg:Number(r.kg)>0?Number(r.kg):0}));
  if(!name) return fail('routine','Enter a routine name.');
  if(!exercises.length) return fail('routine','Choose at least one exercise.');
  const id=ui.editRoutine==='new'?uid():ui.editRoutine;
  save('routines',id,{name,exercises}); ui.editRoutine=null; clearErr(); toast('Routine saved.');
}
function exAdd(){
  const f=ui.forms.exercise, name=(f.name||'').trim();
  if(!name) return fail('exercise','Enter an exercise name.');
  const all=Object.values(library()).flat().map(n=>n.toLowerCase());
  if(all.includes(name.toLowerCase())) return fail('exercise','That exercise is already in the list.');
  save('exercises',uid(),{name,muscle:f.muscle||'Other'}); ui.forms.exercise={muscle:f.muscle||'Chest'}; clearErr(); toast('Exercise added to the list.');
}
function wAdd(mid){
  const f=ui.wForm, kg=Number(f.kg), date=f.date||today();
  if(!(kg>20&&kg<350)) return fail('weight','Enter a weight between 20 and 350 kg.');
  if(date>today()) return fail('weight','The date can’t be in the future.');
  const es=weightsOf(mid).filter(e=>e.date!==date); es.push({date,kg:Math.round(kg*10)/10}); es.sort((a,b)=>a.date.localeCompare(b.date));
  save('weights',mid,{memberId:mid,entries:es}); ui.wForm={}; clearErr(); toast('Weight saved.');
}
function settingsSave(){
  const f=ui.forms.settings, pin=(f.pin||'').trim();
  if(pin&&!/^\d{4,6}$/.test(pin)) return fail('settings','The PIN must be 4 to 6 digits, or left empty.');
  save('settings','main',{...(S.settings.main||{}),gymName:(f.gymName||'').trim(),pin}); clearErr(); if(pin) ui.ownerOk=true; toast('Settings saved.');
}
function act(a,v,ds){
  if(!/Del$/.test(a)) ui.armed=null;
  switch(a){
    case 'mode':
      if(v==='owner'){const pin=S.settings.main&&S.settings.main.pin;
        if(pin&&!ui.ownerOk){ui.pinOpen=true;ui.pinVal='';ui.pinErr='';render();setTimeout(()=>{const el=document.getElementById('pin');if(el)el.focus()},0);return}}
      ui.view=v; clearErr(); break;
    case 'pick': ui.q={}; ui.memberId=v; ui.mTab='today'; ui.search=''; ui.draftKey=null; ui.wForm={}; clearErr(); break;
    case 'switch': ui.memberId=null; ui.draftKey=null; ui.dirty=false; ui.newEx=''; ui.wForm={}; break;
    case 'mtab': ui.mTab=v; ui.q={}; clearErr(); break;
    case 'otab': ui.q={}; ui.osearch=''; ui.oTab=v; ui.editMember=ui.editPlan=ui.editRoutine=null; ui.profileId=null; ui.returnProfile=null; clearErr(); ui.forms.settings=null; ui.forms.tpl=null; ui.forms.auto=null; ui.forms.closed=null; ui.forms.brand=null; break;
    case 'checkin': if(isClosed(today())){toast('The gym is closed today, so check-in isn’t available.');return} setPresent(ui.memberId,true,'self'); toast('Checked in. Have a good session!'); return;
    case 'uncheck': setPresent(ui.memberId,false); break;
    case 'closedSave': {const f=ui.forms.closed; save('settings','main',{...(S.settings.main||{}),closed:{weekdays:[...new Set(f.weekdays)].sort(),dates:closedCfg().dates}}); toast(f.weekdays.length?'Closed days saved: '+[1,2,3,4,5,6,0].filter(i=>f.weekdays.includes(i)).map(i=>WD[i]).join(', ')+'.':'Saved. The gym is open every day of the week.'); return}
    case 'closedAdd': {const f=ui.forms.closed, d=f.newDate, c=closedCfg();
      if(!d) return fail('closed','Pick a date first.');
      if(d<today()) return fail('closed','Pick today or a future date.');
      if(c.dates.includes(d)) return fail('closed','That date is already closed.');
      save('settings','main',{...(S.settings.main||{}),closed:{weekdays:c.weekdays,dates:[...c.dates,d].sort()}}); f.newDate=''; clearErr(); toast(fmtDate(d)+' marked as closed.'); return}
    case 'closedRemove': {const c=closedCfg(); save('settings','main',{...(S.settings.main||{}),closed:{weekdays:c.weekdays,dates:c.dates.filter(x=>x!==v)}}); toast(fmtDate(v)+' is open again.'); return}
    case 'checkout': setOut(ui.memberId,true,'self'); toast('Checked out. Great session!'); return;
    case 'uncheckout': setOut(ui.memberId,false); break;
    case 'oout': setOut(v,true,'owner',today()); toast('Checked out.'); return;
    case 'autoSave': {const f=ui.forms.auto||{}, hrs=Number(f.hours);
      if(f.mode==='closing'&&!/^\d{2}:\d{2}$/.test(f.closing||'')) return fail('auto','Choose a check-out time.');
      if(f.mode==='after'&&!(hrs>=0.5&&hrs<=12)) return fail('auto','Hours must be between 0.5 and 12.');
      save('settings','main',{...(S.settings.main||{}),autoOut:{mode:f.mode||'closing',closing:f.closing||'22:00',hours:hrs||3}}); clearErr(); sweep(); toast('Check-out settings saved.'); return}
    case 'omark': setPresent(v,true,'owner',ui.attDate||today()); break;
    case 'ounmark': setPresent(v,false,'owner',ui.attDate||today()); break;
    case 'dayShift': {const n=shiftDay(ui.attDate||today(),+v); ui.attDate=n>today()?today():n; break}
    case 'dayToday': ui.attDate=today(); break;
    case 'profile': ui.q={}; ui.oTab='members'; ui.profileId=v; ui.pTab='attendance'; ui.profMonth=today().slice(0,7); ui.editMember=null; ui.wForm={}; clearErr(); window.scrollTo(0,0); break;
    case 'profBack': ui.profileId=null; break;
    case 'ptab': ui.pTab=v; ui.q={}; clearErr(); break;
    case 'monthShift': {const [y,m]=(ui.profMonth||today().slice(0,7)).split('-').map(Number); const d=new Date(y,m-1+(+v),1); const k=d.getFullYear()+'-'+pad(d.getMonth()+1); ui.profMonth=k>today().slice(0,7)?today().slice(0,7):k; break}
    case 'pToggle': if(v<=today()){const was=isIn(ui.profileId,v);setPresent(ui.profileId,!was,'owner',v);toast(`${fmtDate(v)} marked ${was?'absent':'present'}.`);return} break;
    case 'addSet': {const e=ui.draft[+v], last=e.sets[e.sets.length-1]; e.sets.push({kg:last?last.kg:'',reps:last?last.reps:''}); markDirty(); break}
    case 'delSet': ui.draft[+v].sets.splice(+ds.j,1); if(!ui.draft[+v].sets.length) ui.draft.splice(+v,1); markDirty(); break;
    case 'delEx': ui.draft.splice(+v,1); markDirty(); break;
    case 'addEx': addEx(); return;
    case 'saveWorkout': saveWorkout(); return;
    case 'memberNew': ui.editMember='new'; ui.forms.member={startDate:today(),paid:false,planId:''}; clearErr(); break;
    case 'memberEdit': ui.returnProfile=ui.profileId; ui.editMember=v; ui.forms.member={...S.members[v],startDate:S.members[v].startDate||today()}; clearErr(); window.scrollTo(0,0); break;
    case 'memberSave': memberSave(); return;
    case 'memberDel': if(ui.armed!=='m'+v){ui.armed='m'+v;break} remove('members',v); remove('weights',v); if(ui.profileId===v)ui.profileId=null; ui.armed=null; toast('Member deleted.'); return;
    case 'renew': renew(v); return;
    case 'paid': save('members',v,{...S.members[v],paid:true}); toast('Fee marked as paid.'); return;
    case 'planNew': ui.editPlan='new'; ui.editRoutine=null; ui.forms.plan={}; clearErr(); break;
    case 'planEdit': ui.editPlan=v; ui.editRoutine=null; ui.forms.plan={...S.plans[v]}; clearErr(); break;
    case 'planSave': planSave(); return;
    case 'planDel': if(ui.armed!=='p'+v){ui.armed='p'+v;break} remove('plans',v); ui.armed=null; toast('Plan deleted. Members on it keep their current end date.'); return;
    case 'routineNew': ui.editRoutine='new'; ui.editPlan=null; ui.forms.routine={name:'',rows:[{name:'',sets:'3',reps:'10',kg:''}]}; clearErr(); break;
    case 'routineEdit': {const r=S.routines[v]; ui.editRoutine=v; ui.editPlan=null; ui.forms.routine={name:r.name,rows:(r.exercises||[]).map(e=>({name:e.name,sets:String(e.sets||3),reps:String(e.reps||10),kg:e.kg?String(e.kg):''}))}; clearErr(); break}
    case 'rtAdd': {const rows=ui.forms.routine.rows||(ui.forms.routine.rows=[]); const last=rows[rows.length-1]; rows.push({name:'',sets:last?last.sets:'3',reps:last?last.reps:'10',kg:''}); render(); setTimeout(()=>{const el=document.getElementById('rt-n-'+(rows.length-1));if(el)el.focus()},0); return}
    case 'rtDel': ui.forms.routine.rows.splice(+v,1); break;
    case 'routineSave': routineSave(); return;
    case 'routineDel': if(ui.armed!=='r'+v){ui.armed='r'+v;break} remove('routines',v); ui.armed=null; toast('Routine deleted.'); return;
    case 'exAdd': exAdd(); return;
    case 'exDel': if(ui.armed!=='x'+v){ui.armed='x'+v;break} remove('exercises',v); ui.armed=null; toast('Exercise removed from the list. Past workouts keep it.'); return;
    case 'wAdd': wAdd(v); return;
    case 'wDel': {const es=weightsOf(v).filter(e=>e.date!==ds.d); if(es.length) save('weights',v,{memberId:v,entries:es}); else remove('weights',v); toast('Weight entry deleted.'); return}
    case 'cancel': ui.editMember=ui.editPlan=ui.editRoutine=null; clearErr(); if(ui.returnProfile){ui.profileId=ui.returnProfile;ui.returnProfile=null} break;
    case 'remind': {const m=S.members[v]; if(m) save('members',v,{...m,reminded:{...(m.reminded||{}),[ds.k]:{date:today(),via:ds.via}}}); break}
    case 'copyMsg': copyText(fillMsg(ds.k,{...S.members[v],id:v})); return;
    case 'addPhone': ui.oTab='members'; ui.profileId=null; ui.returnProfile=null; ui.editMember=v; ui.forms.member={...S.members[v],startDate:S.members[v].startDate||today()}; clearErr(); window.scrollTo(0,0); render(); setTimeout(()=>{const el=document.getElementById('fm-phone');if(el)el.focus()},0); return;
    case 'tplToggle': ui.tplOpen=!ui.tplOpen; break;
    case 'tplReset': ui.forms.tpl={...DEFAULT_TPL}; {const main={...(S.settings.main||{})}; delete main.tpl; save('settings','main',main)} clearErr(); toast('Messages reset to default.'); return;
    case 'tplSave': {const f=ui.forms.tpl||{}; if(!(f.unpaid||'').trim()||!(f.ending||'').trim()) return fail('tpl','Both messages need some text.');
      save('settings','main',{...(S.settings.main||{}),tpl:{unpaid:f.unpaid.trim(),ending:f.ending.trim()}}); clearErr(); toast('Reminder messages saved.'); return}
    case 'settingsSave': settingsSave(); return;
    case 'pinSubmit': {const pin=S.settings.main&&S.settings.main.pin;
      if(ui.pinVal===pin){ui.ownerOk=true;ui.pinOpen=false;ui.view='owner';ui.pinVal=''}else{ui.pinErr='That PIN isn’t right. Try again.';ui.pinVal=''}
      break}
    case 'pinCancel': ui.pinOpen=false; ui.pinVal=''; break;
    case 'signin': doSignIn(); return;
    case 'forgot': ui.forgotNote=true; break;
    case 'signout': signOut(); return;
    case 'pwChange': changePassword(); return;
    case 'demoClearDel': if(ui.armed!=='demo'){ui.armed='demo';break} ui.armed=null;
      api('/api/demo/clear',{method:'POST',body:{}}).then(r=>{toast('Sample data cleared ('+r.removed+' records). Add your real members now.');loadAll()},e=>toast(e.status===0?'You\u2019re offline. Try again when connected.':'Couldn\u2019t clear: '+e.message)); return;
    case 'backupJson': backupJson(); return;
    case 'brandSave': {const f=ui.forms.brand; save('settings','main',{...(S.settings.main||{}),brand:{showPowered:!!f.showPowered,poweredName:String(f.poweredName||'').trim(),poweredUrl:String(f.poweredUrl||'').trim(),showMadeBy:!!f.showMadeBy,madeBy:String(f.madeBy||'').trim()}}); toast('Branding saved.'); return}
    case 'brandReset': {ui.forms.brand={...BRAND_DEFAULT}; const main={...(S.settings.main||{})}; delete main.brand; save('settings','main',main); toast('Branding reset to default.'); return}
    case 'exportXlsx': exportXlsx(); return;
    case 'restoreDel': if(ui.armed!=='restore'){ui.armed='restore';break} ui.armed=null; restoreBackup(); return;
    case 'lock': ui.ownerOk=false; ui.view='member'; ui.profileId=null; break;
  }
  render();
}
