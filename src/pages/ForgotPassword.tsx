import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";
import { BackButton } from "../components/BackButton";

export default function ForgotPassword() {
  const { forgotPassword, resetPassword, loading } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [message, setMessage] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      await forgotPassword(email);
      setStep("verify");
      setMessage("Reset code sent. Check your email.");
    } catch (error) {
      if (error instanceof Error) setMessage(error.message);
      else setMessage("Failed to send reset code.");
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      await resetPassword(code, newPassword);
      setMessage("Password updated! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      if (error instanceof Error) setMessage(error.message);
      else setMessage("Failed to reset password.");
    }
  };

  return (
    <div className="!space-y-3">
      <BackButton />
      <hr />
      <div className="flex h-full items-center justify-center px-6">
        <div className="w-full max-w-md !space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Forgot Password</h2>
            <p className="text-sm text-gray-600">
              {step === "request"
                ? "Enter your email and we'll send you a reset code."
                : "Enter the code from your email and choose a new password."}
            </p>
          </div>

          {step === "request" ? (
            <form onSubmit={handleRequestReset} className="!space-y-4">
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="framer-button-primary w-full"
              >
                {loading ? "Sending code..." : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyReset} className="!space-y-4">
              <input
                type="text"
                placeholder="Reset code from email"
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-black"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="New password"
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-black"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="framer-button-primary w-full"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={() => setStep("request")}
                className="!bg-transparent text-sm underline w-full"
              >
                Back — resend code
              </button>
            </form>
          )}

          {message && (
            <p className="text-center text-sm text-red-600">{message}</p>
          )}

          <div className="text-center text-sm text-gray-600 mt-4">
            <span
              onClick={() => navigate("/login")}
              className="underline hover:opacity-80 text-white cursor-pointer select-none"
            >
              Back to Login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
