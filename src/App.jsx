import React, { useState, useMemo, useEffect } from "react";
import { Volume2, Check, X, RotateCcw, Wine, Languages, Flame, Plus, List, Trash2, Target, Pencil, BookOpen, Brain, Star, Music, Globe, Dumbbell } from "lucide-react";

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

// days until next review after each successful box level (box 1〜5)
const INTERVALS_DAYS = [1, 3, 7, 16, 30];
// box level considered "定着" (mastered)
const MASTERY_BOX = 3;
// how many cards a pop-quiz test pulls at most
const TEST_SAMPLE_SIZE = 15;

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
    if (!raw) return { studyDates: [], masteredEvents: [], testHistory: [] };
    const parsed = JSON.parse(raw);
    return {
      studyDates: Array.isArray(parsed.studyDates) ? parsed.studyDates : [],
      masteredEvents: Array.isArray(parsed.masteredEvents) ? parsed.masteredEvents : [],
      testHistory: Array.isArray(parsed.testHistory) ? parsed.testHistory : [],
    };
  } catch {
    return { studyDates: [], masteredEvents: [], testHistory: [] };
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

const EMPTY_KOREAN_FORM = { ko: "", romanized: "", meaning: "", rule: "", source: "" };
const EMPTY_WINE_FORM = { q: "", a: "", region: "", topic: "", hypothesis: "", source: "" };
const EMPTY_GENERIC_FORM = { front: "", back: "", source: "" };

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
  const [koreanForm, setKoreanForm] = useState(EMPTY_KOREAN_FORM);
  const [wineForm, setWineForm] = useState(EMPTY_WINE_FORM);
  const [genericForm, setGenericForm] = useState(EMPTY_GENERIC_FORM);
  const [formError, setFormError] = useState("");
  const [editingCardId, setEditingCardId] = useState(null);
  const [showDeckForm, setShowDeckForm] = useState(false);
  const [deckForm, setDeckForm] = useState({ name: "", iconKey: "book", colorIdx: 0 });
  const [points, setPoints] = useState(loadPoints);

  const [stats, setStats] = useState(loadStats);
  const [testMode, setTestMode] = useState(false);
  const [testQueue, setTestQueue] = useState([]);
  const [testIdx, setTestIdx] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testDone, setTestDone] = useState(false);

  const [examDates, setExamDates] = useState(loadExamDates);
  const [editingExamDate, setEditingExamDate] = useState(false);
  const [examDateInput, setExamDateInput] = useState("");

  const [showCalendar, setShowCalendar] = useState(false);

  const [page, setPage] = useState("review");
  const [materials, setMaterials] = useState(loadMaterials);
  const [editingMaterial, setEditingMaterial] = useState(false);
  const [materialForm, setMaterialForm] = useState({ name: "", totalUnits: "", currentUnit: "", daysPerUnit: "" });

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
    localStorage.setItem(POINTS_STORAGE_KEY, JSON.stringify(points));
  }, [points]);

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
      const { ko, romanized, meaning, rule, source } = koreanForm;
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
      });
      setKoreanForm(EMPTY_KOREAN_FORM);
    } else if (schema === "wine") {
      const { q, a, region, topic, hypothesis, source } = wineForm;
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
      });
      setWineForm(EMPTY_WINE_FORM);
    } else {
      const { front, back, source } = genericForm;
      if (!front.trim() || !back.trim()) {
        setFormError("表と裏は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, domain, "front", front)) {
        setFormError("同じ内容がもう登録されてるよ。");
        return;
      }
      addCard({ front: front.trim(), back: back.trim(), source: source.trim() });
      setGenericForm(EMPTY_GENERIC_FORM);
    }
    setFormError("");
    setShowInput(false);
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
      });
    } else if (schema === "wine") {
      setWineForm({
        q: card.q || "",
        a: card.a || "",
        region: card.region === "-" ? "" : card.region || "",
        topic: card.topic === "その他" ? "" : card.topic || "",
        hypothesis: card.hypothesis || "",
        source: card.source || "",
      });
    } else {
      setGenericForm({
        front: card.front || "",
        back: card.back || "",
        source: card.source || "",
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
      const { ko, romanized, meaning, rule, source } = koreanForm;
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
        },
      }));
      setKoreanForm(EMPTY_KOREAN_FORM);
    } else if (schema === "wine") {
      const { q, a, region, topic, hypothesis, source } = wineForm;
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
        },
      }));
      setWineForm(EMPTY_WINE_FORM);
    } else {
      const { front, back, source } = genericForm;
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
        [editingCardId]: { ...prev[editingCardId], front: front.trim(), back: back.trim(), source: source.trim() },
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
      return { ...prev, studyDates, masteredEvents };
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
  const weekStart = addDaysStr(todayStr(), -6);
  const weeklyMastered = stats.masteredEvents.filter((e) => e.domain === domain && e.date >= weekStart).length;
  const lastTest = [...stats.testHistory].reverse().find((t) => t.domain === domain);
  const calendarDays = useMemo(() => buildCalendarDays(stats.studyDates), [stats.studyDates]);

  const material = materials[domain];
  const materialRemaining = material ? Math.max(0, material.totalUnits - material.currentUnit) : 0;
  const materialDaysNeeded = material ? materialRemaining * material.daysPerUnit : 0;
  const materialFinishDate = material ? addDaysStr(todayStr(), materialDaysNeeded) : null;
  const examDaysLeft = examDates[domain] ? daysUntil(examDates[domain]) : null;
  const materialBuffer = material && examDaysLeft !== null ? examDaysLeft - materialDaysNeeded : null;

  const handleShare = async () => {
    try {
      const canvas = await generateShareImage({
        domainLabel: d.label,
        accent: d.accent,
        accentSoft: d.accentSoft,
        streak,
        weeklyMastered,
        totalMastered,
        totalCards,
        calendarDays,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `study-srs-${domain}-${todayStr()}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "study-srs 進捗" });
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
          fontSize: 11,
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
            <div style={{ marginTop: 16, fontSize: 12, color: "#9A9184" }}>タップして意味を確認</div>
          </div>
        ) : schema === "wine" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 20, lineHeight: 1.5, marginBottom: 8 }}>
              {current.q}
            </div>
            <div style={{ fontSize: 12, color: "#9A9184", marginTop: 16 }}>タップして解答を確認</div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 22, fontWeight: 600, lineHeight: 1.5 }}>
              {current.front}
            </div>
            <div style={{ fontSize: 12, color: "#9A9184", marginTop: 16 }}>タップして裏面を確認</div>
          </div>
        )
      ) : schema === "korean" ? (
        <div>
          <div style={{ fontSize: 13, color: "#9A9184", marginBottom: 4 }}>{current.romanized}</div>
          <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 24, fontWeight: 600, marginBottom: 14 }}>
            {current.meaning}
          </div>
          <div
            style={{
              background: d.accentSoft,
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#3A3630",
            }}
          >
            <span style={{ fontWeight: 700, color: d.accent }}>発音ルール　</span>
            {current.rule}
          </div>
          {current.source && (
            <div style={{ fontSize: 11, color: "#9A9184", marginTop: 10 }}>📎 {current.source}</div>
          )}
        </div>
      ) : schema === "wine" ? (
        <div>
          <div style={{ fontSize: 11, color: d.accent, fontWeight: 600, marginBottom: 6 }}>{current.topic}</div>
          <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 19, fontWeight: 600, lineHeight: 1.5 }}>
            {current.a}
          </div>
          {current.hypothesis && (
            <div style={{ fontSize: 12, color: "#9A9184", marginTop: 10 }}>💭 最初の仮説: {current.hypothesis}</div>
          )}
          {current.source && (
            <div style={{ fontSize: 11, color: "#9A9184", marginTop: 6 }}>📎 {current.source}</div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 20, fontWeight: 600, lineHeight: 1.5, marginBottom: 10 }}>
            {current.back}
          </div>
          {current.source && (
            <div style={{ fontSize: 11, color: "#9A9184", marginTop: 6 }}>📎 {current.source}</div>
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
        padding: "32px 16px 60px",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Serif:ital,wght@0,500;0,600;1,500&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap"
      />

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "'Nunito Sans', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#4e604f",
              marginBottom: 4,
            }}
          >
            積み上げ復習
          </div>
          <h1
            style={{
              fontFamily: "'Nunito Sans', sans-serif",
              fontWeight: 700,
              fontSize: 26,
              margin: 0,
              color: "#1a1c1b",
            }}
          >
            Sena's Study Deck
          </h1>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              padding: "6px 14px",
              borderRadius: 999,
              background: "#FFFFFF",
              border: "1px solid #E4DFD3",
              fontSize: 13,
              fontWeight: 600,
              color: "#6B6355",
            }}
          >
            ✦ {points.total.toLocaleString()} pt
          </div>
        </div>

        {/* Domain tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
          {decks.map((val) => {
            const active = val.key === domain;
            const TIcon = DECK_ICONS[val.iconKey] || BookOpen;
            return (
              <button
                key={val.key}
                onClick={() => switchDomain(val.key)}
                style={{
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: active ? `2px solid ${val.accent}` : "2px solid transparent",
                  background: active ? val.accentSoft : "#E4DFD3",
                  color: active ? val.accent : "#6B6355",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                <TIcon size={16} />
                {val.label}
              </button>
            );
          })}
          <button
            onClick={() => (showDeckForm ? setShowDeckForm(false) : openDeckForm())}
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1.5px dashed #9A9184",
              background: "transparent",
              color: "#6B6355",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} />
            デッキ
          </button>
        </div>

        {showDeckForm && (
          <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #E4DFD3" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6355", marginBottom: 10 }}>新しいデッキを作る</div>
            <input
              value={deckForm.name}
              onChange={(e) => setDeckForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="デッキ名（例: 英語）"
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <div style={{ fontSize: 12, color: "#9A9184", marginBottom: 6 }}>アイコン</div>
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
                    border: deckForm.iconKey === key ? "2px solid #6B6355" : "1px solid #E4DFD3",
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
            <div style={{ fontSize: 12, color: "#9A9184", marginBottom: 6 }}>カラー</div>
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
                    border: deckForm.colorIdx === i ? "2px solid #2B2620" : "1px solid #E4DFD3",
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
                  border: "1px solid #E4DFD3",
                  background: "transparent",
                  color: "#6B6355",
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
                  borderRadius: 8,
                  border: "none",
                  background: "#4A4438",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                作る
              </button>
            </div>
            {decks.some((x) => !x.builtin) && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #E4DFD3" }}>
                <div style={{ fontSize: 12, color: "#9A9184", marginBottom: 6 }}>作ったデッキを削除</div>
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

        {/* Page nav */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setPage("review")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 10px",
              borderRadius: 10,
              border: page === "review" ? `2px solid ${d.accent}` : "2px solid transparent",
              background: page === "review" ? d.accentSoft : "#E4DFD3",
              color: page === "review" ? d.accent : "#6B6355",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            📚 復習
          </button>
          <button
            onClick={() => {
              setPage("plan");
              setTestMode(false);
              setTestDone(false);
            }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 10px",
              borderRadius: 10,
              border: page === "plan" ? `2px solid ${d.accent}` : "2px solid transparent",
              background: page === "plan" ? d.accentSoft : "#E4DFD3",
              color: page === "plan" ? d.accent : "#6B6355",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            🗓️ 計画
          </button>
        </div>

        {/* Exam countdown */}
        {page === "plan" && (
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            {editingExamDate ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  style={{ ...inputStyle, width: "auto", padding: "6px 8px", fontSize: 13 }}
                />
                <button onClick={saveExamDate} style={smallLinkButtonStyle(d.accent)}>
                  保存
                </button>
                {examDates[domain] && (
                  <button onClick={clearExamDate} style={smallLinkButtonStyle("#B0483A")}>
                    削除
                  </button>
                )}
                <button onClick={() => setEditingExamDate(false)} style={smallLinkButtonStyle("#9A9184")}>
                  閉じる
                </button>
              </div>
            ) : examDates[domain] ? (
              <div style={{ fontSize: 12, color: d.accent, fontWeight: 600 }}>
                {daysUntil(examDates[domain]) >= 0
                  ? `🎯 試験まであと${daysUntil(examDates[domain])}日（${examDates[domain]}）`
                  : "🎯 試験日を過ぎてるよ"}{" "}
                <button onClick={openExamDateEditor} style={smallLinkButtonStyle("#9A9184")}>
                  変更
                </button>
              </div>
            ) : (
              <button onClick={openExamDateEditor} style={smallLinkButtonStyle(d.accent, true)}>
                🎯 {d.label}の試験日を設定する
              </button>
            )}
          </div>
        )}

        {/* Material progress */}
        {page === "plan" && (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
              border: `1px solid ${d.accentSoft}`,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6355", marginBottom: 10 }}>📖 教材の進み具合</div>
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
                      border: "1px solid #E4DFD3",
                      background: "transparent",
                      color: "#6B6355",
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
                      borderRadius: 8,
                      border: "none",
                      background: d.accent,
                      color: "#fff",
                      fontWeight: 600,
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
                <div style={{ fontWeight: 600, fontSize: 14 }}>{material.name}</div>
                <div style={{ fontSize: 12, color: "#6B6355", marginTop: 4 }}>
                  {material.currentUnit} / {material.totalUnits}（残り{materialRemaining}）
                </div>
                <div style={{ height: 8, background: "#E4DFD3", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${material.totalUnits > 0 ? Math.min(100, (material.currentUnit / material.totalUnits) * 100) : 0}%`,
                      background: d.accent,
                    }}
                  />
                </div>
                {materialRemaining > 0 ? (
                  <div style={{ fontSize: 12, color: "#6B6355", marginTop: 10 }}>
                    このペースだと <strong>{materialFinishDate}</strong> ごろ完了予定
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: d.accent, fontWeight: 600, marginTop: 10 }}>一周完了です！🎉</div>
                )}
                {materialRemaining > 0 && examDaysLeft !== null && (
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 6,
                      color: materialBuffer >= 0 ? d.accent : "#B0483A",
                      fontWeight: 600,
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
                      borderRadius: 8,
                      border: "none",
                      background: materialRemaining === 0 ? "#E4DFD3" : d.accentSoft,
                      color: materialRemaining === 0 ? "#9A9184" : d.accent,
                      fontWeight: 600,
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
                      borderRadius: 8,
                      border: "1px solid #E4DFD3",
                      background: "transparent",
                      color: "#6B6355",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    編集
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={openMaterialEditor} style={smallLinkButtonStyle(d.accent, true)}>
                📖 教材を登録する
              </button>
            )}
          </div>
        )}

        {/* Stats strip */}
        {page === "plan" && (
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#9A9184",
              marginBottom: 14,
              lineHeight: 1.7,
            }}
          >
            <div>
              🔥 連続{streak}日　定着 今週+{weeklyMastered}枚
            </div>
            {lastTest && (
              <div>
                前回テスト {Math.round((lastTest.correct / lastTest.total) * 100)}%（{lastTest.correct}/{lastTest.total}）・
                {dueLabel(lastTest.date) === "今日" ? "今日" : lastTest.date}
              </div>
            )}
          </div>
        )}

        {/* Calendar / share */}
        {page === "plan" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setShowCalendar((v) => !v)} style={smallLinkButtonStyle(d.accent, true)}>
              📅 {showCalendar ? "カレンダーを閉じる" : "カレンダー"}
            </button>
            <button onClick={handleShare} style={smallLinkButtonStyle(d.accent, true)}>
              📤 進捗をシェア
            </button>
          </div>
        )}

        {page === "plan" && showCalendar && (
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
              border: `1px solid ${d.accentSoft}`,
            }}
          >
            <div style={{ fontSize: 12, color: "#6B6355", marginBottom: 10, textAlign: "center" }}>
              直近{CALENDAR_WEEKS}週間の学習記録
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateRows: "repeat(7, 12px)",
                gridAutoFlow: "column",
                gap: 3,
                justifyContent: "center",
              }}
            >
              {calendarDays.map((day) => (
                <div
                  key={day.date}
                  title={day.date}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: day.studied ? d.accent : "#E4DFD3",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {page === "review" && (
        <>
        {/* Add today's learning */}
        {!testMode && (
        <div style={{ marginBottom: 20 }}>
          {!showInput && !showList ? (
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
                  borderRadius: 10,
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
                  borderRadius: 10,
                  border: "1.5px solid #E4DFD3",
                  background: "transparent",
                  color: "#6B6355",
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
                  borderRadius: 10,
                  border: "1.5px solid #E4DFD3",
                  background: "transparent",
                  color: totalCards === 0 ? "#C9C2B4" : "#6B6355",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: totalCards === 0 ? "default" : "pointer",
                }}
              >
                <Target size={16} />
                テスト
              </button>
            </div>
          ) : showList ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${d.accentSoft}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6355" }}>
                  {d.label}のカード一覧（{domainCards.length}枚）
                </div>
                <button
                  onClick={() => setShowList(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#6B6355",
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
                <div style={{ fontSize: 13, color: "#9A9184", padding: "12px 0" }}>まだカードがないよ。</div>
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
                        <div style={{ fontSize: 12, color: "#9A9184", marginTop: 2 }}>
                          {schema === "korean" ? c.meaning : schema === "wine" ? c.a : c.back}
                        </div>
                        {schema === "wine" && c.hypothesis && (
                          <div style={{ fontSize: 11, color: "#9A9184", marginTop: 2 }}>💭 仮説: {c.hypothesis}</div>
                        )}
                        {c.source && (
                          <div style={{ fontSize: 11, color: "#9A9184", marginTop: 2 }}>📎 {c.source}</div>
                        )}
                        <div style={{ fontSize: 11, color: d.accent, marginTop: 4 }}>
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
                borderRadius: 12,
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
                    border: "1px solid #E4DFD3",
                    background: "transparent",
                    color: "#6B6355",
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
              color: "#6B6355",
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
              color: "#6B6355",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Target size={14} color={d.accent} />
              テスト中 {testIdx + 1} / {testQueue.length}
            </span>
            <button
              onClick={cancelTest}
              style={{ border: "none", background: "transparent", color: "#9A9184", fontSize: 12, cursor: "pointer" }}
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
              <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 18, fontWeight: 600 }}>テスト結果</div>
              <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 36, fontWeight: 700, color: d.accent }}>
                {testScore} / {testQueue.length}
              </div>
              <div style={{ fontSize: 13, color: "#6B6355" }}>
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
            <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 18, fontWeight: 600 }}>
              カードがまだないよ
            </div>
            <div style={{ fontSize: 13, color: "#6B6355" }}>「＋追加」から{d.label}のカードを登録してみて。</div>
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
            <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 20, fontWeight: 600 }}>
              今日の復習は終わったよ
            </div>
            <div style={{ fontSize: 13, color: "#6B6355" }}>
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
            <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 20, fontWeight: 600 }}>
              {d.label}セット終了
            </div>
            <div style={{ fontSize: 13, color: "#6B6355" }}>
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
                borderRadius: 12,
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
                borderRadius: 12,
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
        <div style={{ marginTop: 22, fontSize: 11, color: "#9A9184", textAlign: "center", lineHeight: 1.6 }}>
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
    </div>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid #E4DFD3",
  padding: 10,
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

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

async function generateShareImage({ domainLabel, accent, accentSoft, streak, weeklyMastered, totalMastered, totalCards, calendarDays }) {
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

  ctx.fillStyle = "#EFEAE1";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#FFFFFF";
  roundedRect(pad, pad, W - pad * 2, H - pad * 2, 28);
  ctx.fill();

  ctx.textAlign = "center";
  let y = pad + 60;

  ctx.fillStyle = "#8A8072";
  ctx.font = 'italic 600 18px "IBM Plex Serif", serif';
  ctx.fillText("積み上げ復習", cx, y);
  y += 44;

  ctx.fillStyle = "#2B2620";
  ctx.font = '700 32px "IBM Plex Serif", serif';
  ctx.fillText(`${domainLabel}の記録`, cx, y);
  y += 100;

  ctx.fillStyle = accent;
  ctx.font = '700 96px "IBM Plex Serif", serif';
  ctx.fillText(`🔥 ${streak}`, cx, y);
  y += 36;
  ctx.fillStyle = "#6B6355";
  ctx.font = '600 20px "IBM Plex Sans", sans-serif';
  ctx.fillText("連続学習日数", cx, y);
  y += 60;

  ctx.fillStyle = accentSoft;
  roundedRect(pad + 24, y - 36, W - (pad + 24) * 2, 88, 16);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.font = '700 24px "IBM Plex Sans", sans-serif';
  ctx.fillText(`定着 ${totalMastered} / ${totalCards} 枚`, cx, y + 4);
  ctx.fillStyle = "#6B6355";
  ctx.font = '500 15px "IBM Plex Sans", sans-serif';
  ctx.fillText(`今週 +${weeklyMastered}枚`, cx, y + 30);
  y += 100;

  ctx.fillStyle = "#6B6355";
  ctx.font = '600 14px "IBM Plex Sans", sans-serif';
  ctx.fillText("直近12週間の学習記録", cx, y);
  y += 22;

  const cell = 13;
  const gap = 4;
  const gridW = CALENDAR_WEEKS * (cell + gap) - gap;
  const startX = cx - gridW / 2;
  calendarDays.forEach((day, i) => {
    const col = Math.floor(i / 7);
    const row = i % 7;
    ctx.fillStyle = day.studied ? accent : "#E4DFD3";
    roundedRect(startX + col * (cell + gap), y + row * (cell + gap), cell, cell, 3);
    ctx.fill();
  });
  y += 7 * (cell + gap) + 36;

  ctx.fillStyle = "#9A9184";
  ctx.font = '500 14px "IBM Plex Sans", sans-serif';
  ctx.fillText(todayStr(), cx, H - pad - 30);

  return canvas;
}
