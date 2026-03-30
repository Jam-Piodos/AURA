/* ============================================================
   AURA v2 — script.js
   Full features: Claude AI, ElevenLabs Voice, Breathing,
   Mood History Chart, Daily Check-In, Gratitude Journal,
   Waveform visualizer, Light/Dark theme, Focus modes,
   Conversation memory, Message reactions
   ============================================================ */

'use strict';

// ─── ElevenLabs voice IDs (free tier voices) ─────────────────
const EL_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  bella:  'EXAVITQu4vr4xnSDxMaL',
  josh:   'TxGEqnHWrfWFTfGW9XjX',
  elli:   'MF3mGyEYCl7XYWbV9V6O',
  domi:   'AZnzlk1XvdvUeBnXmlld',
  adam:   'pNInz6obpgDQGcFmaJgB',
};

// ─── State ────────────────────────────────────────────────────
const S = {
  anthropicKey: '',
  elevenLabsKey: '',
  userName: '',
  voiceEnabled: true,
  voiceChoice: 'browser',
  focusMode: 'companion',
  isThinking: false,
  isRecording: false,
  isSpeaking: false,
  typingSpeed: 20,
  chatHistory: [],       // [{role,content}] for Claude context
  moodLog: [],           // [{date, mood, emoji}]
  gratitudeLog: [],      // [{date, mood, text}]
  currentEmotion: 'neutral',
  audioCtx: null,
  analyser: null,
  micStream: null,
};

// ─── DOM ──────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const chatWindow     = $('chat-window');
const chatIntro      = $('chat-intro');
const userInput      = $('user-input');
const sendBtn        = $('send-btn');
const micBtn         = $('mic-btn');
const voiceToggle    = $('voice-toggle');
const clearBtn       = $('clear-btn');
const themeToggle    = $('theme-toggle');
const orbCore        = $('orb-core');
const statusDot      = $('status-dot');
const statusText     = $('status-text');
const moodIcon       = $('mood-icon');
const moodLabel      = $('mood-label');
const thinkingBar    = $('thinking-bar');
const thinkingSteps  = $('thinking-steps');
const charCount      = $('char-count');
const modeIndicator  = $('mode-indicator');
const voiceSelect    = $('voice-select');
const orbWaveform    = $('orb-waveform');
const introGreeting  = $('intro-greeting');
const introName      = $('intro-name');

// ─── Emotion Data ─────────────────────────────────────────────
const EMOTIONS = {
  sad:     { keywords: ['sad','unhappy','depressed','crying','cry','heartbroken','lonely','alone','hopeless','worthless','empty','numb','miserable','grief','lost','hurt','pain','broken','devastated','shattered','low','blue','gloomy','dark place'], icon:'😔', label:'Sad', color:'#60a5fa', badge:{bg:'rgba(96,165,250,0.1)',border:'rgba(96,165,250,0.3)',color:'#60a5fa',text:'Sensing sadness'} },
  anxious: { keywords: ['anxious','anxiety','panic','worried','worry','scared','fear','afraid','nervous','stress','stressed','overwhelmed','overthinking','cant breathe','heart racing','shaking','dread','tense','pressure','too much','on edge','spiraling'], icon:'😰', label:'Anxious', color:'#a78bfa', badge:{bg:'rgba(167,139,250,0.1)',border:'rgba(167,139,250,0.3)',color:'#a78bfa',text:'Sensing anxiety'} },
  angry:   { keywords: ['angry','anger','furious','rage','mad','annoyed','frustrated','hate','pissed','irritated','unfair','betrayed','resentful','boiling','livid','furious','explosive','fed up'], icon:'😤', label:'Frustrated', color:'#f87171', badge:{bg:'rgba(248,113,113,0.1)',border:'rgba(248,113,113,0.3)',color:'#f87171',text:'Sensing frustration'} },
  happy:   { keywords: ['happy','excited','joy','joyful','great','amazing','wonderful','fantastic','love','grateful','gratitude','proud','awesome','excellent','perfect','thrilled','elated','blessed','thankful','best','success','accomplished','winning','grateful','positive'], icon:'😊', label:'Joyful', color:'#34d399', badge:{bg:'rgba(52,211,153,0.1)',border:'rgba(52,211,153,0.3)',color:'#34d399',text:'Sensing joy'} },
  confused:{ keywords: ['confused','confusing','don\'t know','dont know','unsure','uncertain','what should','help me decide','no idea','clueless','baffled','puzzled','unclear','not sure','mixed up','torn','lost'], icon:'🤔', label:'Confused', color:'#fbbf24', badge:{bg:'rgba(251,191,36,0.1)',border:'rgba(251,191,36,0.3)',color:'#fbbf24',text:'Sensing confusion'} },
  tired:   { keywords: ['tired','exhausted','drained','burnout','burnt out','no energy','sleepy','fatigue','fatigued','worn out','can\'t cope','cant cope','done','give up','giving up','cant take','depleted','spent','dead inside'], icon:'😴', label:'Tired', color:'#94a3b8', badge:{bg:'rgba(148,163,184,0.1)',border:'rgba(148,163,184,0.3)',color:'#94a3b8',text:'Sensing fatigue'} },
  neutral: { keywords: [], icon:'😌', label:'Neutral', color:'#4fc3f7', badge:{bg:'rgba(79,195,247,0.1)',border:'rgba(79,195,247,0.15)',color:'#4fc3f7',text:'Reading your mood'} },
};

// ─── Fallback Responses (when no API key) ─────────────────────
const FALLBACKS = {
  sad:     ["That sounds really heavy. You don't have to carry this alone — I'm here. What's been weighing on you most?","Sadness is the heart's way of saying something matters deeply. Tell me more — I'm listening.","I hear you. Some days are just hard, and that's okay. What happened?","It takes courage to acknowledge pain. What are you feeling most right now?"],
  anxious: ["Take a breath. You're safe right now, in this moment. What's your mind spiraling around?","Anxiety loves to turn small things into mountains. Let's slow it down — what's the actual situation?","What if we broke this down to just the one thing that matters most right now?","Your nervous system is working overtime. What's one thing you *can* control right now?"],
  angry:   ["That frustration makes complete sense. What happened?","Your feelings are valid. Anger often signals something important was violated. What's the situation?","I hear that. Anger is information — what's the thing bothering you most right now?","That sounds genuinely unfair. Tell me more."],
  happy:   ["That energy is contagious! Tell me what's going so well.","You deserve this moment — what are you most proud of or excited about?","I love this for you. What happened? Tell me everything.","You're radiating good energy. What's the win?"],
  confused:["When everything feels unclear, it helps to zoom out. What's the core question you're facing?","Let's think through this together. What do you *know* for sure, and what's still uncertain?","Sometimes just naming the options out loud makes things clearer. What are you trying to figure out?","What does your gut say, even if your head is confused?"],
  tired:   ["That kind of tiredness goes deep. It's okay to slow down. What's been draining you?","You've been giving a lot. What would feel like relief right now?","Your body is sending a signal. What's the thing you've been pushing yourself hardest on?","Even the strongest people need to recharge. What would rest actually look like for you?"],
  neutral: ["I'm here. What's on your mind today?","Happy to think alongside you. What are you processing?","You've got my full attention. What's up?","This space is yours. What would you like to explore?"],
};

const INTENTS = {
  greeting:  { kw:['hello','hi','hey','good morning','good evening','good afternoon','howdy','sup'], fn: ()=> S.userName ? `Hey ${S.userName}! Good to see you. How are you really doing?` : "Hey, good to have you here! How are you doing today?" },
  farewell:  { kw:['bye','goodbye','see you','later','good night','take care'], fn: ()=> `Take care of yourself${S.userName ? ', '+S.userName : ''}. I'll be here whenever you need to talk. 💙` },
  thanks:    { kw:['thank','thanks','thank you','appreciate','ty'], fn: ()=> "Of course — that's what I'm here for. 💙" },
  help:      { kw:['what can you do','how does this work','what are you','who are you'], fn: ()=> `I'm AURA, your emotional AI companion. You can share anything — feelings, problems, decisions, or just thoughts you need to get out. I'll listen, reflect, and support. ${S.userName ? 'What's on your mind, '+S.userName+'?' : 'What would you like to talk about?'}` },
  encourage: { kw:['i give up','i quit','i fail','i can\'t do this','i can t do this','i cant do this'], fn: ()=> "You're still here. That matters more than you know. The fact that you're feeling this way tells me you care deeply — and that's not weakness. What's making things feel impossible right now?" },
};

// ─── Focus Mode System Prompts ─────────────────────────────────
const MODE_PROMPTS = {
  companion: `You are AURA, a warm, emotionally intelligent AI companion. Be conversational, empathetic, and human-like. Keep responses concise (2-4 sentences). Ask one thoughtful follow-up question. Never be robotic or give lists. Use natural language like a caring friend would.`,
  vent:      `You are AURA in Vent Mode. The user needs to be heard, not fixed. Just listen, validate, and reflect their feelings back. Don't give advice unless asked. Say things like "That sounds so hard" or "I hear you." Keep responses short and supportive.`,
  advice:    `You are AURA in Advice Mode. Be a thoughtful, practical advisor. Give clear, actionable suggestions but always acknowledge feelings first. Balance empathy with practicality. Keep responses focused and concise.`,
  reflect:   `You are AURA in Reflect Mode. Help the user explore their own thoughts through Socratic questions. Ask things like "What do you think is underneath that?" or "What would you tell a close friend in this situation?" Don't give answers — guide self-discovery.`,
};

// ─── Helpers ──────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const now   = () => new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
const today = () => new Date().toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});

function detectEmotion(text) {
  const lower = text.toLowerCase();
  let best = 'neutral', score = 0;
  for (const [k,v] of Object.entries(EMOTIONS)) {
    if (k === 'neutral') continue;
    let s = 0;
    for (const kw of v.keywords) if (lower.includes(kw)) s += kw.split(' ').length;
    if (s > score) { score = s; best = k; }
  }
  return best;
}

function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const [,v] of Object.entries(INTENTS)) {
    for (const kw of v.kw) if (lower.includes(kw)) return v.fn();
  }
  return null;
}

// ─── Claude API Call ──────────────────────────────────────────
async function callClaude(userMsg) {
  const systemPrompt = MODE_PROMPTS[S.focusMode] + `\n\nUser's name: ${S.userName || 'not given'}. Current detected emotion: ${S.currentEmotion}. Keep responses warm, human, and under 80 words unless the topic requires more depth.`;

  const messages = [
    ...S.chatHistory.slice(-10), // last 10 turns for context
    { role: 'user', content: userMsg }
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': S.anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "I'm here with you. What's on your mind?";
}

// ─── ElevenLabs TTS ───────────────────────────────────────────
async function speakElevenLabs(text) {
  const voiceId = EL_VOICES[S.voiceChoice] || EL_VOICES.rachel;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': S.elevenLabsKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.78 },
    }),
  });
  if (!res.ok) throw new Error('ElevenLabs API error');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended  = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror  = reject;
    audio.play();
  });
}

// ─── Browser TTS ──────────────────────────────────────────────
function speakBrowser(text) {
  return new Promise(resolve => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92; utt.pitch = 1.05; utt.volume = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.name.includes('Karen') || (v.lang === 'en-US' && v.localService)) || voices.find(v => v.lang?.startsWith('en')) || voices[0];
    if (preferred) utt.voice = preferred;
    utt.onend = resolve; utt.onerror = resolve;
    window.speechSynthesis.speak(utt);
  });
}

async function speak(text) {
  if (!S.voiceEnabled) return;
  setOrbState('speaking');
  orbWaveform.classList.add('active');
  try {
    if (S.elevenLabsKey && S.voiceChoice !== 'browser') {
      await speakElevenLabs(text);
    } else {
      await speakBrowser(text);
    }
  } catch (e) {
    console.warn('Voice fallback:', e.message);
    await speakBrowser(text);
  }
  orbWaveform.classList.remove('active');
}

// ─── Orb State ────────────────────────────────────────────────
function setOrbState(state) {
  orbCore.classList.remove('thinking','speaking','listening');
  statusDot.classList.remove('thinking','speaking','listening');
  const states = {
    thinking: { orb:'thinking', dot:'thinking', text:'Analyzing…' },
    speaking: { orb:'speaking', dot:'speaking', text:'Speaking…' },
    listening:{ orb:'listening', dot:'listening', text:'Listening…' },
    idle:     { orb:'', dot:'', text:'Ready' },
  };
  const cfg = states[state] || states.idle;
  if (cfg.orb) orbCore.classList.add(cfg.orb);
  if (cfg.dot) statusDot.classList.add(cfg.dot);
  statusText.textContent = cfg.text;
}

// ─── Thinking Bar ─────────────────────────────────────────────
const PHASES = ['Reading emotion','Analyzing tone','Thinking…','Formulating response'];
function showThinking() {
  thinkingSteps.innerHTML = PHASES.map((p,i) =>
    `<span class="t-step" id="ts${i}"><span class="t-step-dot"></span>${p}</span>`
  ).join('');
  thinkingBar.classList.add('visible');
  setOrbState('thinking');
}
function progressThinking(i) {
  document.querySelectorAll('.t-step').forEach((el,j) => {
    el.classList.toggle('done', j < i);
    el.classList.toggle('active', j === i);
  });
}
function hideThinking() {
  thinkingBar.classList.remove('visible');
  thinkingSteps.innerHTML = '';
}

// ─── Mood UI ──────────────────────────────────────────────────
function updateMoodUI(ek) {
  const em = EMOTIONS[ek] || EMOTIONS.neutral;
  moodIcon.textContent = em.icon;
  moodLabel.textContent = em.label;
  moodLabel.style.color = em.color;
}

// ─── Add Message ──────────────────────────────────────────────
function addMessage(role, text, emotionKey) {
  if (chatIntro) chatIntro.style.display = 'none';

  const wrap = document.createElement('div');
  wrap.className = `message ${role}`;

  const av = document.createElement('div');
  av.className = 'msg-avatar';
  av.textContent = role === 'ai' ? '◈' : (S.userName ? S.userName[0].toUpperCase() : '🧑');

  const right = document.createElement('div');
  right.className = 'msg-right';

  if (role === 'ai' && emotionKey && emotionKey !== 'neutral') {
    const em = EMOTIONS[emotionKey];
    const badge = document.createElement('div');
    badge.className = 'emotion-badge';
    badge.style.cssText = `background:${em.badge.bg};border:1px solid ${em.badge.border};color:${em.badge.color}`;
    badge.textContent = `${em.icon} ${em.badge.text}`;
    right.appendChild(badge);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const time = document.createElement('span');
  time.className = 'msg-time';
  time.textContent = now();

  meta.appendChild(time);

  if (role === 'ai') {
    const reactions = document.createElement('div');
    reactions.className = 'msg-reaction';
    ['👍','❤️','💡'].forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'react-btn';
      btn.textContent = emoji;
      btn.onclick = () => btn.classList.toggle('active');
      reactions.appendChild(btn);
    });
    meta.appendChild(reactions);
  }

  right.appendChild(bubble);
  right.appendChild(meta);
  wrap.appendChild(av);
  wrap.appendChild(right);
  chatWindow.appendChild(wrap);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  if (role === 'ai') {
    typeText(bubble, text);
  } else {
    bubble.textContent = text;
  }

  // Store for Claude context
  S.chatHistory.push({ role: role === 'ai' ? 'assistant' : 'user', content: text });
  saveData();

  return bubble;
}

// ─── Typing Effect ────────────────────────────────────────────
function typeText(el, text) {
  el.textContent = '';
  let i = 0;
  return new Promise(res => {
    const iv = setInterval(() => {
      el.textContent += text[i++];
      chatWindow.scrollTop = chatWindow.scrollHeight;
      if (i >= text.length) { clearInterval(iv); res(); }
    }, S.typingSpeed);
  });
}

// ─── Typing Indicator ─────────────────────────────────────────
function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'message ai'; wrap.id = 'typing-wrap';
  const av = document.createElement('div'); av.className = 'msg-avatar'; av.textContent = '◈';
  const ind = document.createElement('div'); ind.className = 'typing-indicator';
  for (let i=0;i<3;i++) { const d=document.createElement('div'); d.className='t-dot'; ind.appendChild(d); }
  wrap.appendChild(av); wrap.appendChild(ind);
  chatWindow.appendChild(wrap);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
function hideTyping() { const el = $('typing-wrap'); if (el) el.remove(); }

// ─── Main Send Flow ───────────────────────────────────────────
async function sendMessage(text) {
  text = text.trim();
  if (!text || S.isThinking) return;

  S.isThinking = true;
  userInput.value = '';
  userInput.style.height = 'auto';
  charCount.textContent = '0 / 1000';

  const emotion = detectEmotion(text);
  S.currentEmotion = emotion;
  updateMoodUI(emotion);

  addMessage('user', text);

  // Log mood
  S.moodLog.push({ date: new Date().toISOString(), mood: emotion, emoji: EMOTIONS[emotion].icon });
  saveData();

  showThinking(); showTyping();

  const phaseTimes = [280, 550, 820, 1050];
  for (let i=0;i<PHASES.length;i++) { await delay(phaseTimes[i]); progressThinking(i); }
  await delay(400);

  hideThinking(); hideTyping();

  // Generate response
  let response;
  const intentResp = detectIntent(text);

  if (intentResp) {
    response = intentResp;
  } else if (S.anthropicKey) {
    try {
      response = await callClaude(text);
    } catch(e) {
      console.warn('Claude API error:', e.message);
      response = pick(FALLBACKS[emotion] || FALLBACKS.neutral) + ' *(Note: Claude API error — using built-in response)*';
    }
  } else {
    response = pick(FALLBACKS[emotion] || FALLBACKS.neutral);
  }

  setOrbState('idle');
  addMessage('ai', response, emotion);
  await speak(response);

  setOrbState('idle');
  S.isSpeaking = false;
  S.isThinking = false;
}

// ─── Speech Recognition ───────────────────────────────────────
let recognition = null;
function initASR() {
  const ASR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!ASR) return null;
  const r = new ASR();
  r.continuous = false; r.interimResults = false; r.lang = 'en-US';
  r.onstart  = () => { S.isRecording = true; micBtn.classList.add('recording'); setOrbState('listening'); startMicViz(); };
  r.onresult = e => { const t = e.results[0][0].transcript; userInput.value = t; autoHeight(); sendMessage(t); };
  r.onerror  = () => stopASR();
  r.onend    = () => stopASR();
  return r;
}
function startASR() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (!recognition) recognition = initASR();
  if (!recognition) { addMessage('ai',"Sorry, your browser doesn't support voice input. Try typing instead.",'neutral'); return; }
  recognition.start();
}
function stopASR() {
  S.isRecording = false;
  micBtn.classList.remove('recording');
  stopMicViz();
  if (statusText.textContent === 'Listening…') setOrbState('idle');
}

// ─── Mic Waveform Visualizer ──────────────────────────────────
let vizRaf = null;
async function startMicViz() {
  try {
    S.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    S.audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    S.analyser  = S.audioCtx.createAnalyser();
    S.analyser.fftSize = 256;
    const src = S.audioCtx.createMediaStreamSource(S.micStream);
    src.connect(S.analyser);
    orbWaveform.classList.add('active');
    drawWaveform();
  } catch(e) { console.warn('Mic viz:', e); }
}
function stopMicViz() {
  if (vizRaf) { cancelAnimationFrame(vizRaf); vizRaf = null; }
  orbWaveform.classList.remove('active');
  if (S.micStream) { S.micStream.getTracks().forEach(t=>t.stop()); S.micStream = null; }
  if (S.audioCtx) { S.audioCtx.close().catch(()=>{}); S.audioCtx = null; }
}
function drawWaveform() {
  const ctx = orbWaveform.getContext('2d');
  const w = orbWaveform.width, h = orbWaveform.height, cx = w/2, cy = h/2;
  const data = new Uint8Array(S.analyser?.frequencyBinCount || 64);

  function frame() {
    vizRaf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, w, h);
    if (!S.analyser) return;
    S.analyser.getByteFrequencyData(data);

    const bars = 48, r = 55;
    for (let i=0; i<bars; i++) {
      const angle = (i / bars) * Math.PI * 2;
      const val   = (data[Math.floor(i * data.length / bars)] || 0) / 255;
      const len   = 8 + val * 22;
      const x1 = cx + Math.cos(angle) * r;
      const y1 = cy + Math.sin(angle) * r;
      const x2 = cx + Math.cos(angle) * (r + len);
      const y2 = cy + Math.sin(angle) * (r + len);
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(244,114,182,${0.4 + val * 0.6})`;
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  frame();
}

// ─── Breathing Exercise ───────────────────────────────────────
let breathInterval = null, breathCycles = 0, breathPhaseIdx = 0;
const BREATH_PHASES = [
  { name:'Inhale', dur:4, color:'#4fc3f7', expand:true },
  { name:'Hold',   dur:7, color:'#a78bfa', expand:true },
  { name:'Exhale', dur:8, color:'#34d399', expand:false },
];
const circumference = 2 * Math.PI * 100; // r=100

function startBreathing() {
  breathCycles = 0; breathPhaseIdx = 0;
  $('breath-start-btn').classList.add('hidden');
  $('breath-stop-btn').classList.remove('hidden');
  $('breath-cycles').textContent = '0';
  runBreathPhase();
}
function stopBreathing() {
  clearTimeout(breathInterval); breathInterval = null;
  $('breath-start-btn').classList.remove('hidden');
  $('breath-stop-btn').classList.add('hidden');
  $('breath-phase').textContent = 'Ready';
  $('breath-num').textContent = '•';
  $('breath-guide').textContent = 'Press Begin to start your session';
  const prog = $('breath-progress');
  prog.style.transition = 'none';
  prog.style.strokeDashoffset = circumference;
  $('breath-circle').classList.remove('expand');
}
function runBreathPhase() {
  const ph = BREATH_PHASES[breathPhaseIdx];
  const prog = $('breath-progress');
  const circle = $('breath-circle');
  $('breath-phase').textContent = ph.name;
  $('breath-guide').textContent = ph.name === 'Inhale' ? 'Breathe in slowly through your nose…' : ph.name === 'Hold' ? 'Hold your breath gently…' : 'Exhale slowly through your mouth…';
  prog.style.stroke = ph.color;

  if (ph.expand) { circle.classList.add('expand'); } else { circle.classList.remove('expand'); }

  // Animate ring
  prog.style.transition = 'none';
  prog.style.strokeDashoffset = ph.name === 'Exhale' ? 0 : circumference;
  requestAnimationFrame(() => {
    prog.style.transition = `stroke-dashoffset ${ph.dur}s linear`;
    prog.style.strokeDashoffset = ph.name === 'Exhale' ? circumference : 0;
  });

  // Count timer
  let remaining = ph.dur;
  $('breath-num').textContent = remaining;
  const countIv = setInterval(() => {
    remaining--;
    if (remaining >= 0) $('breath-num').textContent = remaining;
  }, 1000);

  breathInterval = setTimeout(() => {
    clearInterval(countIv);
    breathPhaseIdx = (breathPhaseIdx + 1) % BREATH_PHASES.length;
    if (breathPhaseIdx === 0) { breathCycles++; $('breath-cycles').textContent = breathCycles; }
    if (breathCycles < 4) runBreathPhase();
    else {
      stopBreathing();
      $('breath-guide').textContent = `Great work! ${breathCycles} cycles complete. 🌿`;
    }
  }, ph.dur * 1000);
}

// ─── Mood History Chart ───────────────────────────────────────
const MOOD_COLORS = { sad:'#60a5fa', anxious:'#a78bfa', angry:'#f87171', happy:'#34d399', confused:'#fbbf24', tired:'#94a3b8', neutral:'#4fc3f7', okay:'#34d399', great:'#34d399' };

function renderMoodChart() {
  const canvas = $('mood-chart');
  const ctx    = canvas.getContext('2d');
  const log    = S.moodLog.slice(-30);
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  if (log.length === 0) {
    ctx.fillStyle = '#55556a'; ctx.font = '14px DM Sans'; ctx.textAlign = 'center';
    ctx.fillText('No mood data yet. Start chatting!', W/2, H/2); return;
  }

  const moodOrder = ['happy','great','okay','neutral','confused','tired','anxious','sad','angry'];
  const toY = mood => {
    const i = moodOrder.indexOf(mood);
    return H - 20 - ((i === -1 ? 4 : i) / (moodOrder.length-1)) * (H - 40);
  };

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let i=0;i<5;i++) { const y=20+i*(H-40)/4; ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(W-10,y); ctx.stroke(); }

  // Line
  const step = (W - 50) / Math.max(log.length - 1, 1);
  ctx.beginPath(); ctx.lineWidth = 2;
  const grad = ctx.createLinearGradient(40, 0, W, 0);
  grad.addColorStop(0, '#4fc3f7'); grad.addColorStop(1, '#a78bfa');
  ctx.strokeStyle = grad;
  log.forEach((entry, i) => {
    const x = 40 + i * step, y = toY(entry.mood);
    i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.stroke();

  // Dots
  log.forEach((entry, i) => {
    const x = 40 + i * step, y = toY(entry.mood);
    ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2);
    ctx.fillStyle = MOOD_COLORS[entry.mood] || '#4fc3f7'; ctx.fill();
    ctx.fillStyle = '#0a0a1a'; ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
  });

  // Emoji labels
  ctx.font = '13px serif';
  log.forEach((entry, i) => {
    const x = 40 + i * step, y = toY(entry.mood);
    ctx.fillText(EMOTIONS[entry.mood]?.icon || '😌', x-7, y-12);
  });

  // Mood stats
  const stats = $('mood-stats');
  const counts = {};
  S.moodLog.forEach(e => { counts[e.mood] = (counts[e.mood]||0)+1; });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-val" style="color:${MOOD_COLORS[top?.[0]]||'#4fc3f7'}">${EMOTIONS[top?.[0]]?.icon||'😌'}</div><div class="stat-lbl">Most Common</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#4fc3f7">${S.moodLog.length}</div><div class="stat-lbl">Check-ins</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#34d399">${S.gratitudeLog.length}</div><div class="stat-lbl">Gratitudes</div></div>
  `;
}

function renderGratitudeList() {
  const list = $('gratitude-list');
  if (S.gratitudeLog.length === 0) {
    list.innerHTML = '<p class="empty-state">No journal entries yet. Complete a daily check-in to add one.</p>'; return;
  }
  list.innerHTML = [...S.gratitudeLog].reverse().map(e => `
    <div class="gratitude-entry">
      <div class="ge-date">${new Date(e.date).toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'})}</div>
      <div class="ge-mood">${EMOTIONS[e.mood]?.icon||'😌'} Feeling ${e.moodLabel||e.mood}</div>
      <div class="ge-text">${e.text}</div>
    </div>
  `).join('');
}

// ─── Daily Check-In ───────────────────────────────────────────
let ciSelectedMood = null;
function shouldShowCheckin() {
  const last = localStorage.getItem('aura-last-checkin');
  if (!last) return true;
  const d = new Date(last), now = new Date();
  return d.toDateString() !== now.toDateString();
}
function greetingByTime() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning ✨';
  if (h < 17) return 'Good afternoon ☀️';
  return 'Good evening 🌙';
}

// ─── localStorage ─────────────────────────────────────────────
function saveData() {
  try {
    localStorage.setItem('aura-history',   JSON.stringify(S.chatHistory.slice(-60)));
    localStorage.setItem('aura-mood-log',  JSON.stringify(S.moodLog.slice(-100)));
    localStorage.setItem('aura-gratitude', JSON.stringify(S.gratitudeLog.slice(-50)));
  } catch(e) {}
}
const DEFAULT_ANTHROPIC_KEY = 'df4bf615b05de0fafd433ed17df28acaf7e73987328f0810e94bfed94dede7d6';

function loadData() {
  try {
    S.chatHistory   = JSON.parse(localStorage.getItem('aura-history')   || '[]');
    S.moodLog       = JSON.parse(localStorage.getItem('aura-mood-log')  || '[]');
    S.gratitudeLog  = JSON.parse(localStorage.getItem('aura-gratitude') || '[]');
    S.anthropicKey  = localStorage.getItem('aura-anthropic-key') || DEFAULT_ANTHROPIC_KEY;
    S.elevenLabsKey = localStorage.getItem('aura-el-key') || '';
    S.userName      = localStorage.getItem('aura-name') || '';
    S.typingSpeed   = parseInt(localStorage.getItem('aura-typing-speed') || '20');
  } catch(e) {}
}
function saveKeys() {
  localStorage.setItem('aura-anthropic-key', S.anthropicKey);
  localStorage.setItem('aura-el-key', S.elevenLabsKey);
  localStorage.setItem('aura-name', S.userName);
  localStorage.setItem('aura-typing-speed', S.typingSpeed);
}

// ─── Background Canvas ────────────────────────────────────────
(function bg() {
  const c = $('bg-canvas'), ctx = c.getContext('2d');
  let w, h, stars=[], t=0;
  function resize() {
    w = c.width = innerWidth; h = c.height = innerHeight;
    stars = Array.from({length:200}, ()=>({ x:Math.random()*w, y:Math.random()*h, r:Math.random()*1.3+0.2, a:Math.random(), da:(Math.random()-0.5)*0.003, spd:Math.random()*0.06+0.01 }));
  }
  function frame() {
    ctx.clearRect(0,0,w,h);
    // Grid
    ctx.strokeStyle='rgba(79,195,247,0.035)'; ctx.lineWidth=1;
    const sp=65;
    for(let x=0;x<=w;x+=sp){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<=h;y+=sp){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    // Nebula
    t+=0.002;
    [[w*.2+Math.sin(t)*30,h*.3+Math.cos(t*.7)*25,'rgba(79,195,247,0.022)','rgba(167,139,250,0.012)',.55],[w*.8+Math.sin(t*.5)*40,h*.75+Math.cos(t)*30,'rgba(244,114,182,0.016)','rgba(0,0,0,0)',.45]].forEach(([x,y,c1,c2,rf])=>{
      const g=ctx.createRadialGradient(x,y,0,x,y,Math.min(w,h)*rf);
      g.addColorStop(0,c1); g.addColorStop(1,c2);
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    });
    // Stars
    for(const s of stars){
      s.a+=s.da; if(s.a<=0||s.a>=1)s.da*=-1;
      s.y-=s.spd; if(s.y<0){s.y=h;s.x=Math.random()*w;}
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(180,180,255,${s.a*0.55})`; ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  addEventListener('resize',resize); resize(); frame();
})();

// ─── Orb Particles ────────────────────────────────────────────
(function particles() {
  const container = $('orb-particles');
  const colors = ['#4fc3f7','#a78bfa','#f472b6','#34d399'];
  setInterval(()=>{
    const p = document.createElement('div'); p.className='particle';
    const sz=Math.random()*3+1, col=colors[Math.floor(Math.random()*colors.length)];
    const angle=Math.random()*360*Math.PI/180, r=30+Math.random()*42, cx=80, cy=80;
    p.style.cssText=`width:${sz}px;height:${sz}px;background:${col};box-shadow:0 0 ${sz*2}px ${col};left:${cx+Math.cos(angle)*r}px;top:${cy+Math.sin(angle)*r}px;animation-duration:${1.5+Math.random()*2.5}s;animation-delay:${Math.random()*1}s`;
    container.appendChild(p);
    setTimeout(()=>p.remove(), 4500);
  }, 380);
})();

// ─── Auto-resize textarea ─────────────────────────────────────
function autoHeight() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 130)+'px';
}

// ─── Load previous chat bubbles ───────────────────────────────
function restoreChat() {
  if (!S.chatHistory.length) return;
  if (chatIntro) chatIntro.style.display='none';
  const toShow = S.chatHistory.slice(-20);
  toShow.forEach(msg => {
    const wrap = document.createElement('div');
    wrap.className = `message ${msg.role==='assistant'?'ai':'user'}`;
    const av = document.createElement('div'); av.className='msg-avatar';
    av.textContent = msg.role==='assistant'?'◈':(S.userName?S.userName[0].toUpperCase():'🧑');
    const right = document.createElement('div'); right.className='msg-right';
    const bubble = document.createElement('div'); bubble.className='msg-bubble';
    bubble.textContent = msg.content;
    const time = document.createElement('span'); time.className='msg-time'; time.textContent=now();
    const meta = document.createElement('div'); meta.className='msg-meta'; meta.appendChild(time);
    right.appendChild(bubble); right.appendChild(meta);
    wrap.appendChild(av); wrap.appendChild(right);
    chatWindow.appendChild(wrap);
  });
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ─── Event Wiring ─────────────────────────────────────────────
// Send
sendBtn.addEventListener('click', ()=>sendMessage(userInput.value));
userInput.addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(userInput.value); } });
userInput.addEventListener('input', ()=>{ autoHeight(); charCount.textContent=`${userInput.value.length} / 1000`; });

// Mic
micBtn.addEventListener('click', ()=>{ S.isRecording ? (recognition&&recognition.stop(), stopASR()) : startASR(); });

// Voice toggle
voiceToggle.addEventListener('click', ()=>{
  S.voiceEnabled = !S.voiceEnabled;
  voiceToggle.classList.toggle('active', S.voiceEnabled);
  document.querySelector('.v-on').classList.toggle('hidden', !S.voiceEnabled);
  document.querySelector('.v-off').classList.toggle('hidden', S.voiceEnabled);
  if (!S.voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
});

// Voice select
voiceSelect.addEventListener('change', ()=>{ S.voiceChoice = voiceSelect.value; });

// Theme
themeToggle.addEventListener('click', ()=>{
  const dark = document.documentElement.getAttribute('data-theme')==='dark';
  document.documentElement.setAttribute('data-theme', dark?'light':'dark');
  document.querySelector('.th-sun').classList.toggle('hidden', dark);
  document.querySelector('.th-moon').classList.toggle('hidden', !dark);
  localStorage.setItem('aura-theme', dark?'light':'dark');
});

// Clear
clearBtn.addEventListener('click', ()=>{
  chatWindow.innerHTML='';
  const ci=document.createElement('div'); ci.className='chat-intro'; ci.id='chat-intro';
  ci.innerHTML=`<p class="intro-greeting">Fresh start ✨</p><p class="intro-name" style="background:linear-gradient(135deg,#4fc3f7,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-family:var(--font-h);font-size:36px;font-weight:800">I'm still here.</p><p class="intro-sub">What would you like to talk about?</p>`;
  chatWindow.appendChild(ci);
  S.chatHistory=[];
  localStorage.removeItem('aura-history');
  updateMoodUI('neutral');
});

// Focus modes
document.querySelectorAll('.mode-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    S.focusMode = btn.dataset.mode;
    const labels = {companion:'💬 Companion Mode',vent:'🌊 Vent Mode',advice:'🧭 Advice Mode',reflect:'🪞 Reflect Mode'};
    modeIndicator.textContent = labels[S.focusMode]||'💬 Companion Mode';
  });
});

// Breathing modal
$('breath-btn').addEventListener('click', ()=>{ $('breathing-modal').classList.remove('hidden'); });
$('breathing-close').addEventListener('click', ()=>{ stopBreathing(); $('breathing-modal').classList.add('hidden'); });
$('breath-start-btn').addEventListener('click', startBreathing);
$('breath-stop-btn').addEventListener('click', stopBreathing);

// History modal
$('history-btn').addEventListener('click', ()=>{
  $('history-modal').classList.remove('hidden');
  renderMoodChart(); renderGratitudeList();
});
$('history-close').addEventListener('click', ()=>$('history-modal').classList.add('hidden'));
document.querySelectorAll('.htab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.htab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    $('htab-chart').classList.toggle('hidden', tab.dataset.tab!=='chart');
    $('htab-journal').classList.toggle('hidden', tab.dataset.tab!=='journal');
    if(tab.dataset.tab==='journal') renderGratitudeList();
    if(tab.dataset.tab==='chart') renderMoodChart();
  });
});

// Check-In modal
$('checkin-btn').addEventListener('click', ()=>{
  $('ci-greeting').textContent = greetingByTime();
  $('ci-step-1').classList.remove('hidden');
  $('ci-step-2').classList.add('hidden');
  ciSelectedMood=null;
  document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('selected'));
  $('checkin-modal').classList.remove('hidden');
});
document.querySelectorAll('.emoji-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.emoji-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    ciSelectedMood = btn.dataset.mood;
    setTimeout(()=>{ $('ci-step-1').classList.add('hidden'); $('ci-step-2').classList.remove('hidden'); }, 300);
  });
});
$('ci-submit-btn').addEventListener('click', ()=>{
  const txt = $('ci-grateful').value.trim();
  if (txt && ciSelectedMood) {
    S.gratitudeLog.push({ date:new Date().toISOString(), mood:ciSelectedMood, moodLabel:EMOTIONS[ciSelectedMood]?.label||ciSelectedMood, text:txt });
    saveData();
  }
  if (ciSelectedMood) {
    S.moodLog.push({ date:new Date().toISOString(), mood:ciSelectedMood, emoji:EMOTIONS[ciSelectedMood]?.icon||'😌' });
    updateMoodUI(ciSelectedMood);
    saveData();
  }
  localStorage.setItem('aura-last-checkin', new Date().toISOString());
  $('ci-grateful').value='';
  $('checkin-modal').classList.add('hidden');
  // Send check-in message
  const moodLabel = EMOTIONS[ciSelectedMood]?.label || ciSelectedMood;
  const greet = greetingByTime().replace(/✨|☀️|🌙/g,'').trim();
  setTimeout(()=>sendMessage(`${greet}. I'm feeling ${moodLabel.toLowerCase()} today.${txt ? ' Grateful for: '+txt : ''}`), 400);
});
$('ci-skip-step2-btn').addEventListener('click', ()=>{ $('checkin-modal').classList.add('hidden'); });

// Settings modal
$('settings-btn').addEventListener('click', ()=>{
  $('user-name-input').value = S.userName;
  $('settings-anthropic-key').value = S.anthropicKey;
  $('settings-elevenlabs-key').value = S.elevenLabsKey;
  $('typing-speed').value = S.typingSpeed;
  $('typing-speed-label').textContent = S.typingSpeed+'ms';
  $('settings-modal').classList.remove('hidden');
});
$('settings-close').addEventListener('click', ()=>$('settings-modal').classList.add('hidden'));
$('typing-speed').addEventListener('input', e=>{
  S.typingSpeed=parseInt(e.target.value);
  $('typing-speed-label').textContent=S.typingSpeed+'ms';
});
$('settings-save-btn').addEventListener('click', ()=>{
  S.userName = $('user-name-input').value.trim();
  S.anthropicKey = $('settings-anthropic-key').value.trim();
  S.elevenLabsKey = $('settings-elevenlabs-key').value.trim();
  saveKeys();
  $('settings-modal').classList.add('hidden');
  if (S.userName) {
    const greet = document.createElement('div');
    greet.className='message ai'; greet.style.animation='fadeSlideUp 0.4s ease both';
    const av=document.createElement('div'); av.className='msg-avatar'; av.textContent='◈';
    const bub=document.createElement('div'); bub.className='msg-bubble';
    bub.textContent=`Nice to meet you, ${S.userName}! I'll remember your name from now on. 😊`;
    const r=document.createElement('div'); r.className='msg-right'; r.appendChild(bub);
    greet.appendChild(av); greet.appendChild(r);
    if(chatIntro) chatIntro.style.display='none';
    chatWindow.appendChild(greet);
    chatWindow.scrollTop=chatWindow.scrollHeight;
  }
});

// Setup modal
$('save-keys-btn').addEventListener('click', ()=>{
  S.anthropicKey  = $('anthropic-key-input').value.trim();
  S.elevenLabsKey = $('elevenlabs-key-input').value.trim();
  saveKeys();
  $('setup-modal').classList.add('hidden');
  initApp();
});
$('skip-keys-btn').addEventListener('click', ()=>{ $('setup-modal').classList.add('hidden'); initApp(); });

// Close modals on overlay click
['breathing-modal','history-modal','settings-modal','checkin-modal'].forEach(id=>{
  $(id).addEventListener('click', e=>{ if(e.target===e.currentTarget){ stopBreathing(); $(id).classList.add('hidden'); } });
});

// ─── Init ─────────────────────────────────────────────────────
function initApp() {
  // Apply saved theme
  const savedTheme = localStorage.getItem('aura-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.querySelector('.th-sun').classList.toggle('hidden', savedTheme==='light');
  document.querySelector('.th-moon').classList.toggle('hidden', savedTheme==='dark');

  restoreChat();

  // Update intro with name
  if (S.userName && introName) {
    introName.innerHTML = `I'm <strong>AURA</strong> — and you must be <strong>${S.userName}</strong>.`;
  }

  // Voice select init
  voiceSelect.value = 'browser';

  // Preload voices
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = ()=>window.speechSynthesis.getVoices();
  }

  // Check-in
  if (shouldShowCheckin()) {
    setTimeout(()=>{
      $('ci-greeting').textContent = greetingByTime();
      $('ci-step-1').classList.remove('hidden');
      $('ci-step-2').classList.add('hidden');
      $('checkin-modal').classList.remove('hidden');
    }, 900);
  } else if (S.chatHistory.length === 0) {
    // Welcome message
    setTimeout(async ()=>{
      const name = S.userName ? `, ${S.userName}` : '';
      const welcomeMsg = `Hey${name}! I'm AURA — your emotional AI companion. I'm here to listen, support, and think with you. What's on your mind today?`;
      addMessage('ai', welcomeMsg, 'neutral');
      await speak(welcomeMsg);
    }, 800);
  }
}

// ─── Boot ─────────────────────────────────────────────────────
loadData();

// Key is always available — skip setup modal and launch directly
$('setup-modal').classList.add('hidden');
localStorage.setItem('aura-setup-done', '1');
initApp();
