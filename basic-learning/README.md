# ថ្នាក់មូលដ្ឋាន — BasicLearning 🎓

**កម្មវិធីសិក្សាមូលដ្ឋានសម្រាប់កុមារអាយុ ៤–៧ ឆ្នាំ** (Khmer basic education app for children aged 4–7)

អក្សរខ្មែរ • គណិតវិទ្យា • ភាសាអង់គ្លេស • ពិភពជុំវិញ — ដំណើរការ **offline** ទាំងស្រុង គ្មានពាណិជ្ជកម្ម មាន**សម្លេងអានខ្មែរ**

---

## ✨ មុខងារ (Features)

- 📘 **អក្សរខ្មែរ (Khmer Letters)** — ព្យញ្ជនៈ ៣៣ តួ + ស្វ័យភេត្រ ១៧ តួ + លេខខ្មែរ ១–១០ ជាមួយពាក្យឧទាហរណ៍ និងរូបភាព
- 🔢 **គណិតវិទ្យា (Math)** — រាប់លេខ, បូក (+) និងដក (−)
- 🔤 **ភាសាអង់គ្លេស (English)** — អក្សរ A–Z, លេខ 1–10, ពណ៌ ៩ ប្រភេទ
- 🌍 **ពិភពជុំវិញ (My World)** — សត្វ, ផ្លែឈើ, រូបរាង, កាយវក្តី, ថ្ងៃទាំង ៧
- 🃏 **ល្បែងចងចាំ (Memory Game)** — ផ្ទាំងកាត ៣×៤ រកគូដូចគ្នា
- 🔊 **សម្លេងអានខ្មែរ (Khmer Speech, v1.2)** — ពេលបើកមេរៀន កម្មវិធីនិយាយខ្មែរច្បាស់ៗ៖ ពាក្យឧទាហរណ៍, លេខ, សមាសភាពគណិត («ពីរ បូក មួយ ស្មើ បី»), សត្វ/ផ្លែឈើ/ថ្ងៃ, ពណ៌អង់គ្លេស+ខ្មែរ — ថតសម្លេងពិត MP3 ១៨០ ឯកសារ បញ្ចូលក្នុងកម្មវិធី (គ្មានអ៊ុីនធឺណិតក្នុងពេលរៀន)។ ចុចលើកាតដើម្បីស្តាប់ម្តងទៀត
- 🎯 **ល្បែងសួរឆ្លើយ (Quiz)** — ១០ សំណួរចៃដន្យ ចុងបញ្ចប់បានផ្កាយ ⭐ ១–៣
- 🏅 **មេដាយ (Medals)** — ៨ មេដាយដើម្បីប្រមូល
- 🔥 **ថ្ងៃសិក្សាជាប់ៗ (Daily streak)** — ជំរុញឱ្យរៀនជារៀងរាល់ថ្ងៃ
- ⚙️ **ការកំណត់ (Settings)** — ឈ្មោះកុមារ, រូបតំណាង ៨, បិទ/បើកសំឡេង, លុបទិន្នន័យ (សម្រាប់ម្តាយឪពុកម្តាយ)
- 🔊 សំឡេងតាម Web Audio • 🎉 confetti • 📳 ញ័រ • 💾 រក្សាទុកក្នុងឧបករណ៍ (localStorage)

## 📲 ដំឡើង (Install)

1. ទាញយក `BasicLearning_v1.2.apk` (Android 5.0+, versionCode 3)
2. បើកឯកសារ APK នៅលើទូរស័ព្ទ → អនុញ្ញាត "ដំឡើងពីប្រភពមិនស្គាល់" (Install from unknown sources)
3. បើកកម្មវិធី **ថ្នាក់មូលដ្ឋាន** ហើយចាប់ផ្តើមរៀន!

> ⚠️ ចំណាំ៖ ប្រសិនបើបានដំឡើង v1.1 ពីមុន សូម**លុប (Uninstall) v1.1 ជាមុនសិន** មុននឹងដំឡើង v1.2 — ព្រោះកូនសោសហត្រឡេស (signing key) បានផ្លាស់ប្តូរ។

## 🛠 សាងសង់ពីប្រភព (Build from source)

មិនត្រូវការ Gradle ទេ — ប្រើស្គ្រីបធម្មតា។ (No Gradle needed — plain shell script.)

**តម្រូវការ (Requirements):**
- Android SDK build-tools (aapt2, d8, zipalign, apksigner) — ឧ. 34.0.0
- `android.jar` ពី platform (ឧ. android-34)
- JDK 17+ (javac, keytool)
- `zip`, `bash`, Python 3 + Pillow + edge-tts (សម្រាប់រូបភាព និងសម្លេង), Node.js (សម្រាប់ពិនិត្យទិន្នន័យ)

```bash
# 1. បង្កើតរូបភាព launcher (ម្តងគ្រប់គ្រាន់)
python3 scripts/gen_icons.py

# 2. បង្កើតសម្លេងអានខ្មែរ (ត្រូវការអ៊ុីនធឺណិតតែពេលបង្កើត; បង្កើតតែលើកដំបូង)
pip install edge-tts
node scripts/gen_audio_list.js > scripts/audio_list.json
python3 scripts/gen_audio.py

# 3. ពិនិត្យទិន្នន័យ និងសម្លេង (ស្រេចចិត្ត)
node scripts/validate_data.js
node scripts/check_audio.js

# 4. សាងសង់ APK
ANDROID_HOME=/path/to/android-sdk bash scripts/build_apk.sh
# ឬបញ្ជាក់ផ្លូវដោយផ្ទាល់៖
ANDROID_BUILD_TOOLS=/path/to/build-tools/34.0.0 \
ANDROID_JAR=/path/to/platforms/android-34/android.jar \
VERSION_CODE=3 VERSION_NAME=1.2 \
bash scripts/build_apk.sh
```

APK ចេញនៅ `build/BasicLearning_v1.2.apk`។ សម្លេងអាន បង្កើតដោយ edge-tts សម្លេងខ្មែរ neural (`km-KH-SreymomNeural`) និងអង់គ្លេស (`en-US-AnaNeural`) — សម្រាប់កុមារ។

> ចំណាំ៖ `--version-code/--version-name` នៅក្នុង build script មិន override `android:versionCode` ក្នុង manifest បានទេ (ឥរិយាបថ aapt2) — កែវេរស័យននៅ `app/AndroidManifest.xml`។

## 📁 រចនាសម្ព័ន្ធកូដ (Project structure)

```
app/
├── AndroidManifest.xml
├── assets/
│   ├── index.html
│   ├── data.js            # ខ្លឹមសារមេរៀនទាំងអស់ (offline)
│   ├── app.js             # logic នៃកម្មវិធី (រួមតែសម្លេងអាន)
│   ├── app.css
│   └── audio/             # សម្លេងអាន MP3 (km/ + en/, បង្កើតដោយ script)
│       ├── km/            # សម្លេងខ្មែរ km-KH-SreymomNeural
│       └── en/            # សម្លេងអង់គ្លេស en-US-AnaNeural
├── res/                   # រូបភាព launcher (បង្កើតដោយ script) + strings
└── src/com/basiclearning/app/MainActivity.java   # WebView shell + JS bridge
scripts/
├── build_apk.sh           # ដំណើរការសាងសង់ APK ដោយគ្មាន Gradle
├── gen_icons.py           # បង្កើតរូបភាព launcher (Pillow)
├── gen_audio_list.js      # បង្កើតបញ្ជីសម្លេងពី data.js (source of truth)
├── gen_audio.py           # ថតសម្លេង MP3 ដោយ edge-tts
├── check_audio.js         # ពិនិត្យថាសម្លេងគ្រប់ត្រូវបានបង្កើត
└── validate_data.js       # ពិនិត្យភាពត្រឹមត្រូវនៃទិន្នន័យ (Node.js)
```

កម្មវិធី Android គ្រាន់តែជា **WebView shell** ស្តើង (`MainActivity.java`) ដែលផ្ទុកកម្មវិធី HTML/CSS/JS សុទ្ធក្នុង `app/assets/`។ អ្នកអាចបើក `app/assets/index.html` ក្នុង browser (Chrome/Firefox) សាកល្បងបានភ្លាមៗ។

## 🎨 កែប្រែខ្លឹមសារ (Customize)

- ខ្លឹមសារមេរៀន/សំណួរ ស្ថិតនៅ `app/assets/data.js` — បន្ថែមពាក្យ, emoji, វិជ្ជាថ្មីនៅទីនេះ។ បន្ទាប់មក run `node scripts/gen_audio_list.js > scripts/audio_list.json && python3 scripts/gen_audio.py` ដើម្បីបង្កើតសម្លេងសម្រាប់ពាក្យថ្មី
- ពណ៌ និងរចនាបថ ស្ថិតនៅ `app/assets/app.css`

## 📄 License

MIT — សូមមើល [LICENSE](LICENSE)
