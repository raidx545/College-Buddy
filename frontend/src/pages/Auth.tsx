import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, signup, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      await loginWithGoogle();
      navigate("/");
    } catch (err: any) {
      setError("Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: '#F5F3EF' }}>
      {/* Decorative dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-12 left-12 w-4 h-4 rounded-full bg-indigo-300/50" />
        <div className="absolute top-24 right-16 w-3 h-3 rounded-full bg-pink-300/40" />
        <div className="absolute bottom-24 left-20 w-5 h-5 rounded-full bg-indigo-200/40" />
        <div className="absolute bottom-16 right-24 w-6 h-6 rounded-full bg-gray-300/30" />
      </div>

      {/* Top brand */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2.5 mb-6"
      >
        <div className="h-11 w-11 rounded-full border-[2.5px] border-gray-800 bg-white flex items-center justify-center">
          <svg className="h-6 w-6 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <span className="text-xl font-extrabold text-gray-900">CampusAI</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Mascot card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.15 }}
          className="bold-card p-6 mb-6 text-center relative"
        >
          {/* Pink notification dot */}
          <div className="absolute top-4 right-8 w-4 h-4 rounded-full bg-pink-400" />

          <img
            src="/mascot.png"
            alt="CampusAI Mascot"
            className="h-24 w-24 object-contain mx-auto mb-3 animate-mascot-bounce"
          />
          <h1 className="text-2xl font-black text-gray-900">Hey there, Scholar!</h1>
          <p className="text-sm text-gray-500 mt-1">Ready to crush those assignments?</p>
        </motion.div>

        {/* Form */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-600 text-sm rounded-2xl font-semibold"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <label className="text-sm font-extrabold text-gray-900 mb-2 block">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Student"
                required={!isLogin}
                className="w-full px-5 py-3.5 bold-input bg-white text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-gray-400"
              />
            </motion.div>
          )}

          <div>
            <label className="text-sm font-extrabold text-gray-900 mb-2 block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@campus.edu"
              required
              className="w-full px-5 py-3.5 bold-input bg-white text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="text-sm font-extrabold text-gray-900 mb-2 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-5 py-3.5 pr-12 bold-input bg-white text-sm outline-none focus:border-indigo-500 transition-all placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-full gradient-primary border-0 hover:opacity-90 transition-opacity text-white font-black py-4 text-base tracking-wide uppercase shadow-lg"
            disabled={loading}
            style={{ height: '52px' }}
          >
            {loading ? "Please wait..." : (isLogin ? "LET'S GOOO!" : "CREATE ACCOUNT")}
          </Button>
        </form>

        {/* Forgot / Create */}
        <div className="flex items-center justify-between mt-4 px-1">
          <button type="button" className="text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
            Forgot?
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {isLogin ? "Create Account" : "Sign In"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-gray-200" /></div>
          <div className="relative flex justify-center text-[10px]">
            <span className="px-3 text-gray-400 uppercase tracking-[0.2em] font-bold" style={{ background: '#F5F3EF' }}>or skip the lines</span>
          </div>
        </div>

        {/* OAuth buttons */}
        <div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full border-[2.5px] border-gray-800 bg-white font-extrabold text-sm text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            Sign in with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 CampusAI • Built for ABES EC
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
