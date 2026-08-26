import React, { useState, useMemo, useEffect, useRef } from "react";
import { Volume2, Check, X, RotateCcw, Wine, Languages, Flame, Plus, List, Trash2, Target, Pencil, BookOpen, Brain, Star, Music, Globe, Dumbbell, Home, Library, BarChart3, ChevronLeft, ChevronRight, Upload } from "lucide-react";

// ---------- Content ----------
const KOREAN_CARDS = [
  { id: "k1", ko: "읽어요", romanized: "il-geo-yo", meaning: "読みます", rule: "ㄺ + 母音 → ㄹが連音化 (逐字読みだと「イルゴヨ」に見えるが実際は「イルゴヨ」で正しい／リエゾンに注意)" },
  { id: "k2", ko: "좋아요", romanized: "jo-a-yo", meaning: "良いです", rule: "ㅎ + 母音 → ㅎが脱落して連音化「チョアヨ」" },
  { id: "k3", ko: "축하해요", romanized: "chu-ka-hae-yo", meaning: "おめでとうございます", rule: "ㄱ+ㅎ → 激音化してㅋに「チュカヘヨ」" },
  { id: "k4", ko: "옆집", romanized: "yeop-jjip", meaning: "隣の家", rule: "終声ㅍ→ㅂ音化 ＋ 次の子音が濃音化「ヨプチプ」" },
  { id: "k5", ko: "학교", romanized: "hak-kkyo", meaning: "学校", rule: "終声ㄱの後の平音が濃音化「ハッキョ」" },
  { id: "k6", ko: "괜찮아요", romanized: "gwaen-cha-na-yo", meaning: "大丈夫です", rule: "終声ㅎ+母音で連音化「クェンチャナヨ」" },
];

const WINE_CARDS = [
  { id: "w1", q: "ボルドー左岸の主要品種は?", a: "カベルネ・ソーヴィニヨンを主体としたブレンド", region: "フランス｜ボルドー", topic: "産地・格付け" },
  { id: "w2", q: "シャンパーニュの主要3品種は?", a: "シャルドネ、ピノ・ノワール、ピノ・ムニエ", region: "フランス｜シャンパーニュ", topic: "産地・品種" },
  { id: "w3", q: "リオハの格付け上位区分は?", a: "グラン・レゼルバ（最低熟成期間が最長）", region: "スペイン｜リオハ", topic: "法規・格付け" },
  { id: "w4", q: "ドイツワインの最上位甘辛表示区分は?", a: "プレディカーツヴァイン（QmP）の中でもトロッケンベーレンアウスレーゼが最高峰", region: "ドイツ", topic: "法規" },
  { id: "w5", q: "バローロに使われる品種は?", a: "ネッビオーロ100%", region: "イタリア｜ピエモンテ", topic: "産地・品種" },
];

const DECK_ICONS = {
  languages: Languages,
  wine: Wine,
  book: BookOpen,
  brain: Brain,
  star: Star,
  music: Music,
  globe: Globe,
  dumbbell: Dumbbell,
};

const ACCENT_PRESETS = [
  { accent: "#34588F", accentSoft: "#E3EAF3" },
  { accent: "#5B4B8A", accentSoft: "#ECE7F4" },
  { accent: "#B0662E", accentSoft: "#F5E9DD" },
  { accent: "#2E7A73", accentSoft: "#DFF0EE" },
  { accent: "#A14F76", accentSoft: "#F3E3EC" },
  { accent: "#4F5E66", accentSoft: "#E4E9EB" },
];

// playful "pop" palette — Home page redesign trial
const POP_FONT = "'Baloo 2', 'Nunito Sans', sans-serif";
const POP_CTA = "#FF4D8D";
const POP_SHADOW = "0 6px 18px rgba(26,28,27,0.10)";
const POP_COLORS = [
  { bg: "#FFF0B8", accent: "#E8A100" }, // yellow
  { bg: "#FFD6E8", accent: "#FF4D8D" }, // pink
  { bg: "#E3D7FF", accent: "#8352E0" }, // purple
  { bg: "#C9F5DE", accent: "#12A05F" }, // mint
];

const BUILTIN_DECKS = [
  { key: "korean", label: "韓国語", accent: "#3A5A54", accentSoft: "#E4EBE8", iconKey: "languages", schema: "korean", builtin: true },
  { key: "wine", label: "ワイン試験", accent: "#6B1F2E", accentSoft: "#F0E3E5", iconKey: "wine", schema: "wine", builtin: true },
];

const DECK_STORAGE_KEY = "study-srs.deck.v1";
const DECKS_STORAGE_KEY = "study-srs.decks.v1";
const DOMAIN_STORAGE_KEY = "study-srs.domain.v1";
const STATS_STORAGE_KEY = "study-srs.stats.v1";
const EXAM_DATES_STORAGE_KEY = "study-srs.examDates.v1";
const MATERIALS_STORAGE_KEY = "study-srs.materials.v1";
const POINTS_STORAGE_KEY = "study-srs.points.v1";
const COMPLETED_MATERIALS_STORAGE_KEY = "study-srs.completedMaterials.v1";
const BACKUP_STORAGE_KEY = "study-srs.backupMeta.v1";
const SYNC_CODE_STORAGE_KEY = "study-srs.syncCode.v1";
const SYNC_API_BASE = "https://study-app.senashinjo22.workers.dev/api/sync";

const ALL_STORAGE_KEYS = [
  DECK_STORAGE_KEY,
  DECKS_STORAGE_KEY,
  DOMAIN_STORAGE_KEY,
  STATS_STORAGE_KEY,
  EXAM_DATES_STORAGE_KEY,
  MATERIALS_STORAGE_KEY,
  POINTS_STORAGE_KEY,
  COMPLETED_MATERIALS_STORAGE_KEY,
  BACKUP_STORAGE_KEY,
];

// days until next review after each successful box level (box 1〜5)
const INTERVALS_DAYS = [1, 3, 7, 16, 30];
// box level considered "定着" (mastered)
const MASTERY_BOX = 3;
// how many cards a pop-quiz test pulls at most
const TEST_SAMPLE_SIZE = 15;

function generateSyncCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, to avoid mixups when typing it in
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysStr(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function daysUntil(dateStr) {
  const today = todayStr();
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = dateStr.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

function loadExamDates() {
  try {
    const raw = localStorage.getItem(EXAM_DATES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadMaterials() {
  try {
    const raw = localStorage.getItem(MATERIALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadDecks() {
  try {
    const raw = localStorage.getItem(DECKS_STORAGE_KEY);
    if (!raw) return BUILTIN_DECKS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return BUILTIN_DECKS;
    return parsed;
  } catch {
    return BUILTIN_DECKS;
  }
}

function loadCompletedMaterials() {
  try {
    const raw = localStorage.getItem(COMPLETED_MATERIALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadPoints() {
  try {
    const raw = localStorage.getItem(POINTS_STORAGE_KEY);
    if (!raw) return { total: 0, lastOpenBonusDate: null };
    const parsed = JSON.parse(raw);
    return {
      total: Number.isFinite(parsed.total) ? parsed.total : 0,
      lastOpenBonusDate: parsed.lastOpenBonusDate || null,
    };
  } catch {
    return { total: 0, lastOpenBonusDate: null };
  }
}

function loadBackupMeta() {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return { lastExportedAt: null };
    const parsed = JSON.parse(raw);
    return { lastExportedAt: parsed.lastExportedAt || null };
  } catch {
    return { lastExportedAt: null };
  }
}

function dueLabel(dueAt) {
  const today = todayStr();
  if (!dueAt || dueAt <= today) return "今日";
  const [, m, d] = dueAt.split("-").map(Number);
  return `${m}/${d}`;
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

// timestamp used for cards that predate the "registered at" feature, so real new cards always sort above them
const LEGACY_CREATED_AT = "2000-01-01T00:00:00.000Z";

function findDuplicateCard(deck, domain, field, value, excludeId) {
  const target = value.trim();
  return Object.values(deck).find(
    (c) => c.domain === domain && c.id !== excludeId && (c[field] || "").trim() === target
  );
}

// Minimal CSV parser: handles quoted fields (with embedded commas/newlines) and "" escapes.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      // ignore, \n (or end of input) handles the row break
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const CSV_SCHEMA_COLUMNS = {
  korean: [
    { key: "ko", header: "韓国語", required: true },
    { key: "meaning", header: "意味", required: true },
    { key: "romanized", header: "ローマ字", required: false },
    { key: "rule", header: "発音ルール", required: false },
    { key: "source", header: "出典", required: false },
  ],
  wine: [
    { key: "q", header: "質問", required: true },
    { key: "a", header: "解答", required: true },
    { key: "region", header: "産地", required: false },
    { key: "topic", header: "トピック", required: false },
    { key: "hypothesis", header: "仮説", required: false },
    { key: "source", header: "出典", required: false },
  ],
  generic: [
    { key: "front", header: "表面", required: true },
    { key: "back", header: "裏面", required: true },
    { key: "source", header: "出典", required: false },
  ],
};

const CSV_PRIMARY_FIELD = { korean: "ko", wine: "q", generic: "front" };

// box: 0 = new/due now, 1〜5 = how many successful reviews in a row. dueAt: "YYYY-MM-DD", the next date this card should resurface.
function initDeck() {
  const cards = {};
  const today = todayStr();
  [...KOREAN_CARDS.map((c) => ({ ...c, domain: "korean" })), ...WINE_CARDS.map((c) => ({ ...c, domain: "wine" }))].forEach(
    (c) => (cards[c.id] = { ...c, box: 0, interval: 0, dueAt: today, seen: 0, correct: 0, createdAt: LEGACY_CREATED_AT })
  );
  return cards;
}

function loadDeck() {
  try {
    const raw = localStorage.getItem(DECK_STORAGE_KEY);
    if (!raw) return initDeck();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return initDeck();
    const today = todayStr();
    // migrate cards saved before due-date scheduling / created-at tracking existed
    Object.values(parsed).forEach((c) => {
      if (!c.dueAt) {
        c.interval = 0;
        c.dueAt = today;
      }
      if (!c.createdAt) {
        c.createdAt = LEGACY_CREATED_AT;
      }
    });
    return parsed;
  } catch {
    return initDeck();
  }
}

function loadDomain(decks) {
  const saved = localStorage.getItem(DOMAIN_STORAGE_KEY);
  if (saved && decks.some((dk) => dk.key === saved)) return saved;
  return decks[0] ? decks[0].key : "korean";
}

function newCardId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `gen-${crypto.randomUUID()}`;
  return `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function newDeckKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `deck-${crypto.randomUUID()}`;
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSessionQueue(deck, domain) {
  const today = todayStr();
  return Object.values(deck)
    .filter((c) => c.domain === domain && (c.dueAt || today) <= today)
    .sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || "") || a.box - b.box)
    .map((c) => c.id);
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { studyDates: [], masteredEvents: [], testHistory: [], studyDomains: [] };
    const parsed = JSON.parse(raw);
    return {
      studyDates: Array.isArray(parsed.studyDates) ? parsed.studyDates : [],
      masteredEvents: Array.isArray(parsed.masteredEvents) ? parsed.masteredEvents : [],
      testHistory: Array.isArray(parsed.testHistory) ? parsed.testHistory : [],
      studyDomains: Array.isArray(parsed.studyDomains) ? parsed.studyDomains : [],
    };
  } catch {
    return { studyDates: [], masteredEvents: [], testHistory: [], studyDomains: [] };
  }
}

// current streak of consecutive study days, anchored at today (or yesterday, so it doesn't drop to 0 before today's review)
function computeStreak(studyDates) {
  const set = new Set(studyDates);
  const today = todayStr();
  let cursor = set.has(today) ? today : addDaysStr(today, -1);
  if (!set.has(cursor)) return 0;
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDaysStr(cursor, -1);
  }
  return streak;
}

const CALENDAR_WEEKS = 12;

function buildCalendarDays(studyDates) {
  const set = new Set(studyDates);
  const today = new Date();
  const days = [];
  const totalDays = CALENDAR_WEEKS * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: key, studied: set.has(key) });
  }
  return days;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EMPTY_KOREAN_FORM = { ko: "", romanized: "", meaning: "", rule: "", source: "", frontImage: "", backImage: "" };
const EMPTY_WINE_FORM = { q: "", a: "", region: "", topic: "", hypothesis: "", source: "", frontImage: "", backImage: "" };
const EMPTY_GENERIC_FORM = { front: "", back: "", source: "", frontImage: "", backImage: "" };

const CARD_IMAGE_MAX_DIMENSION = 640;
const CARD_IMAGE_QUALITY = 0.72;

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("画像を読み込めなかったよ"));
      img.onload = () => {
        const scale = Math.min(1, CARD_IMAGE_MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", CARD_IMAGE_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function ImagePickerField({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#747872", marginBottom: 4 }}>{label}</div>
      {value ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={value} alt="" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, display: "block", objectFit: "cover" }} />
          <button
            onClick={() => onChange("")}
            aria-label="画像を削除"
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "none",
              background: "#B0483A",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              lineHeight: "22px",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const dataUrl = await compressImageFile(file);
              onChange(dataUrl);
            } catch {
              window.alert("画像の読み込みに失敗したよ。もう一度試してみて。");
            }
            e.target.value = "";
          }}
          style={{ fontSize: 12 }}
        />
      )}
    </div>
  );
}

const KOREAN_SOURCE_OPTIONS = ["1行日記", "できる韓国語", "音楽", "ドラマ"];
const WINE_SOURCE_OPTIONS = ["1冊目の教科書"];

export default function StudyApp() {
  const [decks, setDecks] = useState(loadDecks);
  const [deck, setDeck] = useState(loadDeck);
  const [domain, setDomain] = useState(() => loadDomain(loadDecks()));
  const [flipped, setFlipped] = useState(false);
  const [queueIdx, setQueueIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionQueue, setSessionQueue] = useState(() => buildSessionQueue(loadDeck(), loadDomain(loadDecks())));

  const [showInput, setShowInput] = useState(false);
  const [showList, setShowList] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null);
  const csvFileInputRef = useRef(null);
  const [koreanForm, setKoreanForm] = useState(EMPTY_KOREAN_FORM);
  const [wineForm, setWineForm] = useState(EMPTY_WINE_FORM);
  const [genericForm, setGenericForm] = useState(EMPTY_GENERIC_FORM);
  const [formError, setFormError] = useState("");
  const [editingCardId, setEditingCardId] = useState(null);
  const [showDeckForm, setShowDeckForm] = useState(false);
  const [deckForm, setDeckForm] = useState({ name: "", iconKey: "book", colorIdx: 0 });
  const [points, setPoints] = useState(loadPoints);
  const [backupMeta, setBackupMeta] = useState(loadBackupMeta);
  const [syncCode, setSyncCode] = useState(() => localStorage.getItem(SYNC_CODE_STORAGE_KEY) || "");
  const [syncCodeInput, setSyncCodeInput] = useState(() => localStorage.getItem(SYNC_CODE_STORAGE_KEY) || "");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const [stats, setStats] = useState(loadStats);
  const [testMode, setTestMode] = useState(false);
  const [testQueue, setTestQueue] = useState([]);
  const [testIdx, setTestIdx] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testDone, setTestDone] = useState(false);

  const [examDates, setExamDates] = useState(loadExamDates);
  const [editingExamDate, setEditingExamDate] = useState(false);
  const [examDateInput, setExamDateInput] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [reportRange, setReportRange] = useState("week");

  const [page, setPage] = useState("home");
  const [materials, setMaterials] = useState(loadMaterials);
  const [editingMaterial, setEditingMaterial] = useState(false);
  const [materialForm, setMaterialForm] = useState({ name: "", totalUnits: "", currentUnit: "", daysPerUnit: "" });
  const [completedMaterials, setCompletedMaterials] = useState(loadCompletedMaterials);

  useEffect(() => {
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck));
  }, [deck]);

  useEffect(() => {
    localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
  }, [domain]);

  useEffect(() => {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(EXAM_DATES_STORAGE_KEY, JSON.stringify(examDates));
  }, [examDates]);

  useEffect(() => {
    localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
  }, [decks]);

  useEffect(() => {
    localStorage.setItem(COMPLETED_MATERIALS_STORAGE_KEY, JSON.stringify(completedMaterials));
  }, [completedMaterials]);

  useEffect(() => {
    localStorage.setItem(POINTS_STORAGE_KEY, JSON.stringify(points));
  }, [points]);

  useEffect(() => {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backupMeta));
  }, [backupMeta]);

  useEffect(() => {
    const today = todayStr();
    setPoints((prev) => (prev.lastOpenBonusDate === today ? prev : { ...prev, total: prev.total + 1, lastOpenBonusDate: today }));
  }, []);

  const addCard = (card) => {
    const id = newCardId();
    const today = todayStr();
    setDeck((prev) => ({
      ...prev,
      [id]: { ...card, id, domain, box: 0, interval: 0, dueAt: today, seen: 0, correct: 0, createdAt: new Date().toISOString() },
    }));
    setSessionQueue((q) => [...q, id]);
    setQueueIdx(0);
    setSessionDone(false);
    setPoints((p) => ({ ...p, total: p.total + 2 }));
  };

  const handleAddCard = () => {
    const schema = d.schema;
    if (schema === "korean") {
      const { ko, romanized, meaning, rule, source, frontImage, backImage } = koreanForm;
      if (!ko.trim() || !meaning.trim()) {
        setFormError("韓国語と意味は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, domain, "ko", ko)) {
        setFormError("その韓国語はもう登録されてるよ。");
        return;
      }
      addCard({
        ko: ko.trim(),
        romanized: romanized.trim(),
        meaning: meaning.trim(),
        rule: rule.trim() || "特になし",
        source: source.trim(),
        frontImage,
        backImage,
      });
      setKoreanForm(EMPTY_KOREAN_FORM);
    } else if (schema === "wine") {
      const { q, a, region, topic, hypothesis, source, frontImage, backImage } = wineForm;
      if (!q.trim() || !a.trim()) {
        setFormError("質問と解答は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, domain, "q", q)) {
        setFormError("同じ質問がもう登録されてるよ。");
        return;
      }
      addCard({
        q: q.trim(),
        a: a.trim(),
        region: region.trim() || "-",
        topic: topic.trim() || "その他",
        hypothesis: hypothesis.trim(),
        source: source.trim(),
        frontImage,
        backImage,
      });
      setWineForm(EMPTY_WINE_FORM);
    } else {
      const { front, back, source, frontImage, backImage } = genericForm;
      if (!front.trim() || !back.trim()) {
        setFormError("表と裏は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, domain, "front", front)) {
        setFormError("同じ内容がもう登録されてるよ。");
        return;
      }
      addCard({ front: front.trim(), back: back.trim(), source: source.trim(), frontImage, backImage });
      setGenericForm(EMPTY_GENERIC_FORM);
    }
    setFormError("");
    setShowInput(false);
  };

  const handleCsvFile = async (file) => {
    const schema = d.schema;
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      setCsvPreview({ error: "CSVが空だったよ。" });
      return;
    }
    const columns = CSV_SCHEMA_COLUMNS[schema];
    const header = rows[0].map((h) => h.trim());
    const colIndex = {};
    columns.forEach((col) => {
      colIndex[col.key] = header.findIndex((h) => h === col.header);
    });
    const missingRequired = columns.filter((c) => c.required && colIndex[c.key] === -1);
    if (missingRequired.length > 0) {
      setCsvPreview({
        error: `1行目（見出し）に必須の列が見つからないよ: ${missingRequired.map((c) => c.header).join("、")}`,
      });
      return;
    }
    const primaryKey = CSV_PRIMARY_FIELD[schema];
    const seenInBatch = new Set();
    const parsedRows = rows.slice(1).map((r) => {
      const values = {};
      columns.forEach((col) => {
        values[col.key] = colIndex[col.key] === -1 ? "" : (r[colIndex[col.key]] || "").trim();
      });
      const missing = columns.filter((c) => c.required && !values[c.key]);
      let status = "ok";
      let note = "";
      if (missing.length > 0) {
        status = "invalid";
        note = `${missing.map((c) => c.header).join("・")}が空`;
      } else if (findDuplicateCard(deck, domain, primaryKey, values[primaryKey])) {
        status = "dup";
        note = "登録済み";
      } else if (seenInBatch.has(values[primaryKey])) {
        status = "dup";
        note = "CSV内で重複";
      } else {
        seenInBatch.add(values[primaryKey]);
      }
      return { values, status, note };
    });
    setCsvPreview({ schema, rows: parsedRows });
  };

  const confirmCsvImport = () => {
    if (!csvPreview || csvPreview.error) return;
    const okRows = csvPreview.rows.filter((r) => r.status === "ok");
    if (okRows.length > 0) {
      const today = todayStr();
      const newEntries = {};
      const newIds = [];
      okRows.forEach((r) => {
        const id = newCardId();
        const v = r.values;
        let card;
        if (csvPreview.schema === "korean") {
          card = { ko: v.ko, romanized: v.romanized, meaning: v.meaning, rule: v.rule || "特になし", source: v.source };
        } else if (csvPreview.schema === "wine") {
          card = { q: v.q, a: v.a, region: v.region || "-", topic: v.topic || "その他", hypothesis: v.hypothesis, source: v.source };
        } else {
          card = { front: v.front, back: v.back, source: v.source };
        }
        newEntries[id] = {
          ...card,
          frontImage: "",
          backImage: "",
          id,
          domain,
          box: 0,
          interval: 0,
          dueAt: today,
          seen: 0,
          correct: 0,
          createdAt: new Date().toISOString(),
        };
        newIds.push(id);
      });
      setDeck((prev) => ({ ...prev, ...newEntries }));
      setSessionQueue((q) => [...q, ...newIds]);
      setQueueIdx(0);
      setSessionDone(false);
      setPoints((p) => ({ ...p, total: p.total + newIds.length * 2 }));
    }
    setCsvPreview(null);
  };

  const openEditCard = (card) => {
    const cardDeck = decks.find((x) => x.key === card.domain);
    const schema = cardDeck ? cardDeck.schema : "generic";
    if (schema === "korean") {
      setKoreanForm({
        ko: card.ko || "",
        romanized: card.romanized || "",
        meaning: card.meaning || "",
        rule: card.rule === "特になし" ? "" : card.rule || "",
        source: card.source || "",
        frontImage: card.frontImage || "",
        backImage: card.backImage || "",
      });
    } else if (schema === "wine") {
      setWineForm({
        q: card.q || "",
        a: card.a || "",
        region: card.region === "-" ? "" : card.region || "",
        topic: card.topic === "その他" ? "" : card.topic || "",
        hypothesis: card.hypothesis || "",
        source: card.source || "",
        frontImage: card.frontImage || "",
        backImage: card.backImage || "",
      });
    } else {
      setGenericForm({
        front: card.front || "",
        back: card.back || "",
        source: card.source || "",
        frontImage: card.frontImage || "",
        backImage: card.backImage || "",
      });
    }
    setEditingCardId(card.id);
    setFormError("");
    setShowList(false);
    setShowInput(true);
  };

  const handleEditCard = () => {
    const schema = d.schema;
    if (schema === "korean") {
      const { ko, romanized, meaning, rule, source, frontImage, backImage } = koreanForm;
      if (!ko.trim() || !meaning.trim()) {
        setFormError("韓国語と意味は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, domain, "ko", ko, editingCardId)) {
        setFormError("その韓国語はもう登録されてるよ。");
        return;
      }
      setDeck((prev) => ({
        ...prev,
        [editingCardId]: {
          ...prev[editingCardId],
          ko: ko.trim(),
          romanized: romanized.trim(),
          meaning: meaning.trim(),
          rule: rule.trim() || "特になし",
          source: source.trim(),
          frontImage,
          backImage,
        },
      }));
      setKoreanForm(EMPTY_KOREAN_FORM);
    } else if (schema === "wine") {
      const { q, a, region, topic, hypothesis, source, frontImage, backImage } = wineForm;
      if (!q.trim() || !a.trim()) {
        setFormError("質問と解答は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, domain, "q", q, editingCardId)) {
        setFormError("同じ質問がもう登録されてるよ。");
        return;
      }
      setDeck((prev) => ({
        ...prev,
        [editingCardId]: {
          ...prev[editingCardId],
          q: q.trim(),
          a: a.trim(),
          region: region.trim() || "-",
          topic: topic.trim() || "その他",
          hypothesis: hypothesis.trim(),
          source: source.trim(),
          frontImage,
          backImage,
        },
      }));
      setWineForm(EMPTY_WINE_FORM);
    } else {
      const { front, back, source, frontImage, backImage } = genericForm;
      if (!front.trim() || !back.trim()) {
        setFormError("表と裏は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, domain, "front", front, editingCardId)) {
        setFormError("同じ内容がもう登録されてるよ。");
        return;
      }
      setDeck((prev) => ({
        ...prev,
        [editingCardId]: { ...prev[editingCardId], front: front.trim(), back: back.trim(), source: source.trim(), frontImage, backImage },
      }));
      setGenericForm(EMPTY_GENERIC_FORM);
    }
    setFormError("");
    setEditingCardId(null);
    setShowInput(false);
    setShowList(true);
  };

  const cancelForm = () => {
    setShowInput(false);
    setKoreanForm(EMPTY_KOREAN_FORM);
    setWineForm(EMPTY_WINE_FORM);
    setGenericForm(EMPTY_GENERIC_FORM);
    setFormError("");
    if (editingCardId) setShowList(true);
    setEditingCardId(null);
  };

  const handleDeleteCard = (id) => {
    if (!window.confirm("このカードを削除する？元に戻せないよ。")) return;
    setDeck((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSessionQueue((q) => q.filter((qid) => qid !== id));
    if (editingCardId === id) {
      setEditingCardId(null);
      setShowInput(false);
    }
    setQueueIdx(0);
    setFlipped(false);
    setSessionDone(false);
  };

  const domainCards = useMemo(
    () =>
      Object.values(deck)
        .filter((c) => c.domain === domain)
        .sort((a, b) => (a.dueAt || "").localeCompare(b.dueAt || "") || a.box - b.box),
    [deck, domain]
  );

  // list view: newest registered first
  const listCards = useMemo(
    () => [...domainCards].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [domainCards]
  );

  const current = testMode ? deck[testQueue[testIdx]] : deck[sessionQueue[queueIdx]];
  const d = decks.find((x) => x.key === domain) || decks[0];
  const schema = d.schema;
  const DIcon = DECK_ICONS[d.iconKey] || BookOpen;
  const openDeckReview = (key) => {
    switchDomain(key);
    setPage("review");
  };
  const goToTodayGoal = () => {
    if (buildSessionQueue(deck, domain).length > 0) {
      openDeckReview(domain);
      return;
    }
    const nextDeck = decks.find((dk) => buildSessionQueue(deck, dk.key).length > 0);
    if (nextDeck) openDeckReview(nextDeck.key);
  };
  const deckTotalCards = (key) => Object.values(deck).filter((c) => c.domain === key).length;
  const deckMasteredCards = (key) => Object.values(deck).filter((c) => c.domain === key && c.box >= MASTERY_BOX).length;

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const handleAnswer = (correct) => {
    const cardId = current.id;
    const today = todayStr();

    if (testMode) {
      const newScore = testScore + (correct ? 1 : 0);
      setTestScore(newScore);
      setFlipped(false);
      if (testIdx + 1 >= testQueue.length) {
        setStats((prev) => ({
          ...prev,
          testHistory: [...prev.testHistory, { date: today, domain, correct: newScore, total: testQueue.length }],
        }));
        setPoints((p) => ({ ...p, total: p.total + 5 }));
        setTestDone(true);
      } else {
        setTestIdx((i) => i + 1);
      }
      return;
    }

    const prevBox = deck[cardId].box;
    let box, interval, dueAt;
    if (correct) {
      box = Math.min(prevBox + 1, INTERVALS_DAYS.length);
      interval = INTERVALS_DAYS[box - 1];
      dueAt = addDaysStr(today, interval);
    } else {
      box = 0;
      interval = 0;
      dueAt = today;
    }
    setDeck((prev) => {
      const c = prev[cardId];
      return { ...prev, [cardId]: { ...c, box, interval, dueAt, seen: c.seen + 1, correct: c.correct + (correct ? 1 : 0) } };
    });
    setStats((prev) => {
      const studyDates = prev.studyDates.includes(today) ? prev.studyDates : [...prev.studyDates, today];
      const justMastered = correct && box >= MASTERY_BOX && prevBox < MASTERY_BOX;
      const masteredEvents = justMastered ? [...prev.masteredEvents, { date: today, domain, cardId }] : prev.masteredEvents;
      const hasDomainToday = prev.studyDomains.some((e) => e.date === today && e.domain === domain);
      const studyDomains = hasDomainToday ? prev.studyDomains : [...prev.studyDomains, { date: today, domain }];
      return { ...prev, studyDates, masteredEvents, studyDomains };
    });
    setFlipped(false);
    if (queueIdx + 1 >= sessionQueue.length) {
      setSessionDone(true);
    } else {
      setQueueIdx((i) => i + 1);
    }
  };

  const switchDomain = (key) => {
    setDomain(key);
    setSessionQueue(buildSessionQueue(deck, key));
    setQueueIdx(0);
    setFlipped(false);
    setSessionDone(false);
    setShowInput(false);
    setShowList(false);
    setFormError("");
    setTestMode(false);
    setTestDone(false);
    setEditingExamDate(false);
    setEditingCardId(null);
    setKoreanForm(EMPTY_KOREAN_FORM);
    setWineForm(EMPTY_WINE_FORM);
    setGenericForm(EMPTY_GENERIC_FORM);
    setEditingMaterial(false);
    setShowDeckForm(false);
  };

  const openDeckForm = () => {
    setDeckForm({ name: "", iconKey: "book", colorIdx: 0 });
    setShowDeckForm(true);
  };

  const saveNewDeck = () => {
    const name = deckForm.name.trim();
    if (!name) return;
    const key = newDeckKey();
    const color = ACCENT_PRESETS[deckForm.colorIdx] || ACCENT_PRESETS[0];
    const newDeck = {
      key,
      label: name,
      accent: color.accent,
      accentSoft: color.accentSoft,
      iconKey: deckForm.iconKey,
      schema: "generic",
      builtin: false,
    };
    setDecks((prev) => [...prev, newDeck]);
    setShowDeckForm(false);
    switchDomain(key);
  };

  const deleteDeck = (key) => {
    const target = decks.find((x) => x.key === key);
    if (!target || target.builtin) return;
    if (!window.confirm(`「${target.label}」デッキを削除する？中のカードも全部消えるよ。元に戻せないよ。`)) return;
    const remaining = decks.filter((x) => x.key !== key);
    setDeck((prev) => {
      const next = {};
      Object.entries(prev).forEach(([id, c]) => {
        if (c.domain !== key) next[id] = c;
      });
      return next;
    });
    setExamDates((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setMaterials((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDecks(remaining);
    if (domain === key) {
      switchDomain(remaining[0] ? remaining[0].key : "korean");
    }
  };

  const restart = () => {
    setSessionQueue(buildSessionQueue(deck, domain));
    setQueueIdx(0);
    setFlipped(false);
    setSessionDone(false);
  };

  const forceReviewAll = () => {
    setSessionQueue(domainCards.map((c) => c.id));
    setQueueIdx(0);
    setFlipped(false);
    setSessionDone(false);
  };

  const startTest = () => {
    const ids = shuffle(domainCards.map((c) => c.id)).slice(0, TEST_SAMPLE_SIZE);
    setTestQueue(ids);
    setTestIdx(0);
    setTestScore(0);
    setTestDone(false);
    setTestMode(true);
    setFlipped(false);
    setShowInput(false);
    setShowList(false);
  };

  const cancelTest = () => {
    setTestMode(false);
    setTestDone(false);
    setFlipped(false);
  };

  const openExamDateEditor = () => {
    setExamDateInput(examDates[domain] || "");
    setEditingExamDate(true);
  };

  const saveExamDate = () => {
    if (!examDateInput) return;
    setExamDates((prev) => ({ ...prev, [domain]: examDateInput }));
    setEditingExamDate(false);
  };

  const clearExamDate = () => {
    setExamDates((prev) => ({ ...prev, [domain]: null }));
    setEditingExamDate(false);
  };

  const openMaterialEditor = () => {
    const m = materials[domain];
    setMaterialForm(
      m
        ? { name: m.name, totalUnits: String(m.totalUnits), currentUnit: String(m.currentUnit), daysPerUnit: String(m.daysPerUnit) }
        : { name: "", totalUnits: "", currentUnit: "", daysPerUnit: "" }
    );
    setEditingMaterial(true);
  };

  const saveMaterial = () => {
    const totalUnits = Number(materialForm.totalUnits);
    const currentUnit = Number(materialForm.currentUnit);
    const daysPerUnit = Number(materialForm.daysPerUnit);
    if (!materialForm.name.trim() || !(totalUnits > 0) || !(daysPerUnit > 0) || Number.isNaN(currentUnit) || currentUnit < 0) {
      return;
    }
    setMaterials((prev) => ({
      ...prev,
      [domain]: { name: materialForm.name.trim(), totalUnits, currentUnit, daysPerUnit },
    }));
    setEditingMaterial(false);
  };

  const clearMaterial = () => {
    setMaterials((prev) => ({ ...prev, [domain]: null }));
    setEditingMaterial(false);
  };

  const markMaterialComplete = () => {
    const m = materials[domain];
    if (!m) return;
    setCompletedMaterials((prev) => [
      ...prev,
      { id: newCardId(), deckKey: domain, deckLabel: d.label, name: m.name, totalUnits: m.totalUnits, completedAt: todayStr() },
    ]);
    setMaterials((prev) => ({ ...prev, [domain]: null }));
  };

  const deleteCompletedMaterial = (id) => {
    setCompletedMaterials((prev) => prev.filter((x) => x.id !== id));
  };

  const bumpMaterialProgress = (delta) => {
    setMaterials((prev) => {
      const m = prev[domain];
      if (!m) return prev;
      const nextUnit = Math.max(0, Math.min(m.totalUnits, m.currentUnit + delta));
      return { ...prev, [domain]: { ...m, currentUnit: nextUnit } };
    });
  };

  const totalMastered = Object.values(deck).filter((c) => c.domain === domain && c.box >= MASTERY_BOX).length;
  const totalCards = domainCards.length;
  const sessionTotal = sessionQueue.length;
  const nextDueDate = domainCards
    .map((c) => c.dueAt)
    .filter(Boolean)
    .sort()[0];

  const streak = computeStreak(stats.studyDates);
  const daysSinceLastBackup = backupMeta.lastExportedAt ? Math.abs(daysUntil(backupMeta.lastExportedAt)) : null;
  const backupDue = daysSinceLastBackup === null || daysSinceLastBackup >= 7;
  const calendarDays = useMemo(() => buildCalendarDays(stats.studyDates), [stats.studyDates]);
  const calendarMonthCells = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstWeekday = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const studySet = new Set(stats.studyDates);
    const domainsByDate = {};
    stats.studyDomains.forEach((e) => {
      if (!domainsByDate[e.date]) domainsByDate[e.date] = new Set();
      domainsByDate[e.date].add(e.domain);
    });
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= totalDays; day++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const domainsHere = domainsByDate[key] ? Array.from(domainsByDate[key]) : [];
      let color = null;
      if (domainsHere.length >= 2) {
        color = "#E8A93C";
      } else if (domainsHere.length === 1) {
        const dk = decks.find((x) => x.key === domainsHere[0]);
        color = dk ? dk.accent : "#4e604f";
      } else if (studySet.has(key)) {
        color = "#4e604f";
      }
      cells.push({ day, date: key, studied: studySet.has(key), color });
    }
    return cells;
  }, [calendarMonth, stats.studyDates, stats.studyDomains, decks]);
  const longestStreak = useMemo(() => {
    const sorted = [...stats.studyDates].sort();
    let longest = 0;
    let current = 0;
    let prev = null;
    for (const dt of sorted) {
      current = prev && addDaysStr(prev, 1) === dt ? current + 1 : 1;
      longest = Math.max(longest, current);
      prev = dt;
    }
    return longest;
  }, [stats.studyDates]);
  const changeCalendarMonth = (delta) => {
    setCalendarMonth((prev) => {
      let month = prev.month + delta;
      let year = prev.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      return { year, month };
    });
  };
  const lastTestAll = [...stats.testHistory].reverse()[0];
  const totalCardsAll = Object.keys(deck).length;
  const totalMasteredAll = Object.values(deck).filter((c) => c.box >= MASTERY_BOX).length;

  const reportRangeStart = reportRange === "week" ? addDaysStr(todayStr(), -6) : reportRange === "month" ? addDaysStr(todayStr(), -29) : null;
  const masteredInRange = stats.masteredEvents.filter((e) => !reportRangeStart || e.date >= reportRangeStart).length;
  const testsInRange = stats.testHistory.filter((t) => !reportRangeStart || t.date >= reportRangeStart);
  const avgAccuracyInRange =
    testsInRange.length > 0
      ? Math.round((testsInRange.reduce((sum, t) => sum + t.correct / t.total, 0) / testsInRange.length) * 100)
      : null;
  const overallAccuracy =
    stats.testHistory.length > 0
      ? Math.round((stats.testHistory.reduce((sum, t) => sum + t.correct / t.total, 0) / stats.testHistory.length) * 100)
      : null;
  const todayDueAcrossDecks = decks.reduce((sum, dk) => sum + buildSessionQueue(deck, dk.key).length, 0);

  const material = materials[domain];
  const materialRemaining = material ? Math.max(0, material.totalUnits - material.currentUnit) : 0;
  const materialDaysNeeded = material ? materialRemaining * material.daysPerUnit : 0;
  const materialFinishDate = material ? addDaysStr(todayStr(), materialDaysNeeded) : null;
  const examDaysLeft = examDates[domain] ? daysUntil(examDates[domain]) : null;
  const materialBuffer = material && examDaysLeft !== null ? examDaysLeft - materialDaysNeeded : null;

  const fileInputRef = useRef(null);

  const handleExportBackup = () => {
    const newMeta = { lastExportedAt: todayStr() };
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(newMeta));
    const data = {};
    ALL_STORAGE_KEYS.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    });
    const payload = { app: "ippo", version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ippo-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMeta(newMeta);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.data || typeof parsed.data !== "object") {
          window.alert("このファイルはバックアップとして読み込めなかったよ。");
          return;
        }
        if (!window.confirm("今のデータを上書きして復元する？元に戻せないよ。")) return;
        Object.entries(parsed.data).forEach(([key, value]) => {
          if (ALL_STORAGE_KEYS.includes(key)) localStorage.setItem(key, value);
        });
        window.alert("復元したよ。アプリを再読み込みするね。");
        window.location.reload();
      } catch {
        window.alert("ファイルの読み込みに失敗したよ。正しいバックアップファイルか確認してね。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSyncSave = async () => {
    setSyncBusy(true);
    setSyncMessage("");
    try {
      let code = syncCode;
      if (!code) {
        code = generateSyncCode();
        localStorage.setItem(SYNC_CODE_STORAGE_KEY, code);
        setSyncCode(code);
        setSyncCodeInput(code);
      }
      const data = {};
      ALL_STORAGE_KEYS.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value !== null) data[key] = value;
      });
      const payload = { app: "ippo", version: 1, exportedAt: new Date().toISOString(), data };
      const res = await fetch(`${SYNC_API_BASE}/${code}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
      setSyncMessage(`保存したよ！コード: ${code}`);
    } catch {
      setSyncMessage("保存に失敗したよ。通信環境を確認してね。");
    } finally {
      setSyncBusy(false);
    }
  };

  const handleSyncLoad = async () => {
    const code = syncCodeInput.trim().toUpperCase();
    if (!code) {
      setSyncMessage("コードを入力してね。");
      return;
    }
    setSyncBusy(true);
    setSyncMessage("");
    try {
      const res = await fetch(`${SYNC_API_BASE}/${code}`);
      if (res.status === 404) {
        setSyncMessage("そのコードのデータは見つからなかったよ。");
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const parsed = await res.json();
      if (!parsed.data || typeof parsed.data !== "object") {
        setSyncMessage("データの形式が正しくなかったよ。");
        return;
      }
      if (!window.confirm("今のデータを上書きして復元する？元に戻せないよ。")) return;
      Object.entries(parsed.data).forEach(([key, value]) => {
        if (ALL_STORAGE_KEYS.includes(key)) localStorage.setItem(key, value);
      });
      localStorage.setItem(SYNC_CODE_STORAGE_KEY, code);
      window.alert("読み込んだよ。アプリを再読み込みするね。");
      window.location.reload();
    } catch {
      setSyncMessage("読み込みに失敗したよ。通信環境を確認してね。");
    } finally {
      setSyncBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      const canvas = await generateShareImage({
        streak,
        points: points.total,
        totalMastered: totalMasteredAll,
        totalCards: totalCardsAll,
        calendarDays,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `ippo-${todayStr()}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "いっぽ 進捗" });
            return;
          } catch {
            // user cancelled the share sheet; fall back to download below
          }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch {
      window.alert("画像の生成に失敗したよ。もう一度試してみて。");
    }
  };

  const reviewActive = testMode ? !testDone && !!current : totalCards > 0 && sessionTotal > 0 && !sessionDone && !!current;

  const flipCardEl = current && (
    <div
      onClick={() => setFlipped((f) => !f)}
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        minHeight: 260,
        padding: 28,
        boxShadow: "0 8px 24px rgba(43,38,32,0.08)",
        border: `1px solid ${d.accentSoft}`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 24,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: d.accent,
          fontWeight: 600,
        }}
      >
        {schema === "korean" ? "発音カード" : schema === "wine" ? current.region : d.label}
      </div>

      {!flipped ? (
        schema === "korean" ? (
          <div style={{ textAlign: "center" }}>
            {current.frontImage && (
              <img src={current.frontImage} alt="" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginBottom: 16, objectFit: "contain" }} />
            )}
            <div
              style={{
                fontFamily: "'IBM Plex Sans KR', sans-serif",
                fontSize: 40,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              {current.ko}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(current.ko);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: d.accentSoft,
                color: d.accent,
                border: "none",
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Volume2 size={15} /> 音声を聞く
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: "#747872" }}>タップして意味を確認</div>
          </div>
        ) : schema === "wine" ? (
          <div style={{ textAlign: "center" }}>
            {current.frontImage && (
              <img src={current.frontImage} alt="" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginBottom: 12, objectFit: "contain" }} />
            )}
            <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 20, lineHeight: 1.5, marginBottom: 8 }}>
              {current.q}
            </div>
            <div style={{ fontSize: 12, color: "#747872", marginTop: 16 }}>タップして解答を確認</div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            {current.frontImage && (
              <img src={current.frontImage} alt="" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginBottom: 12, objectFit: "contain" }} />
            )}
            <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 22, fontWeight: 600, lineHeight: 1.5 }}>
              {current.front}
            </div>
            <div style={{ fontSize: 12, color: "#747872", marginTop: 16 }}>タップして裏面を確認</div>
          </div>
        )
      ) : schema === "korean" ? (
        <div>
          {current.backImage && (
            <img src={current.backImage} alt="" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginBottom: 12, objectFit: "contain" }} />
          )}
          <div style={{ fontSize: 13, color: "#747872", marginBottom: 4 }}>{current.romanized}</div>
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 24, fontWeight: 600, marginBottom: 14 }}>
            {current.meaning}
          </div>
          <div
            style={{
              background: d.accentSoft,
              borderRadius: 8,
              padding: "12px 14px",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#1a1c1b",
            }}
          >
            <span style={{ fontWeight: 700, color: d.accent }}>発音ルール　</span>
            {current.rule}
          </div>
          {current.source && (
            <div style={{ fontSize: 12, color: "#747872", marginTop: 10 }}>📎 {current.source}</div>
          )}
        </div>
      ) : schema === "wine" ? (
        <div>
          {current.backImage && (
            <img src={current.backImage} alt="" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginBottom: 12, objectFit: "contain" }} />
          )}
          <div style={{ fontSize: 12, color: d.accent, fontWeight: 600, marginBottom: 6 }}>{current.topic}</div>
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 19, fontWeight: 600, lineHeight: 1.5 }}>
            {current.a}
          </div>
          {current.hypothesis && (
            <div style={{ fontSize: 12, color: "#747872", marginTop: 10 }}>💭 最初の仮説: {current.hypothesis}</div>
          )}
          {current.source && (
            <div style={{ fontSize: 12, color: "#747872", marginTop: 6 }}>📎 {current.source}</div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          {current.backImage && (
            <img src={current.backImage} alt="" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, marginBottom: 12, objectFit: "contain" }} />
          )}
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 20, fontWeight: 600, lineHeight: 1.5, marginBottom: 10 }}>
            {current.back}
          </div>
          {current.source && (
            <div style={{ fontSize: 12, color: "#747872", marginTop: 6 }}>📎 {current.source}</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf9f7",
        fontFamily: "'Nunito Sans', 'IBM Plex Sans KR', sans-serif",
        color: "#1a1c1b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: page === "review" ? "32px 16px 60px" : "32px 16px 108px",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Serif:ital,wght@0,500;0,600;1,500&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;0,800;1,600&family=Baloo+2:wght@500;600;700;800&family=Jost:wght@500;600;700&display=swap"
      />

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "'Futura', 'Jost', sans-serif",
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: "0.5em",
              margin: 0,
              paddingLeft: "0.5em",
              color: "#1a1c1b",
            }}
          >
            TAMERU
          </h1>
        </div>

        {/* Home */}
        {page === "home" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ position: "relative", marginBottom: 18, paddingTop: 6 }}>
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  right: 22,
                  width: 54,
                  height: 54,
                  borderRadius: "38% 62% 63% 37% / 41% 44% 56% 59%",
                  background: POP_COLORS[1].bg,
                  zIndex: 0,
                }}
              />
              <PopStar color={POP_COLORS[3].accent} size={20} style={{ top: -8, right: -2, transform: "rotate(12deg)" }} />
              <PopStar color={POP_COLORS[0].accent} size={13} style={{ top: 34, right: 74, transform: "rotate(-18deg)" }} />
              <div style={{ position: "relative", fontFamily: POP_FONT, fontWeight: 800, fontSize: 40, lineHeight: 1.05, color: "#1a1c1b" }}>
                こんにちは！
              </div>
              <div style={{ position: "relative", fontFamily: POP_FONT, fontWeight: 800, fontSize: 26, lineHeight: 1.15, color: POP_CTA }}>
                今日も一歩ずつ。
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#434842", marginBottom: 18, lineHeight: 1.6 }}>
              あなたのペースで大丈夫だよ。
            </div>

            {backupDue && (
              <div
                style={{
                  background: POP_COLORS[0].bg,
                  borderRadius: 18,
                  padding: "12px 14px",
                  marginBottom: 18,
                  boxShadow: POP_SHADOW,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12, color: "#1a1c1b", lineHeight: 1.5, fontWeight: 600 }}>
                  💾{" "}
                  {backupMeta.lastExportedAt
                    ? `最後のバックアップから${daysSinceLastBackup}日経ったよ`
                    : "まだバックアップを取ってないよ"}
                </div>
                <button
                  onClick={handleExportBackup}
                  style={{
                    flexShrink: 0,
                    border: "none",
                    background: POP_COLORS[0].accent,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "8px 14px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  書き出す
                </button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              <div style={{ background: POP_COLORS[3].bg, borderRadius: 18, padding: 12, textAlign: "center", boxShadow: POP_SHADOW }}>
                <div style={{ fontSize: 11, color: "#1a1c1b", marginBottom: 2, fontWeight: 600 }}>連続</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 19, color: POP_COLORS[3].accent }}>
                  🔥 {streak}
                </div>
              </div>
              <div style={{ background: POP_COLORS[0].bg, borderRadius: 18, padding: 12, textAlign: "center", boxShadow: POP_SHADOW }}>
                <div style={{ fontSize: 11, color: "#1a1c1b", marginBottom: 2, fontWeight: 600 }}>ポイント</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 19, color: POP_COLORS[0].accent }}>
                  ✦ {points.total}
                </div>
              </div>
              <div style={{ background: POP_COLORS[1].bg, borderRadius: 18, padding: 12, textAlign: "center", boxShadow: POP_SHADOW }}>
                <div style={{ fontSize: 11, color: "#1a1c1b", marginBottom: 2, fontWeight: 600 }}>正解率</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 19, color: POP_COLORS[1].accent }}>
                  {overallAccuracy !== null ? `${overallAccuracy}%` : "-"}
                </div>
              </div>
            </div>

            <a
              href="https://www.amazon.co.jp/s?i=digital-text"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: -10,
                marginBottom: 18,
                fontSize: 12,
                fontWeight: 700,
                color: POP_CTA,
                textDecoration: "none",
              }}
            >
              🎁 Kindleストアで使ってみる
            </a>

            <div
              onClick={todayDueAcrossDecks > 0 ? goToTodayGoal : undefined}
              style={{
                position: "relative",
                overflow: "hidden",
                background: POP_COLORS[2].accent,
                borderRadius: 22,
                padding: 18,
                marginBottom: 18,
                boxShadow: `0 10px 24px ${POP_COLORS[2].accent}55`,
                cursor: todayDueAcrossDecks > 0 ? "pointer" : "default",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: -20,
                  right: -14,
                  width: 70,
                  height: 70,
                  borderRadius: "42% 58% 61% 39% / 46% 40% 60% 54%",
                  background: "rgba(255,255,255,0.16)",
                }}
              />
              <div style={{ position: "relative" }}>
                <div style={{ fontFamily: POP_FONT, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  今日の目標
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                  {todayDueAcrossDecks > 0 ? `今日は${todayDueAcrossDecks}枚の復習があるよ` : "今日の復習はもう終わってるよ、えらい！"}
                </div>
              </div>
              {todayDueAcrossDecks > 0 && (
                <div style={{ position: "relative", color: "#fff", fontSize: 22, fontWeight: 800, flexShrink: 0 }}>›</div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: POP_FONT, fontSize: 15, fontWeight: 700, color: "#1a1c1b" }}>学習の続きから</div>
              <button
                onClick={() => setPage("library")}
                style={{ border: "none", background: "transparent", color: POP_CTA, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                すべて見る
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
              {decks.map((val, i) => {
                const TIcon = DECK_ICONS[val.iconKey] || BookOpen;
                const total = deckTotalCards(val.key);
                const mastered = deckMasteredCards(val.key);
                const pop = POP_COLORS[i % POP_COLORS.length];
                const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
                return (
                  <div
                    key={val.key}
                    style={{ position: "relative", background: pop.bg, borderRadius: 20, padding: 16, boxShadow: POP_SHADOW }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 14,
                        background: "#fff",
                        color: pop.accent,
                        fontFamily: POP_FONT,
                        fontWeight: 700,
                        fontSize: 11,
                        padding: "4px 9px",
                        borderRadius: 999,
                        transform: "rotate(6deg)",
                        boxShadow: "0 3px 8px rgba(26,28,27,0.15)",
                      }}
                    >
                      {pct}%
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: pop.accent,
                          flexShrink: 0,
                        }}
                      >
                        <TIcon size={20} />
                      </div>
                      <div>
                        <div style={{ fontFamily: POP_FONT, fontWeight: 700, fontSize: 15, color: "#1a1c1b" }}>{val.label}</div>
                        <div style={{ fontSize: 12, color: "#434842" }}>
                          定着 {mastered}/{total}枚
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => openDeckReview(val.key)}
                      style={{
                        width: "100%",
                        padding: "11px 0",
                        borderRadius: 999,
                        border: "none",
                        background: POP_CTA,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      学習を続ける
                    </button>
                  </div>
                );
              })}
              <div
                onClick={() => {
                  setPage("library");
                  openDeckForm();
                }}
                style={{
                  border: "2px dashed #C9C2B4",
                  borderRadius: 20,
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: 16,
                  cursor: "pointer",
                  color: "#434842",
                }}
              >
                <Plus size={18} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>新しいデッキ</span>
              </div>
            </div>
          </div>
        )}

        {/* Library */}
        {page === "library" && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: POP_FONT, fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", color: POP_COLORS[2].accent, marginBottom: 2 }}>
            LIBRARY
          </div>
          <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 30, marginBottom: 6, color: "#1a1c1b" }}>
            マイライブラリ
          </div>
          <div style={{ fontSize: 13, color: "#434842", marginBottom: 18 }}>その調子で頑張ろう！</div>

        {showDeckForm && (
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 20, border: "1px solid #E5E2DC" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#434842", marginBottom: 10 }}>新しいデッキを作る</div>
            <input
              value={deckForm.name}
              onChange={(e) => setDeckForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="デッキ名（例: 英語）"
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <div style={{ fontSize: 12, color: "#747872", marginBottom: 6 }}>アイコン</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {Object.entries(DECK_ICONS).map(([key, IconComp]) => (
                <button
                  key={key}
                  onClick={() => setDeckForm((f) => ({ ...f, iconKey: key }))}
                  aria-label={key}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: deckForm.iconKey === key ? "2px solid #434842" : "1px solid #E5E2DC",
                    background: "#F7F4EE",
                    color: "#4A4438",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <IconComp size={16} />
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#747872", marginBottom: 6 }}>カラー</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {ACCENT_PRESETS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setDeckForm((f) => ({ ...f, colorIdx: i }))}
                  aria-label={`color-${i}`}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: deckForm.colorIdx === i ? "2px solid #1a1c1b" : "1px solid #E5E2DC",
                    background: c.accent,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowDeckForm(false)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "1px solid #E5E2DC",
                  background: "transparent",
                  color: "#434842",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={saveNewDeck}
                style={{
                  flex: 2,
                  padding: "10px 0",
                  borderRadius: 999,
                  border: "none",
                  background: POP_CTA,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                作る
              </button>
            </div>
            {decks.some((x) => !x.builtin) && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E5E2DC" }}>
                <div style={{ fontSize: 12, color: "#747872", marginBottom: 6 }}>作ったデッキを削除</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {decks
                    .filter((x) => !x.builtin)
                    .map((x) => (
                      <div key={x.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span>{x.label}</span>
                        <button
                          onClick={() => deleteDeck(x.key)}
                          aria-label="デッキを削除"
                          style={{ border: "none", background: "transparent", color: "#B0483A", cursor: "pointer", padding: 4 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {decks.map((val, i) => {
              const TIcon = DECK_ICONS[val.iconKey] || BookOpen;
              const total = deckTotalCards(val.key);
              const mastered = deckMasteredCards(val.key);
              const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
              const pop = POP_COLORS[i % POP_COLORS.length];
              return (
                <div
                  key={val.key}
                  onClick={() => openDeckReview(val.key)}
                  style={{
                    background: pop.bg,
                    borderRadius: 20,
                    padding: 14,
                    boxShadow: POP_SHADOW,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <ProgressRing pct={pct} color={pop.accent} trackColor="rgba(255,255,255,0.7)" size={48} strokeWidth={5}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: pop.accent,
                        }}
                      >
                        <TIcon size={16} />
                      </div>
                    </ProgressRing>
                    {!val.builtin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDeck(val.key);
                        }}
                        aria-label="デッキを削除"
                        style={{ border: "none", background: "transparent", color: "#B0483A", cursor: "pointer", padding: 2 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div style={{ fontFamily: POP_FONT, fontWeight: 700, fontSize: 15, color: "#1a1c1b" }}>{val.label}</div>
                  <div style={{ fontSize: 12, color: "#434842" }}>
                    {total > 0 ? `${mastered}/${total} 定着・${pct}%` : "カードなし"}
                  </div>
                </div>
              );
            })}
            <div
              onClick={openDeckForm}
              style={{
                border: "2px dashed #C9C2B4",
                borderRadius: 20,
                background: "transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: 20,
                cursor: "pointer",
                color: "#434842",
                minHeight: 120,
              }}
            >
              <Plus size={20} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>新しいデッキ</span>
            </div>
          </div>
        </div>
        )}

        {/* Goals deck switcher */}
        {page === "goals" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: POP_FONT, fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", color: POP_COLORS[0].accent, marginBottom: 2 }}>
              GOALS
            </div>
            <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 30, color: "#1a1c1b" }}>目標</div>
          </div>
        )}

        {page === "goals" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {decks.map((val, i) => {
              const active = val.key === domain;
              const TIcon = DECK_ICONS[val.iconKey] || BookOpen;
              const pop = POP_COLORS[i % POP_COLORS.length];
              return (
                <button
                  key={val.key}
                  onClick={() => switchDomain(val.key)}
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "none",
                    background: active ? pop.bg : "#FFFFFF",
                    boxShadow: active ? POP_SHADOW : "none",
                    color: active ? pop.accent : "#9A9488",
                    fontFamily: POP_FONT,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <TIcon size={14} />
                  {val.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Exam countdown */}
        {page === "goals" && (
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            {editingExamDate ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  style={{ ...inputStyle, width: "auto", padding: "6px 8px", fontSize: 13 }}
                />
                <button onClick={saveExamDate} style={smallLinkButtonStyle(POP_CTA)}>
                  保存
                </button>
                {examDates[domain] && (
                  <button onClick={clearExamDate} style={smallLinkButtonStyle("#B0483A")}>
                    削除
                  </button>
                )}
                <button onClick={() => setEditingExamDate(false)} style={smallLinkButtonStyle("#747872")}>
                  閉じる
                </button>
              </div>
            ) : examDates[domain] ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: POP_COLORS[2].bg,
                  color: POP_COLORS[2].accent,
                  fontFamily: POP_FONT,
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "8px 14px",
                  borderRadius: 999,
                  boxShadow: POP_SHADOW,
                }}
              >
                {daysUntil(examDates[domain]) >= 0
                  ? `🎯 試験まであと${daysUntil(examDates[domain])}日（${examDates[domain]}）`
                  : "🎯 試験日を過ぎてるよ"}
                <button onClick={openExamDateEditor} style={smallLinkButtonStyle("#747872")}>
                  変更
                </button>
              </div>
            ) : (
              <button
                onClick={openExamDateEditor}
                style={{
                  border: "none",
                  background: POP_COLORS[2].bg,
                  color: POP_COLORS[2].accent,
                  fontFamily: POP_FONT,
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "10px 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                🎯 {d.label}の試験日を設定する
              </button>
            )}
          </div>
        )}

        {/* Material progress */}
        {page === "goals" && (
          <div
            style={{
              background: POP_COLORS[3].bg,
              borderRadius: 20,
              padding: 16,
              marginBottom: 14,
              boxShadow: POP_SHADOW,
            }}
          >
            <div style={{ fontFamily: POP_FONT, fontSize: 15, fontWeight: 700, color: "#1a1c1b", marginBottom: 10 }}>📖 教材の進み具合</div>
            {editingMaterial ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="教材名（例: できる韓国語）"
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="1"
                  value={materialForm.totalUnits}
                  onChange={(e) => setMaterialForm((f) => ({ ...f, totalUnits: e.target.value }))}
                  placeholder="全体の量（例: 20課なら20）"
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="0"
                  value={materialForm.currentUnit}
                  onChange={(e) => setMaterialForm((f) => ({ ...f, currentUnit: e.target.value }))}
                  placeholder="今の進み（例: 7課まで終わってたら7）"
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="1"
                  value={materialForm.daysPerUnit}
                  onChange={(e) => setMaterialForm((f) => ({ ...f, daysPerUnit: e.target.value }))}
                  placeholder="1つあたり何日かかりそうか（土日休みなども含めた体感でOK）"
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setEditingMaterial(false)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 8,
                      border: "1px solid #E5E2DC",
                      background: "transparent",
                      color: "#434842",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={saveMaterial}
                    style={{
                      flex: 2,
                      padding: "10px 0",
                      borderRadius: 999,
                      border: "none",
                      background: POP_CTA,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    保存
                  </button>
                </div>
                {material && (
                  <button onClick={clearMaterial} style={{ ...smallLinkButtonStyle("#B0483A"), alignSelf: "center" }}>
                    この教材の登録を削除
                  </button>
                )}
              </div>
            ) : material ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <ProgressRing
                    pct={material.totalUnits > 0 ? (material.currentUnit / material.totalUnits) * 100 : 0}
                    color={POP_COLORS[3].accent}
                    trackColor="rgba(255,255,255,0.7)"
                    size={64}
                    strokeWidth={7}
                  >
                    <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 14, color: POP_COLORS[3].accent }}>
                      {material.totalUnits > 0 ? Math.round((material.currentUnit / material.totalUnits) * 100) : 0}%
                    </div>
                  </ProgressRing>
                  <div>
                    <div style={{ fontFamily: POP_FONT, fontWeight: 700, fontSize: 15 }}>{material.name}</div>
                    <div style={{ fontSize: 12, color: "#1a1c1b", marginTop: 4 }}>
                      {material.currentUnit} / {material.totalUnits}（残り{materialRemaining}）
                    </div>
                  </div>
                </div>
                {materialRemaining > 0 ? (
                  <div style={{ fontSize: 12, color: "#1a1c1b", marginTop: 10 }}>
                    このペースだと <strong>{materialFinishDate}</strong> ごろ完了予定
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: POP_COLORS[3].accent, fontWeight: 700, marginTop: 10 }}>一周完了です！🎉</div>
                )}
                {materialRemaining === 0 && (
                  <button
                    onClick={markMaterialComplete}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "8px 0",
                      borderRadius: 999,
                      border: "none",
                      background: POP_CTA,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    📚 読了リストに追加する
                  </button>
                )}
                {materialRemaining > 0 && examDaysLeft !== null && (
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 6,
                      color: materialBuffer >= 0 ? POP_COLORS[3].accent : "#B0483A",
                      fontWeight: 700,
                    }}
                  >
                    {materialBuffer >= 0
                      ? `順調！試験まで${materialBuffer}日の余裕があるよ`
                      : `このペースだと${Math.abs(materialBuffer)}日足りないかも。ペースか試験日を見直してみて`}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => bumpMaterialProgress(1)}
                    disabled={materialRemaining === 0}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 999,
                      border: "none",
                      background: materialRemaining === 0 ? "rgba(255,255,255,0.7)" : "#FFFFFF",
                      color: materialRemaining === 0 ? "#9A9488" : POP_COLORS[3].accent,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: materialRemaining === 0 ? "default" : "pointer",
                    }}
                  >
                    +1進んだ
                  </button>
                  <button
                    onClick={openMaterialEditor}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 999,
                      border: "none",
                      background: "rgba(255,255,255,0.6)",
                      color: "#1a1c1b",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    編集
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openMaterialEditor}
                style={{
                  border: "none",
                  background: "#FFFFFF",
                  color: POP_COLORS[3].accent,
                  fontFamily: POP_FONT,
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "10px 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                📖 教材を登録する
              </button>
            )}
          </div>
        )}

        {/* Completed materials list */}
        {page === "goals" && completedMaterials.some((x) => x.deckKey === domain) && (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: 16,
              marginBottom: 14,
              boxShadow: POP_SHADOW,
            }}
          >
            <div style={{ fontFamily: POP_FONT, fontSize: 15, fontWeight: 700, color: "#1a1c1b", marginBottom: 10 }}>📚 読了リスト</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completedMaterials
                .filter((x) => x.deckKey === domain)
                .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
                .map((x) => (
                  <div
                    key={x.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "#F7F4EE",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{x.name}</div>
                      <div style={{ fontSize: 12, color: "#747872", marginTop: 2 }}>
                        全{x.totalUnits} ・ {x.completedAt.replaceAll("-", "/")}に読了
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCompletedMaterial(x.id)}
                      aria-label="読了記録を削除"
                      style={{ border: "none", background: "transparent", color: "#B0483A", cursor: "pointer", padding: 4, flexShrink: 0 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}


        {/* Report */}
        {page === "report" && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: POP_FONT, fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", color: POP_COLORS[1].accent, marginBottom: 2 }}>
              REPORT
            </div>
            <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 30, marginBottom: 16, color: "#1a1c1b" }}>
              学習レポート
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#F0ECE1", borderRadius: 999, padding: 4 }}>
              {[
                { key: "week", label: "週間" },
                { key: "month", label: "月間" },
                { key: "all", label: "すべて" },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReportRange(r.key)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 999,
                    border: "none",
                    background: reportRange === r.key ? POP_CTA : "transparent",
                    color: reportRange === r.key ? "#fff" : "#434842",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div style={{ background: POP_COLORS[3].bg, borderRadius: 18, padding: 14, textAlign: "center", boxShadow: POP_SHADOW }}>
                <div style={{ fontSize: 12, color: "#1a1c1b", marginBottom: 4, fontWeight: 600 }}>連続学習日数</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 22, color: POP_COLORS[3].accent }}>
                  🔥 {streak}
                </div>
              </div>
              <div style={{ background: POP_COLORS[0].bg, borderRadius: 18, padding: 14, textAlign: "center", boxShadow: POP_SHADOW }}>
                <div style={{ fontSize: 12, color: "#1a1c1b", marginBottom: 4, fontWeight: 600 }}>新規定着カード</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 22, color: POP_COLORS[0].accent }}>
                  +{masteredInRange}
                </div>
              </div>
              <div style={{ background: POP_COLORS[1].bg, borderRadius: 18, padding: 14, textAlign: "center", boxShadow: POP_SHADOW }}>
                <div style={{ fontSize: 12, color: "#1a1c1b", marginBottom: 4, fontWeight: 600 }}>平均正解率</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 22, color: POP_COLORS[1].accent }}>
                  {avgAccuracyInRange !== null ? `${avgAccuracyInRange}%` : "-"}
                </div>
              </div>
              <div style={{ background: POP_COLORS[2].bg, borderRadius: 18, padding: 14, textAlign: "center", boxShadow: POP_SHADOW }}>
                <div style={{ fontSize: 12, color: "#1a1c1b", marginBottom: 4, fontWeight: 600 }}>テスト実施回数</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 22, color: POP_COLORS[2].accent }}>
                  {testsInRange.length}
                </div>
              </div>
            </div>

            {lastTestAll && (
              <div style={{ textAlign: "center", fontSize: 12, color: "#747872", marginBottom: 14 }}>
                前回テスト（{decks.find((x) => x.key === lastTestAll.domain)?.label || lastTestAll.domain}）
                {Math.round((lastTestAll.correct / lastTestAll.total) * 100)}%（{lastTestAll.correct}/{lastTestAll.total}）・
                {dueLabel(lastTestAll.date) === "今日" ? "今日" : lastTestAll.date}
              </div>
            )}

            <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 16, boxShadow: POP_SHADOW }}>
              <div style={{ fontFamily: POP_FONT, fontSize: 15, fontWeight: 700, color: "#1a1c1b", marginBottom: 14 }}>デッキ別進捗</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
                {decks.map((val, i) => {
                  const total = deckTotalCards(val.key);
                  const mastered = deckMasteredCards(val.key);
                  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
                  const pop = POP_COLORS[i % POP_COLORS.length];
                  return (
                    <div key={val.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <ProgressRing pct={pct} color={pop.accent} trackColor={pop.bg} size={72} strokeWidth={8}>
                        <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 15, color: pop.accent }}>{pct}%</div>
                      </ProgressRing>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1c1b" }}>{val.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Study record (calendar + share) */}
            <div style={{ background: "#FFFFFF", borderRadius: 16, padding: 14, border: "1px solid #E5E2DC", textAlign: "center", marginTop: 14 }}>
              <div style={{ fontSize: 12, color: "#747872", marginBottom: 4 }}>全デッキ定着</div>
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontWeight: 800, fontSize: 22, color: "#4e604f" }}>
                {totalMasteredAll}/{totalCardsAll}枚
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <button
                onClick={handleShare}
                style={{
                  border: "none",
                  background: POP_COLORS[1].bg,
                  color: POP_COLORS[1].accent,
                  fontFamily: POP_FONT,
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "10px 16px",
                  borderRadius: 999,
                  cursor: "pointer",
                }}
              >
                📤 進捗をシェア
              </button>
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 16, boxShadow: POP_SHADOW, marginTop: 14 }}>
              <div style={{ fontFamily: POP_FONT, fontSize: 15, fontWeight: 700, color: "#1a1c1b", marginBottom: 4 }}>💾 データのバックアップ</div>
              <div style={{ fontSize: 12, color: "#747872", marginBottom: 12, lineHeight: 1.6 }}>
                定期的に書き出しておくと、機種変更やアプリの再インストールでも復元できるよ。
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleExportBackup}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 999,
                    border: "none",
                    background: POP_COLORS[3].bg,
                    color: POP_COLORS[3].accent,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ⬇️ 書き出す
                </button>
                <button
                  onClick={handleImportClick}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 999,
                    border: "none",
                    background: POP_COLORS[3].bg,
                    color: POP_COLORS[3].accent,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ⬆️ 読み込む
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: "none" }} />
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 16, boxShadow: POP_SHADOW, marginTop: 14 }}>
              <div style={{ fontFamily: POP_FONT, fontSize: 15, fontWeight: 700, color: "#1a1c1b", marginBottom: 4 }}>☁️ 他の端末と同期</div>
              <div style={{ fontSize: 12, color: "#747872", marginBottom: 12, lineHeight: 1.6 }}>
                コードでPCなど他の端末とデータをやり取りできるよ。自動では同期しないから、更新したいタイミングで手動で保存・読み込みしてね。
              </div>
              <button
                onClick={handleSyncSave}
                disabled={syncBusy}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 999,
                  border: "none",
                  background: syncBusy ? "#EDE9DD" : POP_COLORS[2].bg,
                  color: syncBusy ? "#C9C2B4" : POP_COLORS[2].accent,
                  fontFamily: POP_FONT,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: syncBusy ? "default" : "pointer",
                  marginBottom: 8,
                }}
              >
                ☁️ 保存する{syncCode ? `（コード: ${syncCode}）` : ""}
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={syncCodeInput}
                  onChange={(e) => setSyncCodeInput(e.target.value)}
                  placeholder="コードを入力"
                  style={{ ...inputStyle, flex: 1, width: "auto" }}
                />
                <button
                  onClick={handleSyncLoad}
                  disabled={syncBusy}
                  style={{
                    padding: "0 16px",
                    borderRadius: 999,
                    border: "none",
                    background: syncBusy ? "#EDE9DD" : POP_COLORS[2].bg,
                    color: syncBusy ? "#C9C2B4" : POP_COLORS[2].accent,
                    fontFamily: POP_FONT,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: syncBusy ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  ☁️ 読み込む
                </button>
              </div>
              {syncMessage && (
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 8,
                    color: syncMessage.includes("失敗") || syncMessage.includes("見つから") || syncMessage.includes("正しく") ? "#B0483A" : "#4e604f",
                  }}
                >
                  {syncMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {page === "goals" && (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: 16,
              marginBottom: 14,
              boxShadow: POP_SHADOW,
            }}
          >
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: "center", background: POP_COLORS[3].bg, borderRadius: 16, padding: "12px 8px" }}>
                <div style={{ fontSize: 20 }}>🔥</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 16, color: POP_COLORS[3].accent }}>{streak}日</div>
                <div style={{ fontSize: 11, color: "#1a1c1b", fontWeight: 600 }}>現在の連続</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: POP_COLORS[0].bg, borderRadius: 16, padding: "12px 8px" }}>
                <div style={{ fontSize: 20 }}>🏆</div>
                <div style={{ fontFamily: POP_FONT, fontWeight: 800, fontSize: 16, color: POP_COLORS[0].accent }}>{longestStreak}日</div>
                <div style={{ fontSize: 11, color: "#1a1c1b", fontWeight: 600 }}>最長連続記録</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button
                onClick={() => changeCalendarMonth(-1)}
                aria-label="前の月"
                style={{ border: "none", background: "transparent", color: "#434842", cursor: "pointer", padding: 6, display: "flex" }}
              >
                <ChevronLeft size={18} />
              </button>
              <div style={{ fontFamily: POP_FONT, fontWeight: 700, fontSize: 16 }}>
                {calendarMonth.year}年{calendarMonth.month + 1}月
              </div>
              <button
                onClick={() => changeCalendarMonth(1)}
                aria-label="次の月"
                style={{ border: "none", background: "transparent", color: "#434842", cursor: "pointer", padding: 6, display: "flex" }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
              {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
                <div key={w} style={{ textAlign: "center", fontSize: 11, color: "#747872", fontWeight: 600 }}>
                  {w}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 6 }}>
              {calendarMonthCells.map((cell, i) => {
                if (!cell) return <div key={`empty-${i}`} />;
                const isToday = cell.date === todayStr();
                return (
                  <div key={cell.date} style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      title={`${cell.date}${cell.studied ? "・学習した" : ""}`}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 600,
                        background: cell.color || "transparent",
                        color: cell.color ? (cell.color === "#E8A93C" ? "#1a1c1b" : "#faf9f7") : isToday ? d.accent : "#434842",
                        border: isToday && !cell.color ? `1.5px solid ${d.accent}` : "1.5px solid transparent",
                      }}
                    >
                      {cell.day}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14, fontSize: 11, color: "#747872" }}>
              {decks.map((dk) => (
                <span key={dk.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: dk.accent, display: "inline-block" }} />
                  {dk.label}
                </span>
              ))}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8A93C", display: "inline-block" }} />
                複数デッキ
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${d.accent}`, display: "inline-block" }} />
                今日
              </span>
            </div>
          </div>
        )}

        {page === "review" && (
        <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button
            onClick={() => {
              cancelTest();
              setPage("library");
            }}
            aria-label="閉じる"
            style={{ border: "none", background: "transparent", color: "#434842", cursor: "pointer", padding: 4, display: "flex" }}
          >
            <X size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, color: d.accent }}>
            <DIcon size={16} />
            {d.label}
          </div>
          <div style={{ width: 28 }} />
        </div>
        {/* Add today's learning */}
        {!testMode && (
        <div style={{ marginBottom: 20 }}>
          {!showInput && !showList && !csvPreview ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setShowInput(true);
                  setFormError("");
                }}
                style={{
                  flex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 0",
                  borderRadius: 8,
                  border: `1.5px dashed ${d.accent}`,
                  background: "transparent",
                  color: d.accent,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <Plus size={16} />
                {schema === "korean"
                  ? "今日学んだ単語・表現を追加"
                  : schema === "wine"
                  ? "今日学んだワイン知識を追加"
                  : `今日学んだ${d.label}の内容を追加`}
              </button>
              <button
                onClick={() => setShowList(true)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "12px 0",
                  borderRadius: 8,
                  border: "1.5px solid #E5E2DC",
                  background: "transparent",
                  color: "#434842",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <List size={16} />
                一覧
              </button>
              <button
                onClick={startTest}
                disabled={totalCards === 0}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "12px 0",
                  borderRadius: 8,
                  border: "1.5px solid #E5E2DC",
                  background: "transparent",
                  color: totalCards === 0 ? "#C9C2B4" : "#434842",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: totalCards === 0 ? "default" : "pointer",
                }}
              >
                <Target size={16} />
                テスト
              </button>
            </div>
            <button
              onClick={() => csvFileInputRef.current?.click()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 0",
                borderRadius: 8,
                border: "1.5px solid #E5E2DC",
                background: "transparent",
                color: "#747872",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Upload size={14} />
              CSVから読み込む
            </button>
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files && e.target.files[0];
                if (file) handleCsvFile(file);
                e.target.value = "";
              }}
            />
            </div>
          ) : csvPreview ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${d.accentSoft}`,
              }}
            >
              {csvPreview.error ? (
                <>
                  <div style={{ fontSize: 13, color: "#B0483A", marginBottom: 12 }}>{csvPreview.error}</div>
                  <button
                    onClick={() => setCsvPreview(null)}
                    style={{
                      width: "100%",
                      padding: "10px 0",
                      borderRadius: 8,
                      border: "1.5px solid #E5E2DC",
                      background: "transparent",
                      color: "#434842",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    閉じる
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#434842", marginBottom: 10 }}>
                    CSVプレビュー（{csvPreview.rows.filter((r) => r.status === "ok").length}/{csvPreview.rows.length}件を登録できるよ）
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", marginBottom: 12 }}>
                    {csvPreview.rows.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "#F7F4EE",
                        }}
                      >
                        <div style={{ fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.values[CSV_PRIMARY_FIELD[csvPreview.schema]] || "(空)"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            flexShrink: 0,
                            color: r.status === "ok" ? d.accent : "#B0483A",
                          }}
                        >
                          {r.status === "ok" ? "OK" : r.note}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setCsvPreview(null)}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 8,
                        border: "1.5px solid #E5E2DC",
                        background: "transparent",
                        color: "#434842",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={confirmCsvImport}
                      disabled={csvPreview.rows.filter((r) => r.status === "ok").length === 0}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 8,
                        border: "none",
                        background: csvPreview.rows.filter((r) => r.status === "ok").length === 0 ? "#C9C2B4" : d.accent,
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: csvPreview.rows.filter((r) => r.status === "ok").length === 0 ? "default" : "pointer",
                      }}
                    >
                      {csvPreview.rows.filter((r) => r.status === "ok").length}件を登録する
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : showList ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${d.accentSoft}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#434842" }}>
                  {d.label}のカード一覧（{domainCards.length}枚）
                </div>
                <button
                  onClick={() => setShowList(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#434842",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  閉じる
                </button>
              </div>
              {domainCards.length === 0 ? (
                <div style={{ fontSize: 13, color: "#747872", padding: "12px 0" }}>まだカードがないよ。</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
                  {listCards.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "#F7F4EE",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {schema === "korean" ? c.ko : schema === "wine" ? c.q : c.front}
                        </div>
                        <div style={{ fontSize: 12, color: "#747872", marginTop: 2 }}>
                          {schema === "korean" ? c.meaning : schema === "wine" ? c.a : c.back}
                        </div>
                        {schema === "wine" && c.hypothesis && (
                          <div style={{ fontSize: 12, color: "#747872", marginTop: 2 }}>💭 仮説: {c.hypothesis}</div>
                        )}
                        {c.source && (
                          <div style={{ fontSize: 12, color: "#747872", marginTop: 2 }}>📎 {c.source}</div>
                        )}
                        <div style={{ fontSize: 12, color: d.accent, marginTop: 4 }}>
                          Box {c.box}・{c.correct}/{c.seen} 正解・次回 {dueLabel(c.dueAt)}
                        </div>
                        <div style={{ fontSize: 10, color: "#B4AC9C", marginTop: 2 }}>
                          登録: {formatDate(c.createdAt)}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => openEditCard(c)}
                        aria-label="編集"
                        style={{
                          border: "none",
                          background: "transparent",
                          color: d.accent,
                          cursor: "pointer",
                          padding: 4,
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(c.id)}
                        aria-label="削除"
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#B0483A",
                          cursor: "pointer",
                          padding: 4,
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${d.accentSoft}`,
              }}
            >
              {editingCardId && (
                <div style={{ fontSize: 12, fontWeight: 600, color: d.accent, marginBottom: 10 }}>
                  <Pencil size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  カードを編集中
                </div>
              )}
              {schema === "korean" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  <input
                    value={koreanForm.ko}
                    onChange={(e) => setKoreanForm((f) => ({ ...f, ko: e.target.value }))}
                    placeholder="韓国語（例: 도착하다）*"
                    style={inputStyle}
                  />
                  <input
                    value={koreanForm.romanized}
                    onChange={(e) => setKoreanForm((f) => ({ ...f, romanized: e.target.value }))}
                    placeholder="ローマ字読み（例: do-cha-ka-da）"
                    style={inputStyle}
                  />
                  <input
                    value={koreanForm.meaning}
                    onChange={(e) => setKoreanForm((f) => ({ ...f, meaning: e.target.value }))}
                    placeholder="意味（例: 到着する）*"
                    style={inputStyle}
                  />
                  <textarea
                    value={koreanForm.rule}
                    onChange={(e) => setKoreanForm((f) => ({ ...f, rule: e.target.value }))}
                    placeholder="発音ルール・メモ（任意）"
                    style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                  />
                  <select
                    value={koreanForm.source}
                    onChange={(e) => setKoreanForm((f) => ({ ...f, source: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">出典を選ぶ（任意）</option>
                    {KOREAN_SOURCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <ImagePickerField
                      label="表面の画像（任意）"
                      value={koreanForm.frontImage}
                      onChange={(v) => setKoreanForm((f) => ({ ...f, frontImage: v }))}
                    />
                    <ImagePickerField
                      label="裏面の画像（任意）"
                      value={koreanForm.backImage}
                      onChange={(v) => setKoreanForm((f) => ({ ...f, backImage: v }))}
                    />
                  </div>
                </div>
              ) : schema === "wine" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  <textarea
                    value={wineForm.q}
                    onChange={(e) => setWineForm((f) => ({ ...f, q: e.target.value }))}
                    placeholder="質問（例: シャブリの土壌は?）*"
                    style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                  />
                  <textarea
                    value={wineForm.a}
                    onChange={(e) => setWineForm((f) => ({ ...f, a: e.target.value }))}
                    placeholder="解答（例: キンメリジャン泥灰土）*"
                    style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                  />
                  <input
                    value={wineForm.region}
                    onChange={(e) => setWineForm((f) => ({ ...f, region: e.target.value }))}
                    placeholder="産地（例: フランス｜シャブリ）"
                    style={inputStyle}
                  />
                  <input
                    value={wineForm.topic}
                    onChange={(e) => setWineForm((f) => ({ ...f, topic: e.target.value }))}
                    placeholder="トピック（例: 産地・品種）"
                    style={inputStyle}
                  />
                  <textarea
                    value={wineForm.hypothesis}
                    onChange={(e) => setWineForm((f) => ({ ...f, hypothesis: e.target.value }))}
                    placeholder="調べる前の自分の仮説（あれば・任意）"
                    style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                  />
                  <select
                    value={wineForm.source}
                    onChange={(e) => setWineForm((f) => ({ ...f, source: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">出典を選ぶ（任意）</option>
                    {WINE_SOURCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <ImagePickerField
                      label="表面の画像（任意）"
                      value={wineForm.frontImage}
                      onChange={(v) => setWineForm((f) => ({ ...f, frontImage: v }))}
                    />
                    <ImagePickerField
                      label="裏面の画像（任意）"
                      value={wineForm.backImage}
                      onChange={(v) => setWineForm((f) => ({ ...f, backImage: v }))}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                  <textarea
                    value={genericForm.front}
                    onChange={(e) => setGenericForm((f) => ({ ...f, front: e.target.value }))}
                    placeholder="表面（問題・単語など）*"
                    style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                  />
                  <textarea
                    value={genericForm.back}
                    onChange={(e) => setGenericForm((f) => ({ ...f, back: e.target.value }))}
                    placeholder="裏面（答え・意味など）*"
                    style={{ ...inputStyle, minHeight: 50, resize: "vertical" }}
                  />
                  <input
                    value={genericForm.source}
                    onChange={(e) => setGenericForm((f) => ({ ...f, source: e.target.value }))}
                    placeholder="出典・メモ（任意）"
                    style={inputStyle}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <ImagePickerField
                      label="表面の画像（任意）"
                      value={genericForm.frontImage}
                      onChange={(v) => setGenericForm((f) => ({ ...f, frontImage: v }))}
                    />
                    <ImagePickerField
                      label="裏面の画像（任意）"
                      value={genericForm.backImage}
                      onChange={(v) => setGenericForm((f) => ({ ...f, backImage: v }))}
                    />
                  </div>
                </div>
              )}
              {formError && <div style={{ color: "#B0483A", fontSize: 12, marginBottom: 8 }}>{formError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={cancelForm}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 8,
                    border: "1px solid #E5E2DC",
                    background: "transparent",
                    color: "#434842",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={editingCardId ? handleEditCard : handleAddCard}
                  style={{
                    flex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 0",
                    borderRadius: 8,
                    border: "none",
                    background: d.accent,
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {editingCardId ? (
                    <>
                      <Check size={14} /> 保存
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> カードを追加
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Progress */}
        {!testMode && totalCards > 0 && sessionTotal > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              fontSize: 13,
              color: "#434842",
            }}
          >
            <span>
              今日 {Math.min(queueIdx + 1, sessionTotal)} / {sessionTotal} 枚
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Flame size={14} color={d.accent} />
              定着 {totalMastered}/{totalCards}
            </span>
          </div>
        )}

        {/* Test mode header */}
        {testMode && !testDone && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              fontSize: 13,
              color: "#434842",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Target size={14} color={d.accent} />
              テスト中 {testIdx + 1} / {testQueue.length}
            </span>
            <button
              onClick={cancelTest}
              style={{ border: "none", background: "transparent", color: "#747872", fontSize: 12, cursor: "pointer" }}
            >
              やめる
            </button>
          </div>
        )}

        {/* Card */}
        {testMode ? (
          testDone ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                minHeight: 260,
                padding: 28,
                boxShadow: "0 8px 24px rgba(43,38,32,0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 10,
              }}
            >
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 18, fontWeight: 600 }}>テスト結果</div>
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 36, fontWeight: 700, color: d.accent }}>
                {testScore} / {testQueue.length}
              </div>
              <div style={{ fontSize: 13, color: "#434842" }}>
                正答率 {Math.round((testScore / testQueue.length) * 100)}%
              </div>
              <button
                onClick={cancelTest}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: d.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                閉じる
              </button>
            </div>
          ) : (
            flipCardEl
          )
        ) : totalCards === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              minHeight: 260,
              padding: 28,
              boxShadow: "0 8px 24px rgba(43,38,32,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 10,
            }}
          >
            <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 18, fontWeight: 600 }}>
              カードがまだないよ
            </div>
            <div style={{ fontSize: 13, color: "#434842" }}>「＋追加」から{d.label}のカードを登録してみて。</div>
          </div>
        ) : sessionTotal === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              minHeight: 260,
              padding: 28,
              boxShadow: "0 8px 24px rgba(43,38,32,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 14,
            }}
          >
            <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 20, fontWeight: 600 }}>
              今日の復習は終わったよ
            </div>
            <div style={{ fontSize: 13, color: "#434842" }}>
              {nextDueDate ? `次回は ${dueLabel(nextDueDate)} に出てくるよ` : "また明日確認してね"}
            </div>
            <button
              onClick={forceReviewAll}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                color: d.accent,
                border: `1.5px solid ${d.accent}`,
                borderRadius: 999,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={15} /> 今すぐ全部復習する
            </button>
          </div>
        ) : !sessionDone ? (
          flipCardEl
        ) : (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              minHeight: 260,
              padding: 28,
              boxShadow: "0 8px 24px rgba(43,38,32,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 14,
            }}
          >
            <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 20, fontWeight: 600 }}>
              {d.label}セット終了
            </div>
            <div style={{ fontSize: 13, color: "#434842" }}>
              定着 {totalMastered} / {totalCards} 枚（Box3以上）
            </div>
            <button
              onClick={restart}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: d.accent,
                color: "#fff",
                border: "none",
                borderRadius: 999,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={15} /> もう一周する
            </button>
          </div>
        )}

        {/* Answer buttons */}
        {reviewActive && flipped && (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={() => handleAnswer(false)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "14px 0",
                borderRadius: 8,
                border: "1.5px solid #C97B6E",
                background: "#FBEEEC",
                color: "#B0483A",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <X size={16} /> まだ不安
            </button>
            <button
              onClick={() => handleAnswer(true)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "14px 0",
                borderRadius: 8,
                border: `1.5px solid ${d.accent}`,
                background: d.accentSoft,
                color: d.accent,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <Check size={16} /> わかった
            </button>
          </div>
        )}

        {/* Box legend */}
        <div style={{ marginTop: 22, fontSize: 12, color: "#747872", textAlign: "center", lineHeight: 1.6 }}>
          {testMode ? (
            "テストの結果はBoxや復習日には影響しないよ（力試し用）。"
          ) : (
            <>
              「わかった」を選ぶと次の復習日が1→3→7→16→30日後と延びていきます。
              <br />
              「まだ不安」を選ぶと今日中にもう一度出てきます。
              <br />
              追加したカードと学習状況はこの端末に自動で保存されます。
            </>
          )}
        </div>
        </>
        )}
      </div>

      {page !== "review" && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(14px + env(safe-area-inset-bottom))",
            left: 16,
            right: 16,
            maxWidth: 408,
            margin: "0 auto",
            background: "#FFFFFF",
            borderRadius: 999,
            boxShadow: "0 10px 28px rgba(26,28,27,0.16)",
            display: "flex",
            justifyContent: "space-around",
            padding: "8px 6px",
            zIndex: 10,
          }}
        >
          {[
            { key: "home", label: "ホーム", Icon: Home },
            { key: "library", label: "ライブラリ", Icon: Library },
            { key: "goals", label: "目標", Icon: Target },
            { key: "report", label: "レポート", Icon: BarChart3 },
          ].map(({ key, label, Icon }) => {
            const active = page === key;
            return (
              <button
                key={key}
                onClick={() => setPage(key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "2px 10px",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: active ? POP_CTA : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} color={active ? "#fff" : "#9A9488"} />
                </div>
                <span
                  style={{
                    fontFamily: POP_FONT,
                    fontSize: 10,
                    fontWeight: 700,
                    color: active ? POP_CTA : "#9A9488",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid #E5E2DC",
  padding: 10,
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function ProgressRing({ pct, color, trackColor = "rgba(0,0,0,0.08)", size = 56, strokeWidth = 6, children }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function PopStar({ color, size = 22, style }) {
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        background: color,
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        ...style,
      }}
    />
  );
}

function smallLinkButtonStyle(color, prominent = false) {
  return {
    border: prominent ? `1.5px dashed ${color}` : "none",
    background: "transparent",
    color,
    fontSize: prominent ? 13 : 11,
    fontWeight: 600,
    cursor: "pointer",
    padding: prominent ? "6px 12px" : "2px 4px",
    borderRadius: prominent ? 8 : 4,
  };
}

async function generateShareImage({ streak, points, totalMastered, totalCards, calendarDays }) {
  const accent = "#4e604f";
  const accentSoft = "#E4EBE8";
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const W = 640;
  const H = 700;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const cx = W / 2;
  const pad = 36;

  const roundedRect = (x, y, w, h, r) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  };

  ctx.fillStyle = "#faf9f7";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#FFFFFF";
  roundedRect(pad, pad, W - pad * 2, H - pad * 2, 28);
  ctx.fill();

  ctx.textAlign = "center";
  let y = pad + 60;

  ctx.fillStyle = "#747872";
  ctx.font = '600 18px "Nunito Sans", sans-serif';
  ctx.fillText("積み上げ復習", cx, y);
  y += 44;

  ctx.fillStyle = "#1a1c1b";
  ctx.font = '700 32px "Nunito Sans", sans-serif';
  ctx.fillText("いっぽの記録", cx, y);
  y += 100;

  ctx.fillStyle = accent;
  ctx.font = '700 96px "Nunito Sans", sans-serif';
  ctx.fillText(`🔥 ${streak}`, cx, y);
  y += 36;
  ctx.fillStyle = "#434842";
  ctx.font = '600 20px "Nunito Sans", sans-serif';
  ctx.fillText("連続学習日数", cx, y);
  y += 60;

  ctx.fillStyle = accentSoft;
  roundedRect(pad + 24, y - 36, W - (pad + 24) * 2, 88, 16);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.font = '700 24px "Nunito Sans", sans-serif';
  ctx.fillText(`定着 ${totalMastered} / ${totalCards} 枚`, cx, y + 4);
  ctx.fillStyle = "#434842";
  ctx.font = '500 15px "Nunito Sans", sans-serif';
  ctx.fillText(`累計 ${points.toLocaleString()}pt`, cx, y + 30);
  y += 100;

  ctx.fillStyle = "#434842";
  ctx.font = '600 14px "Nunito Sans", sans-serif';
  ctx.fillText("直近12週間の学習記録", cx, y);
  y += 22;

  const cell = 13;
  const gap = 4;
  const gridW = CALENDAR_WEEKS * (cell + gap) - gap;
  const startX = cx - gridW / 2;
  calendarDays.forEach((day, i) => {
    const col = Math.floor(i / 7);
    const row = i % 7;
    ctx.fillStyle = day.studied ? accent : "#e9e2d4";
    roundedRect(startX + col * (cell + gap), y + row * (cell + gap), cell, cell, 3);
    ctx.fill();
  });
  y += 7 * (cell + gap) + 36;

  ctx.fillStyle = "#747872";
  ctx.font = '500 14px "Nunito Sans", sans-serif';
  ctx.fillText(todayStr(), cx, H - pad - 30);

  return canvas;
}
