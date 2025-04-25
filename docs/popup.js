document.addEventListener('DOMContentLoaded',()=>{

  // 1) Tab switching
  const tabs = document.querySelectorAll('.icon-btn');
  const panels = document.querySelectorAll('.panel');
  tabs.forEach(btn=>btn.addEventListener('click',()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    panels.forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  }));

  // 2) Pomodoro logic
  const WORK=25*60,SHORT=5*60,LONG=15*60;
  let mode='work', timeLeft=WORK, duration=WORK, timerId=null, cycles=0, cyclesBeforeLong=4;
  const circle=document.querySelector('.progress-ring__circle');
  const r=circle.r.baseVal.value, C=2*Math.PI*r;
  circle.style.strokeDasharray=`${C} ${C}`; circle.style.strokeDashoffset=C;
  const $=id=>document.getElementById(id);
  function setProg(p){ circle.style.strokeDashoffset=C - p/100*C; }
  function fmt(s){const m=Math.floor(s/60).toString().padStart(2,'0'), sec=(s%60).toString().padStart(2,'0'); return `${m}:${sec}` }
  function updUI(){
    $('timer-display').textContent=fmt(timeLeft);
    $('timer-label').textContent=(mode==='work'?'Work':mode==='short-break'?'Short Break':'Long Break');
    setProg((duration-timeLeft)/duration*100);
  }
  function tick(){
    if(timeLeft>0){ timeLeft--; updUI(); }
    else nextSess();
  }
  function startPause(){
    if(timerId){ clearInterval(timerId); timerId=null; $('start-pause-button').textContent='Start'; }
    else { timerId=setInterval(tick,1000); $('start-pause-button').textContent='Pause'; }
  }
  function nextSess(auto=true){
    clearInterval(timerId); timerId=null;
    if(mode==='work'){ cycles++; mode=(cycles%cyclesBeforeLong===0?'long-break':'short-break'); timeLeft=mode==='long-break'?LONG:SHORT; }
    else { mode='work'; timeLeft=WORK; }
    duration=timeLeft; updUI();
    if(auto) { new Audio(chrome.runtime.getURL('sounds/notification.mp3')).play(); startPause(); }
  }

  // DOM refs
  const startBtn=$('start-pause-button'), skipBtn=$('skip-button'),
        presets=$('timer-presets'), custom=$('custom-preset'), savePre=$('save-preset');

  // Presets
  function loadPresets(){
    chrome.storage.local.get('timerPresets',res=>{
      const arr=res.timerPresets||[5,10,17,25];
      presets.innerHTML=''; arr.forEach(m=>presets.add(new Option(`${m} min`,m*60)));
      presets.add(new Option('Custom','custom')); 
    });
  }
  presets.addEventListener('change',()=>{
    if(presets.value==='custom') custom.classList.remove('hidden');
    else {
      custom.classList.add('hidden');
      const v=Number(presets.value);
      if(!isNaN(v)){ timeLeft=duration=v; mode='work'; updUI(); }
    }
  });
  savePre.addEventListener('click',()=>{
    const m=parseInt(custom.value,10);
    if(m>0) chrome.storage.local.get('timerPresets',res=>{
      const arr=res.timerPresets||[5,10,17,25];
      if(!arr.includes(m)){ arr.push(m); chrome.storage.local.set({timerPresets:arr}); loadPresets(); }
    });
  });
  loadPresets();

  startBtn.addEventListener('click',()=>{
    if(presets.value==='custom'){
      const m=parseInt(custom.value,10);
      if(m>0){ timeLeft=duration=m*60; mode='work'; updUI(); }
    } else {
      const v=Number(presets.value);
      if(!isNaN(v)){ timeLeft=duration=v; mode='work'; updUI(); }
    }
    startPause();
  });
  skipBtn.addEventListener('click',()=>nextSess(false));
  updUI();

  // 3) Schedule
  $('add-schedule').addEventListener('click',()=>{
    const name=$('session-name').value||'Unnamed',
          start=$('start-time').value, end=$('end-time').value;
    if(!start||!end) return alert('Please set both times');
    const li=document.createElement('li');
    li.textContent=`${name} — ${start} to ${end}`;
    $('upcoming-sessions-list').appendChild(li);
  });

  // 4) Notes
  $('save-note').addEventListener('click',()=>{
    const txt=$('notes-input').value.trim();
    if(!txt) return alert('Enter notes');
    let arr=JSON.parse(localStorage.getItem('notes')||'[]');
    arr.push({ts:Date.now(),note:txt});
    localStorage.setItem('notes',JSON.stringify(arr));
    alert('Saved');
  });

  // 5) Insights (stub)
  // — hook up chart.js or similar here —

  // 6) Settings
  $('dark-mode-toggle').addEventListener('change',e=>{
    document.body.classList.toggle('dark',e.target.checked);
    chrome.storage.local.set({darkMode:e.target.checked});
  });
  $('cycle-count').addEventListener('change',e=>{
    cyclesBeforeLong=parseInt(e.target.value,10)||4;
    chrome.storage.local.set({cycleCount:cyclesBeforeLong});
  });

  // Blocker
  $('apply-blocking').addEventListener('click',()=>{
    const rules=[];
    if($('block-facebook').checked) rules.push({id:1,condition:{urlFilter:'*://*.facebook.com/*'},action:{type:'block'}});
    if($('block-twitter').checked)  rules.push({id:2,condition:{urlFilter:'*://*.twitter.com/*'},action:{type:'block'}});
    if($('block-instagram').checked)rules.push({id:3,condition:{urlFilter:'*://*.instagram.com/*'},action:{type:'block'}});
    chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:[1,2,3],addRules:rules});
  });

  // Ambient
  const ambient={ rain:new Audio(chrome.runtime.getURL('sounds/rain.mp3')),
                  coffee:new Audio(chrome.runtime.getURL('sounds/coffee.mp3')),
                  white:new Audio(chrome.runtime.getURL('sounds/white.mp3')) };
  Object.values(ambient).forEach(a=>{a.loop=true;a.volume=0.5});
  $('ambient-volume').addEventListener('input',e=>{
    Object.values(ambient).forEach(a=>a.volume=e.target.value);
  });
  $('ambient-select').addEventListener('change',e=>{
    Object.values(ambient).forEach(a=>{a.pause();a.currentTime=0});
    const sel=e.target.value; if(ambient[sel]) ambient[sel].play();
  });
  $('notification-select').addEventListener('change',()=>{
    // just saved, play on next break end
  });

  // load settings
  chrome.storage.local.get(['darkMode','cycleCount','ambientSel','ambientVol'],res=>{
    if(res.darkMode) $('dark-mode-toggle').checked=true,document.body.classList.add('dark');
    if(res.cycleCount) $('cycle-count').value=res.cycleCount,cyclesBeforeLong=res.cycleCount;
    if(res.ambientSel) $('ambient-select').value=res.ambientSel;
    if(res.ambientVol!=null) $('ambient-volume').value=res.ambientVol;
    if(res.ambientVol!=null) $('ambient-volume').dispatchEvent(new Event('input'));
  });
});
