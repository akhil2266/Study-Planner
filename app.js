/* =====================================================
   Study Planner - app.js
   Everything is saved in the browser (localStorage),
   so no server or database is needed.
   ===================================================== */

const STORAGE_KEY = 'studyplanner.v1';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Motivation lines shown on the dashboard and inside the notification menu.
// Add your own lines here, they will be picked up automatically.
const QUOTES = [
  'Small steps every day add up to big results.',
  'You do not need to be perfect. You need to be consistent.',
  'One focused hour today beats five distracted hours tomorrow.',
  'Future you is already thankful for the effort you put in today.',
  'Start now. Motivation follows action, not the other way round.',
  'Hard topics become easy after the third revision.',
  'Do not study until you get it right. Study until you cannot get it wrong.',
  'Your only competition is who you were yesterday.',
  'Discipline is choosing what you want most over what you want right now.',
  'Rest is part of the plan, not a break from it.',
  'Every expert was once confused by the same chapter you are reading.',
  'Finish one task, then the next. Momentum builds itself.',
  'The exam is one day. The knowledge is yours for life.',
  'Be proud of progress, even when it feels slow.',
  'Today a little pain, on exam day a lot of calm.',
  'Break big goals into small tasks and just do the next one.',
  'Phone away, notes open. You can do this.',
  'Mistakes in practice are free. Make them now, not in the exam.',
  'You have survived every hard day so far. This is another one.',
  'Revise, recall, repeat. That is the whole secret.'
];

/* ---------- State (all data lives here) ---------- */

function defaultState() {
  return {
    name: 'Akhil',
    subjects: [],   // {id, name, examDate, priority, color}
    tasks: [],      // {id, title, subjectId, due, priority, done}
    blocks: [],     // {id, day(0-6), start, end, subjectId, topic, auto}
    focus: { date: '', count: 0 },
    theme: 'light',
    quoteIndex: 0,
    lastSummary: ''
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { /* ignore broken data */ }
  return defaultState();
}

let state = loadState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
}

/* ---------- Small helpers ---------- */

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function today() { return toDateStr(new Date()); }

// Escape text before putting it into HTML (stops broken layout / script injection)
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Number of days from today until a YYYY-MM-DD date (negative = past)
function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function fmtDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtTime(t) {                       // "14:30" -> "2:30 PM"
  const [h, m] = t.split(':').map(Number);
  return ((h % 12) || 12) + ':' + pad(m) + ' ' + (h >= 12 ? 'PM' : 'AM');
}

function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fromMin(n) { return pad(Math.floor(n / 60)) + ':' + pad(n % 60); }

function daysLabel(n) {
  if (n < 0) return 'Done';
  if (n === 0) return 'Today!';
  if (n === 1) return 'Tomorrow';
  return n + ' days';
}

function subjectById(id) { return state.subjects.find(s => s.id === id); }
function safeColor(c) { return /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#4f46e5'; }

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------- Navigation between pages ---------- */

const TITLES = {
  dashboard: 'Dashboard',
  subjects: 'Subjects & Exams',
  tasks: 'Tasks',
  schedule: 'Schedule',
  focus: 'Focus Timer'
};

function showView(name) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $('#pageTitle').textContent = TITLES[name];
  $('#sidebar').classList.remove('open');
  window.scrollTo(0, 0);
}

/* ---------- Rendering ---------- */

function render() {
  fillSubjectSelects();
  renderHeader();
  renderDashboard();
  renderSubjects();
  renderTasks();
  renderSchedule();
  renderNotifications();
  $('#focusCount').textContent = focusToday();
}

function renderHeader() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  $('#pageSub').innerHTML = greet + ', <a href="#" id="nameLink" title="Click to change name">' + esc(state.name) + '</a> · ' +
    new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#quoteText').textContent = QUOTES[state.quoteIndex % QUOTES.length];
}

function fillSubjectSelects() {
  const opts = state.subjects.length
    ? state.subjects.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')
    : '<option value="">(add a subject first)</option>';
  ['#tSubject', '#bSubject'].forEach(sel => {
    const el = $(sel);
    const keep = el.value;
    el.innerHTML = opts;
    if (keep && subjectById(keep)) el.value = keep;
  });
}

// One task row, used on the dashboard and on the Tasks page
function taskItem(t) {
  const s = subjectById(t.subjectId);
  const overdue = !t.done && t.due && t.due < today();
  const dueTxt = t.due ? (t.due === today() ? 'Today' : fmtDate(t.due)) : 'No date';
  return `<li class="item ${t.done ? 'is-done' : ''}">
    <button class="check" data-action="toggle-task" data-id="${esc(t.id)}" aria-label="Toggle done">${t.done ? '✓' : ''}</button>
    <div class="item-main">
      <div class="item-title">${esc(t.title)}</div>
      <div class="item-meta">
        ${s ? `<span class="chip" style="--c:${safeColor(s.color)}">${esc(s.name)}</span>` : ''}
        <span class="chip ${overdue ? 'chip-red' : ''}">${overdue ? 'Overdue · ' : ''}${dueTxt}</span>
        <span class="chip prio-${esc(t.priority)}">${esc(t.priority)}</span>
      </div>
    </div>
    <button class="icon-btn" data-action="delete-task" data-id="${esc(t.id)}" title="Delete">✕</button>
  </li>`;
}

function todaysBlocks() {
  const dow = new Date().getDay();
  return state.blocks.filter(b => b.day === dow).sort((a, b) => a.start.localeCompare(b.start));
}

function blockItem(b) {
  const s = subjectById(b.subjectId);
  return `<li class="item">
    <span class="dot" style="background:${safeColor(s ? s.color : '')}"></span>
    <div class="item-main">
      <div class="item-title">${fmtTime(b.start)} – ${fmtTime(b.end)} · ${esc(s ? s.name : 'Study')}</div>
      <div class="item-meta"><span class="muted small">${esc(b.topic || 'Study session')}</span></div>
    </div>
  </li>`;
}

function renderDashboard() {
  const t = today();
  const total = state.tasks.length;
  const done = state.tasks.filter(x => x.done).length;
  const dueToday = state.tasks.filter(x => !x.done && x.due && x.due <= t);

  $('#statTasks').textContent = total ? Math.round((done / total) * 100) + '%' : '0%';
  $('#statToday').textContent = dueToday.length;
  $('#statFocus').textContent = focusToday();

  // Exams sorted by date (only upcoming ones)
  const exams = state.subjects.filter(s => s.examDate && daysUntil(s.examDate) >= 0)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
  $('#statExam').textContent = exams.length ? daysLabel(daysUntil(exams[0].examDate)) : '–';

  $('#dashTasks').innerHTML = dueToday.length
    ? dueToday.map(taskItem).join('')
    : `<li class="empty">${total ? 'Nothing pending for today. Great job! 🎉' : 'No tasks yet. Add one in the Tasks page.'}</li>`;

  const blocks = todaysBlocks();
  $('#dashBlocks').innerHTML = blocks.length
    ? blocks.map(blockItem).join('')
    : '<li class="empty">No study blocks today. Use the Schedule page to add or auto-make a plan.</li>';

  $('#examList').innerHTML = exams.length
    ? exams.map(s => `<li class="item"><span class="dot" style="background:${safeColor(s.color)}"></span>
        <div class="item-main"><div class="item-title">${esc(s.name)}</div>
        <div class="item-meta"><span class="muted small">${fmtDate(s.examDate)}</span></div></div>
        <span class="chip ${daysUntil(s.examDate) <= 3 ? 'chip-red' : ''}">${daysLabel(daysUntil(s.examDate))}</span></li>`).join('')
    : `<li class="empty">No exams added yet.${state.subjects.length ? '' : ' <button class="btn btn-small" data-action="sample">Try sample data</button>'}</li>`;

  $('#progressList').innerHTML = state.subjects.length
    ? state.subjects.map(s => {
        const mine = state.tasks.filter(x => x.subjectId === s.id);
        const d = mine.filter(x => x.done).length;
        const pct = mine.length ? Math.round((d / mine.length) * 100) : 0;
        return `<div class="progress-row"><div class="top"><span>${esc(s.name)}</span><span class="muted">${d}/${mine.length} tasks</span></div>
          <div class="bar"><div class="bar-fill" style="width:${pct}%;background:${safeColor(s.color)}"></div></div></div>`;
      }).join('')
    : '<p class="empty">Add subjects to see your progress.</p>';
}

function renderSubjects() {
  const list = state.subjects.slice().sort((a, b) => (a.examDate || '9999').localeCompare(b.examDate || '9999'));
  $('#subjectList').innerHTML = list.length
    ? list.map(s => {
        const n = state.tasks.filter(x => x.subjectId === s.id).length;
        return `<li class="item"><span class="dot" style="background:${safeColor(s.color)}"></span>
          <div class="item-main"><div class="item-title">${esc(s.name)}</div>
          <div class="item-meta">
            <span class="chip">${s.examDate ? 'Exam ' + fmtDate(s.examDate) + ' (' + daysLabel(daysUntil(s.examDate)) + ')' : 'No exam date'}</span>
            <span class="chip prio-${esc(s.priority)}">${esc(s.priority)}</span>
            <span class="chip">${n} task${n === 1 ? '' : 's'}</span>
          </div></div>
          <button class="icon-btn" data-action="delete-subject" data-id="${esc(s.id)}" title="Delete">✕</button></li>`;
      }).join('')
    : '<li class="empty">No subjects yet. Add your first one above.</li>';
}

let taskFilter = 'all';
function renderTasks() {
  const t = today();
  let list = state.tasks.slice();
  if (taskFilter === 'today') list = list.filter(x => !x.done && x.due && x.due <= t);
  if (taskFilter === 'pending') list = list.filter(x => !x.done);
  if (taskFilter === 'done') list = list.filter(x => x.done);
  // pending first, then earliest due date
  list.sort((a, b) => (a.done - b.done) || (a.due || '9999').localeCompare(b.due || '9999'));
  $('#taskList').innerHTML = list.length ? list.map(taskItem).join('') : '<li class="empty">Nothing here.</li>';
}

function renderSchedule() {
  const dow = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];  // Monday first
  $('#weekGrid').innerHTML = order.map(d => {
    const blocks = state.blocks.filter(b => b.day === d).sort((a, b) => a.start.localeCompare(b.start));
    const inner = blocks.length ? blocks.map(b => {
      const s = subjectById(b.subjectId);
      return `<div class="block" style="--c:${safeColor(s ? s.color : '')}">
        <button class="x" data-action="delete-block" data-id="${esc(b.id)}" title="Remove">✕</button>
        <b>${fmtTime(b.start)} – ${fmtTime(b.end)}</b>${esc(s ? s.name : 'Study')}<br><span class="muted">${esc(b.topic || '')}</span></div>`;
    }).join('') : '<p class="muted small">Free day</p>';
    return `<div class="day-col ${d === dow ? 'is-today' : ''}"><h4>${DAYS[d]}${d === dow ? ' · Today' : ''}</h4>${inner}</div>`;
  }).join('');
}

/* ---------- Notification menu ---------- */

function renderNotifications() {
  const t = today();
  const overdue = state.tasks.filter(x => !x.done && x.due && x.due < t);
  const dueToday = state.tasks.filter(x => !x.done && x.due === t);
  const blocks = todaysBlocks();
  const exams = state.subjects.filter(s => s.examDate && daysUntil(s.examDate) >= 0 && daysUntil(s.examDate) <= 14)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  let html = '';

  // 1) Tasks to finish (with a Done button right inside the menu)
  const taskRow = (x, cls) => {
    const s = subjectById(x.subjectId);
    return `<div class="notif-item ${cls}"><span>${esc(x.title)}${s ? ' <span class="muted small">· ' + esc(s.name) + '</span>' : ''}</span>
      <button class="btn btn-small" data-action="toggle-task" data-id="${esc(x.id)}">Done ✓</button></div>`;
  };
  if (overdue.length || dueToday.length) {
    html += '<div class="notif-sec"><h5>Complete today</h5>' +
      overdue.map(x => taskRow(x, 'red')).join('') + dueToday.map(x => taskRow(x, 'amber')).join('') + '</div>';
  } else {
    html += '<div class="notif-sec"><h5>Tasks</h5><div class="notif-item green">All caught up. Nice work! 🎉</div></div>';
  }

  // 2) Today's study blocks
  if (blocks.length) {
    html += '<div class="notif-sec"><h5>Study plan today</h5>' + blocks.map(b => {
      const s = subjectById(b.subjectId);
      const state_ = nowMin > toMin(b.end) ? 'finished' : (nowMin >= toMin(b.start) ? 'happening now' : 'upcoming');
      return `<div class="notif-item blue"><span>${fmtTime(b.start)} – ${fmtTime(b.end)} · ${esc(s ? s.name : 'Study')}</span><span class="muted small">${state_}</span></div>`;
    }).join('') + '</div>';
  }

  // 3) Exams in the next 14 days
  if (exams.length) {
    html += '<div class="notif-sec"><h5>Exams coming up</h5>' + exams.map(s => {
      const n = daysUntil(s.examDate);
      return `<div class="notif-item ${n <= 3 ? 'red' : 'amber'}"><span>${esc(s.name)}</span><strong>${daysLabel(n)}</strong></div>`;
    }).join('') + '</div>';
  }

  // 4) Motivation
  html += `<div class="notif-sec"><h5>Motivation</h5><div class="notif-quote">${esc(QUOTES[state.quoteIndex % QUOTES.length])}</div></div>`;

  $('#notifBody').innerHTML = html;
  $('#notifDate').textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  // Red badge = tasks to complete + exams within a week
  const count = overdue.length + dueToday.length + exams.filter(s => daysUntil(s.examDate) <= 7).length;
  const badge = $('#badge');
  badge.textContent = count > 9 ? '9+' : count;
  badge.hidden = count === 0;
  updateAlertStatus();
}

function toggleNotifPanel(force) {
  const panel = $('#notifPanel');
  const open = force !== undefined ? force : panel.hidden;
  panel.hidden = !open;
  $('#bellBtn').setAttribute('aria-expanded', String(open));
}

/* ---------- Browser (pop-up) alerts: work while the page is open ---------- */

function alertsSupported() { return 'Notification' in window; }

function updateAlertStatus() {
  const btn = $('#enableAlerts');
  const msg = $('#alertStatus');
  if (!alertsSupported()) { btn.hidden = true; msg.textContent = 'Pop-up alerts not supported here.'; return; }
  if (Notification.permission === 'granted') { btn.hidden = true; msg.textContent = 'Pop-up alerts are ON (keep this tab open).'; }
  else if (Notification.permission === 'denied') { btn.hidden = true; msg.textContent = 'Alerts blocked in browser settings.'; }
  else { btn.hidden = false; msg.textContent = ''; }
}

function popup(title, body) {
  if (alertsSupported() && Notification.permission === 'granted') {
    try { new Notification(title, { body }); } catch (e) { /* some mobile browsers need a service worker */ }
  }
}

const notifiedBlocks = new Set();
function checkReminders() {
  const now = new Date();
  const hhmm = pad(now.getHours()) + ':' + pad(now.getMinutes());
  // Remind when a study block starts
  todaysBlocks().forEach(b => {
    const key = today() + b.id;
    if (b.start === hhmm && !notifiedBlocks.has(key)) {
      notifiedBlocks.add(key);
      const s = subjectById(b.subjectId);
      popup('Time to study: ' + (s ? s.name : 'Study'), b.topic || 'Your study block is starting now.');
      toast('Study time: ' + (s ? s.name : 'Study block') + ' 📚');
    }
  });
  // One summary per day
  if (state.lastSummary !== today() && alertsSupported() && Notification.permission === 'granted') {
    const n = state.tasks.filter(x => !x.done && x.due && x.due <= today()).length;
    if (n > 0) {
      state.lastSummary = today();
      save();
      popup('You have ' + n + ' task' + (n === 1 ? '' : 's') + ' to finish today', QUOTES[state.quoteIndex % QUOTES.length]);
    }
  }
}

/* ---------- Actions (data changes) ---------- */

function addSubject(e) {
  e.preventDefault();
  state.subjects.push({
    id: uid(),
    name: $('#sName').value.trim(),
    examDate: $('#sDate').value,
    priority: $('#sPrio').value,
    color: safeColor($('#sColor').value)
  });
  save();
  e.target.reset();
  $('#sColor').value = '#4f46e5';
  render();
  toast('Subject added');
}

function addTask(e) {
  e.preventDefault();
  if (!$('#tSubject').value) { toast('Add a subject first'); return; }
  state.tasks.push({
    id: uid(),
    title: $('#tTitle').value.trim(),
    subjectId: $('#tSubject').value,
    due: $('#tDue').value,
    priority: $('#tPrio').value,
    done: false
  });
  save();
  $('#tTitle').value = '';
  render();
  toast('Task added');
}

function toggleTask(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  save();
  render();
  if (t.done) toast(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
}

function addBlock(e) {
  e.preventDefault();
  const start = $('#bStart').value, end = $('#bEnd').value;
  if (!$('#bSubject').value) { toast('Add a subject first'); return; }
  if (toMin(end) <= toMin(start)) { toast('End time must be after start time'); return; }
  state.blocks.push({
    id: uid(), day: Number($('#bDay').value), start, end,
    subjectId: $('#bSubject').value, topic: $('#bTopic').value.trim(), auto: false
  });
  save();
  $('#bTopic').value = '';
  render();
  toast('Study block added');
}

// Builds a weekly plan automatically.
// Subjects whose exam is closer appear more often in the rotation.
function autoPlan(e) {
  e.preventDefault();
  const t = today();
  const subs = state.subjects.filter(s => !s.examDate || s.examDate >= t)
    .sort((a, b) => (a.examDate || '9999').localeCompare(b.examDate || '9999'));
  if (!subs.length) { toast('Add a subject first'); return; }

  const rotation = [];
  subs.forEach(s => {
    rotation.push(s);
    if (s.examDate) {
      const d = daysUntil(s.examDate);
      if (d <= 7) rotation.push(s);   // extra slot when the exam is within a week
      if (d <= 3) rotation.push(s);   // and one more within 3 days
    }
  });

  // Pending task titles per subject, used as the block topic
  const pending = {};
  state.tasks.filter(x => !x.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
    .forEach(x => { (pending[x.subjectId] = pending[x.subjectId] || []).push(x.title); });

  const startMin = toMin($('#aStart').value);
  const len = Number($('#aLen').value);
  const per = Number($('#aPer').value);

  state.blocks = state.blocks.filter(b => !b.auto);   // replace the old auto plan
  let idx = 0;
  [1, 2, 3, 4, 5, 6, 0].forEach(day => {
    for (let i = 0; i < per; i++) {
      const s0 = startMin + i * (len + 30);            // 30 min break between sessions
      const s1 = s0 + len;
      if (s1 > 24 * 60 - 1) break;
      const sub = rotation[idx % rotation.length];
      idx++;
      const topics = pending[sub.id] || [];
      state.blocks.push({
        id: uid(), day, start: fromMin(s0), end: fromMin(s1), subjectId: sub.id,
        topic: topics.length ? topics.shift() : 'Revision', auto: true
      });
    }
  });
  save();
  render();
  toast('Weekly plan created');
}

function loadSample() {
  const add = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toDateStr(d); };
  const subs = [
    { id: uid(), name: 'Maths', examDate: add(7), priority: 'high', color: '#ef4444' },
    { id: uid(), name: 'Machine Learning', examDate: add(10), priority: 'high', color: '#4f46e5' },
    { id: uid(), name: 'DBMS', examDate: add(14), priority: 'medium', color: '#16a34a' }
  ];
  state.subjects.push(...subs);
  state.tasks.push(
    { id: uid(), title: 'Revise Unit 1 and 2', subjectId: subs[0].id, due: today(), priority: 'high', done: false },
    { id: uid(), title: 'Solve previous year papers', subjectId: subs[1].id, due: add(1), priority: 'medium', done: false },
    { id: uid(), title: 'Practice SQL queries', subjectId: subs[2].id, due: add(2), priority: 'medium', done: false }
  );
  save();
  render();
  toast('Sample data added. Delete it anytime.');
}

/* ---------- Focus timer (Pomodoro) ---------- */

const timer = { mode: 'focus', total: 25 * 60, remaining: 25 * 60, running: false, endAt: 0, id: null };

function focusToday() { return state.focus.date === today() ? state.focus.count : 0; }

function fmtClock(sec) { return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); }

function drawTimer() {
  $('#timerDisplay').textContent = fmtClock(timer.remaining);
  $('#timerBar').style.width = (100 - (timer.remaining / timer.total) * 100) + '%';
  $('#startBtn').textContent = timer.running ? 'Pause' : 'Start';
  document.title = timer.running ? fmtClock(timer.remaining) + ' · Study Planner' : 'My Study Planner';
}

function setTimerMode(mode) {
  stopTimer();
  timer.mode = mode;
  const mins = Number($(mode === 'focus' ? '#focusMin' : '#breakMin').value) || (mode === 'focus' ? 25 : 5);
  timer.total = mins * 60;
  timer.remaining = timer.total;
  $('#modeFocus').classList.toggle('active', mode === 'focus');
  $('#modeBreak').classList.toggle('active', mode === 'break');
  $('#timerLabel').textContent = mode === 'focus' ? 'Time to focus. One topic at a time.' : 'Take a short break. Stretch and drink water.';
  drawTimer();
}

function stopTimer() {
  clearInterval(timer.id);
  timer.running = false;
}

function toggleTimer() {
  if (timer.running) { stopTimer(); drawTimer(); return; }
  if (timer.remaining <= 0) timer.remaining = timer.total;
  timer.running = true;
  timer.endAt = Date.now() + timer.remaining * 1000;   // use real time so it stays accurate
  timer.id = setInterval(tickTimer, 250);
  drawTimer();
}

function tickTimer() {
  timer.remaining = Math.max(0, Math.round((timer.endAt - Date.now()) / 1000));
  drawTimer();
  if (timer.remaining <= 0) finishTimer();
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 500);
  } catch (e) { /* sound not available */ }
}

function finishTimer() {
  stopTimer();
  beep();
  if (timer.mode === 'focus') {
    if (state.focus.date !== today()) state.focus = { date: today(), count: 0 };
    state.focus.count++;
    save();
    popup('Focus session done!', 'Take a short break. You earned it.');
    toast('Session complete! Take a break 🎉');
    setTimerMode('break');
  } else {
    popup('Break over', 'Ready for the next focus session?');
    toast('Break over. Back to it!');
    setTimerMode('focus');
  }
  renderDashboard();
  $('#focusCount').textContent = focusToday();
}

/* ---------- Backup / restore ---------- */

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'study-planner-backup-' + today() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.subjects) || !Array.isArray(data.tasks)) throw new Error('bad file');
      state = Object.assign(defaultState(), data);
      save();
      applyTheme();
      render();
      toast('Data restored');
    } catch (err) {
      toast('That file is not a valid backup');
    }
  };
  reader.readAsText(file);
}

/* ---------- Theme ---------- */

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  $('#themeBtn').textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

/* ---------- Wire everything up ---------- */

function init() {
  applyTheme();
  $('#tDue').value = today();

  // Page navigation
  $$('.nav-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  // Forms
  $('#subjectForm').addEventListener('submit', addSubject);
  $('#taskForm').addEventListener('submit', addTask);
  $('#blockForm').addEventListener('submit', addBlock);
  $('#autoForm').addEventListener('submit', autoPlan);
  $('#clearAuto').addEventListener('click', () => {
    state.blocks = state.blocks.filter(b => !b.auto);
    save(); render(); toast('Auto blocks removed');
  });

  // Task filters
  $$('.filter-btn[data-filter]').forEach(b => b.addEventListener('click', () => {
    taskFilter = b.dataset.filter;
    $$('.filter-btn[data-filter]').forEach(x => x.classList.toggle('active', x === b));
    renderTasks();
  }));

  // Motivation + theme
  $('#newQuote').addEventListener('click', () => {
    state.quoteIndex = (state.quoteIndex + 1) % QUOTES.length;
    save(); renderHeader(); renderNotifications();
  });
  $('#themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    save(); applyTheme();
  });

  // Notification menu
  $('#bellBtn').addEventListener('click', () => toggleNotifPanel());
  // Close the menu when clicking anywhere outside the bell area.
  // (We do not stop propagation, so the Done buttons inside the menu still work.)
  document.addEventListener('click', (e) => { if (!e.target.closest('.bell-wrap')) toggleNotifPanel(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleNotifPanel(false); });
  $('#enableAlerts').addEventListener('click', () => {
    if (!alertsSupported()) return;
    Notification.requestPermission().then(() => { updateAlertStatus(); checkReminders(); });
  });

  // Clicks on buttons inside lists (done / delete / sample / change name)
  document.addEventListener('click', (e) => {
    const nameLink = e.target.closest('#nameLink');
    if (nameLink) {
      e.preventDefault();
      const n = prompt('Your name:', state.name);
      if (n && n.trim()) { state.name = n.trim().slice(0, 30); save(); renderHeader(); }
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    switch (btn.dataset.action) {
      case 'toggle-task': toggleTask(id); break;
      case 'delete-task':
        state.tasks = state.tasks.filter(x => x.id !== id); save(); render(); break;
      case 'delete-subject':
        if (confirm('Delete this subject and its tasks and study blocks?')) {
          state.subjects = state.subjects.filter(x => x.id !== id);
          state.tasks = state.tasks.filter(x => x.subjectId !== id);
          state.blocks = state.blocks.filter(x => x.subjectId !== id);
          save(); render();
        }
        break;
      case 'delete-block':
        state.blocks = state.blocks.filter(x => x.id !== id); save(); render(); break;
      case 'sample': loadSample(); break;
    }
  });

  // Timer
  $('#startBtn').addEventListener('click', toggleTimer);
  $('#resetBtn').addEventListener('click', () => setTimerMode(timer.mode));
  $('#modeFocus').addEventListener('click', () => setTimerMode('focus'));
  $('#modeBreak').addEventListener('click', () => setTimerMode('break'));
  $('#focusMin').addEventListener('change', () => { if (!timer.running && timer.mode === 'focus') setTimerMode('focus'); });
  $('#breakMin').addEventListener('change', () => { if (!timer.running && timer.mode === 'break') setTimerMode('break'); });

  // Backup
  $('#exportBtn').addEventListener('click', exportData);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  // First draw, then refresh every minute (dates, "happening now", reminders)
  render();
  drawTimer();
  checkReminders();
  setInterval(() => { renderDashboard(); renderNotifications(); renderHeader(); checkReminders(); }, 30000);
}

document.addEventListener('DOMContentLoaded', init);
