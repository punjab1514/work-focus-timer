// popup.js — for PWA
document.addEventListener('DOMContentLoaded', () => {
  // durations
  const WORK_DUR    = 25 * 60;
  const SHORT_BREAK =  5 * 60;
  const LONG_BREAK  = 15 * 60;

  // state
  let mode                   = 'work';
  let timeLeft               = WORK_DUR;
  let currentSessionDuration = WORK_DUR;
  let timerId                = null;
  let isRunning              = false;
  let cycleCount             = 0;
  let userCycleCount         = 4;
  let history                = JSON.parse(localStorage.getItem('sessionHistory') || '[]');

  // helpers
  const $ = id => document.getElementById(id);
  function formatTime(s) {
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const sec = (s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
  }

  // ring setup
  const circle      = document.querySelector('.progress-ring__circle');
  const radius      = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;
  function setProgress(pct) {
    circle.style.strokeDashoffset = circumference - (pct/100)*circumference;
  }

  // load audio via relative paths
  const ambientSounds = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3')
  };
  const notificationSound = new Audio('sounds/notification.mp3');
  Object.values(ambientSounds).forEach(a=>{ a.loop=true; a.volume=0.5; });

  // DOM refs
  const startBtn    = $('start-pause-button');
  const skipBtn     = $('skip-button');
  const labelEl     = $('timer-label');
  const displayEl   = $('timer-display');
  const presets     = $('timer-presets');
  const customInput = $('custom-preset');
  const savePreset  = $('save-preset');
  const ambientSel  = $('ambient-select');
  const ambientVol  = $('ambient-volume');
  const notifSel    = $('notification-select');
  const darkToggle  = $('dark-mode-toggle');
  const cycleInput  = $('cycle-count');
  const upcomingUL  = $('upcoming-sessions-list');
  const notesInput  = $('notes-input');
  const saveNoteBtn = $('save-note');
  const addSched    = $('add-schedule');

  // UI update
  function updateUI() {
    displayEl.textContent = formatTime(timeLeft);
    const pct = ((currentSessionDuration - timeLeft) / currentSessionDuration) * 100;
    setProgress(pct);
    labelEl.textContent = mode==='work'
      ? 'Work'
      : mode==='short-break'
        ? 'Short Break'
        : 'Long Break';
  }

  // next session
  function nextSession(auto=true) {
    clearInterval(timerId);
    isRunning = false;
    if (mode==='work') {
      cycleCount++;
      mode = (cycleCount % userCycleCount===0) ? 'long-break':'short-break';
      timeLeft = (mode==='long-break') ? LONG_BREAK:SHORT_BREAK;
    } else {
      mode = 'work';
      timeLeft = WORK_DUR;
    }
    currentSessionDuration = timeLeft;
    updateUI();
    startBtn.textContent = 'Start';
    if (auto) {
      notificationSound.play();
      startTimer();
    }
  }

  // tick
  function tick() {
    if (timeLeft>0) {
      timeLeft--;
      updateUI();
    } else {
      nextSession();
    }
  }

  // start/pause
  function startTimer() {
    if (!isRunning) {
      timerId = setInterval(tick,1000);
      startBtn.textContent='Pause';
    } else {
      clearInterval(timerId);
      startBtn.textContent='Start';
    }
    isRunning = !isRunning;
  }

  // handlers
  startBtn.addEventListener('click', () => {
    // pick preset vs custom
    if (presets.value==='custom') {
      const m = parseInt(customInput.value,10);
      if (m>0) {
        timeLeft = currentSessionDuration = m*60;
        mode='work';
        updateUI();
      }
    } else {
      const secs = Number(presets.value);
      if (!isNaN(secs)) {
        timeLeft = currentSessionDuration = secs;
        mode='work';
        updateUI();
      }
    }
    startTimer();
  });
  skipBtn.addEventListener('click', ()=>nextSession(false));

  // presets load/save
  function loadPresets() {
    const arr = JSON.parse(localStorage.getItem('timerPresets')||'[5,10,17,25]');
    presets.innerHTML = '';
    arr.forEach(m=> presets.add(new Option(`${m} min`,m*60)));
    presets.add(new Option('Custom','custom'));
  }
  loadPresets();
  presets.addEventListener('change', ()=>{
    if (presets.value==='custom') customInput.style.display='block';
    else {
      customInput.style.display='none';
      const secs = Number(presets.value);
      if (!isNaN(secs)) {
        timeLeft = currentSessionDuration = secs;
        updateUI();
      }
    }
  });
  savePreset.addEventListener('click', ()=>{
    const m = parseInt(customInput.value,10);
    if (m>0) {
      const arr = JSON.parse(localStorage.getItem('timerPresets')||'[]');
      if (!arr.includes(m)) {
        arr.push(m);
        localStorage.setItem('timerPresets', JSON.stringify(arr));
        loadPresets();
      }
    }
  });

  // scheduling (unchanged)
  addSched.addEventListener('click', () => {
    const name  = $('session-name').value||'Unnamed';
    const start = $('start-time').value;
    const end   = $('end-time').value;
    if (!start||!end) { alert('Please set both times'); return; }
    const li = document.createElement('li');
    li.textContent=`${name} — ${start} to ${end}`;
    upcomingUL.appendChild(li);
    // notify 5min prior
    const [h,m] = start.split(':').map(Number);
    const dt = new Date();
    dt.setHours(h,m,0,0);
    const delay = dt.getTime() - Date.now() - 5*60*1000;
    if (delay>0) setTimeout(()=>{
      new Notification('Session reminder', { body:`${name} at ${start}` });
    }, delay);
    alert('Scheduled');
  });

  // session notes
  saveNoteBtn.addEventListener('click', ()=>{
    const txt = notesInput.value.trim()||'';
    history.push({ at:Date.now(), note: txt });
    localStorage.setItem('sessionHistory', JSON.stringify(history));
    notesInput.value='';
    alert('Note saved');
  });

  // productivity insights
  function updateInsights() {
    $('stats-today').textContent = history.filter(h=>{
      const d=new Date(h.at), t=new Date();
      return d.toDateString()===t.toDateString();
    }).length;
    // week/month counts… similar logic
  }
  updateInsights();

  // ambient sounds & alerts
  ambientVol.addEventListener('input', ()=>{
    const v=+ambientVol.value;
    Object.values(ambientSounds).forEach(a=>a.volume=v);
    localStorage.setItem('ambientVol', v);
  });
  ambientSel.addEventListener('change', ()=>{
    Object.values(ambientSounds).forEach(a=>{ a.pause(); a.currentTime=0; });
    const sel=ambientSel.value;
    if (ambientSounds[sel]) ambientSounds[sel].play();
    localStorage.setItem('ambientSel', sel);
  });
  notifSel.addEventListener('change', ()=>{
    localStorage.setItem('notifSel', notifSel.value);
  });

  // dark mode & cycles
  darkToggle.addEventListener('change', e=>{
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
  });
  cycleInput.addEventListener('change', e=>{
    const v = +e.target.value;
    if (v>0) {
      userCycleCount=v;
      localStorage.setItem('cycleCount', v);
    }
  });

  // initialize UI & restore prefs
  if (localStorage.getItem('ambientSel')) {
    ambientSel.value=localStorage.getItem('ambientSel');
    ambientSel.dispatchEvent(new Event('change'));
  }
  if (localStorage.getItem('ambientVol')) {
    ambientVol.value=localStorage.getItem('ambientVol');
    ambientVol.dispatchEvent(new Event('input'));
  }
  if (localStorage.getItem('notifSel')) {
    notifSel.value=localStorage.getItem('notifSel');
  }
  if (localStorage.getItem('darkMode')) {
    const dm = localStorage.getItem('darkMode')==='true';
    darkToggle.checked=dm;
    document.body.classList.toggle('dark', dm);
  }
  if (localStorage.getItem('cycleCount')) {
    userCycleCount=+localStorage.getItem('cycleCount');
    cycleInput.value=userCycleCount;
  }

  // kick off
  updateUI();
});
