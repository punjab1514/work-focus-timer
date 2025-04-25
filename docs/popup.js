<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Work Focus Timer</title>
  <link href="popup.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet" />
</head>
<body>
  <div class="toolbar">
    <div class="logo">⏱️ FocusTimer</div>
    <nav>
      <button data-view="timer" class="tab active">Timer</button>
      <button data-view="schedule" class="tab">Schedule</button>
      <button data-view="insights" class="tab">Insights</button>
      <button data-view="notes" class="tab">Notes</button>
    </nav>
    <button id="settings-button" class="settings-icon">⚙️</button>
  </div>

  <div id="views">
    <!-- Timer View -->
    <section id="view-timer" class="view active">
      <!-- (existing timer card markup) -->
      <!-- ... --->
    </section>

    <!-- Schedule View -->
    <section id="view-schedule" class="view">
      <h2>Upcoming Sessions</h2>
      <ul id="upcoming-sessions-list"></ul>
      <button id="add-schedule-unit">+ New Session</button>
    </section>

    <!-- Insights View -->
    <section id="view-insights" class="view">
      <h2>Productivity Insights</h2>
      <div id="stats-summary"><!-- stats here --></div>
      <canvas id="stats-chart" width="320" height="120"></canvas>
    </section>

    <!-- Notes View -->
    <section id="view-notes" class="view">
      <h2>Session Notes</h2>
      <textarea id="notes-input" placeholder="Write your note..."></textarea>
      <button id="save-note">Save Note</button>
      <ul id="notes-list"></ul>
    </section>
  </div>

  <!-- Settings Drawer -->
  <div id="settings-drawer" class="drawer">
    <button id="close-settings">×</button>
    <h2>Settings</h2>
    <label>Dark Mode: <input type="checkbox" id="dark-mode-toggle" /></label>
    <label>Cycles before long break: <input type="number" id="cycle-count" min="1" value="4" /></label>
    <h3>Website Blocker</h3>
    <label><input type="checkbox" id="block-facebook" /> Facebook</label>
    <label><input type="checkbox" id="block-twitter" /> Twitter</label>
    <label><input type="checkbox" id="block-instagram" /> Instagram</label>
    <h3>Ambient Sounds & Alerts</h3>
    <label>Focus Sound:
      <select id="ambient-select">
        <option value="none">None</option>
        <option value="rain">Rain</option>
        <option value="coffee">Coffee Shop</option>
        <option value="white">White Noise</option>
      </select>
    </label>
    <label>Volume: <input type="range" id="ambient-volume" min="0" max="1" step="0.1" value="0.5" /></label>
    <label>Notification Sound:
      <select id="notification-select"><option value="notification">Chime</option><option value="beep">Beep</option></select>
    </label>
  </div>

  <script src="popup.js"></script>
</body>
</html>
