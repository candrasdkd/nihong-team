import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
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
        className={`pointer-events-none absolute left-12 font-bold transition-all duration-200 ${
          isFloating
            ? "top-2 text-[9px] uppercase tracking-[0.14em] text-brand-orange"
            : "top-1/2 -translate-y-1/2 text-sm text-slate-500"
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
        className={`w-full rounded-input border bg-slate-50 px-4 pb-3 pl-12 pt-6 text-sm font-semibold text-brand-navyDark outline-none transition-all duration-200 placeholder-transparent ${
          focused
            ? "border-brand-orange bg-white shadow-[0_0_0_4px_rgba(242,101,34,0.1)]"
            : "border-surface-border hover:border-slate-300"
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
    <div className="relative flex min-h-screen select-none items-center justify-center overflow-hidden bg-surface-base px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(242,101,34,0.10),transparent_30%),radial-gradient(circle_at_90%_90%,rgba(21,69,116,0.10),transparent_34%)]" />

      <FloatingOrb
        size={500}
        color="radial-gradient(circle, rgba(242,101,34,0.12) 0%, transparent 70%)"
        x="-10%"
        y="-20%"
        duration={8}
      />
      <FloatingOrb
        size={400}
        color="radial-gradient(circle, rgba(21,69,116,0.12) 0%, transparent 70%)"
        x="60%"
        y="50%"
        duration={10}
      />
      <FloatingOrb
        size={300}
        color="radial-gradient(circle, rgba(242,101,34,0.06) 0%, transparent 70%)"
        x="80%"
        y="-10%"
        duration={12}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(11,37,69,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(11,37,69,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 grid w-full max-w-[1080px] overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_38px_110px_rgba(7,27,51,0.18)] md:min-h-[650px] md:grid-cols-[1.12fr_0.88fr]">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-navyDark via-brand-navy to-brand-navyLight p-14 md:flex"
        >
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-brand-orange/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[36px] border-white/[0.04]" />
          <div className="pointer-events-none absolute inset-0 app-grid opacity-70" />

          <div className="relative">
            <div className="mb-16 flex items-center gap-3">
              <img src={logo} alt="Nihong Jastip" className="h-11 w-11 rounded-[15px] object-cover shadow-lg ring-1 ring-white/15" />
              <div>
                <h2 className="text-lg font-extrabold leading-none text-white">Nihong</h2>
                <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.22em] text-brand-orangeLight">Jastip workspace</p>
              </div>
            </div>

            <p className="eyebrow mb-4 text-brand-orangeLight">Control center</p>
            <h1 className="mb-5 max-w-md text-4xl font-extrabold leading-[1.08] tracking-tight text-white lg:text-5xl">
              Operasional jastip, lebih tertata.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-300">
              Satu workspace untuk mengelola pesanan, pelanggan, jadwal, dan arus kas Nihong secara real-time.
            </p>
          </div>

          <div className="relative grid grid-cols-2 gap-3">
            {[
              "Pesanan real-time",
              "Data pelanggan",
              "Laporan keuangan",
              "Jadwal terintegrasi",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.06] px-3 py-3 text-xs font-semibold text-slate-200 backdrop-blur-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-orange/20 text-brand-orangeLight">
                  <Check size={13} strokeWidth={3} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-8 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Sistem aktif dan tersinkronisasi</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center bg-white p-7 sm:p-10 md:p-12"
        >
          <div className="flex md:hidden items-center gap-3 mb-8">
            <img src={logo} alt="Nihong Jastip" className="h-10 w-10 rounded-[14px] object-cover shadow-sm" />
            <div>
              <h2 className="text-base font-extrabold leading-none text-brand-navyDark">Nihong</h2>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-brand-orange">Jastip workspace</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="eyebrow mb-3 text-brand-orange">Akses admin</p>
            <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-brand-navyDark">Selamat datang</h2>
            <p className="text-sm leading-relaxed text-slate-500">Masuk untuk melanjutkan pekerjaan Anda di Nihong.</p>
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
                  aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  className="text-slate-400 transition-colors hover:text-brand-navy"
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
                  <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
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
              className="relative mt-2 w-full overflow-hidden rounded-input py-3.5 text-sm font-extrabold tracking-wide text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #F26522 0%, #D95216 100%)",
                boxShadow: loading ? "none" : "0 12px 30px rgba(242,101,34,0.28)",
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
                    className="flex items-center justify-center gap-2"
                  >
                    Masuk ke Dashboard
                    <ArrowRight size={16} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          <p className="mt-8 text-center text-[10px] font-semibold tracking-wide text-slate-400">
            &copy; {new Date().getFullYear()} Nihong Jastip · Akses terbatas untuk tim
          </p>
        </motion.div>
      </div>
    </div>
  );
}
