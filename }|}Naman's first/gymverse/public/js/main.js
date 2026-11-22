/*
 * GymVerse | main.js
 * Starts the app: checks the server, signs in or runs first-time setup.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
async function doSignIn(){
  const f=ui.login||{}, em=(f.email||'').trim(), setup=authState==='setup';
  if(setup&&!(f.gym||'').trim()) return fail('login','Enter your gym\u2019s name.');
  if(!em||!f.pass) return fail('login','Enter your email and password.');
  if(setup&&f.pass.length<8) return fail('login','Use a password with at least 8 characters.');
  if(setup&&f.pass!==f.pass2) return fail('login','The two passwords don\u2019t match.');
  ui.signingIn=true; clearErr(); render();
  try{
    const r=setup?await api('/api/setup',{method:'POST',body:{email:em,password:f.pass,gymName:f.gym.trim(),demo:f.demo!==false}})
                 :await api('/api/login',{method:'POST',body:{email:em,password:f.pass}});
    ui.signingIn=false; ui.login={email:em,pass:'',pass2:'',gym:''}; ui.forgotNote=false;
    startSession(r.user);
  }catch(e){
    ui.signingIn=false;
    fail('login',e.status===0?'Can\u2019t reach the server. Check your connection.':e.status===429?'Too many tries. Wait 15 minutes and try again.':setup?e.message:'Wrong email or password.');
  }
}
function startSession(u){user=u;authState='in';ui.view='member';ui.ownerOk=false;ui.memberId=null;loadAll()}
async function signOut(){
  if(outbox.length&&!confirmLeave()) return;
  try{await api('/api/logout',{method:'POST',body:{}})}catch(e){}
  stopPolling(); COLS.forEach(c=>S[c]={}); outbox=[]; persistOutbox(); user=null; ready=false;
  authState='out'; render();
}
function confirmLeave(){return window.confirm('Some changes haven\u2019t reached the server yet. Sign out anyway and lose them?')}
async function changePassword(){
  const f=ui.forms.pw||{};
  if(!f.cur||!f.next) return fail('pw','Fill in both password boxes.');
  if(f.next.length<8) return fail('pw','Use a new password with at least 8 characters.');
  try{await api('/api/password',{method:'POST',body:{current:f.cur,next:f.next}});ui.forms.pw={};clearErr();toast('Password changed.')}
  catch(e){fail('pw',e.status===403?'The current password isn\u2019t right.':e.status===0?'You\u2019re offline.':e.message)}
}
async function boot(){
  render();
  try{
    const s=await api('/api/status');
    ui.version=s.version||'';
    if(s.user) return startSession(s.user);
    authState=s.needsSetup?'setup':'out'; render();
  }catch(e){authState='error';render();setTimeout(boot,5000)}
}
boot();
