// SPDX-License-Identifier: AGPL-3.0-or-later
// Offline, grounded answers for the station helper. Facility questions are
// answered from the shipped station data (never invented); how-to questions
// get fixed, reviewed text. Anything else returns null so the optional
// on-device model may try, or the chat explains what it can do.
import { catalogs } from "../i18n/index.mjs";
import { placeCodes, placeLabel } from "../i18n/places.mjs";

// Types a visitor looks for. Stairs are left out on purpose: listing stairs
// to someone who said "no stairs" would be harmful.
const FINDABLE = [
  "restroom",
  "elevator",
  "escalator",
  "nursing",
  "info",
  "ticket",
  "aed",
  "phone",
  "water",
  "locker",
  "accessible",
];

// Extra everyday words per type, in the seven languages. Avoid short words
// that appear inside station names (水 in 淡水, 물 in 물품보관함).
const ALIASES = {
  restroom: [
    "洗手間",
    "化妝室",
    "廁所",
    "toilet",
    "toilets",
    "bathroom",
    "washroom",
    "wc",
    "loo",
    "nhà vệ sinh",
    "kamar mandi",
    "kamar kecil",
    "ห้องน้ำ",
    "ส้วม",
    "화장실",
    "トイレ",
    "お手洗い",
    "化粧室",
  ],
  elevator: [
    "電梯",
    "升降梯",
    "elevator",
    "elevators",
    "lift",
    "thang máy",
    "ลิฟต์",
    "엘리베이터",
    "エレベーター",
  ],
  escalator: [
    "電扶梯",
    "手扶梯",
    "escalator",
    "thang cuốn",
    "eskalator",
    "บันไดเลื่อน",
    "에스컬레이터",
    "エスカレーター",
  ],
  nursing: [
    "哺乳",
    "集乳",
    "育嬰",
    "nursing",
    "breastfeed",
    "baby care",
    "cho con bú",
    "menyusui",
    "ให้นม",
    "수유",
    "授乳",
  ],
  info: [
    "詢問處",
    "服務台",
    "服務處",
    "information",
    "info desk",
    "help desk",
    "quầy thông tin",
    "informasi",
    "จุดบริการข้อมูล",
    "ประชาสัมพันธ์",
    "안내데스크",
    "案内所",
  ],
  ticket: [
    "售票",
    "買票",
    "車票",
    "ticket",
    "tickets",
    "mua vé",
    "quầy vé",
    "tiket",
    "ตั๋ว",
    "매표",
    "표를",
    "きっぷ",
    "切符",
    "チケット",
  ],
  aed: [
    "aed",
    "急救",
    "電擊",
    "defibrillator",
    "cấp cứu",
    "darurat",
    "ปฐมพยาบาล",
    "응급",
    "救命",
  ],
  phone: [
    "公用電話",
    "打電話",
    "phone",
    "telephone",
    "điện thoại",
    "telepon",
    "โทรศัพท์",
    "공중전화",
    "전화",
    "公衆電話",
  ],
  water: [
    "飲水",
    "喝水",
    "開水",
    "drinking water",
    "water",
    "nước uống",
    "uống nước",
    "air minum",
    "น้ำดื่ม",
    "음수대",
    "마실 물",
    "給水",
    "飲み水",
    "お水",
  ],
  locker: [
    "置物櫃",
    "寄物",
    "寄放行李",
    "locker",
    "lockers",
    "luggage",
    "tủ gửi đồ",
    "gửi đồ",
    "loker",
    "ล็อกเกอร์",
    "ฝากของ",
    "보관함",
    "ロッカー",
    "荷物",
  ],
  accessible: [
    "輪椅候車",
    "wheelchair area",
    "khu chờ cho xe lăn",
    "area tunggu kursi roda",
    "พื้นที่รอสำหรับรถเข็น",
    "휠체어 대기",
    "車いす待合",
  ],
};

const TOPICS = [
  [
    "lost",
    [
      "迷路",
      "走丟",
      "不知道在哪",
      "lost",
      "bị lạc",
      "lạc đường",
      "tersesat",
      "หลงทาง",
      "길을 잃",
      "길 잃",
      "迷った",
      "迷子",
    ],
  ],
  [
    "exit",
    [
      "出口",
      "exit",
      "exits",
      "lối ra",
      "cửa ra",
      "pintu keluar",
      "ทางออก",
      "출구",
    ],
  ],
  [
    "staff",
    [
      "站務",
      "工作人員",
      "服務人員",
      "幫忙",
      "求助",
      "staff",
      "help",
      "someone",
      "nhân viên",
      "giúp",
      "petugas",
      "bantuan",
      "tolong",
      "เจ้าหน้าที่",
      "ช่วย",
      "직원",
      "도와",
      "係員",
      "駅員",
      "助けて",
    ],
  ],
  [
    "stepFree",
    [
      "無障礙",
      "輪椅",
      "樓梯",
      "嬰兒車",
      "wheelchair",
      "step-free",
      "step free",
      "stairs",
      "stroller",
      "pram",
      "xe lăn",
      "cầu thang",
      "bậc thang",
      "xe đẩy",
      "kursi roda",
      "tangga",
      "รถเข็น",
      "บันได",
      "휠체어",
      "계단",
      "유모차",
      "車いす",
      "車椅子",
      "段差",
      "階段",
      "ベビーカー",
    ],
  ],
  [
    "scan",
    [
      "掃",
      "定位",
      "qr",
      "scan",
      "locate",
      "location",
      "where am i",
      "quét",
      "vị trí",
      "pindai",
      "dipindai",
      "memindai",
      "lokasi",
      "สแกน",
      "ตำแหน่ง",
      "스캔",
      "위치",
      "読み取",
      "現在地",
      "スキャン",
    ],
  ],
  [
    "language",
    [
      "語言",
      "英文",
      "language",
      "english",
      "ngôn ngữ",
      "bahasa",
      "ภาษา",
      "언어",
      "言語",
    ],
  ],
  [
    "display",
    [
      "字太小",
      "看不清",
      "放大",
      "大字",
      "深色",
      "對比",
      "長者",
      "兒童",
      "老人",
      "big text",
      "font",
      "larger",
      "contrast",
      "dark mode",
      "senior",
      "kids",
      "chữ to",
      "chữ nhỏ",
      "huruf",
      "ตัวอักษร",
      "ตัวใหญ่",
      "글자",
      "크게",
      "文字が小さい",
      "大きく",
      "見えにくい",
    ],
  ],
  [
    "privacy",
    [
      "隱私",
      "個資",
      "上傳",
      "離線",
      "網路",
      "privacy",
      "data",
      "online",
      "offline",
      "internet",
      "quyền riêng tư",
      "dữ liệu",
      "privasi",
      "ความเป็นส่วนตัว",
      "ข้อมูล",
      "개인정보",
      "데이터",
      "プライバシー",
      "個人情報",
      "データ",
    ],
  ],
];
const GREETINGS = [
  "你好",
  "您好",
  "哈囉",
  "嗨",
  "hello",
  "hi",
  "hey",
  "xin chào",
  "chào",
  "halo",
  "hai",
  "สวัสดี",
  "안녕",
  "こんにちは",
];
const THANKS = [
  "謝謝",
  "感謝",
  "thank",
  "thanks",
  "cảm ơn",
  "terima kasih",
  "ขอบคุณ",
  "감사",
  "고마워",
  "ありがとう",
];
const FLOORS = ["B1", "B2", "B3", "B4"];

const normalize = (text) =>
  String(text ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// ASCII words must match whole words ("hi" must not match "this").
function contains(text, word) {
  const needle = normalize(word);
  if (!needle) return false;
  if (/^[a-z0-9 -]+$/.test(needle))
    return new RegExp(`(^|[^a-z0-9])${needle}($|[^a-z0-9])`).test(text);
  return text.includes(needle);
}
const any = (text, words) => words.some((word) => contains(text, word));

function typeWords(type) {
  const names = Object.values(catalogs).map(
    (catalog) => catalog[`type.${type}`]
  );
  return [...names, ...(ALIASES[type] ?? [])].filter(Boolean);
}

export function detectType(question) {
  const text = normalize(question);
  // Longer, more specific names first (輪椅候車區 before 輪椅…).
  let best = null;
  for (const type of FINDABLE)
    for (const word of typeWords(type))
      if (contains(text, word) && (!best || word.length > best.length))
        best = { type, length: word.length };
  return best?.type ?? null;
}

export function detectTopic(question) {
  const text = normalize(question);
  return TOPICS.find(([, words]) => any(text, words))?.[0] ?? null;
}

function detectFloor(question) {
  const text = normalize(question);
  for (const floor of FLOORS) {
    if (
      new RegExp(`(^|[^a-z0-9])${floor.toLowerCase()}($|[^a-z0-9])`).test(text)
    )
      return floor;
    for (const catalog of Object.values(catalogs))
      if (contains(text, catalog[`floor.${floor}`])) return floor;
  }
  return null;
}

const MAX_PLACES = 5;

export function answerLocally(question, points, i18n, { nearFloor } = {}) {
  const { t } = i18n;
  const text = normalize(question);
  if (!text) return null;
  const type = detectType(text);
  if (type) {
    const floor = detectFloor(text);
    const ofType = points
      .filter((point) => [point.type].flat().includes(type))
      .sort(
        (a, b) =>
          // The visitor's own floor first, then the other floors in order.
          (b.floor === nearFloor) - (a.floor === nearFloor) ||
          FLOORS.indexOf(a.floor) - FLOORS.indexOf(b.floor) ||
          a.name.localeCompare(b.name, "zh-Hant")
      );
    const onFloor = ofType.filter((point) => !floor || point.floor === floor);
    // Nothing on the asked floor: offer the other floors instead of a dead end.
    const otherFloors = floor && !onFloor.length && ofType.length > 0;
    const matches = otherFloors ? ofType : onFloor;
    const typeName = t(`type.${type}`);
    return {
      kind: "places",
      type,
      floor,
      total: matches.length,
      text: otherFloors
        ? t("chat.answer.otherFloors", { type: typeName, floor })
        : matches.length
        ? t("chat.answer.places", { type: typeName, count: matches.length })
        : t("chat.answer.none", { type: typeName }),
      places: matches.slice(0, MAX_PLACES).map((point) => ({
        id: point.id,
        floor: point.floor,
        icon: [point.type].flat()[0],
        label: placeLabel(point, i18n),
      })),
    };
  }
  // Exit codes (M1–M8) are understood in every language. Exits themselves
  // are not mapped, but places toward them are.
  const exitCode = String(question)
    .normalize("NFKC")
    .match(/\bM\s?(\d{1,2})\b/i);
  if (exitCode) {
    const code = `M${exitCode[1]}`;
    const toward = points
      .filter((point) => placeCodes(point.name).includes(code))
      .sort((a, b) => FLOORS.indexOf(a.floor) - FLOORS.indexOf(b.floor));
    if (toward.length)
      return {
        kind: "places",
        type: "exit",
        floor: null,
        total: toward.length,
        text: t("chat.answer.exitCode", { code }),
        places: toward.slice(0, MAX_PLACES).map((point) => ({
          id: point.id,
          floor: point.floor,
          icon: [point.type].flat()[0],
          label: placeLabel(point, i18n),
        })),
      };
  }
  const topic = detectTopic(text);
  if (topic) return { kind: "faq", topic, text: t(`chat.answer.${topic}`) };
  if (any(text, THANKS))
    return { kind: "thanks", text: t("chat.answer.thanks") };
  if (text.length <= 24 && any(text, GREETINGS))
    return { kind: "greeting", text: t("chat.answer.greeting") };
  return null;
}
