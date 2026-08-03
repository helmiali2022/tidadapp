import { useState } from "react";
import { 
  Download, FileSpreadsheet, FileText, Printer, X, Filter, CheckCircle2,
  Building, MapPin, Tag, ShieldCheck, FileCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import { Family, Dependent } from "../types";
import { NEIGHBORHOODS, TITLES, formatDependentFullName } from "../data";

interface AdvancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  families: Family[];
  dependents: Dependent[];
}

export default function AdvancedExportModal({
  isOpen,
  onClose,
  families,
  dependents
}: AdvancedExportModalProps) {
  const [dataTarget, setDataTarget] = useState<"families" | "dependents" | "all">("families");
  const [scope, setScope] = useState<"all" | "neighborhood" | "title">("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(NEIGHBORHOODS[0] || "العنين");
  const [selectedTitle, setSelectedTitle] = useState(TITLES[0] || "الخطيب");
  const [format, setFormat] = useState<"excel" | "csv" | "print">("excel");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Filter families based on scope
  const getFilteredFamilies = () => {
    let list = [...families];
    if (scope === "neighborhood") {
      list = list.filter(f => f.neighborhood === selectedNeighborhood || f.residency === selectedNeighborhood);
    } else if (scope === "title") {
      list = list.filter(f => f.title === selectedTitle);
    }
    return list;
  };

  // Filter dependents based on scope
  const getFilteredDependents = () => {
    let list = [...dependents];
    if (scope === "neighborhood") {
      list = list.filter(d => d.residency === selectedNeighborhood);
    } else if (scope === "title") {
      list = list.filter(d => d.title === selectedTitle);
    }
    return list;
  };

  // Execute Export
  const handleExport = () => {
    setIsExporting(true);
    try {
      const filteredFams = getFilteredFamilies();
      const filteredDeps = getFilteredDependents();

      if (format === "excel") {
        exportToExcel(filteredFams, filteredDeps);
      } else if (format === "csv") {
        exportToCSV(filteredFams, filteredDeps);
      } else if (format === "print") {
        exportToPrint(filteredFams, filteredDeps);
      }
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  // 1. Export to Excel (.xlsx)
  const exportToExcel = (fams: Family[], deps: Dependent[]) => {
    const wb = XLSX.utils.book_new();

    if (dataTarget === "families" || dataTarget === "all") {
      const famData = fams.map((f, idx) => ({
        "م": idx + 1,
        "كود الأسرة": f.familyCode,
        "رب الأسرة": f.headName,
        "اللقب": f.title || "بدون لقب",
        "المحلة": f.neighborhood,
        "الإقامة الحالية": f.residency || "",
        "مكان الإقامة / المحافظة": f.location || "",
        "عدد الأفراد": f.memberCount,
        "رقم الجوال": f.phone,
        "الجنس": f.gender,
        "الحالة الاجتماعية": f.maritalStatus,
        "تاريخ الميلاد": f.birthDate,
        "تاريخ الوفاة": f.deathDate || "—"
      }));
      const wsFams = XLSX.utils.json_to_sheet(famData);
      XLSX.utils.book_append_sheet(wb, wsFams, "أرباب الأسر");
    }

    if (dataTarget === "dependents" || dataTarget === "all") {
      const depData = deps.map((d, idx) => {
        const hostFam = fams.find((f) => f.familyCode === d.familyCode);
        const fullName = formatDependentFullName(d, hostFam);
        const famTitle = hostFam?.title || d.title || "بدون لقب";
        return {
          "م": idx + 1,
          "الاسم الكامل": fullName,
          "اللقب": famTitle,
          "صلة القرابة": d.relation,
          "كود الأسرة": d.familyCode,
          "رقم الهاتف": d.phone || "—",
          "الرقم الوطني": d.nationalId || "—",
          "الإقامة": d.residency || "",
          "تاريخ الميلاد": d.birthDate || "—",
          "الحالة الاجتماعية": d.maritalStatus
        };
      });
      const wsDeps = XLSX.utils.json_to_sheet(depData);
      XLSX.utils.book_append_sheet(wb, wsDeps, "التابعين والأفراد");
    }

    const scopeName = scope === "neighborhood" ? selectedNeighborhood : scope === "title" ? selectedTitle : "شامل";
    const fileName = `تعداد_قرية_العنين_${scopeName}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // 2. Export to CSV (.csv with UTF-8 BOM)
  const exportToCSV = (fams: Family[], deps: Dependent[]) => {
    let csvRows: string[] = [];

    if (dataTarget === "families" || dataTarget === "all") {
      csvRows.push("م,كود الأسرة,رب الأسرة,اللقب,المحلة,الإقامة,مكان الإقامة,عدد الأفراد,رقم الجوال,الجنس,الحالة الاجتماعية");
      fams.forEach((f, idx) => {
        csvRows.push(`${idx + 1},"${f.familyCode}","${f.headName}","${f.title}","${f.neighborhood}","${f.residency}","${f.location || ''}",${f.memberCount},"${f.phone}","${f.gender}","${f.maritalStatus}"`);
      });
    }

    if (dataTarget === "dependents") {
      csvRows.push("م,الاسم الكامل,اللقب,صلة القرابة,كود الأسرة,رقم الهاتف,الرقم الوطني,الإقامة,الحالة الاجتماعية");
      deps.forEach((d, idx) => {
        const hostFam = fams.find((f) => f.familyCode === d.familyCode);
        const fullName = formatDependentFullName(d, hostFam);
        const famTitle = hostFam?.title || d.title || "";
        csvRows.push(`${idx + 1},"${fullName}","${famTitle}","${d.relation}","${d.familyCode}","${d.phone}","${d.nationalId}","${d.residency}","${d.maritalStatus}"`);
      });
    }

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const scopeName = scope === "neighborhood" ? selectedNeighborhood : scope === "title" ? selectedTitle : "شامل";
    link.href = url;
    link.setAttribute("download", `تعداد_العنين_${scopeName}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export to Official Print/PDF View
  const exportToPrint = (fams: Family[], deps: Dependent[]) => {
    const scopeTitle = scope === "neighborhood" 
      ? `المحلة: ${selectedNeighborhood}` 
      : scope === "title" 
      ? `لقب العائلة: ${selectedTitle}` 
      : "كافة السجلات والمحلات";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف رسمي - التعداد السكاني لقرية العنين</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 20px; color: #1e293b; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
          .header h2 { margin: 5px 0; font-size: 15px; color: #047857; }
          .header p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: right; }
          th { background: #0f172a; color: #ffffff; font-weight: bold; }
          tr:nth-child(even) { background: #f1f5f9; }
          .dead { text-decoration: line-through; color: #94a3b8; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
          .stamp-box { border: 2px dashed #94a3b8; width: 140px; height: 80px; text-align: center; line-height: 80px; color: #cbd5e1; margin-top: 10px; }
          @media print {
            body { margin: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div className="header">
          <h1>الجمهورية اليمنية — محافظة تعز — مديرية جبل حبشي</h1>
          <h2>كشف بيانات التعداد السكاني الرسمي — عزلة نخلة (قرية العنين والدامغة)</h2>
          <p>النطاق المحدد: <strong>${scopeTitle}</strong></p>
        </div>

        <div className="meta-box">
          <div>تاريخ الإصدار: <strong>${new Date().toLocaleDateString("ar-YE")}</strong></div>
          <div>إجمالي الأسر المسجلة: <strong>${fams.length} أسرة</strong></div>
          <div>إجمالي الأفراد والتابعين: <strong>${deps.length} فرد</strong></div>
        </div>

        ${dataTarget === "families" || dataTarget === "all" ? `
          <h3>أولاً: سجل أرباب الأسر المسجلين</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>كود الأسرة</th>
                <th>رب الأسرة</th>
                <th>اللقب</th>
                <th>المحلة</th>
                <th>الإقامة</th>
                <th>مكان الإقامة</th>
                <th>عدد الأفراد</th>
                <th>رقم الجوال</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${fams.map((f, i) => `
                <tr class="${f.maritalStatus === 'متوفى' ? 'dead' : ''}">
                  <td>${i + 1}</td>
                  <td><strong>${f.familyCode}</strong></td>
                  <td>${f.headName}</td>
                  <td>${f.title}</td>
                  <td>${f.neighborhood}</td>
                  <td>${f.residency || '—'}</td>
                  <td>${f.location || '—'}</td>
                  <td>${f.memberCount}</td>
                  <td>${f.phone || '—'}</td>
                  <td>${f.maritalStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${dataTarget === "dependents" || dataTarget === "all" ? `
          <h3>ثانياً: سجل التابعين والأفراد</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم الكامل</th>
                <th>اللقب</th>
                <th>صلة القرابة</th>
                <th>كود الأسرة</th>
                <th>رقم الهاتف</th>
                <th>الإقامة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${deps.map((d, i) => {
                const hostFam = fams.find((f) => f.familyCode === d.familyCode);
                const fullName = formatDependentFullName(d, hostFam);
                const famTitle = hostFam?.title || d.title || '—';
                return `
                <tr class="${d.maritalStatus === 'متوفى' ? 'dead' : ''}">
                  <td>${i + 1}</td>
                  <td>${fullName}</td>
                  <td>${famTitle}</td>
                  <td>${d.relation}</td>
                  <td>${d.familyCode}</td>
                  <td>${d.phone || '—'}</td>
                  <td>${d.residency || '—'}</td>
                  <td>${d.maritalStatus}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          <div>
            <p>توقيع المندوب / جامع البيانات:</p>
            <p>.............................................</p>
          </div>
          <div>
            <p>المشرف العام وتوثيق اللجنة:</p>
            <p>أ. حلمي علي هزاع الخطيب</p>
            <div class="stamp-box">ختم اللجنة</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredFamiliesCount = getFilteredFamilies().length;
  const filteredDependentsCount = getFilteredDependents().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] my-auto rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150 flex flex-col">
        {/* Modal Header (Fixed Top) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400 border border-emerald-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">تصدير التقارير والكشوفات المتقدمة</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">تخصيص نطاق وتنسيق التصدير الرسمي للبيانات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 text-xs overflow-y-auto flex-1 divide-y divide-slate-100 pb-24 sm:pb-32">
          {/* Section 1: Data Target Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>1. نوع البيانات المراد تصديرها:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDataTarget("families")}
                className={`py-2.5 px-2 sm:px-3 rounded-xl border text-center font-bold cursor-pointer transition text-xs ${
                  dataTarget === "families"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                أرباب الأسر
              </button>
              <button
                type="button"
                onClick={() => setDataTarget("dependents")}
                className={`py-2.5 px-2 sm:px-3 rounded-xl border text-center font-bold cursor-pointer transition text-xs ${
                  dataTarget === "dependents"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                التابعين والأفراد
              </button>
              <button
                type="button"
                onClick={() => setDataTarget("all")}
                className={`py-2.5 px-2 sm:px-3 rounded-xl border text-center font-bold cursor-pointer transition text-xs ${
                  dataTarget === "all"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                السجل الكلي الشامل
              </button>
            </div>
          </div>

          {/* Section 2: Scope Filter Selection */}
          <div className="pt-4 space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>2. تحديد نطاق التصدير:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`py-2.5 px-2 sm:px-3 rounded-xl border text-center font-bold cursor-pointer transition text-xs ${
                  scope === "all"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-800 shadow-xs ring-2 ring-indigo-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                كافة السجلات
              </button>
              <button
                type="button"
                onClick={() => setScope("neighborhood")}
                className={`py-2.5 px-2 sm:px-3 rounded-xl border text-center font-bold cursor-pointer transition text-xs ${
                  scope === "neighborhood"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-800 shadow-xs ring-2 ring-indigo-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                محلة محددة
              </button>
              <button
                type="button"
                onClick={() => setScope("title")}
                className={`py-2.5 px-2 sm:px-3 rounded-xl border text-center font-bold cursor-pointer transition text-xs ${
                  scope === "title"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-800 shadow-xs ring-2 ring-indigo-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                لقب عائلة محدد
              </button>
            </div>

            {/* Scope Sub-dropdowns */}
            {scope === "neighborhood" && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">اختر المحلة المراد تصدير بياناتها:</label>
                <select
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 font-medium text-xs sm:text-sm"
                >
                  {NEIGHBORHOODS.map(hood => (
                    <option key={hood} value={hood}>{hood}</option>
                  ))}
                </select>
              </div>
            )}

            {scope === "title" && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">اختر لقب العائلة المراد تصدير بياناتها:</label>
                <select
                  value={selectedTitle}
                  onChange={(e) => setSelectedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 font-medium text-xs sm:text-sm"
                >
                  {TITLES.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section 3: Format Selection */}
          <div className="pt-4 space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>3. صيغة ونوع ملف التصدير:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition ${
                  format === "excel"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 shrink-0" />
                <span className="font-black text-[11px] sm:text-xs">ملف إكسل (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition ${
                  format === "csv"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/30"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FileText className="w-5 h-5 shrink-0" />
                <span className="font-black text-[11px] sm:text-xs">ملف نصي CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("print")}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition ${
                  format === "print"
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-700/30"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Printer className="w-5 h-5 shrink-0" />
                <span className="font-black text-[11px] sm:text-xs">جدول طباعة PDF</span>
              </button>
            </div>
          </div>

          {/* Summary Box */}
          <div className="pt-4">
            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between text-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>إجمالي السجلات المحددة للتصدير:</span>
              </div>
              <div className="font-black font-mono text-sm sm:text-base text-emerald-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                {dataTarget === "families" ? `${filteredFamiliesCount} أسرة` :
                 dataTarget === "dependents" ? `${filteredDependentsCount} فرد` :
                 `${filteredFamiliesCount} أسرة + ${filteredDependentsCount} فرد`}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Modal Actions Footer */}
        <div className="bg-slate-50 p-4 sm:px-6 sm:py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 shrink-0 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer text-xs text-center"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl transition shadow-lg hover:shadow-xl ring-2 ring-emerald-500/30 cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm text-center"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>{isExporting ? "جاري استخراج الملف..." : "تصدير وحفظ الملف الآن 📥"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
