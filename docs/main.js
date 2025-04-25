document.addEventListener('DOMContentLoaded', () => {
  // 1) Tab switching
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).classList.add('active');
      updateAll(); // refresh UI when switching
    });
  });

  // 2) Pomodoro logic & UI
  const WORK = 25*60, SHORT = 5*60, LONG = 15*60;
  let mode = 'work', timeLeft = WORK, duration = WORK;
  let timerId = null, cycles = 0;
  let cyclesBeforeLong = parseInt(localStorage.getItem('cycleCount')) || 4;

  const circle = document.querySelector('.progress-ring__circle');
  const r = circle.r.baseVal.value, C = 2*Math.PI*r;
  circle.style.strokeDasharray = `${C} ${C}`;
  circle.style.strokeDashoffset = C;

  const $ = id => document.getElementById(id);

  function setProgress(pct) {
    circle.style.strokeDashoffset = C - pct/100*C;
  }
  function fmt(sec) {
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }
  function updTimerUI() {
    $('timer-display').textContent = fmt(timeLeft);
    $('timer-label').textContent = mode==='work' ? 'Work' :
                                   mode==='short-break' ? 'Short Break' : 'Long Break';
    setProgress((duration - timeLeft)/duration*100);
  }
  function tick() {
    if (timeLeft > 0) {
      timeLeft--;
      updTimerUI();
    } else {
      endSession();
    }
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
  function endSession() {
    clearInterval(timerId);
    timerId = null;
    // record completion
    let arr = JSON.parse(localStorage.getItem('completedSessions') || '[]');
    arr.push(Date.now());
    localStorage.setItem('completedSessions', JSON.stringify(arr));
    // rotate mode
    if (mode==='work') {
      cycles++;
      mode = (cycles % cyclesBeforeLong === 0) ? 'long-break' : 'short-break';
      timeLeft = mode==='long-break' ? LONG : SHORT;
    } else {
      mode = 'work';
      timeLeft = WORK;
    }
    duration = timeLeft;
    updTimerUI();
    // auto-play next
    new Audio('sounds/notification.mp3').play();
    startPause();
  }

  // Quick-presets
  function loadPresets() {
    let arr = JSON.parse(localStorage.getItem('timerPresets') || '[]');
    if (!arr.length) arr = [5,10,17,25];
    $('timer-presets').innerHTML = '';
    arr.forEach(m => {
      const o = new Option(`${m} min`, m*60);
      $('timer-presets').add(o);
    });
    $('timer-presets').add(new Option('Custom','custom'));
  }
  $('timer-presets').addEventListener('change', e => {
    if (e.target.value==='custom') $('custom-preset').classList.remove('hidden');
    else {
      $('custom-preset').classList.add('hidden');
      const v = Number(e.target.value);
      if (!isNaN(v)) {
        duration = timeLeft = v;
        mode = 'work';
        updTimerUI();
      }
    }
  });
  $('save-preset').addEventListener('click', () => {
    const m = parseInt($('custom-preset').value,10);
    if (m>0) {
      let arr = JSON.parse(localStorage.getItem('timerPresets') || '[]');
      if (!arr.includes(m)) {
        arr.push(m);
        localStorage.setItem('timerPresets', JSON.stringify(arr));
        loadPresets();
      }
    }
  });
  loadPresets();

  $('start-pause-button').addEventListener('click', () => {
    const sel = $('timer-presets').value;
    if (sel==='custom') {
      const m = parseInt($('custom-preset').value,10);
      if (m>0) {
        duration = timeLeft = m*60;
        mode = 'work';
        updTimerUI();
      }
    } else {
      const v = Number(sel);
      if (!isNaN(v)) {
        duration = timeLeft = v;
        mode = 'work';
        updTimerUI();
      }
    }
    startPause();
  });
  $('skip-button').addEventListener('click', () => {
    endSession();
  });
  updTimerUI();

  // 3) Schedule
  function loadSchedule() {
    const list = JSON.parse(localStorage.getItem('upcomingSessions')||'[]');
    const ul = $('upcoming-sessions');
    ul.innerHTML='';
    list.forEach(item=>{
      const li = document.createElement('li');
      li.textContent = `${item.name} — ${item.start} to ${item.end}`;
      ul.appendChild(li);
    });
  }
  $('add-schedule').addEventListener('click',()=>{
    const name = $('session-name').value || 'Unnamed';
    const start= $('start-time').value, end = $('end-time').value;
    if (!start||!end) return alert('Please set both times');
    let arr = JSON.parse(localStorage.getItem('upcomingSessions')||'[]');
    arr.push({name,start,end});
    localStorage.setItem('upcomingSessions', JSON.stringify(arr));
    loadSchedule();
  });
  loadSchedule();

  // 4) Notes
  $('save-note').addEventListener('click',()=>{
    const txt = $('notes-input').value.trim();
    if (!txt) return alert('Enter notes');
    let arr = JSON.parse(localStorage.getItem('notes')||'[]');
    arr.push({ts:Date.now(),note:txt});
    localStorage.setItem('notes', JSON.stringify(arr));
    alert('Note saved');
    $('notes-input').value='';
  });

  // 5) Stats
  function loadStats() {
    const arr = JSON.parse(localStorage.getItem('completedSessions')||'[]');
    const now = Date.now();
    const day = 24*3600*1000, week = 7*day, month = 30*day;
    const today = arr.filter(t=> now - t < day ).length;
    const thisWeek = arr.filter(t=> now - t < week ).length;
    const thisMonth = arr.filter(t=> now - t < month ).length;
    $('stats-today').textContent = today;
    $('stats-week').textContent  = thisWeek;
    $('stats-month').textContent = thisMonth;
  }
  loadStats();

  // 6) Settings
  $('dark-mode-toggle').addEventListener('change', e=>{
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
  });
  $('cycle-count').addEventListener('change', e=>{
    cyclesBeforeLong = parseInt(e.target.value,10)||4;
    localStorage.setItem('cycleCount', cyclesBeforeLong);
  });

  // Ambient & alerts
  const ambientSounds = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3'),
  };
  Object.values(ambientSounds).forEach(a=>{ a.loop=true; a.volume=0.5; });

  $('ambient-volume').addEventListener('input', e=>{
    const vol = parseFloat(e.target.value);
    Object.values(ambientSounds).forEach(a=>a.volume=vol);
    localStorage.setItem('ambientVol', vol);
  });
  $('ambient-select').addEventListener('change', e=>{
    Object.values(ambientSounds).forEach(a=>{ a.pause(); a.currentTime=0 });
    const sel = e.target.value;
    if (ambientSounds[sel]) ambientSounds[sel].play();
    localStorage.setItem('ambientSel', sel);
  });
  $('notification-select').addEventListener('change', e=>{
    localStorage.setItem('notificationSound', e.target.value);
  });

  // 7) Restore settings on load
  function restoreSettings() {
    if (localStorage.getItem('darkMode')==='true') {
      $('dark-mode-toggle').checked = true;
      document.body.classList.add('dark');
    }
    const cc = parseInt(localStorage.getItem('cycleCount'));
    if (cc) {
      $('cycle-count').value = cc;
      cyclesBeforeLong = cc;
    }
    const sel = localStorage.getItem('ambientSel');
    if (sel) $('ambient-select').value = sel;
    const vol = localStorage.getItem('ambientVol');
    if (vol!=null) { 
      $('ambient-volume').value = vol; 
      $('ambient-volume').dispatchEvent(new Event('input'));
    }
    const notif = localStorage.getItem('notificationSound');
    if (notif) $('notification-select').value = notif;
  }
  restoreSettings();

  // whenever you switch panels, re-run loadStats etc.
  function updateAll(){
    updTimerUI();
    loadPresets();
    loadSchedule();
    loadStats();
  }
});
