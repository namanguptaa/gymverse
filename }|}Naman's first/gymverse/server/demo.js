/*
 * GymVerse | server/demo.js
 * Builds a sample gym (members, plans, routines, attendance, workouts, body weight)
 * so new owners can explore GymVerse before adding real members.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (C) 2026 Naman and GymVerse contributors. See LICENSE and COPYRIGHT.
 */
'use strict';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const hm = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;

// Small seeded random number generator, so every demo looks the same.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function buildDemo(gymName, now = new Date()) {
  const rand = rng(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const plans = {
    'demo-plan-monthly': { name: 'Monthly', months: 1, price: 1500, demo: true },
    'demo-plan-quarterly': { name: 'Quarterly', months: 3, price: 4000, demo: true },
    'demo-plan-yearly': { name: 'Yearly', months: 12, price: 12000, demo: true },
  };

  const routines = {
    'demo-routine-push': { name: 'Push day', demo: true, exercises: [
      { name: 'Bench press', sets: 4, reps: 8, kg: 50 }, { name: 'Overhead press', sets: 3, reps: 10, kg: 30 },
      { name: 'Incline dumbbell press', sets: 3, reps: 10, kg: 16 }, { name: 'Tricep pushdown', sets: 3, reps: 12, kg: 20 }] },
    'demo-routine-pull': { name: 'Pull day', demo: true, exercises: [
      { name: 'Deadlift', sets: 3, reps: 5, kg: 80 }, { name: 'Lat pulldown', sets: 3, reps: 10, kg: 45 },
      { name: 'Seated cable row', sets: 3, reps: 10, kg: 40 }, { name: 'Barbell curl', sets: 3, reps: 12, kg: 20 }] },
    'demo-routine-legs': { name: 'Leg day', demo: true, exercises: [
      { name: 'Back squat', sets: 4, reps: 6, kg: 70 }, { name: 'Romanian deadlift', sets: 3, reps: 10, kg: 50 },
      { name: 'Leg press', sets: 3, reps: 12, kg: 120 }, { name: 'Standing calf raise', sets: 3, reps: 15, kg: 40 }] },
  };

  const people = [
    ['Aarav Mehta', 'demo-plan-quarterly', 40, true, 1.0],
    ['Priya Nair', 'demo-plan-monthly', 3, false, 0.6],
    ['Rohan Gupta', 'demo-plan-yearly', 220, true, 1.4],
    ['Sneha Iyer', 'demo-plan-monthly', 6, true, 0.5],
    ['Kabir Singh', 'demo-plan-quarterly', 12, false, 1.2],
    ['Ananya Rao', 'demo-plan-monthly', 18, true, 0.5],
    ['Vikram Joshi', 'demo-plan-yearly', 150, true, 1.6],
    ['Meera Kapoor', 'demo-plan-quarterly', 70, true, 0.7],
    ['Arjun Reddy', 'demo-plan-monthly', -4, false, 1.1],
    ['Isha Malhotra', 'demo-plan-monthly', 25, true, 0.55],
  ];

  const members = {};
  people.forEach(([name, planId, daysLeft, paid], i) => {
    const months = plans[planId].months;
    const end = addDays(today, daysLeft);
    const start = new Date(end); start.setMonth(start.getMonth() - months); start.setDate(start.getDate() + 1);
    members[`demo-m${i + 1}`] = {
      name, phone: `98${pad(i + 10)}${String(453210 + i * 7).slice(-6)}`, planId,
      startDate: ymd(start), endDate: ymd(end), paid, joined: ymd(addDays(today, -60 - i * 3)),
      createdAt: now.getTime(), demo: true,
    };
  });

  const attendance = {}; const logs = {}; const weights = {};
  const slots = [6 * 60, 6 * 60 + 30, 7 * 60, 7 * 60 + 15, 8 * 60, 18 * 60, 18 * 60 + 30, 19 * 60, 19 * 60 + 30, 20 * 60];
  const routineList = Object.values(routines);

  for (let back = 30; back >= 1; back--) {
    const day = addDays(today, -back);
    if (day.getDay() === 0) continue; // Sundays closed
    const date = ymd(day); const present = {};
    people.forEach(([, , , , strength], i) => {
      const id = `demo-m${i + 1}`;
      if (rand() > 0.62) return;
      const start = pick(slots) + Math.floor(rand() * 15);
      const length = 45 + Math.floor(rand() * 50);
      present[id] = { time: hm(start), out: hm(start + length), by: rand() > 0.85 ? 'owner' : 'self', outBy: rand() > 0.8 ? 'auto' : 'self' };
      if (rand() > 0.35) {
        const routine = routineList[(back + i) % routineList.length];
        const progress = 1 + (30 - back) * 0.006;
        logs[`${id}_${date}`] = { memberId: id, date, demo: true, updatedAt: now.getTime(), entries: routine.exercises.map((e) => ({
          exercise: e.name,
          sets: Array.from({ length: e.sets }, (_, k) => ({ kg: Math.round((e.kg * strength * progress - k * 2.5) * 2) / 2, reps: e.reps + (k === e.sets - 1 ? -2 : 0) })),
        })) };
      }
    });
    attendance[date] = { date, present, demo: true };
  }

  // Two members are in the gym right now.
  const t = now.getHours() * 60 + now.getMinutes();
  if (today.getDay() !== 0) {
    attendance[ymd(today)] = { date: ymd(today), demo: true, present: {
      'demo-m1': { time: hm(Math.max(0, t - 35)), by: 'self' },
      'demo-m3': { time: hm(Math.max(0, t - 12)), by: 'owner' },
    } };
  }

  ['demo-m1', 'demo-m2', 'demo-m5', 'demo-m8'].forEach((id, i) => {
    let kg = [82, 64, 91, 70][i];
    weights[id] = { memberId: id, demo: true, entries: [28, 21, 14, 7, 1].map((b) => {
      kg += (i === 2 ? -0.6 : -0.3) + (rand() - 0.5) * 0.4;
      return { date: ymd(addDays(today, -b)), kg: Math.round(kg * 10) / 10 };
    }) };
  });

  const settings = { main: {
    gymName: gymName || 'Demo Gym', pin: '', demo: true,
    closed: { weekdays: [0], dates: [] },
    autoOut: { mode: 'closing', closing: '22:00', hours: 3 },
  } };

  return { members, plans, routines, attendance, logs, weights, settings, exercises: {} };
}

module.exports = { buildDemo };
