/*
 * GymVerse | events.js
 * Clicks, typing, keyboard shortcuts and timers (idle lock, auto check-out).
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
/* ---------- events ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;
  if(b.tagName==='A'){const d={...b.dataset};setTimeout(()=>act(d.a,d.v,d),0);return}
  e.preventDefault();act(b.dataset.a,b.dataset.v,b.dataset)});
function onIn(e){
  const t=e.target, k=t.dataset&&t.dataset.in; if(!k) return;
  if(k==='kg'||k==='reps'){const s=ui.draft[+t.dataset.i]&&ui.draft[+t.dataset.i].sets[+t.dataset.j];if(s){s[k]=t.value;markDirty()}return}
  if(k==='f'){ui.forms[t.dataset.f][t.dataset.k]=t.type==='checkbox'?t.checked:t.value;if(t.dataset.f==='auto'&&t.dataset.k==='mode')render();return}
  if(k==='rt'){const r=ui.forms.routine.rows[+t.dataset.i];if(r)r[t.dataset.k]=t.value;return}
  if(k==='newEx'){ui.newEx=t.value;return}
  if(k==='pin'){ui.pinVal=t.value;return}
  if(k==='wkg'){ui.wForm.kg=t.value;return}
  if(k==='li'){ui.login[t.dataset.k]=t.type==='checkbox'?t.checked:t.value;return}
  if(k==='cldate'){ui.forms.closed.newDate=t.value;return}
  if(k==='wdate'){ui.wForm.date=t.value;return}
  if(k==='attDate'){if(t.value){ui.attDate=t.value>today()?today():t.value;render()}return}
  if(k==='search'||k==='osearch'){ui[k]=t.value;if(k==='osearch')ui.q.att=t.value;render();return}
}
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.q!=null){ui.q[t.dataset.q]=t.value;applyQ(document);return}onIn(e)});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.wd!=null){const w=+t.dataset.wd,a=ui.forms.closed.weekdays,i=a.indexOf(w);if(t.checked&&i<0)a.push(w);if(!t.checked&&i>=0)a.splice(i,1);return}if(t.dataset&&t.dataset.tt){setTimes(t.dataset.v,ui.attDate||today(),t.dataset.tt,t.value);return}if(t.dataset&&t.dataset.ch==='routine'){loadRoutine(t.value);return}if(t.type==='checkbox'||t.tagName==='SELECT')onIn(e)});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&ui.pinOpen){ui.pinOpen=false;render();return}
  if(e.key!=='Enter')return; const id=e.target.id;
  if(id==='pin'){e.preventDefault();act('pinSubmit')}
  else if(/^li-/.test(id)){e.preventDefault();doSignIn()}
  else if(id==='w-kg'){e.preventDefault();const b=document.querySelector('[data-a="wAdd"]');if(b)act('wAdd',b.dataset.v,b.dataset)}
  else if(id==='fe-name'){e.preventDefault();exAdd()}
});

/* Shared-device safety: return to the name list when idle, lock owner area */
let lastPoke=Date.now(), lastDay=today();
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{lastPoke=Date.now()},true));
setInterval(()=>{
  const idle=Date.now()-lastPoke;
  if(ui.view==='member'&&ui.memberId&&!ui.dirty&&idle>3*60e3){ui.memberId=null;ui.draftKey=null;ui.newEx='';ui.wForm={};render()}
  if(ui.view==='owner'&&S.settings.main&&S.settings.main.pin&&idle>5*60e3){ui.ownerOk=false;ui.view='member';ui.profileId=null;render()}
  if(today()!==lastDay){lastDay=today();ui.draftKey=null;ui.attDate=null;render()}
  sweep();
  const ae=document.activeElement, typing=ae&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName);
  if(!typing&&!ui.pinOpen&&((ui.view==='member'&&ui.memberId&&ui.mTab==='today')||(ui.view==='owner'&&ui.oTab==='today'))) render();
},15000);
