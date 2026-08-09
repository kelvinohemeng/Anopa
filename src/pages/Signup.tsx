import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";

export default function Signup() {
  const { signUpWithEmailPassword, signInWithGoogle, loading } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const validateInputs = () => {
    const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    if (!isValidEmail(email)) {
      setEmailMessage("Please enter a valid email address.");
      return false;
    }
    if (password.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage(null);
    setPasswordMessage(null);
    setMessage(null);

    if (!validateInputs()) return;

    try {
      await signUpWithEmailPassword(email, password);
      setMessage("Account created successfully! Redirecting...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      if (error instanceof Error) setMessage(error.message);
      else setMessage("An unknown error occurred during sign-up");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof Error) setMessage(error.message);
      else setMessage("Google sign-in failed");
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-md !space-y-5">
        <div className="!space-y-2">
          <h2 className="text-xl font-bold mb-2">Create an Account</h2>
          <p className="framer-color-text-tertiary">
            Sign up with your email and password to get started.
          </p>
        </div>

        <form onSubmit={handleSignup} className=" flex flex-col gap-4">
          <label htmlFor="email" className=" flex flex-col gap-2">
            <p className="">Enter your email</p>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailMessage && (
              <p className="!text-[12px]  !text-red-600 mt-4">{emailMessage}</p>
            )}
          </label>
          <label htmlFor="password" className=" flex flex-col gap-2">
            <p>Enter Password</p>
            <input
              id="password"
              type="password"
              placeholder="Choose a password"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {passwordMessage && (
              <p className="!text-[12px]  !text-red-600 mt-4">
                {passwordMessage}
              </p>
            )}
          </label>
          <label htmlFor="re-password" className=" flex flex-col gap-2">
            <p>Re-enter Password</p>
            <input
              id="re-password"
              type="password"
              placeholder="Confirm password"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring focus:ring-black"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="!bg-brand-primary !text-white !w-full"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="!w-full border flex gap-2 border-gray-300 py-2 text-sm hover transition disabled:opacity-50 framer-icon-black"
          disabled={loading}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="#000000"
            viewBox="0 0 256 256"
          >
            <path d="M228,128a100,100,0,1,1-22.86-63.64,12,12,0,0,1-18.51,15.28A76,76,0,1,0,203.05,140H128a12,12,0,0,1,0-24h88A12,12,0,0,1,228,128Z"></path>
          </svg>
          {loading ? "Loading..." : "Continue with Google"}
        </button>

        {message && (
          <p className="text-sm text-center !text-red-600 mt-4">{message}</p>
        )}

        <div className="text-center">
          <span className="framer-color-text-secondary">
            Already have an account?{" "}
          </span>
          <a
            onClick={() => navigate("/login")}
            className="underline hover:opacity-80 !text-brand-primary cursor-pointer select-none"
          >
            Log in
          </a>
        </div>
      </div>
    </div>
  );
}
