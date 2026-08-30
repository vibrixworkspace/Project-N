/* ============================================================
   NeuroVoice — Main Application Controller (app.js)
   Vanilla JS SPA Router, View Manager, Form Handlers & TTS
   ============================================================ */

import * as Data from './data.js';

// ── State ─────────────────────────────────────────────────────
let currentView = 'home';
let activeChildId = 'child_001'; // Default to Aarav
let selectedCommCategory = 'feelings';
let selectedChildEmotion = null;
let selectedChildNeed = null;

// ── DOM Loaded ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Load initial preferences
  applyAccessibilityPrefs();

  // Load initial children & set active
  const children = await Data.getChildren();
  if (children.length > 0) {
    activeChildId = Data.getActiveChildId() || children[0].id;
  }

  // Setup Event Listeners
  setupNavigation();
  setupAccessibilityControls();
  setupForms();
  setupChildMode();
  setupCommBoard();
  setupAssistant();
  setupModals();
  
  // Render Initial View & Components
  renderChildSelectors();
  renderAllViewsData();

  // Check URL Hash for deep links
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    switchView(hash);
  } else {
    switchView('home');
  }
});

// ── Navigation & View Switcher ────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('[data-view-target]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.getAttribute('data-view-target');
      switchView(target);
      // Close mobile sidebar if open
      document.querySelector('.sidebar')?.classList.remove('open');
    });
  });

  // Mobile Menu Toggle
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });
  }
}

export function switchView(viewId) {
  const views = document.querySelectorAll('.view');
  let found = false;

  views.forEach(v => {
    if (v.id === `view-${viewId}`) {
      v.classList.add('active');
      found = true;
    } else {
      v.classList.remove('active');
    }
  });

  if (!found && views.length > 0) {
    views[0].classList.add('active');
    viewId = 'home';
  }

  currentView = viewId;
  window.location.hash = viewId;

  // Update Nav Active state
  document.querySelectorAll('.nav-item').forEach(nav => {
    if (nav.getAttribute('data-view-target') === viewId) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  // Re-render view specific dynamic data
  refreshViewData(viewId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Child Selector & Sync ─────────────────────────────────────
async function renderChildSelectors() {
  const children = await Data.getChildren();
  const selectors = document.querySelectorAll('.child-select-dropdown');
  
  selectors.forEach(select => {
    select.innerHTML = children.map(c => 
      `<option value="${c.id}" ${c.id === activeChildId ? 'selected' : ''}>${c.avatar || '🧒'} ${c.name} (${c.age} yrs)</option>`
    ).join('');

    select.onchange = (e) => {
      activeChildId = e.target.value;
      Data.setActiveChildId(activeChildId);
      renderAllViewsData();
      showToast(`Selected child: ${children.find(c => c.id === activeChildId)?.name}`, 'info');
    };
  });
}

// ── View Data Refreshers ──────────────────────────────────────
async function renderAllViewsData() {
  await renderDashboard();
  await renderChildProfilesView();
  await renderObservationLogs();
  await renderBehaviorLogsView();
  await renderEmotionJournalView();
  await renderInsightsView();
  await renderScheduleView();
}

async function refreshViewData(viewId) {
  switch (viewId) {
    case 'dashboard':
    case 'educator-dashboard':
    case 'parent-dashboard':
      await renderDashboard();
      break;
    case 'profiles':
      await renderChildProfilesView();
      break;
    case 'observations':
      await renderObservationLogs();
      break;
    case 'behavior-log':
      await renderBehaviorLogsView();
      break;
    case 'journal':
      await renderEmotionJournalView();
      break;
    case 'insights':
      await renderInsightsView();
      break;
    case 'schedule':
      await renderScheduleView();
      break;
    case 'comm-board':
      await renderCommBoardView();
      break;
  }
}

// ── View Renderers ────────────────────────────────────────────

// 1. Dashboard Renderer
async function renderDashboard() {
  const children = await Data.getChildren();
  const activeChild = children.find(c => c.id === activeChildId) || children[0];
  const obs = await Data.getObservations(activeChildId);
  const insights = Data.generatePatternInsights(activeChildId);

  // Update Child Summary Card
  const profileContainer = document.getElementById('dashChildSummary');
  if (profileContainer && activeChild) {
    profileContainer.innerHTML = `
      <div class="child-avatar">${activeChild.avatar || '🧒'}</div>
      <div>
        <h3 class="child-name">${activeChild.name}</h3>
        <p class="child-meta">Age ${activeChild.age} • ${activeChild.supportLevel || 'Support Level 2'}</p>
        <span class="child-status">Observed Mood Today: ${activeChild.todayStatus || '😊'} ${activeChild.todayStatusLabel || 'Happy'}</span>
      </div>
      <div style="margin-left:auto; display:flex; gap:8px;">
        <button class="btn btn-secondary btn-sm" data-view-target="profiles">View Profile</button>
        <button class="btn btn-primary btn-sm" data-view-target="child-mode">Child Mode</button>
      </div>
    `;
    // Re-bind click handlers for dynamic elements
    profileContainer.querySelectorAll('[data-view-target]').forEach(b => {
      b.onclick = () => switchView(b.getAttribute('data-view-target'));
    });
  }

  // Dashboard Stats
  const obsCountEl = document.getElementById('dashTotalObs');
  if (obsCountEl) obsCountEl.textContent = obs.length;

  const topMoodEl = document.getElementById('dashTopMood');
  if (topMoodEl) topMoodEl.textContent = insights?.topMood ? `${insights.topMood.label}` : 'None';

  const commPrefEl = document.getElementById('dashCommPref');
  if (commPrefEl && activeChild) commPrefEl.textContent = activeChild.communicationMethod || 'Visual Cards';

  // Recent Observations Table/List
  const recentListEl = document.getElementById('dashRecentObsList');
  if (recentListEl) {
    if (obs.length === 0) {
      recentListEl.innerHTML = `<div class="empty-state"><p>No recent observations recorded.</p></div>`;
    } else {
      recentListEl.innerHTML = obs.slice(0, 4).map(o => `
        <div class="behavior-log-item">
          <div class="behavior-log-date">${new Date(o.timestamp || Date.now()).toLocaleDateString()} • Recorded by ${o.recordedBy || 'Caregiver'}</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${o.moodEmoji || '😊'} ${o.mood}</strong>
            <span class="tag">${o.context || 'General'}</span>
          </div>
          <p class="behavior-log-text" style="margin-top:6px;">${o.notes || 'No extra notes recorded.'}</p>
        </div>
      `).join('');
    }
  }
}

// 2. Child Profiles Renderer
async function renderChildProfilesView() {
  const children = await Data.getChildren();
  const grid = document.getElementById('childProfilesGrid');
  if (!grid) return;

  grid.innerHTML = children.map(c => `
    <div class="child-card ${c.id === activeChildId ? 'selected-card' : ''}" onclick="selectChildFromProfile('${c.id}')">
      <div class="child-avatar">${c.avatar || '🧒'}</div>
      <h3 class="child-name">${c.name}</h3>
      <p class="child-meta">Age ${c.age} • ${c.gender || 'Child'}</p>
      <div class="child-status">Today: ${c.todayStatus || '😊'} ${c.todayStatusLabel || 'Observed Happy'}</div>
      <div class="child-tags">
        <span class="tag">${c.communicationMethod || 'Visual Cards'}</span>
        <span class="tag">${c.supportLevel ? c.supportLevel.split('—')[0] : 'Level 2'}</span>
      </div>
      <div style="margin-top:16px; font-size:0.85rem; color:var(--text-secondary);">
        <strong>Caregiver:</strong> ${c.caregiver || 'Parent/Guardian'}<br/>
        <strong>Teacher:</strong> ${c.teacher || 'Special Educator'}
      </div>
      <div style="margin-top:16px; display:flex; gap:8px;">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); editChildProfileModal('${c.id}')">Edit</button>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); selectChildFromProfile('${c.id}'); switchView('observations');">Record Mood</button>
      </div>
    </div>
  `).join('');
}

window.selectChildFromProfile = (id) => {
  activeChildId = id;
  Data.setActiveChildId(id);
  renderChildSelectors();
  renderChildProfilesView();
};

window.editChildProfileModal = (id) => {
  const child = Data.getChildById(id);
  if (!child) return;
  
  document.getElementById('editChildId').value = child.id;
  document.getElementById('editChildName').value = child.name;
  document.getElementById('editChildAge').value = child.age;
  document.getElementById('editChildMethod').value = child.communicationMethod || '';
  document.getElementById('editChildNotes').value = child.notes || '';
  
  openModal('editChildModal');
};

// 3. Observation Renderer
async function renderObservationLogs() {
  const obs = await Data.getObservations(activeChildId);
  const container = document.getElementById('observationHistoryList');
  if (!container) return;

  if (obs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="es-icon">📋</div><h3>No observations recorded yet</h3><p>Fill out the form above to record your first daily observation.</p></div>`;
    return;
  }

  container.innerHTML = obs.map(o => `
    <div class="behavior-log-item">
      <div class="behavior-log-date">${new Date(o.timestamp).toLocaleString()} • ${o.context}</div>
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span style="font-size:1.6rem;">${o.moodEmoji || '🙂'}</span>
        <div>
          <strong style="font-size:1rem;">${o.mood}</strong>
          <span class="tag" style="margin-left:8px;">Participation: ${o.participationLevel || 'Medium'}</span>
        </div>
      </div>
      ${o.communication && o.communication.length > 0 ? `<div style="font-size:0.85rem; margin-bottom:4px;"><strong>Communication:</strong> ${o.communication.join(', ')}</div>` : ''}
      ${o.behavior && o.behavior.length > 0 ? `<div style="font-size:0.85rem; margin-bottom:4px;"><strong>Behavior:</strong> ${o.behavior.join(', ')}</div>` : ''}
      <p class="behavior-log-text">${o.notes || 'No extra notes.'}</p>
    </div>
  `).join('');
}

// 4. Behavior Log (ABC Format) Renderer
async function renderBehaviorLogsView() {
  const logs = Data.getBehaviorLogs(activeChildId);
  const container = document.getElementById('behaviorLogList');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="es-icon">📓</div><h3>No behavior logs recorded</h3><p>Log observations using the Antecedent-Behavior-Consequence structure.</p></div>`;
    return;
  }

  container.innerHTML = logs.map(l => `
    <div class="card card-sm" style="margin-bottom:14px;">
      <div class="behavior-log-date">${new Date(l.timestamp).toLocaleString()}</div>
      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; margin-top:8px;">
        <div style="background:var(--bg-subtle); padding:10px; border-radius:8px;">
          <strong style="font-size:0.8rem; color:var(--text-muted);">BEFORE (Antecedent):</strong>
          <p style="font-size:0.88rem; margin-top:4px;">${l.before || 'Not specified'}</p>
        </div>
        <div style="background:rgba(99,102,241,0.08); padding:10px; border-radius:8px; border:1px solid rgba(99,102,241,0.2);">
          <strong style="font-size:0.8rem; color:var(--primary);">OBSERVED (Behavior):</strong>
          <p style="font-size:0.88rem; margin-top:4px;">${l.observed || 'Not specified'}</p>
        </div>
        <div style="background:var(--bg-subtle); padding:10px; border-radius:8px;">
          <strong style="font-size:0.8rem; color:var(--text-muted);">AFTER (Consequence):</strong>
          <p style="font-size:0.88rem; margin-top:4px;">${l.after || 'Not specified'}</p>
        </div>
      </div>
    </div>
  `).join('');
}

// 5. Emotion Journal Renderer
async function renderEmotionJournalView() {
  const entries = Data.getJournalEntries(activeChildId);
  const container = document.getElementById('journalTimelineList');
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="es-icon">🎨</div><h3>No journal entries yet</h3><p>Record how the child's day went above!</p></div>`;
    return;
  }

  container.innerHTML = `<div class="timeline">` + entries.map(e => `
    <div class="timeline-entry">
      <div class="timeline-date">${new Date(e.timestamp).toLocaleDateString()} at ${new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      <div class="timeline-card">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.5rem;">${e.ratingEmoji || '😊'}</span>
          <strong>${e.ratingLabel || 'Great Day'}</strong>
        </div>
        ${e.enjoyed && e.enjoyed.length > 0 ? `<p style="margin-top:6px; font-size:0.88rem;"><strong>Enjoyed:</strong> ${e.enjoyed.join(', ')}</p>` : ''}
        ${e.notes ? `<p style="margin-top:4px; font-size:0.88rem; color:var(--text-secondary);">${e.notes}</p>` : ''}
      </div>
    </div>
  `).join('') + `</div>`;
}

// 6. Pattern Insights Renderer
async function renderInsightsView() {
  const insights = Data.generatePatternInsights(activeChildId);
  const container = document.getElementById('insightsContent');
  if (!container) return;

  if (!insights) {
    container.innerHTML = `<div class="empty-state"><div class="es-icon">📊</div><h3>Insufficient Data for Insights</h3><p>Record observations over multiple days to see observational trends.</p></div>`;
    return;
  }

  // Render Week Chart Bars
  const maxBar = Math.max(...Object.values(insights.weekData), 1);
  const weekBarsHtml = Object.entries(insights.weekData).map(([day, val]) => `
    <div class="week-bar-wrap">
      <div class="week-bar" style="height: ${(val / maxBar) * 100}%;"></div>
      <span class="week-bar-label">${day}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="insight-card">
      <div class="insight-header">
        <span class="insight-icon">📈</span>
        <div>
          <h3 class="insight-title">Activity & Participation Trends</h3>
          <p class="section-subtitle">Based on ${insights.totalObservations} logged observations</p>
        </div>
      </div>
      <div class="week-chart">${weekBarsHtml}</div>
    </div>

    <div class="card-grid card-grid-3">
      <div class="stat-card">
        <div class="stat-emoji">${insights.topMood?.label === 'Happy' ? '😊' : '😐'}</div>
        <div class="stat-value">${insights.topMood ? insights.topMood.label : 'N/A'}</div>
        <div class="stat-label">Most Common Mood</div>
      </div>
      <div class="stat-card">
        <div class="stat-emoji">📍</div>
        <div class="stat-value">${insights.topContext ? insights.topContext.label : 'N/A'}</div>
        <div class="stat-label">Frequent Context</div>
      </div>
      <div class="stat-card">
        <div class="stat-emoji">🌟</div>
        <div class="stat-value">${insights.highParticipation}</div>
        <div class="stat-label">High Engagement Days</div>
      </div>
    </div>

    <div class="insight-card" style="margin-top:20px;">
      <h3 class="insight-title">Observational Summary</h3>
      <ul style="margin-top:10px; padding-left:20px; font-size:0.9rem; color:var(--text-secondary);">
        ${insights.summary.map(s => `<li style="margin-bottom:6px;">${s}</li>`).join('')}
      </ul>
      <div class="insight-disclaimer">
        ℹ️ <strong>Prototype Pattern Summary:</strong> These observations are rule-based summaries of caregiver logs to assist awareness. They are observational and must not be considered medical conclusions.
      </div>
    </div>
  `;
}

// 7. Visual Schedule Renderer
async function renderScheduleView() {
  const schedule = await Data.getSchedule(activeChildId);
  const container = document.getElementById('visualScheduleList');
  if (!container) return;

  container.innerHTML = schedule.items.map((item, idx) => `
    <div class="schedule-item ${idx === 3 ? 'current' : ''}">
      <span class="schedule-time">${item.time}</span>
      <span class="schedule-icon">${item.icon}</span>
      <div>
        <div class="schedule-label">${item.label}</div>
        <div class="schedule-desc">${item.description}</div>
      </div>
    </div>
  `).join('');
}

// ── Form Handlers ─────────────────────────────────────────────
function setupForms() {
  // 1. Observation Form
  const obsForm = document.getElementById('dailyObsForm');
  if (obsForm) {
    obsForm.onsubmit = (e) => {
      e.preventDefault();
      const mood = obsForm.elements['mood'].value;
      const moodEmojis = { Happy:'😊', Calm:'🙂', Sad:'😢', Frustrated:'😡', Anxious:'😟', Excited:'🤩', Tired:'😴' };
      
      const commChecks = Array.from(obsForm.querySelectorAll('input[name="comm"]:checked')).map(c => c.value);
      const behavChecks = Array.from(obsForm.querySelectorAll('input[name="behav"]:checked')).map(c => c.value);
      const context = obsForm.elements['context'].value;
      const participation = obsForm.elements['participation'].value;
      const notes = obsForm.elements['notes'].value;

      Data.addObservation({
        childId: activeChildId,
        mood,
        moodEmoji: moodEmojis[mood] || '🙂',
        communication: commChecks,
        behavior: behavChecks,
        context,
        participationLevel: participation,
        notes,
        recordedBy: 'Caregiver / Educator'
      });

      // Update child's status for today
      Data.updateChild(activeChildId, { todayStatus: moodEmojis[mood] || '🙂', todayStatusLabel: mood });

      showToast('Daily observation saved successfully!', 'success');
      obsForm.reset();
      renderAllViewsData();
    };
  }

  // 2. Behavior ABC Form
  const abcForm = document.getElementById('behaviorAbcForm');
  if (abcForm) {
    abcForm.onsubmit = (e) => {
      e.preventDefault();
      const before = abcForm.elements['before'].value;
      const observed = abcForm.elements['observed'].value;
      const after = abcForm.elements['after'].value;

      Data.addBehaviorLog({
        childId: activeChildId,
        before,
        observed,
        after
      });

      showToast('Behavior log recorded.', 'success');
      abcForm.reset();
      renderBehaviorLogsView();
    };
  }

  // 3. Emotion Journal Form
  const journalForm = document.getElementById('myDayJournalForm');
  if (journalForm) {
    journalForm.onsubmit = (e) => {
      e.preventDefault();
      const rating = journalForm.elements['dayRating'].value;
      const ratingMap = { Great:'😊', Good:'🙂', Okay:'😐', Difficult:'😟', VeryDifficult:'😢' };
      const enjoyed = Array.from(journalForm.querySelectorAll('input[name="enjoyed"]:checked')).map(c => c.value);
      const notes = journalForm.elements['journalNotes'].value;

      Data.addJournalEntry({
        childId: activeChildId,
        ratingLabel: rating,
        ratingEmoji: ratingMap[rating] || '🙂',
        enjoyed,
        notes
      });

      showToast('Journal entry saved!', 'success');
      journalForm.reset();
      renderEmotionJournalView();
    };
  }

  // 4. Add Child Profile Form
  const addChildForm = document.getElementById('addChildProfileForm');
  if (addChildForm) {
    addChildForm.onsubmit = (e) => {
      e.preventDefault();
      const name = addChildForm.elements['name'].value;
      const age = parseInt(addChildForm.elements['age'].value) || 7;
      const gender = addChildForm.elements['gender'].value;
      const supportLevel = addChildForm.elements['supportLevel'].value;
      const caregiver = addChildForm.elements['caregiver'].value;
      const teacher = addChildForm.elements['teacher'].value;
      const method = addChildForm.elements['method'].value;

      const newChild = Data.addChild({
        name, age, gender, supportLevel, caregiver, teacher,
        communicationMethod: method,
        avatar: gender === 'Female' ? '👧' : '🧒',
        todayStatus: '😊',
        todayStatusLabel: 'Happy'
      });

      activeChildId = newChild.id;
      Data.setActiveChildId(activeChildId);
      closeModal('addChildModal');
      addChildForm.reset();
      showToast(`Created profile for ${name}`, 'success');
      renderChildSelectors();
      renderChildProfilesView();
    };
  }

  // 5. Edit Child Form
  const editChildForm = document.getElementById('editChildProfileForm');
  if (editChildForm) {
    editChildForm.onsubmit = (e) => {
      e.preventDefault();
      const id = document.getElementById('editChildId').value;
      const name = document.getElementById('editChildName').value;
      const age = parseInt(document.getElementById('editChildAge').value) || 7;
      const method = document.getElementById('editChildMethod').value;
      const notes = document.getElementById('editChildNotes').value;

      Data.updateChild(id, { name, age, communicationMethod: method, notes });
      closeModal('editChildModal');
      showToast(`Updated profile for ${name}`, 'success');
      renderChildSelectors();
      renderChildProfilesView();
    };
  }
}

// ── Help Me Communicate & Comm Board ─────────────────────────
async function setupCommBoard() {
  const cardsData = await Data.getCommunicationCards();
  renderCommBoardView(cardsData);

  // Setup category filter buttons
  document.querySelectorAll('.filter-btn[data-comm-cat]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn[data-comm-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCommCategory = btn.getAttribute('data-comm-cat');
      renderCommBoardView(cardsData);
    };
  });
}

async function renderCommBoardView(cardsData) {
  if (!cardsData) cardsData = await Data.getCommunicationCards();
  const grid = document.getElementById('commBoardGrid');
  if (!grid) return;

  const categoryCards = cardsData[selectedCommCategory] || cardsData.feelings || [];
  grid.innerHTML = categoryCards.map(c => `
    <div class="comm-card" onclick="selectCommCard('${c.label}', '${c.speech.replace(/'/g, "\\'")}', '${c.emoji}')">
      <span class="cc-emoji">${c.emoji}</span>
      <span>${c.label}</span>
    </div>
  `).join('');
}

window.selectCommCard = (label, speechText, emoji) => {
  const box = document.getElementById('commSelectedDisplay');
  const textEl = document.getElementById('commSelectedText');

  if (box && textEl) {
    textEl.innerHTML = `<span style="font-size:2rem; vertical-align:middle; margin-right:8px;">${emoji}</span> "${speechText}"`;
    box.classList.add('show');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Trigger TTS
  speakText(speechText);
};

// Text to speech helper
export function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    showToast('Speech synthesis not supported on this browser.', 'warning');
  }
}

// Attach TTS to buttons with onclick speak
window.speakSelectedMessage = () => {
  const textEl = document.getElementById('commSelectedText');
  if (textEl) {
    const raw = textEl.textContent.replace(/^[\s\S]*?"/, '').replace(/"$/, '');
    if (raw) speakText(raw);
  }
};

// ── Child Mode ────────────────────────────────────────────────
function setupChildMode() {
  // Child Mode Emotion Card Clicks
  document.querySelectorAll('.child-emotion-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.child-emotion-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const text = btn.getAttribute('data-speech');
      const em = btn.getAttribute('data-emoji');
      
      const out = document.getElementById('childModeOutput');
      if (out) {
        out.innerHTML = `${em} ${text}`;
        out.classList.add('show');
      }
      speakText(text);
    };
  });

  // Child Mode Need Card Clicks
  document.querySelectorAll('.child-need-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.child-need-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const text = btn.getAttribute('data-speech');
      const em = btn.getAttribute('data-emoji');
      
      const out = document.getElementById('childModeOutput');
      if (out) {
        out.innerHTML = `${em} ${text}`;
        out.classList.add('show');
      }
      speakText(text);
    };
  });
}

// ── AI Assistant Setup ────────────────────────────────────────
function setupAssistant() {
  const input = document.getElementById('assistantInput');
  const sendBtn = document.getElementById('assistantSendBtn');
  const messages = document.getElementById('assistantMessages');

  if (!input || !sendBtn || !messages) return;

  const handleSend = () => {
    const txt = input.value.trim();
    if (!txt) return;

    // Append User Msg
    messages.innerHTML += `
      <div class="msg-row user-msg">
        <div class="msg-avatar user-av">👤</div>
        <div class="msg-bubble user-bubble">${txt}</div>
      </div>
    `;
    input.value = '';
    messages.scrollTop = messages.scrollHeight;

    // Generate Response
    setTimeout(() => {
      const res = Data.getAssistantResponse(txt, activeChildId);
      messages.innerHTML += `
        <div class="msg-row">
          <div class="msg-avatar ai-av">🤖</div>
          <div class="msg-bubble ai-bubble">
            ${res.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
            <div class="msg-disclaimer">⚡ Prototype response based on recorded observations</div>
          </div>
        </div>
      `;
      messages.scrollTop = messages.scrollHeight;
    }, 400);
  };

  sendBtn.onclick = handleSend;
  input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
}

// ── Accessibility Center Controls ──────────────────────────────
function setupAccessibilityControls() {
  const prefs = Data.getAccessPrefs();

  // Text Size
  document.querySelectorAll('[data-access-text]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-access-text]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      prefs.textSize = btn.getAttribute('data-access-text');
      Data.saveAccessPrefs(prefs);
      applyAccessibilityPrefs();
    };
  });

  // Contrast
  document.querySelectorAll('[data-access-contrast]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-access-contrast]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      prefs.contrast = btn.getAttribute('data-access-contrast');
      Data.saveAccessPrefs(prefs);
      applyAccessibilityPrefs();
    };
  });

  // Motion
  document.querySelectorAll('[data-access-motion]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-access-motion]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      prefs.motion = btn.getAttribute('data-access-motion');
      Data.saveAccessPrefs(prefs);
      applyAccessibilityPrefs();
    };
  });
}

function applyAccessibilityPrefs() {
  const prefs = Data.getAccessPrefs();
  const body = document.body;

  // Text Size
  body.classList.remove('text-large', 'text-xlarge');
  if (prefs.textSize === 'large') body.classList.add('text-large');
  if (prefs.textSize === 'xlarge') body.classList.add('text-xlarge');

  // Contrast
  if (prefs.contrast === 'high') body.classList.add('high-contrast');
  else body.classList.remove('high-contrast');

  // Motion
  if (prefs.motion === 'reduced') body.classList.add('reduced-motion');
  else body.classList.remove('reduced-motion');
}

// ── Modal Dialog Helpers ──────────────────────────────────────
function setupModals() {
  document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
    btn.onclick = () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('open');
    };
  });
}

export function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('open');
}

export function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('open');
}

window.openModal = openModal;
window.closeModal = closeModal;
window.switchView = switchView;

// ── Toast Notification Helper ─────────────────────────────────
export function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;
