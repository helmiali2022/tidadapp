import { useState, useEffect, FormEvent } from "react";
import { Cloud, CloudDownload, CloudUpload, Copy, Check, Info, FileText, Settings, Link, CheckCircle2, AlertCircle, Download, ShieldCheck, FileJson } from "lucide-react";
import { Family, Dependent } from "../types";

interface SyncSettingsPanelProps {
  googleScriptUrl: string;
  onSaveUrl: (url: string) => Promise<void>;
  onSync: (action: "pull" | "push") => Promise<void>;
  syncLog: string[];
  familiesCount: number;
  dependentsCount: number;
  families?: Family[];
  dependents?: Dependent[];
  onDownloadBackup?: () => void;
}

export default function SyncSettingsPanel({
  googleScriptUrl,
  onSaveUrl,
  onSync,
  syncLog,
  familiesCount,
  dependentsCount,
  families = [],
  dependents = [],
  onDownloadBackup
}: SyncSettingsPanelProps) {
  const [urlInput, setUrlInput] = useState(googleScriptUrl);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  useEffect(() => {
    setUrlInput(googleScriptUrl);
  }, [googleScriptUrl]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveUrl(urlInput);
      alert("تم حفظ عنوان الربط بنجاح!");
    } catch {
      alert("فشل حفظ عنوان الربط");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncAction = async (action: "pull" | "push") => {
    if (!googleScriptUrl && action === "push") {
      alert("يرجى تهيئة رابط Google Apps Script أولاً في الأسفل لتتمكن من المزامنة.");
      return;
    }
    setIsSyncing(action);
    try {
      await onSync(action);
    } catch (err: any) {
      alert(`فشلت المزامنة: ${err.message || "خطأ غير معروف"}`);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDownloadBackup = () => {
    if (onDownloadBackup) {
      onDownloadBackup();
      setBackupDownloaded(true);
      setTimeout(() => setBackupDownloaded(false), 3000);
      return;
    }

    try {
      const backupData = {
        app: "التعداد السكاني لقرية ذي الجمال",
        version: "1.0",
        backupDate: new Date().toISOString(),
        backupDateFormatted: new Date().toLocaleString("ar-YE", { dateStyle: "full", timeStyle: "medium" }),
        stats: {
          totalFamilies: families.length || familiesCount,
          totalDependents: dependents.length || dependentsCount,
        },
        families: families,
        dependents: dependents
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      link.download = `نسخة_احتياطية_التعداد_ذي_الجمال_${dateStr}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupDownloaded(true);
      setTimeout(() => setBackupDownloaded(false), 3000);
    } catch (err: any) {
      alert(`فشل تحميل النسخة الاحتياطية: ${err.message || "خطأ غير معروف"}`);
    }
  };

  const scriptCode = `// Code.gs - Google Apps Script للتعداد السكاني لقرية ذي الجمال
// يرجى نشر هذا الملف كـ Web App مع إمكانية الوصول للجميع "Anyone"

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetFamilies = getOrCreateSheet(ss, "الأسر");
    const sheetDependents = getOrCreateSheet(ss, "التابعين");
    
    const families = getSheetData(sheetFamilies);
    const dependents = getSheetData(sheetDependents);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      families: families,
      dependents: dependents
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = data.action;
    const sheetName = data.sheetName;

    if (action === "sync") {
      const sheetFamilies = getOrCreateSheet(ss, "الأسر");
      const sheetDependents = getOrCreateSheet(ss, "التابعين");
      
      setSheetData(sheetFamilies, data.families, "families");
      setSheetData(sheetDependents, data.dependents, "dependents");
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "تمت المزامنة وحفظ البيانات بنجاح في جدول جوجل"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // saveFamily -> Target Sheet: "الأسر"
    if (action === "saveFamily" || sheetName === "الأسر") {
      const sheetFamilies = getOrCreateSheet(ss, "الأسر");
      const famData = data.data || data;
      saveOrUpdateFamilyRow(sheetFamilies, famData);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        sheetName: "الأسر",
        message: "تم حفظ بيانات الأسرة في ورقة 'الأسر' بنجاح"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // saveDependent -> Target Sheet: "التابعين"
    if (action === "saveDependent" || sheetName === "التابعين") {
      const sheetDependents = getOrCreateSheet(ss, "التابعين");
      const sheetFamilies = getOrCreateSheet(ss, "الأسر");
      const depData = data.data || data;
      saveOrUpdateDependentRow(sheetDependents, sheetFamilies, depData);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        sheetName: "التابعين",
        message: "تم حفظ بيانات التابع في ورقة 'التابعين' بنجاح"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // deleteFamily -> Delete from "الأسر" and matching dependents in "التابعين"
    if (action === "deleteFamily") {
      const sheetFamilies = getOrCreateSheet(ss, "الأسر");
      const sheetDependents = getOrCreateSheet(ss, "التابعين");
      deleteFamilyAndDependents(sheetFamilies, sheetDependents, data.familyCode || data.id);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "تم حذف الأسرة والتابعين من الورقتين بنجاح"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // deleteDependent -> Delete from "التابعين"
    if (action === "deleteDependent") {
      const sheetDependents = getOrCreateSheet(ss, "التابعين");
      deleteDependentRow(sheetDependents, data.dependentId || data.id || data.name, data.familyCode);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "تم حذف التابع من ورقة التابعين بنجاح"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "الإجراء المطلوب غير معروف"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === "الأسر") {
      sheet.appendRow(["م", "رب الأسرة", "المحلة", "عدد الأفراد", "رقم الجوال", "الإقامة", "مكان الإقامة", "الجنس", "اللقب", "الحالة الاجتماعية", "تاريخ الميلاد", "تاريخ الوفاة", "تاريخ الزواج", "كود الأسرة"]);
    } else if (name === "التابعين") {
      sheet.appendRow(["م", "الاسم", "اللقب", "صلة القرابة", "رقم الهاتف للفرد", "الرقم الوطني", "الإقامة", "تاريخ الميلاد", "الحالة الاجتماعية", "كود الأسرة"]);
    }
  }
  return sheet;
}

function getSheetData(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const lastCol = sheet.getLastColumn();
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        val = val.toISOString().split("T")[0];
      }
      obj[header] = val;
    });
    return obj;
  });
}

function setSheetData(sheet, data, type) {
  sheet.clear();
  let headers = [];
  if (type === "families") {
    headers = ["م", "رب الأسرة", "المحلة", "عدد الأفراد", "رقم الجوال", "الإقامة", "مكان الإقامة", "الجنس", "اللقب", "الحالة الاجتماعية", "تاريخ الميلاد", "تاريخ الوفاة", "تاريخ الزواج", "كود الأسرة"];
  } else {
    headers = ["م", "الاسم", "اللقب", "صلة القرابة", "رقم الهاتف للفرد", "الرقم الوطني", "الإقامة", "تاريخ الميلاد", "الحالة الاجتماعية", "كود الأسرة"];
  }
  sheet.appendRow(headers);
  if (data && data.length > 0) {
    const rows = data.map(item => {
      return headers.map(h => item[h] !== undefined ? item[h] : "");
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function saveOrUpdateFamilyRow(sheet, fam) {
  const lastRow = sheet.getLastRow();
  const familyCode = fam.familyCode || fam["كود الأسرة"] || "";
  const famId = fam.id || fam["م"];
  let targetRow = -1;

  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    for (let i = 0; i < values.length; i++) {
      const rId = values[i][0];
      const rCode = values[i][13] || values[i][values[i].length - 1];
      if ((familyCode && String(rCode) === String(familyCode)) || (famId && String(rId) === String(famId))) {
        targetRow = i + 2;
        break;
      }
    }
  }

  const rowData = [
    famId || (lastRow > 1 ? lastRow : 1),
    fam.headName || fam["رب الأسرة"] || "",
    fam.neighborhood || fam["المحلة"] || "",
    fam.memberCount || fam["عدد الأفراد"] || 1,
    fam.phone || fam["رقم الجوال"] || "",
    fam.residency || fam["الإقامة"] || "",
    fam.location || fam["مكان الإقامة"] || "",
    fam.gender || fam["الجنس"] || "",
    fam.title || fam["اللقب"] || "بدون لقب",
    fam.maritalStatus || fam["الحالة الاجتماعية"] || "",
    fam.birthDate || fam["تاريخ الميلاد"] || "",
    fam.deathDate || fam["تاريخ الوفاة"] || "",
    fam.marriageDate || fam["تاريخ الزواج"] || "",
    familyCode
  ];

  if (targetRow > 1) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function saveOrUpdateDependentRow(sheetDependents, sheetFamilies, dep) {
  const familyCode = dep.familyCode || dep["كود الأسرة"] || "";
  let depTitle = dep.title || dep["اللقب"] || "";
  let depResidency = dep.residency || dep["الإقامة"] || "";

  // Auto-inherit title or residency from host family in sheet "الأسر" if empty
  if ((!depTitle || depTitle === "بدون لقب") && familyCode) {
    const famsData = getSheetData(sheetFamilies);
    const hostFam = famsData.find(f => String(f["كود الأسرة"] || f["م"]) === String(familyCode));
    if (hostFam) {
      depTitle = hostFam["اللقب"] || depTitle;
      if (!depResidency) depResidency = hostFam["الإقامة"] || hostFam["المحلة"] || "";
    }
  }

  const lastRow = sheetDependents.getLastRow();
  const depId = dep.id || dep["م"];
  const depName = dep.name || dep["الاسم"] || "";
  let targetRow = -1;

  if (lastRow > 1) {
    const values = sheetDependents.getRange(2, 1, lastRow - 1, sheetDependents.getLastColumn()).getValues();
    for (let i = 0; i < values.length; i++) {
      const rId = values[i][0];
      const rName = values[i][1];
      const rCode = values[i][9];
      if (depId && String(rId) === String(depId)) {
        targetRow = i + 2;
        break;
      }
      if (familyCode && depName && String(rCode) === String(familyCode) && String(rName).trim() === String(depName).trim()) {
        targetRow = i + 2;
        break;
      }
    }
  }

  const rowData = [
    depId || (lastRow > 1 ? lastRow : 1),
    depName,
    depTitle || "بدون لقب",
    dep.relation || dep["صلة القرابة"] || "",
    dep.phone || dep["رقم الهاتف للفرد"] || "",
    dep.nationalId || dep["الرقم الوطني"] || "",
    depResidency,
    dep.birthDate || dep["تاريخ الميلاد"] || "",
    dep.maritalStatus || dep["الحالة الاجتماعية"] || "أعزب",
    familyCode
  ];

  if (targetRow > 1) {
    sheetDependents.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheetDependents.appendRow(rowData);
  }
}

function deleteFamilyAndDependents(sheetFamilies, sheetDependents, familyIdentifier) {
  const fLast = sheetFamilies.getLastRow();
  if (fLast > 1) {
    const fValues = sheetFamilies.getRange(2, 1, fLast - 1, sheetFamilies.getLastColumn()).getValues();
    for (let i = fValues.length - 1; i >= 0; i--) {
      if (String(fValues[i][13]) === String(familyIdentifier) || String(fValues[i][0]) === String(familyIdentifier)) {
        sheetFamilies.deleteRow(i + 2);
      }
    }
  }
  const dLast = sheetDependents.getLastRow();
  if (dLast > 1) {
    const dValues = sheetDependents.getRange(2, 1, dLast - 1, sheetDependents.getLastColumn()).getValues();
    for (let i = dValues.length - 1; i >= 0; i--) {
      if (String(dValues[i][9]) === String(familyIdentifier)) {
        sheetDependents.deleteRow(i + 2);
      }
    }
  }
}

function deleteDependentRow(sheetDependents, dependentIdentifier, familyCode) {
  const dLast = sheetDependents.getLastRow();
  if (dLast > 1) {
    const dValues = sheetDependents.getRange(2, 1, dLast - 1, sheetDependents.getLastColumn()).getValues();
    for (let i = dValues.length - 1; i >= 0; i--) {
      const rId = dValues[i][0];
      const rName = dValues[i][1];
      const rCode = dValues[i][9];
      if (String(rId) === String(dependentIdentifier) || (familyCode && String(rCode) === String(familyCode) && String(rName) === String(dependentIdentifier))) {
        sheetDependents.deleteRow(i + 2);
        break;
      }
    }
  }
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right" dir="rtl">
      {/* Left Settings/Controls Panel */}
      <div className="lg:col-span-7 space-y-6">
        {/* Connection Configuration */}
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-800 font-bold border-b border-slate-100 pb-3">
            <Settings className="w-5 h-5" />
            <h3 className="text-base">تهيئة اتصال جدول بيانات جوجل السحابي</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Link className="w-4 h-4 text-slate-400" />
                <span>رابط الويب لـ Google Apps Script (Web App URL)</span>
              </label>
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-lg outline-none font-mono bg-slate-50 focus:bg-white focus:border-emerald-500 transition-all text-left"
                dir="ltr"
              />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                هذا الرابط يتم الحصول عليه بعد نشر كود الأتمتة المرفق في اليسار كـ Web App مع إتاحة الصلاحية لـ Anyone (العامة).
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {googleScriptUrl ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>متصل بجدول جوجل</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>غير مبرمج (يعمل محلياً)</span>
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg text-xs transition shadow-sm cursor-pointer"
              >
                {isSaving ? "جاري الحفظ..." : "حفظ رابط الاتصال"}
              </button>
            </div>
          </form>
        </div>

        {/* Sync Controls Card */}
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-800 font-bold border-b border-slate-100 pb-3">
            <Cloud className="w-5 h-5" />
            <h3 className="text-base">بوابة المزامنة الفورية (Instant Sync Gate)</h3>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between gap-4 text-sm text-slate-700">
            <div>
              البيانات المحلية الحالية:
            </div>
            <div className="flex gap-4">
              <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                الأسر: <span className="font-bold text-emerald-700">{familiesCount}</span>
              </span>
              <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                التابعين: <span className="font-bold text-emerald-700">{dependentsCount}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pull Button */}
            <button
              onClick={() => handleSyncAction("pull")}
              disabled={isSyncing !== null || !googleScriptUrl}
              className={`flex flex-col items-center justify-center p-6 border rounded-2xl text-center transition select-none ${
                googleScriptUrl 
                  ? "bg-blue-50/50 hover:bg-blue-50 border-blue-200 text-blue-900 cursor-pointer" 
                  : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <CloudDownload className={`w-8 h-8 mb-2 ${isSyncing === "pull" ? "animate-bounce" : ""}`} />
              <span className="text-sm font-bold">جلب وتحديث البيانات من جوجل</span>
              <span className="text-[10px] text-blue-700 mt-1 opacity-80">تحميل البيانات الحالية من جدول جوجل واستبدال البيانات المحلية بها</span>
            </button>

            {/* Push Button */}
            <button
              onClick={() => handleSyncAction("push")}
              disabled={isSyncing !== null || !googleScriptUrl}
              className={`flex flex-col items-center justify-center p-6 border rounded-2xl text-center transition select-none ${
                googleScriptUrl 
                  ? "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-emerald-900 cursor-pointer" 
                  : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <CloudUpload className={`w-8 h-8 mb-2 ${isSyncing === "push" ? "animate-bounce" : ""}`} />
              <span className="text-sm font-bold">رفع ومزامنة البيانات إلى جوجل</span>
              <span className="text-[10px] text-emerald-700 mt-1 opacity-80">رفع كافة الأسر والتابعين المحليين المسجلين وحفظهم في جدول جوجل السحابي</span>
            </button>
          </div>

          {/* Local Backup Section */}
          <div className="pt-4 border-t border-slate-100">
            <div className="p-4 bg-indigo-50/70 border border-indigo-150 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 text-right">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-indigo-950">نسخة احتياطية محلياً (JSON Backup)</h4>
                    <span className="px-2 py-0.5 text-[10px] bg-indigo-100 text-indigo-800 rounded-full font-bold">تأمين محلي</span>
                  </div>
                  <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                    تنزيل ملف JSON شامل يحتوي على كافة بيانات الأسر ({families.length || familiesCount}) والتابعين ({dependents.length || dependentsCount}) لتأمينها وحفظها على جهازك.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                  backupDownloaded
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white"
                }`}
              >
                {backupDownloaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم التنزيل بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تحميل نسخة احتياطية</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Logs */}
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">سجل عمليات المزامنة (Sync Logs)</h4>
          <div className="bg-slate-900 text-slate-300 font-mono text-[11px] p-4 rounded-xl max-h-40 overflow-y-auto space-y-1.5 text-right" dir="ltr">
            {syncLog.length === 0 ? (
              <div className="text-slate-500 italic text-center py-4">No synchronization logs recorded yet.</div>
            ) : (
              syncLog.map((log, idx) => (
                <div key={idx} className="border-b border-slate-800/60 pb-1 last:border-0">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Apps Script Copy Code Panel */}
      <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm">ملف كود الأتمتة (Code.gs)</h3>
            </div>
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition select-none cursor-pointer border ${
                copied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-slate-200 hover:bg-slate-100 text-slate-600"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "تم النسخ!" : "نسخ الكود"}</span>
            </button>
          </div>

          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">خطوات التركيب البسيطة لربط الجدول:</p>
              <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-700">
                <li>أنشئ جدول بيانات جوجل جديد (Google Sheet).</li>
                <li>من القائمة العلوية اختر <span className="font-bold">Extensions</span> ثم <span className="font-bold">Apps Script</span>.</li>
                <li>احذف أي كود موجود والصق الكود المنسوخ من هنا تماماً.</li>
                <li>انقر على زر الحفظ ثم اختر <span className="font-bold">Deploy</span> &gt; <span className="font-bold">New deployment</span>.</li>
                <li>اختر النوع <span className="font-bold">Web app</span> واجعل صلاحية الوصول <span className="font-bold">Anyone</span> (العامة) وانقر Deploy.</li>
                <li>انسخ رابط الويب المتولد والصقه في حقل التهيئة بجانبك هنا!</li>
              </ol>
            </div>
          </div>

          <div className="relative">
            <pre className="text-[10px] text-slate-600 bg-white p-4 border border-slate-150 rounded-xl max-h-80 overflow-y-auto overflow-x-auto font-mono text-left block whitespace-pre" dir="ltr">
              {scriptCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
