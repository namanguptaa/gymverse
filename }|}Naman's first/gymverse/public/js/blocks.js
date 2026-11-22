/*
 * GymVerse | blocks.js
 * Shared building blocks: calendar, PRs, workout history, body weight.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
/* ---------- shared blocks ---------- */
function calendar(mid,month,interactive){
  const [y,mo]=month.split('-').map(Number), days=new Date(y,mo,0).getDate(), first=(new Date(y,mo-1,1).getDay()+6)%7;
  const t=today(), join=joinDate(S.members[mid]||{});
  let cells='', present=0, absent=0;
  for(let i=0;i<first;i++) cells+='<span></span>';
  for(let d=1;d<=days;d++){
    const k=ymd(new Date(y,mo-1,d)), on=isIn(mid,k), future=k>t, before=join&&k<join;
    let cls='day', state;
    if(on){cls+=' on';present++;const r=recOf(mid,k);state='present'+(r&&r.time?', '+fmtT(r.time)+(r.out?' to '+fmtT(r.out):''):'')}
    else if(isClosed(k)){cls+=' closed';state='gym closed'}
    else if(future){cls+=' pre';state='upcoming'}
    else if(before){cls+=' pre';state='before joining'}
    else if(k===t){state='not checked in yet'}
    else {cls+=' off';absent++;state='absent'}
    if(k===t) cls+=' now';
    const label=`${fmtDate(k)}: ${state}`;
    cells+=interactive&&!future
      ?`<button class="${cls}" data-a="pToggle" data-v="${k}" title="${label}" aria-label="${label}. Tap to change.">${d}</button>`
      :`<span class="${cls}" title="${label}">${d}</span>`;
  }
  return {present,absent,html:`<div class="cal ${interactive?'wide':''}"><div class="dow">${['M','T','W','T','F','S','S'].map(x=>`<span>${x}</span>`).join('')}</div><div class="grid">${cells}</div>
    <div class="legend"><span><i style="background:var(--blue)"></i>Present</span><span><i style="background:var(--red-soft)"></i>Absent</span><span><i style="background:var(--grey-soft);outline:1px dashed var(--muted)"></i>Closed</span></div></div>`};
}
function prsFor(mid){
  const out={};
  for(const l of Object.values(S.logs)){
    if(mid&&l.memberId!==mid) continue;
    for(const e of l.entries||[]){
      const name=(e.exercise||'').trim(), key=name.toLowerCase(); if(!key) continue;
      for(const s of e.sets||[]){
        const kg=+s.kg, r=+s.reps; if(!(kg>0&&r>0)) continue;
        const o=out[key]||(out[key]={name,top:null,e1:null,days:new Set()});
        o.days.add(l.date);
        if(!o.top||kg>o.top.kg||(kg===o.top.kg&&r>o.top.reps)) o.top={kg,reps:r,date:l.date,mid:l.memberId};
        const e1=r===1?kg:kg*(1+r/30);
        if(!o.e1||e1>o.e1.v) o.e1={v:e1,kg,reps:r,date:l.date,mid:l.memberId};
      }
    }
  }
  return out;
}
function prTable(mid){
  const list=Object.values(prsFor(mid)).sort((a,b)=>a.name.localeCompare(b.name));
  if(!list.length) return '<p class="empty-inline">No PRs yet. They appear once workouts with weight and reps are saved.</p>';
  return `<div class="tbl" data-qt="hist"><table><thead><tr><th>Exercise</th><th>Heaviest lift</th><th>Est. 1-rep max</th><th>Sessions</th></tr></thead><tbody>
  ${list.map(p=>`<tr><td class="strong">${esc(p.name)}</td>
    <td><div class="num">${kgFmt(p.top.kg)} kg <small>× ${p.top.reps}</small></div><small class="muted">${fmtDate(p.top.date)}</small></td>
    <td><div class="num">${kgFmt(p.e1.v)} kg</div><small class="muted">from ${kgFmt(p.e1.kg)} kg × ${p.e1.reps}, ${fmtDate(p.e1.date)}</small></td>
    <td>${p.days.size}</td></tr>`).join('')}
  </tbody></table></div>
  <p class="muted small">Est. 1-rep max uses the Epley formula: weight × (1 + reps ÷ 30). It’s a guide and works best for sets of 10 reps or fewer.</p>`;
}
function historyTable(mid,limit){
  let logs=Object.values(S.logs).filter(l=>l.memberId===mid).sort((a,b)=>b.date.localeCompare(a.date));
  if(limit) logs=logs.slice(0,limit);
  if(!logs.length) return '<p class="empty-inline">No workouts saved yet.</p>';
  return `<div class="tbl" data-qt="hist"><table><thead><tr><th>Date</th><th>Exercises and sets (kg × reps)</th><th>Sets</th><th>Volume</th></tr></thead><tbody>
  ${logs.map(l=>{let sets=0,vol=0;const ex=(l.entries||[]).map(e=>{(e.sets||[]).forEach(s=>{sets++;vol+=(+s.kg||0)*(+s.reps||0)});
      return `<div><b>${esc(e.exercise)}</b> <span class="setlist">${(e.sets||[]).map(s=>`${kgFmt(+s.kg||0)}×${s.reps}`).join(', ')}</span></div>`});
    return `<tr><td class="strong" style="white-space:nowrap">${fmtDate(l.date)}</td><td>${ex.join('')}</td><td>${sets}</td><td style="white-space:nowrap">${Math.round(vol).toLocaleString('en-IN')} kg</td></tr>`}).join('')}
  </tbody></table></div><p class="muted small">Volume is weight × reps added up across all sets.</p>`;
}
const weightsOf=mid=>[...((S.weights[mid]&&S.weights[mid].entries)||[])].sort((a,b)=>a.date.localeCompare(b.date));
function weightChart(es){
  const W=640,H=230,L=48,R=18,T=18,B=34;
  const xs=es.map(e=>parseYmd(e.date).getTime()), x0=Math.min(...xs), x1=Math.max(...xs);
  const ys=es.map(e=>e.kg), lo=Math.min(...ys), hi=Math.max(...ys);
  let y0=lo, y1=hi; if(y1-y0<2){const m=(y0+y1)/2;y0=m-1;y1=m+1}
  const p=(y1-y0)*.15; y0-=p; y1+=p;
  const X=t=>L+(x1===x0?.5:(t-x0)/(x1-x0))*(W-L-R), Y=v=>T+(1-(v-y0)/(y1-y0))*(H-T-B);
  const pts=es.map((e,i)=>[X(xs[i]),Y(e.kg)]);
  const grid=[lo,hi].filter((v,i,a)=>a.indexOf(v)===i).map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" style="stroke:var(--line)" stroke-dasharray="4 4"/><text x="${L-8}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end" font-size="13" style="fill:var(--muted)">${kg1(v)}</text>`).join('');
  return `<div class="panel chart"><h3>Body weight over time (kg)</h3><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Body weight from ${kg1(es[0].kg)} kg on ${fmtDate(es[0].date)} to ${kg1(es[es.length-1].kg)} kg on ${fmtDate(es[es.length-1].date)}">
    ${grid}<polyline fill="none" stroke-width="3" stroke-linejoin="round" style="stroke:var(--blue)" points="${pts.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ')}"/>
    ${pts.map((q,i)=>`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4.5" style="fill:var(--surface);stroke:var(--blue)" stroke-width="2.5"><title>${fmtDate(es[i].date)}: ${kg1(es[i].kg)} kg</title></circle>`).join('')}
    <text x="${L}" y="${H-10}" font-size="13" style="fill:var(--muted)">${fmtDate(es[0].date)}</text>
    <text x="${W-R}" y="${H-10}" font-size="13" text-anchor="end" style="fill:var(--muted)">${fmtDate(es[es.length-1].date)}</text></svg></div>`;
}
function weightPanel(mid){
  const es=weightsOf(mid), f=ui.wForm;
  const form=`<div class="panel"><h3>Log body weight</h3><div class="form">
    ${field('Date',`<input id="w-date" type="date" max="${today()}" data-in="wdate" value="${esc(f.date||today())}">`)}
    ${field('Weight (kg)',`<input id="w-kg" type="number" inputmode="decimal" step="0.1" min="0" data-in="wkg" value="${esc(f.kg||'')}" placeholder="e.g. 72.5">`)}
    </div>${errMsg('weight')}<div class="row"><button class="btn primary" data-a="wAdd" data-v="${mid}">Save weight</button></div>
    <p class="muted small" style="margin-bottom:0">Saving a weight for a date that already has one replaces it.</p></div>`;
  if(!es.length) return form+'<p class="empty-inline">No body weight entries yet.</p>';
  const first=es[0], last=es[es.length-1], ws=es.map(e=>e.kg);
  const rows=[...es].reverse();
  return form+`<div class="tbl" style="margin-bottom:18px"><table class="nolead"><thead><tr><th>Current</th><th>Starting</th><th>Change</th><th>Lowest</th><th>Highest</th></tr></thead><tbody>
    <tr><td><div class="num">${kg1(last.kg)} kg</div><small class="muted">${fmtDate(last.date)}</small></td><td><div class="num">${kg1(first.kg)} kg</div><small class="muted">${fmtDate(first.date)}</small></td>
    <td><div class="num">${signed(last.kg-first.kg)}</div></td><td><div class="num">${kg1(Math.min(...ws))} kg</div></td><td><div class="num">${kg1(Math.max(...ws))} kg</div></td></tr></tbody></table></div>
  ${es.length>1?weightChart(es):''}
  <div class="tbl"><table><thead><tr><th>Date</th><th>Weight</th><th>Change from last entry</th><th></th></tr></thead><tbody>
  ${rows.map((e,i)=>{const prev=rows[i+1];return `<tr><td>${fmtDate(e.date)}</td><td class="strong">${kg1(e.kg)} kg</td><td>${prev?signed(e.kg-prev.kg):'<span class="muted">First entry</span>'}</td>
    <td class="right"><button class="x" data-a="wDel" data-v="${mid}" data-d="${e.date}" aria-label="Delete weight for ${fmtDate(e.date)}">×</button></td></tr>`}).join('')}
  </tbody></table></div>`;
}
