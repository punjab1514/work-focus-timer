document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).classList.add('active');
    });
  });

  // Pomodoro constants
  const WORK = 25 * 60, SHORT = 5 * 60, LONG = 15 * 60;
  let mode = 'work', timeLeft = WORK, duration = WORK;
  let timerId = null, cycles = 0, cyclesBeforeLong = 4;

  // Ring setup
  const circle = document.querySelector('.progress-ring__circle');
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;
  function setProgress(pct) {
    circle.style.strokeDashoffset = circumference - (pct/100)*circumference;
  }

  // DOM helpers
  const $ = id => document.getElementById(id);
  function formatTime(s) {
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const sec = (s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
  }

  // UI update
  function updateUI() {
    $('timer-display').textContent = formatTime(timeLeft);
    $('timer-label').textContent = mode === 'work' ? 'Work'
      : mode === 'short-break' ? 'Short Break' : 'Long Break';
    setProgress((duration - timeLeft)/duration * 100);
  }

  // Timer tick
  function tick() {
    if (timeLeft > 0) {
      timeLeft--;
      updateUI();
    } else {
      nextSession();
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

  function nextSession(auto = true) {
    clearInterval(timerId);
    timerId = null;
    if (mode === 'work') {
      cycles++;
      mode = (cycles % cyclesBeforeLong === 0) ? 'long-break' : 'short-break';
      timeLeft = (mode === 'long-break') ? LONG : SHORT;
    } else {
      mode = 'work';
      timeLeft = WORK;
    }
    duration = timeLeft;
    updateUI();
    if (auto) {
      new Audio('sounds/notification.mp3').play();
      startPause();
    }
  }

  // Presets
  function loadPresets() {
    chrome.storage.local.get('timerPresets', res => {
      const arr = res.timerPresets || [5,10,17,25];
      $('timer-presets').innerHTML = '';
      arr.forEach(m => $('timer-presets').add(new Option(`${m} min`, m*60)));
      $('timer-presets').add(new Option('Custom','custom'));
    });
  }
  $('timer-presets').addEventListener('change', e => {
    if (e.target.value === 'custom') {
      $('custom-preset').classList.remove('hidden');
    } else {
      $('custom-preset').classList.add('hidden');
      const v = Number(e.target.value);
      if (!isNaN(v)) { timeLeft = duration = v; mode='work'; updateUI(); }
    }
  });
  $('save-preset').addEventListener('click', () => {
    const m = parseInt($('custom-preset').value,10);
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

  // Start / Skip
  $('start-pause-button').addEventListener('click', () => {
    const preset = $('timer-presets').value;
    if (preset === 'custom') {
      const m = parseInt($('custom-preset').value,10);
      if (m>0) { timeLeft=duration=m*60; mode='work'; updateUI(); }
    } else {
      const v = Number(preset);
      if (!isNaN(v)) { timeLeft=duration=v; mode='work'; updateUI(); }
    }
    startPause();
  });
  $('skip-button').addEventListener('click', () => nextSession(false));
  updateUI();

  // Scheduling
  $('add-schedule').addEventListener('click', () => {
    const name  = $('session-name').value || 'Unnamed';
    const start = $('start-time').value;
    const end   = $('end-time').value;
    if (!start || !end) return alert('Please set both times');
    const li = document.createElement('li');
    li.textContent = `${name} — ${start} to ${end}`;
    $('upcoming-sessions-list').appendChild(li);
  });

  // Notes
  $('save-note').addEventListener('click', () => {
    const txt = $('notes-input').value.trim();
    if (!txt) return alert('Enter notes');
    let arr = JSON.parse(localStorage.getItem('notes')||'[]');
    arr.push({ ts:Date.now(), note:txt });
    localStorage.setItem('notes', JSON.stringify(arr));
    alert('Saved');
  });

  // Insights (stub for counts)
  $('stats-today').textContent = 0;
  $('stats-week').textContent  = 0;
  $('stats-month').textContent = 0;

  // Settings
  $('dark-mode-toggle').addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    chrome.storage.local.set({ darkMode: e.target.checked });
  });
  $('cycle-count').addEventListener('change', e => {
    cyclesBeforeLong = parseInt(e.target.value,10) || 4;
    chrome.storage.local.set({ cycleCount: cyclesBeforeLong });
  });

  // Block sites
  $('apply-blocking').addEventListener('click', () => {
    const rules = [];
    if ($('block-facebook').checked)  rules.push({ id:1, condition:{ urlFilter:'*://*.facebook.com/*' }, action:{ type:'block' } });
    if ($('block-twitter').checked)   rules.push({ id:2, condition:{ urlFilter:'*://*.twitter.com/*' }, action:{ type:'block' } });
    if ($('block-instagram').checked) rules.push({ id:3, condition:{ urlFilter:'*://*.instagram.com/*' }, action:{ type:'block' } });
    chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds:[1,2,3], addRules:rules });
  });

  // Ambient sounds
  const ambient = {
    rain:   new Audio(chrome.runtime.getURL('sounds/rain.mp3')),
    coffee: new Audio(chrome.runtime.getURL('sounds/coffee.mp3')),
    white:  new Audio(chrome.runtime.getURL('sounds/white.mp3')),
  };
  Object.values(ambient).forEach(a => { a.loop=true; a.volume=0.5; });

  $('ambient-volume').addEventListener('input', e => {
    Object.values(ambient).forEach(a => a.volume = e.target.value);
  });
  $('ambient-select').addEventListener('change', e => {
    Object.values(ambient).forEach(a => { a.pause(); a.currentTime=0; });
    const sel = e.target.value;
    if (ambient[sel]) ambient[sel].play();
  });

  // Load stored settings
  chrome.storage.local.get(['darkMode','cycleCount','ambientSel','ambientVol'], res => {
    if (res.darkMode) $('dark-mode-toggle').checked=true, document.body.classList.add('dark');
    if (res.cycleCount) $('cycle-count').value = res.cycleCount, cyclesBeforeLong = res.cycleCount;
    if (res.ambientSel) $('ambient-select').value = res.ambientSel;
    if (res.ambientVol != null) {
      $('ambient-volume').value = res.ambientVol;
      $('ambient-volume').dispatchEvent(new Event('input'));
    }
  });
});
