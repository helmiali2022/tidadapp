import { useState, useEffect, FormEvent } from "react";
import { X, Sparkles, HeartCrack, Baby, Calendar, AlertTriangle, Info } from "lucide-react";
import { Family, Dependent } from "../types";
import { TITLES } from "../data";
import SearchableSelect from "./SearchableSelect";

interface BirthDeathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBirth: (birthData: any) => Promise<void>;
  onSaveDeath: (deathData: any) => Promise<void>;
  families: Family[];
  dependents: Dependent[];
  titles: string[];
}

export default function BirthDeathModal({
  isOpen,
  onClose,
  onSaveBirth,
  onSaveDeath,
  families,
  dependents,
  titles
}: BirthDeathModalProps) {
  const [activeTab, setActiveTab] = useState<"birth" | "death">("birth");

  // Birth state
  const [birthFamilyCode, setBirthFamilyCode] = useState("");
  const [babyName, setBabyName] = useState("");
  const [babyTitle, setBabyTitle] = useState("بدون لقب");
  const [babyGender, setBabyGender] = useState("ذكر");
  const [babyBirthDate, setBabyBirthDate] = useState("");
  const [babyNationalId, setBabyNationalId] = useState("");

  // Death state
  const [isHeadOfDeath, setIsHeadOfDeath] = useState(true); // Head vs Dependent
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [deathDate, setDeathDate] = useState("");

  // Reset states
  useEffect(() => {
    if (isOpen) {
      // Reset birth
      setBirthFamilyCode("");
      setBabyName("");
      setBabyTitle("بدون لقب");
      setBabyGender("ذكر");
      setBabyBirthDate(new Date().toISOString().split("T")[0]);
      setBabyNationalId("");

      // Reset death
      setIsHeadOfDeath(true);
      setSelectedPersonId("");
      setDeathDate(new Date().toISOString().split("T")[0]);
    }
  }, [isOpen]);

  // Set baby title when family is chosen
  useEffect(() => {
    if (birthFamilyCode) {
      const family = families.find(f => f.familyCode === birthFamilyCode);
      if (family) {
        setBabyTitle(family.title || "بدون لقب");
      }
    }
  }, [birthFamilyCode, families]);

  // Clear selected person when death target type changes
  useEffect(() => {
    setSelectedPersonId("");
  }, [isHeadOfDeath]);

  if (!isOpen) return null;

  // Options for birth families
  const birthFamilyOptions = families.map((f) => ({
    value: f.familyCode,
    label: `${f.headName} ${f.title} (محلة ${f.neighborhood} - ${f.familyCode})`
  }));

  // Options for deaths
  const livingHeadsOptions = families
    .filter((f) => !f.deathDate) // only living heads
    .map((f) => ({
      value: String(f.id),
      label: `رب أسرة: ${f.headName} ${f.title} (محلة: ${f.neighborhood} - كود: ${f.familyCode})`
    }));

  const livingDependentsOptions = dependents
    .filter((d) => d.maritalStatus !== "متوفى") // only living dependents
    .map((d) => {
      const family = families.find((f) => f.familyCode === d.familyCode);
      const parentName = family ? `${family.headName} ${family.title}` : "غير معروف";
      return {
        value: String(d.id),
        label: `تابع: ${d.name} ${d.title} (عائلة: ${parentName} - كود: ${d.familyCode})`
      };
    });

  // Newborn validation
  const trimmedBabyName = babyName.trim();
  const babyWords = trimmedBabyName.split(/\s+/).filter(Boolean);
  const isBabyNameHasSpace = babyName.includes(" ") || babyWords.length > 1;

  const handleBirthSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isBabyNameHasSpace) return;
    if (!birthFamilyCode) {
      alert("يرجى اختيار أسرة المولود الجديد");
      return;
    }
    if (!babyName.trim()) {
      alert("يرجى إدخال اسم المولود");
      return;
    }
    if (!babyBirthDate) {
      alert("يرجى تحديد تاريخ الولادة");
      return;
    }

    const parentFamily = families.find((f) => f.familyCode === birthFamilyCode);
    const residency = parentFamily ? parentFamily.residency : "العنين";

    const birthPayload = {
      name: babyName,
      title: babyTitle,
      relation: babyGender === "ذكر" ? "ابن" : "ابنة",
      nationalId: babyNationalId,
      residency,
      birthDate: babyBirthDate,
      familyCode: birthFamilyCode
    };

    await onSaveBirth(birthPayload);
    onClose();
  };

  const handleDeathSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedPersonId) {
      alert("يرجى اختيار الشخص المتوفى رحمه الله");
      return;
    }
    if (!deathDate) {
      alert("يرجى تحديد تاريخ الوفاة");
      return;
    }

    const deathPayload = {
      isHead: isHeadOfDeath,
      id: selectedPersonId,
      deathDate
    };

    await onSaveDeath(deathPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] my-auto overflow-hidden rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white select-none">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Baby className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">المواليد والوفيات (الحركة الحيوية)</h2>
              <p className="text-xs text-purple-100 mt-0.5">تسجيل وقائع الولادات وحالات الوفيات لتحديث الهرم السكاني</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full transition text-purple-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
          <button
            onClick={() => setActiveTab("birth")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition rounded-lg ${
              activeTab === "birth"
                ? "bg-white text-purple-700 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            }`}
          >
            <Baby className="w-4.5 h-4.5 text-purple-600" />
            <span>تسجيل مولود جديد</span>
          </button>
          <button
            onClick={() => setActiveTab("death")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition rounded-lg ${
              activeTab === "death"
                ? "bg-white text-purple-700 shadow-sm border border-slate-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            }`}
          >
            <HeartCrack className="w-4.5 h-4.5 text-rose-500" />
            <span>تسجيل حالة وفاة</span>
          </button>
        </div>

        {/* Birth Tab content */}
        {activeTab === "birth" && (
          <>
            <form id="birth-form" onSubmit={handleBirthSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 pb-24 sm:pb-32">
              {/* Select family */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">اختر أسرة المولود *</label>
                <SearchableSelect
                  options={birthFamilyOptions}
                  value={birthFamilyCode}
                  onChange={setBirthFamilyCode}
                  placeholder="ابحث باسم الأب أو كود الأسرة..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* اسم المولود */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">اسم المولود الجديد (الاسم الأول فقط) *</label>
                  <input
                    type="text"
                    required
                    value={babyName}
                    onChange={(e) => setBabyName(e.target.value)}
                    placeholder="مثال: حلمي"
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition ${
                      isBabyNameHasSpace
                        ? "border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500"
                        : "border-slate-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                    }`}
                  />
                  {isBabyNameHasSpace && (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>⚠️ يُسمح بكتابة الاسم الأول فقط للتابع (كلمة واحدة بدون مسافات)</span>
                    </p>
                  )}
                </div>

                {/* اللقب */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 text-right">اللقب</label>
                  <select
                    value={babyTitle}
                    onChange={(e) => setBabyTitle(e.target.value)}
                    placeholder="الخطيب"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                  >
                    {titles.map((t, idx) => (
                      <option key={`${t}-${idx}`} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* نوع الجنس */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <span>الجنس *</span>
                    <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100">
                      {babyGender === "ذكر" ? "سيتم إسناد صلة القرابة كـ ابن" : "سيتم إسناد صلة القرابة كـ ابنة"}
                    </span>
                  </label>
                  <select
                    value={babyGender}
                    onChange={(e) => setBabyGender(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                {/* تاريخ الولادة */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>تاريخ الولادة *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={babyBirthDate}
                    onChange={(e) => setBabyBirthDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white text-right"
                  />
                </div>

                {/* الرقم الوطني */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-600">الرقم الوطني للطفل (اختياري)</label>
                  <input
                    type="text"
                    value={babyNationalId}
                    onChange={(e) => setBabyNationalId(e.target.value)}
                    placeholder="رقم شهادة الميلاد أو الرقم الوطني"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg flex items-center gap-2 text-xs text-purple-800">
                <Info className="w-4 h-4 shrink-0" />
                <span>عند حفظ التغييرات، سيتم تسجيل المولود الجديد كتابع، وربطه برقم عائلته بشكل ديناميكي وزيادة عدد أفراد الأسرة بمقدار (1).</span>
              </div>
            </form>

            {/* Sticky Action Footer */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-lg">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="birth-form"
                disabled={isBabyNameHasSpace || !trimmedBabyName || !birthFamilyCode}
                className="bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 active:from-purple-800 active:to-fuchsia-800 text-white font-black px-6 py-2.5 sm:py-3 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <span>حفظ وتسجيل المولود الجديد 👶 💾</span>
              </button>
            </div>
          </>
        )}

        {/* Death Tab content */}
        {activeTab === "death" && (
          <>
            <form id="death-form" onSubmit={handleDeathSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 pb-24 sm:pb-32">
              {/* Choose type of person */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">تصنيف الفرد المتوفى *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      checked={isHeadOfDeath}
                      onChange={() => setIsHeadOfDeath(true)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span>رب أسرة (رئيس عائلة)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                    <input
                      type="radio"
                      checked={!isHeadOfDeath}
                      onChange={() => setIsHeadOfDeath(false)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500"
                    />
                    <span>تابع (زوجة، ابن، ابنة، إلخ)</span>
                  </label>
                </div>
              </div>

              {/* Choose person */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">اختر الشخص المتوفى *</label>
                <SearchableSelect
                  options={isHeadOfDeath ? livingHeadsOptions : livingDependentsOptions}
                  value={selectedPersonId}
                  onChange={setSelectedPersonId}
                  placeholder={isHeadOfDeath ? "ابحث باسم رب الأسرة المتوفى..." : "ابحث باسم التابع المتوفى..."}
                />
              </div>

              {/* Death Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاريخ الوفاة الموثق *</span>
                </label>
                <input
                  type="date"
                  required
                  value={deathDate}
                  onChange={(e) => setDeathDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-white text-right"
                />
              </div>

              {/* Alert Box */}
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">تنبيه هام ومحترم:</p>
                  {isHeadOfDeath ? (
                    <span>سيتم تسجيل تاريخ الوفاة لرب الأسرة في سجلات التعداد، وسيتم تصنيفه كـ "متوفى" برمجياً وإبقائه في سجل الأسرة للأغراض الأرشيفية والورثة والتوزيع الديموغرافي.</span>
                  ) : (
                    <span>سيتم تعديل الحالة الاجتماعية للتابع المستهدف إلى "متوفى" برمجياً وإخفاؤه تلقائياً من قوائم النشطين مع الحفاظ على تسلسل البيانات التاريخية لجدول الأسر.</span>
                  )}
                </div>
              </div>
            </form>

            {/* Sticky Action Footer */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-lg">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="death-form"
                disabled={!selectedPersonId}
                className={`flex items-center justify-center gap-2 font-black px-6 py-2.5 sm:py-3 rounded-xl shadow-md transition text-xs sm:text-sm ${
                  selectedPersonId
                    ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:from-rose-800 active:to-red-800 text-white cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                }`}
              >
                <span>تسجيل الوفاة وحفظ الحالة رحمه الله 🕯️ 💾</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
