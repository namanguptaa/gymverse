/*
 * GymVerse | render.js
 * Draws the screen: sign-in, header, footer and responsive table labels.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
let rq=false;
function scheduleRender(){if(rq)return;rq=true;requestAnimationFrame(()=>{rq=false;render()})}
function render(){
  const app=document.getElementById('app');
  const a=document.activeElement, fid=a&&a.id; let ss=null,se=null;
  try{ss=a.selectionStart;se=a.selectionEnd}catch(e){}
  app.innerHTML=view();
  labelTables(app);
  applyQ(app);
  if(fid){const el=document.getElementById(fid);if(el){el.focus({preventScroll:true});try{if(ss!=null)el.setSelectionRange(ss,se)}catch(e){}}}
}
function labelTables(root){
  root.querySelectorAll('table').forEach(t=>{
    if(t.classList.contains('kv')||t.classList.contains('sets')) return;
    const hs=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());
    if(!hs.length) return;
    t.classList.add('stack');
    t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(!td.hasAttribute('colspan'))td.setAttribute('data-label',hs[i]||'')}));
  });
}
function authView(){
  const f=ui.login||(ui.login={email:'',pass:'',pass2:'',gym:''}), setup=authState==='setup';
  return `<div class="login-wrap"><div class="panel login"><span class="mark" aria-hidden="true"></span>
    <h1>GymVerse</h1><p class="muted" style="margin-top:4px">${setup?'Welcome! Create the owner account to get started.':'Owner sign in'}</p>
    <div class="form" style="grid-template-columns:1fr;margin-top:14px">
      ${setup?field('Gym name',`<input id="li-gym" data-in="li" data-k="gym" value="${esc(f.gym)}" placeholder="e.g. TAF Gym" autocomplete="organization">`):''}
      ${field('Email',`<input id="li-email" type="email" autocomplete="username" data-in="li" data-k="email" value="${esc(f.email)}">`)}
      ${field(setup?'Password (at least 8 characters)':'Password',`<input id="li-pass" type="password" autocomplete="${setup?'new-password':'current-password'}" data-in="li" data-k="pass" value="${esc(f.pass)}">`)}
      ${setup?field('Confirm password',`<input id="li-pass2" type="password" autocomplete="new-password" data-in="li" data-k="pass2" value="${esc(f.pass2)}">`):''}
      ${setup?`<label class="check"><input id="li-demo" type="checkbox" data-in="li" data-k="demo" ${f.demo!==false?'checked':''}> Fill with sample data so I can look around first</label>`:''}
    </div>${errMsg('login')}
    ${ui.forgotNote?'<p class="note" style="margin:12px 0 0">To reset the owner password, the person who runs the server can run <b>npm run reset-password</b>. See docs/INSTALL.md.</p>':''}
    <div class="row">${setup?'':'<button class="link" data-a="forgot">Forgot password?</button>'}<button class="btn primary" data-a="signin">${ui.signingIn?'Please wait\u2026':setup?'Create owner account':'Sign in'}</button></div>
    <p class="powered" style="margin-top:18px;text-align:center">Powered by <a href="https://gotomarket.club" target="_blank" rel="noopener">Gotomarket.club</a></p>
    <p class="powered" style="margin-top:4px;text-align:center">GymVerse is free, open-source software. <a href="https://github.com/namanguptaa/gymverse" target="_blank" rel="noopener">Source code</a></p></div></div>`;
}
function demoBar(){
  if(!(S.settings.main&&S.settings.main.demo)) return '';
  const canClear=ui.view==='owner', armed=ui.armed==='demo';
  return `<div class="demo-bar" role="status"><span>You\u2019re exploring sample data. ${canClear?'Clear it when you\u2019re ready to add your real members.':'The owner can clear it from the Owner area.'}</span>
    ${canClear?`<button class="btn sm ${armed?'armed':''}" data-a="demoClearDel">${armed?'Tap again to delete all sample data':'Clear sample data'}</button>`:''}</div>`;
}
function view(){
  if(authState==='error') return `<div class="center"><h2>Couldn\u2019t reach the GymVerse server</h2><p class="muted">Check that the server is running and your connection works, then reload the page.</p></div>`;
  if(authState==='loading') return `<div class="center"><p class="muted">Loading\u2026</p></div>`;
  if(authState==='out'||authState==='setup') return authView();
  if(!ready) return loadErr
    ? `<div class="center"><h2>Couldn’t load gym data</h2><p class="muted">Check your internet connection, then reopen this page.</p></div>`
    : `<div class="center"><p class="muted">Loading gym data…</p></div>`;
  const gym=(S.settings.main&&S.settings.main.gymName)||'My Gym';
  return `<header class="top"><div class="wrap toprow"><div class="brand"><span class="mark" aria-hidden="true"></span><div><h1>${esc(gym)}</h1>
    ${poweredHtml()}
    <p class="muted">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p></div></div>
    <div class="hdr-actions"><nav class="modes" aria-label="Switch area"><button data-a="mode" data-v="member" class="${ui.view==='member'?'on':''}">Members</button><button data-a="mode" data-v="owner" class="${ui.view==='owner'?'on':''}">Owner</button></nav>
    ${ui.view==='owner'?`<button class="btn ghost" data-a="lock">${S.settings.main&&S.settings.main.pin?'Lock':'Close'}</button>`:''}</div></div>
    <div class="plates" aria-hidden="true"><span></span><span></span><span></span><span></span></div></header>
  ${online?'':'<div class="offline" role="status">You\u2019re offline. Changes are saved on this device and will sync when the connection is back.</div>'}
  ${demoBar()}
  <main class="wrap">${ui.view==='member'?memberArea():ownerArea()}</main>
  ${footHtml()}
  ${ui.pinOpen?pinModal():''}${ui.toast?`<div class="toast" role="status">${esc(ui.toast)}</div>`:''}`;
}
