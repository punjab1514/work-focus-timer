document.addEventListener('DOMContentLoaded', () => {
  // -- your constants and state (unchanged) --
  const WORK_DUR    = 25 * 60;
  const SHORT_BREAK =  5 * 60;
  const LONG_BREAK  = 15 * 60;
  let cycleCount = 0, mode = 'work';
  let timeLeft = WORK_DUR;
  let currentSessionDuration = WORK_DUR;
  let timerId = null, isRunning = false;
  let userCycleCount = 4;

  // -- helpers --
  const $ = id => document.getElementById(id);
  function formatTime(sec) {
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  // -- DOM refs --
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
  const darkToggle  = $('dark-mode-toggle');
  const cycleInput  = $('cycle-count');
  const upcomingUL  = $('upcoming-sessions-list');

  // -- progress ring setup --
  const radius        = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;
  function setProgress(pct) {
    circle.style.strokeDashoffset = circumference - (pct/100)*circumference;
  }

  // -- load audio via relative paths, NOT chrome.runtime --
  const ambientSounds = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3')
  };
  const notificationSound = new Audio('sounds/notification.mp3');
  Object.values(ambientSounds).forEach(a => { a.loop = true; a.volume = 0.5; });

  // -- restore user prefs from localStorage (PWA) --
  const store = window.localStorage;
  // ambientSel, ambientVol, notifSel, darkMode, cycleCount
  if (store.ambientSel)    ambientSel.value = store.ambientSel;
  if (store.ambientVol)    ambientVol.value = store.ambientVol;
  if (store.notifSel)      notifSel.value = store.notifSel;
  if (store.darkMode === 'true') {
    document.body.classList.add('dark');
    darkToggle.checked = true;
  }
  if (store.cycleCount) {
    userCycleCount = parseInt(store.cycleCount,10);
    cycleInput.value = userCycleCount;
  }

  // -- apply UI based on settings --
  ambientVol.dispatchEvent(new Event('input'));
  ambientSel.dispatchEvent(new Event('change'));

  // -- handlers for settings --
  darkToggle.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    store.darkMode = e.target.checked;
  });
  cycleInput.addEventListener('change', e => {
    const v = parseInt(e.target.value,10);
    if (v>0) {
      userCycleCount = v;
      store.cycleCount = v;
    }
  });
  ambientVol.addEventListener('input', () => {
    const v = parseFloat(ambientVol.value);
    Object.values(ambientSounds).forEach(a=>a.volume=v);
    store.ambientVol = v;
  });
  ambientSel.addEventListener('change', () => {
    Object.values(ambientSounds).forEach(a => { a.pause(); a.currentTime=0; });
    const sel = ambientSel.value;
    if (ambientSounds[sel]) ambientSounds[sel].play();
    store.ambientSel = sel;
  });
  notifSel.addEventListener('change', () => {
    store.notifSel = notifSel.value;
  });

  // -- UI update function --
  function updateUI() {
    displayEl.textContent = formatTime(timeLeft);
    const pct = ((currentSessionDuration - timeLeft) / currentSessionDuration) * 100;
    setProgress(pct);
    labelEl.textContent = mode === 'work'
      ? 'Work'
      : mode === 'short-break'
        ? 'Short Break'
        : 'Long Break';
  }

  // -- session advancement --
  function nextSession(auto=true) {
    clearInterval(timerId);
    isRunning = false;

    if (mode === 'work') {
      cycleCount++;
      mode = (cycleCount % userCycleCount === 0) ? 'long-break' : 'short-break';
      timeLeft = (mode === 'long-break') ? LONG_BREAK : SHORT_BREAK;
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

  // -- tick every second --
  function tick() {
    if (timeLeft > 0) {
      timeLeft--;
      updateUI();
    } else {
      nextSession();
    }
  }

  // -- start/pause logic --
  function startTimer() {
    if (!isRunning) {
      timerId = setInterval(tick, 1000);
      startBtn.textContent = 'Pause';
      isRunning = true;
    } else {
      clearInterval(timerId);
      startBtn.textContent = 'Start';
      isRunning = false;
    }
  }

  // -- button wiring --
  startBtn.addEventListener('click', () => {
    if (presets.value === 'custom') {
      const m = parseInt(customInput.value, 10);
      if (m>0) {
        timeLeft = m*60;
        currentSessionDuration = timeLeft;
        mode = 'work';
        updateUI();
      }
    } else {
      const secs = Number(presets.value);
      if (!isNaN(secs)) {
        timeLeft = secs;
        currentSessionDuration = secs;
        mode = 'work';
        updateUI();
      }
    }
    startTimer();
  });
  skipBtn.addEventListener('click', ()=> nextSession(false));

  // -- quick presets load/save --
  function loadPresets() {
    const arr = JSON.parse(store.timerPresets || '[5,10,17,25]');
    presets.innerHTML = '';
    arr.forEach(m => presets.add(new Option(`${m} min`, m*60)));
    presets.add(new Option('Custom','custom'));
  }
  presets.addEventListener('change', () => {
    if (presets.value==='custom') {
      customInput.style.display = 'block';
    } else {
      customInput.style.display = 'none';
      const secs = Number(presets.value);
      if (!isNaN(secs)) {
        timeLeft = secs;
        currentSessionDuration = secs;
        updateUI();
      }
    }
  });
  savePreset.addEventListener('click', () => {
    const m = parseInt(customInput.value,10);
    if (m>0) {
      const arr = JSON.parse(store.timerPresets || '[5,10,17,25]');
      if (!arr.includes(m)) {
        arr.push(m);
        store.timerPresets = JSON.stringify(arr);
        loadPresets();
      }
    }
  });
  loadPresets();

  // -- scheduling & calendar -- (leave your existing code here)

  // initial draw
  updateUI();
});
