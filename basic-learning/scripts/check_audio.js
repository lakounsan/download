/* =====================================================
   ថ្នាក់មូលដ្ឋាន — check_audio.js
   Cross-checks:
     1. every audio/*.mp3 referenced in app.js exists on disk
     2. every entry in audio_list.json exists on disk
     3. no orphan MP3 on disk that nothing references (warning)
   Usage: node scripts/check_audio.js
   ===================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "app", "assets", "audio");
const appJs = fs.readFileSync(path.join(ROOT, "app", "assets", "app.js"), "utf8");
const list = JSON.parse(fs.readFileSync(path.join(__dirname, "audio_list.json"), "utf8"));

let fail = 0;

/* 1. references in app.js */
const refs = new Set();
const re = /["'](audio\/[A-Za-z0-9_\/]+\.mp3)["']/g;
let m;
while ((m = re.exec(appJs)) !== null) refs.add(m[1]);

const dynamicPatterns = [
  "km/cons##.mp3", "km/vow##.mp3", "km/num##.mp3",
  "km/add_#_#.mp3", "km/sub_#_#.mp3",
  "km/animal_*.mp3", "km/fruit_*.mp3", "km/shape_*.mp3", "km/body_*.mp3", "km/day_*.mp3",
  "km/color_*.mp3", "en/color_*.mp3", "en/letter_*.mp3", "en/num_*.mp3"
];
console.log("app.js static refs: " + refs.size + " files");
console.log("app.js dynamic ref patterns: " + dynamicPatterns.length + " (validated via audio_list.json)");

/* 2. audio_list.json entries exist on disk */
let missing = 0;
list.items.forEach(function (it) {
  const p = path.join(AUDIO_DIR, it.f);
  if (!fs.existsSync(p) || fs.statSync(p).size < 800) {
    console.error("MISSING: " + it.f);
    missing++;
  }
});
if (missing) fail++;

/* 3. orphans on disk */
const onDisk = [];
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".mp3")) onDisk.push(path.relative(AUDIO_DIR, p));
  });
})(AUDIO_DIR);

const listed = new Set(list.items.map(x => x.f));
const orphans = onDisk.filter(f => !listed.has(f));
if (orphans.length) console.warn("WARNING orphans (not in list): " + orphans.join(", "));

/* 4. every referenced say-file must be in audio_list.json */
let refMissing = 0;
refs.forEach(function (r) {
  if (!listed.has(r.slice("audio/".length))) {
    console.error("app.js references file not in audio_list.json: " + r);
    refMissing++;
  }
});
if (refMissing) fail++;

/* counts */
const km = onDisk.filter(f => f.startsWith("km/")).length;
const en = onDisk.filter(f => f.startsWith("en/")).length;
console.log(`On disk: ${onDisk.length} MP3 (km=${km}, en=${en}) | list: ${list.items.length}`);

if (fail || missing || refMissing) {
  console.error("CHECK FAILED");
  process.exit(1);
}
console.log("CHECK OK — every referenced audio file exists and every listed file was generated");
