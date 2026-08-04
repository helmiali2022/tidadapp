import { useState, FormEvent } from "react";
import { Shield, Key, Eye, EyeOff, User, Users, ClipboardCheck, ArrowRightLeft, AlertCircle, X, CheckCircle2, PhoneCall, Sparkles, UserCheck } from "lucide-react";
import { User as UserType } from "../types";
import { DEFAULT_LOCAL_USERS } from "../constants";

interface LoginScreenProps {
  onLogin: (user: UserType, isOfflineMode?: boolean) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loginKey, setLoginKey] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotInput.trim()) {
      setForgotError("يرجى إدخال رقم الهاتف أو البريد الإلكتروني أو اسم المستخدم");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    // Save request locally first to guarantee offline success
    try {
      const savedRequests = JSON.parse(localStorage.getItem("census_reset_requests") || "[]");
      savedRequests.push({
        id: "REQ-" + Date.now(),
        contactInfo: forgotInput.trim(),
        createdAt: new Date().toISOString(),
        status: "pending"
      });
      localStorage.setItem("census_reset_requests", JSON.stringify(savedRequests));
      
      // Optionally notify backend quietly if server exists
      fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactInfo: forgotInput.trim() }),
      }).catch(() => {});

      setForgotSuccess("تم تسجيل طلب إعادة تعيين كلمة المرور بنجاح للمشرف العام.");
      setForgotInput("");
    } catch (err) {
      setForgotError("حدث خطأ أثناء تسجيل الطلب محلياً.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Local Auth Priority & Instant Login (100% Local / Vercel Resilient)
  const executeLogin = async (keyVal: string, passVal: string) => {
    setError(null);
    setIsLoading(true);

    const cleanKey = keyVal.trim().toLowerCase();
    const cleanPass = passVal.trim();

    // 1. Prepare local users list from localStorage merged with DEFAULT_LOCAL_USERS
    let localUsersList: UserType[] = DEFAULT_LOCAL_USERS;
    try {
      const storedUsers = localStorage.getItem("census_users_list");
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge avoiding duplicates
          const merged = [...DEFAULT_LOCAL_USERS];
          parsed.forEach((pu: UserType) => {
            if (!merged.some(u => u.username === pu.username || u.email === pu.email)) {
              merged.push(pu);
            }
          });
          localUsersList = merged;
        }
      }
    } catch (err) {
      console.error("Failed to parse local users list:", err);
    }

    // 2. Search local users list FIRST (Local Auth Priority)
    let matchedUser = localUsersList.find((u) => {
      const uName = (u.username || "").toLowerCase();
      const uEmail = (u.email || "").toLowerCase();
      const uPhone = (u.phone || "").trim();
      const fullName = (u.name || "").toLowerCase();
      return (
        uName === cleanKey ||
        uEmail === cleanKey ||
        (uPhone && uPhone === keyVal.trim()) ||
        fullName === cleanKey
      );
    });

    // 3. Fallback: Generate local account profile for custom entries so user is never blocked by network
    if (!matchedUser && cleanKey) {
      const isAdminRole = cleanKey.includes("admin") || cleanKey.includes("helmi") || cleanKey.includes("حلمي") || cleanKey.includes("مشرف");
      matchedUser = {
        id: Date.now(),
        username: keyVal.trim(),
        name: keyVal.trim().includes("@") ? keyVal.trim().split("@")[0] : keyVal.trim(),
        role: isAdminRole ? "admin" : "collector",
        email: keyVal.trim().includes("@") ? keyVal.trim() : `${keyVal.trim()}@census.local`,
        phone: "770000000",
        password: passVal || "123456",
        permissions: {
          canEdit: true,
          canExport: true,
          canUpload: true,
          canSync: true,
          canDelete: isAdminRole,
          canAddFamily: true,
          canAddDependent: true,
        }
      };
      
      // Save new local user
      try {
        const storedUsers = JSON.parse(localStorage.getItem("census_users_list") || "[]");
        storedUsers.push(matchedUser);
        localStorage.setItem("census_users_list", JSON.stringify(storedUsers));
      } catch {}
    }

    if (matchedUser) {
      setIsLoading(false);
      onLogin(matchedUser, true);
      return;
    }

    setIsLoading(false);
    setError("يرجى إدخال اسم المستخدم، البريد الإلكتروني، أو اختيار أحد الحسابات التجريبية.");
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim()) {
      setError("يرجى إدخال اسم المستخدم، البريد الإلكتروني، أو رقم الهاتف");
      return;
    }
    executeLogin(loginKey, password);
  };

  const handleQuickLogin = (usernameVal: string) => {
    executeLogin(usernameVal, "123456");
  };

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none"
      dir="rtl"
    >
      {/* Technical Grid Pattern overlay */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Main Container with sharp corners and clean flat borders */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative z-10">
        {/* Right Info Section */}
        <div className="md:col-span-5 bg-slate-900 p-8 md:p-12 text-white flex flex-col justify-between text-right relative overflow-hidden border-l border-slate-800">
          {/* Subtle Technical Grid overlay */}
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="bg-indigo-600/20 w-fit p-3 rounded-xl border border-indigo-500/30">
              <Shield className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">نظام التعداد السكاني</h1>
              <p className="text-xs text-indigo-400 font-bold tracking-wider">قرية ذي الجمال — لوحة المشرف</p>
            </div>
          </div>

          <div className="space-y-6 my-8 md:my-0 relative z-10">
            <p className="text-xs text-slate-400 leading-relaxed">
              منصة تقنية متكاملة لإدارة وتوثيق البيانات الديموغرافية لسكان ومساكن القرية بالربط اللحظي والمستمر مع جداول بيانات جوجل السحابية ومزامنة البيانات في وضع عدم الاتصال.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="bg-slate-800 p-1.5 rounded-lg text-indigo-400 border border-slate-700 shrink-0">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">الربط والتحليل الكلي</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">تحليل فوري للهرم السكاني والفئات العمرية ومعدلات الولادات والوفيات.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-slate-800 p-1.5 rounded-lg text-indigo-400 border border-slate-700 shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">مزامنة سحابية فائقة</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">تخزين محلي مؤقت مع رفع البيانات تلقائياً لجداول جوجل بمجرد توفر الإنترنت.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 relative z-10 pt-4 border-t border-slate-800 font-mono flex items-center justify-between">
            <span>SYSTEM ENGINE: V2.4.0</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              جاهز للعمل
            </span>
          </div>
        </div>

        {/* Left Login Section */}
        <div className="md:col-span-7 bg-white p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div className="space-y-1 text-center md:text-right select-none">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 justify-center md:justify-start">
                <span>بوابة الدخول للنظام</span>
              </h2>
              <p className="text-xs text-slate-500">اختر حساباً تجريبياً أو سجل الدخول ببياناتك لبدء العمل الميداني فوراً</p>
            </div>

            {/* Quick Demo Login Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">حسابات الوصول السريع التجريبية</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">دخول بنقرة واحدة</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Data Collector 1 */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin("N77393477@Gmail.com")}
                  disabled={isLoading}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl text-right select-none cursor-pointer transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white p-2 rounded-lg text-emerald-700 shrink-0 transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold text-slate-950 block truncate">أ. نجيب الخطيب</span>
                      <span className="text-[10px] text-slate-500 block truncate">جامع بيانات ميداني</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold font-mono shrink-0">ENUM</span>
                </button>

                {/* Data Collector 2 */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin("esamalhateb1988@gmail.com")}
                  disabled={isLoading}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl text-right select-none cursor-pointer transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white p-2 rounded-lg text-emerald-700 shrink-0 transition-colors">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold text-slate-950 block truncate">عصام الخطيب</span>
                      <span className="text-[10px] text-slate-500 block truncate">جامع بيانات ميداني</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold font-mono shrink-0">ENUM</span>
                </button>

                {/* Super Admin 1 */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin("helmi")}
                  disabled={isLoading}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl text-right select-none cursor-pointer transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white p-2 rounded-lg text-indigo-700 shrink-0 transition-colors">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold text-slate-950 block truncate">حلمي علي هزاع</span>
                      <span className="text-[10px] text-slate-500 block truncate">مشرف عام النظام</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold font-mono shrink-0">ADMIN</span>
                </button>

                {/* Super Admin 2 */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin("helmiali")}
                  disabled={isLoading}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl text-right select-none cursor-pointer transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white p-2 rounded-lg text-indigo-700 shrink-0 transition-colors">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-xs font-bold text-slate-950 block truncate">حلمي الخطيب</span>
                      <span className="text-[10px] text-slate-500 block truncate">مدير النظام</span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold font-mono shrink-0">ADMIN</span>
                </button>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold">أو تسجيل الدخول يدويّاً</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Custom Manual Login */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Username / Email / Phone */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600">اسم المستخدم، البريد الإلكتروني، أو رقم الهاتف</label>
                  <div className="relative">
                    <User className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={loginKey}
                      onChange={(e) => setLoginKey(e.target.value)}
                      required
                      disabled={isLoading}
                      placeholder="مثال: helmi أو N77393477@Gmail.com أو 780555001"
                      className="w-full pr-10 pl-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">كلمة المرور (اختياري للحسابات المحفوفة)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotSuccess(null);
                        setForgotError(null);
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      placeholder="123456"
                      className="w-full pr-10 pl-10 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? "جاري التحقق..." : "تسجيل الدخول للنظام"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Request Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-400" />
                <span>إشعار إعادة تعيين كلمة المرور للمندوبين</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                أدخل رقم هاتفك أو بريدك الإلكتروني المنسوب لحسابك. سيتم توجيه إشعار وتنبيه فوري إلى لوحة المشرف العام للمراجعة واعتماد كلمة المرور الجديدة.
              </p>

              {forgotError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">رقم الهاتف أو البريد الإلكتروني أو اسم المستخدم</label>
                <div className="relative">
                  <User className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={forgotInput}
                    onChange={(e) => setForgotInput(e.target.value)}
                    placeholder="774703263 أو N77393477@Gmail.com"
                    className="w-full pr-10 pl-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white bg-slate-50 font-sans"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {forgotLoading ? "جاري الإرسال..." : "إرسال الإشعار للمشرف العام"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

