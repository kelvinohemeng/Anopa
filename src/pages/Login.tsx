import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";

export default function Login() {
  const { loginWithEmailPassword, signInWithGoogle, loading } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // Handle Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      await loginWithEmailPassword(email, password);
    } catch (error) {
      if (error instanceof Error) setMessage(error.message);
      else setMessage("Unknown error occurred");
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
    <div className=" flex h-full items-center justify-center">
      <div className="w-full !space-y-4 flex flex-col items-center">
        <div className=" !space-y-2 w-full text-center overflow-clip rounded-xl">
          <img src="/LogIn.png" alt="" />
        </div>
        <div>
          <form onSubmit={handleEmailLogin} className="!space-y-4">
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:ring-black focus:outline-none focus:ring"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:ring-black focus:outline-none focus:ring"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="!bg-brand-primary !text-white !w-full"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in with Email"}
            </button>
            {message && (
              <p className="mt-4 text-center !text-red-600">{message}</p>
            )}
          </form>{" "}
          {/* <div className=" flex justify-center w-full !pt-2">
            <button
              onClick={() => navigate("/forgot-password")}
              className=" !bg-transparent hover:opacity-80 transition"
            >
              Forgot your password?
            </button>
          </div> */}
          <div className="!my-4 text-center text-sm text-gray-500">or</div>
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
        </div>

        <div className="text-center flex items-center gap-1">
          <span className="framer-color-text-secondary">
            Don’t have an account?
          </span>

          <a
            onClick={() => {
              navigate("/signup");
            }}
            className="underline hover:opacity-80 !text-brand-primary cursor-pointer select-none"
          >
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
