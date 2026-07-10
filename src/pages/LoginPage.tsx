import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { login } from "../services/authFirebase";
import logo from "../assets/nihong.png";

function FloatingOrb({ size, color, x, y, duration }: { size: number; color: string; x: string; y: string; duration: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-3xl"
      style={{ width: size, height: size, background: color, left: x, top: y }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35], x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  rightElement?: React.ReactNode;
}

function InputField({ id, label, type, value, onChange, icon, rightElement }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const isFloating = focused || hasValue;

  return (
    <div className="relative">
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focused ? "text-brand-orange" : "text-slate-400"}`}>
        {icon}
      </div>

      <label
        htmlFor={id}
        className={`absolute left-12 transition-all duration-200 pointer-events-none font-medium ${
          isFloating
            ? "top-2 text-[10px] tracking-widest uppercase text-brand-orange"
            : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
        }`}
      >
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        autoComplete={type === "email" ? "email" : "current-password"}
        className={`w-full bg-white/5 rounded-input border px-4 pt-6 pb-3 pl-12 text-white outline-none transition-all duration-200 text-sm font-medium placeholder-transparent ${
          focused
            ? "border-brand-orange/70 bg-white/8 shadow-[0_0_0_3px_rgba(247,147,30,0.1)]"
            : "border-white/10 hover:border-white/20"
        } ${rightElement ? "pr-12" : "pr-4"}`}
        placeholder={label}
      />

      {rightElement && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
          {rightElement}
        </div>
      )}
    </div>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;
      setLoading(true);
      setError("");
      try {
        setSuccessAnim(true);
        await login(email, password);
      } catch {
        setError("Email atau password salah. Coba lagi.");
        setSuccessAnim(false);
        setLoading(false);
      }
    },
    [email, password, loading]
  );

  return (
    <div className="min-h-screen bg-brand-navyDark flex items-center justify-center overflow-hidden relative select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-navyDark" />

      <FloatingOrb
        size={500}
        color="radial-gradient(circle, rgba(247,147,30,0.15) 0%, transparent 70%)"
        x="-10%"
        y="-20%"
        duration={8}
      />
      <FloatingOrb
        size={400}
        color="radial-gradient(circle, rgba(1,46,108,0.4) 0%, transparent 70%)"
        x="60%"
        y="50%"
        duration={10}
      />
      <FloatingOrb
        size={300}
        color="radial-gradient(circle, rgba(247,147,30,0.08) 0%, transparent 70%)"
        x="80%"
        y="-10%"
        duration={12}
      />

      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-[960px] mx-4 grid md:grid-cols-2 gap-0 rounded-card overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.6)] border border-white/[0.06]">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-navyLight/80 to-brand-navyDark/90 backdrop-blur-sm relative overflow-hidden"
        >
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-brand-orange/10 blur-2xl pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-orange/5 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3 mb-10">
              <img src={logo} alt="Nihong Jastip" className="h-10 w-10 object-contain rounded-lg" />
              <div>
                <h2 className="text-white font-bold text-lg leading-none">Nihong</h2>
                <p className="text-brand-orange text-xs font-semibold tracking-widest uppercase">Jastip</p>
              </div>
            </div>

            <h1 className="text-white text-4xl font-bold leading-tight mb-4">
              Admin Panel
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-[260px]">
              Kelola pesanan, pelanggan, dan keuangan bisnis jastip Anda dari satu tempat.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: "\uD83D\uDCE6", text: "Manajemen pesanan real-time" },
              { icon: "\uD83D\uDC65", text: "Database pelanggan terpusat" },
              { icon: "\uD83D\uDCB0", text: "Laporan keuangan otomatis" },
              { icon: "\uD83D\uDCD3", text: "Jadwal & notifikasi cerdas" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="text-base">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-white/20 text-xs font-mono tracking-wider">AUTHORIZED ACCESS ONLY</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center p-10 md:p-12 bg-brand-navy/70 backdrop-blur-2xl"
        >
          <div className="flex md:hidden items-center gap-3 mb-8">
            <img src={logo} alt="Nihong Jastip" className="h-9 w-9 object-contain rounded-lg" />
            <div>
              <h2 className="text-white font-bold text-base leading-none">Nihong Jastip</h2>
              <p className="text-brand-orange text-[10px] font-semibold tracking-widest uppercase">Admin Panel</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Selamat Datang</h2>
            <p className="text-slate-400 text-sm">Masuk dengan akun admin Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <InputField
              id="login-email"
              label="Email Admin"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              }
            />

            <InputField
              id="login-password"
              label="Password"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !email || !password}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="relative w-full py-3.5 rounded-input font-bold text-sm tracking-wider overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                background: "linear-gradient(135deg, #F7931E 0%, #e07d0c 100%)",
                boxShadow: loading ? "none" : "0 8px 32px rgba(247,147,30,0.3)",
                color: "#fff",
              }}
            >
              <AnimatePresence mode="wait">
                {successAnim ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <motion.svg
                      width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </motion.svg>
                    Masuk...
                  </motion.span>
                ) : loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memverifikasi...
                  </motion.span>
                ) : (
                  <motion.span
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    Masuk ke Dashboard
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <p className="mt-8 text-center text-[11px] text-slate-600 tracking-wide">
            &copy; {new Date().getFullYear()} Nihong Jastip &middot Admin Only
          </p>
        </motion.div>
      </div>
    </div>
  );
}
