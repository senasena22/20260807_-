import React, { useState, useMemo, useEffect } from "react";
import { Volume2, Check, X, RotateCcw, Wine, Languages, Flame, Plus, List, Trash2, Target, Pencil } from "lucide-react";

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

const DOMAINS = {
  korean: { label: "韓国語", accent: "#3A5A54", accentSoft: "#E4EBE8", icon: Languages },
  wine: { label: "ワイン試験", accent: "#6B1F2E", accentSoft: "#F0E3E5", icon: Wine },
};

const DECK_STORAGE_KEY = "study-srs.deck.v1";
const DOMAIN_STORAGE_KEY = "study-srs.domain.v1";
const STATS_STORAGE_KEY = "study-srs.stats.v1";
const EXAM_DATES_STORAGE_KEY = "study-srs.examDates.v1";

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
    if (!raw) return { korean: null, wine: null };
    const parsed = JSON.parse(raw);
    return { korean: parsed.korean || null, wine: parsed.wine || null };
  } catch {
    return { korean: null, wine: null };
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

function loadDomain() {
  const saved = localStorage.getItem(DOMAIN_STORAGE_KEY);
  return saved === "korean" || saved === "wine" ? saved : "korean";
}

function newCardId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `gen-${crypto.randomUUID()}`;
  return `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

const KOREAN_SOURCE_OPTIONS = ["1行日記", "できる韓国語", "音楽", "ドラマ"];
const WINE_SOURCE_OPTIONS = ["1冊目の教科書"];

export default function StudyApp() {
  const [deck, setDeck] = useState(loadDeck);
  const [domain, setDomain] = useState(loadDomain);
  const [flipped, setFlipped] = useState(false);
  const [queueIdx, setQueueIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionQueue, setSessionQueue] = useState(() => buildSessionQueue(loadDeck(), loadDomain()));

  const [showInput, setShowInput] = useState(false);
  const [showList, setShowList] = useState(false);
  const [koreanForm, setKoreanForm] = useState(EMPTY_KOREAN_FORM);
  const [wineForm, setWineForm] = useState(EMPTY_WINE_FORM);
  const [formError, setFormError] = useState("");
  const [editingCardId, setEditingCardId] = useState(null);

  const [stats, setStats] = useState(loadStats);
  const [testMode, setTestMode] = useState(false);
  const [testQueue, setTestQueue] = useState([]);
  const [testIdx, setTestIdx] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testDone, setTestDone] = useState(false);

  const [examDates, setExamDates] = useState(loadExamDates);
  const [editingExamDate, setEditingExamDate] = useState(false);
  const [examDateInput, setExamDateInput] = useState("");

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
  };

  const handleAddCard = () => {
    if (domain === "korean") {
      const { ko, romanized, meaning, rule, source } = koreanForm;
      if (!ko.trim() || !meaning.trim()) {
        setFormError("韓国語と意味は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, "korean", "ko", ko)) {
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
    } else {
      const { q, a, region, topic, hypothesis, source } = wineForm;
      if (!q.trim() || !a.trim()) {
        setFormError("質問と解答は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, "wine", "q", q)) {
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
    }
    setFormError("");
    setShowInput(false);
  };

  const openEditCard = (card) => {
    if (card.domain === "korean") {
      setKoreanForm({
        ko: card.ko || "",
        romanized: card.romanized || "",
        meaning: card.meaning || "",
        rule: card.rule === "特になし" ? "" : card.rule || "",
        source: card.source || "",
      });
    } else {
      setWineForm({
        q: card.q || "",
        a: card.a || "",
        region: card.region === "-" ? "" : card.region || "",
        topic: card.topic === "その他" ? "" : card.topic || "",
        hypothesis: card.hypothesis || "",
        source: card.source || "",
      });
    }
    setEditingCardId(card.id);
    setFormError("");
    setShowList(false);
    setShowInput(true);
  };

  const handleEditCard = () => {
    if (domain === "korean") {
      const { ko, romanized, meaning, rule, source } = koreanForm;
      if (!ko.trim() || !meaning.trim()) {
        setFormError("韓国語と意味は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, "korean", "ko", ko, editingCardId)) {
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
    } else {
      const { q, a, region, topic, hypothesis, source } = wineForm;
      if (!q.trim() || !a.trim()) {
        setFormError("質問と解答は必須だよ。");
        return;
      }
      if (findDuplicateCard(deck, "wine", "q", q, editingCardId)) {
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
  const d = DOMAINS[domain];

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
        {domain === "korean" ? "発音カード" : current.region}
      </div>

      {!flipped ? (
        domain === "korean" ? (
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
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 20, lineHeight: 1.5, marginBottom: 8 }}>
              {current.q}
            </div>
            <div style={{ fontSize: 12, color: "#9A9184", marginTop: 16 }}>タップして解答を確認</div>
          </div>
        )
      ) : domain === "korean" ? (
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
      ) : (
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
      )}
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#EFEAE1",
        fontFamily: "'IBM Plex Sans', 'IBM Plex Sans KR', sans-serif",
        color: "#2B2620",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px 60px",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:ital,wght@0,500;0,600;1,500&display=swap"
      />

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontFamily: "'IBM Plex Serif', serif",
              fontStyle: "italic",
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#8A8072",
              marginBottom: 4,
            }}
          >
            積み上げ復習
          </div>
          <h1
            style={{
              fontFamily: "'IBM Plex Serif', serif",
              fontWeight: 600,
              fontSize: 26,
              margin: 0,
            }}
          >
            Sena's Study Deck
          </h1>
        </div>

        {/* Domain tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {Object.entries(DOMAINS).map(([key, val]) => {
            const active = key === domain;
            const TIcon = val.icon;
            return (
              <button
                key={key}
                onClick={() => switchDomain(key)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 10px",
                  borderRadius: 10,
                  border: active ? `2px solid ${val.accent}` : "2px solid transparent",
                  background: active ? val.accentSoft : "#E4DFD3",
                  color: active ? val.accent : "#6B6355",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <TIcon size={16} />
                {val.label}
              </button>
            );
          })}
        </div>

        {/* Exam countdown */}
        {!testMode && (
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

        {/* Stats strip */}
        {!testMode && (
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
                {domain === "korean" ? "今日学んだ単語・表現を追加" : "今日学んだワイン知識を追加"}
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
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{domain === "korean" ? c.ko : c.q}</div>
                        <div style={{ fontSize: 12, color: "#9A9184", marginTop: 2 }}>
                          {domain === "korean" ? c.meaning : c.a}
                        </div>
                        {domain === "wine" && c.hypothesis && (
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
              {domain === "korean" ? (
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
              ) : (
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
