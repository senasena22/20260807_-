import React, { useState, useMemo, useEffect } from "react";
import { Volume2, Check, X, RotateCcw, Wine, Languages, Flame, Plus } from "lucide-react";

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

// simple leitner-style boxes: 0 = new/due now, higher = longer interval (not time-based here, just streak strength)
function initDeck() {
  const cards = {};
  [...KOREAN_CARDS.map((c) => ({ ...c, domain: "korean" })), ...WINE_CARDS.map((c) => ({ ...c, domain: "wine" }))].forEach(
    (c) => (cards[c.id] = { ...c, box: 0, seen: 0, correct: 0 })
  );
  return cards;
}

function loadDeck() {
  try {
    const raw = localStorage.getItem(DECK_STORAGE_KEY);
    if (!raw) return initDeck();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return initDeck();
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

const EMPTY_KOREAN_FORM = { ko: "", romanized: "", meaning: "", rule: "" };
const EMPTY_WINE_FORM = { q: "", a: "", region: "", topic: "" };

export default function StudyApp() {
  const [deck, setDeck] = useState(loadDeck);
  const [domain, setDomain] = useState(loadDomain);
  const [flipped, setFlipped] = useState(false);
  const [queueIdx, setQueueIdx] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  const [showInput, setShowInput] = useState(false);
  const [koreanForm, setKoreanForm] = useState(EMPTY_KOREAN_FORM);
  const [wineForm, setWineForm] = useState(EMPTY_WINE_FORM);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck));
  }, [deck]);

  useEffect(() => {
    localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
  }, [domain]);

  const addCard = (card) => {
    setDeck((prev) => {
      const id = newCardId();
      return { ...prev, [id]: { ...card, id, domain, box: 0, seen: 0, correct: 0 } };
    });
    setQueueIdx(0);
    setSessionDone(false);
  };

  const handleAddCard = () => {
    if (domain === "korean") {
      const { ko, romanized, meaning, rule } = koreanForm;
      if (!ko.trim() || !meaning.trim()) {
        setFormError("韓国語と意味は必須だよ。");
        return;
      }
      addCard({ ko: ko.trim(), romanized: romanized.trim(), meaning: meaning.trim(), rule: rule.trim() || "特になし" });
      setKoreanForm(EMPTY_KOREAN_FORM);
    } else {
      const { q, a, region, topic } = wineForm;
      if (!q.trim() || !a.trim()) {
        setFormError("質問と解答は必須だよ。");
        return;
      }
      addCard({ q: q.trim(), a: a.trim(), region: region.trim() || "-", topic: topic.trim() || "その他" });
      setWineForm(EMPTY_WINE_FORM);
    }
    setFormError("");
    setShowInput(false);
  };

  const domainCards = useMemo(
    () =>
      Object.values(deck)
        .filter((c) => c.domain === domain)
        .sort((a, b) => a.box - b.box || a.seen - b.seen),
    [deck, domain]
  );

  const current = domainCards[queueIdx % domainCards.length];
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
    setDeck((prev) => {
      const c = prev[current.id];
      const nextBox = correct ? Math.min(c.box + 1, 5) : 0;
      return { ...prev, [current.id]: { ...c, box: nextBox, seen: c.seen + 1, correct: c.correct + (correct ? 1 : 0) } };
    });
    setFlipped(false);
    if (queueIdx + 1 >= domainCards.length) {
      setSessionDone(true);
    } else {
      setQueueIdx((i) => i + 1);
    }
  };

  const switchDomain = (key) => {
    setDomain(key);
    setQueueIdx(0);
    setFlipped(false);
    setSessionDone(false);
    setShowInput(false);
    setFormError("");
  };

  const restart = () => {
    setQueueIdx(0);
    setFlipped(false);
    setSessionDone(false);
  };

  const totalMastered = Object.values(deck).filter((c) => c.domain === domain && c.box >= 3).length;
  const totalCards = domainCards.length;

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

        {/* Add today's learning */}
        <div style={{ marginBottom: 20 }}>
          {!showInput ? (
            <button
              onClick={() => {
                setShowInput(true);
                setFormError("");
              }}
              style={{
                width: "100%",
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
          ) : (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${d.accentSoft}`,
              }}
            >
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
                </div>
              )}
              {formError && <div style={{ color: "#B0483A", fontSize: 12, marginBottom: 8 }}>{formError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setShowInput(false);
                    setKoreanForm(EMPTY_KOREAN_FORM);
                    setWineForm(EMPTY_WINE_FORM);
                    setFormError("");
                  }}
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
                  onClick={handleAddCard}
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
                  <Plus size={14} /> カードを追加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
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
            {Math.min(queueIdx + 1, totalCards)} / {totalCards} 枚
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Flame size={14} color={d.accent} />
            定着 {totalMastered}/{totalCards}
          </span>
        </div>

        {/* Card */}
        {!sessionDone ? (
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
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: d.accent, fontWeight: 600, marginBottom: 6 }}>{current.topic}</div>
                <div style={{ fontFamily: "'IBM Plex Serif', serif", fontSize: 19, fontWeight: 600, lineHeight: 1.5 }}>
                  {current.a}
                </div>
              </div>
            )}
          </div>
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
        {!sessionDone && flipped && (
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
          「まだ不安」を選ぶとBoxがリセットされ、また早めに出題されます。
          <br />
          追加したカードと学習状況はこの端末に自動で保存されます。
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
