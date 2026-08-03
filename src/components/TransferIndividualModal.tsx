import { useState, useEffect, FormEvent } from "react";
import { X, ArrowLeftRight, Check, AlertTriangle, ArrowLeft } from "lucide-react";
import { Family, Dependent } from "../types";
import SearchableSelect from "./SearchableSelect";

interface TransferIndividualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dependentId: number, targetFamilyCode: string) => Promise<void>;
  families: Family[];
  dependents: Dependent[];
}

export default function TransferIndividualModal({
  isOpen,
  onClose,
  onSave,
  families,
  dependents
}: TransferIndividualModalProps) {
  const [selectedDependentId, setSelectedDependentId] = useState("");
  const [selectedTargetFamilyCode, setSelectedTargetFamilyCode] = useState("");

  // Reset on toggle
  useEffect(() => {
    if (isOpen) {
      setSelectedDependentId("");
      setSelectedTargetFamilyCode("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Create selectable options for dependents
  const dependentOptions = dependents.map((d) => {
    const parentFamily = families.find((f) => f.familyCode === d.familyCode);
    const parentName = parentFamily ? `${parentFamily.headName} ${parentFamily.title}` : "غير معروف";
    return {
      value: String(d.id),
      label: `${d.name} ${d.title} (حالياً مع: ${parentName} - كود: ${d.familyCode})`
    };
  });

  // Get current dependent and their family
  const currentDependent = dependents.find((d) => String(d.id) === selectedDependentId);
  const currentFamily = currentDependent
    ? families.find((f) => f.familyCode === currentDependent.familyCode)
    : null;

  // Create target family options (excluding the current family of the dependent)
  const targetFamilyOptions = families
    .filter((f) => !currentFamily || f.familyCode !== currentFamily.familyCode)
    .map((f) => ({
      value: f.familyCode,
      label: `${f.headName} ${f.title} (محلة ${f.neighborhood} - ${f.familyCode})`
    }));

  const targetFamily = families.find((f) => f.familyCode === selectedTargetFamilyCode);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedDependentId) {
      alert("يرجى اختيار الفرد المراد نقله");
      return;
    }
    if (!selectedTargetFamilyCode) {
      alert("يرجى اختيار الأسرة المستهدفة لنقل الفرد إليها");
      return;
    }

    await onSave(parseInt(selectedDependentId), selectedTargetFamilyCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] my-auto overflow-hidden rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-orange-500 to-amber-600 text-white select-none">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">نقل فرد بين الأسر</h2>
              <p className="text-xs text-orange-100 mt-0.5">نقل تبعية فرد من أسرة إلى أسرة أخرى وتحديث الإحصائيات آلياً</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-full transition text-orange-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form id="transfer-individual-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 pb-24 sm:pb-32">
          {/* Step 1: Select Dependent */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">اختر الفرد المراد نقله *</label>
            <SearchableSelect
              options={dependentOptions}
              value={selectedDependentId}
              onChange={setSelectedDependentId}
              placeholder="ابحث باسم التابع..."
            />
          </div>

          {/* Current Status Box */}
          {currentDependent && currentFamily && (
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block">الوضعية الحالية للفرد</span>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
                <div>
                  الفرد: <span className="font-bold text-slate-900">{currentDependent.name} {currentDependent.title}</span>
                </div>
                <div>
                  الأسرة الحالية: <span className="font-bold text-slate-900">{currentFamily.headName} {currentFamily.title}</span>
                </div>
                <div>
                  المحلة الحالية: <span className="font-bold text-emerald-700">{currentFamily.neighborhood}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Target Family */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">اختر الأسرة المستهدفة (الجديدة) *</label>
            <SearchableSelect
              options={targetFamilyOptions}
              value={selectedTargetFamilyCode}
              onChange={setSelectedTargetFamilyCode}
              placeholder="ابحث باسم رب الأسرة المستهدفة..."
              disabled={!selectedDependentId}
            />
          </div>

          {/* Comparison and Logic Explanation */}
          {currentDependent && currentFamily && targetFamily && (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-orange-800 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-orange-600" />
                <span>معاينة النقل والمنطق البرمجي</span>
              </div>
              
              <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
                <div className="text-center bg-white border border-slate-100 rounded-lg p-2.5 flex-1">
                  <span className="block text-slate-400 text-[10px] mb-1">الأسرة السابقة</span>
                  <p className="font-bold text-slate-800 truncate">{currentFamily.headName}</p>
                  <p className="text-[10px] text-rose-600 mt-1">سيقل عدد أفرادها بـ (1)</p>
                </div>

                <ArrowLeft className="w-4 h-4 text-orange-500 shrink-0" />

                <div className="text-center bg-white border border-slate-100 rounded-lg p-2.5 flex-1">
                  <span className="block text-slate-400 text-[10px] mb-1">الأسرة الجديدة</span>
                  <p className="font-bold text-slate-800 truncate">{targetFamily.headName}</p>
                  <p className="text-[10px] text-emerald-600 mt-1">سيزداد أفرادها بـ (1)</p>
                </div>
              </div>

              <p className="text-[11px] text-orange-700 leading-relaxed text-center">
                عند تأكيد النقل، سيتم إسناد كود العائلة الجديد <span className="font-mono font-bold">{targetFamily.familyCode}</span> ومحلة الإقامة الجديدة <span className="font-bold">({targetFamily.residency})</span> للفرد تلقائياً لضمان سلامة البيانات.
              </p>
            </div>
          )}
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
            form="transfer-individual-form"
            disabled={!selectedDependentId || !selectedTargetFamilyCode}
            className={`flex items-center justify-center gap-2 font-black px-6 py-2.5 sm:py-3 rounded-xl shadow-md transition text-xs sm:text-sm ${
              selectedDependentId && selectedTargetFamilyCode
                ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:from-orange-700 active:to-amber-700 text-white cursor-pointer"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            }`}
          >
            <span>تأكيد ونقل الفرد الآن 💾</span>
          </button>
        </div>
      </div>
    </div>
  );
}
