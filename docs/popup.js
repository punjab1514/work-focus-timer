document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  // TAB SWITCHING
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.panel).classList.add('active');
    });
  });

  // POMODORO
  const WORK=25*60, SHORT=5*60, LONG=15*60;
  let mode='work', timeLeft=WORK, duration=WORK;
  let timerId=null, cycles=0, cyclesBeforeLong=4;

  const circle = document.querySelector('.progress-ring__circle');
  const R = circle.r.baseVal.value, C = 2*Math.PI*R;
  circle.style.strokeDasharray  = `${C} ${C}`;
  circle.style.strokeDashoffset = C;

  function setProgress(p) {
    circle.style.strokeDashoffset = C - (p/100)*C;
  }
  function formatTime(s) {
    const m = Math.floor(s/60).toString().padStart(2,'0'),
          sec = (s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
  }
  function updateUI() {
    $('timer-display').textContent = formatTime(timeLeft);
    $('timer-label').textContent =
      mode==='work'?'Work':
      mode==='short-break'?'Short Break':'Long Break';
    setProgress((duration-timeLeft)/duration*100);
  }
  function tick() {
    if (timeLeft>0) {
      timeLeft--; updateUI();
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
    if (mode==='work') {
      cycles++;
      mode = (cycles % cyclesBeforeLong===0)? 'long-break':'short-break';
      timeLeft = (mode==='long-break')? LONG:SHORT;
    } else {
      mode='work';
      timeLeft=WORK;
    }
    duration = timeLeft;
    updateUI();
    if (auto) {
      new Audio('sounds/notification.mp3').play();
      startPause();
    }
  }

  // PRESETS
  function loadPresets(){
    let arr = JSON.parse(localStorage.getItem('timerPresets')||'[]');
    if (!arr.length) arr = [5,10,17,25];
    const sel = $('timer-presets');
    sel.innerHTML = '';
    arr.forEach(m => sel.add(new Option(`${m} min`, m*60)));
    sel.add(new Option('Custom','custom'));
  }
  loadPresets();

  $('timer-presets').addEventListener('change', e => {
    if (e.target.value==='custom') $('custom-preset').classList.remove('hidden');
    else {
      $('custom-preset').classList.add('hidden');
      const v = Number(e.target.value);
      if (!isNaN(v)) { timeLeft=duration=v; mode='work'; updateUI(); }
    }
  });

  $('save-preset').addEventListener('click', () => {
    const m = parseInt($('custom-preset').value,10);
    if (m>0) {
      let arr = JSON.parse(localStorage.getItem('timerPresets')||'[]');
      if (!arr.includes(m)) {
        arr.push(m);
        localStorage.setItem('timerPresets', JSON.stringify(arr));
        loadPresets();
      }
    }
  });

  // START / SKIP
  $('start-pause-button').addEventListener('click', () => {
    const sel = $('timer-presets').value;
    if (sel==='custom') {
      const m = parseInt($('custom-preset').value,10);
      if (m>0) { timeLeft=duration=m*60; mode='work'; updateUI(); }
    } else {
      const secs = Number(sel);
      if (!isNaN(secs)) { timeLeft=duration=secs; mode='work'; updateUI(); }
    }
    startPause();
  });
  $('skip-button').addEventListener('click', () => nextSession(false));
  updateUI();

  // SCHEDULE
  $('add-schedule').addEventListener('click', () => {
    const name = $('session-name').value||'Unnamed',
          s = $('start-time').value,
          e = $('end-time').value;
    if (!s||!e) return alert('Please set both times');
    const li = document.createElement('li');
    li.textContent = `${name} — ${s} to ${e}`;
    $('upcoming-sessions-list').appendChild(li);
  });

  // NOTES
  $('save-note').addEventListener('click', () => {
    const txt = $('notes-input').value.trim();
    if (!txt) return alert('Enter notes');
    let arr = JSON.parse(localStorage.getItem('notes')||'[]');
    arr.push({ts:Date.now(),note:txt});
    localStorage.setItem('notes', JSON.stringify(arr));
    alert('Note saved!');
  });

  // SETTINGS
  // dark mode
  const dm = $('dark-mode-toggle');
  dm.addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
  });
  if (localStorage.getItem('darkMode')==='true') {
    dm.checked = true;
    document.body.classList.add('dark');
  }
  // cycle count
  const cc = $('cycle-count');
  cc.addEventListener('change', e => {
    cyclesBeforeLong = parseInt(e.target.value,10)||4;
    localStorage.setItem('cycleCount', cyclesBeforeLong);
  });
  if (localStorage.getItem('cycleCount')) {
    cyclesBeforeLong = parseInt(localStorage.getItem('cycleCount'),10);
    cc.value = cyclesBeforeLong;
  }

  // AMBIENT SOUNDS & ALERT
  const ambient = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3')
  };
  Object.values(ambient).forEach(a=>{ a.loop=true; a.volume=0.5; });

  $('ambient-volume').addEventListener('input', e => {
    const v = e.target.value;
    Object.values(ambient).forEach(a=>a.volume=v);
    localStorage.setItem('ambientVol', v);
  });
  $('ambient-select').addEventListener('change', e => {
    const sel = e.target.value;
    localStorage.setItem('ambientSel', sel);
    Object.values(ambient).forEach(a=>{a.pause();a.currentTime=0;});
    if (ambient[sel]) ambient[sel].play();
  });
  if (localStorage.getItem('ambientVol')!=null) {
    $('ambient-volume').value = localStorage.getItem('ambientVol');
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
