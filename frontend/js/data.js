// ============================================================
// NeuroVoice — Data Layer (data.js)
// Replaces backend API calls with localStorage + JSON fallback
// ============================================================

const KEYS = {
  children: 'nv_children',
  observations: 'nv_observations',
  behaviorLogs: 'nv_behavior_logs',
  journalEntries: 'nv_journal',
  schedule: 'nv_schedule',
  accessPrefs: 'nv_access_prefs',
  activeChild: 'nv_active_child',
  caregiverNotes: 'nv_caregiver_notes',
};

// ── Utility ──────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
    console.warn('localStorage unavailable', e);
  }
}

// ── JSON Load with fallback ───────────────────────────────────

async function loadJSON(path, fallback = []) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch {
    console.warn(`Could not load ${path}, using fallback data.`);
    return fallback;
  }
}

// ── Children ─────────────────────────────────────────────────

export async function getChildren() {
  const local = readLS(KEYS.children, null);
  if (local && local.length > 0) return local;
  const json = await loadJSON('./data/children.json', FALLBACK_CHILDREN);
  writeLS(KEYS.children, json);
  return json;
}

export function saveChildren(list) { writeLS(KEYS.children, list); }

export function addChild(child) {
  const list = readLS(KEYS.children, []);
  const entry = { id: uid(), ...child, createdAt: new Date().toISOString() };
  list.unshift(entry);
  saveChildren(list);
  return entry;
}

export function updateChild(id, patch) {
  let list = readLS(KEYS.children, []);
  list = list.map(c => c.id === id ? { ...c, ...patch } : c);
  saveChildren(list);
}

export function deleteChild(id) {
  const list = readLS(KEYS.children, []).filter(c => c.id !== id);
  saveChildren(list);
}

export function getChildById(id) {
  return readLS(KEYS.children, []).find(c => c.id === id) || null;
}

// ── Active Child ──────────────────────────────────────────────

export function getActiveChildId() { return readLS(KEYS.activeChild, null); }
export function setActiveChildId(id) { writeLS(KEYS.activeChild, id); }

// ── Observations ─────────────────────────────────────────────

export async function getObservations(childId = null) {
  let local = readLS(KEYS.observations, null);
  if (!local) {
    local = await loadJSON('./data/observations.json', FALLBACK_OBSERVATIONS);
    writeLS(KEYS.observations, local);
  }
  return childId ? local.filter(o => o.childId === childId) : local;
}

export function addObservation(obs) {
  const list = readLS(KEYS.observations, []);
  const entry = { id: uid(), timestamp: new Date().toISOString(), ...obs };
  list.unshift(entry);
  writeLS(KEYS.observations, list);
  return entry;
}

// ── Behavior Logs ─────────────────────────────────────────────

export function getBehaviorLogs(childId = null) {
  const list = readLS(KEYS.behaviorLogs, []);
  return childId ? list.filter(b => b.childId === childId) : list;
}

export function addBehaviorLog(log) {
  const list = readLS(KEYS.behaviorLogs, []);
  const entry = { id: uid(), timestamp: new Date().toISOString(), ...log };
  list.unshift(entry);
  writeLS(KEYS.behaviorLogs, list);
  return entry;
}

// ── Journal Entries ───────────────────────────────────────────

export function getJournalEntries(childId = null) {
  const list = readLS(KEYS.journalEntries, []);
  return childId ? list.filter(j => j.childId === childId) : list;
}

export function addJournalEntry(entry) {
  const list = readLS(KEYS.journalEntries, []);
  const e = { id: uid(), timestamp: new Date().toISOString(), ...entry };
  list.unshift(e);
  writeLS(KEYS.journalEntries, list);
  return e;
}

// ── Caregiver Notes ───────────────────────────────────────────

export function getCaregiverNotes(childId = null) {
  const list = readLS(KEYS.caregiverNotes, []);
  return childId ? list.filter(n => n.childId === childId) : list;
}

export function addCaregiverNote(note) {
  const list = readLS(KEYS.caregiverNotes, []);
  const e = { id: uid(), timestamp: new Date().toISOString(), ...note };
  list.unshift(e);
  writeLS(KEYS.caregiverNotes, list);
  return e;
}

// ── Schedule ──────────────────────────────────────────────────

export async function getSchedule(childId) {
  const allSchedules = await loadJSON('./data/schedule.json', []);
  const match = allSchedules.find(s => s.childId === childId);
  return match || DEFAULT_SCHEDULE;
}

// ── Communication Cards ───────────────────────────────────────

export async function getCommunicationCards() {
  return loadJSON('./data/communication_cards.json', FALLBACK_COMM_CARDS);
}

// ── Accessibility Preferences ─────────────────────────────────

export function getAccessPrefs() {
  return readLS(KEYS.accessPrefs, {
    textSize: 'normal',
    contrast: 'standard',
    motion: 'normal',
    mode: 'standard',
    audio: true,
  });
}

export function saveAccessPrefs(prefs) {
  writeLS(KEYS.accessPrefs, prefs);
}

// ── Pattern Insights (frontend-generated) ─────────────────────

export function generatePatternInsights(childId) {
  const obs = readLS(KEYS.observations, []).filter(o => !childId || o.childId === childId);
  if (obs.length === 0) return null;

  const moodCounts = {};
  const contextCounts = {};
  const weekData = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 };
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  obs.forEach(o => {
    moodCounts[o.mood] = (moodCounts[o.mood] || 0) + 1;
    contextCounts[o.context] = (contextCounts[o.context] || 0) + 1;
    const d = new Date(o.timestamp);
    const label = days[d.getDay()];
    if (label in weekData) weekData[label]++;
  });

  const topMood = Object.entries(moodCounts).sort((a,b) => b[1]-a[1])[0];
  const topContext = Object.entries(contextCounts).sort((a,b) => b[1]-a[1])[0];

  const participationLevels = obs.map(o => o.participationLevel);
  const highCount = participationLevels.filter(l => l === 'High').length;
  const lowCount = participationLevels.filter(l => l === 'Low').length;

  return {
    totalObservations: obs.length,
    topMood: topMood ? { label: topMood[0], count: topMood[1] } : null,
    topContext: topContext ? { label: topContext[0], count: topContext[1] } : null,
    weekData,
    moodCounts,
    contextCounts,
    highParticipation: highCount,
    lowParticipation: lowCount,
    summary: generateInsightSummary(topMood, topContext, highCount, lowCount, obs.length),
  };
}

function generateInsightSummary(topMood, topContext, highCount, lowCount, total) {
  const lines = [];
  if (topMood) lines.push(`Most frequently observed mood: ${topMood[0]} (${topMood[1]} of ${total} observations).`);
  if (topContext) lines.push(`Most common context: ${topContext[0]}.`);
  if (highCount > lowCount) lines.push(`High participation was observed more often than low participation.`);
  else if (lowCount > highCount) lines.push(`Low participation was recorded more frequently — may benefit from additional support during those times.`);
  return lines;
}

// ── AI Assistant (Rule-based, frontend prototype) ─────────────

const ASSISTANT_RESPONSES = {
  patterns: (insights) => {
    if (!insights || insights.totalObservations === 0)
      return "No observations have been recorded yet. Start by adding a daily observation!";
    let msg = `I've reviewed ${insights.totalObservations} recorded observations.\n\n`;
    if (insights.topMood) msg += `📊 Most frequently observed mood: **${insights.topMood.label}**.\n`;
    if (insights.topContext) msg += `📍 Most common context: **${insights.topContext.label}**.\n`;
    if (insights.lowParticipation > 2) msg += `\n⚠️ Low participation was recorded on ${insights.lowParticipation} occasions — consider reviewing what happened during those periods.`;
    return msg;
  },
  suggestions: (insights) => {
    if (!insights) return "Add some observations first and I can suggest supportive strategies.";
    if (insights.topContext === 'Classroom' && insights.lowParticipation > 1)
      return "Recurring low participation in the classroom context may be helped by: visual schedules, clear transition warnings, and reducing unexpected changes. Consider discussing with the special educator.";
    if (insights.topMood?.label === 'Frustrated' || insights.topMood?.label === 'Anxious')
      return "Frequent frustration or anxiety observations suggest the child may benefit from: additional transition time, a quiet calm-down area, and consistent familiar routines throughout the day.";
    return "The recorded patterns look generally positive. Continue maintaining consistent routines and using visual communication supports.";
  },
  default: () => "I can help you review observation patterns, understand trends, and suggest supportive strategies. Try asking: 'What patterns did you find this week?' or 'What do you suggest?'",
};

export function getAssistantResponse(input, childId) {
  const lower = input.toLowerCase();
  const insights = generatePatternInsights(childId);

  if (lower.includes('pattern') || lower.includes('week') || lower.includes('trend') || lower.includes('observation'))
    return { text: ASSISTANT_RESPONSES.patterns(insights), type: 'pattern' };
  if (lower.includes('suggest') || lower.includes('help') || lower.includes('support') || lower.includes('strateg'))
    return { text: ASSISTANT_RESPONSES.suggestions(insights), type: 'suggestion' };
  if (lower.includes('mood') || lower.includes('emotion'))
    return { text: insights ? `Most observed mood: ${insights.topMood?.label || 'varied'}. Mood data is based on caregiver observations recorded in the system.` : 'No mood data yet.', type: 'mood' };
  return { text: ASSISTANT_RESPONSES.default(), type: 'default' };
}

// ── Fallback / seed data ──────────────────────────────────────

const FALLBACK_CHILDREN = [
  {
    id: 'child_001',
    name: 'Aarav Sharma',
    age: 9,
    gender: 'Male',
    avatar: '🧒',
    supportLevel: 'Level 2 — Requiring Substantial Support',
    caregiver: 'Priya Sharma (Mother)',
    teacher: 'Ms. Kavitha Reddy',
    communicationMethod: 'Visual + Gestures',
    interests: ['Drawing', 'Music', 'Trains'],
    todayStatus: '😊',
    todayStatusLabel: 'Happy',
    notes: 'Aarav responds well to visual schedules.',
  },
  {
    id: 'child_002',
    name: 'Meera Nair',
    age: 7,
    gender: 'Female',
    avatar: '👧',
    supportLevel: 'Level 1 — Requiring Support',
    caregiver: 'Anand Nair (Father)',
    teacher: 'Ms. Lakshmi Patel',
    communicationMethod: 'Speech + Signs',
    interests: ['Music', 'Painting', 'Nature'],
    todayStatus: '🙂',
    todayStatusLabel: 'Calm',
    notes: 'Meera responds well to calm environments.',
  },
];

const FALLBACK_OBSERVATIONS = [
  { id: 'o1', childId: 'child_001', date: '2026-08-30', mood: 'Happy', moodEmoji: '😊', communication: ['Used picture communication'], behavior: ['Participated in activity'], context: 'Classroom', participationLevel: 'High', recordedBy: 'Ms. Kavitha Reddy', timestamp: '2026-08-30T09:30:00Z' },
  { id: 'o2', childId: 'child_001', date: '2026-08-29', mood: 'Anxious', moodEmoji: '😟', communication: ['Used gestures'], behavior: ['Needed additional support'], context: 'Classroom', participationLevel: 'Low', recordedBy: 'Ms. Kavitha Reddy', timestamp: '2026-08-29T10:15:00Z' },
];

const FALLBACK_COMM_CARDS = {
  feelings: [
    { id: 'f1', emoji: '😊', label: 'Happy', speech: 'I am feeling happy.' },
    { id: 'f2', emoji: '😢', label: 'Sad', speech: 'I am feeling sad.' },
    { id: 'f3', emoji: '😡', label: 'Angry', speech: 'I am feeling angry.' },
    { id: 'f4', emoji: '😟', label: 'Worried', speech: 'I am feeling worried.' },
    { id: 'f5', emoji: '😴', label: 'Tired', speech: 'I am feeling tired.' },
    { id: 'f6', emoji: '🤕', label: 'Uncomfortable', speech: 'I feel uncomfortable.' },
  ],
  needs: [
    { id: 'n1', emoji: '💧', label: 'Water', speech: 'I would like some water.' },
    { id: 'n2', emoji: '🍎', label: 'Food', speech: 'I am hungry.' },
    { id: 'n3', emoji: '🚻', label: 'Bathroom', speech: 'I need the bathroom.' },
    { id: 'n4', emoji: '👩‍🏫', label: 'Help', speech: 'I need help.' },
    { id: 'n5', emoji: '🏠', label: 'Home', speech: 'I want to go home.' },
    { id: 'n6', emoji: '🛌', label: 'Rest', speech: 'I need to rest.' },
  ],
  people: [
    { id: 'p1', emoji: '👩', label: 'Mum', speech: 'I want my mum.' },
    { id: 'p2', emoji: '👨', label: 'Dad', speech: 'I want my dad.' },
    { id: 'p3', emoji: '👩‍🏫', label: 'Teacher', speech: 'I need my teacher.' },
  ],
  activities: [
    { id: 'a1', emoji: '🎨', label: 'Drawing', speech: 'I want to draw.' },
    { id: 'a2', emoji: '🎵', label: 'Music', speech: 'I want music.' },
    { id: 'a3', emoji: '⚽', label: 'Play', speech: 'I want to play.' },
    { id: 'a4', emoji: '📚', label: 'Reading', speech: 'I want to read.' },
  ],
  places: [
    { id: 'pl1', emoji: '🏫', label: 'School', speech: 'I want to go to school.' },
    { id: 'pl2', emoji: '🏠', label: 'Home', speech: 'I want to go home.' },
    { id: 'pl3', emoji: '🌳', label: 'Park', speech: 'I want to go to the park.' },
  ],
  pain: [
    { id: 'pa1', emoji: '🤕', label: 'Head Hurts', speech: 'My head is hurting.' },
    { id: 'pa2', emoji: '🤢', label: 'Tummy Hurts', speech: 'My tummy is hurting.' },
    { id: 'pa3', emoji: '🦵', label: 'Leg Hurts', speech: 'My leg is hurting.' },
  ],
};

const DEFAULT_SCHEDULE = {
  title: "Daily Schedule",
  items: [
    { time: '07:00', icon: '🌅', label: 'Wake Up', description: 'Morning routine begins' },
    { time: '07:30', icon: '🍳', label: 'Breakfast', description: 'Morning meal' },
    { time: '09:00', icon: '🏫', label: 'School', description: 'Learning time begins' },
    { time: '10:30', icon: '🍎', label: 'Break', description: 'Snack and free play' },
    { time: '12:30', icon: '🍽️', label: 'Lunch', description: 'Lunch break' },
    { time: '15:30', icon: '🏠', label: 'Home!', description: 'End of school day' },
    { time: '17:00', icon: '🎮', label: 'Free Time', description: 'Favourite activities' },
    { time: '19:00', icon: '🍴', label: 'Dinner', description: 'Family dinner' },
    { time: '21:00', icon: '🌙', label: 'Bedtime', description: 'Goodnight!' },
  ]
};
