import React, { useState } from "react";
import { AlertTriangle, Search, Filter, Edit2, ShieldAlert, CheckCircle2, User, Users, Phone, Calendar, CreditCard, MapPin } from "lucide-react";
import { Family, Dependent } from "../types";

export interface IncompleteItem {
  id: string;
  type: "family" | "dependent";
  rawId: number;
  name: string;
  familyCode: string;
  missingFields: { key: string; label: string; severity: "high" | "medium" | "low" }[];
  familyObj?: Family;
  dependentObj?: Dependent;
}

interface IncompleteRecordsModalProps {
  isOpen: boolean;
  families: Family[];
  dependents: Dependent[];
  onClose: () => void;
  onEditFamily: (family: Family) => void;
  onEditDependent: (dependent: Dependent) => void;
}

export default function IncompleteRecordsModal({
  isOpen,
  families,
  dependents,
  onClose,
  onEditFamily,
  onEditDependent,
}: IncompleteRecordsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "family" | "dependent">("all");
  const [missingFieldFilter, setMissingFieldFilter] = useState<string>("all");

  if (!isOpen) return null;

  // Calculate incomplete items
  const incompleteItems: IncompleteItem[] = [];

  // 1. Audit Families
  families.forEach((fam) => {
    const missing: { key: string; label: string; severity: "high" | "medium" | "low" }[] = [];
    if (!fam.headName || !fam.headName.trim()) {
      missing.push({ key: "headName", label: "اسم رب الأسرة", severity: "high" });
    }
    if (!fam.phone || !fam.phone.trim()) {
      missing.push({ key: "phone", label: "رقم الجوال", severity: "high" });
    }
    if (!fam.neighborhood || !fam.neighborhood.trim()) {
      missing.push({ key: "neighborhood", label: "المحلة / الحي", severity: "medium" });
    }
    if (!fam.birthDate || !fam.birthDate.trim()) {
      missing.push({ key: "birthDate", label: "تاريخ الميلاد لرب الأسرة", severity: "medium" });
    }

    if (missing.length > 0) {
      incompleteItems.push({
        id: `fam-${fam.id}`,
        type: "family",
        rawId: fam.id,
        name: `${fam.headName || "أسرة غير معنونة"} (${fam.title || "بدون لقب"})`,
        familyCode: fam.familyCode,
        missingFields: missing,
        familyObj: fam,
      });
    }
  });

  // 2. Audit Dependents
  dependents.forEach((dep) => {
    const missing: { key: string; label: string; severity: "high" | "medium" | "low" }[] = [];
    if (!dep.nationalId || !dep.nationalId.trim()) {
      missing.push({ key: "nationalId", label: "الرقم الوطني", severity: "high" });
    }
    if (!dep.birthDate || !dep.birthDate.trim()) {
      missing.push({ key: "birthDate", label: "تاريخ الميلاد", severity: "high" });
    }
    if (!dep.phone || !dep.phone.trim()) {
      missing.push({ key: "phone", label: "رقم الجوال / التواصل", severity: "low" });
    }

    if (missing.length > 0) {
      incompleteItems.push({
        id: `dep-${dep.id}`,
        type: "dependent",
        rawId: dep.id,
        name: `${dep.name} (${dep.relation})`,
        familyCode: dep.familyCode,
        missingFields: missing,
        dependentObj: dep,
      });
    }
  });

  // Filter items
  const filteredItems = incompleteItems.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;

    if (missingFieldFilter !== "all") {
      const hasField = item.missingFields.some((mf) => mf.key === missingFieldFilter);
      if (!hasField) return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = item.familyCode.toLowerCase().includes(q);
      return matchName || matchCode;
    }

    return true;
  });

  const totalHighSeverity = incompleteItems.filter((i) => i.missingFields.some((f) => f.severity === "high")).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] my-auto rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-amber-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-400/30 text-amber-300">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>تدقيق الكشوفات والسجلات الناقصة</span>
                <span className="bg-amber-500 text-amber-950 font-black px-2 py-0.5 rounded-full text-[11px]">
                  {incompleteItems.length} سجل بحاجة لاستكمال
                </span>
              </h3>
              <p className="text-[11px] text-amber-200 mt-0.5">
                فحص تلقائي للأسر والأفراد الذين تفتقر سجلاتهم لرقم وطني أو تاريخ ميلاد أو رقم جوال لتسهيل عمل جامع البيانات.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-slate-50 p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الأسرة، الفرد، أو كود الأسرة..."
              className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">الكل ({incompleteItems.length})</option>
              <option value="family">أسر فقط ({incompleteItems.filter(i => i.type === "family").length})</option>
              <option value="dependent">أفراد فقط ({incompleteItems.filter(i => i.type === "dependent").length})</option>
            </select>

            {/* Filter by Missing Field */}
            <select
              value={missingFieldFilter}
              onChange={(e) => setMissingFieldFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">كل الحقول الناقصة</option>
              <option value="nationalId">الرقم الوطني مفقود</option>
              <option value="birthDate">تاريخ الميلاد مفقود</option>
              <option value="phone">رقم الجوال مفقود</option>
              <option value="neighborhood">المحلة مفقودة</option>
            </select>
          </div>
        </div>

        {/* List of incomplete items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/60">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-white rounded-2xl border border-slate-200 p-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">لا توجد سجلات ناقصة مطابقة لتصفيتك</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                ممتاز! جميع السجلات المسجلة مستوفاة للبيانات الأساسية أو لا تطابق خيارات البحث الحالية.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-amber-300 shadow-xs transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                        item.type === "family"
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {item.type === "family" ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      <span>{item.type === "family" ? "رب أسرة" : "تابع"}</span>
                    </span>

                    <h4 className="text-xs sm:text-sm font-black text-slate-900">{item.name}</h4>

                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-bold">
                      {item.familyCode}
                    </span>
                  </div>

                  {/* Missing Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 ml-1">النواقص:</span>
                    {item.missingFields.map((field) => (
                      <span
                        key={field.key}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                          field.severity === "high"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : field.severity === "medium"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {field.key === "nationalId" && <CreditCard className="w-3 h-3" />}
                        {field.key === "birthDate" && <Calendar className="w-3 h-3" />}
                        {field.key === "phone" && <Phone className="w-3 h-3" />}
                        {field.key === "neighborhood" && <MapPin className="w-3 h-3" />}
                        <span>{field.label} مفقود</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (item.type === "family" && item.familyObj) {
                      onEditFamily(item.familyObj);
                    } else if (item.type === "dependent" && item.dependentObj) {
                      onEditDependent(item.dependentObj);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>استكمال وتعديل السجل</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div>
            إجمالي السجلات التي تتطلب إجراء: <strong className="font-mono text-amber-900 font-black">{incompleteItems.length}</strong> | عالي الأهمية: <strong className="font-mono text-rose-700 font-black">{totalHighSeverity}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
