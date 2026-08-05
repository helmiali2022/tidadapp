import { useState, useEffect, FormEvent } from "react";
import { X, UserPlus, Calendar, Info, AlertCircle, GraduationCap, HeartPulse } from "lucide-react";
import { TITLES, RELATIONS, MARITAL_STATUSES, QUALIFICATIONS, HEALTH_STATUSES, extractIndividualName } from "../data";
import { Family, Dependent } from "../types";
import SearchableSelect from "./SearchableSelect";

interface AddDependentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dependentData: any) => Promise<void>;
  families: Family[];
  dependents?: Dependent[];
  titles: string[];
  maritalStatuses: string[];
  initialFamilyCode?: string;
}

export default function AddDependentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  families,
  dependents = [],
  titles,
  maritalStatuses,
  initialFamilyCode
}: AddDependentModalProps) {
  const [selectedFamilyCode, setSelectedFamilyCode] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("بدون لقب");
  const [subTitle, setSubTitle] = useState("");
  const [relation, setRelation] = useState("ابن");
  const [gender, setGender] = useState("ذكر");
  const [qualification, setQualification] = useState("أُمّي / بدون مؤهل");
  const [healthStatus, setHealthStatus] = useState("سليم / جيدة");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("أعزب");

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Reset or restore form from draft when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedDraftStr = localStorage.getItem("census_draft_dependent");
      if (savedDraftStr) {
        try {
          const draft = JSON.parse(savedDraftStr);
          if (draft.selectedFamilyCode !== undefined) setSelectedFamilyCode(draft.selectedFamilyCode);
          if (draft.name !== undefined) setName(draft.name);
          if (draft.title !== undefined) setTitle(draft.title);
          if (draft.subTitle !== undefined) setSubTitle(draft.subTitle);
          if (draft.relation !== undefined) setRelation(draft.relation);
          if (draft.gender !== undefined) setGender(draft.gender);
          if (draft.qualification !== undefined) setQualification(draft.qualification);
          if (draft.healthStatus !== undefined) setHealthStatus(draft.healthStatus);
          if (draft.phone !== undefined) setPhone(draft.phone);
          if (draft.secondaryPhone !== undefined) setSecondaryPhone(draft.secondaryPhone);
          if (draft.nationalId !== undefined) setNationalId(draft.nationalId);
          if (draft.birthDate !== undefined) setBirthDate(draft.birthDate);
          if (draft.maritalStatus !== undefined) setMaritalStatus(draft.maritalStatus);
          setHasRestoredDraft(true);
          return;
        } catch (err) {
          console.error("Failed to parse dependent draft:", err);
        }
      }

      const codeToUse = initialFamilyCode || "";
      setSelectedFamilyCode(codeToUse);
      setName("");
      setTitle("بدون لقب");
      setRelation("ابن");
      setGender("ذكر");
      setQualification("أُمّي / بدون مؤهل");
      setHealthStatus("سليم / جيدة");
      setPhone("");
      setSecondaryPhone("");
      setNationalId("");
      setBirthDate("");
      setMaritalStatus("أعزب");
      setHasRestoredDraft(false);

      if (codeToUse) {
        const family = families.find(f => f.familyCode === codeToUse);
        if (family) {
          setTitle(family.title || "بدون لقب");
          setSubTitle(family.subTitle || "");
        }
      }
    }
  }, [isOpen, initialFamilyCode, families]);

  // Auto-save dependent form inputs to localStorage (Draft Mode)
  useEffect(() => {
    if (isOpen) {
      if (name || phone || nationalId || birthDate || selectedFamilyCode) {
        const draftObj = {
          selectedFamilyCode, name, title, subTitle, relation, gender, qualification,
          healthStatus, phone, secondaryPhone, nationalId, birthDate, maritalStatus
        };
        localStorage.setItem("census_draft_dependent", JSON.stringify(draftObj));
      }
    }
  }, [isOpen, selectedFamilyCode, name, title, subTitle, relation, gender, qualification, healthStatus, phone, secondaryPhone, nationalId, birthDate, maritalStatus]);

  const handleClearDraft = () => {
    localStorage.removeItem("census_draft_dependent");
    const codeToUse = initialFamilyCode || "";
    setSelectedFamilyCode(codeToUse);
    setName("");
    setTitle("بدون لقب");
    setSubTitle("");
    setRelation("ابن");
    setGender("ذكر");
    setQualification("أُمّي / بدون مؤهل");
    setHealthStatus("سليم / جيدة");
    setPhone("");
    setSecondaryPhone("");
    setNationalId("");
    setBirthDate("");
    setMaritalStatus("أعزب");
    setHasRestoredDraft(false);
  };

  // When family is chosen, auto-default the title to match the head of the family
  useEffect(() => {
    if (selectedFamilyCode) {
      const family = families.find(f => f.familyCode === selectedFamilyCode);
      if (family) {
        setTitle(family.title || "بدون لقب");
        setSubTitle(family.subTitle || "");
      }
    }
  }, [selectedFamilyCode, families]);

  if (!isOpen) return null;

  const selectedFamily = families.find(f => f.familyCode === selectedFamilyCode);

  // Validations & Clean individual name
  const rawTrimmedName = name.trim();
  const cleanedName = extractIndividualName(rawTrimmedName, selectedFamily?.headName, selectedFamily?.title || title);

  // Duplicate check within selected family
  let isDuplicateName = false;
  if (selectedFamilyCode && cleanedName !== "") {
    if (selectedFamily && selectedFamily.headName) {
      const headWords = selectedFamily.headName.trim().split(/\s+/).filter(Boolean);
      if (headWords[0] && headWords[0].toLowerCase() === cleanedName.toLowerCase()) {
        isDuplicateName = true;
      }
    }
    if (!isDuplicateName && dependents && dependents.length > 0) {
      const familyDeps = dependents.filter(d => d.familyCode === selectedFamilyCode);
      if (familyDeps.some(d => d.name && extractIndividualName(d.name, selectedFamily?.headName, selectedFamily?.title).toLowerCase() === cleanedName.toLowerCase())) {
        isDuplicateName = true;
      }
    }
  }

  const isFormInvalid = !selectedFamilyCode || !rawTrimmedName || isDuplicateName || !birthDate;

  // Map families for the searchable combobox
  const familyOptions = families.map((f) => ({
    value: f.familyCode,
    label: `${f.headName} ${f.title} (محلة ${f.neighborhood} - ${f.familyCode})`
  }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isFormInvalid) return;

    const residency = selectedFamily ? selectedFamily.residency : "غير محدد";

    const payload = {
      name: cleanedName,
      title, // اللقب الأساسي (العمود I)
      subTitle, // اللقب الفرعي
      relation,
      gender,
      qualification,
      healthStatus: healthStatus || "سليم / جيدة",
      phone,
      secondaryPhone,
      nationalId,
      residency, // automatically synced with family residency
      birthDate,
      maritalStatus,
      familyCode: selectedFamilyCode
    };

    await onSave(payload);
    localStorage.removeItem("census_draft_dependent");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white w-full max-w-2xl max-h-[90vh] my-auto overflow-hidden rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">إضافة فرد جديد للأسرة</h2>
              <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5">تسجيل تابع وإلحاقه بأسرة مسجلة في التعداد السكاني</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full transition text-blue-100 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form id="add-dependent-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 pb-24 sm:pb-32">
          {/* Draft restored notification */}
          {hasRestoredDraft && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold">
                <span>✨ تم استعادة مسودة محفوظة تلقائياً (Draft Mode)</span>
              </div>
              <button
                type="button"
                onClick={handleClearDraft}
                className="bg-amber-200/60 hover:bg-amber-300 text-amber-950 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
              >
                مسح المسودة والبدء من جديد 🗑️
              </button>
            </div>
          )}
          {/* Select Family */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">اختر الأسرة الحاضنة *</label>
            <SearchableSelect
              options={familyOptions}
              value={selectedFamilyCode}
              onChange={setSelectedFamilyCode}
              placeholder="ابحث باسم رب الأسرة أو كود الأسرة..."
            />
          </div>

          {selectedFamily && (
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-2.5 text-xs text-blue-800">
              <Info className="w-4 h-4 shrink-0" />
              <div>
                سيتم إسناد محلة الإقامة كـ <span className="font-bold">({selectedFamily.residency})</span> ومكان الإقامة كـ <span className="font-bold">({selectedFamily.location})</span> تلقائياً للتابع بناءً على بيانات رب الأسرة.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* الاسم */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">اسم الفرد التابع (الاسم الأول فقط) *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: حلمي"
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition ${
                  isDuplicateName
                    ? "border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500"
                    : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                }`}
              />
              {isDuplicateName && (
                <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>⚠️ هذا الاسم مستخدم سابقاً داخل نفس العائلة!</span>
                </p>
              )}
            </div>

            {/* صلة القرابة */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">صلة القرابة برب الأسرة *</label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* الجنس */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">الجنس *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              >
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
            </div>

            {/* المؤهل العلمي / الدراسي */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>المؤهل العلمي / الدراسي</span>
              </label>
              <select
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-800"
              >
                {QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            {/* الحالة الصحية */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                <span>الحالة الصحية (اختياري)</span>
              </label>
              <select
                value={healthStatus}
                onChange={(e) => setHealthStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white font-medium text-slate-800"
              >
                {HEALTH_STATUSES.map((hs) => (
                  <option key={hs} value={hs}>{hs}</option>
                ))}
              </select>
            </div>

            {/* تاريخ الميلاد */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاريخ الميلاد *</span>
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-right"
              />
            </div>

            {/* الرقم الوطني */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">الرقم الوطني</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="الرقم العائلي أو الشخصي"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white font-mono"
              />
            </div>

            {/* الحالة الاجتماعية */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">الحالة الاجتماعية</label>
              <select
                value={maritalStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setMaritalStatus(val);
                  if (val.includes("متوفي") || val.includes("متوفى")) {
                    setHealthStatus("متوفى");
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {maritalStatuses.map((status, idx) => (
                  <option key={`${status}-${idx}`} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* رقم الهاتف الرئيسي */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">رقم هاتف الفرد (إن وجد)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="771787747"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white font-mono"
              />
            </div>

            {/* رقم الهاتف الإضافي */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">رقم هاتف إضافي / جوال آخر</label>
              <input
                type="text"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value)}
                placeholder="770000000 (اختياري)"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white font-mono"
              />
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
            form="add-dependent-form"
            disabled={isFormInvalid}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-black px-6 py-2.5 sm:py-3 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <span>إضافة الفرد وحفظ البيانات 💾</span>
          </button>
        </div>
      </div>
    </div>
  );
}
