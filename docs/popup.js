document.addEventListener('DOMContentLoaded', () => {
  // TAB SWITCHER
  const tabs   = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(btn => btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
  }));

  // POMODORO LOGIC
  const WORK      = 25*60;
  const SHORT     =  5*60;
  const LONG      = 15*60;
  let   mode      = 'work';
  let   timeLeft  = WORK;
  let   duration  = WORK;
  let   timerId   = null;
  let   cycles    = 0;
  let   cycleCap  = Number(localStorage.getItem('cycleCount')) || 4;

  const circle = document.querySelector('.progress-ring__circle');
  const r      = circle.r.baseVal.value;
  const C      = 2*Math.PI*r;
  circle.style.strokeDasharray  = `${C} ${C}`;
  circle.style.strokeDashoffset = C;

  const $ = id => document.getElementById(id);

  function setProg(pct) {
    circle.style.strokeDashoffset = C - (pct/100)*C;
  }
  function fmt(s) {
    const m  = Math.floor(s/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${m}:${ss}`;
  }
  function updUI() {
    $('timer-display').textContent = fmt(timeLeft);
    $('timer-label').textContent   =
      mode==='work'        ? 'Work' :
      mode==='short-break' ? 'Short Break' :
                             'Long Break';
    setProg(((duration-timeLeft)/duration)*100);
  }
  function tick() {
    if (timeLeft>0) { timeLeft--; updUI(); }
    else nextSess();
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
  function nextSess(auto=true) {
    clearInterval(timerId);
    timerId = null;
    if (mode==='work') {
      cycles++;
      mode     = (cycles % cycleCap===0) ? 'long-break' : 'short-break';
      timeLeft = (mode==='long-break') ? LONG : SHORT;
    } else {
      mode     = 'work';
      timeLeft = WORK;
    }
    duration = timeLeft;
    updUI();
    if (auto) {
      new Audio('sounds/notification.mp3').play();
      startPause();
    }
  }

  // QUICK PRESETS (localStorage)
  const presets = $('timer-presets');
  const custom  = $('custom-preset');
  const savePre = $('save-preset');

  function loadPresets() {
    let arr = JSON.parse(localStorage.getItem('timerPresets')||'[]');
    if (!arr.length) arr = [5,10,17,25];
    presets.innerHTML = '';
    arr.forEach(m => presets.add(new Option(`${m} min`, m*60)));
    presets.add(new Option('Custom','custom'));
    localStorage.setItem('timerPresets', JSON.stringify(arr));
  }
  presets.addEventListener('change', e => {
    if (e.target.value==='custom') custom.classList.remove('hidden');
    else {
      custom.classList.add('hidden');
      const v = Number(e.target.value);
      if (!isNaN(v)) {
        timeLeft = duration = v; mode='work'; updUI();
      }
    }
  });
  savePre.addEventListener('click', () => {
    const m = parseInt(custom.value, 10);
    if (m>0) {
      let arr = JSON.parse(localStorage.getItem('timerPresets')||'[]');
      if (!arr.includes(m)) {
        arr.push(m);
        localStorage.setItem('timerPresets', JSON.stringify(arr));
        loadPresets();
      }
    }
  });
  loadPresets();

  // START/SKIP
  $('start-pause-button').addEventListener('click', () => {
    const v = presets.value==='custom'
            ? parseInt(custom.value,10)*60
            : Number(presets.value);
    if (!isNaN(v) && v>0) {
      timeLeft = duration = v;
      mode = 'work';
      updUI();
    }
    startPause();
  });
  $('skip-button').addEventListener('click', () => nextSess(false));

  updUI();


  // SCHEDULE
  $('add-schedule').addEventListener('click', () => {
    const name  = $('session-name').value || 'Unnamed';
    const start = $('start-time').value;
    const end   = $('end-time').value;
    if (!start||!end) return alert('Please set both times');
    const li = document.createElement('li');
    li.textContent = `${name} — ${start} to ${end}`;
    $('upcoming-sessions-list').appendChild(li);
  });


  // NOTES
  $('save-note').addEventListener('click', () => {
    const txt = $('notes-input').value.trim();
    if (!txt) return alert('Enter some notes');
    let arr = JSON.parse(localStorage.getItem('notes')||'[]');
    arr.push({ts:Date.now(),note:txt});
    localStorage.setItem('notes', JSON.stringify(arr));
    alert('Saved');
  });


  // SETTINGS: dark mode & cycle count
  $('dark-mode-toggle').addEventListener('change', e => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked);
  });
  $('cycle-count').addEventListener('change', e => {
    cycleCap = parseInt(e.target.value,10)||4;
    localStorage.setItem('cycleCount', cycleCap);
  });

  // AMBIENT SOUNDS
  const amb = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3')
  };
  Object.values(amb).forEach(a => { a.loop=true; a.volume=0.5; });
  $('ambient-volume').addEventListener('input', e => {
    Object.values(amb).forEach(a => a.volume = parseFloat(e.target.value));
  });
  $('ambient-select').addEventListener('change', e => {
    Object.values(amb).forEach(a => { a.pause(); a.currentTime = 0; });
    const sel = e.target.value;
    if (amb[sel]) amb[sel].play();
    localStorage.setItem('ambientSel', sel);
  });

  // restore settings
  if (localStorage.getItem('darkMode') === 'true') {
    $('dark-mode-toggle').checked = true;
    document.body.classList.add('dark');
  }
  if (localStorage.getItem('cycleCount')) {
    $('cycle-count').value = localStorage.getItem('cycleCount');
    cycleCap = +localStorage.getItem('cycleCount');
  }
  if (localStorage.getItem('ambientSel')) {
    $('ambient-select').value = localStorage.getItem('ambientSel');
  }
  if (localStorage.getItem('ambientVol')) {
    $('ambient-volume').value = +localStorage.getItem('ambientVol');
    $('ambient-volume').dispatchEvent(new Event('input'));
  }
});
