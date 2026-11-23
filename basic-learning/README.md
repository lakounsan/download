# ថ្នាក់មូលដ្ឋាន — BasicLearning 🎓

**កម្មវិធីសិក្សាមូលដ្ឋានសម្រាប់កុមារអាយុ ៤–៧ ឆ្នាំ** (Khmer basic education app for children aged 4–7)

អក្សរខ្មែរ • គណិតវិទ្យា • ភាសាអង់គ្លេស • ពិភពជុំវិញ — ដំណើរការ **offline** ទាំងស្រុង គ្មានពាណិជ្ជកម្ម

---

## ✨ មុខងារ (Features)

- 📘 **អក្សរខ្មែរ (Khmer Letters)** — ព្យញ្ជនៈ ៣៣ តួ + ស្វ័យភេត្រ ១៧ តួ + លេខខ្មែរ ១–១០ ជាមួយពាក្យឧទាហរណ៍ និងរូបភាព
- 🔢 **គណិតវិទ្យា (Math)** — រាប់លេខ, បូក (+) និងដក (−)
- 🔤 **ភាសាអង់គ្លេស (English)** — អក្សរ A–Z, លេខ 1–10, ពណ៌ ៩ ប្រភេទ
- 🌍 **ពិភពជុំវិញ (My World)** — សត្វ, ផ្លែឈើ, រូបរាង, កាយវក្តី, ថ្ងៃទាំង ៧
- 🃏 **ល្បែងចងចាំ (Memory Game)** — ផ្ទាំងកាត ៣×៤ រកគូដូចគ្នា
- 🎯 **ល្បែងសួរឆ្លើយ (Quiz)** — ១០ សំណួរចៃដន្យ ចុងបញ្ចប់បានផ្កាយ ⭐ ១–៣
- 🏅 **មេដាយ (Medals)** — ៨ មេដាយដើម្បីប្រមូល
- 🔥 **ថ្ងៃសិក្សាជាប់ៗ (Daily streak)** — ជំរុញឱ្យរៀនជារៀងរាល់ថ្ងៃ
- ⚙️ **ការកំណត់ (Settings)** — ឈ្មោះកុមារ, រូបតំណាង ៨, បិទ/បើកសំឡេង, លុបទិន្នន័យ (សម្រាប់ម្តាយឪពុកម្តាយ)
- 🔊 សំឡេងតាម Web Audio • 🎉 confetti • 📳 ញ័រ • 💾 រក្សាទុកក្នុងឧបករណ៍ (localStorage)

## 📲 ដំឡើង (Install)

1. ទាញយក `BasicLearning_v1.1.apk` (Android 5.0+)
2. បើកឯកសារ APK នៅលើទូរស័ព្ទ → អនុញ្ញាត "ដំឡើងពីប្រភពមិនស្គាល់" (Install from unknown sources)
3. បើកកម្មវិធី **ថ្នាក់មូលដ្ឋាន** ហើយចាប់ផ្តើមរៀន!

## 🛠 សាងសង់ពីប្រភព (Build from source)

មិនត្រូវការ Gradle ទេ — ប្រើស្គ្រីបធម្មតា។ (No Gradle needed — plain shell script.)

**តម្រូវការ (Requirements):**
- Android SDK build-tools (aapt2, d8, zipalign, apksigner) — ឧ. 34.0.0
- `android.jar` ពី platform (ឧ. android-34)
- JDK 17+ (javac, keytool)
- `zip`, `bash`, Python 3 + Pillow (សម្រាប់រូបភាព), Node.js (សម្រាប់ពិនិត្យទិន្នន័យ)

```bash
# 1. បង្កើតរូបភាព launcher (ម្តងគ្រប់គ្រាន់)
python3 scripts/gen_icons.py

# 2. ពិនិត្យទិន្នន័យមេរៀន (ស្រេចចិត្ត)
node scripts/validate_data.js

# 3. សាងសង់ APK
ANDROID_HOME=/path/to/android-sdk bash scripts/build_apk.sh
# ឬបញ្ជាក់ផ្លូវដោយផ្ទាល់៖
ANDROID_BUILD_TOOLS=/path/to/build-tools/34.0.0 \
ANDROID_JAR=/path/to/platforms/android-34/android.jar \
bash scripts/build_apk.sh
```

APK ចេញនៅ `build/BasicLearning_v1.1.apk`

## 📁 រចនាសម្ព័ន្ធកូដ (Project structure)

```
app/
├── AndroidManifest.xml
├── assets/                # កម្មវិធី HTML/CSS/JS (ដំណើរការក្នុង browser បានដែរ)
│   ├── index.html
│   ├── data.js            # ខ្លឹមសារមេរៀនទាំងអស់ (offline)
│   ├── app.js             # logic នៃកម្មវិធី
│   └── app.css
├── res/                   # រូបភាព launcher (បង្កើតដោយ script) + strings
└── src/com/basiclearning/app/MainActivity.java   # WebView shell + JS bridge
scripts/
├── build_apk.sh           # ដំណើរការសាងសង់ APK ដោយគ្មាន Gradle
├── gen_icons.py           # បង្កើតរូបភាព launcher (Pillow)
└── validate_data.js       # ពិនិត្យភាពត្រឹមត្រូវនៃទិន្នន័យ (Node.js)
```

កម្មវិធី Android គ្រាន់តែជា **WebView shell** ស្តើង (`MainActivity.java`) ដែលផ្ទុកកម្មវិធី HTML/CSS/JS សុទ្ធក្នុង `app/assets/`។ អ្នកអាចបើក `app/assets/index.html` ក្នុង browser (Chrome/Firefox) សាកល្បងបានភ្លាមៗ។

## 🎨 កែប្រែខ្លឹមសារ (Customize)

- ខ្លឹមសារមេរៀន/សំណួរ ស្ថិតនៅ `app/assets/data.js` — បន្ថែមពាក្យ, emoji, វិជ្ជាថ្មីនៅទីនេះ
- ពណ៌ និងរចនាបថ ស្ថិតនៅ `app/assets/app.css`

## 📄 License

MIT — សូមមើល [LICENSE](LICENSE)
