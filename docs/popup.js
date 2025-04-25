document.addEventListener('DOMContentLoaded', () => {
  // handy shortcut
  const $ = id => document.getElementById(id);

  // —— TAB SWITCHING ——
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.panel).classList.add('active');
  }));

  // —— POMODORO LOGIC ——
  const WORK  = 25 * 60,
        SHORT =  5 * 60,
        LONG  = 15 * 60;

  let mode            = 'work',
      timeLeft        = WORK,
      duration        = WORK,
      timerId         = null,
      cycles          = 0,
      cyclesBeforeLong = 4;

  // setup SVG ring
  const circle = document.querySelector('.progress-ring__circle');
  const radius = circle.r.baseVal.value;
  const circ  = 2 * Math.PI * radius;
  circle.style.strokeDasharray  = `${circ} ${circ}`;
  circle.style.strokeDashoffset = circ;
  function setProgress(pct) {
    circle.style.strokeDashoffset = circ - (pct/100)*circ;
  }

  function formatTime(sec) {
    const m   = Math.floor(sec/60).toString().padStart(2,'0');
    const s   = (sec % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function updateUI() {
    $('timer-display').textContent = formatTime(timeLeft);
    $('timer-label').textContent   = mode==='work' 
                                       ? 'Work' 
                                       : mode==='short-break' 
                                         ? 'Short Break' 
                                         : 'Long Break';
    setProgress((duration - timeLeft)/duration*100);
  }

  function tick() {
    if (timeLeft > 0) {
      timeLeft--;
      updateUI();
    } else nextSession();
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
      mode = (cycles % cyclesBeforeLong === 0) ? 'long-break' : 'short-break';
      timeLeft = mode==='long-break'? LONG : SHORT;
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

  // —— PRESETS (localStorage) ——
  function loadPresets() {
    const arr = JSON.parse(localStorage.getItem('timerPresets') || '[]');
    const sel = $('timer-presets');
    sel.innerHTML = '';
    (arr.length ? arr : [5,10,17,25]).forEach(m => {
      sel.add(new Option(`${m} min`, m*60));
    });
    sel.add(new Option('Custom','custom'));
  }

  $('timer-presets').addEventListener('change', e => {
    if (e.target.value === 'custom') {
      $('custom-preset').classList.remove('hidden');
    } else {
      $('custom-preset').classList.add('hidden');
      const secs = Number(e.target.value);
      if (!isNaN(secs)) {
        timeLeft = duration = secs;
        mode = 'work';
        updateUI();
      }
    }
  });

  $('save-preset').addEventListener('click', () => {
    const m = parseInt($('custom-preset').value, 10);
    if (m > 0) {
      let arr = JSON.parse(localStorage.getItem('timerPresets') || '[]');
      if (!arr.includes(m)) {
        arr.push(m);
        localStorage.setItem('timerPresets', JSON.stringify(arr));
        loadPresets();
      }
    }
  });

  loadPresets();

  // —— Start & Skip buttons ——
  $('start-pause-button').addEventListener('click', () => {
    const sel = $('timer-presets').value;
    if (sel === 'custom') {
      const m = parseInt($('custom-preset').value, 10);
      if (m > 0) {
        timeLeft = duration = m * 60;
        mode = 'work';
        updateUI();
      }
    } else {
      const secs = Number(sel);
      if (!isNaN(secs)) {
        timeLeft = duration = secs;
        mode = 'work';
        updateUI();
      }
    }
    startPause();
  });
  $('skip-button').addEventListener('click', () => nextSession(false));

  updateUI();

  // —— SCHEDULING ——
  $('add-schedule').addEventListener('click', () => {
    const name  = $('session-name').value || 'Unnamed';
    const start = $('start-time').value;
    const end   = $('end-time').value;
    if (!start || !end) return alert('Please set both start & end times');
    const li = document.createElement('li');
    li.textContent = `${name} — ${start} to ${end}`;
    $('upcoming-sessions-list').appendChild(li);
  });

  // —— NOTES ——
  $('save-note').addEventListener('click', () => {
    const txt = $('notes-input').value.trim();
    if (!txt) return alert('Enter some notes');
    let arr = JSON.parse(localStorage.getItem('notes') || '[]');
    arr.push({ ts: Date.now(), note: txt });
    localStorage.setItem('notes', JSON.stringify(arr));
    alert('Note saved!');
  });

  // —— STATS (stub) ——
  // TODO: hook chart.js or similar here if you want graphs

  // —— SETTINGS ——
  // Dark mode
  const dm = $('dark-mode-toggle');
  dm.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
  });
  if (localStorage.getItem('darkMode') === 'true') {
    dm.checked = true;
    document.body.classList.add('dark');
  }

  // Cycles count
  const cc = $('cycle-count');
  cc.addEventListener('change', e => {
    cyclesBeforeLong = parseInt(e.target.value, 10) || 4;
    localStorage.setItem('cycleCount', cyclesBeforeLong);
  });
  if (localStorage.getItem('cycleCount')) {
    cyclesBeforeLong = parseInt(localStorage.getItem('cycleCount'), 10);
    cc.value = cyclesBeforeLong;
  }

  // URL blocking only works as an extension — skip or rewrite for a PWA

  // —— AMBIENT SOUNDS & ALERTS ——
  const ambient = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3')
  };
  Object.values(ambient).forEach(a => { a.loop = true; a.volume = 0.5; });

  $('ambient-volume').addEventListener('input', e => {
    const v = e.target.value;
    Object.values(ambient).forEach(a => a.volume = v);
    localStorage.setItem('ambientVol', v);
  });

  $('ambient-select').addEventListener('change', e => {
    const sel = e.target.value;
    localStorage.setItem('ambientSel', sel);
    Object.values(ambient).forEach(a => { a.pause(); a.currentTime = 0; });
    if (ambient[sel]) ambient[sel].play();
  });

  if (localStorage.getItem('ambientVol') != null) {
    const v = parseFloat(localStorage.getItem('ambientVol'));
    $('ambient-volume').value = v;
    $('ambient-volume').dispatchEvent(new Event('input'));
  }
  if (localStorage.getItem('ambientSel')) {
    $('ambient-select').value = localStorage.getItem('ambientSel');
    $('ambient-select').dispatchEvent(new Event('change'));
  }

  $('notification-select').addEventListener('change', e => {
    localStorage.setItem('notifSel', e.target.value);
  });
});
