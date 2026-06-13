import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { toast, Toaster } from "sonner";
import { verificationService } from "../services/verificationService";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/Tabs";
import { Progress } from "../components/ui/Progress";
import useAuthStore from "../store/useAuthStore";

export default function VerificationTest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const skillName = searchParams.get("skill") || "React";

  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const coreLanguage = user?.coreLanguage || "javascript";

  const getEditorLanguage = (lang) => {
    const l = lang.toLowerCase();
    if (l === "node.js" || l === "javascript") return "javascript";
    if (l === "typescript") return "typescript";
    if (l === "python") return "python";
    if (l === "java") return "java";
    if (l === "c++") return "cpp";
    return "javascript";
  };

  // Loading & Test Data States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [codeQuestion, setCodeQuestion] = useState(null);
  const [loadedTestKey, setLoadedTestKey] = useState(null);
  const [runResults, setRunResults] = useState(null);

  // User Answer States
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState([]);
  const [codeAnswer, setCodeAnswer] = useState(
    (user?.coreLanguage || "").toLowerCase() === "python"
      ? "# Write your solution here\n"
      : "// Write your solution here\n",
  );

  const expectedLevel = searchParams.get("level") || "beginner";
  const testKey = `${skillName}:${expectedLevel}`;

  useEffect(() => {
    let isActive = true;

    const fetchTest = async () => {
      try {
        setLoading(true);
        setLoadedTestKey(null);
        setMcqQuestions([]);
        setCodeQuestion(null);
        setRunResults(null);
        setCurrentMcqIndex(0);
        setMcqAnswers([]);
        setCodeAnswer(
          (user?.coreLanguage || "").toLowerCase() === "python"
            ? "# Write your solution here\n"
            : "// Write your solution here\n",
        );

        const data = await verificationService.startTest(
          skillName,
          expectedLevel,
        );
        if (!isActive) return;

        setMcqQuestions(data.mcqs);
        setCodeQuestion(data.codeTest);
        setLoadedTestKey(testKey);

        // Add starter code
        if (data.codeTest?.starterCode) {
          setCodeAnswer(data.codeTest.starterCode);
        }
      } catch (error) {
        if (!isActive) return;
        toast.error(
          error.response?.data?.message ||
            "Failed to load test. Session may already exist.",
        );
        setLoadedTestKey(testKey);
      } finally {
        if (isActive) setLoading(false);
      }
    };
    fetchTest();

    return () => {
      isActive = false;
    };
  }, [skillName, expectedLevel, testKey, user?.coreLanguage]);

  const handleOptionSelect = (index) => {
    const questionId = mcqQuestions[currentMcqIndex].questionId;

    const updatedAnswers = [...mcqAnswers];
    const existingIndex = updatedAnswers.findIndex(
      (a) => a.questionId === questionId,
    );

    if (existingIndex > -1) {
      updatedAnswers[existingIndex].answerIndex = index;
    } else {
      updatedAnswers.push({ questionId, answerIndex: index });
    }

    setMcqAnswers(updatedAnswers);

    if (currentMcqIndex < mcqQuestions.length - 1) {
      setTimeout(() => setCurrentMcqIndex((curr) => curr + 1), 300);
    } else {
      toast.info("MCQs complete! Switch to the Compiler tab.");
    }
  };

  const isOptionSelected = (index) => {
    const qId = mcqQuestions[currentMcqIndex]?.questionId;
    const answer = mcqAnswers.find((a) => a.questionId === qId);
    return answer?.answerIndex === index;
  };

  // -- Run code (dry run) --
  const handleRun = async () => {
    if (!codeQuestion) return;
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

  const handleSubmitTest = async () => {
    if (mcqAnswers.length < 5) {
      toast.error("Please answer all 5 MCQs before submitting!");
      return;
    }

    try {
      setSubmitting(true);
      toast.loading("Analyzing your code & running test cases...", {
        id: "grading",
      });

      const result = await verificationService.submitTest(
        skillName,
        mcqAnswers,
        codeAnswer,
        codeQuestion.questionId,
      );

      toast.success(
        "Verification Complete! Score: " + result.finalScore + "/100",
        { id: "grading" },
      );

      // Refresh auth state to update onboardingStatus
      await refreshUser();

      setTimeout(() => {
        navigate("/report", {
          state: { report: result, skillName: skillName },
        });
      }, 3000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed", {
        id: "grading",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isTestReady = loadedTestKey === testKey;

  if (loading || !isTestReady) {
    return (
      <div
        className="theme-dark min-h-screen flex items-center justify-center text-[14px] text-[var(--text-secondary)]"
        style={{ background: "var(--bg-canvas)" }}
      >
        <span className="animate-pulse-subtle">
          Initializing verification engine...
        </span>
      </div>
    );
  }

  return (
    <div
      className="theme-dark min-h-screen flex flex-col items-center py-12 px-6 font-[var(--font-sans)]"
      style={{ background: "var(--bg-canvas)" }}
    >
      <div className="relative z-10 w-full max-w-5xl flex flex-col gap-8">
        <div className="text-center w-full">
          <h1 className="text-[24px] font-medium text-[var(--text-primary)] tracking-[-0.01em]">
            {expectedLevel} Verification test
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2">
            Complete the MCQ theory and compiler test to authenticate your
            baseline score.
          </p>
        </div>

        <div
          className="w-full rounded-[var(--radius-lg)] border p-6 sm:p-8 flex flex-col gap-6"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <Tabs defaultValue="theory" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 p-1 mb-8">
              <TabsTrigger
                value="theory"
                className="data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)] rounded-[var(--radius-md)]"
              >
                MCQ Theory ({mcqAnswers.length}/5)
              </TabsTrigger>
              <TabsTrigger
                value="execution"
                className="data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:text-[var(--text-primary)] rounded-[var(--radius-md)]"
              >
                Compiler challenge
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="theory"
              className="flex flex-col gap-6 mt-0 focus-visible:outline-none"
            >
              {mcqQuestions.length > 0 && (
                <>
                  <div className="w-full flex items-center gap-4">
                    <Progress
                      value={(mcqAnswers.length / 5) * 100}
                      className="h-2"
                    />
                  </div>

                  <div
                    className="rounded-[var(--radius-lg)] p-6"
                    style={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span className="text-[var(--accent)] text-[12px] font-medium tracking-[0.02em] mb-2 block">
                      Question {currentMcqIndex + 1} of 5
                    </span>
                    <h2 className="text-[18px] text-[var(--text-primary)] font-medium leading-relaxed">
                      {mcqQuestions[currentMcqIndex].question}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mcqQuestions[currentMcqIndex].options.map(
                      (option, idx) => {
                        const selected = isOptionSelected(idx);

                        return (
                          <button
                            key={idx}
                            onClick={() => handleOptionSelect(idx)}
                            className="text-left p-4 rounded-[var(--radius-lg)] border transition-all duration-200"
                            style={{
                              background: selected
                                ? "var(--accent-bg)"
                                : "var(--bg-surface)",
                              borderColor: selected
                                ? "var(--accent)"
                                : "var(--border-subtle)",
                            }}
                          >
                            <span
                              className={`text-[14px] font-medium ${selected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                            >
                              {option}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>

                  <div
                    className="flex justify-between mt-4 pt-4 border-t"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <button
                      onClick={() =>
                        setCurrentMcqIndex((curr) => Math.max(0, curr - 1))
                      }
                      disabled={currentMcqIndex === 0}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 text-[14px] font-medium transition-colors"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentMcqIndex((curr) => Math.min(4, curr + 1))
                      }
                      disabled={currentMcqIndex === 4}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 text-[14px] font-medium transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent
              value="execution"
              className="flex flex-col gap-6 mt-0 focus-visible:outline-none"
            >
              {codeQuestion && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
                  {/* Problem + Run Results */}
                  <div
                    className="col-span-1 rounded-[var(--radius-lg)] border overflow-y-auto custom-scrollbar flex flex-col"
                    style={{
                      background: "var(--bg-raised)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    <div className="p-6 flex-1">
                      <span className="text-[var(--accent)] text-[12px] font-medium tracking-[0.02em] mb-2 block">
                        Code execution
                      </span>
                      <h2 className="text-[18px] text-[var(--text-primary)] font-medium mb-4">
                        Problem statement
                      </h2>
                      <p className="text-[var(--text-secondary)] text-[14px] whitespace-pre-wrap leading-relaxed">
                        {codeQuestion.question}
                      </p>

                      <div
                        className="mt-8 pt-4 border-t"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        <h3 className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">
                          Requirements:
                        </h3>
                        <ul className="list-disc list-inside text-[var(--text-secondary)] text-[14px] space-y-2">
                          <li>Function must execute efficiently</li>
                          <li>Do not change the function signature</li>
                        </ul>
                      </div>

                      {/* Test cases (show when no run results) */}
                      {codeQuestion.testCases &&
                        codeQuestion.testCases.length > 0 &&
                        !runResults && (
                          <div
                            className="mt-8 pt-4 border-t"
                            style={{ borderColor: "var(--border-subtle)" }}
                          >
                            <h3 className="text-[12px] font-medium text-[var(--accent)] mb-4 tracking-[0.02em]">
                              Example test cases:
                            </h3>
                            <div className="flex flex-col gap-3">
                              {codeQuestion.testCases.map((tc, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-[var(--radius-md)] p-3 font-[var(--font-mono)] text-[12px] flex flex-col gap-2"
                                  style={{
                                    background: "var(--bg-surface)",
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
                                    className="flex items-start mt-1 pt-2 border-t"
                                    style={{
                                      borderColor: "var(--border-subtle)",
                                    }}
                                  >
                                    <span className="text-[var(--text-tertiary)] w-20 shrink-0">
                                      Expected:
                                    </span>
                                    <span className="text-[var(--success)] font-medium">
                                      {tc.output}
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
                          className="mt-8 pt-4 border-t"
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
                                  runResults.passedCases ===
                                  runResults.totalCases
                                    ? "var(--success-bg)"
                                    : "var(--danger-bg)",
                                color:
                                  runResults.passedCases ===
                                  runResults.totalCases
                                    ? "var(--success)"
                                    : "var(--danger)",
                              }}
                            >
                              {runResults.passedCases}/{runResults.totalCases}{" "}
                              passed
                            </span>
                          </div>
                          <div className="flex flex-col gap-3">
                            {runResults.results.map((r, idx) => (
                              <div
                                key={idx}
                                className="rounded-[var(--radius-md)] p-3 font-[var(--font-mono)] text-[12px] flex flex-col gap-2"
                                style={{
                                  background: "var(--bg-surface)",
                                  border: `1px solid ${r.passed ? "var(--success)" : "var(--danger)"}`,
                                }}
                              >
                                <span
                                  className="text-[11px] font-medium"
                                  style={{
                                    color: r.passed
                                      ? "var(--success)"
                                      : "var(--danger)",
                                  }}
                                >
                                  Case {idx + 1} —{" "}
                                  {r.passed ? "Passed ✓" : "Failed ✗"}
                                </span>
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
                                  style={{
                                    borderColor: "var(--border-subtle)",
                                  }}
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
                                  style={{
                                    borderColor: "var(--border-subtle)",
                                  }}
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

                  {/* Editor with Run + Submit in toolbar */}
                  <div
                    className="col-span-1 lg:col-span-2 flex flex-col border rounded-[var(--radius-lg)] overflow-hidden bg-[#1e1e1e]"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div className="h-11 bg-[#252526] border-b border-[#1a1a1a] flex items-center px-4 justify-between">
                      <span className="text-[12px] text-[var(--text-tertiary)] font-[var(--font-mono)]">
                        {getEditorLanguage(coreLanguage) === "python"
                          ? "solution.py"
                          : "index.js"}
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
                            (e.currentTarget.style.background =
                              "var(--bg-raised)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          {running ? "Running..." : "▶ Run"}
                        </button>
                        <button
                          onClick={handleSubmitTest}
                          disabled={running || submitting}
                          className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-[13px] font-medium px-4 h-7 rounded-[var(--radius-md)] transition-colors"
                        >
                          {submitting ? "Submitting..." : "Submit verification"}
                        </button>
                      </div>
                    </div>

                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language={getEditorLanguage(coreLanguage)}
                      value={codeAnswer}
                      onChange={(value) => {
                        setCodeAnswer(value);
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
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      }}
                      className="w-full flex-1 text-left"
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
