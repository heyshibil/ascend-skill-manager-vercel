import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { Edit3, X, Save, Plus, Trash2 } from "lucide-react";
import { adminService } from "../../services/adminServices";
import { toast } from "sonner";
import { CustomSelect } from "../ui/CustomSelect";

function buildForm(q) {
  const base = {
    skill: q.skill,
    level: q.level,
    topic: q.topic,
    question: q.question,
  };
  if (q.type === "mcq") {
    return {
      ...base,
      type: "mcq",
      options: [...q.options],
      correctAnswerIndex: q.correctAnswerIndex,
    };
  }
  return {
    ...base,
    type: "code",
    starterCode: q.starterCode || "",
    validationScript: q.validationScript || "",
    testCases: (q.testCases || []).map((tc) => ({ ...tc })),
  };
}

export default function EditQuestionModal({ question, onClose, onSaved }) {
  const [formData, setFormData] = useState(() => buildForm(question));
  const [submitting, setSubmitting] = useState(false);

  if (!question) return null;

  const inputClass =
    "w-full border rounded-[var(--radius-md)] px-3 py-2 text-[14px] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.updateQuestion(question._id, formData);
      toast.success("Question updated successfully");
      onSaved();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update question",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptionChange = (idx, value) => {
    const opts = [...formData.options];
    opts[idx] = value;
    setFormData({ ...formData, options: opts });
  };

  const handleTestCaseChange = (idx, field, value) => {
    const tcs = [...formData.testCases];
    tcs[idx] = { ...tcs[idx], [field]: value };
    setFormData({ ...formData, testCases: tcs });
  };

  const addTestCase = () =>
    setFormData({
      ...formData,
      testCases: [...formData.testCases, { input: "", output: "" }],
    });

  const removeTestCase = (idx) =>
    setFormData({
      ...formData,
      testCases: formData.testCases.filter((_, i) => i !== idx),
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="rounded-[var(--radius-xl)] w-full max-w-[700px] my-auto"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--bg-raised)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-[var(--warning)]" />
            <h2 className="text-[15px] font-medium text-[var(--text-primary)]">
              Edit question
            </h2>
            <code
              className="text-[12px] text-[var(--text-tertiary)] px-2 py-0.5 rounded-[var(--radius-sm)] border font-[var(--font-mono)]"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border-subtle)",
              }}
            >
              {question.questionId}
            </code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {/* ── Base fields: skill / level / topic ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Skill
              </label>
              <input
                type="text"
                value={formData.skill}
                onChange={(e) =>
                  setFormData({ ...formData, skill: e.target.value })
                }
                className={inputClass}
                style={{
                  background: "var(--bg-raised)",
                  borderColor: "var(--border-base)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <CustomSelect
              label="Level"
              value={formData.level}
              onChange={(val) => setFormData({ ...formData, level: val })}
              options={[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Topic
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) =>
                  setFormData({ ...formData, topic: e.target.value })
                }
                className={inputClass}
                style={{
                  background: "var(--bg-raised)",
                  borderColor: "var(--border-base)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>

          {/* ── Question text ── */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[var(--text-secondary)]">
              {formData.type === "mcq" ? "Question text" : "Problem statement"}
            </label>
            <textarea
              rows={3}
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              className={inputClass + " resize-none"}
              style={{
                background: "var(--bg-raised)",
                borderColor: "var(--border-base)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* ── MCQ specific ── */}
          {formData.type === "mcq" && (
            <div className="flex flex-col gap-3">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Answer options & correct key
              </label>
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={formData.correctAnswerIndex === idx}
                    onChange={() =>
                      setFormData({ ...formData, correctAnswerIndex: idx })
                    }
                    className="w-4 h-4 accent-[var(--success)] cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 border rounded-[var(--radius-md)] px-3 py-2 text-[14px] outline-none transition-all focus:border-[var(--accent)]"
                    style={{
                      background: "var(--bg-raised)",
                      borderColor: "var(--border-base)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Code specific ── */}
          {formData.type === "code" && (
            <div className="flex flex-col gap-5">
              {/* Starter code */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Starter code (sent to user)
                </label>
                <div
                  className="rounded-[var(--radius-lg)] overflow-hidden border"
                  style={{ borderColor: "var(--border-base)" }}
                >
                  <CodeMirror
                    value={formData.starterCode}
                    height="130px"
                    extensions={[javascript()]}
                    onChange={(val) =>
                      setFormData({ ...formData, starterCode: val })
                    }
                    theme="light"
                  />
                </div>
              </div>

              {/* Validation script */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Validation script (hidden)
                </label>
                <div
                  className="rounded-[var(--radius-lg)] overflow-hidden border"
                  style={{ borderColor: "var(--border-base)" }}
                >
                  <CodeMirror
                    value={formData.validationScript}
                    height="130px"
                    extensions={[javascript()]}
                    onChange={(val) =>
                      setFormData({ ...formData, validationScript: val })
                    }
                    theme="light"
                  />
                </div>
              </div>

              {/* Test cases */}
              <div
                className="pt-4 border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[14px] font-medium text-[var(--text-primary)]">
                    Test cases
                  </label>
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)] px-3 py-1.5 rounded-[var(--radius-md)]"
                    style={{ background: "var(--accent-bg)" }}
                  >
                    <Plus className="w-4 h-4" /> Add test
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {formData.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border"
                      style={{
                        background: "var(--bg-raised)",
                        borderColor: "var(--border-subtle)",
                      }}
                    >
                      <span className="text-[12px] text-[var(--text-tertiary)] font-medium w-5 text-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder="Input"
                        value={tc.input}
                        onChange={(e) =>
                          handleTestCaseChange(idx, "input", e.target.value)
                        }
                        className="flex-1 border rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-[var(--font-mono)] outline-none focus:border-[var(--accent)]"
                        style={{
                          background: "var(--bg-surface)",
                          borderColor: "var(--border-base)",
                          color: "var(--text-primary)",
                        }}
                      />
                      <span className="text-[var(--text-tertiary)] text-[12px]">
                        →
                      </span>
                      <input
                        type="text"
                        placeholder="Output"
                        value={tc.output}
                        onChange={(e) =>
                          handleTestCaseChange(idx, "output", e.target.value)
                        }
                        className="flex-1 border rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-[var(--font-mono)] outline-none focus:border-[var(--accent)]"
                        style={{
                          background: "var(--bg-surface)",
                          borderColor: "var(--border-base)",
                          color: "var(--text-primary)",
                        }}
                      />
                      {formData.testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(idx)}
                          className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-[var(--radius-sm)] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div
            className="flex gap-3 justify-end pt-4 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 rounded-[var(--radius-md)] text-[14px] font-medium border transition-colors hover:bg-[var(--bg-raised)]"
              style={{
                color: "var(--text-primary)",
                borderColor: "var(--border-base)",
                background: "transparent",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 h-9 rounded-[var(--radius-md)] font-medium text-[14px] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ background: "var(--warning)" }}
            >
              <Save className="w-4 h-4" />
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
