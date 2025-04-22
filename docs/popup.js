document.addEventListener('DOMContentLoaded', () => {
  // ── CONSTANTS & STATE ──
  const WORK_DUR    = 25 * 60;
  const SHORT_BREAK =  5 * 60;
  const LONG_BREAK  = 15 * 60;
  let cycleCount             = 0;
  let mode                   = 'work';
  let timeLeft               = WORK_DUR;
  let currentSessionDuration = WORK_DUR;
  let timerId                = null;
  let isRunning              = false;
  let userCycleCount         = 4;

  // ── HELPERS ──
  const $ = id => document.getElementById(id);
  function formatTime(sec) {
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  // ── ELEMENTS ──
  const startBtn    = $('start-pause-button');
  const skipBtn     = $('skip-button');
  const labelEl     = $('timer-label');
  const displayEl   = $('timer-display');
  const circle      = document.querySelector('.progress-ring__circle');
  const presets     = $('timer-presets');
  const customInput = $('custom-preset');
  const savePreset  = $('save-preset');
  const ambientSel  = $('ambient-select');
  const ambientVol  = $('ambient-volume');
  const notifSel    = $('notification-select');
  const addSchedule = $('add-schedule');
  const upcomingUL  = $('upcoming-sessions-list');
  const notesInput  = $('notes-input');

  // ── PROGRESS RING SETUP ──
  const radius        = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;
  function setProgress(pct) {
    circle.style.strokeDashoffset =
      circumference - (pct/100)*circumference;
  }

  // ── AMBIENT & ALERT SOUNDS ──
  const ambientSounds = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3')
  };
  Object.values(ambientSounds).forEach(a => { a.loop = true; a.volume = 0.5; });
  const notificationSound = new Audio('sounds/notification.mp3');

  // ── RESTORE SETTINGS ──
  const S = window.localStorage;
  if (S.ambientSel)   ambientSel.value   = S.ambientSel;
  if (S.ambientVol)   ambientVol.value   = S.ambientVol;
  if (S.notifSel)     notifSel.value     = S.notifSel;
  if (S.cycleCount) {
    userCycleCount = parseInt(S.cycleCount,10);
    $('cycle-count').value = userCycleCount;
  }
  // kick off change events so UI + volumes initialize
  ambientVol.dispatchEvent(new Event('input'));
  ambientSel.dispatchEvent(new Event('change'));

  // ── SETTINGS HANDLERS ──
  ambientVol.addEventListener('input', () => {
    const v = parseFloat(ambientVol.value);
    Object.values(ambientSounds).forEach(a=>a.volume=v);
    S.ambientVol = v;
  });
  ambientSel.addEventListener('change', () => {
    Object.values(ambientSounds).forEach(a=>{ a.pause(); a.currentTime=0; });
    const sel = ambientSel.value;
    if (ambientSounds[sel]) ambientSounds[sel].play();
    S.ambientSel = sel;
  });
  notifSel.addEventListener('change', () => {
    S.notifSel = notifSel.value;
  });

  // ── DARK MODE & CYCLES ──
  $('dark-mode-toggle').addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    S.darkMode = e.target.checked;
  });
  $('cycle-count').addEventListener('change', e => {
    const v = parseInt(e.target.value,10);
    if (v>0) {
      userCycleCount = v;
      S.cycleCount = v;
    }
  });

  // ── UPDATE UI ──
  function updateUI() {
    displayEl.textContent = formatTime(timeLeft);
    const pct = ((currentSessionDuration - timeLeft) / currentSessionDuration)*100;
    setProgress(pct);
    labelEl.textContent = mode==='work'
      ? 'Work'
      : (mode==='short-break' ? 'Short Break' : 'Long Break');
  }

  // ── ADVANCE SESSION ──
  function nextSession(auto=true) {
    clearInterval(timerId);
    isRunning = false;

    if (mode==='work') {
      cycleCount++;
      mode = (cycleCount % userCycleCount===0)? 'long-break':'short-break';
      timeLeft = (mode==='long-break')? LONG_BREAK: SHORT_BREAK;
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

  // ── TICK ──
  function tick() {
    if (timeLeft>0) {
      timeLeft--;
      updateUI();
    } else {
      nextSession();
    }
  }

  // ── START / PAUSE ──
  function startTimer() {
    if (!isRunning) {
      // play ambient on start
      const sel = ambientSel.value;
      if (ambientSounds[sel]) ambientSounds[sel].play();

      timerId   = setInterval(tick,1000);
      startBtn.textContent = 'Pause';
      isRunning = true;
    } else {
      // pause ambient on pause
      Object.values(ambientSounds).forEach(a=>a.pause());
      clearInterval(timerId);
      startBtn.textContent = 'Start';
      isRunning = false;
    }
  }

  startBtn.addEventListener('click', ()=>{
    // allow quick/custom override BEFORE starting
    if (presets.value==='custom') {
      const m = parseInt(customInput.value,10);
      if (m>0) {
        timeLeft               = m*60;
        currentSessionDuration = timeLeft;
        mode                   = 'work';
        updateUI();
      }
    } else {
      const secs = Number(presets.value);
      if (!isNaN(secs)) {
        timeLeft               = secs;
        currentSessionDuration = secs;
        mode                   = 'work';
        updateUI();
      }
    }
    startTimer();
  });
  skipBtn.addEventListener('click', ()=> nextSession(false));

  // ── PRESETS LOADING & SAVING ──
  function loadPresets() {
    const arr = JSON.parse(S.timerPresets||'[5,10,17,25]');
    presets.innerHTML = '';
    arr.forEach(m=> presets.add(new Option(`${m} min`,m*60)) );
    presets.add(new Option('Custom','custom'));
  }
  presets.addEventListener('change', ()=>{
    if (presets.value==='custom') {
      customInput.style.display='block';
    } else {
      customInput.style.display='none';
      const secs = Number(presets.value);
      if (!isNaN(secs)) {
        timeLeft               = secs;
        currentSessionDuration = secs;
        updateUI();
      }
    }
  });
  $('save-preset').addEventListener('click',()=>{
    const m = parseInt(customInput.value,10);
    if (m>0) {
      const arr = JSON.parse(S.timerPresets||'[5,10,17,25]');
      if (!arr.includes(m)) {
        arr.push(m);
        S.timerPresets = JSON.stringify(arr);
        loadPresets();
      }
    }
  });
  loadPresets();

  // ── SCHEDULING CODE ──
  addSchedule.addEventListener('click', () => {
    const name      = $('session-name').value || 'Unnamed Session';
    const startTime = $('start-time').value;
    const endTime   = $('end-time').value;
    if (!startTime || !endTime) {
      alert('Please set both start and end times.');
      return;
    }

    // append to list
    const li = document.createElement('li');
    li.textContent = `${name} — ${startTime} to ${endTime}`;
    upcomingUL.appendChild(li);

    // schedule 5 min prior reminder
    const [h,m] = startTime.split(':').map(n=>parseInt(n,10));
    const now    = new Date();
    const then   = new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m);
    const msDiff = then.getTime() - now.getTime() - 5*60*1000;
    if (msDiff > 0) {
      setTimeout(()=>{
        new Notification('Upcoming Session', {
          body: `"${name}" starts at ${startTime}`,
        });
        // also play alert sound
        notificationSound.play();
      }, msDiff);
    }
    alert(`Scheduled "${name}" at ${startTime}`);
  });

  // ── INITIAL DRAW ──
  updateUI();
});
