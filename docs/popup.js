document.addEventListener('DOMContentLoaded', () => {
  // Pomodoro durations (fallback defaults)
  const WORK_DUR    = 25 * 60;
  const SHORT_BREAK =  5 * 60;
  const LONG_BREAK  = 15 * 60;

  let cycleCount             = 0;
  let mode                   = 'work';
  let timeLeft               = WORK_DUR;
  let currentSessionDuration = WORK_DUR;  // ← new
  let timerId                = null;
  let isRunning              = false;
  let userCycleCount         = 4;

  const $ = id => document.getElementById(id);
  function formatTime(sec) {
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  // DOM refs
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

  // Progress ring setup
  const radius        = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;
  function setProgress(pct) {
    circle.style.strokeDashoffset = circumference - (pct/100)*circumference;
  }

  // Load audio...
  const ambientSounds = {
    rain:   new Audio(chrome.runtime.getURL('sounds/rain.mp3')),
    coffee: new Audio(chrome.runtime.getURL('sounds/coffee.mp3')),
    white:  new Audio(chrome.runtime.getURL('sounds/white.mp3'))
  };
  const notificationSound = new Audio(chrome.runtime.getURL('sounds/notification.mp3'));
  Object.values(ambientSounds).forEach(a=>{ a.loop=true; a.volume=0.5; });

  // Restore prefs...
  chrome.storage.local.get(
    ['ambientSel','ambientVol','notifSel','darkMode','cycleCount'],
    res => {
      if (res.ambientSel) ambientSel.value = res.ambientSel;
      if (res.ambientVol!=null) ambientVol.value = res.ambientVol;
      if (res.notifSel) notifSel.value = res.notifSel;
      if (res.darkMode) document.body.classList.add('dark'), darkToggle.checked = true;
      if (res.cycleCount) userCycleCount = res.cycleCount, cycleInput.value = res.cycleCount;

      ambientVol.dispatchEvent(new Event('input'));
      ambientSel.dispatchEvent(new Event('change'));
  });

  // Dark mode toggle...
  darkToggle.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    chrome.storage.local.set({ darkMode: e.target.checked });
  });

  // Cycle count input...
  cycleInput.addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (v>0) {
      userCycleCount = v;
      chrome.storage.local.set({ cycleCount: v });
    }
  });

  // Ambient volume...
  ambientVol.addEventListener('input', () => {
    const v = parseFloat(ambientVol.value);
    Object.values(ambientSounds).forEach(a=>a.volume=v);
    chrome.storage.local.set({ ambientVol: v });
  });

  // Ambient sound select...
  ambientSel.addEventListener('change', () => {
    Object.values(ambientSounds).forEach(a=>{ a.pause(); a.currentTime=0; });
    const sel = ambientSel.value;
    if (ambientSounds[sel]) ambientSounds[sel].play();
    chrome.storage.local.set({ ambientSel: sel });
  });

  // Notification select...
  notifSel.addEventListener('change', () => {
    chrome.storage.local.set({ notifSel: notifSel.value });
  });

  // ── UI update ──
  function updateUI() {
    displayEl.textContent = formatTime(timeLeft);
    // ← use currentSessionDuration instead of static WORK_DUR
    const pct = ((currentSessionDuration - timeLeft) / currentSessionDuration) * 100;
    setProgress(pct);
    labelEl.textContent = mode === 'work'
      ? 'Work'
      : mode === 'short-break'
        ? 'Short Break'
        : 'Long Break';
  }

  // ── Advance to next session ──
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
    // ← reset session duration here too
    currentSessionDuration = timeLeft;

    updateUI();
    startBtn.textContent = 'Start';

    if (auto) {
      notificationSound.play();
      startTimer();
    }
  }

  // ── Tick ──
  function tick() {
    if (timeLeft > 0) {
      timeLeft--;
      updateUI();
    } else {
      nextSession();
    }
  }

  // ── Start/Pause ──
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

  // ── Button handlers ──
  startBtn.addEventListener('click', () => {
    // pick custom vs preset
    if (presets.value === 'custom') {
      const m = parseInt(customInput.value, 10);
      if (m>0) {
        timeLeft               = m * 60;
        currentSessionDuration = timeLeft;  // ← set custom duration
        mode                   = 'work';
        updateUI();
      }
    } else {
      const secs = Number(presets.value);
      if (!isNaN(secs)) {
        timeLeft               = secs;
        currentSessionDuration = secs;      // ← set quick‐preset duration
        mode                   = 'work';
        updateUI();
      }
    }
    startTimer();
  });

  skipBtn.addEventListener('click', () => nextSession(false));

  // ── Quick presets load ──
  function loadPresets() {
    chrome.storage.local.get('timerPresets', res => {
      const arr = res.timerPresets || [5,10,17,25];
      presets.innerHTML = '';
      arr.forEach(m => presets.add(new Option(`${m} min`, m*60)));
      presets.add(new Option('Custom','custom'));
    });
  }
  presets.addEventListener('change', () => {
    if (presets.value === 'custom') customInput.style.display = 'block';
    else {
      customInput.style.display = 'none';
      const secs = Number(presets.value);
      if (!isNaN(secs)) {
        timeLeft               = secs;
        currentSessionDuration = secs;  // ← also set duration on change
        updateUI();
      }
    }
  });
  savePreset.addEventListener('click', () => {
    const m = parseInt(customInput.value, 10);
    if (m>0) {
      chrome.storage.local.get('timerPresets', res => {
        const arr = res.timerPresets || [5,10,17,25];
        if (!arr.includes(m)) {
          arr.push(m);
          chrome.storage.local.set({ timerPresets: arr });
          loadPresets();
        }
      });
    }
  });
  loadPresets();

  // ── Schedule & Calendar (unchanged) ──
  $('add-schedule').addEventListener('click', () => {
    /* … your existing scheduling + calendar code … */
  });

  // Initial draw
  updateUI();
});
