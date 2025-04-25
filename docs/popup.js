document.addEventListener('DOMContentLoaded', () => {
  // ─── Tab Switching ─────────────────────────────────────────────────────────
  document.querySelectorAll('.tabs .tab-btn').forEach(btn=>{
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s=>s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // ─── Pomodoro Timer Setup ─────────────────────────────────────────────────
  const WORK = 25*60, SHORT = 5*60, LONG = 15*60;
  let mode='work', timeLeft=WORK, cycle=0, userCycles=4, running=false, intervalId=null;
  let currentDur = WORK;
  const $ = id=>document.getElementById(id);
  const label = $('timer-label'), display = $('timer-display');
  const circle = document.querySelector('.progress-ring__circle');
  const radius = circle.r.baseVal.value, circumference=2*Math.PI*radius;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference;
  function setProgress(p){ circle.style.strokeDashoffset = circumference - (p/100)*circumference; }
  function fmt(sec){ let m=Math.floor(sec/60).toString().padStart(2,'0'), s=(sec%60).toString().padStart(2,'0'); return `${m}:${s}`; }
  function updateUI(){
    display.textContent = fmt(timeLeft);
    label.textContent = mode==='work'?'Work': mode==='short-break'?'Short Break':'Long Break';
    let pct = ((currentDur - timeLeft)/currentDur)*100; setProgress(pct);
  }
  function nextSession(auto=true){
    clearInterval(intervalId);
    running=false;
    if(mode==='work'){ cycle++; mode = cycle%userCycles===0?'long-break':'short-break'; timeLeft = mode==='long-break'?LONG:SHORT; }
    else { mode='work'; timeLeft = WORK; }
    currentDur = timeLeft;
    updateUI();
    $('start-pause-button').textContent='Start';
    if(auto){ notificationSound.play(); startTimer(); }
  }
  function tick(){
    if(timeLeft>0){ timeLeft--; updateUI(); }
    else nextSession();
  }
  function startTimer(){
    if(!running){ intervalId=setInterval(tick,1000); $('start-pause-button').textContent='Pause'; running=true; }
    else { clearInterval(intervalId); $('start-pause-button').textContent='Start'; running=false; }
  }

  // ─── Quick Presets ─────────────────────────────────────────────────────────
  const presets = $('timer-presets'), custom = $('custom-preset'), saveP = $('save-preset');
  function loadPresets(){
    chrome.storage.local.get('timerPresets',res=>{
      let arr = res.timerPresets||[5,10,17,25];
      presets.innerHTML='';
      arr.forEach(m=>presets.add(new Option(`${m} min`,m*60)));
      presets.add(new Option('Custom','custom'));
    });
  }
  presets.addEventListener('change',e=>{
    if(e.target.value==='custom') custom.style.display='block';
    else { custom.style.display='none'; currentDur=timeLeft=Number(e.target.value); updateUI(); }
  });
  saveP.addEventListener('click',()=>{
    let m=parseInt(custom.value,10);
    if(m>0) chrome.storage.local.get('timerPresets',res=>{
      let arr=res.timerPresets||[5,10,17,25];
      if(!arr.includes(m)){ arr.push(m); chrome.storage.local.set({timerPresets:arr},loadPresets); }
    });
  });
  loadPresets();

  // ─── Start/Pause & Skip handlers ────────────────────────────────────────────
  $('start-pause-button').addEventListener('click',()=>{
    if(presets.value==='custom'){ let m=parseInt(custom.value,10); if(m>0){ timeLeft=currentDur=m*60; mode='work'; updateUI(); } }
    else { timeLeft=currentDur=Number(presets.value); mode='work'; updateUI(); }
    startTimer();
  });
  $('skip-button').addEventListener('click',()=>nextSession(false));

  // ─── Scheduling ─────────────────────────────────────────────────────────────
  $('add-schedule').addEventListener('click',()=>{
    let name=$('session-name').value||'Unnamed';
    let start=$('start-time').value, end=$('end-time').value;
    if(!start||!end){ alert('Set both times'); return; }
    let li=document.createElement('li');
    li.textContent=`${name} — ${start} to ${end}`;
    $('upcoming-sessions-list').append(li);
    alert('Scheduled');
  });

  // ─── Productivity Insights (placeholder) ──────────────────────────────────
  // you can hook up a chart.js or any other here…

  // ─── Session Notes ──────────────────────────────────────────────────────────
  $('save-note').addEventListener('click',()=>{
    if(!notesRunning && !running) alert('Start a session first');
    else{ let txt=$('notes-input').value||'No notes'; alert('Saved: '+txt); }
  });

  // ─── Website Blocker ────────────────────────────────────────────────────────
  $('apply-blocking').addEventListener('click',()=>{
    let rules=[];
    if($('block-facebook').checked) rules.push({id:1,condition:{urlFilter:'*://*.facebook.com/*'},action:{type:'block'}});
    if($('block-twitter').checked)  rules.push({id:2,condition:{urlFilter:'*://*.twitter.com/*'},action:{type:'block'}});
    if($('block-instagram').checked)rules.push({id:3,condition:{urlFilter:'*://*.instagram.com/*'},action:{type:'block'}});
    chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:[1,2,3],addRules:rules});
    alert('Blocking applied');
  });

  // ─── Dark Mode & Cycle Count ────────────────────────────────────────────────
  const darkToggle=$('dark-mode-toggle'), cycleInput=$('cycle-count');
  darkToggle.addEventListener('change',e=>{
    document.body.classList.toggle('dark',e.target.checked);
    chrome.storage.local.set({darkMode:e.target.checked});
  });
  cycleInput.addEventListener('change',e=>{
    let v=parseInt(e.target.value,10);
    if(v>0){ userCycles=v; chrome.storage.local.set({cycleCount:v}); }
  });
  chrome.storage.local.get(['darkMode','cycleCount'],res=>{
    if(res.darkMode){ document.body.classList.add('dark'); darkToggle.checked=true; }
    if(res.cycleCount){ userCycles=res.cycleCount; cycleInput.value=res.cycleCount; }
  });

  // ─── Ambient Sounds & Alerts ────────────────────────────────────────────────
  const ambientSel=$('ambient-select'), ambientVol=$('ambient-volume'), notifSel=$('notification-select');
  const ambientSounds = {
    rain:new Audio(chrome.runtime.getURL('sounds/rain.mp3')),
    coffee:new Audio(chrome.runtime.getURL('sounds/coffee.mp3')),
    white:new Audio(chrome.runtime.getURL('sounds/white.mp3'))
  };
  const notificationSound=new Audio(chrome.runtime.getURL('sounds/notification.mp3'));
  Object.values(ambientSounds).forEach(a=>{ a.loop=true; a.volume=0.5; });
  ambientVol.addEventListener('input',()=>{
    let v=parseFloat(ambientVol.value);
    Object.values(ambientSounds).forEach(a=>a.volume=v);
    chrome.storage.local.set({ambientVol:v});
  });
  ambientSel.addEventListener('change',()=>{
    Object.values(ambientSounds).forEach(a=>{ a.pause(); a.currentTime=0; });
    let sel=ambientSel.value;
    if(ambientSounds[sel]) ambientSounds[sel].play();
    chrome.storage.local.set({ambientSel:sel});
  });
  notifSel.addEventListener('change',()=>{
    chrome.storage.local.set({notifSel:notifSel.value});
  });
  chrome.storage.local.get(['ambientSel','ambientVol','notifSel'],res=>{
    if(res.ambientSel) ambientSel.value=res.ambientSel;
    if(res.ambientVol!=null) ambientVol.value=res.ambientVol;
    if(res.notifSel) notifSel.value=res.notifSel;
    ambientVol.dispatchEvent(new Event('input'));
    ambientSel.dispatchEvent(new Event('change'));
  });

  // ─── init ───────────────────────────────────────────────────────────────────
  updateUI();
});
