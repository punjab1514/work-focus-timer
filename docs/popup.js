document.addEventListener('DOMContentLoaded',()=>{
  // 1) tab switching
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).classList.add('active');
    });
  });

  // 2) pomodoro
  const WORK=25*60, SHORT=5*60, LONG=15*60;
  let mode='work', timeLeft=WORK, duration=WORK, timerId=null, cycles=0, cyclesBeforeLong=4;
  const circle = document.querySelector('.progress-ring__circle');
  const R = circle.r.baseVal.value, C = 2*Math.PI*R;
  circle.style.strokeDasharray = `${C} ${C}`;
  circle.style.strokeDashoffset= C;
  const $=id=>document.getElementById(id);

  function setProgress(p){ circle.style.strokeDashoffset = C - p/100*C; }
  function fmt(s){
    const m = Math.floor(s/60).toString().padStart(2,'0'),
          sec = (s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
  }
  function updateUI(){
    $('timer-display').textContent=fmt(timeLeft);
    $('timer-label').textContent = mode==='work'? 'Work'
      : mode==='short-break'? 'Short Break' : 'Long Break';
    setProgress((duration-timeLeft)/duration*100);
  }
  function tick(){
    if(timeLeft>0){ timeLeft--; updateUI(); }
    else nextSession();
  }
  function startPause(){
    if(timerId){
      clearInterval(timerId);
      timerId=null;
      $('start-pause-button').textContent='Start';
    } else {
      timerId=setInterval(tick,1000);
      $('start-pause-button').textContent='Pause';
    }
  }
  function nextSession(auto=true){
    clearInterval(timerId);
    timerId=null;
    if(mode==='work'){
      cycles++;
      mode = cycles%cyclesBeforeLong===0? 'long-break':'short-break';
      timeLeft = mode==='long-break'? LONG:SHORT;
    } else {
      mode='work';
      timeLeft=WORK;
    }
    duration = timeLeft;
    updateUI();
    if(auto){
      new Audio('sounds/notification.mp3').play();
      startPause();
    }
  }

  // presets UI
  function loadPresets(){
    chrome.storage.local.get('timerPresets',res=>{
      const arr = res.timerPresets||[5,10,17,25];
      $('timer-presets').innerHTML='';
      arr.forEach(m=> $('timer-presets').add(new Option(`${m} min`,m*60)));
      $('timer-presets').add(new Option('Custom','custom'));
    });
  }
  $('timer-presets').addEventListener('change',e=>{
    if(e.target.value==='custom'){
      $('custom-preset').classList.remove('hidden');
    } else {
      $('custom-preset').classList.add('hidden');
      const v = Number(e.target.value);
      if(!isNaN(v)){
        timeLeft=duration=v;
        mode='work';
        updateUI();
      }
    }
  });
  $('save-preset').addEventListener('click',()=>{
    const m = parseInt($('custom-preset').value,10);
    if(m>0){
      chrome.storage.local.get('timerPresets',res=>{
        const arr = res.timerPresets||[5,10,17,25];
        if(!arr.includes(m)){
          arr.push(m);
          chrome.storage.local.set({timerPresets:arr});
          loadPresets();
        }
      });
    }
  });
  loadPresets();

  // start/skip
  $('start-pause-button').addEventListener('click',()=>{
    const sel = $('timer-presets').value;
    if(sel==='custom'){
      const m=parseInt($('custom-preset').value,10);
      if(m>0){ timeLeft=duration=m*60; mode='work'; updateUI();}
    } else {
      const v=Number(sel);
      if(!isNaN(v)){ timeLeft=duration=v; mode='work'; updateUI();}
    }
    startPause();
  });
  $('skip-button').addEventListener('click',()=>nextSession(false));
  updateUI();

  // 3) scheduling
  $('add-schedule').addEventListener('click',()=>{
    const nm = $('session-name').value||'Unnamed',
          st = $('start-time').value,
          et = $('end-time').value;
    if(!st||!et) return alert('Set both times');
    const li = document.createElement('li');
    li.textContent = `${nm} — ${st} to ${et}`;
    $('upcoming-sessions-list').append(li);
  });

  // 4) notes
  $('save-note').addEventListener('click',()=>{
    const txt = $('notes-input').value.trim();
    if(!txt) return alert('Enter notes');
    let arr = JSON.parse(localStorage.getItem('notes')||'[]');
    arr.push({ts:Date.now(),note:txt});
    localStorage.setItem('notes',JSON.stringify(arr));
    alert('Saved');
  });

  // 5) stats (basic)
  function refreshStats(){
    let arr = JSON.parse(localStorage.getItem('notes')||'[]');
    $('stats-today').textContent = arr.length;
    $('stats-week').textContent = arr.length;      // stub
    $('stats-month').textContent = arr.length;     // stub
  }
  refreshStats();

  // 6) settings & ambient
  $('dark-mode-toggle').addEventListener('change',e=>{
    document.body.classList.toggle('dark',e.target.checked);
    chrome.storage.local.set({darkMode:e.target.checked});
  });
  $('cycle-count').addEventListener('change',e=>{
    cyclesBeforeLong = parseInt(e.target.value,10)||4;
    chrome.storage.local.set({cycleCount:cyclesBeforeLong});
  });

  const ambient = {
    rain:   new Audio('sounds/rain.mp3'),
    coffee: new Audio('sounds/coffee.mp3'),
    white:  new Audio('sounds/white.mp3')
  };
  Object.values(ambient).forEach(a=>{a.loop=true; a.volume=0.5});
  $('ambient-volume').addEventListener('input',e=>{
    Object.values(ambient).forEach(a=>a.volume=e.target.value);
    chrome.storage.local.set({ambientVol:e.target.value});
  });
  $('ambient-select').addEventListener('change',e=>{
    Object.values(ambient).forEach(a=>{a.pause();a.currentTime=0;});
    if(ambient[e.target.value]) ambient[e.target.value].play();
    chrome.storage.local.set({ambientSel:e.target.value});
  });
  $('notification-select').addEventListener('change',e=>{
    chrome.storage.local.set({notifSel:e.target.value});
  });

  // restore settings
  chrome.storage.local.get(['darkMode','cycleCount','ambientSel','ambientVol'],res=>{
    if(res.darkMode)      $('dark-mode-toggle').checked=true,document.body.classList.add('dark');
    if(res.cycleCount)    $('cycle-count').value=res.cycleCount,cyclesBeforeLong=res.cycleCount;
    if(res.ambientSel)    $('ambient-select').value=res.ambientSel;
    if(res.ambientVol!=null){
      $('ambient-volume').value=res.ambientVol;
      $('ambient-volume').dispatchEvent(new Event('input'));
    }
  });
});
