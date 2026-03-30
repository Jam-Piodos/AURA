/* ============================================
   AURA — Emotional AI Companion
   script.js
   ============================================ */

// ─── State ───────────────────────────────────
const state = {
  voiceEnabled: true,
  isRecording: false,
  isThinking: false,
  chatHistory: [],
  currentMood: 'neutral',
};

// ─── DOM References ───────────────────────────
const chatWindow   = document.getElementById('chat-window');
const chatIntro    = document.getElementById('chat-intro');
const userInput    = document.getElementById('user-input');
const sendBtn      = document.getElementById('send-btn');
const micBtn       = document.getElementById('mic-btn');
const voiceToggle  = document.getElementById('voice-toggle');
const clearBtn     = document.getElementById('clear-btn');
const orbCore      = document.getElementById('orb-core');
const statusDot    = document.getElementById('status-dot');
const statusText   = document.getElementById('status-text');
const moodIcon     = document.getElementById('mood-icon');
const moodLabel    = document.getElementById('mood-label');
const thinkingBar  = document.getElementById('thinking-bar');
const thinkingSteps= document.getElementById('thinking-steps');
const charCount    = document.getElementById('char-count');
const bgCanvas     = document.getElementById('bg-canvas');

// ─── Emotion Database ─────────────────────────
const emotions = {
  sad: {
    keywords: ['sad','unhappy','depressed','depressing','crying','cry','tears','heartbroken','broken','lonely','alone','hopeless','worthless','empty','numb','miserable','grief','lost','hurt','pain','suffer','bad','down','low','upset','blue','gloomy','dark','dark place','cant go on'],
    icon: '😔', label: 'Sad', color: '#60a5fa',
    badge: { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.3)', color: '#60a5fa', text: 'Sensing sadness' }
  },
  anxious: {
    keywords: ['anxious','anxiety','panic','worried','worry','scared','fear','afraid','nervous','stress','stressed','overwhelmed','overthinking','overthink','can\'t breathe','heart racing','shaking','dread','dreadful','tense','pressure','burden','too much'],
    icon: '😰', label: 'Anxious', color: '#a78bfa',
    badge: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', color: '#a78bfa', text: 'Sensing anxiety' }
  },
  angry: {
    keywords: ['angry','anger','furious','rage','mad','annoyed','frustrated','frustrating','hate','pissed','irritated','irritating','unfair','betrayed','betrayal','resentful','resentment','boiling','explosive','livid'],
    icon: '😤', label: 'Frustrated', color: '#f87171',
    badge: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', color: '#f87171', text: 'Sensing frustration' }
  },
  happy: {
    keywords: ['happy','excited','joy','joyful','great','amazing','wonderful','fantastic','love','loving','grateful','gratitude','proud','proud of','awesome','good','excellent','perfect','thrilled','elated','blessed','thankful','best','winning','success','achieve','accomplished'],
    icon: '😊', label: 'Joyful', color: '#34d399',
    badge: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', color: '#34d399', text: 'Sensing joy' }
  },
  confused: {
    keywords: ['confused','confusing','don\'t know','dont know','unsure','uncertain','what should','help me decide','lost','which way','no idea','clueless','baffled','puzzled','unclear','not sure','mixed up','torn'],
    icon: '🤔', label: 'Confused', color: '#fbbf24',
    badge: { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', text: 'Sensing confusion' }
  },
  tired: {
    keywords: ['tired','exhausted','drained','burnout','burnt out','no energy','sleepy','sleep','fatigue','fatigued','worn out','can\'t keep up','can\'t cope','done','fed up','give up','giving up','cant take'],
    icon: '😴', label: 'Tired', color: '#94a3b8',
    badge: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', color: '#94a3b8', text: 'Sensing fatigue' }
  },
  neutral: {
    keywords: [],
    icon: '😌', label: 'Neutral', color: '#4fc3f7',
    badge: { bg: 'rgba(79,195,247,0.1)', border: 'rgba(79,195,247,0.15)', color: '#4fc3f7', text: 'Reading your mood' }
  },
};

// ─── AI Responses ─────────────────────────────
const responses = {
  sad: [
    "That sounds really heavy. It's okay to feel this way — you don't have to carry it alone. What's been weighing on you most?",
    "Sadness is the heart's way of saying something matters deeply to you. I'm here. Tell me more.",
    "I hear you. Some days are just hard, and that's okay. You don't need to be strong right now. What happened?",
    "It takes courage to acknowledge pain. You're not weak — you're feeling. What's been going on?",
    "I'm sorry you're going through this. Even in the darkest moments, things can shift. Can you tell me what's happening?",
    "You're not alone in this. Sometimes just naming what hurts is the first step. What are you feeling most right now?",
  ],
  anxious: [
    "Take a breath. You're safe right now, in this moment. What's your mind spiraling around?",
    "Anxiety loves to turn small things into mountains. Let's slow it down — what's the actual situation you're facing?",
    "I notice you're feeling overwhelmed. That's valid. What if we broke it down into the one thing that matters most right now?",
    "Your nervous system is working overtime. Let's anchor: what's one thing you *can* control in this situation?",
    "Worried minds often protect us — but sometimes they overdrive. What's the worst case you're imagining, and how likely is it really?",
    "That sounds like a lot to hold. Anxiety shrinks when we look at it directly. What's really scaring you?",
  ],
  angry: [
    "That frustration makes complete sense. Something or someone has crossed a line for you. What happened?",
    "Your feelings are valid. Anger often signals that something important to you was ignored or violated. What's the situation?",
    "I hear that. It's okay to be angry — it's information. What's the thing that's bothering you most right now?",
    "Frustration like this usually comes from caring a lot. What do you wish was different?",
    "That sounds genuinely unfair. Tell me more — I want to understand what you're dealing with.",
    "Sometimes things just don't go the way they should. I'm listening. What's got you feeling this way?",
  ],
  happy: [
    "That energy is contagious! Tell me what's going so well — I love hearing this.",
    "Yes! You deserve this moment. What are you most proud of or excited about?",
    "This is the kind of feeling to hold onto. What's making today a good one?",
    "I love this for you. What happened? I want to hear everything.",
    "You're radiating good energy. What's the win? Let's celebrate it properly.",
    "That sounds wonderful. Joy is worth acknowledging — what's the thing making you feel this way?",
  ],
  confused: [
    "When everything feels unclear, it helps to zoom out. What's the core decision or question you're facing?",
    "Confusion usually means you're standing at a crossroads with more than one good option. What are the paths in front of you?",
    "Let's think through this together. What do you *know* for sure, and what's still uncertain?",
    "Sometimes writing out the options — even out loud to me — can make things clearer. What are you trying to figure out?",
    "No shame in being unsure — it means you're thinking carefully. What would you do if you trusted yourself?",
    "Let me ask you this: what does your gut say, even if your head is confused?",
  ],
  tired: [
    "Being exhausted isn't just physical — it's your whole system signaling that it needs rest. What's been draining you?",
    "That kind of tiredness goes deep. It's okay to slow down. What's been demanding so much of your energy lately?",
    "Burnout is real and it takes time to recover. You don't have to push through everything. What would feel like relief right now?",
    "It sounds like you've been giving a lot. What would it feel like to let yourself rest — truly rest?",
    "Even the strongest people need to recharge. What's one thing you could step back from, even briefly?",
    "Your body is telling you something important. What's the thing you've been pushing yourself hardest on?",
  ],
  neutral: [
    "I'm here. What's on your mind today?",
    "Happy to think alongside you. What are you processing lately?",
    "I'm listening — no filters needed. What would you like to talk about?",
    "Sometimes just saying things out loud helps. What's on your mind?",
    "You've got my full attention. What's up?",
    "This space is yours. What do you want to explore today?",
  ],
  followup: [
    "How long have you been feeling this way?",
    "What do you think is underneath all this?",
    "If this situation resolved tomorrow, what would that look like?",
    "What would you tell a close friend going through exactly this?",
    "What's one small thing that might make today slightly more bearable?",
    "Is there someone in your life you can lean on right now?",
    "What does your gut tell you the right move is?",
    "What's the kindest thing you could do for yourself right now?",
  ],
  encouragement: [
    "You're doing better than you think — seriously.",
    "The fact that you're reflecting on this says a lot about who you are.",
    "Whatever you're facing, you've made it through hard things before.",
    "Progress isn't always visible. Sometimes it's just surviving the day — and that counts.",
    "You don't have to have it all figured out. Just the next step.",
    "You're allowed to be a work in progress.",
  ],
};

// ─── Intent Detection ─────────────────────────
const intents = {
  greeting: { keywords: ['hello','hi','hey','good morning','good evening','good afternoon','howdy','what\'s up','sup','greetings'], handler: handleGreeting },
  farewell:  { keywords: ['bye','goodbye','see you','later','good night','take care','farewell','ciao','ttyl'], handler: handleFarewell },
  thanks:    { keywords: ['thank','thanks','thank you','appreciate','grateful','ty'], handler: handleThanks },
  help:      { keywords: ['help','what can you do','how does this work','what are you','who are you'], handler: handleHelp },
  encourage: { keywords: ['motivate','inspire','i need motivation','encourage','i can\'t do this','i give up','i quit','i fail'], handler: handleEncourage },
};

// ─── Detect Emotion ───────────────────────────
function detectEmotion(text) {
  const lower = text.toLowerCase();
  let maxScore = 0;
  let detected = 'neutral';

  for (const [key, data] of Object.entries(emotions)) {
    if (key === 'neutral') continue;
    let score = 0;
    for (const kw of data.keywords) {
      if (lower.includes(kw)) score += kw.split(' ').length; // weight multi-word
    }
    if (score > maxScore) { maxScore = score; detected = key; }
  }
  return detected;
}

// ─── Detect Intent ────────────────────────────
function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const [key, data] of Object.entries(intents)) {
    for (const kw of data.keywords) {
      if (lower.includes(kw)) return data.handler;
    }
  }
  return null;
}

// ─── Pick Random Response ─────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Intent Handlers ──────────────────────────
function handleGreeting() {
  const greets = [
    "Hey, good to see you here 👋 What's on your mind?",
    "Hello! I'm AURA. Ready to listen — what's going on today?",
    "Hey there. Glad you're here. How are you really doing?",
    "Hi! Tell me what's happening in your world right now.",
  ];
  return pick(greets);
}

function handleFarewell() {
  const byes = [
    "Take care of yourself. Remember — you matter more than you know. 💙",
    "Goodbye for now. I'll be here whenever you need to talk.",
    "See you soon. You're doing okay, even if it doesn't feel like it.",
  ];
  return pick(byes);
}

function handleThanks() {
  const ty = [
    "Of course. I'm always here for you. 💙",
    "Anytime. That's what I'm here for.",
    "You're welcome. Keep being kind to yourself.",
  ];
  return pick(ty);
}

function handleHelp() {
  return "I'm AURA — an emotional AI companion. You can share anything with me: how you're feeling, a problem you're facing, or something you just need to think through. I'll listen, reflect, and offer support. What's on your mind?";
}

function handleEncourage() {
  return pick(responses.encouragement) + " " + pick(responses.followup);
}

// ─── Main AI Response Generator ───────────────
function generateResponse(text) {
  // Check intent first
  const intentHandler = detectIntent(text);
  if (intentHandler) return intentHandler();

  const emotion = detectEmotion(text);
  state.currentMood = emotion;

  const emotionResponse = pick(responses[emotion]);

  // Add occasional encouragement or follow-up
  const roll = Math.random();
  if (roll < 0.3) {
    return emotionResponse + " " + pick(responses.followup);
  } else if (roll < 0.45) {
    return pick(responses.encouragement) + " " + emotionResponse;
  }
  return emotionResponse;
}

// ─── Update Mood UI ───────────────────────────
function updateMoodUI(emotionKey) {
  const em = emotions[emotionKey];
  moodIcon.textContent = em.icon;
  moodLabel.textContent = em.label;
  moodLabel.style.color = em.color;
}

// ─── Orb State ────────────────────────────────
function setOrbState(s) {
  orbCore.classList.remove('thinking','speaking');
  statusDot.classList.remove('thinking','speaking','listening');
  if (s === 'thinking') {
    orbCore.classList.add('thinking');
    statusDot.classList.add('thinking');
    statusText.textContent = 'Analyzing…';
  } else if (s === 'speaking') {
    orbCore.classList.add('speaking');
    statusDot.classList.add('speaking');
    statusText.textContent = 'Speaking…';
  } else if (s === 'listening') {
    statusDot.classList.add('listening');
    statusText.textContent = 'Listening…';
  } else {
    statusText.textContent = 'Ready to listen';
  }
}

// ─── Thinking Bar Animation ───────────────────
const thinkingPhases = [
  'Reading emotion',
  'Analyzing tone',
  'Thinking…',
  'Formulating response',
];

function showThinking() {
  thinkingSteps.innerHTML = thinkingPhases.map((p, i) =>
    `<span class="thinking-step" id="ts-${i}">
      <span class="thinking-step-dot"></span>${p}
    </span>`
  ).join('');
  thinkingBar.classList.add('visible');
  setOrbState('thinking');
}

function progressThinking(index) {
  document.querySelectorAll('.thinking-step').forEach((el, i) => {
    el.classList.remove('active','done');
    if (i < index) el.classList.add('done');
    else if (i === index) el.classList.add('active');
  });
}

function hideThinking() {
  thinkingBar.classList.remove('visible');
  thinkingSteps.innerHTML = '';
}

// ─── Add Message Bubble ───────────────────────
function addMessage(role, text, emotionKey) {
  chatIntro && (chatIntro.style.display = 'none');

  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'ai' ? '◈' : '🧑';

  const right = document.createElement('div');

  if (role === 'ai' && emotionKey && emotionKey !== 'neutral') {
    const em = emotions[emotionKey];
    const badge = document.createElement('div');
    badge.className = 'emotion-badge';
    badge.style.cssText = `background:${em.badge.bg};border:1px solid ${em.badge.border};color:${em.badge.color}`;
    badge.innerHTML = `${em.icon} ${em.badge.text}`;
    right.appendChild(badge);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  right.appendChild(bubble);
  right.appendChild(time);

  wrapper.appendChild(avatar);
  wrapper.appendChild(right);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  if (role === 'ai') {
    typeText(bubble, text);
  } else {
    bubble.textContent = text;
  }

  // Save to history
  state.chatHistory.push({ role, text, ts: Date.now() });
  saveHistory();

  return bubble;
}

// ─── Typing Effect ────────────────────────────
function typeText(el, text, speed = 22) {
  el.textContent = '';
  let i = 0;
  const interval = setInterval(() => {
    el.textContent += text[i];
    i++;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    if (i >= text.length) clearInterval(interval);
  }, speed);
  return new Promise(res => setTimeout(res, text.length * speed + 100));
}

// ─── Typing Indicator ─────────────────────────
function showTypingIndicator() {
  const wrap = document.createElement('div');
  wrap.className = 'message ai';
  wrap.id = 'typing-indicator-wrap';

  const av = document.createElement('div');
  av.className = 'msg-avatar';
  av.textContent = '◈';

  const ind = document.createElement('div');
  ind.className = 'typing-indicator';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    ind.appendChild(dot);
  }

  wrap.appendChild(av);
  wrap.appendChild(ind);
  chatWindow.appendChild(wrap);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator-wrap');
  if (el) el.remove();
}

// ─── Main Send Flow ───────────────────────────
async function sendMessage(text) {
  if (!text.trim() || state.isThinking) return;
  text = text.trim();

  state.isThinking = true;
  userInput.value = '';
  userInput.style.height = 'auto';
  charCount.textContent = '0 / 500';

  addMessage('user', text);

  const emotion = detectEmotion(text);

  // Show thinking sequence
  showThinking();
  showTypingIndicator();

  const delays = [300, 600, 900, 1100];
  for (let i = 0; i < thinkingPhases.length; i++) {
    await delay(delays[i]);
    progressThinking(i);
  }
  await delay(500);

  hideThinking();
  removeTypingIndicator();

  const response = generateResponse(text);

  updateMoodUI(emotion);
  setOrbState('speaking');
  addMessage('ai', response, emotion);

  if (state.voiceEnabled) {
    await speakText(response);
  }

  setOrbState('idle');
  state.isThinking = false;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Speech Synthesis ─────────────────────────
function speakText(text) {
  return new Promise(resolve => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.pitch = 1.05;
    utt.volume = 0.9;

    // Prefer a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Google UK English Female') ||
      v.name.includes('Karen') ||
      v.name.includes('Moira') ||
      (v.lang === 'en-US' && v.localService)
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (preferred) utt.voice = preferred;

    utt.onend = resolve;
    utt.onerror = resolve;
    window.speechSynthesis.speak(utt);
  });
}

// ─── Speech Recognition ───────────────────────
let recognition = null;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = 'en-US';

  rec.onstart = () => {
    state.isRecording = true;
    micBtn.classList.add('recording');
    setOrbState('listening');
  };

  rec.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    userInput.value = transcript;
    adjustTextareaHeight();
    sendMessage(transcript);
  };

  rec.onerror = () => {
    stopRecording();
    setOrbState('idle');
  };

  rec.onend = () => {
    stopRecording();
  };

  return rec;
}

function startRecording() {
  if (!recognition) recognition = initSpeechRecognition();
  if (!recognition) {
    addMessage('ai', "Sorry, your browser doesn't support voice input. Try typing instead.", 'neutral');
    return;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  recognition.start();
}

function stopRecording() {
  state.isRecording = false;
  micBtn.classList.remove('recording');
  if (statusText.textContent === 'Listening…') setOrbState('idle');
}

// ─── Event Listeners ──────────────────────────
sendBtn.addEventListener('click', () => sendMessage(userInput.value));

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(userInput.value);
  }
});

userInput.addEventListener('input', () => {
  adjustTextareaHeight();
  const len = userInput.value.length;
  charCount.textContent = `${len} / 500`;
});

micBtn.addEventListener('click', () => {
  if (state.isRecording) {
    recognition && recognition.stop();
    stopRecording();
  } else {
    startRecording();
  }
});

voiceToggle.addEventListener('click', () => {
  state.voiceEnabled = !state.voiceEnabled;
  voiceToggle.classList.toggle('active', state.voiceEnabled);
  const voiceOn  = voiceToggle.querySelector('.voice-on');
  const voiceOff = voiceToggle.querySelector('.voice-off');
  if (state.voiceEnabled) {
    voiceOn.classList.remove('hidden');
    voiceOff.classList.add('hidden');
  } else {
    voiceOn.classList.add('hidden');
    voiceOff.classList.remove('hidden');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }
});

clearBtn.addEventListener('click', () => {
  chatWindow.innerHTML = '';
  const intro = document.createElement('div');
  intro.className = 'chat-intro';
  intro.id = 'chat-intro';
  intro.innerHTML = `
    <p class="intro-line">Fresh start.</p>
    <p class="intro-sub">I'm still here. What would you like to talk about?</p>
  `;
  chatWindow.appendChild(intro);
  state.chatHistory = [];
  localStorage.removeItem('aura-history');
  updateMoodUI('neutral');
});

function adjustTextareaHeight() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

// ─── localStorage History ─────────────────────
function saveHistory() {
  try {
    localStorage.setItem('aura-history', JSON.stringify(state.chatHistory.slice(-50)));
  } catch(e) {}
}

function loadHistory() {
  try {
    const saved = localStorage.getItem('aura-history');
    if (!saved) return;
    const history = JSON.parse(saved);
    if (!history.length) return;

    chatIntro.style.display = 'none';
    history.forEach(msg => {
      const wrapper = document.createElement('div');
      wrapper.className = `message ${msg.role}`;
      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = msg.role === 'ai' ? '◈' : '🧑';
      const right = document.createElement('div');
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = msg.text;
      const time = document.createElement('div');
      time.className = 'msg-time';
      time.textContent = new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      right.appendChild(bubble);
      right.appendChild(time);
      wrapper.appendChild(avatar);
      wrapper.appendChild(right);
      chatWindow.appendChild(wrapper);
    });

    state.chatHistory = history;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch(e) {}
}

// ─── Background Canvas (Starfield + Grid) ─────
(function initBackground() {
  const canvas = bgCanvas;
  const ctx = canvas.getContext('2d');
  let w, h, stars = [], gridLines = [];
  let raf;

  function resize() {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
    buildStars();
    buildGrid();
  }

  function buildStars() {
    stars = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.004,
        speed: Math.random() * 0.08 + 0.01,
      });
    }
  }

  function buildGrid() {
    gridLines = [];
    const spacing = 60;
    for (let x = 0; x <= w; x += spacing) gridLines.push({ type: 'v', pos: x });
    for (let y = 0; y <= h; y += spacing) gridLines.push({ type: 'h', pos: y });
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(79,195,247,0.04)';
    ctx.lineWidth = 1;
    for (const line of gridLines) {
      ctx.beginPath();
      if (line.type === 'v') { ctx.moveTo(line.pos, 0); ctx.lineTo(line.pos, h); }
      else { ctx.moveTo(0, line.pos); ctx.lineTo(w, line.pos); }
      ctx.stroke();
    }
  }

  function drawStars() {
    for (const s of stars) {
      s.a += s.da;
      if (s.a <= 0 || s.a >= 1) s.da *= -1;
      s.y -= s.speed;
      if (s.y < 0) { s.y = h; s.x = Math.random() * w; }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,180,255,${s.a * 0.6})`;
      ctx.fill();
    }
  }

  let t = 0;
  function drawNebula() {
    t += 0.003;
    const gradient = ctx.createRadialGradient(
      w * 0.2 + Math.sin(t) * 30, h * 0.3 + Math.cos(t * 0.7) * 20, 0,
      w * 0.2, h * 0.3, Math.min(w, h) * 0.55
    );
    gradient.addColorStop(0, 'rgba(79,195,247,0.025)');
    gradient.addColorStop(0.5, 'rgba(167,139,250,0.015)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(
      w * 0.8 + Math.sin(t * 0.5) * 40, h * 0.7 + Math.cos(t) * 30, 0,
      w * 0.8, h * 0.7, Math.min(w, h) * 0.45
    );
    g2.addColorStop(0, 'rgba(244,114,182,0.018)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    drawGrid();
    drawNebula();
    drawStars();
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  frame();
})();

// ─── Orb Floating Particles ───────────────────
(function initParticles() {
  const container = document.getElementById('orb-particles');
  function spawnParticle() {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    const colors = ['#4fc3f7','#a78bfa','#f472b6','#34d399'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * 360;
    const radius = 30 + Math.random() * 40;
    const rad = angle * Math.PI / 180;
    const cx = 80, cy = 80;
    const sx = cx + Math.cos(rad) * radius;
    const sy = cy + Math.sin(rad) * radius;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size*2}px ${color};
      left: ${sx}px;
      top: ${sy}px;
      animation-duration: ${1.5 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 2}s;
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }

  setInterval(spawnParticle, 400);
})();

// ─── Voices Preload ───────────────────────────
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ─── Init ─────────────────────────────────────
voiceToggle.classList.add('active');
loadHistory();

// Welcome message if no history
setTimeout(() => {
  if (state.chatHistory.length === 0) {
    addMessage('ai', "Hey, I'm AURA. I'm here to listen — no judgment, no rush. What's on your mind today?", 'neutral');
    if (state.voiceEnabled) {
      speakText("Hey, I'm AURA. I'm here to listen — no judgment, no rush. What's on your mind today?");
    }
  }
}, 800);
