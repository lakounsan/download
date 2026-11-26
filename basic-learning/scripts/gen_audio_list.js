/* =====================================================
   ថ្នាក់មូលដ្ឋាន — gen_audio_list.js
   Builds the full TTS audio list from data.js (single
   source of truth) and prints it as JSON to stdout.

   Usage: node scripts/gen_audio_list.js > scripts/audio_list.json
   Voices: km = km-KH-SreymomNeural (female Khmer)
           en = en-US-AnaNeural (child English, fallback Jenny)
   ===================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "app", "assets", "data.js"), "utf8");
const D = new Function(
  src + "\n;return {CONSONANTS:CONSONANTS,VOWELS:VOWELS,KH_NUMS:KH_NUMS,EN_LETTERS:EN_LETTERS," +
  "EN_NUMS:EN_NUMS,EN_COLORS:EN_COLORS,ANIMALS:ANIMALS,FRUITS:FRUITS,SHAPES:SHAPES,BODY:BODY,DAYS:DAYS};"
)();

const KM = "km-KH-SreymomNeural";
const EN = "en-US-AnaNeural";

const pad2 = function (n) { return ("0" + n).slice(-2); };
const items = [];

/* ព្យញ្ជនៈ ៣៣ — read the example word */
D.CONSONANTS.forEach(function (c, i) {
  items.push({ f: "km/cons" + pad2(i + 1) + ".mp3", t: c.word, v: KM });
});

/* ស្វ័យភេត្រ ១៧ — read the example word */
D.VOWELS.forEach(function (v, i) {
  items.push({ f: "km/vow" + pad2(i + 1) + ".mp3", t: v.ex, v: KM });
});

/* លេខខ្មែរ ១-១០ */
D.KH_NUMS.forEach(function (k) {
  items.push({ f: "km/num" + pad2(k.num) + ".mp3", t: k.word, v: KM });
});

/* គណិត — បូក (spoken equation) */
const ADD = [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 2], [5, 2], [4, 4]];
const w = function (n) { return D.KH_NUMS[n - 1].word; };
ADD.forEach(function (p) {
  items.push({
    f: "km/add_" + p[0] + "_" + p[1] + ".mp3",
    t: w(p[0]) + " បូក " + w(p[1]) + " ស្មើ " + w(p[0] + p[1]),
    v: KM
  });
});

/* គណិត — ដក (spoken equation) */
const SUB = [[3, 1], [4, 2], [5, 1], [5, 3], [6, 2], [7, 4], [8, 3], [9, 5]];
SUB.forEach(function (p) {
  items.push({
    f: "km/sub_" + p[0] + "_" + p[1] + ".mp3",
    t: w(p[0]) + " ដក " + w(p[1]) + " ស្មើ " + w(p[0] - p[1]),
    v: KM
  });
});

/* ពិភពជុំវិញ — animals, fruits, shapes, body, days */
D.ANIMALS.forEach(function (x) { items.push({ f: "km/animal_" + x.en.toLowerCase() + ".mp3", t: x.word, v: KM }); });
D.FRUITS.forEach(function (x)  { items.push({ f: "km/fruit_" + x.en.toLowerCase() + ".mp3",  t: x.word, v: KM }); });
D.SHAPES.forEach(function (x)  { items.push({ f: "km/shape_" + x.en.toLowerCase() + ".mp3",  t: x.word, v: KM }); });
D.BODY.forEach(function (x)    { items.push({ f: "km/body_" + x.en.toLowerCase() + ".mp3",   t: x.word, v: KM }); });
D.DAYS.forEach(function (x)    { items.push({ f: "km/day_" + x.en.toLowerCase() + ".mp3",    t: x.word, v: KM }); });

/* ពណ៌ — English word + Khmer name */
D.EN_COLORS.forEach(function (c) {
  items.push({ f: "en/color_" + c.word.toLowerCase() + ".mp3", t: c.word, v: EN });
  items.push({ f: "km/color_" + c.word.toLowerCase() + ".mp3", t: c.km, v: KM });
});

/* អង់គ្លេស — letters ("A. Apple") and numbers */
D.EN_LETTERS.forEach(function (c) {
  items.push({ f: "en/letter_" + c.l.toLowerCase() + ".mp3", t: c.l + ". " + c.word, v: EN });
});
D.EN_NUMS.forEach(function (k) {
  items.push({ f: "en/num_" + k.num + ".mp3", t: k.word, v: EN });
});

/* ឈ្មោះវិជ្ជា (spoken on subject open) */
items.push({ f: "km/subject_kh.mp3",    t: "អក្សរខ្មែរ",   v: KM });
items.push({ f: "km/subject_math.mp3",  t: "គណិតវិទ្យា",   v: KM });
items.push({ f: "km/subject_en.mp3",    t: "ភាសាអង់គ្លេស", v: KM });
items.push({ f: "km/subject_world.mp3", t: "ពិភពជុំវិញ",   v: KM });
items.push({ f: "km/subject_game.mp3",  t: "ល្បែងចងចាំ",   v: KM });

/* sanity: unique filenames */
const seen = {};
let dup = 0;
items.forEach(function (it) {
  if (seen[it.f]) { console.error("DUPLICATE: " + it.f); dup++; }
  seen[it.f] = true;
});
if (dup) process.exit(1);

process.stdout.write(JSON.stringify({ voiceKm: KM, voiceEn: EN, count: items.length, items: items }, null, 1));
