import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { verificationService } from "../services/verificationService";
import { Progress } from "../components/ui/Progress";
import { useSkillStore } from "../store/useSkillStore";

export default function BoostMcqTest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const skillName = searchParams.get("skill");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [loadedSkillName, setLoadedSkillName] = useState(null);
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState([]);

  const fetchSkills = useSkillStore((state) => state.fetchSkills);

  useEffect(() => {
    if (!skillName) return navigate("/dashboard/skill-control");

    let isActive = true;

    const fetchTest = async () => {
      try {
        setLoading(true);
        setLoadedSkillName(null);
        setMcqQuestions([]);
        setCurrentMcqIndex(0);
        setMcqAnswers([]);

        const data = await verificationService.generateBoostTest(skillName, "mcq");
        if (!isActive) return;

        setMcqQuestions(data.mcqs);
        setLoadedSkillName(skillName);
      } catch (error) {
        if (!isActive) return;
        toast.error(error.response?.data?.message || "Failed to load test.");
        setTimeout(() => navigate("/dashboard/skill-control"), 2000);
      } finally {
        if (isActive) setLoading(false);
      }
    };
    fetchTest();

    return () => {
      isActive = false;
    };
  }, [skillName, navigate]);

  const handleOptionSelect = (index) => {
    const questionId = mcqQuestions[currentMcqIndex].questionId;
    const updatedAnswers = [...mcqAnswers];
    const existingIndex = updatedAnswers.findIndex((a) => a.questionId === questionId);

    if (existingIndex > -1) updatedAnswers[existingIndex].answerIndex = index;
    else updatedAnswers.push({ questionId, answerIndex: index });

    setMcqAnswers(updatedAnswers);

    if (currentMcqIndex < mcqQuestions.length - 1) {
      setTimeout(() => setCurrentMcqIndex((curr) => curr + 1), 300);
    }
  };

  const isOptionSelected = (index) => {
    const qId = mcqQuestions[currentMcqIndex]?.questionId;
    const answer = mcqAnswers.find((a) => a.questionId === qId);
    return answer?.answerIndex === index;
  };

  const handleSubmit = async () => {
    if (mcqAnswers.length < mcqQuestions.length) {
      toast.error("Please answer all questions!");
      return;
    }

    try {
      setSubmitting(true);
      toast.loading("Analyzing answers...", { id: "mcq-grading" });
      const { result } = await verificationService.submitMcqBoost(skillName, mcqAnswers);

      toast.success(
        `Boost complete! You got ${result.correctCount}/5 correct. (+${result.hikeApplied}% hike)`,
        { id: "mcq-grading" }
      );
      await fetchSkills();
      setTimeout(() => navigate("/dashboard/skill-control"), 2500);
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed", { id: "mcq-grading" });
      setSubmitting(false);
    }
  };

  const isTestReady = loadedSkillName === skillName;

  if (loading || !isTestReady) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-[14px] animate-pulse-subtle">
        Loading quick boost...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-[24px] font-medium text-[var(--text-primary)] tracking-[-0.01em]">MCQ boost for {skillName}</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">+1% hike for each correct answer</p>
      </div>

      <div className="rounded-[var(--radius-lg)] border p-8" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <Progress value={(mcqAnswers.length / mcqQuestions.length) * 100} className="h-2 mb-6" />

        <div className="rounded-[var(--radius-lg)] p-6 mb-6" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
          <span className="text-[var(--accent)] text-[12px] font-medium tracking-[0.02em] block mb-2">
            Question {currentMcqIndex + 1} of {mcqQuestions.length}
          </span>
          <h2 className="text-[18px] text-[var(--text-primary)] font-medium">{mcqQuestions[currentMcqIndex]?.question}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mcqQuestions[currentMcqIndex]?.options.map((option, idx) => {
            const selected = isOptionSelected(idx);
            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                className="text-left p-4 rounded-[var(--radius-lg)] border transition-all duration-200"
                style={{
                  background: selected ? 'var(--accent-bg)' : 'var(--bg-surface)',
                  borderColor: selected ? 'var(--accent)' : 'var(--border-subtle)',
                }}
              >
                <span className={`text-[14px] font-medium ${selected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{option}</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={() => setCurrentMcqIndex((c) => Math.max(0, c - 1))}
            disabled={currentMcqIndex === 0}
            className="text-[var(--text-secondary)] disabled:opacity-30 text-[14px] font-medium"
          >
            ← Previous
          </button>

          {currentMcqIndex === mcqQuestions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 h-9 rounded-[var(--radius-md)] text-[14px] font-medium transition-colors"
            >
              Submit boost
            </button>
          ) : (
            <button
              onClick={() => setCurrentMcqIndex((c) => Math.min(mcqQuestions.length - 1, c + 1))}
              className="text-[var(--text-secondary)] text-[14px] font-medium"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
