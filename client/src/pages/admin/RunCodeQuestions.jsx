import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  ShieldOff,
  AlertCircle,
  Clock,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { adminService } from "../../services/adminServices";
import EditQuestionModal from "../../components/admin/EditQuestionModal";
import SelectDropdown from "../../components/ui/SelectDropdown";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

// ── Filter option constants ───────────────────────────────────────────────────
const VISIBILITY_OPTIONS = [
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
];

const VERIFIED_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "true", label: "Verified" },
  { value: "false", label: "Unverified" },
];

const SKILL_OPTIONS = [
  { value: "", label: "All skills" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "node.js", label: "Node.js" },
  { value: "react", label: "React" },
  { value: "mongodb", label: "MongoDB" },
];

const LEVEL_OPTIONS = [
  { value: "", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const LEVEL_COLORS = {
  beginner: { bg: "var(--success-bg)", color: "var(--success)" },
  intermediate: { bg: "var(--warning-bg)", color: "var(--warning)" },
  advanced: { bg: "var(--danger-bg)", color: "var(--danger)" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
// filters: { visibility, verified, skill, level }
function buildFilterParams(filters, search, page) {
  const params = { type: "code", limit: 30, page };
  if (search.trim()) params.search = search.trim();
  if (filters.visibility === "hidden") params.showHidden = "true";
  // verified: send "true" or "false" string; empty means no filter
  if (filters.verified === "true") params.isVerified = "true";
  if (filters.verified === "false") params.isVerified = "false";
  if (filters.skill) params.skill = filters.skill;
  if (filters.level) params.level = filters.level;
  return params;
}


// ── QuestionCard ──────────────────────────────────────────────────────────────
function QuestionCard({ question, isSelected, onClick }) {
  const levelStyle = LEVEL_COLORS[question.level] || {};

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 border-b transition-colors"
      style={{
        borderColor: "var(--border-subtle)",
        background: isSelected ? "var(--accent-bg)" : "transparent",
        borderLeft: isSelected
          ? "2px solid var(--accent)"
          : "2px solid transparent",
      }}
    >
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <code
          className="text-[11px] font-[var(--font-mono)] px-1.5 py-0.5 rounded-[var(--radius-sm)] border shrink-0"
          style={{
            background: "var(--bg-raised)",
            borderColor: "var(--border-subtle)",
            color: isSelected ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          {question.questionId}
        </code>

        {question.isVerified && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] flex items-center gap-1 shrink-0"
            style={{ background: "var(--success-bg)", color: "var(--success)" }}
          >
            <ShieldCheck className="w-3 h-3" /> Verified
          </span>
        )}

        {question.isHidden && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] shrink-0"
            style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
          >
            Hidden
          </span>
        )}
      </div>

      <p
        className="text-[13px] leading-snug truncate mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {question.question || "—"}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {question.skill} · {question.topic}
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] capitalize"
          style={levelStyle}
        >
          {question.level}
        </span>
      </div>
    </button>
  );
}

// ── TestCaseRow ───────────────────────────────────────────────────────────────
function TestCaseRow({ result, index }) {
  return (
    <div
      className="rounded-[var(--radius-md)] border p-3"
      style={{
        borderColor: result.passed ? "var(--success)" : "var(--danger)",
        background: result.passed ? "var(--success-bg)" : "var(--danger-bg)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {result.passed ? (
          <CheckCircle2
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--success)" }}
          />
        ) : (
          <XCircle
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--danger)" }}
          />
        )}
        <span
          className="text-[12px] font-semibold"
          style={{ color: result.passed ? "var(--success)" : "var(--danger)" }}
        >
          Test {index + 1} — {result.passed ? "Passed" : "Failed"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1 text-[12px] font-[var(--font-mono)]">
        {[
          { label: "Input", value: result.input, color: "var(--text-secondary)" },
          { label: "Expected", value: result.expected, color: "var(--success)" },
          {
            label: "Got",
            value: result.actual,
            color: result.passed ? "var(--success)" : "var(--danger)",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex gap-2">
            <span
              className="shrink-0 w-16 text-right"
              style={{ color: "var(--text-tertiary)" }}
            >
              {label}:
            </span>
            <span style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EmptyRunPanel ─────────────────────────────────────────────────────────────
function EmptyRunPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-12">
      <div
        className="w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center"
        style={{ background: "var(--bg-raised)" }}
      >
        <Terminal
          className="w-6 h-6"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
      <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
        Select a code question to run it
      </p>
      <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
        Choose from the list on the left
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RunCodeQuestions() {
  const [searchParams, setSearchParams] = useSearchParams();

  // List state
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    visibility: "visible",
    verified: "",
    skill: "",
    level: "",
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Selected question & run panel
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [runCode, setRunCode] = useState("");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState(null);

  // UI state
  const [verifying, setVerifying] = useState(false);
  const [editQuestion, setEditQuestion] = useState(null);

  // Ref for auto-scrolling to results after run
  const resultsRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  // Note: `search` is passed explicitly so it is never stale inside the closure.
  const fetchQuestions = useCallback(
    async (page = pagination.page, currentSearch = search) => {
      try {
        setLoading(true);
        const params = buildFilterParams(filters, currentSearch, page);
        const res = await adminService.getAllQuestions(params);
        const loaded = res?.data?.questions || [];
        setQuestions(loaded);
        setPagination(
          res?.data?.pagination ?? { page: 1, pages: 1, total: 0 },
        );

        // If navigated here from QuestionsViewer with ?id=<questionId>, auto-select
        const targetId = searchParams.get("id");
        if (targetId && loaded.length > 0) {
          const match = loaded.find((q) => q.questionId === targetId);
          if (match) {
            setSelectedQuestion(match);
            setRunCode(match.starterCode || "");
            setRunResult(null);
            setRunError(null);
          } else {
            // Target not on this page — it may be hidden; try a direct ID search
            toast.info(`Question ${targetId} not found in visible questions.`);
          }
          // Clear the param so it doesn't persist on filter changes
          setSearchParams({}, { replace: true });
        }
      } catch {
        toast.error("Failed to load questions");
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters],
  );

  useEffect(() => {
    fetchQuestions(pagination.page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((p) => ({ ...p, page: 1 }));
    setSelectedQuestion(null);
    setRunResult(null);
    setRunError(null);
  };

  const handleSearchKey = (e) => {
    if (e.key === "Enter") {
      // Pass search value directly — avoids any stale closure issue
      setPagination((p) => ({ ...p, page: 1 }));
      fetchQuestions(1, search);
    }
  };

  // Clear search resets to page 1 and refetches with empty string
  const handleSearchClear = () => {
    setSearch("");
    setPagination((p) => ({ ...p, page: 1 }));
    fetchQuestions(1, "");
  };

  const handleSelectQuestion = (q) => {
    setSelectedQuestion(q);
    setRunCode(q.starterCode || "");
    setRunResult(null);
    setRunError(null);
  };

  const handleRun = async () => {
    if (!selectedQuestion || !runCode.trim()) return;
    setRunning(true);
    setRunResult(null);
    setRunError(null);
    try {
      const res = await adminService.adminRunCodeQuestion(
        selectedQuestion._id,
        runCode,
      );
      setRunResult(res.result);
    } catch (err) {
      setRunError(
        err?.response?.data?.message ||
          "Execution failed. Check server logs.",
      );
    } finally {
      setRunning(false);
      // Auto-scroll to results after a short paint delay
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const handleToggleVerified = async () => {
    if (!selectedQuestion) return;
    const next = !selectedQuestion.isVerified;
    setVerifying(true);
    try {
      await adminService.toggleQuestionVerified(selectedQuestion._id, next);
      toast.success(
        next ? "Question marked as verified" : "Verified status removed",
      );
      const updated = { ...selectedQuestion, isVerified: next };
      setSelectedQuestion(updated);
      setQuestions((prev) =>
        prev.map((q) => (q._id === selectedQuestion._id ? updated : q)),
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to update verified status",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleEditSaved = () => {
    setEditQuestion(null);
    fetchQuestions(pagination.page);
  };

  const allPassed =
    runResult &&
    runResult.passedCases === runResult.totalCases &&
    !runResult.timedOut;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // Outer: fixed-height column — does NOT scroll itself
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 112px)" }}
    >
      {/* ── Page header ── */}
      <div className="flex-none mb-5">
        <h1
          className="text-[24px] font-medium tracking-tight flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <Terminal className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Run code questions
        </h1>
        <p
          className="text-[14px] mt-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Test and verify code questions before making them available to users.
        </p>
      </div>

      {/* ── Split panel — fills remaining height ── */}
      <div
        className="flex-1 flex rounded-[var(--radius-lg)] overflow-hidden border min-h-0"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {/* ══ LEFT — Question list (independently scrollable) ══ */}
        <div
          className="w-[300px] shrink-0 flex flex-col border-r"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          {/* ── Filters + Search ── */}
          <div
            className="px-3 pt-3 pb-2.5 border-b flex flex-col gap-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {/* 2-column grid — dropdowns fill their cells (SelectDropdown button is now w-full) */}
            <div className="grid grid-cols-2 gap-1.5">
              <SelectDropdown
                options={VISIBILITY_OPTIONS}
                value={filters.visibility}
                onChange={(v) => handleFilterChange("visibility", v)}
                placeholder="Visibility"
                className="w-full"
              />
              <SelectDropdown
                options={VERIFIED_OPTIONS}
                value={filters.verified}
                onChange={(v) => handleFilterChange("verified", v)}
                placeholder="Any status"
                className="w-full"
              />
              <SelectDropdown
                options={SKILL_OPTIONS}
                value={filters.skill}
                onChange={(v) => handleFilterChange("skill", v)}
                placeholder="All skills"
                className="w-full"
              />
              <SelectDropdown
                options={LEVEL_OPTIONS}
                value={filters.level}
                onChange={(v) => handleFilterChange("level", v)}
                placeholder="All levels"
                className="w-full"
              />
            </div>

            {/* Search — full width below the grid */}
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "var(--text-tertiary)" }}
              />
              <input
                type="text"
                placeholder="Search ID, text, skill… ↵"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
                className="pl-8 h-8 w-full rounded-[var(--radius-md)] border text-[12px] outline-none focus:border-[var(--accent)] transition-colors"
                style={{
                  background: "var(--bg-raised)",
                  borderColor: "var(--border-base)",
                  color: "var(--text-primary)",
                  paddingRight: search ? "28px" : "8px",
                }}
              />
              {search && (
                <button
                  onClick={handleSearchClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ── Question list — scrolls independently ── */}
          <div
            className="flex-1 overflow-y-auto min-h-0"
            style={{ scrollbarColor: "var(--border-base) transparent", scrollbarWidth: "thin" }}
          >
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="px-4 py-3 border-b animate-pulse"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <div
                    className="h-4 w-24 rounded mb-2"
                    style={{ background: "var(--bg-raised)" }}
                  />
                  <div
                    className="h-3 w-full rounded mb-1"
                    style={{ background: "var(--bg-raised)" }}
                  />
                  <div
                    className="h-3 w-2/3 rounded"
                    style={{ background: "var(--bg-raised)" }}
                  />
                </div>
              ))
            ) : questions.length === 0 ? (
              <div
                className="p-8 text-center text-[13px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                No questions found.
              </div>
            ) : (
              questions.map((q) => (
                <QuestionCard
                  key={q._id}
                  question={q}
                  isSelected={selectedQuestion?._id === q._id}
                  onClick={() => handleSelectQuestion(q)}
                />
              ))
            )}
          </div>

          {/* ── Pagination ── */}
          <div
            className="px-3 py-2.5 border-t flex items-center justify-between flex-none"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-raised)",
            }}
          >
            <span
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {pagination.total} total
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page === 1 || loading}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
                className="p-1 rounded-[var(--radius-sm)] border border-[var(--border-base)] disabled:opacity-40 hover:bg-[var(--bg-surface)] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span
                className="text-[11px] font-medium px-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {pagination.page}/{pagination.pages}
              </span>
              <button
                disabled={pagination.page === pagination.pages || loading}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
                className="p-1 rounded-[var(--radius-sm)] border border-[var(--border-base)] disabled:opacity-40 hover:bg-[var(--bg-surface)] transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — Run panel (independently scrollable) ══ */}
        <div
          className="flex-1 flex flex-col min-w-0 min-h-0"
          style={{ background: "var(--bg-canvas)" }}
        >
          {!selectedQuestion ? (
            <EmptyRunPanel />
          ) : (
            <>
              {/* ── Sticky header with ALL actions incl. Run ── */}
              <div
                className="flex-none px-6 py-3.5 border-b flex items-center justify-between gap-4"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {/* Left: question meta */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <code
                    className="text-[12px] font-[var(--font-mono)] px-2 py-0.5 rounded-[var(--radius-sm)] border shrink-0"
                    style={{
                      background: "var(--bg-raised)",
                      borderColor: "var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {selectedQuestion.questionId}
                  </code>
                  <span
                    className="text-[11px] font-medium capitalize px-1.5 py-0.5 rounded-[var(--radius-sm)] shrink-0"
                    style={LEVEL_COLORS[selectedQuestion.level] || {}}
                  >
                    {selectedQuestion.level}
                  </span>
                  {selectedQuestion.isVerified ? (
                    <span
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] flex items-center gap-1 shrink-0"
                      style={{
                        background: "var(--success-bg)",
                        color: "var(--success)",
                      }}
                    >
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] shrink-0"
                      style={{
                        background: "var(--bg-raised)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      Unverified
                    </span>
                  )}
                  {selectedQuestion.isHidden && (
                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] flex items-center gap-1 shrink-0"
                      style={{
                        background: "var(--warning-bg)",
                        color: "var(--warning)",
                      }}
                    >
                      <EyeOff className="w-3 h-3" /> Hidden
                    </span>
                  )}
                  <span
                    className="text-[11px] shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {selectedQuestion.skill} · {selectedQuestion.topic}
                  </span>
                </div>

                {/* Right: action buttons incl. Run */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Edit */}
                  <button
                    onClick={() => setEditQuestion(selectedQuestion)}
                    title="Edit question"
                    className="flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-md)] border text-[12px] font-medium transition-colors text-[var(--text-secondary)] border-[var(--border-base)] hover:text-[var(--warning)] hover:bg-[var(--warning-bg)]"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>

                  {/* Verify toggle */}
                  <button
                    onClick={handleToggleVerified}
                    disabled={verifying}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-md)] border text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: selectedQuestion.isVerified
                        ? "var(--danger)"
                        : "var(--success)",
                      color: selectedQuestion.isVerified
                        ? "var(--danger)"
                        : "var(--success)",
                      background: selectedQuestion.isVerified
                        ? "var(--danger-bg)"
                        : "var(--success-bg)",
                    }}
                  >
                    {selectedQuestion.isVerified ? (
                      <>
                        <ShieldOff className="w-3.5 h-3.5" />
                        {verifying ? "Removing…" : "Remove verified"}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {verifying ? "Saving…" : "Mark verified"}
                      </>
                    )}
                  </button>

                  {/* ── Run button (top-right) ── */}
                  <button
                    onClick={handleRun}
                    disabled={running || !runCode.trim()}
                    className="flex items-center gap-1.5 px-4 h-8 rounded-[var(--radius-md)] text-[12px] font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "var(--accent)" }}
                  >
                    {running ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Running…
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Run
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ── Scrollable panel body ── */}
              <div
                className="flex-1 overflow-y-auto min-h-0 p-6 flex flex-col gap-6"
                style={{ scrollbarColor: "var(--border-base) transparent", scrollbarWidth: "thin" }}
              >
                {/* Problem statement */}
                <div>
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wide block mb-2"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Problem statement
                  </span>
                  <p
                    className="text-[14px] leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {selectedQuestion.question}
                  </p>
                </div>

                {/* Test cases (read-only) */}
                {selectedQuestion.testCases?.length > 0 && (
                  <div>
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide block mb-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Test cases ({selectedQuestion.testCases.length})
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {selectedQuestion.testCases.map((tc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[12px] font-[var(--font-mono)] border"
                          style={{
                            background: "var(--bg-surface)",
                            borderColor: "var(--border-base)",
                          }}
                        >
                          <span
                            className="shrink-0 w-5 text-center"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {idx + 1}
                          </span>
                          <span
                            className="flex-1 truncate"
                            style={{ color: "var(--accent)" }}
                          >
                            {tc.input || "—"}
                          </span>
                          <span style={{ color: "var(--text-tertiary)" }}>→</span>
                          <span
                            className="flex-1 truncate"
                            style={{ color: "var(--success)" }}
                          >
                            {tc.output || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code editor — CodeMirror (matches EditQuestionModal / QuestionsManager) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Code to run
                    </span>
                    <button
                      onClick={() =>
                        setRunCode(selectedQuestion.starterCode || "")
                      }
                      className="text-[11px] transition-colors hover:text-[var(--accent)]"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Reset to starter code
                    </button>
                  </div>
                  <div
                    className="rounded-[var(--radius-lg)] overflow-hidden border"
                    style={{ borderColor: "var(--border-base)" }}
                  >
                    <CodeMirror
                      value={runCode}
                      height="280px"
                      extensions={[javascript()]}
                      onChange={(val) => setRunCode(val)}
                      theme="light"
                    />
                  </div>
                </div>

                {/* Results anchor — auto-scrolled to after run */}
                <div ref={resultsRef} />

                {/* Result summary inline */}
                {runResult && !running && (
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[13px] font-medium"
                      style={{
                        color: allPassed ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {runResult.passedCases}/{runResult.totalCases} tests
                      passed
                    </span>
                    {runResult.timedOut && (
                      <span
                        className="text-[13px] font-medium flex items-center gap-1"
                        style={{ color: "var(--warning)" }}
                      >
                        <Clock className="w-3.5 h-3.5" /> Timed out
                      </span>
                    )}
                  </div>
                )}

                {/* Error block */}
                {runError && (
                  <div
                    className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] border"
                    style={{
                      background: "var(--danger-bg)",
                      borderColor: "var(--danger)",
                    }}
                  >
                    <AlertCircle
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: "var(--danger)" }}
                    />
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{ color: "var(--danger)" }}
                    >
                      {runError}
                    </p>
                  </div>
                )}

                {/* Results section */}
                {runResult && !running && (
                  <div>
                    {/* Summary bar */}
                    <div
                      className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] border mb-3"
                      style={{
                        background: allPassed
                          ? "var(--success-bg)"
                          : "var(--danger-bg)",
                        borderColor: allPassed
                          ? "var(--success)"
                          : "var(--danger)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {allPassed ? (
                          <CheckCircle2
                            className="w-5 h-5"
                            style={{ color: "var(--success)" }}
                          />
                        ) : (
                          <XCircle
                            className="w-5 h-5"
                            style={{ color: "var(--danger)" }}
                          />
                        )}
                        <span
                          className="text-[14px] font-semibold"
                          style={{
                            color: allPassed
                              ? "var(--success)"
                              : "var(--danger)",
                          }}
                        >
                          {allPassed
                            ? "All test cases passed!"
                            : `${runResult.passedCases} of ${runResult.totalCases} passed`}
                        </span>
                      </div>

                      {/* Inline verify shortcut when all pass */}
                      {allPassed && !selectedQuestion.isVerified && (
                        <button
                          onClick={handleToggleVerified}
                          disabled={verifying}
                          className="flex items-center gap-1.5 px-3 h-8 rounded-[var(--radius-md)] text-[12px] font-semibold text-white transition-opacity disabled:opacity-50"
                          style={{ background: "var(--success)" }}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {verifying ? "Saving…" : "Mark as verified"}
                        </button>
                      )}
                    </div>

                    {/* Per-test rows */}
                    <div className="flex flex-col gap-2">
                      {runResult.results.map((r, idx) => (
                        <TestCaseRow key={idx} result={r} index={idx} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit modal — reuses existing component + PATCH /:id */}
      {editQuestion && (
        <EditQuestionModal
          question={editQuestion}
          onClose={() => setEditQuestion(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}
