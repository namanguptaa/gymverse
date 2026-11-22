/*
 * GymVerse | state.js
 * App state, built-in exercise list and small helpers.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
const COLS=['members','plans','routines','attendance','logs','settings','exercises','weights'];
const S={}; COLS.forEach(c=>S[c]={});
// authState: 'loading' | 'setup' (first run, no owner yet) | 'out' (signed out) | 'in' | 'error'
let ready=false, loadErr=false, authState='loading', user=null, online=true;
const ui={view:'member',memberId:null,mTab:'today',oTab:'today',draft:[],draftKey:null,dirty:false,newEx:'',
  search:'',osearch:'',pinOpen:false,pinVal:'',pinErr:'',ownerOk:false,armed:null,
  editMember:null,editPlan:null,editRoutine:null,returnProfile:null,formErr:'',errFor:'',
  forms:{member:{},plan:{},routine:{rows:[]},settings:null,exercise:{muscle:'Chest'},pw:{}},
  attDate:null,q:{},profileId:null,pTab:'attendance',profMonth:null,wForm:{},toast:''};

/* ---------- built-in exercise list ---------- */
const LIB={
  'Chest':['Bench press','Incline bench press','Decline bench press','Dumbbell bench press','Incline dumbbell press','Dumbbell fly','Cable crossover','Pec deck','Push-up','Chest dips'],
  'Back':['Deadlift','Pull-up','Chin-up','Lat pulldown','Barbell row','Dumbbell row','Seated cable row','T-bar row','Face pull','Back extension'],
  'Shoulders':['Overhead press','Dumbbell shoulder press','Arnold press','Lateral raise','Front raise','Rear delt fly','Upright row','Barbell shrug','Dumbbell shrug'],
  'Legs':['Back squat','Front squat','Goblet squat','Leg press','Romanian deadlift','Walking lunge','Bulgarian split squat','Leg extension','Leg curl','Hip thrust','Standing calf raise','Seated calf raise'],
  'Arms':['Barbell curl','Dumbbell curl','Hammer curl','Preacher curl','Cable curl','Tricep pushdown','Skull crusher','Overhead tricep extension','Close-grip bench press','Bench dips'],
  'Core':['Plank','Crunch','Hanging leg raise','Cable crunch','Russian twist','Ab wheel rollout','Side plank']
};
const MUSCLES=Object.keys(LIB);
const LIB_COUNT=MUSCLES.reduce((n,m)=>n+LIB[m].length,0);

/* ---------- helpers ---------- */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>ymd(new Date());
const parseYmd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const daysBetween=(a,b)=>Math.round((parseYmd(b)-parseYmd(a))/86400000);
function addMonths(s,n){const d=parseYmd(s);const y=d.getFullYear(),m=d.getMonth()+n,day=d.getDate();const last=new Date(y,m+1,0).getDate();const e=new Date(y,m,Math.min(day,last));e.setDate(e.getDate()-1);return ymd(e)}
function shiftDay(s,n){const d=parseYmd(s);d.setDate(d.getDate()+n);return ymd(d)}
const nowTime=()=>{const d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())};
const fmtDate=s=>s?parseYmd(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—';
const fmtDay=s=>parseYmd(s).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
const fmtMonth=s=>parseYmd(s+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'});
const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const kgFmt=n=>(Math.round(n*2)/2).toString();
const kg1=n=>(Math.round(n*10)/10).toString();
const signed=n=>{const r=Math.round(n*10)/10;return (r>0?'+':r<0?'−':'')+Math.abs(r)+' kg'};
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
const sortedMembers=()=>Object.entries(S.members).map(([id,m])=>({...m,id})).filter(m=>m.name).sort((a,b)=>a.name.localeCompare(b.name));
const sortedPlans=()=>Object.entries(S.plans).map(([id,p])=>({...p,id})).sort((a,b)=>(a.months-b.months)||a.name.localeCompare(b.name));
const sortedRoutines=()=>Object.entries(S.routines).map(([id,r])=>({...r,id})).sort((a,b)=>a.name.localeCompare(b.name));
const isIn=(mid,d)=>{const a=S.attendance[d||today()];return !!(a&&a.present&&a.present[mid])};
const field=(label,inner,cls)=>`<label class="field ${cls||''}"><span>${label}</span>${inner}</label>`;
const empty=(t,p)=>`<section class="empty"><h2>${t}</h2><p class="muted">${p}</p></section>`;
const errMsg=k=>ui.formErr&&ui.errFor===k?`<p class="err">${esc(ui.formErr)}</p>`:'';
const ini=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?';
const qBox=(key,ph)=>`<div class="qbox"><input id="q-${key}" class="search" type="search" placeholder="${ph}" data-q="${key}" value="${esc(ui.q[key]||'')}" autocomplete="off" aria-label="${ph}"></div>`;
function applyQ(root){
  root.querySelectorAll('[data-qt]').forEach(el=>{
    const q=(ui.q[el.dataset.qt]||'').toLowerCase().trim(); let shown=0, total=0;
    el.querySelectorAll('tbody tr').forEach(tr=>{total++;const hit=!q||tr.textContent.toLowerCase().includes(q);tr.classList.toggle('qhide',!hit);if(hit)shown++});
    const det=el.closest('details'); if(det&&q&&shown) det.open=true;
    let n=el.nextElementSibling&&el.nextElementSibling.classList.contains('qnone')?el.nextElementSibling:null;
    if(q&&total&&!shown){if(!n){n=document.createElement('p');n.className='empty-inline qnone';el.after(n)}n.textContent='Nothing matches \u201c'+(ui.q[el.dataset.qt]||'').trim()+'\u201d here.';el.classList.add('qhide')}
    else{el.classList.remove('qhide');if(n)n.remove()}
  });
}
const nameBtn=m=>`<button class="namebtn" data-a="profile" data-v="${m.id}">${esc(m.name)}</button>`;
const BRAND_DEFAULT={showPowered:true,poweredName:'Gotomarket.club',poweredUrl:'https://gotomarket.club',showMadeBy:true,madeBy:'Naman'};
function brandCfg(){return {...BRAND_DEFAULT,...((S.settings.main&&S.settings.main.brand)||{})}}
function safeUrl(u){u=String(u||'').trim();if(!u)return '';return /^https?:\/\//i.test(u)?u:'https://'+u}
function poweredHtml(){const b=brandCfg();if(!b.showPowered||!String(b.poweredName||'').trim())return '';const u=safeUrl(b.poweredUrl);return `<p class="powered">Powered by ${u?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(b.poweredName)}</a>`:esc(b.poweredName)}</p>`}
function footHtml(){const b=brandCfg();return b.showMadeBy&&String(b.madeBy||'').trim()?`<footer class="foot wrap">Made with <span class="heart" aria-label="love">♥</span> by ${esc(b.madeBy)}</footer>`:''}
function joinDate(m){return m.joined||(m.createdAt?ymd(new Date(m.createdAt)):'')}
const toMin=s=>{const [hh,mm]=String(s||'0:0').split(':').map(Number);return (hh||0)*60+(mm||0)};
const fromMin=n=>{n=Math.max(0,Math.min(1439,Math.round(n)));return pad(Math.floor(n/60))+':'+pad(n%60)};
const fmtT=s=>{if(!s)return '—';const m=toMin(s),hr=Math.floor(m/60);return ((hr%12)||12)+':'+pad(m%60)+' '+(hr<12?'am':'pm')};
const fmtDur=n=>n==null?'—':n<60?n+' min':Math.floor(n/60)+' h'+(n%60?' '+(n%60)+' min':'');
const recOf=(mid,d)=>{const a=S.attendance[d||today()];return (a&&a.present&&a.present[mid])||null};
const durOf=r=>r&&r.time&&r.out?Math.max(0,toMin(r.out)-toMin(r.time)):null;
const sinceIn=r=>r&&r.time?Math.max(0,toMin(nowTime())-toMin(r.time)):null;
function autoCfg(){const a=(S.settings.main&&S.settings.main.autoOut)||{};return {mode:a.mode||'closing',closing:a.closing||'22:00',hours:+a.hours||3}}
function autoOutFor(time){const c=autoCfg(),tin=toMin(time);if(c.mode==='off')return null;if(c.mode==='after')return fromMin(tin+c.hours*60);const cl=toMin(c.closing);return cl>tin?c.closing:fromMin(tin+180)}
const WD=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function closedCfg(){const c=(S.settings.main&&S.settings.main.closed)||{};return {weekdays:Array.isArray(c.weekdays)?c.weekdays:[0],dates:Array.isArray(c.dates)?c.dates:[]}}
function isClosed(d){const c=closedCfg();return c.weekdays.includes(parseYmd(d).getDay())||c.dates.includes(d)}
function autoText(){const c=autoCfg();return c.mode==='off'?'':c.mode==='after'?'after '+plural(c.hours,'hour'):'at '+fmtT(c.closing)}

function statusOf(m){
  if(!m.endDate) return {label:'No plan',cls:'grey',left:null};
  const left=daysBetween(today(),m.endDate);
  if(left<0) return {label:'Expired',cls:'red',left};
  if(left<=7) return {label:left===0?'Ends today':'Ends in '+plural(left,'day'),cls:'yellow',left};
  return {label:'Active',cls:'green',left};
}
function knownExtra(){
  const set=new Set();
  Object.values(S.routines).forEach(r=>(r.exercises||[]).forEach(e=>e.name&&set.add(e.name)));
  Object.values(S.logs).forEach(l=>(l.entries||[]).forEach(e=>e.exercise&&set.add(e.exercise)));
  return set;
}
function library(){
  const g={}, seen=new Set();
  MUSCLES.forEach(m=>{g[m]=[...LIB[m]];LIB[m].forEach(n=>seen.add(n.toLowerCase()))});
  Object.values(S.exercises).forEach(e=>{if(!e.name||seen.has(e.name.toLowerCase()))return;const m=MUSCLES.includes(e.muscle)?e.muscle:'Other';(g[m]=g[m]||[]).push(e.name);seen.add(e.name.toLowerCase())});
  knownExtra().forEach(n=>{if(seen.has(n.toLowerCase()))return;(g.Other=g.Other||[]).push(n);seen.add(n.toLowerCase())});
  Object.values(g).forEach(l=>l.sort((a,b)=>a.localeCompare(b)));
  return g;
}
function exOptions(selected){
  return Object.entries(library()).map(([m,list])=>`<optgroup label="${esc(m)}">${list.map(n=>`<option value="${esc(n)}" ${n===selected?'selected':''}>${esc(n)}</option>`).join('')}</optgroup>`).join('');
}
