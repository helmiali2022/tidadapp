import { useState, useEffect, FormEvent } from "react";
import { X, Plus, Trash2, Calendar, UserPlus, Home, Info, AlertCircle, Sparkles, GraduationCap, HeartPulse } from "lucide-react";
import { NEIGHBORHOODS, TITLES, GOVERNORATES, GOVERNORATES_WITH_CUSTOM, MARITAL_STATUSES, RELATIONS, QUALIFICATIONS, HEALTH_STATUSES, extractIndividualName } from "../data";
import { Family, Dependent } from "../types";
import SearchableSelect from "./SearchableSelect";

interface AddFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (familyData: any, dependentsData: any[]) => Promise<void>;
  nextFamilyId: number;
  neighborhoods: string[];
  titles: string[];
  maritalStatuses: string[];
}

export default function AddFamilyModal({ 
  isOpen, 
  onClose, 
  onSave, 
  nextFamilyId,
  neighborhoods,
  titles,
  maritalStatuses
}: AddFamilyModalProps) {
  // Family head form states
  const [headName, setHeadName] = useState("");
  const [title, setTitle] = useState("بدون لقب");
  const [subTitle, setSubTitle] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [residency, setResidency] = useState("");
  const [governorate, setGovernorate] = useState("صنعاء");
  const [outsideLocation, setOutsideLocation] = useState("");
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [gender, setGender] = useState("ذكر");
  const [qualification, setQualification] = useState("ثانوي");
  const [healthStatus, setHealthStatus] = useState("سليم / جيدة");
  const [maritalStatus, setMaritalStatus] = useState("متزوج");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [marriageDate, setMarriageDate] = useState("");

  // Dependents state
  const [dependents, setDependents] = useState<any[]>([]);

  // Auto-generated Family Code placeholder
  const familyCode = `FAM-DJ-${String(nextFamilyId).padStart(4, "0")}`;

  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Reset or restore form from draft when modal opens
  useEffect(() => {
    if (isOpen) {
      const savedDraftStr = localStorage.getItem("census_draft_family");
      if (savedDraftStr) {
        try {
          const draft = JSON.parse(savedDraftStr);
          if (draft.headName !== undefined) setHeadName(draft.headName);
          if (draft.title !== undefined) setTitle(draft.title);
          if (draft.subTitle !== undefined) setSubTitle(draft.subTitle);
          if (draft.neighborhood !== undefined) setNeighborhood(draft.neighborhood);
          if (draft.residency !== undefined) setResidency(draft.residency);
          if (draft.governorate !== undefined) setGovernorate(draft.governorate);
          if (draft.outsideLocation !== undefined) setOutsideLocation(draft.outsideLocation);
          if (draft.isCustomLocation !== undefined) setIsCustomLocation(draft.isCustomLocation);
          if (draft.phone !== undefined) setPhone(draft.phone);
          if (draft.secondaryPhone !== undefined) setSecondaryPhone(draft.secondaryPhone);
          if (draft.gender !== undefined) setGender(draft.gender);
          if (draft.qualification !== undefined) setQualification(draft.qualification);
          if (draft.healthStatus !== undefined) setHealthStatus(draft.healthStatus);
          if (draft.maritalStatus !== undefined) setMaritalStatus(draft.maritalStatus);
          if (draft.birthDate !== undefined) setBirthDate(draft.birthDate);
          if (draft.marriageDate !== undefined) setMarriageDate(draft.marriageDate);
          if (draft.deathDate !== undefined) setDeathDate(draft.deathDate);
          if (draft.dependents && Array.isArray(draft.dependents)) setDependents(draft.dependents);
          setHasRestoredDraft(true);
          return;
        } catch (err) {
          console.error("Failed to parse family draft:", err);
        }
      }

      setHeadName("");
      setTitle("بدون لقب");
      setSubTitle("");
      setNeighborhood("");
      setResidency("");
      setGovernorate("صنعاء");
      setOutsideLocation("");
      setIsCustomLocation(false);
      setPhone("");
      setSecondaryPhone("");
      setGender("ذكر");
      setQualification("ثانوي");
      setHealthStatus("سليم / جيدة");
      setMaritalStatus("متزوج");
      setBirthDate("");
      setDeathDate("");
      setMarriageDate("");
      setDependents([]);
      setHasRestoredDraft(false);
    }
  }, [isOpen]);

  // Auto-save form inputs to localStorage (Draft Mode)
  useEffect(() => {
    if (isOpen) {
      if (headName || phone || birthDate || dependents.length > 0 || neighborhood) {
        const draftObj = {
          headName, title, subTitle, neighborhood, residency, governorate, outsideLocation,
          isCustomLocation, phone, secondaryPhone, gender, qualification,
          healthStatus, maritalStatus, birthDate, marriageDate, deathDate, dependents
        };
        localStorage.setItem("census_draft_family", JSON.stringify(draftObj));
      }
    }
  }, [isOpen, headName, title, subTitle, neighborhood, residency, governorate, outsideLocation, isCustomLocation, phone, secondaryPhone, gender, qualification, healthStatus, maritalStatus, birthDate, marriageDate, deathDate, dependents]);

  const handleClearDraft = () => {
    localStorage.removeItem("census_draft_family");
    setHeadName("");
    setTitle("بدون لقب");
    setSubTitle("");
    setNeighborhood("");
    setResidency("");
    setGovernorate("صنعاء");
    setOutsideLocation("");
    setIsCustomLocation(false);
    setPhone("");
    setSecondaryPhone("");
    setGender("ذكر");
    setQualification("ثانوي");
    setHealthStatus("سليم / جيدة");
    setMaritalStatus("متزوج");
    setBirthDate("");
    setDeathDate("");
    setMarriageDate("");
    setDependents([]);
    setHasRestoredDraft(false);
  };

  if (!isOpen) return null;

  // When Neighborhood is selected, automatically update Residency & Location
  const handleNeighborhoodChange = (selectedHood: string) => {
    setNeighborhood(selectedHood);
    setResidency(selectedHood);
    if (selectedHood === "خارج القرية") {
      setGovernorate("صنعاء");
      setOutsideLocation("");
      setIsCustomLocation(false);
    } else {
      setGovernorate(selectedHood);
      setOutsideLocation("");
      setIsCustomLocation(false);
    }
  };

  // When Residency is selected independently
  const handleResidencyChange = (selectedRes: string) => {
    setResidency(selectedRes);
    if (selectedRes === "خارج القرية") {
      setGovernorate("صنعاء");
      setOutsideLocation("");
      setIsCustomLocation(false);
    } else {
      setGovernorate(selectedRes);
      setOutsideLocation("");
      setIsCustomLocation(false);
    }
  };

  // When Governorate dropdown is changed
  const handleGovernorateChange = (gov: string) => {
    setGovernorate(gov);
    if (gov === "إضافة مكان إقامة جديد (كتابة يدوية)") {
      setIsCustomLocation(true);
      setOutsideLocation("");
    } else {
      setIsCustomLocation(false);
    }
  };


  // Validation checks
  const headWords = headName.trim().split(/\s+/).filter(Boolean);
  const isHeadNameInvalid = headWords.length < 3;
  
  // Dependent validation checks
  const depValidations = dependents.map((dep, idx) => {
    const trimmed = dep.name.trim();
    const cleaned = extractIndividualName(trimmed, headName, dep.title || title);
    const isDuplicateWithHead = cleaned !== "" && headWords.length > 0 && cleaned.toLowerCase() === headWords[0].toLowerCase();
    const isDuplicateWithOtherDep = cleaned !== "" && dependents.some((d, i) => i !== idx && extractIndividualName(d.name, headName, d.title || title).toLowerCase() === cleaned.toLowerCase());
    return {
      isDuplicate: isDuplicateWithHead || isDuplicateWithOtherDep
    };
  });

  const hasAnyDepError = depValidations.some(v => v.isDuplicate);
  const isFormInvalid = isHeadNameInvalid || hasAnyDepError;

  // Add a dependent row locally in the modal
  const addDependentRow = () => {
    setDependents([
      ...dependents,
      {
        id: Date.now() + Math.random(),
        name: "",
        title: title, // Pre-fill with the family head's title
        relation: "ابن",
        gender: "ذكر",
        qualification: "أُمّي / بدون مؤهل",
        phone: "",
        secondaryPhone: "",
        nationalId: "",
        birthDate: "",
        maritalStatus: "أعزب"
      }
    ]);
  };

  // Remove dependent row
  const removeDependentRow = (id: number) => {
    setDependents(dependents.filter((d) => d.id !== id));
  };

  // Update dependent row value
  const updateDependentRow = (id: number, field: string, value: any) => {
    setDependents(
      dependents.map((d) => {
        if (d.id === id) {
          const updated = { ...d, [field]: value };
          if (field === "maritalStatus" && (value.includes("متوفي") || value.includes("متوفى"))) {
            updated.healthStatus = "متوفى";
          }
          if (field === "healthStatus" && (value.includes("متوفى") || value.includes("متوفي"))) {
            updated.maritalStatus = "متوفي / متوفاة";
          }
          return updated;
        }
        return d;
      })
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!headName.trim()) {
      alert("يرجى إدخال اسم رب الأسرة");
      return;
    }
    if (!neighborhood) {
      alert("يرجى اختيار المحلة");
      return;
    }
    if (!birthDate) {
      alert("يرجى تحديد تاريخ ميلاد رب الأسرة");
      return;
    }

    // Prepare residency & location based on rules
    const finalResidency = residency || neighborhood;
    let finalLocation = "";

    if (finalResidency === "خارج القرية") {
      if (governorate === "إضافة مكان إقامة جديد (كتابة يدوية)" || isCustomLocation) {
        finalLocation = outsideLocation.trim() || "خارج القرية";
      } else {
        finalLocation = outsideLocation.trim() ? `${governorate} - ${outsideLocation.trim()}` : governorate;
      }
    } else {
      finalLocation = finalResidency;
    }

    const familyPayload = {
      headName,
      neighborhood,
      phone,
      secondaryPhone,
      residency: finalResidency,
      location: finalLocation,
      gender,
      qualification,
      healthStatus: healthStatus || "سليم / جيدة",
      title, // اللقب الأساسي (العمود I)
      subTitle, // اللقب الفرعي
      maritalStatus,
      birthDate,
      deathDate,
      marriageDate,
      familyCode
    };

    // Prepare dependents payload
    const dependentsPayload = dependents.map((d) => ({
      name: extractIndividualName(d.name, headName, d.title || title),
      title: d.title || title,
      subTitle: d.subTitle || subTitle || "",
      relation: d.relation,
      gender: d.gender || "ذكر",
      qualification: d.qualification || "أُمّي / بدون مؤهل",
      healthStatus: d.healthStatus || "سليم / جيدة",
      phone: d.phone,
      secondaryPhone: d.secondaryPhone || "",
      nationalId: d.nationalId,
      residency: finalResidency, // Automatically matches family residency
      location: finalLocation,
      birthDate: d.birthDate,
      maritalStatus: d.maritalStatus,
      familyCode: familyCode
    }));

    await onSave(familyPayload, dependentsPayload);
    localStorage.removeItem("census_draft_family");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white w-full max-w-4xl max-h-[90vh] my-auto overflow-hidden rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">تسجيل أسرة جديدة</h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5">تسجيل رب الأسرة والتابعين بربط تلقائي ذكي</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full transition text-emerald-100 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="add-family-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 pb-24 sm:pb-32">
          {/* Draft restored notification */}
          {hasRestoredDraft && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
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
          {/* Section 1: Family Info */}
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 text-emerald-800 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>بيانات رب الأسرة الرئيسي</span>
              <span className="mr-auto bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-100 font-mono">
                كود الأسرة: {familyCode}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* رب الأسرة */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">اسم رب الأسرة (ثلاثي أو رباعي على الأقل) *</label>
                <input
                  type="text"
                  required
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder="مثال: حلمي عبدالكريم علي الخطيب"
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition ${
                    isHeadNameInvalid 
                      ? "border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500" 
                      : "border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                  }`}
                />
                {isHeadNameInvalid && (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>⚠️ يجب إدخال اسم رب الأسرة ثلاثياً أو رباعياً على الأقل</span>
                  </p>
                )}
              </div>

              {/* اللقب الأساسي (العمود I) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">اللقب الأساسي (العمود I) *</label>
                <SearchableSelect
                  options={titles}
                  value={title}
                  onChange={setTitle}
                  placeholder="الخطيب"
                />
              </div>

              {/* اللقب الفرعي / الشهرة */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">اللقب الفرعي / الشهرة (اختياري)</label>
                <input
                  type="text"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="مثال: حاجب، عثمان..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* المحلة المعتمدة */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>المحلة السكنية (بالقرية) *</span>
                </label>
                <SearchableSelect
                  options={neighborhoods}
                  value={neighborhood}
                  onChange={handleNeighborhoodChange}
                  placeholder="اختر المحلة..."
                />
              </div>

              {/* حقل الإقامة الحالية (مفصل ومستقل) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>مقر الإقامة الحالية *</span>
                </label>
                <SearchableSelect
                  options={NEIGHBORHOODS}
                  value={residency}
                  onChange={handleResidencyChange}
                  placeholder="حدد مكان الإقامة..."
                />
              </div>

              {/* Conditional Residency Location Rendering */}
              {residency === "خارج القرية" && (
                <>
                  {/* المحافظة / خيار إضافة مكان جديد */}
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <span>محافظة / مكان الإقامة *</span>
                    </label>
                    <SearchableSelect
                      options={GOVERNORATES_WITH_CUSTOM}
                      value={governorate}
                      onChange={handleGovernorateChange}
                      placeholder="اختر المحافظة اليمنية..."
                    />
                  </div>

                  {/* مكان إقامة جديد / تفاصيل المكان بالخارج */}
                  {(governorate === "إضافة مكان إقامة جديد (كتابة يدوية)" || isCustomLocation || governorate) && (
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-emerald-700">
                        {governorate === "إضافة مكان إقامة جديد (كتابة يدوية)" || isCustomLocation 
                          ? "اكتب مكان الإقامة الجديد يدوياً *" 
                          : "تفاصيل المدينة أو المنطقة بالخارج"}
                      </label>
                      <input
                        type="text"
                        value={outsideLocation}
                        onChange={(e) => setOutsideLocation(e.target.value)}
                        placeholder={
                          governorate === "إضافة مكان إقامة جديد (كتابة يدوية)" || isCustomLocation
                            ? "اكتب مكان الإقامة هنا..."
                            : "مثال: الرياض، السعودية أو حي المعلا، عدن"
                        }
                        className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                      />
                    </div>
                  )}
                </>
              )}

              {/* رقم الجوال الرئيسي */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">رقم جوال العائلة</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="771787747"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                />
              </div>

              {/* رقم جوال إضافي */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">رقم هاتف إضافي / جوال آخر</label>
                <input
                  type="text"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="770000000 (اختياري)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white font-mono"
                />
              </div>

              {/* الجنس */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">الجنس *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
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
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800"
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
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-slate-800"
                >
                  {HEALTH_STATUSES.map((hs) => (
                    <option key={hs} value={hs}>{hs}</option>
                  ))}
                </select>
              </div>

              {/* الحالة الاجتماعية */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">الحالة الاجتماعية *</label>
                <select
                  value={maritalStatus}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaritalStatus(val);
                    if (val.includes("متوفي") || val.includes("متوفى")) {
                      setHealthStatus("متوفى");
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  {maritalStatuses.map((status, idx) => (
                    <option key={`${status}-${idx}`} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* تاريخ الميلاد */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاريخ الميلاد (إجباري) *</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white text-right"
                />
              </div>

              {/* تاريخ الزواج */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاريخ الزواج (اختياري)</span>
                </label>
                <input
                  type="date"
                  value={marriageDate}
                  onChange={(e) => setMarriageDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white text-right"
                />
              </div>

              {/* تاريخ الوفاة */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاريخ الوفاة (في حال كان متوفى)</span>
                </label>
                <input
                  type="date"
                  value={deathDate}
                  onChange={(e) => setDeathDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white text-right"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dependents */}
          <div className="pt-2">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Home className="w-4 h-4" />
                <span>التابعين وأفراد الأسرة الملحقين</span>
              </div>
              <button
                type="button"
                onClick={addDependentRow}
                className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-lg border border-emerald-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة تابع جديد</span>
              </button>
            </div>

            {dependents.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">لم يتم إلحاق أي تابعين بالأسرة حتى الآن.</p>
                <p className="text-xs text-slate-400 mt-1">انقر على الزر أعلاه لإضافة الزوجة أو الأبناء أو التابعين الآخرين مباشرةً.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dependents.map((dep, index) => {
                  const val = depValidations[index] || { hasSpace: false, isDuplicate: false };
                  return (
                    <div 
                      key={`newdep-${dep.id || 'noid'}-${index}`} 
                      className="p-4 bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col gap-4 relative hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-md">
                          التابع رقم #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDependentRow(dep.id)}
                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition cursor-pointer"
                          title="حذف هذا التابع"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* الاسم */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-xs text-slate-500 font-semibold">اسم التابع (الاسم الأول فقط) *</label>
                          <input
                            type="text"
                            required
                            value={dep.name}
                            onChange={(e) => updateDependentRow(dep.id, "name", e.target.value)}
                            placeholder="حلمي"
                            className={`px-2.5 py-1.5 text-xs border rounded-md outline-none bg-white transition ${
                              val.isDuplicate
                                ? "border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-1 focus:ring-rose-500"
                                : "border-slate-200 focus:border-emerald-500"
                            }`}
                          />
                          {val.isDuplicate && (
                            <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>⚠️ هذا الاسم مستخدم سابقاً داخل نفس العائلة!</span>
                            </p>
                          )}
                        </div>

                        {/* صلة القرابة */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">صلة القرابة *</label>
                          <select
                            value={dep.relation}
                            onChange={(e) => updateDependentRow(dep.id, "relation", e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white focus:border-emerald-500"
                          >
                            {RELATIONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        {/* الجنس */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">الجنس</label>
                          <select
                            value={dep.gender || "ذكر"}
                            onChange={(e) => updateDependentRow(dep.id, "gender", e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white focus:border-emerald-500"
                          >
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                          </select>
                        </div>

                        {/* المؤهل العلمي */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">المؤهل العلمي / الدراسي</label>
                          <select
                            value={dep.qualification || "أُمّي / بدون مؤهل"}
                            onChange={(e) => updateDependentRow(dep.id, "qualification", e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white focus:border-emerald-500 font-medium"
                          >
                            {QUALIFICATIONS.map((q) => (
                              <option key={q} value={q}>{q}</option>
                            ))}
                          </select>
                        </div>

                        {/* الحالة الصحية */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">الحالة الصحية</label>
                          <select
                            value={dep.healthStatus || "سليم / جيدة"}
                            onChange={(e) => updateDependentRow(dep.id, "healthStatus", e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white focus:border-emerald-500 font-medium"
                          >
                            {HEALTH_STATUSES.map((hs) => (
                              <option key={hs} value={hs}>{hs}</option>
                            ))}
                          </select>
                        </div>

                        {/* تاريخ الميلاد */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">تاريخ الميلاد *</label>
                          <input
                            type="date"
                            required
                            value={dep.birthDate}
                            onChange={(e) => updateDependentRow(dep.id, "birthDate", e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white text-right focus:border-emerald-500"
                          />
                        </div>

                        {/* الرقم الوطني */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">الرقم الوطني</label>
                          <input
                            type="text"
                            value={dep.nationalId}
                            onChange={(e) => updateDependentRow(dep.id, "nationalId", e.target.value)}
                            placeholder="الرقم التعريفي"
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white focus:border-emerald-500 font-mono"
                          />
                        </div>

                        {/* الحالة الاجتماعية */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">الحالة الاجتماعية</label>
                          <select
                            value={dep.maritalStatus}
                            onChange={(e) => updateDependentRow(dep.id, "maritalStatus", e.target.value)}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white focus:border-emerald-500"
                          >
                            {maritalStatuses.map((st, idx) => (
                              <option key={`${st}-${idx}`} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>

                        {/* رقم الجوال الرئيسي للفرد */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">رقم هاتف الفرد</label>
                          <input
                            type="text"
                            value={dep.phone}
                            onChange={(e) => updateDependentRow(dep.id, "phone", e.target.value)}
                            placeholder="771787747"
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white focus:border-emerald-500 font-mono"
                          />
                        </div>

                        {/* رقم الجوال الإضافي للفرد */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-500 font-semibold">رقم هاتف إضافي</label>
                          <input
                            type="text"
                            value={dep.secondaryPhone || ""}
                            onChange={(e) => updateDependentRow(dep.id, "secondaryPhone", e.target.value)}
                            placeholder="770000000"
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none bg-white focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Sticky Footer */}
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
            form="add-family-form"
            disabled={isFormInvalid}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 text-white font-black px-6 py-2.5 sm:py-3 rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs sm:text-sm"
          >
            <span>حفظ الأسرة والتابعين بالكامل 💾</span>
          </button>
        </div>
      </div>
    </div>
  );
}
