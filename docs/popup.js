document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // ── 1) Tab switching ───────────────────────
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.panel).classList.add('active');
    });
  });

  // ── 2) Pomodoro logic ─────────────────────
  const WORK      = 25 * 60;
  const SHORT     =  5 * 60;
  const LONG      = 15 * 60;
  let mode        = 'work';
  let timeLeft    = WORK;
  let duration    = WORK;
  let timerId     = null;
  let cycles      = 0;
  let cyclesBeforeLong = parseInt(localStorage.getItem('cycleCount'), 10) || 4;

  // Progress ring setup
  const circle       = document.querySelector('.progress-ring__circle');
  const radius       = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;

  function setProgress(pct) {
    circle.style.strokeDashoffset =
      circumference - (pct/100)*circumference;
  }
  function formatTime(sec) {
    const m   = Math.floor(sec/60).toString().padStart(2, '0');
    const s   = (sec%60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  function updateUI() {
    $('timer-display').textContent = formatTime(timeLeft);
    $('timer-label').textContent =
      mode === 'work' ? 'Work'
      : mode === 'short-break' ? 'Short Break'
      : 'Long Break';
    setProgress((duration - timeLeft)/duration * 100);
  }
  function tick() {
    if (timeLeft > 0) { timeLeft--; updateUI(); }
    else nextSession();
  }
  function startPause() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
      $('start-pause-button').textContent = 'Start';
    } else {
      timerId = setInterval(tick, 1000);
      $('start-pause-button').textContent = 'Pause';
    }
  }
  function nextSession(auto = true) {
    clearInterval(timerId);
    timerId = null;
    if (mode === 'work') {
      cycles++;
      if (cycles % cyclesBeforeLong === 0) {
        mode     = 'long-break';
        timeLeft = LONG;
      } else {
        mode     = 'short-break';
        timeLeft = SHORT;
      }
    } else {
      mode     = 'work';
      timeLeft = WORK;
    }
    duration = timeLeft;
    updateUI();
    if (auto) {
      notificationAudio.play();
      startPause();
    }
  }

  // ── 3) Quick-timer presets ────────────────
  function loadPresets() {
    const raw = localStorage.getItem('timerPresets');
    const arr = raw ? JSON.parse(raw) : [5, 10, 17, 25];
    const sel = $('timer-presets');
    sel.innerHTML = '';
    arr.forEach(m => sel.add(new Option(`${m} min`, m*60)));
    sel.add(new Option('Custom','custom'));
  }
  loadPresets();

  $('timer-presets').addEventListener('change', () => {
    if ($('timer-presets').value === 'custom') {
      $('custom-preset').classList.remove('hidden');
    } else {
      $('custom-preset').classList.add('hidden');
      const v = Number($('timer-presets').value);
      if (!isNaN(v)) {
        timeLeft = duration = v;
        mode = 'work';
        updateUI();
      }
    }
  });

  $('save-preset').addEventListener('click', () => {
    const m = parseInt($('custom-preset').value, 10);
    if (m > 0) {
      const raw = localStorage.getItem('timerPresets');
      const arr = raw ? JSON.parse(raw) : [5,10,17,25];
      if (!arr.includes(m)) {
        arr.push(m);
        localStorage.setItem('timerPresets', JSON.stringify(arr));
        loadPresets();
      }
    }
  });

  $('start-pause-button').addEventListener('click', () => {
    const sel = $('timer-presets').value;
    if (sel === 'custom') {
      const m = parseInt($('custom-preset').value,10);
      if (m>0) {
        timeLeft = duration = m*60;
        mode = 'work';
        updateUI();
      }
    } else {
      const v = Number(sel);
      if (!isNaN(v)) {
        timeLeft = duration = v;
        mode = 'work';
        updateUI();
      }
    }
    startPause();
  });
  $('skip-button').addEventListener('click', () => nextSession(false));
  updateUI();

  // ── 4) Scheduling ─────────────────────────
  $('add-schedule').addEventListener('click', () => {
    const name  = $('session-name').value || 'Unnamed';
    const start = $('start-time').value;
    const end   = $('end-time').value;
    if (!start || !end) return alert('Please set both times');
    const li = document.createElement('li');
    li.textContent = `${name} — ${start} to ${end}`;
    $('upcoming-sessions-list').appendChild(li);
  });

  // ── 5) Notes ──────────────────────────────
  $('save-note').addEventListener('click', () => {
    const txt = $('notes-input').value.trim();
    if (!txt) return alert('Enter notes');
    const raw = localStorage.getItem('notes');
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ts: Date.now(), note: txt});
    localStorage.setItem('notes', JSON.stringify(arr));
    alert('Saved');
    $('notes-input').value = '';
  });

  // ── 6) Settings ───────────────────────────
  const notificationAudio = new Audio('sounds/notification.mp3');

  $('dark-mode-toggle').addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
  });

  $('cycle-count').addEventListener('change', e => {
    cyclesBeforeLong = parseInt(e.target.value,10) || 4;
    localStorage.setItem('cycleCount', cyclesBeforeLong);
  });

  // ── 7) Ambient & Alerts ───────────────────
  const ambientSounds = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3'),
  };
  Object.values(ambientSounds).forEach(a => {
    a.loop = true;
    a.volume = 0.5;
  });

  $('ambient-volume').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    Object.values(ambientSounds).forEach(a => a.volume = v);
    localStorage.setItem('ambientVol', v);
  });
  $('ambient-select').addEventListener('change', e => {
    Object.values(ambientSounds).forEach(a => {
      a.pause();
      a.currentTime = 0;
    });
    const sel = e.target.value;
    if (ambientSounds[sel]) ambientSounds[sel].play();
    localStorage.setItem('ambientSel', sel);
  });
  $('notification-select').addEventListener('change', e => {
    localStorage.setItem('notificationSel', e.target.value);
  });

  // ── 8) Restore persisted settings ────────
  if (localStorage.getItem('darkMode') === 'true') {
    $('dark-mode-toggle').checked = true;
    document.body.classList.add('dark');
  }
  if (localStorage.getItem('cycleCount')) {
    const v = parseInt(localStorage.getItem('cycleCount'),10);
    if (!isNaN(v)) {
      $('cycle-count').value = v;
      cyclesBeforeLong = v;
    }
  }
  if (localStorage.getItem('ambientSel')) {
    $('ambient-select').value = localStorage.getItem('ambientSel');
  }
  if (localStorage.getItem('ambientVol')) {
    const vol = parseFloat(localStorage.getItem('ambientVol'));
    if (!isNaN(vol)) {
      $('ambient-volume').value = vol;
      $('ambient-volume').dispatchEvent(new Event('input'));
    }
  }
});
