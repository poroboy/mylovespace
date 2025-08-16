/***** My Love Space — App JS (MVP Local-first) *****/

// ----- Config -----
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
// hash ของตัวอักษร "C" ด้วย SHA-256 (เปลี่ยนตัวอักษรได้ภายหลัง)
const SECRET_HASH = "6b23c0d5f35d1b11f9b683f0b0a617355deb11277d91ae091d399c655b87940d";
const SESSION_HOURS = 12;

// ----- Utils -----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const todayStr = () => new Date().toISOString().slice(0,10);

function sha256Hex(s) {
  const enc = new TextEncoder().encode(s);
  return crypto.subtle.digest('SHA-256', enc).then(buf =>
    Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
  );
}

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ----- Session Gate -----
async function tryEnterGate() {
  const input = $('#gate-input').value.trim();
  if (!input) return;
  const hit = await sha256Hex(input);
  if (hit === SECRET_HASH) {
    const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
    localStorage.setItem('mls_session_exp', String(exp));
    showApp();
  } else {
    alert('โอ๊ย ไม่ใช่น้าา ลองใหม่อีกที 💗');
  }
}

function checkSession() {
  const exp = Number(localStorage.getItem('mls_session_exp') || 0);
  return Date.now() < exp;
}

function showApp() {
  $('#gate').style.display = 'none';
  document.querySelector('header').style.display = '';
  document.querySelector('main').style.display = '';
  document.querySelector('nav.tabs').style.display = '';

  // init views
  renderStats();
  renderMoments();
  renderGallery();
  renderEvents();
  renderNextEvent();
  renderNote();
}

function showGate() {
  $('#gate').style.display = '';
  document.querySelector('header').style.display = 'none';
  document.querySelector('main').style.display = 'none';
  document.querySelector('nav.tabs').style.display = 'none';
  $('#gate-input').focus();
}

// ----- Nav -----
function switchTab(name) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#${name}`).classList.add('active');
  $$('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  // focus helper
  if (name === 'moments') $('#moment-text').focus();
  if (name === 'gallery') $('#file').value = '';
}

// ----- Data (Local-first) -----
const DB = {
  get moments(){ return readJSON('mls_moments', []); },
  set moments(v){ writeJSON('mls_moments', v); },

  get gallery(){ return readJSON('mls_gallery', []); }, // [{id, dataURL, ts}]
  set gallery(v){ writeJSON('mls_gallery', v); },

  get events(){ return readJSON('mls_events', []); },   // [{id, title, atISO}]
  set events(v){ writeJSON('mls_events', v); },

  get note(){ return localStorage.getItem('mls_note') || ''; },
  set note(v){ localStorage.setItem('mls_note', v); },
};

// ----- HOME -----
function renderStats(){
  const s = `Moments: ${DB.moments.length} • Photos: ${DB.gallery.length} • Events: ${DB.events.length}`;
  $('#stats').textContent = s;
}

function renderNextEvent(){
  const now = Date.now();
  const soon = DB.events
    .map(e => ({...e, t: new Date(e.atISO).getTime()}))
    .filter(e => e.t >= now)
    .sort((a,b) => a.t - b.t)[0];
  $('#next-event').textContent = soon ? `${soon.title} • ${fmt(soon.atISO)}` : 'ยังไม่มีนะ';
}

// ----- MOMENTS -----
function renderMoments(){
  const wrap = $('#moment-list');
  wrap.innerHTML = '';
  const data = [...DB.moments].sort((a,b)=> b.ts - a.ts);
  for (const m of data){
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <h4>${escapeHTML(m.text || '—')}</h4>
      <div class="muted">${m.date || '—'} ${m.tags?.length? '• '+m.tags.join(', ') : ''}</div>
      <div class="row mt8">
        <button class="btn ghost" data-id="${m.id}">ลบ</button>
      </div>`;
    el.querySelector('button').onclick = () => {
      DB.moments = DB.moments.filter(x => x.id !== m.id);
      renderMoments(); renderStats();
    };
    wrap.appendChild(el);
  }
}

$('#btn-add-moment')?.addEventListener('click', () => {
  const text = $('#moment-text').value.trim();
  if (!text) return alert('เขียนสักนิดน้า 💗');
  const date = $('#moment-date').value || todayStr();
  const t1 = $('#moment-tag').value;
  const t2 = $('#moment-newtag').value.trim();
  const tags = [t1, t2].filter(Boolean);
  const rec = { id: crypto.randomUUID(), text, date, tags, ts: Date.now() };
  DB.moments = [...DB.moments, rec];
  $('#moment-text').value = ''; $('#moment-newtag').value = '';
  renderMoments(); renderStats();
});

// ----- GALLERY -----
async function pickAndUpload(){
  const f = $('#file').files?.[0];
  if (!f) return alert('เลือกไฟล์รูปก่อนน้า');
  if (f.size > MAX_FILE_BYTES) return alert('ไฟล์ใหญ่เกิน 5MB');

  const dataURL = await fileToDataURL(f);
  const rec = { id: crypto.randomUUID(), dataURL, ts: Date.now() };
  DB.gallery = [rec, ...DB.gallery];
  renderGallery(); renderStats();
}

function renderGallery(){
  const grid = $('#grid');
  grid.innerHTML = '';
  for (const g of DB.gallery){
    const img = document.createElement('img');
    img.src = g.dataURL;
    img.alt = 'photo';
    img.title = new Date(g.ts).toLocaleString();
    img.onclick = () => {
      if (confirm('ลบรูปนี้ไหม?')){
        DB.gallery = DB.gallery.filter(x => x.id !== g.id);
        renderGallery(); renderStats();
      }
    };
    grid.appendChild(img);
  }
}
$('#btn-upload')?.addEventListener('click', pickAndUpload);

// ----- CALENDAR -----
$('#btn-add-ev')?.addEventListener('click', () => {
  const title = $('#ev-title').value.trim();
  const d = $('#ev-date').value || todayStr();
  const t = $('#ev-time').value || '09:00';
  if (!title) return alert('ใส่ชื่ออีเวนต์ก่อนนะ');
  const atISO = new Date(`${d}T${t}:00`).toISOString();
  DB.events = [...DB.events, { id: crypto.randomUUID(), title, atISO }];
  $('#ev-title').value = '';
  renderEvents(); renderNextEvent(); renderStats();
});

function renderEvents(){
  const wrap = $('#ev-list'); wrap.innerHTML = '';
  const data = [...DB.events].sort((a,b)=> new Date(a.atISO)-new Date(b.atISO));
  for (const e of data){
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<h4>${escapeHTML(e.title)}</h4>
      <div class="muted">${fmt(e.atISO)}</div>
      <div class="row mt8"><button class="btn ghost" data-id="${e.id}">ลบ</button></div>`;
    el.querySelector('button').onclick = () => {
      DB.events = DB.events.filter(x => x.id !== e.id);
      renderEvents(); renderNextEvent(); renderStats();
    };
    wrap.appendChild(el);
  }
}

$('#btn-export-ics')?.addEventListener('click', () => {
  const ics = toICS('My Love Space', DB.events);
  downloadText('mylove-events.ics', ics);
});

// ----- NOTES -----
function renderNote(){
  $('#note').value = DB.note;
  $('#note-preview').innerHTML = `<div class="muted">ตัวอย่าง</div><div class="mt8">${linkify(escapeHTML(DB.note)).replace(/\n/g,'<br>')}</div>`;
}
$('#btn-save-note')?.addEventListener('click', () => { DB.note = $('#note').value; renderNote(); });

// ----- BACKUP -----
$('#btn-backup')?.addEventListener('click', () => {
  const payload = {
    v: 1,
    ts: Date.now(),
    moments: DB.moments,
    gallery: DB.gallery.map(g => ({ id:g.id, ts:g.ts, dataURL:g.dataURL })), // dataURL ติดไปในไฟล์ด้วย
    events: DB.events,
    note: DB.note
  };
  downloadText(`mls-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload));
  alert('สำรองข้อมูลเรียบร้อย ✨\n(ไฟล์ .json โหลดลงเครื่องแล้ว)');
});

// ----- Helpers -----
function escapeHTML(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fileToDataURL(f){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); }); }
function downloadText(name, text){
  const blob = new Blob([text], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
}
function toICS(calName, events){
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0',`X-WR-CALNAME:${calName}`
  ];
  for (const e of events){
    const dt = new Date(e.atISO).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const uid = `${e.id}@mylovespace`;
    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTART:${dt}`, `SUMMARY:${e.title}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR'); return lines.join('\r\n');
}

// ----- Wireup -----
window.addEventListener('DOMContentLoaded', () => {
  // Gate
  $('#gate-enter').addEventListener('click', tryEnterGate);
  $('#gate-input').addEventListener('keydown', (e)=> e.key==='Enter' && tryEnterGate());

  // Tabs
  $$('nav.tabs button').forEach(b => b.addEventListener('click', ()=> switchTab(b.dataset.tab)));

  // Show app or gate
  checkSession() ? showApp() : showGate();
});
