import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useAuthStore();

  // Component States
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form Data
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    careergoal: "",
  });

  // Check if user just verified their email
  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setSuccess("Email verified successfully! You can now sign in.");
      setIsLogin(true);
    }

    const urlError = searchParams.get("error");
    if (urlError) {
      setError(urlError);
    }
  }, [searchParams]);

  const handleGithubLogin = () => {
    const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000/api";
    const REDIRECT_URI = `${serverUrl.replace(/\/$/, "")}/auth/github/callback`;
    const scope = "read:user,repo";
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}`;
    window.location.href = githubAuthUrl;
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear errors when user types
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const response = await login(formData.email, formData.password);

        // RBAC
        if (response.user.role === "admin") {
          navigate("/admin");
        } else {
          if (response.user.onboardingStatus === "completed") {
            navigate("/dashboard");
          } else if (response.user.onboardingStatus === "pending_test") {
            navigate(`/test?skill=${encodeURIComponent(response.user.coreLanguage || 'JavaScript')}`);
          } else {
            navigate("/discovery");
          }
        }
      } else {
        // --- REGISTER FLOW ---
        const response = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          careerGoal: formData.careergoal,
        });

        setSuccess(response?.message || "Please check your email to verify.");
        setFormData({ username: "", email: "", password: "", careergoal: "" });
        setIsLogin(true);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full h-9 border rounded-[var(--radius-md)] px-3 text-[14px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[rgba(37,99,235,0.15)]";

  return (
    <div className="theme-dark min-h-screen flex font-[var(--font-sans)]" style={{ background: 'var(--bg-canvas)' }}>
      {/* --- Left: Form Panel --- */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" style={{ background: 'var(--bg-canvas)' }}>
        <div className="w-full max-w-[360px] flex flex-col">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[24px] font-medium text-[var(--text-primary)] tracking-[-0.01em]">
              Welcome to Ascend
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-1">
              {isLogin ? "Sign in to your account" : "Create a new account"}
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] text-[var(--danger)]" style={{ background: 'var(--danger-bg)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] text-[var(--success)]" style={{ background: 'var(--success-bg)' }}>
              {success}
            </div>
          )}

          {/* GitHub Auth */}
          <button
            onClick={handleGithubLogin}
            type="button"
            className="flex items-center justify-center w-full gap-2 h-9 border rounded-[var(--radius-md)] text-[var(--text-primary)] text-[14px] font-medium transition-colors hover:bg-[var(--bg-raised)]"
            style={{ borderColor: 'var(--border-base)', background: 'transparent' }}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            Continue with GitHub
          </button>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}></div>
            <span className="px-3 text-[12px] text-[var(--text-tertiary)]">or</span>
            <div className="flex-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}></div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="e.g. dev_johndoe"
                    required
                    className={inputClass}
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Career goal
                  </label>
                  <input
                    type="text"
                    name="careergoal"
                    value={formData.careergoal}
                    onChange={handleInputChange}
                    placeholder="e.g. Frontend Engineer, DevOps"
                    required
                    className={inputClass}
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                required
                className={inputClass}
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
                minLength="8"
                className={inputClass}
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-base)', color: 'var(--text-primary)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`mt-2 w-full h-9 font-medium rounded-[var(--radius-md)] transition-all text-[14px] ${
                loading
                  ? "bg-[var(--text-disabled)] text-[var(--bg-canvas)] cursor-not-allowed"
                  : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              }`}
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
              className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {isLogin ? (
                <>
                  Don't have an account?{" "}
                  <span className="text-[#2563EB]">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="text-[#2563EB]">Sign in</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* --- Right: Brand Panel --- */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative" style={{ background: 'var(--bg-surface)' }}>
        {/* Subtle geometric pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }} />
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[#2563EB] flex items-center justify-center mb-6">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h2 className="text-[32px] font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-3">
            Ascend
          </h2>
          <p className="text-[14px] text-[var(--text-tertiary)] max-w-[280px] leading-relaxed">
            Career skill verification, market intelligence, and growth tracking for developers.
          </p>
        </div>
      </div>
    </div>
  );
}
