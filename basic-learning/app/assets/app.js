/* =====================================================
   ថ្នាក់មូលដ្ឋាន — BasicLearning app logic (v1.2)
   ថ្មី v1.2៖ សម្លេងអានខ្មែរពេលបើកមេរៀន (TTS bundled MP3)
   v1.1៖ ពិភពជុំវិញ • ល្បែងចងចាំ • មេដាយ • ការកំណត់ • ថ្ងៃជាប់ៗ
   ===================================================== */
"use strict";

const $app = document.getElementById("app");
const $confetti = document.getElementById("confetti-layer");

/* ---------------- utils ---------------- */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN(arr, n, exclude) {
  const pool = arr.filter(x => x !== exclude);
  return shuffle(pool).slice(0, n);
}

function emojiRow(emoji, n) {
  let s = "";
  for (let i = 0; i < n; i++) s += emoji + " ";
  return s.trim();
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2200);
}

/* ---------------- storage ---------------- */
const K_STARS = "blStars";    // { kh, math, en, world, game }
const K_STATS = "blStats";    // { correct, visited, memWin, perfect, bestStreak, streak, lastDay }
const K_PROFILE = "blProfile"; // { name, avatar, sound }

function loadStars() {
  const d = { kh: 0, math: 0, en: 0, world: 0, game: 0 };
  try {
    const raw = localStorage.getItem(K_STARS);
    if (raw) {
      const obj = JSON.parse(raw);
      for (const k in d) d[k] = obj[k] | 0;
    }
  } catch (e) { /* ignore */ }
  return d;
}

function saveStars(stars) {
  try { localStorage.setItem(K_STARS, JSON.stringify(stars)); } catch (e) { /* ignore */ }
}

function loadStats() {
  const d = { correct: 0, visited: [], memWin: false, perfect: false, bestStreak: 0, streak: 0, lastDay: "" };
  try {
    const raw = localStorage.getItem(K_STATS);
    if (raw) {
      const obj = JSON.parse(raw);
      d.correct = obj.correct | 0;
      d.visited = Array.isArray(obj.visited) ? obj.visited : [];
      d.memWin = !!obj.memWin;
      d.perfect = !!obj.perfect;
      d.bestStreak = obj.bestStreak | 0;
      d.streak = obj.streak | 0;
      d.lastDay = obj.lastDay || "";
    }
  } catch (e) { /* ignore */ }
  return d;
}

function saveStats(s) {
  try { localStorage.setItem(K_STATS, JSON.stringify(s)); } catch (e) { /* ignore */ }
}

function visitSubject(id) {
  const s = loadStats();
  if (s.visited.indexOf(id) < 0) { s.visited.push(id); saveStats(s); }
}

function bumpCorrect() {
  const s = loadStats();
  s.correct = (s.correct | 0) + 1;
  saveStats(s);
}

function markPerfect() { const s = loadStats(); s.perfect = true; saveStats(s); }
function markMemWin() { const s = loadStats(); s.memWin = true; saveStats(s); }

function loadProfile() {
  const d = { name: "", avatar: "🧒", sound: true };
  try {
    const raw = localStorage.getItem(K_PROFILE);
    if (raw) {
      const obj = JSON.parse(raw);
      d.name = typeof obj.name === "string" ? obj.name : "";
      d.avatar = (typeof obj.avatar === "string" && obj.avatar) ? obj.avatar : "🧒";
      d.sound = obj.sound !== false;
    }
  } catch (e) { /* ignore */ }
  return d;
}

function saveProfile(p) {
  try { localStorage.setItem(K_PROFILE, JSON.stringify(p)); } catch (e) { /* ignore */ }
}

function dateStr(d) {
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + m + "-" + day;
}

/* daily learning streak (ថ្ងៃសិក្សាជាប់ៗ) */
function updateStreak() {
  const s = loadStats();
  const now = new Date();
  const yest = new Date(now.getTime() - 86400000);
  const today = dateStr(now);
  if (s.lastDay !== today) {
    s.streak = (s.lastDay === dateStr(yest)) ? (s.streak | 0) + 1 : 1;
    s.lastDay = today;
    if (s.streak > (s.bestStreak | 0)) s.bestStreak = s.streak;
    saveStats(s);
  }
  return Math.max(1, s.streak | 0);
}

/* ---------------- sound (Web Audio) ---------------- */
let soundOn = true;
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(function () {});
  }
}

function tone(freq, dur, delay, type, vol) {
  if (!soundOn || !audioCtx) return;
  try {
    const t0 = audioCtx.currentTime + (delay || 0);
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.18, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (e) { /* ignore */ }
}

function soundCorrect() {
  ensureAudio();
  tone(523.25, 0.14, 0.00, "sine", 0.20);
  tone(659.25, 0.14, 0.10, "sine", 0.20);
  tone(783.99, 0.22, 0.20, "sine", 0.20);
}

function soundWin() {
  ensureAudio();
  tone(523.25, 0.14, 0.00, "sine", 0.20);
  tone(659.25, 0.14, 0.12, "sine", 0.20);
  tone(783.99, 0.14, 0.24, "sine", 0.20);
  tone(1046.50, 0.35, 0.36, "sine", 0.22);
}

function soundWrong() {
  ensureAudio();
  tone(196.00, 0.28, 0.00, "sawtooth", 0.12);
  tone(185.00, 0.30, 0.06, "sawtooth", 0.10);
}

function buzz(ms) {
  try {
    if (window.AndroidBridge && AndroidBridge.vibrate) AndroidBridge.vibrate(ms);
  } catch (e) { /* ignore */ }
}

/* ---------------- speech (សម្លេងអាន, v1.2) ----------------
   សម្លេងអានខ្មែរ៖ ថតសម្លេងពិត MP3 ដាក់ក្នុង assets/audio/
   លេងដោយស្វ័យប្រវត្តិពេលបើកមេរៀន និងពេលចុចលើធាតុ */
let speechEl = null;

function stopSpeak() {
  if (speechEl) {
    try { speechEl.onended = null; speechEl.pause(); speechEl.src = ""; } catch (e) { /* ignore */ }
    speechEl = null;
  }
}

function speakSeq(files) {
  if (!soundOn || !files || !files.length) return;
  stopSpeak();
  try {
    const el = new Audio(files[0]);
    speechEl = el;
    el.onended = function () {
      if (speechEl === el) speakSeq(files.slice(1));
    };
    const p = el.play();
    if (p && p.catch) p.catch(function () { /* playback blocked — ignore */ });
  } catch (e) { /* ignore */ }
}

/* speak("audio/km/num01.mp3") or speak(["a.mp3", "b.mp3"]) */
function speak(x) {
  if (!x) return;
  if (typeof x === "string") speakSeq([x]); else speakSeq(x);
}

document.addEventListener("touchstart", ensureAudio, { passive: true });
document.addEventListener("mousedown", ensureAudio);

/* ---------------- navigation ---------------- */
let page = "home";
let currentSubject = null;
let lessonCtl = null; // { next, prev } for lesson swipe

function notify(p) {
  page = p;
  try {
    if (window.AndroidBridge && AndroidBridge.notifyPage) AndroidBridge.notifyPage(p);
  } catch (e) { /* ignore */ }
}

/* Called from native back button */
window.appBack = function () {
  if (page === "home") return;
  if (page === "subject" || page === "game" || page === "medals" || page === "settings") {
    goHome();
    return;
  }
  if (currentSubject) renderSubject(currentSubject);
  else goHome();
};

/* global swipe support for lesson cards */
let swipeX = null;
document.addEventListener("touchstart", function (e) {
  swipeX = e.changedTouches[0].clientX;
}, { passive: true });
document.addEventListener("touchend", function (e) {
  if (page !== "lesson" || !lessonCtl || swipeX === null) return;
  const dx = e.changedTouches[0].clientX - swipeX;
  if (dx < -60) lessonCtl.next();
  else if (dx > 60) lessonCtl.prev();
  swipeX = null;
}, { passive: true });

/* ---------------- confetti ---------------- */
const CONFETTI_EMOJIS = ["🎉", "⭐", "🌟", "🎈", "✨", "🏆", "🌈", "💛"];

function confetti(n) {
  $confetti.innerHTML = "";
  for (let i = 0; i < (n || 26); i++) {
    const span = document.createElement("span");
    span.className = "confetti-piece";
    span.textContent = CONFETTI_EMOJIS[randInt(0, CONFETTI_EMOJIS.length - 1)];
    span.style.left = randInt(2, 96) + "%";
    span.style.fontSize = randInt(16, 30) + "px";
    span.style.animationDuration = (randInt(18, 32) / 10) + "s";
    span.style.animationDelay = (randInt(0, 8) / 10) + "s";
    $confetti.appendChild(span);
  }
  setTimeout(function () { $confetti.innerHTML = ""; }, 4200);
}

/* ---------------- SUBJECTS ---------------- */
const SUBJECTS = {
  kh: {
    id: "kh",
    name: "អក្សរខ្មែរ",
    en: "Khmer Letters",
    icon: "ក",
    art: "ក ខ គ",
    color: "kh",
    say: "audio/km/subject_kh.mp3"
  },
  math: {
    id: "math",
    name: "គណិតវិទ្យា",
    en: "Mathematics",
    icon: "🔢",
    art: "🔢",
    color: "math",
    say: "audio/km/subject_math.mp3"
  },
  en: {
    id: "en",
    name: "ភាសាអង់គ្លេស",
    en: "English",
    icon: "A",
    art: "🔤",
    color: "en",
    say: "audio/km/subject_en.mp3"
  },
  world: {
    id: "world",
    name: "ពិភពជុំវិញ",
    en: "My World",
    icon: "🌍",
    art: "🐘 🍎 ⭐",
    color: "world",
    say: "audio/km/subject_world.mp3"
  }
};

const AVATARS = ["🧒", "👦", "👧", "🐯", "🐰", "🐼", "🦄", "🐸"];

const MEDALS = [
  { icon: "🌟", name: "ផ្កាយដំបូង", desc: "រកបានផ្កាយដំបូងក្នុងល្បែងសួរឆ្លើយ", check: function (t) { return t >= 1; } },
  { icon: "🎖️", name: "៦ ផ្កាយ", desc: "រកបានផ្កាយសរុប ៦", check: function (t) { return t >= 6; } },
  { icon: "🏅", name: "១២ ផ្កាយ", desc: "រកបានផ្កាយគ្រប់វិជ្ជាទាំង ៤", check: function (t) { return t >= 12; } },
  { icon: "🎯", name: "ពិន្ទុពេញ", desc: "ឆ្លើយត្រូវគ្រប់សំណួរក្នុងមួយជុំ", check: function (t, s) { return !!s.perfect; } },
  { icon: "🧠", name: "ពូកែចងចាំ", desc: "បញ្ចប់ល្បែងចងចាំដោយជោគជ័យ", check: function (t, s) { return !!s.memWin; } },
  { icon: "🧭", name: "សិស្សឆ្នើម", desc: "ចូលរៀនគ្រប់វិជ្ជាទាំង ៤", check: function (t, s) { return (s.visited || []).length >= 4; } },
  { icon: "🦉", name: "ឆ្លាតូច", desc: "ឆ្លើយត្រូវសរុប ៥០ ដង", check: function (t, s) { return (s.correct | 0) >= 50; } },
  { icon: "🔥", name: "ខិតខំប្រឹងប្រែង", desc: "សិក្សាជាប់គ្នា ៣ ថ្ងៃ", check: function (t, s) { return (s.bestStreak | 0) >= 3; } }
];

/* =====================================================
   SCREEN: HOME
   ===================================================== */
function goHome() {
  notify("home");
  lessonCtl = null;
  const stars = loadStars();
  const total = stars.kh + stars.math + stars.en + stars.world + stars.game;
  const maxTotal = MAX_STARS * 4;
  const p = loadProfile();
  const streak = Math.max(1, loadStats().streak | 0);
  const order = ["kh", "math", "en", "world"];

  let cardsHtml = "";
  for (const key of order) {
    const s = SUBJECTS[key];
    cardsHtml += `
      <button class="subject-card ${s.color}" data-subject="${s.id}">
        <span class="icon">${s.icon}</span>
        <span class="info">
          <h3>${s.name}</h3>
          <span class="en-name">${s.en}</span>
          <span class="stars">${"⭐".repeat(stars[s.id]) || "☆"} ${stars[s.id]}/${MAX_STARS}</span>
        </span>
        <span class="chev">›</span>
      </button>`;
  }
  cardsHtml += `
      <button class="subject-card game" data-game="1">
        <span class="icon">🧠</span>
        <span class="info">
          <h3>ល្បែងចងចាំ</h3>
          <span class="en-name">MEMORY GAME</span>
          <span class="stars">${"⭐".repeat(stars.game) || "☆"} ${stars.game}/${MAX_STARS}</span>
        </span>
        <span class="chev">›</span>
      </button>`;

  $app.innerHTML = `
    <div class="home-top">
      <button class="profile-chip" id="profileBtn">
        <span class="pav">${p.avatar}</span><span>${p.name ? esc(p.name) : "សិស្សតូច"}</span>
      </button>
      <div class="home-top-right">
        <button class="icon-btn" id="medalBtn" aria-label="មេដាយ">🏅</button>
        <button class="icon-btn" id="setBtn" aria-label="ការកំណត់">⚙️</button>
      </div>
    </div>
    <div class="page" style="padding-top:12px;">
      <div class="hero">
        <div class="mascot">🎓</div>
        <h2>ថ្នាក់មូលដ្ឋាន</h2>
        <p>BASIC LEARNING FOR KIDS</p>
        <div class="hello">${p.avatar} សូមស្វាគមន៍, ${p.name ? esc(p.name) : "សិស្សតូច"}!</div>
        <div class="hero-chips">
          <span class="hchip">🔥 ថ្ងៃជាប់ៗ៖ ${streak}</span>
          <span class="hchip">⭐ ផ្តាស់សរុប៖ ${total} / ${maxTotal}</span>
        </div>
      </div>
      <div class="subject-grid">${cardsHtml}</div>
      <div class="footer-note">Version 1.2 • សិក្សាដោយរីករាយ! 🌈</div>
    </div>
  `;

  $app.querySelectorAll("[data-subject]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      ensureAudio();
      renderSubject(btn.getAttribute("data-subject"));
    });
  });
  const gameBtn = $app.querySelector("[data-game]");
  if (gameBtn) gameBtn.addEventListener("click", function () { ensureAudio(); goGame(); });
  const medalBtn = $app.querySelector("#medalBtn");
  if (medalBtn) medalBtn.addEventListener("click", renderMedals);
  const setBtn = $app.querySelector("#setBtn");
  if (setBtn) setBtn.addEventListener("click", renderSettings);
  const profileBtn = $app.querySelector("#profileBtn");
  if (profileBtn) profileBtn.addEventListener("click", renderSettings);
}

/* =====================================================
   SCREEN: SUBJECT
   ===================================================== */
function renderSubject(id) {
  currentSubject = id;
  notify("subject");
  visitSubject(id);
  const s = SUBJECTS[id];
  const stars = loadStars();

  $app.innerHTML = `
    <div class="topbar">
      <button class="back" data-act="home">🏠</button>
      <div class="titles">
        <h1>${s.name}</h1>
        <div class="sub">${s.en.toUpperCase()}</div>
      </div>
    </div>
    <div class="page">
      <div class="card" style="text-align:center;">
        <div style="font-size:48px;letter-spacing:6px;">${s.art}</div>
        <div style="font-size:16px;color:var(--ink-soft);margin-top:6px;">ជ្រើសរើសសកម្មភាពខាងក្រោម</div>
        <div style="font-size:14px;margin-top:4px;color:var(--kh-dark);">ផ្តាស់របស់អ្នក៖ ⭐ ${stars[id]}/${MAX_STARS}</div>
      </div>
      <div class="subject-actions">
        <button class="action-btn lesson" data-act="lesson">
          <span class="big">📖</span>
          មេរៀន
          <span class="small">LESSON</span>
        </button>
        <button class="action-btn quiz" data-act="quiz">
          <span class="big">🎯</span>
          ល្បែងសួរឆ្លើយ
          <span class="small">QUIZ</span>
        </button>
      </div>
      <div class="card progress-card">
        <span class="label">💡 ធ្វើល្បែងឱ្យបានពិន្ទុខ្ពស់ដើម្បីបានផ្តាស់ ៣!</span>
        <span class="val">⭐ ${stars[id]}/${MAX_STARS}</span>
      </div>
    </div>
  `;

  $app.querySelector('[data-act="home"]').addEventListener("click", goHome);
  $app.querySelector('[data-act="lesson"]').addEventListener("click", function () { renderLesson(id); });
  $app.querySelector('[data-act="quiz"]').addEventListener("click", function () { startQuiz(id); });

  /* សម្លេងអានឈ្មោះវិជ្ជា ពេលបើកវិជ្ជា */
  speak(s.say);
}

/* =====================================================
   SCREEN: LESSON
   ===================================================== */
function buildLessonSections(id) {
  if (id === "kh") {
    const sec1 = CONSONANTS.map(function (c, i) {
      return {
        giant: c.l,
        giantClass: "",
        word: c.word + " (" + c.l + ")",
        emoji: c.emoji,
        en: c.en,
        say: "audio/km/cons" + ("0" + (i + 1)).slice(-2) + ".mp3"
      };
    });
    const sec2 = VOWELS.map(function (v, i) {
      return {
        giant: "ក" + v.v,
        giantClass: "",
        word: v.ex,
        emoji: v.emoji,
        en: v.en,
        say: "audio/km/vow" + ("0" + (i + 1)).slice(-2) + ".mp3"
      };
    });
    const sec3 = KH_NUMS.map(function (k) {
      return {
        giant: k.n,
        giantClass: "giant-word",
        word: k.word,
        emoji: emojiRow("🍎", k.num),
        en: "Number " + k.num,
        say: "audio/km/num" + ("0" + k.num).slice(-2) + ".mp3"
      };
    });
    return [
      { title: "ព្យញ្ជនៈ ៣៣ តួ", cards: sec1 },
      { title: "ស្វ័យភេត្រ ១៧ តួ", cards: sec2 },
      { title: "លេខ ១-១០", cards: sec3 }
    ];
  }

  if (id === "math") {
    const sec1 = KH_NUMS.map(function (k) {
      return {
        giant: k.n,
        giantClass: "giant-word",
        word: k.word,
        emoji: emojiRow("🟡", k.num),
        en: "Count: " + k.num,
        say: "audio/km/num" + ("0" + k.num).slice(-2) + ".mp3"
      };
    });
    const addPairs = [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 2], [5, 2], [4, 4]];
    const sec2 = addPairs.map(function (p) {
      return {
        giant: KH_NUMS[p[0] - 1].n + " + " + KH_NUMS[p[1] - 1].n + " = " + KH_NUMS[p[0] + p[1] - 1].n,
        giantClass: "giant-word",
        word: "",
        emoji: `<span class="eqrow">${emojiRow("🍎", p[0])}</span> <span class="formula"><span class="op">+</span></span> <span class="eqrow">${emojiRow("🍎", p[1])}</span>`,
        en: p[0] + " + " + p[1] + " = " + (p[0] + p[1]),
        say: "audio/km/add_" + p[0] + "_" + p[1] + ".mp3"
      };
    });
    const subPairs = [[3, 1], [4, 2], [5, 1], [5, 3], [6, 2], [7, 4], [8, 3], [9, 5]];
    const sec3 = subPairs.map(function (p) {
      return {
        giant: KH_NUMS[p[0] - 1].n + " − " + KH_NUMS[p[1] - 1].n + " = " + KH_NUMS[p[0] - p[1] - 1].n,
        giantClass: "giant-word",
        word: "",
        emoji: `<span class="eqrow">${emojiRow("🐥", p[0])}</span> <span class="formula"><span class="op">−</span></span> <span class="eqrow">${emojiRow("💨", p[1])}</span>`,
        en: p[0] + " − " + p[1] + " = " + (p[0] - p[1]),
        say: "audio/km/sub_" + p[0] + "_" + p[1] + ".mp3"
      };
    });
    return [
      { title: "លេខ ១-១០", cards: sec1 },
      { title: "បូក (+)", cards: sec2 },
      { title: "ដក (−)", cards: sec3 }
    ];
  }

  if (id === "world") {
    function vcards(list, prefix) {
      return list.map(function (x) {
        return {
          giant: "",
          giantClass: "",
          word: x.word,
          emoji: x.emoji,
          en: x.en,
          say: "audio/km/" + prefix + "_" + x.en.toLowerCase() + ".mp3"
        };
      });
    }
    return [
      { title: "សត្វ", cards: vcards(ANIMALS, "animal") },
      { title: "ផ្លែឈើ", cards: vcards(FRUITS, "fruit") },
      { title: "រូបរាង", cards: vcards(SHAPES, "shape") },
      { title: "កាយវក្តី", cards: vcards(BODY, "body") },
      { title: "ថ្ងៃទាំង ៧", cards: vcards(DAYS, "day") }
    ];
  }

  // english
  const sec1 = EN_LETTERS.map(function (c) {
    return {
      giant: c.l,
      giantClass: "",
      word: c.word,
      emoji: c.emoji,
      en: c.l + " — " + c.word,
      say: "audio/en/letter_" + c.l.toLowerCase() + ".mp3"
    };
  });
  const sec2 = EN_NUMS.map(function (k) {
    return {
      giant: k.n,
      giantClass: "giant-word",
      word: k.word,
      emoji: emojiRow("🎈", k.num),
      en: "Number " + k.num,
      say: "audio/en/num_" + k.num + ".mp3"
    };
  });
  const sec3 = EN_COLORS.map(function (c) {
    return {
      giant: "",
      giantClass: "",
      word: c.word + " — " + c.km,
      emoji: c.emoji,
      en: c.word,
      colorChip: c.css,
      say: ["audio/en/color_" + c.word.toLowerCase() + ".mp3", "audio/km/color_" + c.word.toLowerCase() + ".mp3"]
    };
  });
  return [
    { title: "ABC — ២៦ តួ", cards: sec1 },
    { title: "Numbers ១-១០", cards: sec2 },
    { title: "Colors — ពណ៌", cards: sec3 }
  ];
}

function renderLesson(id) {
  notify("lesson");
  const s = SUBJECTS[id];
  const sections = buildLessonSections(id);
  let secIdx = 0;
  let cardIdx = 0;

  function drawCard() {
    const sec = sections[secIdx];
    const card = sec.cards[cardIdx];
    const emojiHtml = card.colorChip
      ? `<div class="colorchip" style="background:${card.colorChip};"></div><div class="emoji">${card.emoji}</div>`
      : `<div class="emoji">${card.emoji}</div>`;

    return `
      <div class="lesson-card slide-in">
        <span class="counter">${cardIdx + 1} / ${sec.cards.length}</span>
        <span class="say-chip">🔊</span>
        ${card.giant ? `<div class="giant ${card.giantClass}">${card.giant}</div>` : ""}
        ${card.word ? `<div class="word">${card.word}</div>` : ""}
        ${emojiHtml}
        ${card.en ? `<div class="word-en">${card.en}</div>` : ""}
      </div>`;
  }

  function drawDots() {
    const sec = sections[secIdx];
    let html = "";
    for (let i = 0; i < sec.cards.length; i++) {
      html += `<span class="dot ${i === cardIdx ? "on" : ""}"></span>`;
    }
    return html;
  }

  function render() {
    const sec = sections[secIdx];
    $app.innerHTML = `
      <div class="topbar">
        <button class="back" data-act="back">←</button>
        <div class="titles">
          <h1>មេរៀន — ${s.name}</h1>
          <div class="sub">${s.en.toUpperCase()} LESSON</div>
        </div>
      </div>
      <div class="page">
        <div class="chips">
          ${sections.map(function (x, i) {
            return `<button class="chip ${i === secIdx ? "active" : ""}" data-sec="${i}">${x.title}</button>`;
          }).join("")}
        </div>
        ${drawCard()}
        <div class="dots">${drawDots()}</div>
        <div class="nav-row">
          <button class="nav-btn" id="prevBtn" ${cardIdx === 0 ? "disabled" : ""}>◀ មុន</button>
          <button class="nav-btn primary" id="nextBtn" ${cardIdx === sec.cards.length - 1 ? "disabled" : ""}>បន្ទាប់ ▶</button>
        </div>
      </div>
    `;

    $app.querySelector('[data-act="back"]').addEventListener("click", function () {
      renderSubject(id);
    });

    $app.querySelectorAll("[data-sec]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        secIdx = parseInt(chip.getAttribute("data-sec"), 10);
        cardIdx = 0;
        render();
      });
    });

    const prev = $app.querySelector("#prevBtn");
    const next = $app.querySelector("#nextBtn");
    if (prev) prev.addEventListener("click", function () { goPrev(); });
    if (next) next.addEventListener("click", function () { goNext(); });

    /* សម្លេងអាន៖ លេងដោយស្វ័យប្រវត្តិពេលបើកកាត និងពេលចុចលើកាត */
    const card = sec.cards[cardIdx];
    const cardEl = $app.querySelector(".lesson-card");
    if (cardEl) cardEl.addEventListener("click", function () { speak(card.say); });
    speak(card.say);
  }

  function goNext() {
    const sec = sections[secIdx];
    if (cardIdx < sec.cards.length - 1) { cardIdx++; render(); }
  }
  function goPrev() {
    if (cardIdx > 0) { cardIdx--; render(); }
  }
  lessonCtl = { next: goNext, prev: goPrev };

  render();
}

/* =====================================================
   SCREEN: QUIZ
   ===================================================== */
function makeOptions(pool, correct) {
  const others = pickN(pool, 2, correct);
  const opts = shuffle([correct].concat(others));
  return { options: opts, correctIndex: opts.indexOf(correct) };
}

function genKhmerQuiz() {
  const qs = [];
  // 5 letter → word
  const cons = shuffle(CONSONANTS).slice(0, 5);
  cons.forEach(function (c) {
    const m = makeOptions(CONSONANTS.map(x => x.word), c.word);
    qs.push({
      text: `តើអក្សរ «${c.l}» មានពាក្យអ្វី?`,
      big: c.l,
      options: m.options,
      correctIndex: m.correctIndex
    });
  });
  // 3 emoji → letter
  const cons2 = shuffle(CONSONANTS).slice(0, 3);
  cons2.forEach(function (c) {
    const m = makeOptions(CONSONANTS.map(x => x.l), c.l);
    qs.push({
      text: `ពាក្យ «${c.word}» ចាប់ផ្តើមដោយអក្សរណា?`,
      emojiRow: c.emoji,
      options: m.options,
      correctIndex: m.correctIndex
    });
  });
  // 2 numeral → word
  const nums = shuffle(KH_NUMS).slice(0, 2);
  nums.forEach(function (k) {
    const m = makeOptions(KH_NUMS.map(x => x.word), k.word);
    qs.push({
      text: `តើលេខ «${k.n}» អានថាអ្វី?`,
      big: k.n,
      options: m.options,
      correctIndex: m.correctIndex
    });
  });
  return shuffle(qs).slice(0, QUIZ_LEN);
}

function genMathQuiz() {
  const qs = [];
  const allNums = KH_NUMS.map(x => x.n);
  const emojiPool = ["🍎", "🐸", "🐝", "🌸", "🐟", "🎈", "🍌", "🐞"];
  // 4 counting
  for (let i = 0; i < 4; i++) {
    const k = KH_NUMS[randInt(2, 9)];
    const em = emojiPool[randInt(0, emojiPool.length - 1)];
    const m = makeOptions(allNums, k.n);
    qs.push({
      text: "តើមានចំនួនប៉ុន្មាន?",
      emojiRow: emojiRow(em, k.num),
      bigger: true,
      options: m.options,
      correctIndex: m.correctIndex
    });
  }
  // 4 addition
  for (let i = 0; i < 4; i++) {
    const a = randInt(1, 5);
    const b = randInt(1, 10 - a);
    const ans = KH_NUMS[a + b - 1].n;
    const m = makeOptions(allNums, ans);
    qs.push({
      text: `តើបូកបានប៉ុន្មាន?`,
      big: KH_NUMS[a - 1].n + " + " + KH_NUMS[b - 1].n + " = ?",
      options: m.options,
      correctIndex: m.correctIndex
    });
  }
  // 2 subtraction
  for (let i = 0; i < 2; i++) {
    const a = randInt(3, 10);
    const b = randInt(1, a - 1);
    const ans = KH_NUMS[a - b - 1].n;
    const m = makeOptions(allNums, ans);
    qs.push({
      text: `តើដកបានប៉ុន្មាន?`,
      big: KH_NUMS[a - 1].n + " − " + KH_NUMS[b - 1].n + " = ?",
      options: m.options,
      correctIndex: m.correctIndex
    });
  }
  return shuffle(qs).slice(0, QUIZ_LEN);
}

function genEnglishQuiz() {
  const qs = [];
  const letters = EN_LETTERS.map(x => x.l);
  // 4 emoji+word → first letter
  const picked = shuffle(EN_LETTERS).slice(0, 4);
  picked.forEach(function (c) {
    const m = makeOptions(letters, c.l);
    qs.push({
      text: `តើពាក្យ «${c.word}» ចាប់ផ្តើមដោយអក្សរណា?`,
      emojiRow: c.emoji,
      options: m.options,
      correctIndex: m.correctIndex
    });
  });
  // 3 letter → word
  const picked2 = shuffle(EN_LETTERS).slice(0, 3);
  picked2.forEach(function (c) {
    const m = makeOptions(EN_LETTERS.map(x => x.word), c.word);
    qs.push({
      text: `Which word starts with «${c.l}»?`,
      big: c.l,
      options: m.options,
      correctIndex: m.correctIndex
    });
  });
  // 3 count in English
  for (let i = 0; i < 3; i++) {
    const k = EN_NUMS[randInt(2, 9)];
    const em = ["🍬", "🐥", "⭐", "🚗"][randInt(0, 3)];
    const m = makeOptions(EN_NUMS.map(x => x.word), k.word);
    qs.push({
      text: "How many? តើមានប៉ុន្មាន?",
      emojiRow: emojiRow(em, k.num),
      bigger: true,
      options: m.options,
      correctIndex: m.correctIndex
    });
  }
  return shuffle(qs).slice(0, QUIZ_LEN);
}

function genWorldQuiz() {
  const qs = [];
  const zoo = ANIMALS.concat(FRUITS);

  // 4 emoji → Khmer word
  shuffle(zoo).slice(0, 4).forEach(function (x) {
    const m = makeOptions(zoo.map(y => y.word), x.word);
    qs.push({
      text: "តើរូបនេះជាអ្វី?",
      emojiRow: x.emoji,
      options: m.options,
      correctIndex: m.correctIndex
    });
  });

  // 3 Khmer word → emoji
  shuffle(zoo).slice(0, 3).forEach(function (x) {
    const m = makeOptions(zoo.map(y => y.emoji), x.emoji);
    qs.push({
      text: `តើពាក្យ «${x.word}» ត្រូវនឹងរូបណា?`,
      emojiOpts: true,
      options: m.options,
      correctIndex: m.correctIndex
    });
  });

  // 2 shapes
  shuffle(SHAPES).slice(0, 2).forEach(function (x) {
    const m = makeOptions(SHAPES.map(y => y.word), x.word);
    qs.push({
      text: "តើរូបរាងនេះហៅថាអ្វី?",
      emojiRow: x.emoji,
      options: m.options,
      correctIndex: m.correctIndex
    });
  });

  // 1 body part → emoji
  const b = shuffle(BODY)[0];
  const mb = makeOptions(BODY.map(y => y.emoji), b.emoji);
  qs.push({
    text: `តើ «${b.word}» ត្រូវនឹងរូបណា?`,
    emojiOpts: true,
    options: mb.options,
    correctIndex: mb.correctIndex
  });

  return shuffle(qs).slice(0, QUIZ_LEN);
}

function startQuiz(id) {
  notify("quiz");
  lessonCtl = null;
  const s = SUBJECTS[id];
  const questions = id === "kh" ? genKhmerQuiz()
    : (id === "math" ? genMathQuiz()
      : (id === "en" ? genEnglishQuiz() : genWorldQuiz()));
  let qIdx = 0;
  let score = 0;

  function render() {
    const q = questions[qIdx];
    const optsHtml = q.options.map(function (o, i) {
      const cls = "opt" + (q.emojiOpts ? " emoji-opt" : "");
      return `<button class="${cls}" data-i="${i}">${o}</button>`;
    }).join("");

    $app.innerHTML = `
      <div class="topbar">
        <button class="back" data-act="back">←</button>
        <div class="titles">
          <h1>ល្បែងសួរឆ្លើយ</h1>
          <div class="sub">${s.en.toUpperCase()} QUIZ</div>
        </div>
      </div>
      <div class="page">
        <div class="quiz-progress">
          <div class="qbar"><div class="fill" style="width:${(qIdx / questions.length) * 100}%;"></div></div>
          <span class="qcount">${qIdx + 1}/${questions.length}</span>
        </div>
        <div class="card question-card">
          <div class="qtext">${q.text}</div>
          ${q.big ? `<div class="qbig">${q.big}</div>` : ""}
          ${q.emojiRow ? `<div class="qemoji-row ${q.bigger ? "bigger" : ""}">${q.emojiRow}</div>` : ""}
        </div>
        <div class="options">${optsHtml}</div>
      </div>
    `;

    $app.querySelector('[data-act="back"]').addEventListener("click", function () {
      renderSubject(id);
    });

    $app.querySelectorAll(".opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        answer(parseInt(btn.getAttribute("data-i"), 10));
      });
    });
  }

  function answer(i) {
    const q = questions[qIdx];
    const buttons = $app.querySelectorAll(".opt");
    buttons.forEach(function (b) { b.disabled = true; });

    if (i === q.correctIndex) {
      score++;
      bumpCorrect();
      buttons[i].classList.add("correct");
      soundCorrect();
    } else {
      buttons[i].classList.add("wrong");
      buttons[q.correctIndex].classList.add("correct");
      soundWrong();
      buzz(150);
    }
    // dim others
    buttons.forEach(function (b, j) {
      if (j !== i && j !== q.correctIndex) b.classList.add("dim");
    });

    setTimeout(function () {
      qIdx++;
      if (qIdx < questions.length) render();
      else finish();
    }, 950);
  }

  function finish() {
    notify("result");
    const starCount = score >= Math.ceil(questions.length * 0.9) ? 3
      : (score >= Math.ceil(questions.length * 0.7) ? 2 : 1);
    const stars = loadStars();
    if (starCount > stars[currentSubject]) {
      stars[currentSubject] = starCount;
      saveStars(stars);
    }
    if (score === questions.length) markPerfect();

    let starsHtml = "";
    for (let i = 0; i < MAX_STARS; i++) {
      const on = i < starCount;
      starsHtml += `<span class="star ${on ? "on" : ""}" style="animation-delay:${i * 0.35}s;">⭐</span>`;
    }

    $app.innerHTML = `
      <div class="page" style="justify-content:center;">
        <div class="card result-card">
          <div class="trophy">${score >= 7 ? "🏆" : "🎉"}</div>
          <h2>ចប់ហើយ! Well done!</h2>
          <div class="score">ពិន្ទុ៖ ${score}/${questions.length}</div>
          <div class="stars-row">${starsHtml}</div>
          <div style="font-size:14px;color:var(--ink-soft);">ផ្តាស់ត្រូវបានរក្សាទុក ✔</div>
        </div>
        <div class="result-actions">
          <button class="btn btn-again" data-act="again">🔄 ធ្វើម្តងទៀត</button>
          <button class="btn btn-home" data-act="sub">🏠 ទំព័រមេរៀន</button>
        </div>
      </div>
    `;

    soundWin();
    confetti(30);

    $app.querySelector('[data-act="again"]').addEventListener("click", function () {
      startQuiz(currentSubject);
    });
    $app.querySelector('[data-act="sub"]').addEventListener("click", function () {
      renderSubject(currentSubject);
    });
  }

  render();
}

/* =====================================================
   SCREEN: MEMORY GAME (ល្បែងចងចាំ)
   ===================================================== */
/* emoji → សម្លេងអានពាក្យខ្មែរ (v1.2) */
const MEM_SAY = {};
ANIMALS.forEach(function (x) { MEM_SAY[x.emoji] = "audio/km/animal_" + x.en.toLowerCase() + ".mp3"; });
FRUITS.forEach(function (x) { MEM_SAY[x.emoji] = "audio/km/fruit_" + x.en.toLowerCase() + ".mp3"; });

function goGame() {
  notify("game");
  lessonCtl = null;
  speak("audio/km/subject_game.mp3");
  const pool = ANIMALS.concat(FRUITS).map(function (x) { return x.emoji; });
  const pairs = shuffle(pool).slice(0, 6);
  const cards = shuffle(pairs.concat(pairs));
  const state = cards.map(function () { return "closed"; });
  let first = null;
  let matched = 0;
  let moves = 0;
  let lock = false;

  function render() {
    const cardsHtml = cards.map(function (em, i) {
      const st = state[i];
      const face = st === "closed" ? "❔" : em;
      return `<button class="mem-card ${st}" data-i="${i}"><span>${face}</span></button>`;
    }).join("");

    $app.innerHTML = `
      <div class="topbar">
        <button class="back" data-act="back">←</button>
        <div class="titles">
          <h1>ល្បែងចងចាំ</h1>
          <div class="sub">MEMORY GAME</div>
        </div>
      </div>
      <div class="page">
        <div class="mem-stats">
          <div class="chip2">👆 ជំហាន៖ <b>${moves}</b></div>
          <div class="chip2">💗 រកឃើញ៖ <b>${matched}/6</b></div>
        </div>
        <div class="card mem-hint">🧠 ចុចកាត ២ សន្លឹកឱ្យដូចគ្នា!<span class="small">Find the matching pairs!</span></div>
        <div class="mem-grid">${cardsHtml}</div>
      </div>
    `;

    $app.querySelector('[data-act="back"]').addEventListener("click", goHome);
    $app.querySelectorAll(".mem-card").forEach(function (btn) {
      btn.addEventListener("click", function () {
        tap(parseInt(btn.getAttribute("data-i"), 10));
      });
    });
  }

  function tap(i) {
    if (lock) return;
    if (state[i] !== "closed") return;
    ensureAudio();
    state[i] = "open";
    if (MEM_SAY[cards[i]]) speak(MEM_SAY[cards[i]]);
    if (first === null) { first = i; render(); return; }

    moves++;
    render();
    if (cards[first] === cards[i]) {
      state[first] = "matched";
      state[i] = "matched";
      matched++;
      first = null;
      soundCorrect();
      render();
      if (matched === 6) setTimeout(win, 700);
    } else {
      lock = true;
      tone(196, 0.18, 0, "triangle", 0.10);
      const f = first;
      first = null;
      setTimeout(function () {
        state[f] = "closed";
        state[i] = "closed";
        lock = false;
        render();
      }, 850);
    }
  }

  function win() {
    notify("result");
    const starCount = moves <= 8 ? 3 : (moves <= 11 ? 2 : 1);
    const stars = loadStars();
    if (starCount > stars.game) { stars.game = starCount; saveStars(stars); }
    markMemWin();

    let starsHtml = "";
    for (let i = 0; i < MAX_STARS; i++) {
      const on = i < starCount;
      starsHtml += `<span class="star ${on ? "on" : ""}" style="animation-delay:${i * 0.35}s;">⭐</span>`;
    }

    $app.innerHTML = `
      <div class="page" style="justify-content:center;">
        <div class="card result-card">
          <div class="trophy">🎉</div>
          <h2>ពូកែចងចាំមែន!</h2>
          <div class="score">ចប់ដោយ ${moves} ជំហាន</div>
          <div class="stars-row">${starsHtml}</div>
          <div style="font-size:14px;color:var(--ink-soft);">ផ្តាស់ត្រូវបានរក្សាទុក ✔</div>
        </div>
        <div class="result-actions">
          <button class="btn btn-again" data-act="again">🔄 លេងម្តងទៀត</button>
          <button class="btn btn-home" data-act="home2">🏠 ទំព័រដើម</button>
        </div>
      </div>
    `;

    soundWin();
    confetti(30);

    $app.querySelector('[data-act="again"]').addEventListener("click", goGame);
    $app.querySelector('[data-act="home2"]').addEventListener("click", goHome);
  }

  render();
}

/* =====================================================
   SCREEN: MEDALS (មេដាយ)
   ===================================================== */
function renderMedals() {
  notify("medals");
  lessonCtl = null;
  const stars = loadStars();
  const total = stars.kh + stars.math + stars.en + stars.world + stars.game;
  const stats = loadStats();
  let unlocked = 0;

  const items = MEDALS.map(function (m) {
    const on = !!m.check(total, stats);
    if (on) unlocked++;
    return `
      <div class="medal-card ${on ? "on" : "off"}">
        <div class="mi">${m.icon}</div>
        <h4>${m.name}</h4>
        <p>${m.desc}</p>
        <div class="mstate">${on ? "✔ បានទទួល" : "🔒 មិនទាន់បាន"}</div>
      </div>`;
  }).join("");

  $app.innerHTML = `
    <div class="topbar">
      <button class="back" data-act="back">←</button>
      <div class="titles">
        <h1>មេដាយរបស់ខ្ញុំ</h1>
        <div class="sub">MY MEDALS</div>
      </div>
    </div>
    <div class="page">
      <div class="card" style="text-align:center;">
        <div style="font-size:44px;">🏅</div>
        <div style="font-size:18px;font-weight:bold;margin-top:4px;">បាន ${unlocked} / ${MEDALS.length} មេដាយ</div>
        <div style="font-size:13px;color:var(--ink-soft);margin-top:2px;">ធ្វើល្បែងច្រើនទៀតដើម្បីប្រមូលមេដាយទាំងអស់!</div>
      </div>
      <div class="medal-grid">${items}</div>
    </div>
  `;

  $app.querySelector('[data-act="back"]').addEventListener("click", goHome);
}

/* =====================================================
   SCREEN: SETTINGS (ការកំណត់)
   ===================================================== */
function renderSettings() {
  notify("settings");
  lessonCtl = null;
  const p = loadProfile();
  let selAvatar = p.avatar;
  let selSound = p.sound !== false;

  $app.innerHTML = `
    <div class="topbar">
      <button class="back" data-act="back">←</button>
      <div class="titles">
        <h1>ការកំណត់</h1>
        <div class="sub">SETTINGS</div>
      </div>
    </div>
    <div class="page">
      <div class="card">
        <label class="field-label">ឈ្មោះកុមារ (Child name)</label>
        <input id="nameInput" class="text-input" maxlength="16" placeholder="វាយឈ្មោះរបស់កុមារ..." value="${esc(p.name)}">
        <label class="field-label" style="margin-top:14px;">ជ្រើសរើសរូបតំណាង (Avatar)</label>
        <div class="avatar-grid">
          ${AVATARS.map(function (a) {
            return `<button class="avatar-btn ${a === selAvatar ? "sel" : ""}" data-a="${a}">${a}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="card row-card">
        <span style="font-size:16px;">សំឡេង &amp; សម្លេងអាន (Sound &amp; Speech)</span>
        <button class="sound-btn ${selSound ? "" : "off2"}" id="soundBtn">${selSound ? "🔊 បើក" : "🔇 បិទ"}</button>
      </div>
      <div class="card">
        <div style="font-size:16px;font-weight:bold;">សម្រាប់ម្តាយឪពុកម្តាយ</div>
        <div style="font-size:13px;color:var(--ink-soft);margin:4px 0 10px;">លុបផ្តាស់ មេដាយ និងការកំណត់ទាំងអស់</div>
        <button class="danger-btn" id="resetBtn">🗑 លុបទិន្នន័យទាំងអស់</button>
      </div>
      <button class="save-btn" id="saveBtn">💾 រក្សាទុក (Save)</button>
      <div class="footer-note">ថ្នាក់មូលដ្ឋាន • Version 1.2</div>
    </div>
  `;

  $app.querySelector('[data-act="back"]').addEventListener("click", goHome);

  $app.querySelectorAll("[data-a]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      selAvatar = btn.getAttribute("data-a");
      $app.querySelectorAll("[data-a]").forEach(function (b) { b.classList.remove("sel"); });
      btn.classList.add("sel");
      ensureAudio();
      tone(660, 0.08, 0, "sine", 0.12);
    });
  });

  const soundBtn = $app.querySelector("#soundBtn");
  soundBtn.addEventListener("click", function () {
    selSound = !selSound;
    soundOn = selSound;
    soundBtn.textContent = selSound ? "🔊 បើក" : "🔇 បិទ";
    soundBtn.classList.toggle("off2", !selSound);
    if (selSound) { ensureAudio(); tone(660, 0.1, 0, "sine", 0.15); }
  });

  const saveBtn = $app.querySelector("#saveBtn");
  saveBtn.addEventListener("click", function () {
    const name = ($app.querySelector("#nameInput").value || "").trim().slice(0, 16);
    saveProfile({ name: name, avatar: selAvatar, sound: selSound });
    toast("រក្សាទុករួចរាល់ ✔");
    setTimeout(goHome, 500);
  });

  /* reset with two-tap confirm (for parents) */
  let armed = false;
  let armTimer = null;
  const resetBtn = $app.querySelector("#resetBtn");
  resetBtn.addEventListener("click", function () {
    if (!armed) {
      armed = true;
      resetBtn.classList.add("armed");
      resetBtn.textContent = "⚠️ ចុចម្តងទៀត ដើម្បីបញ្ជាក់ការលុប!";
      armTimer = setTimeout(function () {
        armed = false;
        resetBtn.classList.remove("armed");
        resetBtn.textContent = "🗑 លុបទិន្នន័យទាំងអស់";
      }, 3500);
    } else {
      clearTimeout(armTimer);
      try {
        localStorage.removeItem(K_STARS);
        localStorage.removeItem(K_STATS);
        localStorage.removeItem(K_PROFILE);
      } catch (e) { /* ignore */ }
      soundOn = true;
      toast("លុបរួចរាល់! ចាប់ផ្តើមថ្មី 🌱");
      goHome();
    }
  });
}

/* ---------------- boot ---------------- */
soundOn = loadProfile().sound !== false;
updateStreak();
goHome();
