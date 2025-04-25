document.addEventListener('DOMContentLoaded', () => {
  //
  // 1) Tab-switcher
  //
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
  }));

  //
  // 2) Pomodoro timer
  //
  const WORK      = 25 * 60;
  const SHORT     =  5 * 60;
  const LONG      = 15 * 60;
  let   mode      = 'work';
  let   timeLeft  = WORK;
  let   duration  = WORK;
  let   timerId   = null;
  let   cycles    = 0;
  let   cycleCap  = 4;

  const circle        = document.querySelector('.progress-ring__circle');
  const radius        = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;

  const $ = id => document.getElementById(id);

  function setProgress(pct) {
    circle.style.strokeDashoffset =
      circumference - (pct / 100) * circumference;
  }

  function formatTime(s) {
    const m  = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${m}:${ss}`;
  }

  function updateUI() {
    $('timer-display').textContent = formatTime(timeLeft);
    $('timer-label').textContent   =
      mode==='work'        ? 'Work' :
      mode==='short-break' ? 'Short Break' :
                             'Long Break';
    setProgress( (duration - timeLeft) / duration * 100 );
  }

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

  function nextSession(auto=true) {
    clearInterval(timerId);
    timerId = null;
    if (mode === 'work') {
      cycles++;
      mode = (cycles % cycleCap === 0) ? 'long-break' : 'short-break';
      timeLeft = (mode === 'long-break') ? LONG : SHORT;
    } else {
      mode     = 'work';
      timeLeft = WORK;
    }
    duration = timeLeft;
    updateUI();
    if (auto) {
      new Audio(chrome.runtime.getURL('sounds/notification.mp3')).play();
      startPause();
    }
  }

  //
  // 3) Quick-presets
  //
  const presets   = $('timer-presets');
  const customIn  = $('custom-preset');
  const savePre   = $('save-preset');

  function loadPresets() {
    chrome.storage.local.get('timerPresets', res => {
      const arr = res.timerPresets || [5,10,17,25];
      presets.innerHTML = '';
      arr.forEach(m => presets.add(new Option(`${m} min`, m * 60)));
      presets.add(new Option('Custom','custom'));
    });
  }

  presets.addEventListener('change', () => {
    if (presets.value === 'custom') {
      customIn.classList.remove('hidden');
    } else {
      customIn.classList.add('hidden');
      const v = Number(presets.value);
      if (!isNaN(v)) {
        timeLeft = duration = v; mode = 'work';
        updateUI();
      }
    }
  });

  savePre.addEventListener('click', () => {
    const m = parseInt(customIn.value, 10);
    if (m>0) {
      chrome.storage.local.get('timerPresets', r => {
        const arr = r.timerPresets || [5,10,17,25];
        if (!arr.includes(m)) {
          arr.push(m);
          chrome.storage.local.set({ timerPresets: arr });
          loadPresets();
        }
      });
    }
  });

  //
  // 4) Hook start/skip buttons
  //
  $('start-pause-button').addEventListener('click', () => {
    if (presets.value==='custom') {
      const m = parseInt(customIn.value,10);
      if (m>0) {
        timeLeft = duration = m*60;
        mode = 'work';
        updateUI();
      }
    } else {
      const v = Number(presets.value);
      if (!isNaN(v)) {
        timeLeft = duration = v;
        mode = 'work';
        updateUI();
      }
    }
    startPause();
  });

  $('skip-button').addEventListener('click', () => nextSession(false));

  loadPresets();
  updateUI();

  //
  // 5) Schedule
  //
  $('add-schedule').addEventListener('click', () => {
    const name  = $('session-name').value || 'Unnamed';
    const start = $('start-time').value;
    const end   = $('end-time').value;
    if (!start || !end) {
      return alert('Please set both times');
    }
    const li = document.createElement('li');
    li.textContent = `${name} — ${start} to ${end}`;
    $('upcoming-sessions-list').appendChild(li);
  });

  //
  // 6) Notes
  //
  $('save-note').addEventListener('click', () => {
    const txt = $('notes-input').value.trim();
    if (!txt) return alert('Enter some notes');
    let arr = JSON.parse(localStorage.getItem('notes')||'[]');
    arr.push({ ts: Date.now(), note: txt });
    localStorage.setItem('notes', JSON.stringify(arr));
    alert('Saved');
  });

  //
  // 7) Settings & blocker & ambient
  //
  $('dark-mode-toggle').addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    chrome.storage.local.set({ darkMode: e.target.checked });
  });

  $('cycle-count').addEventListener('change', e => {
    const v = parseInt(e.target.value,10) || 4;
    cycleCap = v;
    chrome.storage.local.set({ cycleCount: v });
  });

  $('apply-blocking').addEventListener('click', () => {
    const rules = [];
    if ($('block-facebook').checked)  rules.push({ id:1, condition:{ urlFilter:'*://*.facebook.com/*' }, action:{ type:'block' } });
    if ($('block-twitter').checked)   rules.push({ id:2, condition:{ urlFilter:'*://*.twitter.com/*' }, action:{ type:'block' } });
    if ($('block-instagram').checked) rules.push({ id:3, condition:{ urlFilter:'*://*.instagram.com/*' }, action:{ type:'block' } });
    chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds:[1,2,3], addRules:rules });
  });

  const ambientSounds = {
    rain:   new Audio(chrome.runtime.getURL('sounds/rain.mp3')),
    coffee: new Audio(chrome.runtime.getURL('sounds/coffee.mp3')),
    white:  new Audio(chrome.runtime.getURL('sounds/white.mp3')),
  };
  Object.values(ambientSounds).forEach(a => { a.loop = true; a.volume = 0.5; });

  $('ambient-volume').addEventListener('input', e => {
    const vol = parseFloat(e.target.value);
    Object.values(ambientSounds).forEach(a => a.volume = vol);
  });

  $('ambient-select').addEventListener('change', e => {
    Object.values(ambientSounds).forEach(a => { a.pause(); a.currentTime = 0; });
    const sel = e.target.value;
    if (ambientSounds[sel]) ambientSounds[sel].play();
  });

  // restore settings
  chrome.storage.local.get(
    ['darkMode','cycleCount','ambientSel','ambientVol'],
    res => {
      if (res.darkMode) {
        $('dark-mode-toggle').checked = true;
        document.body.classList.add('dark');
      }
      if (res.cycleCount) {
        $('cycle-count').value = res.cycleCount;
        cycleCap = res.cycleCount;
      }
      if (res.ambientSel) {
        $('ambient-select').value = res.ambientSel;
      }
      if (res.ambientVol != null) {
        $('ambient-volume').value = res.ambientVol;
        $('ambient-volume').dispatchEvent(new Event('input'));
      }
    }
  );
});
