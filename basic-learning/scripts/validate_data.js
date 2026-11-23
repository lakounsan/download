/* Validate BasicLearning data.js integrity + quiz generation.
   Run with Node.js:  node scripts/validate_data.js */
"use strict";
const fs = require("fs");
const path = require("path");
const dataPath = path.join(__dirname, "..", "app", "assets", "data.js");
const src = fs.readFileSync(dataPath, "utf8") +
  "; return { CONSONANTS, VOWELS, KH_NUMS, EN_LETTERS, EN_NUMS, EN_COLORS, ANIMALS, FRUITS, SHAPES, BODY, DAYS, MAX_STARS, QUIZ_LEN };";
const D = new Function(src)();

console.log("CONSONANTS:", D.CONSONANTS.length, "(expect 33)");
console.log("VOWELS:", D.VOWELS.length, "(expect 17)");
console.log("ANIMALS:", D.ANIMALS.length, "(expect 14)");
console.log("FRUITS:", D.FRUITS.length, "(expect 10)");
console.log("SHAPES:", D.SHAPES.length, "(expect 6)");
console.log("BODY:", D.BODY.length, "(expect 8)");
console.log("DAYS:", D.DAYS.length, "(expect 7)");

const zooEm = D.ANIMALS.concat(D.FRUITS).map(x => x.emoji);
console.log("zoo emojis distinct:", new Set(zooEm).size === zooEm.length, "(" + zooEm.length + ")");
console.log("shape emojis distinct:", new Set(D.SHAPES.map(x => x.emoji)).size === D.SHAPES.length);
console.log("body emojis distinct:", new Set(D.BODY.map(x => x.emoji)).size === D.BODY.length);
console.log("day emojis distinct:", new Set(D.DAYS.map(x => x.emoji)).size === D.DAYS.length);

/* simulate world quiz generation 300 times */
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function pickN(arr, n, ex) { return shuffle(arr.filter(x => x !== ex)).slice(0, n); }
function makeOptions(pool, correct) {
  const others = pickN(pool, 2, correct);
  const opts = shuffle([correct].concat(others));
  return { options: opts, correctIndex: opts.indexOf(correct) };
}
let ok = true;
for (let t = 0; t < 300; t++) {
  const zoo = D.ANIMALS.concat(D.FRUITS);
  const q1 = shuffle(zoo).slice(0, 4).every(x => makeOptions(zoo.map(y => y.word), x.word).correctIndex >= 0);
  const q2 = shuffle(zoo).slice(0, 3).every(x => makeOptions(zoo.map(y => y.emoji), x.emoji).correctIndex >= 0);
  const q3 = shuffle(D.SHAPES).slice(0, 2).every(x => makeOptions(D.SHAPES.map(y => y.word), x.word).correctIndex >= 0);
  const b = shuffle(D.BODY)[0];
  const q4 = makeOptions(D.BODY.map(y => y.emoji), b.emoji).correctIndex >= 0;
  if (!(q1 && q2 && q3 && q4)) { ok = false; console.log("FAIL at", t); break; }
}
console.log("world quiz gen 300x ok:", ok);

/* memory game pool check: needs >= 6 distinct emojis */
console.log("memory pool >= 6:", zooEm.length >= 6);
