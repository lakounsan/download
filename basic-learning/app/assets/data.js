/* =====================================================
   ថ្នាក់មូលដ្ឋាន — BasicLearning content data
   មាតិកាមេរៀនទាំងអស់ (offline)
   ===================================================== */
"use strict";

/* ---- ព្យញ្ជនៈខ្មែរ ៣៣ តួ ---- */
const CONSONANTS = [
  { l: "ក", word: "ក្របី",    emoji: "🐃", en: "Buffalo" },
  { l: "ខ", word: "ខ្លា",     emoji: "🐅", en: "Tiger" },
  { l: "គ", word: "គោ",       emoji: "🐄", en: "Cow" },
  { l: "ឃ", word: "ឃ្លាន",    emoji: "😋", en: "Hungry" },
  { l: "ង", word: "ងូតទឹក",   emoji: "🚿", en: "Bathing" },
  { l: "ច", word: "ចាប",      emoji: "🐦", en: "Bird" },
  { l: "ឆ", word: "ឆ្មា",     emoji: "🐈", en: "Cat" },
  { l: "ជ", word: "ជ្រូក",     emoji: "🐖", en: "Pig" },
  { l: "ឈ", word: "ឈើ",      emoji: "🪵", en: "Wood" },
  { l: "ញ", word: "ញ៉ាំ",     emoji: "🍜", en: "Eating" },
  { l: "ដ", word: "ដំរី",     emoji: "🐘", en: "Elephant" },
  { l: "ឋ", word: "ឋាន",      emoji: "🌈", en: "Realm" },
  { l: "ឌ", word: "ឌីណូស័រ",  emoji: "🦕", en: "Dinosaur" },
  { l: "ឍ", word: "ឍាន",      emoji: "👣", en: "Foot" },
  { l: "ណ", word: "ណា",       emoji: "🤔", en: "Which" },
  { l: "ត", word: "ត្រី",     emoji: "🐟", en: "Fish" },
  { l: "ថ", word: "ថ្ងៃ",     emoji: "☀️", en: "Sun" },
  { l: "ទ", word: "ទូក",      emoji: "🛶", en: "Boat" },
  { l: "ធ", word: "ធំ",       emoji: "🎈", en: "Big" },
  { l: "ន", word: "នាគ",      emoji: "🐉", en: "Dragon" },
  { l: "ប", word: "បង",       emoji: "👦", en: "Brother" },
  { l: "ផ", word: "ផ្លែ",     emoji: "🍎", en: "Fruit" },
  { l: "ព", word: "ពោត",      emoji: "🌽", en: "Corn" },
  { l: "ភ", word: "ភ្នំ",     emoji: "⛰️", en: "Mountain" },
  { l: "ម", word: "មាន់",     emoji: "🐓", en: "Chicken" },
  { l: "យ", word: "យន្តហោះ",  emoji: "✈️", en: "Airplane" },
  { l: "រ", word: "រង្វង់",   emoji: "⭕", en: "Circle" },
  { l: "ល", word: "ល្បែង",    emoji: "🎲", en: "Game" },
  { l: "វ", word: "វាល",      emoji: "🌾", en: "Field" },
  { l: "ស", word: "សៀវភៅ",    emoji: "📚", en: "Book" },
  { l: "ហ", word: "ហង្ស",     emoji: "🦢", en: "Swan" },
  { l: "ឡ", word: "ឡាន",      emoji: "🚗", en: "Car" },
  { l: "អ", word: "អាហារ",    emoji: "🍚", en: "Meal" }
];

/* ---- ស្វ័យភេត្រ (ជើងអក្សរ) ១៧ តួ ---- */
const VOWELS = [
  { v: "ា",  ex: "ផ្កា",   emoji: "🌸", en: "Flower" },
  { v: "ិ",  ex: "មិត្រ",   emoji: "👫", en: "Friend" },
  { v: "ី",  ex: "កីឡា",   emoji: "⚽", en: "Sport" },
  { v: "ឹ",  ex: "រឹង",     emoji: "💪", en: "Strong" },
  { v: "ឺ",  ex: "គឺ",      emoji: "💬", en: "Is" },
  { v: "ុ",  ex: "កុក",     emoji: "🦆", en: "Heron" },
  { v: "ូ",  ex: "ផ្លូវ",   emoji: "🛣️", en: "Road" },
  { v: "ួ",  ex: "ខ្លួន",   emoji: "🧍", en: "Body" },
  { v: "េ",  ex: "តែ",      emoji: "🍵", en: "Tea" },
  { v: "ែ",  ex: "កែវ",     emoji: "🥛", en: "Glass" },
  { v: "ៃ",  ex: "ដៃ",      emoji: "✋", en: "Hand" },
  { v: "ោ",  ex: "កោះ",     emoji: "🏝️", en: "Island" },
  { v: "ៅ",  ex: "ត្រៅ",    emoji: "📏", en: "Wide" },
  { v: "ំ",  ex: "ទំព័រ",   emoji: "📄", en: "Page" },
  { v: "ុំ", ex: "ផ្លុំ",    emoji: "🎺", en: "Blow" },
  { v: "ាំ", ex: "ដាំ",     emoji: "🌱", en: "Plant" },
  { v: "ះ",  ex: "ផ្ទះ",    emoji: "🏠", en: "House" }
];

/* ---- លេខខ្មែរ ១-១០ ---- */
const KH_NUMS = [
  { n: "១",  word: "មួយ",        num: 1 },
  { n: "២",  word: "ពីរ",        num: 2 },
  { n: "៣",  word: "បី",         num: 3 },
  { n: "៤",  word: "បួន",        num: 4 },
  { n: "៥",  word: "ប្រាំ",      num: 5 },
  { n: "៦",  word: "ប្រាំមួយ",   num: 6 },
  { n: "៧",  word: "ប្រាំពីរ",   num: 7 },
  { n: "៨",  word: "ប្រាំបី",    num: 8 },
  { n: "៩",  word: "ប្រាំបួន",   num: 9 },
  { n: "១០", word: "ដប់",        num: 10 }
];

/* ---- អក្សរអង់គ្លេស A-Z ---- */
const EN_LETTERS = [
  { l: "A", word: "Apple",     emoji: "🍎" },
  { l: "B", word: "Ball",      emoji: "⚽" },
  { l: "C", word: "Cat",       emoji: "🐈" },
  { l: "D", word: "Dog",       emoji: "🐕" },
  { l: "E", word: "Elephant",  emoji: "🐘" },
  { l: "F", word: "Fish",      emoji: "🐟" },
  { l: "G", word: "Grapes",    emoji: "🍇" },
  { l: "H", word: "Hat",       emoji: "👒" },
  { l: "I", word: "Ice cream", emoji: "🍦" },
  { l: "J", word: "Juice",     emoji: "🧃" },
  { l: "K", word: "Kite",      emoji: "🪁" },
  { l: "L", word: "Lion",      emoji: "🦁" },
  { l: "M", word: "Monkey",    emoji: "🐒" },
  { l: "N", word: "Nose",      emoji: "👃" },
  { l: "O", word: "Orange",    emoji: "🍊" },
  { l: "P", word: "Panda",     emoji: "🐼" },
  { l: "Q", word: "Queen",     emoji: "👑" },
  { l: "R", word: "Rabbit",    emoji: "🐇" },
  { l: "S", word: "Sun",       emoji: "☀️" },
  { l: "T", word: "Tiger",     emoji: "🐅" },
  { l: "U", word: "Umbrella",  emoji: "☂️" },
  { l: "V", word: "Van",       emoji: "🚐" },
  { l: "W", word: "Water",     emoji: "💧" },
  { l: "X", word: "Xylophone", emoji: "🎶" },
  { l: "Y", word: "Yo-yo",     emoji: "🪀" },
  { l: "Z", word: "Zebra",     emoji: "🦓" }
];

/* ---- លេខអង់គ្លេស ១-១០ ---- */
const EN_NUMS = [
  { n: "1",  word: "One",   num: 1 },
  { n: "2",  word: "Two",   num: 2 },
  { n: "3",  word: "Three", num: 3 },
  { n: "4",  word: "Four",  num: 4 },
  { n: "5",  word: "Five",  num: 5 },
  { n: "6",  word: "Six",   num: 6 },
  { n: "7",  word: "Seven", num: 7 },
  { n: "8",  word: "Eight", num: 8 },
  { n: "9",  word: "Nine",  num: 9 },
  { n: "10", word: "Ten",   num: 10 }
];

/* ---- ពណ៌អង់គ្លេស ---- */
const EN_COLORS = [
  { word: "Red",    km: "ក្រហម",   css: "#EF4444", emoji: "🍎" },
  { word: "Blue",   km: "ខៀវ",     css: "#3B82F6", emoji: "💧" },
  { word: "Green",  km: "បៃតង",    css: "#22C55E", emoji: "🥬" },
  { word: "Yellow", km: "លឿង",     css: "#FACC15", emoji: "🍌" },
  { word: "Purple", km: "ស្វាយ",    css: "#8B5CF6", emoji: "🍇" },
  { word: "Orange", km: "ទឹកក្រូច", css: "#F97316", emoji: "🍊" },
  { word: "Pink",   km: "ផ្កាឈូក",  css: "#F472B6", emoji: "🌸" },
  { word: "Black",  km: "ខ្មៅ",     css: "#1F2937", emoji: "🐈‍⬛" },
  { word: "White",  km: "ស",       css: "#F9FAFB", emoji: "☁️" }
];

/* ---- សត្វ (ANIMALS) ---- */
const ANIMALS = [
  { word: "ឆ្មា",   en: "Cat",      emoji: "🐈" },
  { word: "ឆ្កែ",   en: "Dog",      emoji: "🐕" },
  { word: "គោ",     en: "Cow",      emoji: "🐄" },
  { word: "ក្របី",  en: "Buffalo",  emoji: "🐃" },
  { word: "ជ្រូក",  en: "Pig",      emoji: "🐖" },
  { word: "មាន់",   en: "Chicken",  emoji: "🐓" },
  { word: "ទា",     en: "Duck",     emoji: "🦆" },
  { word: "ងារ",    en: "Frog",     emoji: "🐸" },
  { word: "ត្រី",   en: "Fish",     emoji: "🐟" },
  { word: "ដំរី",   en: "Elephant", emoji: "🐘" },
  { word: "ស្វា",   en: "Monkey",   emoji: "🐒" },
  { word: "ខ្លា",   en: "Tiger",    emoji: "🐅" },
  { word: "ទន្សាយ", en: "Rabbit",   emoji: "🐇" },
  { word: "សិង្ហ",  en: "Lion",     emoji: "🦁" }
];

/* ---- ផ្លែឈើ (FRUITS) ---- */
const FRUITS = [
  { word: "ស្វាយ",     en: "Mango",      emoji: "🥭" },
  { word: "ស្វាយច្រេស", en: "Banana",     emoji: "🍌" },
  { word: "ដូង",       en: "Coconut",    emoji: "🥥" },
  { word: "ក្រូចឆ្មា",  en: "Orange",     emoji: "🍊" },
  { word: "ម្នាស់",     en: "Pineapple",  emoji: "🍍" },
  { word: "ល្ហុងត្រាច", en: "Watermelon", emoji: "🍉" },
  { word: "ប៉ោម",      en: "Apple",      emoji: "🍎" },
  { word: "ត្របែក",    en: "Guava",      emoji: "🍐" },
  { word: "ល្ហុង",     en: "Papaya",     emoji: "🍈" },
  { word: "លំជូរ",     en: "Lime",       emoji: "🍋" }
];

/* ---- រូបរាង (SHAPES) ---- */
const SHAPES = [
  { word: "រង្វង់",       en: "Circle",    emoji: "⭕" },
  { word: "ការេ",         en: "Square",    emoji: "🟦" },
  { word: "ត្រីកោណ",       en: "Triangle",  emoji: "🔺" },
  { word: "ចតុកោណក្រៀម",   en: "Rectangle", emoji: "▭" },
  { word: "ផ្លេកបាន",     en: "Star",      emoji: "⭐" },
  { word: "បេះដូង",       en: "Heart",     emoji: "💗" }
];

/* ---- កាយវក្តី (BODY PARTS) ---- */
const BODY = [
  { word: "ក្បាល",  en: "Head",  emoji: "🙂" },
  { word: "ភ្នែក",  en: "Eye",   emoji: "👁️" },
  { word: "ត្រចៀក", en: "Ear",   emoji: "👂" },
  { word: "ច្រមុះ", en: "Nose",  emoji: "👃" },
  { word: "មាត់",   en: "Mouth", emoji: "👄" },
  { word: "ធ្មេញ",  en: "Tooth", emoji: "🦷" },
  { word: "ដៃ",    en: "Hand",  emoji: "✋" },
  { word: "ជើង",   en: "Foot",  emoji: "🦶" }
];

/* ---- ថ្ងៃទាំង ៧ + ពណ៌ប្រចាំថ្ងៃ (DAYS OF THE WEEK) ---- */
const DAYS = [
  { word: "ថ្ងៃអាទិត្យ",   en: "Sunday",    emoji: "🔴" },
  { word: "ថ្ងៃចន្ទ",      en: "Monday",    emoji: "🟡" },
  { word: "ថ្ងៃអង្គារ",    en: "Tuesday",   emoji: "🟣" },
  { word: "ថ្ងៃពុធ",      en: "Wednesday", emoji: "🟢" },
  { word: "ថ្ងៃព្រហស្បតិ៍", en: "Thursday",  emoji: "🟠" },
  { word: "ថ្ងៃសុក្រ",     en: "Friday",    emoji: "🔵" },
  { word: "ថ្ងៃសៅរ៍",     en: "Saturday",  emoji: "🟤" }
];

/* ---- ចំណុចផ្តាស់អតិបរមា ---- */
const MAX_STARS = 3;
const QUIZ_LEN = 10;
