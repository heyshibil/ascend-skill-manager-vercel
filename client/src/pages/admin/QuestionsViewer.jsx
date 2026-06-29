import React, { useState, useEffect } from "react";
import {
  Search,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { adminService } from "../../services/adminServices";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EditQuestionModal from "../../components/admin/EditQuestionModal";
import SelectDropdown from "../../components/ui/SelectDropdown";

// ── QuestionDetails ────────────────────────────────────────────────────────────
// Renders the full expanded detail panel below a question row.
function QuestionDetails({ question }) {
  const labelClass =
    "text-[11px] font-medium text-[var(--text-tertiary)] tracking-[0.02em] uppercase mb-1.5 block";
  const valueClass = "text-[14px] text-[var(--text-primary)] leading-relaxed";

  return (
    <div className="flex flex-col gap-5">
      {/* Full question text */}
      <div>
        <span className={labelClass}>Full question</span>
        <p className={valueClass}>{question.question}</p>
      </div>

      {/* MCQ options */}
      {question.type === "mcq" && (
        <div>
          <span className={labelClass}>Options</span>
          <div className="flex flex-col gap-2 mt-1">
            {question.options.map((opt, idx) => {
              const isCorrect = idx === question.correctAnswerIndex;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[13px] border"
                  style={{
                    background: isCorrect
                      ? "var(--success-bg)"
                      : "var(--bg-surface)",
                    color: isCorrect
                      ? "var(--success)"
                      : "var(--text-secondary)",
                    borderColor: isCorrect
                      ? "var(--success)"
                      : "var(--border-subtle)",
                  }}
                >
                  <span className="font-mono font-semibold w-5 text-center flex-shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isCorrect && (
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "var(--success)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Code fields */}
      {question.type === "code" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <span className={labelClass}>Starter code</span>
            <pre
              className="text-[13px] font-[var(--font-mono)] p-3 rounded-[var(--radius-md)] overflow-x-auto leading-relaxed"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-base)",
                color: "var(--text-secondary)",
              }}
            >
              {question.starterCode || "—"}
            </pre>
          </div>
          <div>
            <span className={labelClass}>
              Test cases ({question.testCases?.length ?? 0})
            </span>
            <div className="flex flex-col gap-2">
              {(question.testCases || []).map((tc, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[13px] font-[var(--font-mono)] border"
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-base)",
                  }}
                >
                  <span className="text-[var(--text-tertiary)] w-5 text-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[var(--accent)] flex-1 truncate">
                    {tc.input || "—"}
                  </span>
                  <span className="text-[var(--text-tertiary)]">→</span>
                  <span className="text-[var(--success)] flex-1 truncate">
                    {tc.output || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Meta row */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-3 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {[
          ["Skill", question.skill],
          ["Level", question.level],
          ["Topic", question.topic],
          [
            "Added",
            question.createdAt
              ? new Date(question.createdAt).toLocaleDateString()
              : "—",
          ],
        ].map(([key, val]) => (
          <span key={key} className="text-[12px] text-[var(--text-tertiary)]">
            {key}:{" "}
            <span className="text-[var(--text-secondary)] font-medium capitalize">
              {val}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QuestionsViewer() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [filters, setFilters] = useState({ type: "", level: "" });
  const [sortBy, setSortBy] = useState("newest");
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  // UI state
  const [expandedId, setExpandedId] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);

  // Two separate confirm targets — intentionally kept distinct
  const [softDeleteTarget, setSoftDeleteTarget] = useState(null); // { question, nextIsHidden }
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null); // question

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAllQuestions({
        page: pagination.page,
        search: search || undefined,
        showHidden: showHidden ? "true" : undefined,
        type: filters.type || undefined,
        level: filters.level || undefined,
        sort: sortBy,
      });
      setQuestions(res?.data?.questions || []);
      setPagination(res?.data?.pagination ?? { page: 1, pages: 1, total: 0 });
    } catch {
      toast.error("Failed to load questions");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters, showHidden, sortBy]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    if (e.key === "Enter") {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchQuestions();
    }
  };

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const confirmSoftDelete = async () => {
    if (!softDeleteTarget) return;
    const { question, nextIsHidden } = softDeleteTarget;
    try {
      await adminService.toggleQuestionVisibility(question._id, nextIsHidden);
      toast.success(
        nextIsHidden ? "Question hidden from users" : "Question is now visible",
      );
      // Optimistic local update — no full refetch needed
      setQuestions((prev) =>
        prev.map((q) =>
          q._id === question._id ? { ...q, isHidden: nextIsHidden } : q,
        ),
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update visibility",
      );
    } finally {
      setSoftDeleteTarget(null);
    }
  };

  const confirmHardDelete = async () => {
    if (!hardDeleteTarget) return;
    try {
      await adminService.deleteQuestion(hardDeleteTarget._id);
      toast.success("Question permanently deleted");
      // Remove from local list immediately
      setQuestions((prev) =>
        prev.filter((q) => q._id !== hardDeleteTarget._id),
      );
      if (expandedId === hardDeleteTarget._id) setExpandedId(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to delete question",
      );
    } finally {
      setHardDeleteTarget(null);
    }
  };

  const handleEditSaved = () => {
    setEditQuestion(null);
    fetchQuestions();
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const filterBtnClass = (active) =>
    `px-3 h-8 rounded-[var(--radius-md)] text-[13px] font-medium border transition-colors ${
      active
        ? "text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-bg)]"
        : "text-[var(--text-secondary)] border-[var(--border-base)] hover:bg-[var(--bg-raised)]"
    }`;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[var(--accent)]" />
            Question viewer
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-1">
            Browse, edit, and manage all seeded questions.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Show hidden toggle */}
          <button
            onClick={() => {
              setShowHidden((prev) => !prev);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="flex items-center gap-2 px-3 h-10 rounded-[var(--radius-md)] border text-[13px] font-medium transition-colors"
            style={{
              borderColor: showHidden ? "var(--warning)" : "var(--border-base)",
              background: showHidden ? "var(--warning-bg)" : "transparent",
              color: showHidden ? "var(--warning)" : "var(--text-secondary)",
            }}
          >
            {showHidden ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            {showHidden ? "Showing hidden" : "Show hidden"}
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search questions..."
              className="pl-9 pr-4 h-10 w-[260px] bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-[var(--radius-md)] text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors"
              style={{ color: "var(--text-primary)" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-[var(--text-tertiary)] mr-1">
          Type:
        </span>
        {[
          { label: "All", value: "" },
          { label: "MCQ", value: "mcq" },
          { label: "Code", value: "code" },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setFilters((f) => ({ ...f, type: value }));
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={filterBtnClass(filters.type === value)}
          >
            {label}
          </button>
        ))}

        <span className="text-[12px] font-medium text-[var(--text-tertiary)] ml-4 mr-1">
          Level:
        </span>
        {[
          { label: "All", value: "" },
          { label: "Beginner", value: "beginner" },
          { label: "Intermediate", value: "intermediate" },
          { label: "Advanced", value: "advanced" },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setFilters((f) => ({ ...f, level: value }));
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={filterBtnClass(filters.level === value)}
          >
            {label}
          </button>
        ))}

        <span className="text-[12px] font-medium text-[var(--text-tertiary)] ml-4 mr-1">
          Sort:
        </span>
        <SelectDropdown
          options={[
            { value: "newest", label: "Newest" },
            { value: "old", label: "Oldest" },
            { value: "verified", label: "Verified" },
            { value: "unverified", label: "Unverified" },
          ]}
          value={sortBy}
          onChange={(val) => {
            setSortBy(val);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          placeholder="Sort by"
          className="min-w-[130px]"
        />

        {(filters.type || filters.level || showHidden || sortBy !== "newest") && (
          <button
            onClick={() => {
              setFilters({ type: "", level: "" });
              setShowHidden(false);
              setSortBy("newest");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="ml-2 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="border-b"
                style={{
                  background: "var(--bg-raised)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <th className="px-6 py-4 text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap">
                  Question ID
                </th>
                <th className="px-6 py-4 text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-6 py-4 text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap">
                  Type
                </th>
                <th className="px-6 py-4 text-[12px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-subtle)]">
              {/* Loading skeleton — matches UsersManagement pattern */}
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="4" className="px-6 py-5">
                      <div className="flex gap-4 items-center">
                        <div
                          className="h-5 w-32 rounded"
                          style={{ background: "var(--bg-raised)" }}
                        />
                        <div
                          className="h-4 flex-1 rounded"
                          style={{ background: "var(--bg-raised)" }}
                        />
                        <div
                          className="h-4 w-16 rounded"
                          style={{ background: "var(--bg-raised)" }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : questions.length === 0 ? (
                /* Empty state */
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-20 text-center text-[var(--text-tertiary)] text-[14px]"
                  >
                    No questions found.
                  </td>
                </tr>
              ) : (
                questions.map((question) => {
                  const isExpanded = expandedId === question._id;
                  const isHidden = question.isHidden;

                  return (
                    <React.Fragment key={question._id}>
                      {/* ── Summary row ── */}
                      <tr
                        className="hover:bg-[var(--bg-raised)] transition-colors"
                        style={{ opacity: isHidden ? 0.55 : 1 }}
                      >
                        {/* questionId */}
                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-2">
                            <code
                              className="text-[12px] px-2 py-1 rounded-[var(--radius-sm)] border font-[var(--font-mono)]"
                              style={{
                                background: "var(--bg-raised)",
                                borderColor: "var(--border-subtle)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {question.questionId}
                            </code>
                            {isHidden && (
                              <span
                                className="text-[11px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)]"
                                style={{
                                  background: "var(--warning-bg)",
                                  color: "var(--warning)",
                                }}
                              >
                                Hidden
                              </span>
                            )}
                            {question.isVerified && (
                              <span
                                className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-sm)] flex items-center gap-1"
                                style={{
                                  background: "var(--success-bg)",
                                  color: "var(--success)",
                                }}
                              >
                                <ShieldCheck className="w-3 h-3" /> Verified
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Preview — truncated, never overflows */}
                        <td className="px-6 py-4 max-w-[340px] align-middle">
                          <p className="text-[14px] text-[var(--text-primary)] truncate">
                            {question.question}
                          </p>
                          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 truncate">
                            {question.skill} · {question.topic}
                          </p>
                        </td>

                        {/* Type + Level */}
                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                          <div className="flex flex-col gap-1">
                            <span
                              className="px-2 py-0.5 text-[12px] font-medium rounded-[var(--radius-sm)] self-start"
                              style={{
                                background:
                                  question.type === "mcq"
                                    ? "var(--accent-bg)"
                                    : "var(--warning-bg)",
                                color:
                                  question.type === "mcq"
                                    ? "var(--accent)"
                                    : "var(--warning)",
                              }}
                            >
                              {question.type === "mcq" ? "MCQ" : "Code"}
                            </span>
                            <span className="text-[11px] text-[var(--text-tertiary)] capitalize">
                              {question.level}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Run — code questions only */}
                            {question.type === "code" && (
                              <button
                                onClick={() =>
                                  navigate(
                                    `/admin/questions/run?id=${question.questionId}`,
                                  )
                                }
                                title="Open in Run Code page"
                                className="px-2 py-1 flex items-center gap-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] border transition-colors text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-bg)]"
                                style={{ borderColor: "var(--border-base)" }}
                              >
                                <Play className="w-3 h-3" /> Run
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => setEditQuestion(question)}
                              title="Edit question"
                              className="px-2 py-1 flex items-center gap-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] border transition-colors text-[var(--text-secondary)] hover:text-[var(--warning)] hover:bg-[var(--warning-bg)]"
                              style={{ borderColor: "var(--border-base)" }}
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>

                            {/* Soft delete toggle: Hide / Show */}
                            <button
                              onClick={() =>
                                setSoftDeleteTarget({
                                  question,
                                  nextIsHidden: !isHidden,
                                })
                              }
                              title={
                                isHidden
                                  ? "Make visible to users"
                                  : "Hide from users"
                              }
                              className="px-2 py-1 flex items-center gap-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] border transition-colors"
                              style={{
                                borderColor: "var(--border-base)",
                                color: isHidden
                                  ? "var(--success)"
                                  : "var(--text-secondary)",
                                background: isHidden
                                  ? "var(--success-bg)"
                                  : "transparent",
                              }}
                            >
                              {isHidden ? (
                                <>
                                  <Eye className="w-3 h-3" /> Show
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" /> Hide
                                </>
                              )}
                            </button>

                            {/* Hard delete */}
                            <button
                              onClick={() => setHardDeleteTarget(question)}
                              title="Permanently delete"
                              className="px-2 py-1 flex items-center gap-1 text-[12px] font-medium rounded-[var(--radius-sm)] border transition-colors text-[var(--text-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)]"
                              style={{ borderColor: "var(--border-base)" }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Expand toggle */}
                            <button
                              onClick={() => toggleExpand(question._id)}
                              title={isExpanded ? "Collapse" : "View details"}
                              className="px-2 py-1 flex items-center gap-1 text-[12px] font-medium rounded-[var(--radius-sm)] border transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
                              style={{
                                borderColor: isExpanded
                                  ? "var(--accent)"
                                  : "var(--border-base)",
                                background: isExpanded
                                  ? "var(--accent-bg)"
                                  : "transparent",
                                color: isExpanded
                                  ? "var(--accent)"
                                  : undefined,
                              }}
                            >
                              <ChevronDown
                                className="w-3.5 h-3.5 transition-transform duration-200"
                                style={{
                                  transform: isExpanded
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                                }}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Detail row (expanded) ── */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-5 border-t"
                            style={{
                              background: "var(--bg-raised)",
                              borderColor: "var(--border-subtle)",
                            }}
                          >
                            <QuestionDetails question={question} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination — matches UsersManagement exactly ── */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{
            background: "var(--bg-raised)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <p className="text-[13px] text-[var(--text-tertiary)]">
            Showing{" "}
            <span className="font-medium text-[var(--text-secondary)]">
              {questions.length}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[var(--text-secondary)]">
              {pagination.total}
            </span>{" "}
            questions
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page === 1 || loading}
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page - 1 }))
              }
              className="p-1.5 rounded-[var(--radius-md)] border border-[var(--border-base)] disabled:opacity-50 hover:bg-[var(--bg-surface)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-medium px-3 text-[var(--text-secondary)]">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={pagination.page === pagination.pages || loading}
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page + 1 }))
              }
              className="p-1.5 rounded-[var(--radius-md)] border border-[var(--border-base)] disabled:opacity-50 hover:bg-[var(--bg-surface)] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Edit modal ── */}
      {editQuestion && (
        <EditQuestionModal
          question={editQuestion}
          onClose={() => setEditQuestion(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── Soft delete confirmation ── */}
      <ConfirmModal
        isOpen={Boolean(softDeleteTarget)}
        onClose={() => setSoftDeleteTarget(null)}
        onConfirm={confirmSoftDelete}
        type="warning"
        title={
          softDeleteTarget?.nextIsHidden
            ? "Hide this question?"
            : "Show this question?"
        }
        message={
          softDeleteTarget?.nextIsHidden
            ? "This question will be hidden from users. It stays in the database and can be re-enabled anytime."
            : "This question will be visible again and served to users in tests."
        }
        confirmText={
          softDeleteTarget?.nextIsHidden ? "Yes, hide it" : "Yes, show it"
        }
        cancelText="Cancel"
      />

      {/* ── Hard delete confirmation ── */}
      <ConfirmModal
        isOpen={Boolean(hardDeleteTarget)}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={confirmHardDelete}
        type="danger"
        title="Permanently delete question?"
        message={`"${hardDeleteTarget?.questionId}" will be removed from the database forever. This action cannot be undone.`}
        confirmText="Delete permanently"
        cancelText="Cancel"
      />
    </div>
  );
}
