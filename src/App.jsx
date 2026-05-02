import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "https://quizverse-backend-xtrk.onrender.com";

const EXAMPLE_TOPICS = [
  { label: "General Knowledge", value: "General Knowledge" },
  { label: "Computer Science", value: "Computer Science" },
  { label: "Java Programming", value: "Java Programming" },
  { label: "Python", value: "Python" },
  { label: "World History", value: "World History" },
  { label: "Science", value: "Science" },
  { label: "Mathematics", value: "Mathematics" },
  { label: "Art & Culture", value: "Art and Culture" },
];

const GREETINGS = {
  perfect: { title: "LEGENDARY", msg: "Absolutely flawless. You are a true master of this topic.", color: "from-yellow-400 to-orange-500" },
  great:   { title: "OUTSTANDING", msg: "Incredible performance. Just a tiny bit more and you would be perfect.", color: "from-green-400 to-cyan-500" },
  good:    { title: "WELL DONE", msg: "Solid work. You are on the right track. Keep practicing.", color: "from-blue-400 to-purple-500" },
  average: { title: "GOOD EFFORT", msg: "You are learning. Review the topic and try again.", color: "from-indigo-400 to-pink-500" },
  low:     { title: "KEEP GOING", msg: "Everyone starts somewhere. Study up and come back stronger.", color: "from-red-400 to-pink-600" },
};

function getGradeInfo(score, attempted) {
  if (attempted === 0) return GREETINGS.low;
  const pct = (score / attempted) * 100;
  if (pct === 100) return GREETINGS.perfect;
  if (pct >= 80) return GREETINGS.great;
  if (pct >= 60) return GREETINGS.good;
  if (pct >= 40) return GREETINGS.average;
  return GREETINGS.low;
}

function getSuggestions(topic, pct) {
  const base = topic ? `"${topic}"` : "this topic";
  if (pct === 100) return [`You have mastered ${base}. Try a harder difficulty.`, "Challenge yourself with a related topic.", "Share your score with friends."];
  if (pct >= 80)  return [`Almost perfect at ${base}. Focus on the questions you missed.`, "Try the hard difficulty next.", "Read more advanced material on this topic."];
  if (pct >= 60)  return [`You have a decent grasp of ${base}.`, "Revisit the concepts you found tricky.", "Practice daily for better retention."];
  return [`Spend more time studying ${base}.`, "Start with easy difficulty to build confidence.", "Use flashcards or videos for learning."];
}

function Particles() {
  return (
    <div className="particles-bg" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, i) => (
        <span key={i} className="particle" style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${6 + Math.random() * 10}s`,
          width: `${2 + Math.random() * 4}px`,
          height: `${2 + Math.random() * 4}px`,
          opacity: 0.3 + Math.random() * 0.5,
        }} />
      ))}
    </div>
  );
}

function CircularTimer({ time, maxTime = 60 }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = time / maxTime;
  const color = time > 30 ? "#22d3ee" : time > 15 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform="rotate(-90 35 35)"
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
      <text x="35" y="40" textAnchor="middle" fill={color} fontSize="15" fontWeight="bold" fontFamily="monospace">{time}s</text>
    </svg>
  );
}

// ---- Answer Review Modal ----
function AnswerReviewModal({ answers, topic, onClose }) {
  const [filter, setFilter] = useState("all");
  const filtered = answers.filter((a) => {
    if (filter === "correct") return a.is_correct;
    if (filter === "wrong") return !a.is_correct;
    return true;
  });
  const correctCount = answers.filter((a) => a.is_correct).length;
  const wrongCount = answers.filter((a) => !a.is_correct).length;

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="review-panel" initial={{ scale: 0.85, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: 40 }} onClick={(e) => e.stopPropagation()}>
        <div className="review-header">
          <div>
            <h2 className="review-title">Answer Review</h2>
            <p className="review-sub">{topic} — {answers.length} questions</p>
          </div>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>
        <div className="review-filter-row">
          <button className={`review-filter-btn ${filter === "all" ? "rf-active" : ""}`} onClick={() => setFilter("all")}>All ({answers.length})</button>
          <button className={`review-filter-btn ${filter === "correct" ? "rf-active rf-correct-active" : ""}`} onClick={() => setFilter("correct")}>Correct ({correctCount})</button>
          <button className={`review-filter-btn ${filter === "wrong" ? "rf-active rf-wrong-active" : ""}`} onClick={() => setFilter("wrong")}>Wrong ({wrongCount})</button>
        </div>
        <div className="review-list">
          {filtered.map((a, i) => (
            <motion.div key={i} className={`review-item ${a.is_correct ? "ri-correct" : "ri-wrong"}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="ri-top">
                <span className={`ri-badge ${a.is_correct ? "ri-badge-c" : "ri-badge-w"}`}>{a.is_correct ? "Correct" : "Wrong"}</span>
                <span className="ri-qnum">Q{a.question_number}</span>
              </div>
              <p className="ri-question">{a.question}</p>
              <div className="ri-options">
                {a.options.map((opt, oi) => {
                  let cls = "ri-opt";
                  if (opt === a.correct) cls += " ri-opt-correct";
                  else if (opt === a.selected && !a.is_correct) cls += " ri-opt-wrong";
                  else cls += " ri-opt-neutral";
                  return (
                    <div key={oi} className={cls}>
                      <span className="ri-opt-letter">{String.fromCharCode(65 + oi)}</span>
                      <span className="ri-opt-text">{opt}</span>
                      {opt === a.correct && <span className="ri-tag ri-tag-c">Correct Answer</span>}
                      {opt === a.selected && !a.is_correct && <span className="ri-tag ri-tag-w">Your Answer</span>}
                      {opt === a.selected && a.is_correct && <span className="ri-tag ri-tag-c">Your Answer</span>}
                    </div>
                  );
                })}
              </div>
              {!a.selected && <p className="ri-note ri-note-skipped">Time expired — question skipped</p>}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---- Stats Panel ----
function StatsPanel({ onClose }) {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("stats");

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/stats`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/leaderboard`).then((r) => r.json()).catch(() => null),
    ]).then(([s, l]) => { setStats(s); setLeaderboard(l?.leaderboard || []); setLoading(false); });
  }, []);

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="stats-panel" initial={{ scale: 0.85, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: 40 }} onClick={(e) => e.stopPropagation()}>
        <div className="stats-header">
          <div>
            <h2 className="stats-title">QuizVerse Insights</h2>
            <p className="stats-sub">Powered by MongoDB Atlas</p>
          </div>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>
        <div className="stats-tabs">
          {["stats", "leaderboard"].map((t) => (
            <button key={t} className={`stats-tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
              {t === "stats" ? "Overview" : "Leaderboard"}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="stats-loading"><div className="mini-spinner" /><p>Loading from MongoDB</p></div>
        ) : tab === "stats" ? (
          <div className="stats-body">
            <div className="stats-grid">
              <StatCard label="Total Quizzes" value={stats?.total_quizzes ?? 0} />
              <StatCard label="Avg Score" value={`${stats?.avg_score ?? 0}%`} />
              <StatCard label="Perfect Scores" value={stats?.perfect_scores ?? 0} />
            </div>
            {stats?.top_topics?.length > 0 && (
              <div className="top-topics">
                <h3 className="section-label">Top Topics</h3>
                {stats.top_topics.map((t, i) => (
                  <div key={i} className="topic-bar-row">
                    <span className="topic-bar-name">{["1st","2nd","3rd","4th","5th"][i]} {t.topic || "Unknown"}</span>
                    <div className="topic-bar-track">
                      <motion.div className="topic-bar-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (t.count / (stats.total_quizzes || 1)) * 100)}%` }} transition={{ delay: i * 0.1, duration: 0.6 }} />
                    </div>
                    <span className="topic-bar-count">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
            {(!stats || stats?.total_quizzes === 0) && <p className="empty-state">No quiz data yet. Play some quizzes to see insights.</p>}
          </div>
        ) : (
          <div className="stats-body">
            <h3 className="section-label">Top 10 Scores</h3>
            {leaderboard.length === 0 ? <p className="empty-state">No scores yet. Be the first.</p> : (
              <div className="leaderboard-list">
                {leaderboard.map((entry, i) => (
                  <motion.div key={i} className="lb-row" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <span className="lb-rank">{i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `#${i+1}`}</span>
                    <div className="lb-info">
                      <span className="lb-topic">{entry.topic || "Unknown"}</span>
                      <span className="lb-meta">@{entry.username || "anon"} — {entry.difficulty || "easy"} — {entry.score}/{entry.attempted}</span>
                    </div>
                    <span className="lb-pct">{entry.percentage}%</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value }) {
  return (
    <motion.div className="stat-overview-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="soc-value">{value}</div>
      <div className="soc-label">{label}</div>
    </motion.div>
  );
}

// ---- History Panel ----
function HistoryPanel({ username, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewSession, setReviewSession] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/history/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => { setHistory(d.history || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [username]);

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <AnimatePresence>
        {reviewSession && <AnswerReviewModal answers={reviewSession.answers} topic={reviewSession.topic} onClose={() => setReviewSession(null)} />}
      </AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="history-panel" initial={{ scale: 0.85, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: 40 }} onClick={(e) => e.stopPropagation()}>
          <div className="stats-header">
            <div>
              <h2 className="stats-title">My Quiz History</h2>
              <p className="stats-sub">@{username} — last 20 sessions</p>
            </div>
            <button className="close-btn" onClick={onClose}>x</button>
          </div>
          {loading ? (
            <div className="stats-loading"><div className="mini-spinner" /><p>Fetching your history</p></div>
          ) : history.length === 0 ? (
            <div className="stats-body"><p className="empty-state">No history yet. Play your first quiz to see results here.</p></div>
          ) : (
            <div className="history-list">
              {history.map((entry, i) => {
                const hasAnswers = entry.answers && entry.answers.length > 0;
                return (
                  <motion.div key={i} className="history-item" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="hi-left">
                      <span className="hi-topic">{entry.topic || "Unknown"}</span>
                      <span className="hi-meta">{entry.difficulty} — {formatDate(entry.timestamp)}</span>
                      <span className="hi-meta">{entry.correct}/{entry.attempted} correct — {entry.time_taken}s taken</span>
                    </div>
                    <div className="hi-right">
                      <span className={`hi-pct ${entry.percentage >= 80 ? "hi-pct-good" : entry.percentage >= 50 ? "hi-pct-mid" : "hi-pct-low"}`}>{entry.percentage}%</span>
                      {hasAnswers && (
                        <button className="hi-review-btn" onClick={() => setReviewSession({ answers: entry.answers, topic: entry.topic })}>
                          Check Answers
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}

// ---- Username Entry Screen ----
function UsernameScreen({ onEnter }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setErr("Please enter a username to continue."); return; }
    if (trimmed.length < 2) { setErr("Username must be at least 2 characters."); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) { setErr("Only letters, numbers, and underscores allowed."); return; }
    onEnter(trimmed.toLowerCase());
  };

  return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <Particles />
      <motion.div className="username-card" initial={{ scale: 0.85, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 110, damping: 16 }}>
        <div className="brand" style={{ marginBottom: "2rem" }}>
          <div className="brand-icon">&#9889;</div>
          <h1 className="brand-title">QuizVerse <span className="brand-ai">AI</span></h1>
          <p className="brand-sub">Enter your username to track your progress</p>
        </div>
        <div className="input-group">
          <label className="field-label">Username</label>
          <input
            type="text" placeholder="e.g. john_doe" className="topic-input"
            value={name} onChange={(e) => { setName(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} maxLength={30} autoFocus
          />
          {err && <p className="username-err">{err}</p>}
          <p className="username-hint">Use the same username each time to keep your history synced across devices.</p>
        </div>
        <motion.button className="start-btn" onClick={handleSubmit} whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(99,102,241,0.7)" }} whileTap={{ scale: 0.97 }}>
          <span>Continue</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

// ---- Main App ----
export default function App() {
  const [username, setUsername] = useState(() => localStorage.getItem("qv_username") || "");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [time, setTime] = useState(60);
  const [listening, setListening] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Generating AI Questions...");
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [savedToDb, setSavedToDb] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState([]);
  const [showReview, setShowReview] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const sessionAnswersRef = useRef([]);

  const LOADING_MSGS = ["Generating AI Questions...", "Crafting smart questions...", "Consulting the AI brain...", "Almost ready..."];

  const handleUsernameEnter = (uname) => {
    localStorage.setItem("qv_username", uname);
    setUsername(uname);
  };

  const handleLogout = () => {
    localStorage.removeItem("qv_username");
    setUsername("");
    setStarted(false);
    setStopped(false);
    setQuestions([]);
  };

  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported in your browser."); return; }
    const recog = new SR();
    recog.lang = "en-US"; recog.interimResults = true;
    recog.onstart = () => setListening(true);
    recog.onresult = (e) => { setTopic(Array.from(e.results).map((r) => r[0].transcript).join("")); setFileUploaded(false); };
    recog.onend = () => setListening(false);
    recog.start();
    recognitionRef.current = recog;
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    setLoadingMsg(LOADING_MSGS[0]);
    let msgIdx = 0;
    const msgInterval = setInterval(() => { msgIdx = (msgIdx + 1) % LOADING_MSGS.length; setLoadingMsg(LOADING_MSGS[msgIdx]); }, 2500);
    try {
      const res = await fetch(`${API_BASE}/generate-quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: topic, difficulty }),
      });
      const data = await res.json();
      if (data.fallback || !data.questions || data.questions.length === 0) {
        alert(`AI question generation failed.\n\nReason: ${data.error || "Unknown error"}`);
        setStarted(false); clearInterval(msgInterval); setLoading(false); return;
      }
      setQuestions(data.questions);
    } catch {
      alert("Could not connect to backend.\n\nMake sure the FastAPI server is running:\n  uvicorn main:app --reload");
      setStarted(false); clearInterval(msgInterval); setLoading(false); return;
    }
    clearInterval(msgInterval);
    setCurrentIndex(0); setScore(0); setAttempted(0); setStopped(false);
    setTime(60); setSelected(null); setAnswerRevealed(false);
    setSavedToDb(false); setSessionAnswers([]); sessionAnswersRef.current = [];
    setQuizStartTime(Date.now()); setLoading(false);
  };

  useEffect(() => { if (started) fetchQuestions(); }, [started]);

  const recordAnswer = useCallback((selectedOpt, idx, qs) => {
    if (!qs[idx]) return;
    const q = qs[idx];
    const entry = {
      question_number: idx + 1,
      question: q.question,
      options: q.options,
      correct: q.correct,
      selected: selectedOpt,
      is_correct: selectedOpt === q.correct,
    };
    sessionAnswersRef.current = [...sessionAnswersRef.current, entry];
    setSessionAnswers([...sessionAnswersRef.current]);
  }, []);

  const moveNext = useCallback((idx, qs) => {
    clearInterval(timerRef.current);
    setTimeout(() => {
      if (idx + 1 < qs.length) {
        setCurrentIndex(idx + 1); setSelected(null); setAnswerRevealed(false); setTime(60);
      } else {
        setStopped(true);
      }
    }, 1400);
  }, []);

  useEffect(() => {
    if (!started || stopped || loading || answerRevealed) return;
    if (time === 0) {
      recordAnswer(null, currentIndex, questions);
      moveNext(currentIndex, questions);
      return;
    }
    timerRef.current = setInterval(() => setTime((p) => p - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [time, started, stopped, loading, answerRevealed]);

  const handleAnswer = (opt) => {
    if (selected) return;
    clearInterval(timerRef.current);
    const correct = questions[currentIndex].correct;
    setSelected(opt); setAnswerRevealed(true); setAttempted((p) => p + 1);
    if (opt === correct) setScore((p) => p + 1);
    recordAnswer(opt, currentIndex, questions);
    moveNext(currentIndex, questions);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    setTopic(text.slice(0, 400)); setFileUploaded(true);
  };

  const saveResult = useCallback(async (finalScore, finalAttempted, finalAnswers) => {
    if (savedToDb) return;
    setSavedToDb(true);
    const pct = finalAttempted ? Math.round((finalScore / finalAttempted) * 100) : 0;
    const timeTaken = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
    try {
      await fetch(`${API_BASE}/save-result`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, topic, difficulty, score: finalScore, attempted: finalAttempted, correct: finalScore, percentage: pct, total_questions: questions.length, time_taken: timeTaken, answers: finalAnswers }),
      });
    } catch (err) { console.error("Save result failed:", err); }
  }, [username, topic, difficulty, questions.length, quizStartTime, savedToDb]);

  useEffect(() => {
    if (stopped && !savedToDb) saveResult(score, attempted, sessionAnswersRef.current);
  }, [stopped]);

  if (!username) return <UsernameScreen onEnter={handleUsernameEnter} />;

  // ---- Result screen ----
  if (stopped) {
    const pct = attempted ? Math.round((score / attempted) * 100) : 0;
    const grade = getGradeInfo(score, attempted);
    const suggestions = getSuggestions(topic, pct);
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <Particles />
        <AnimatePresence>
          {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
          {showReview && <AnswerReviewModal answers={sessionAnswers} topic={topic} onClose={() => setShowReview(false)} />}
          {showHistory && <HistoryPanel username={username} onClose={() => setShowHistory(false)} />}
        </AnimatePresence>
        <motion.div className="result-card" initial={{ scale: 0.6, opacity: 0, y: 60 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
          <motion.div className={`grade-banner bg-gradient-to-r ${grade.color}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <h2 className="grade-title">{grade.title}</h2>
          </motion.div>
          <div className="result-body">
            <motion.p className="grade-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>{grade.msg}</motion.p>
            <div className="score-row">
              <ScoreStat label="Score" value={`${score}/${attempted}`} delay={0.6} />
              <ScoreStat label="Correct" value={score} delay={0.7} />
              <ScoreStat label="Wrong" value={attempted - score} delay={0.8} />
              <ScoreStat label="Accuracy" value={`${pct}%`} delay={0.9} />
            </div>
            <motion.div className="acc-bar-wrap" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1, duration: 0.8 }}>
              <div className="acc-bar-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #06b6d4, #8b5cf6)" }} />
            </motion.div>
            <motion.div className="db-saved-badge" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05 }}>
              <span className="db-dot" /> Result saved to MongoDB for @{username}
            </motion.div>
            <motion.div className="suggestions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
              <h3 className="sug-title">Suggestions</h3>
              {suggestions.map((s, i) => <p key={i} className="sug-item">— {s}</p>)}
            </motion.div>
            <motion.div className="result-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
              <button className="review-answers-btn" onClick={() => setShowReview(true)}>Check Answers</button>
              <button className="insights-btn" onClick={() => setShowStats(true)}>View Insights</button>
            </motion.div>
            <motion.div className="result-actions" style={{ marginTop: "0.6rem" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
              <button className="history-btn" onClick={() => setShowHistory(true)}>My History</button>
              <button className="restart-btn" onClick={() => { setStarted(false); setStopped(false); setQuestions([]); setSessionAnswers([]); sessionAnswersRef.current = []; }}>Play Again</button>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} style={{ marginTop: "0.7rem" }}>
              <button className="home-btn" onClick={() => { setStarted(false); setStopped(false); setQuestions([]); setSessionAnswers([]); sessionAnswersRef.current = []; setTopic(""); }}>
                Back to Home
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- Quiz screen ----
  if (started) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <Particles />
        {loading ? (
          <motion.div className="loader-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="orbit-loader">
              <div className="orbit-ring" /><div className="orbit-ring ring2" />
              <div className="orbit-core">AI</div>
            </div>
            <p className="loader-text">{loadingMsg}</p>
            <p className="loader-sub">Powered by OpenRouter — {difficulty} mode</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={currentIndex} className="quiz-card" initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -80, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 22 }}>
              <div className="quiz-topbar">
                <div className="score-pill">{score}/{attempted}</div>
                <CircularTimer time={time} />
                <div className="qnum-pill">Q {currentIndex + 1}/{questions.length}</div>
              </div>
              <div className="prog-track">
                <motion.div className="prog-fill" animate={{ width: `${(currentIndex / questions.length) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
              <motion.h2 className="quiz-question" key={`q-${currentIndex}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                {questions[currentIndex]?.question}
              </motion.h2>
              <div className="options-grid">
                {questions[currentIndex]?.options.map((opt, i) => {
                  const isCorrect = opt === questions[currentIndex].correct;
                  const isSelected = opt === selected;
                  let optClass = "option-btn";
                  if (answerRevealed) {
                    if (isCorrect) optClass += " correct";
                    else if (isSelected) optClass += " wrong";
                    else optClass += " dim";
                  }
                  return (
                    <motion.button key={i} className={optClass} onClick={() => handleAnswer(opt)} disabled={!!selected}
                      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                      whileHover={!selected ? { scale: 1.03 } : {}} whileTap={!selected ? { scale: 0.97 } : {}}>
                      <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                      <span className="opt-text">{opt}</span>
                      {answerRevealed && isCorrect && <span className="opt-icon">correct</span>}
                      {answerRevealed && isSelected && !isCorrect && <span className="opt-icon">wrong</span>}
                    </motion.button>
                  );
                })}
              </div>
              <motion.button className="stop-btn" onClick={() => setStopped(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>Stop Quiz</motion.button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    );
  }

  // ---- Start screen ----
  return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <Particles />
      <AnimatePresence>
        {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
        {showHistory && <HistoryPanel username={username} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>
      <motion.div className="start-card" initial={{ scale: 0.85, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 110, damping: 16 }}>
        <div className="start-top-actions">
          <motion.button className="top-action-btn" onClick={() => setShowHistory(true)} whileHover={{ scale: 1.08 }} title="My History" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>History</motion.button>
          <motion.button className="top-action-btn" onClick={() => setShowStats(true)} whileHover={{ scale: 1.08 }} title="View Insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>Stats</motion.button>
        </div>
        <motion.div className="brand" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="brand-icon">&#9889;</div>
          <h1 className="brand-title">QuizVerse <span className="brand-ai">AI</span></h1>
          <p className="brand-sub">Welcome back, <span className="brand-user">@{username}</span></p>
        </motion.div>
        <motion.div className="input-group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <label className="field-label">Topic</label>
          <div className="topic-row">
            <input type="text" placeholder={fileUploaded ? "Topic extracted from file" : "Type or speak a topic"} className={`topic-input ${fileUploaded ? "file-mode" : ""}`} value={topic} onChange={(e) => { setTopic(e.target.value); setFileUploaded(false); }} disabled={fileUploaded} />
            <motion.button className={`mic-btn ${listening ? "mic-active" : ""}`} onClick={startVoice} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }} title="Speak your topic">{listening ? "..." : "mic"}</motion.button>
          </div>
          {listening && <p className="mic-hint">Listening — speak now</p>}
        </motion.div>
        <motion.div className="input-group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <label className="field-label">Upload File <span className="field-hint">(PDF / TXT / Doc)</span></label>
          <label className="file-upload-label">
            <input type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden-file" />
            <span className="file-upload-btn">{fileUploaded ? "File loaded — clear topic to retype" : "Choose File"}</span>
          </label>
        </motion.div>
        <motion.div className="input-group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <label className="field-label">Quick Pick</label>
          <div className="topic-chips">
            {EXAMPLE_TOPICS.map((t) => (
              <motion.button key={t.value} className={`chip ${topic === t.value ? "chip-active" : ""}`} onClick={() => { setTopic(t.value); setFileUploaded(false); }} whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.95 }}>{t.label}</motion.button>
            ))}
          </div>
        </motion.div>
        <motion.div className="input-group" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <label className="field-label">Difficulty</label>
          <div className="diff-row">
            {["easy", "medium", "hard"].map((d) => (
              <motion.button key={d} className={`diff-btn ${difficulty === d ? `diff-active diff-${d}` : ""}`} onClick={() => setDifficulty(d)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </motion.button>
            ))}
          </div>
        </motion.div>
        <motion.button className="start-btn" onClick={() => { if (!topic.trim()) { alert("Please enter a topic!"); return; } setStarted(true); }} whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(99,102,241,0.7)" }} whileTap={{ scale: 0.97 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
          <span>Start Quiz</span>
        </motion.button>
        <motion.button className="logout-btn" onClick={handleLogout} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}>
          Switch User
        </motion.button>
      </motion.div>
    </div>
  );
}

function ScoreStat({ label, value, delay }) {
  return (
    <motion.div className="score-stat" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: "spring", stiffness: 200 }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}
