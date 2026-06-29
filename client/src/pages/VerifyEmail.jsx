// client/src/pages/VerifyEmail.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";

export default function VerifyEmail() {
  const { token } = useParams(); // Grabs the token from the URL
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Calls the endpoint in your authService
        await authService.verifyEmail(token);
        setStatus("Email verified! Redirecting...");

        // Wait 2 seconds, then redirect to login with the success flag we built!
        setTimeout(() => {
          navigate("/login?verified=true");
        }, 2000);
      } catch (error) {
        setStatus("Verification failed. The link may be expired or invalid.");
        console.error(
          "Verification Error:",
          error.response?.data || error.message,
        );
      }
    };

    if (token && !hasFetched.current) {
      hasFetched.current = true;
      verifyToken();
    }
  }, [token, navigate]);

  return (
    <div className="theme-dark min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
      <div className="p-8 rounded-[var(--radius-lg)] max-w-md text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-[18px] font-medium text-[var(--text-primary)] mb-2">Account verification</h2>
        <p className="text-[14px] text-[var(--text-secondary)]">{status}</p>
      </div>
    </div>
  );
}
