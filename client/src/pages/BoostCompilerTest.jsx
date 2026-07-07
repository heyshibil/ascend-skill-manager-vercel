import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import { verificationService } from "../services/verificationService";
import { SKILL_EDITOR_MAP } from "../utils/skillEditorMap";
import { useSkillStore } from "../store/useSkillStore";

// -- Skill : Editor config
const resolveEditorConfig = (skill) => {
  return SKILL_EDITOR_MAP[skill?.toLowerCase()] || SKILL_EDITOR_MAP.javascript;
};

export default function BoostCompilerTest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const skillName = searchParams.get("skill");
  const level = searchParams.get("level");

  // Resolve editor config from skill name
  const editorConfig = resolveEditorConfig(skillName);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [codeQuestion, setCodeQuestion] = useState(null);
  const [loadedTestKey, setLoadedTestKey] = useState(null);
  const [codeAnswer, setCodeAnswer] = useState(editorConfig.starter);
  const [runResults, setRunResults] = useState(null);

  const fetchSkills = useSkillStore((state) => state.fetchSkills);

  useEffect(() => {
    if (!skillName || !level) return navigate("/dashboard/skill-control");

    let isActive = true;
    const testKey = `${skillName}:${level}`;

    const fetchTest = async () => {
      try {
        setLoading(true);
        setLoadedTestKey(null);
        setCodeQuestion(null);
        setCodeAnswer(editorConfig.starter);
        setRunResults(null);

        const data = await verificationService.generateBoostTest(
          skillName,
          "compiler",
          level,
        );
        if (!isActive) return;

        setCodeQuestion(data.codeTest);
        setLoadedTestKey(testKey);
        if (data.codeTest?.starterCode)
          setCodeAnswer(data.codeTest.starterCode);
      } catch (error) {
        if (!isActive) return;
        toast.error(
          error.response?.data?.message || "Failed to load compiler test.",
        );
        setTimeout(() => navigate("/dashboard/skill-control"), 2000);
      } finally {
        if (isActive) setLoading(false);
      }
    };
    fetchTest();

    return () => {
      isActive = false;
    };
  }, [skillName, level, navigate, editorConfig.starter]);

  // -- Run code (dry run) --
  const handleRun = async () => {
    try {
      setRunning(true);
      setRunResults(null);
      toast.loading("Running test cases...", { id: "code-run" });

      const { result } = await verificationService.runCode(
        codeAnswer,
        codeQuestion.questionId,
      );

      setRunResults(result);

      if (result.timedOut) {
        toast.error("Execution timed out.", { id: "code-run" });
      } else if (result.passedCases === result.totalCases) {
        toast.success(
          `All ${result.passedCases}/${result.totalCases} cases passed!`,
          { id: "code-run" },
        );
      } else {
        toast.error(
          `Passed ${result.passedCases}/${result.totalCases} cases.`,
          { id: "code-run" },
        );
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Run failed", {
        id: "code-run",
      });
    } finally {
      setRunning(false);
    }
  };

  // -- Submit (applies hike) --
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      toast.loading("Submitting & grading...", { id: "code-grading" });
      const { result } = await verificationService.submitCompilerBoost(
        skillName,
        codeAnswer,
        codeQuestion.questionId,
      );

      if (result.passedCases === result.totalCases && result.totalCases > 0) {
        toast.success(
          `Success! All ${result.passedCases} cases passed. (+${result.hikeApplied}% hike applied)`,
          { id: "code-grading" },
        );
      } else {
        toast.error(
          `Passed ${result.passedCases}/${result.totalCases} cases. No hike applied.`,
          { id: "code-grading" },
        );
      }

      await fetchSkills();
      setTimeout(() => navigate("/dashboard/skill-control"), 3500);
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed", {
        id: "code-grading",
      });
      setSubmitting(false);
    }
  };

  const currentTestKey = `${skillName}:${level}`;
  const isTestReady = loadedTestKey === currentTestKey;

  if (loading || !isTestReady) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-[14px] animate-pulse-subtle">
        Loading compiler...
      </div>
    );
  }

  if (!codeQuestion) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-[14px] animate-pulse-subtle">
        Preparing challenge...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-[24px] font-medium text-[var(--text-primary)] tracking-[-0.01em]">
          {level.charAt(0).toUpperCase() + level.slice(1)} compiler boost -{" "}
          {skillName}
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          Pass all test cases to secure the score hike.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* Problem Statement + Run Results */}
        <div
          className="col-span-1 rounded-[var(--radius-lg)] border overflow-y-auto custom-scrollbar flex flex-col"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="p-6 flex-1">
            <h2 className="text-[18px] text-[var(--text-primary)] font-medium mb-4">
              Problem statement
            </h2>
            <p className="text-[var(--text-secondary)] text-[14px] whitespace-pre-wrap leading-relaxed">
              {codeQuestion?.question}
            </p>

            {codeQuestion?.testCases && !runResults && (
              <div
                className="mt-8 pt-6 border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <h3 className="text-[12px] font-medium text-[var(--accent)] mb-4 tracking-[0.02em]">
                  Expected execution:
                </h3>
                <div className="flex flex-col gap-3">
                  {codeQuestion.testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="rounded-[var(--radius-md)] p-3 font-[var(--font-mono)] text-[12px] flex flex-col gap-2"
                      style={{
                        background: "var(--bg-raised)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div className="flex items-start">
                        <span className="text-[var(--text-tertiary)] w-20 shrink-0">
                          Input:
                        </span>
                        <span className="text-[var(--text-primary)]">
                          {tc.input}
                        </span>
                      </div>
                      <div
                        className="flex items-start border-t pt-2"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        <span className="text-[var(--text-tertiary)] w-20 shrink-0">
                          Expected:
                        </span>
                        <span className="text-[var(--success)] font-medium">
                          {tc.output ?? tc.expectedOutput}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run Results Panel */}
            {runResults && (
              <div
                className="mt-8 pt-6 border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[12px] font-medium text-[var(--accent)] tracking-[0.02em]">
                    Test results:
                  </h3>
                  <span
                    className="text-[12px] font-medium px-2 py-0.5 rounded-[var(--radius-sm)]"
                    style={{
                      background:
                        runResults.passedCases === runResults.totalCases
                          ? "var(--success-bg)"
                          : "var(--danger-bg)",
                      color:
                        runResults.passedCases === runResults.totalCases
                          ? "var(--success)"
                          : "var(--danger)",
                    }}
                  >
                    {runResults.passedCases}/{runResults.totalCases} passed
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {runResults.results.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-[var(--radius-md)] p-3 font-[var(--font-mono)] text-[12px] flex flex-col gap-2"
                      style={{
                        background: "var(--bg-raised)",
                        border: `1px solid ${r.passed ? "var(--success)" : "var(--danger)"}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[11px] font-medium"
                          style={{
                            color: r.passed
                              ? "var(--success)"
                              : "var(--danger)",
                          }}
                        >
                          Case {idx + 1} — {r.passed ? "Passed ✓" : "Failed ✗"}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-[var(--text-tertiary)] w-20 shrink-0">
                          Input:
                        </span>
                        <span className="text-[var(--text-primary)]">
                          {r.input}
                        </span>
                      </div>
                      <div
                        className="flex items-start border-t pt-2"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        <span className="text-[var(--text-tertiary)] w-20 shrink-0">
                          Expected:
                        </span>
                        <span className="text-[var(--success)] font-medium">
                          {r.expected}
                        </span>
                      </div>
                      <div
                        className="flex items-start border-t pt-2"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        <span className="text-[var(--text-tertiary)] w-20 shrink-0">
                          Actual:
                        </span>
                        <span
                          className={`font-medium ${r.passed ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                        >
                          {r.actual}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monaco Editor */}
        <div
          className="col-span-1 lg:col-span-2 flex flex-col border rounded-[var(--radius-lg)] overflow-hidden bg-[#1e1e1e]"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {/* Editor Top Bar — Run + Submit */}
          <div className="h-11 bg-[#252526] border-b border-[#1a1a1a] flex items-center justify-between px-4">
            <span className="text-[12px] text-[var(--text-tertiary)] font-[var(--font-mono)]">
              {editorConfig.filename}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRun}
                disabled={running || submitting}
                className="text-[13px] font-medium px-4 h-7 rounded-[var(--radius-md)] transition-colors border"
                style={{
                  borderColor: "var(--border-base)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-raised)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {running ? "Running..." : "▶ Run"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={running || submitting}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium px-4 h-7 rounded-[var(--radius-md)] transition-colors"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              theme="vs-dark"
              defaultLanguage={editorConfig.monacoId}
              value={codeAnswer}
              onChange={(v) => {
                setCodeAnswer(v);
                setRunResults(null);
              }}
              onMount={(editor, monaco) => {
                document.fonts.ready.then(() => {
                  monaco.editor.remeasureFonts();
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}
              className="text-left"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
