import { useState, useEffect, useMemo, FormEvent, Fragment } from "react";
import { 
  Users, Home, UserCheck, Heart, Landmark, 
  Plus, ArrowLeftRight, Baby, Settings, LogOut, ShieldAlert,
  Search, Trash2, Edit2, ChevronDown, ChevronUp, FileText, Download,
  Cloud, AlertTriangle, ShieldCheck, HelpCircle, RefreshCw, X,
  Shield, User as UserIcon, UserPlus, AlertCircle, CheckCircle, Save,
  MapPin, CheckSquare, Square, GraduationCap, HeartPulse, BookOpen, Eye,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Family, Dependent, User, Role, UserPermissions, PasswordResetRequest } from "./types";
import { NEIGHBORHOODS, VALID_NEIGHBORHOODS, TITLES, GOVERNORATES, MARITAL_STATUSES, RELATIONS, QUALIFICATIONS, HEALTH_STATUSES, GOVERNORATES_WITH_CUSTOM, formatDependentFullName, extractIndividualName, isDeceasedStatus, isRecentBirthDate } from "./data";
import { DEFAULT_GOOGLE_SCRIPT_URL, DEFAULT_LOCAL_USERS } from "./constants";
import { EXCEL_TITLE_MAPPINGS, ALL_UNIQUE_EXCEL_TITLES, getExcelTitleForHeadName } from "./excelTitles";

const cleanString = (str: any): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .trim();
};

// Sub-components & modals imports
import AddFamilyModal from "./components/AddFamilyModal";
import AddDependentModal from "./components/AddDependentModal";
import TransferIndividualModal from "./components/TransferIndividualModal";
import BirthDeathModal from "./components/BirthDeathModal";
import SyncSettingsPanel from "./components/SyncSettingsPanel";
import CensusAnalytics from "./components/CensusAnalytics";
import LoginScreen from "./components/LoginScreen";
import SuperAdminPermissionsPanel from "./components/SuperAdminPermissionsPanel";
import AdvancedExportModal from "./components/AdvancedExportModal";
import IncompleteRecordsModal from "./components/IncompleteRecordsModal";

const YEMEN_GOVERNORATES = [
  "أمانة العاصمة",
  "صنعاء",
  "تعز",
  "عدن",
  "إب",
  "الحديدة",
  "حضرموت",
  "المهرة",
  "مأرب",
  "ذمار",
  "حجة",
  "صعدة",
  "البيضاء",
  "أبين",
  "لحج",
  "شبوة",
  "عمران",
  "الضالع",
  "ريمة",
  "المحويت",
  "أرخبيل سقطرى",
  "الجوف",
  "مكان آخر (إدخال يدوي)"
];

export default function App() {
  // Authentication & session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Core census data
  const [families, setFamilies] = useState<Family[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [googleScriptUrl, setGoogleScriptUrl] = useState<string>(() => {
    return localStorage.getItem("census_google_script_url") || DEFAULT_GOOGLE_SCRIPT_URL;
  });
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Batch Operations selection & modal states
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<number[]>([]);
  const [selectedDependentIds, setSelectedDependentIds] = useState<number[]>([]);

  const [batchModal, setBatchModal] = useState<{
    target: "families" | "dependents";
    action: "edit_title" | "edit_neighborhood" | "edit_residency_location" | "edit_gender" | "delete";
  } | null>(null);

  const [batchTitle, setBatchTitle] = useState("");
  const [batchNeighborhood, setBatchNeighborhood] = useState("");
  const [batchResidency, setBatchResidency] = useState("");
  const [batchLocation, setBatchLocation] = useState("");
  const [customBatchLocation, setCustomBatchLocation] = useState("");
  const [batchGender, setBatchGender] = useState("ذكر");
  const [updateDependentsTitle, setUpdateDependentsTitle] = useState(true);
  const [isBatchExecuting, setIsBatchExecuting] = useState(false);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "families" | "dependents" | "sync" | "users" | "profile" | "schema">("dashboard");

  // Reading Mode state for table viewing on mobile & field delegates
  const [isReadingMode, setIsReadingMode] = useState<boolean>(() => {
    return localStorage.getItem("census_reading_mode") === "true";
  });

  const toggleReadingMode = () => {
    setIsReadingMode((prev) => {
      const next = !prev;
      localStorage.setItem("census_reading_mode", String(next));
      return next;
    });
  };

  // Pagination states for high-performance rendering
  const [familyPage, setFamilyPage] = useState(1);
  const [familyPageSize, setFamilyPageSize] = useState<number>(20);

  const [dependentPage, setDependentPage] = useState(1);
  const [dependentPageSize, setDependentPageSize] = useState<number>(20);

  // Schema management states
  const [schemaNeighborhoods, setSchemaNeighborhoods] = useState<string[]>([]);
  const [schemaTitles, setSchemaTitles] = useState<string[]>([]);
  const [schemaMaritalStatuses, setSchemaMaritalStatuses] = useState<string[]>(MARITAL_STATUSES);
  const [schemaHealthStatuses, setSchemaHealthStatuses] = useState<string[]>([]);
  const [isUpdatingSchema, setIsUpdatingSchema] = useState(false);

  // User management states for Admin
  const [usersList, setUsersList] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUserPassword, setResettingUserPassword] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "collector" as Role
  });
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Profile password change form states
  const [profilePassForm, setProfilePassForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Fetch / Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Modal visibility states
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [isAddDependentOpen, setIsAddDependentOpen] = useState(false);
  const [selectedFamilyCodeForDep, setSelectedFamilyCodeForDep] = useState("");
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isBirthDeathOpen, setIsBirthDeathOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isIncompleteRecordsOpen, setIsIncompleteRecordsOpen] = useState(false);

  // Password reset requests for Super Admin
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);

  // Row expansion mapping (familyCode -> expanded boolean)
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});

  // Search & Filter state
  const [globalSearch, setGlobalSearch] = useState("");
  const [familySearch, setFamilySearch] = useState("");
  const [familyHoodFilter, setFamilyHoodFilter] = useState("");
  const [dependentSearch, setDependentSearch] = useState("");

  // Extended Search Dropdowns (Health, Age, Marital, Title, Vital, Qualification)
  const [healthFilter, setHealthFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [maritalFilter, setMaritalFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [vitalFilter, setVitalFilter] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState("");

  // Dynamically collected list of unique titles across schema, constants, families, and dependents
  const availableTitles = useMemo(() => {
    const set = new Set<string>(schemaTitles);
    TITLES.forEach((t) => set.add(t));
    families.forEach((f) => {
      if (f.title && f.title.trim() && f.title !== "بدون لقب") set.add(f.title.trim());
    });
    dependents.forEach((d) => {
      if (d.title && d.title.trim() && d.title !== "بدون لقب") set.add(d.title.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [schemaTitles, families, dependents]);

  const getAgeFromBirthDate = (birthDate?: string): number | null => {
    if (!birthDate) return null;
    const str = String(birthDate).trim();
    if (!str) return null;
    if (str.length === 4 && !isNaN(Number(str))) {
      return new Date().getFullYear() - Number(str);
    }
    const date = new Date(str);
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return age;
  };

  const matchesAgeFilter = (birthDate: string | undefined, filter: string): boolean => {
    if (!filter) return true;
    const age = getAgeFromBirthDate(birthDate);
    if (age === null) return false;
    if (filter === "child") return age < 18;
    if (filter === "youth") return age >= 18 && age <= 35;
    if (filter === "adult") return age >= 36 && age <= 59;
    if (filter === "senior") return age >= 60;
    return true;
  };

  const matchesHealthFilter = (status: string | undefined, filter: string): boolean => {
    if (!filter) return true;
    if (!status || status.trim() === "") {
      return filter === "سليم / جيدة";
    }
    return status.toLowerCase().includes(filter.toLowerCase());
  };

  const matchesMaritalFilter = (status: string | undefined, filter: string, deathDate?: string): boolean => {
    if (!filter) return true;
    if (filter === "متوفى" || filter === "متوفاة" || filter === "متوفي") {
      return isDeceasedStatus(status, deathDate);
    }
    if (!status) return false;
    return status.toLowerCase().includes(filter.toLowerCase());
  };

  const renderExtendedSearchDropdowns = () => {
    const hasActiveFilters = Boolean(
      healthFilter || ageFilter || maritalFilter || titleFilter || vitalFilter || qualificationFilter
    );

    return (
      <div className="flex flex-col gap-2 w-full text-xs select-none">
        {/* الصف الأول: الصحة، العمر، الحالة الاجتماعية */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
          {/* Health Status Filter */}
          <div className="relative flex-1 min-w-[125px]">
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold outline-none transition cursor-pointer ${
                healthFilter 
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs" 
                  : "bg-rose-50/90 text-rose-800 border-rose-200 hover:bg-rose-100 focus:ring-2 focus:ring-rose-400"
              }`}
            >
              <option value="" className="bg-white text-slate-800 font-normal">🏥 الصحة: الكل</option>
              {HEALTH_STATUSES.map((hs) => (
                <option key={hs} value={hs} className="bg-white text-slate-800 font-normal">{hs}</option>
              ))}
            </select>
          </div>

          {/* Age Category Filter */}
          <div className="relative flex-1 min-w-[125px]">
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold outline-none transition cursor-pointer ${
                ageFilter 
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs" 
                  : "bg-blue-50/90 text-blue-800 border-blue-200 hover:bg-blue-100 focus:ring-2 focus:ring-blue-400"
              }`}
            >
              <option value="" className="bg-white text-slate-800 font-normal">🎂 العمر: الكل</option>
              <option value="child" className="bg-white text-slate-800 font-normal">أطفال (أقل من 18)</option>
              <option value="youth" className="bg-white text-slate-800 font-normal">شباب (18 - 35)</option>
              <option value="adult" className="bg-white text-slate-800 font-normal">بالغون (36 - 59)</option>
              <option value="senior" className="bg-white text-slate-800 font-normal">كبار السن (60+)</option>
            </select>
          </div>

          {/* Marital Status Filter */}
          <div className="relative flex-1 min-w-[125px]">
            <select
              value={maritalFilter}
              onChange={(e) => setMaritalFilter(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold outline-none transition cursor-pointer ${
                maritalFilter 
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs" 
                  : "bg-amber-50/90 text-amber-800 border-amber-200 hover:bg-amber-100 focus:ring-2 focus:ring-amber-400"
              }`}
            >
              <option value="" className="bg-white text-slate-800 font-normal">💍 الاجتماعية: الكل</option>
              <option value="أعزب" className="bg-white text-slate-800 font-normal">أعزب / عازبة</option>
              <option value="متزوج" className="bg-white text-slate-800 font-normal">متزوج / متزوجة</option>
              <option value="أرمل" className="bg-white text-slate-800 font-normal">أرمل / أرملة</option>
              <option value="مطلق" className="bg-white text-slate-800 font-normal">مطلق / مطلقة</option>
              <option value="متوفى" className="bg-white text-slate-800 font-normal">متوفى / متوفاة</option>
            </select>
          </div>
        </div>

        {/* الصف الثاني: الألقاب، المواليد والوفيات (أخضر زمردي)، المؤهل (عنبر/أصفر هادئ) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full">
          {/* Title Filter (قائمة الألقاب) */}
          <div className="relative flex-1 min-w-[125px]">
            <select
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold outline-none transition cursor-pointer ${
                titleFilter 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                  : "bg-indigo-50/90 text-indigo-800 border-indigo-200 hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-400"
              }`}
            >
              <option value="" className="bg-white text-slate-800 font-normal">🏷️ اللقب: الكل ({availableTitles.length})</option>
              {availableTitles.map((t) => (
                <option key={t} value={t} className="bg-white text-slate-800 font-normal">{t}</option>
              ))}
            </select>
          </div>

          {/* Vital Status Filter (قائمة المواليد والوفيات - Emerald Green / أخضر زمردي) */}
          <div className="relative flex-1 min-w-[125px]">
            <select
              value={vitalFilter}
              onChange={(e) => setVitalFilter(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold outline-none transition cursor-pointer ${
                vitalFilter 
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                  : "bg-emerald-50/90 text-emerald-800 border-emerald-200 hover:bg-emerald-100 focus:ring-2 focus:ring-emerald-400"
              }`}
            >
              <option value="" className="bg-white text-slate-800 font-normal">👶/💀 المواليد والوفيات: الكل</option>
              <option value="living" className="bg-white text-slate-800 font-normal">الأحياء فقط (النشطين)</option>
              <option value="births" className="bg-white text-slate-800 font-normal">المواليد حديثاً (2024 - 2026)</option>
              <option value="deceased" className="bg-white text-slate-800 font-normal">الوفيات / المتوفين (رحمهم الله)</option>
            </select>
          </div>

          {/* Qualification Filter (قائمة المؤهل - Amber/Yellow / أصفر هادئ) */}
          <div className="relative flex-1 min-w-[125px]">
            <select
              value={qualificationFilter}
              onChange={(e) => setQualificationFilter(e.target.value)}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-bold outline-none transition cursor-pointer ${
                qualificationFilter 
                  ? "bg-amber-500 text-white border-amber-500 shadow-xs" 
                  : "bg-amber-50/90 text-amber-800 border-amber-200 hover:bg-amber-100 focus:ring-2 focus:ring-amber-400"
              }`}
            >
              <option value="" className="bg-white text-slate-800 font-normal">🎓 المؤهل العلمي: الكل</option>
              {QUALIFICATIONS.map((q) => (
                <option key={q} value={q} className="bg-white text-slate-800 font-normal">{q}</option>
              ))}
            </select>
          </div>

          {/* Clear Active Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setHealthFilter("");
                setAgeFilter("");
                setMaritalFilter("");
                setTitleFilter("");
                setVitalFilter("");
                setQualificationFilter("");
              }}
              className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-lg text-xs transition shrink-0 cursor-pointer border border-rose-200 shadow-2xs"
              title="إلغاء كافة الفلاتر"
            >
              تفريغ الفلاتر ✕
            </button>
          )}
        </div>
      </div>
    );
  };


  const incompleteRecordsCount = useMemo(() => {
    let count = 0;
    families.forEach(f => {
      if (!f.headName || !f.birthDate || !f.neighborhood || !f.phone) count++;
    });
    dependents.forEach(d => {
      if (!d.name || !d.birthDate || !d.nationalId) count++;
    });
    return count;
  }, [families, dependents]);

  // Edit forms state (simple modal/inline toggler)
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);

  const [editFamGov, setEditFamGov] = useState("تعز");
  const [editFamOutsideLoc, setEditFamOutsideLoc] = useState("");

  const [editDepGov, setEditDepGov] = useState("تعز");
  const [editDepOutsideLoc, setEditDepOutsideLoc] = useState("");

  const handleStartEditFamily = (fam: Family) => {
    setEditingFamily(fam);
    if (fam.neighborhood === "خارج القرية" || fam.residency === "خارج القرية") {
      const loc = fam.location || "";
      if (loc.includes(" - ")) {
        const parts = loc.split(" - ");
        setEditFamGov(parts[0] || "تعز");
        setEditFamOutsideLoc(parts.slice(1).join(" - "));
      } else if (YEMEN_GOVERNORATES.includes(loc)) {
        setEditFamGov(loc);
        setEditFamOutsideLoc("");
      } else {
        setEditFamGov("مكان آخر (إدخال يدوي)");
        setEditFamOutsideLoc(loc);
      }
    } else {
      setEditFamGov("تعز");
      setEditFamOutsideLoc("");
    }
  };

  const handleStartEditDependent = (dep: Dependent) => {
    const hostFam = families.find(f => f.familyCode === dep.familyCode);
    const cleanedName = extractIndividualName(dep.name, hostFam?.headName, hostFam?.title || dep.title);
    setEditingDependent({
      ...dep,
      name: cleanedName
    });
    if (dep.residency === "خارج القرية") {
      const loc = dep.location || "";
      if (loc.includes(" - ")) {
        const parts = loc.split(" - ");
        setEditDepGov(parts[0] || "تعز");
        setEditDepOutsideLoc(parts.slice(1).join(" - "));
      } else if (YEMEN_GOVERNORATES.includes(loc)) {
        setEditDepGov(loc);
        setEditDepOutsideLoc("");
      } else {
        setEditDepGov("مكان آخر (إدخال يدوي)");
        setEditDepOutsideLoc(loc);
      }
    } else {
      setEditDepGov("تعز");
      setEditDepOutsideLoc("");
    }
  };

  // Load user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("census_user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("census_user");
      }
    }
    fetchData();
    fetchSchema();
  }, []);

  // Auto-sync families and dependents to localStorage for 100% offline capability
  useEffect(() => {
    if (families.length > 0) {
      localStorage.setItem("census_families", JSON.stringify(families));
    }
  }, [families]);

  useEffect(() => {
    if (dependents.length > 0) {
      localStorage.setItem("census_dependents", JSON.stringify(dependents));
    }
  }, [dependents]);

  // Fetch entire database state from Express server API with local storage fallback
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/data");
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      if (data) {
        const rawFamilies: Family[] = data.families || [];
        const rawDependents: Dependent[] = data.dependents || [];

        // 1. Strict Data Cleansing
        const validFamilies = rawFamilies.filter(f => f.headName && String(f.headName).trim() !== '');

        // 2. Auto Family Code Generation & Official Excel Title Matching
        validFamilies.forEach((f, idx) => {
          let code = cleanString(f.familyCode);
          if (!code || code === "FAM-" || code.endsWith("-") || code.trim() === "") {
            const paddedNum = String(idx + 1).padStart(3, '0');
            f.familyCode = `FAM-${paddedNum}`;
          }
          const officialTitle = getExcelTitleForHeadName(f.headName);
          if (officialTitle) {
            f.title = officialTitle;
          }
        });

        // Map family titles for dependents sync
        const familyTitleMap = new Map<string, string>();
        validFamilies.forEach(f => {
          if (f.familyCode && f.title) familyTitleMap.set(f.familyCode, f.title);
        });

        // 3. Auto-Generated Placeholder Dependents
        let updatedDependents = [...rawDependents];
        let tempId = updatedDependents.length > 0 ? Math.max(...updatedDependents.map(d => d.id)) + 1000 : 10001;

        validFamilies.forEach((fam) => {
          const mCount = Number(fam.memberCount) || 1;
          if (mCount > 1 && fam.familyCode) {
            const existingForFam = updatedDependents.filter(d => d.familyCode === fam.familyCode);
            const needed = (mCount - 1) - existingForFam.length;
            if (needed > 0) {
              for (let i = 1; i <= needed; i++) {
                const depNum = existingForFam.length + i;
                updatedDependents.push({
                  id: tempId++,
                  name: `تابع ${depNum} - أسرة ${fam.headName}`,
                  title: fam.title || "بدون لقب",
                  relation: "تابع",
                  phone: fam.phone || "",
                  nationalId: "",
                  residency: fam.residency || fam.neighborhood || "العنين",
                  birthDate: "",
                  maritalStatus: "أعزب",
                  familyCode: fam.familyCode
                });
              }
            }
          }
        });

        // Ensure dependent titles match their family title
        updatedDependents.forEach(d => {
          if (d.familyCode && familyTitleMap.has(d.familyCode)) {
            d.title = familyTitleMap.get(d.familyCode)!;
          }
        });

        setFamilies(validFamilies);
        setDependents(updatedDependents);
        const scriptUrl = data.googleScriptUrl || localStorage.getItem("census_google_script_url") || DEFAULT_GOOGLE_SCRIPT_URL;
        setGoogleScriptUrl(scriptUrl);
        localStorage.setItem("census_google_script_url", scriptUrl);

        if (validFamilies.length > 0) {
          setToastMessage(`تم تطهير وجلب ${validFamilies.length} أسرة وإعادة حساب الإحصائيات بنجاح`);
          setTimeout(() => setToastMessage(null), 6000);
        }
      }
    } catch (err) {
      console.warn("Backend server API unavailable/offline, loading data from local storage fallback:", err);
      // Fallback: Read local cache
      try {
        const savedFamilies = localStorage.getItem("census_families");
        const savedDependents = localStorage.getItem("census_dependents");
        if (savedFamilies) setFamilies(JSON.parse(savedFamilies));
        if (savedDependents) setDependents(JSON.parse(savedDependents));
      } catch (localErr) {
        console.error("Failed to parse local storage data:", localErr);
      }
      const savedScriptUrl = localStorage.getItem("census_google_script_url") || DEFAULT_GOOGLE_SCRIPT_URL;
      setGoogleScriptUrl(savedScriptUrl);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users for user management with fallback
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        if (data.status === "success" && Array.isArray(data.users)) {
          setUsersList(data.users);
          localStorage.setItem("census_users_list", JSON.stringify(data.users));
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch users from backend, using local users fallback:", err);
    }
    // Fallback: use stored users or DEFAULT_LOCAL_USERS
    try {
      const savedUsers = localStorage.getItem("census_users_list");
      if (savedUsers) {
        setUsersList(JSON.parse(savedUsers));
      } else {
        setUsersList(DEFAULT_LOCAL_USERS);
      }
    } catch {
      setUsersList(DEFAULT_LOCAL_USERS);
    }
  };

  // Fetch pending password reset requests for Super Admin
  const fetchResetRequests = async () => {
    try {
      const response = await fetch("/api/reset-requests");
      if (response.ok) {
        const data = await response.json();
        if (data.status === "success" && Array.isArray(data.requests)) {
          setPasswordResetRequests(data.requests);
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch reset requests from backend, checking local storage:", err);
    }
    try {
      const savedRequests = localStorage.getItem("census_reset_requests");
      if (savedRequests) {
        setPasswordResetRequests(JSON.parse(savedRequests));
      }
    } catch {}
  };

  // Update user permissions
  const handleUpdatePermissions = async (username: string, permissions: UserPermissions) => {
    try {
      const response = await fetch(`/api/users/${username}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        addLog(`🔐 تم تحديث صلاحيات الحساب [${username}] بنجاح`);
        await fetchUsers();
      } else {
        alert(data.message || "فشل تحديث الصلاحيات");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم");
    }
  };

  const handleUpdateUserFullInfo = async (targetUsername: string, updatedUserData: Partial<User>) => {
    try {
      const response = await fetch(`/api/users/${targetUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUserData),
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        addLog(`👤 تم تحديث بيانات وحساب المندوب [${targetUsername}] بنجاح`);
        await fetchUsers();
      } else {
        alert(data.message || "فشل تحديث بيانات المندوب");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم");
    }
  };

  // Direct admin password reset
  const handleResetUserPassword = async (username: string, newPass: string) => {
    try {
      const response = await fetch(`/api/users/${username}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPass }),
      });
      const data = await response.json();
      if (data.status === "success") {
        addLog(`🔑 قام المشرف بإعادة تعيين كلمة المرور للمستخدم [${username}]`);
        await fetchUsers();
      } else {
        alert(data.message || "فشل تغيير كلمة المرور");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال");
    }
  };

  // Resolve password reset request
  const handleResolveResetRequest = async (id: string, newPass?: string) => {
    try {
      const response = await fetch(`/api/reset-requests/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPass }),
      });
      const data = await response.json();
      if (data.status === "success") {
        addLog(`🔑 تم اعتماد وتحديث كلمة المرور لطلب الاستعادة [${id}]`);
        await fetchResetRequests();
        await fetchUsers();
      } else {
        alert(data.message || "فشل اعتماد الطلب");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال بالخادم");
    }
  };

  // Delete reset request
  const handleDeleteResetRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/reset-requests/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.status === "success") {
        await fetchResetRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch schema for management
  const fetchSchema = async () => {
    try {
      const response = await fetch("/api/schema");
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setSchemaNeighborhoods(data.neighborhoods || []);
        const mergedTitles = Array.from(new Set([...(data.titles || []), ...ALL_UNIQUE_EXCEL_TITLES]));
        setSchemaTitles(mergedTitles);
        const mergedMarital = Array.from(new Set([...(data.maritalStatuses || []), ...MARITAL_STATUSES]));
        setSchemaMaritalStatuses(mergedMarital);
        setSchemaHealthStatuses(data.healthStatuses || []);
        localStorage.setItem("census_schema_titles", JSON.stringify(mergedTitles));
      }
    } catch (err) {
      console.error("Failed to fetch schema, using local storage fallback:", err);
      const cached = localStorage.getItem("census_schema_titles");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSchemaTitles(parsed);
          }
        } catch {}
      }
    }
  };

  // Update schema lists
  const handleUpdateSchema = async () => {
    setIsUpdatingSchema(true);
    try {
      const response = await fetch("/api/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighborhoods: schemaNeighborhoods,
          titles: schemaTitles,
          maritalStatuses: schemaMaritalStatuses,
          healthStatuses: schemaHealthStatuses
        })
      });
      const data = await response.json();
      if (data.status === "success") {
        alert("تم تحديث القوائم بنجاح");
        addLog("📋 قام المدير بتحديث قوائم النظام والمحلات");
      } else {
        alert(data.message || "فشل التحديث");
      }
    } catch (err) {
      alert("حدث خطأ في الاتصال");
    } finally {
      setIsUpdatingSchema(false);
    }
  };

  // Fetch users & reset requests whenever user is admin
  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsers();
      fetchResetRequests();
      if (activeTab === "schema") fetchSchema();
    }
  }, [currentUser, activeTab]);

  // Initial schema fetch
  useEffect(() => {
    fetchSchema();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("census_user", JSON.stringify(user));
    addLog(`تم تسجيل دخول المستخدم [${user.name}] بصلاحية [${user.role}]`);
  };

  const handleLogout = () => {
    localStorage.removeItem("census_user");
    setCurrentUser(null);
    addLog("تم تسجيل الخروج من النظام");
  };

  // Helper to add local log entries
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("ar-YE", { hour12: true });
    setSyncLog((prev) => [`[${timestamp}] ${message}`, ...prev]);
  };

  // Save the Google Web App script URL
  const handleSaveGoogleUrl = async (url: string) => {
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleScriptUrl: url })
      });
      const data = await response.json();
      if (data.status === "success") {
        setGoogleScriptUrl(data.googleScriptUrl);
        addLog(`تم تحديث عنوان Google Web App إلى: ${url}`);
      }
    } catch (err) {
      addLog("فشل في تحديث عنوان Google Web App");
      throw err;
    }
  };

  // POST: Add new family + nested dependents
  const handleSaveFamily = async (familyPayload: any, dependentsPayload: any[]) => {
    try {
      // 1. Save family
      const response = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familyPayload)
      });
      const data = await response.json();
      
      if (data.status === "success") {
        addLog(`تم إضافة أسرة جديدة بنجاح ربها: ${familyPayload.headName} برقم كود: ${data.family.familyCode}`);
        
        // 2. Save each dependent
        for (const dep of dependentsPayload) {
          await fetch("/api/dependent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dep)
          });
          addLog(`تم تسجيل تابع مضاف: [${dep.name}] صلة: [${dep.relation}]`);
        }

        // Reload fresh server state
        await fetchData();
      }
    } catch (err) {
      alert("حدث خطأ أثناء حفظ بيانات الأسرة");
      console.error(err);
    }
  };

  // POST: Add single dependent
  const handleSaveDependent = async (dependentPayload: any) => {
    try {
      const response = await fetch("/api/dependent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dependentPayload)
      });
      const data = await response.json();
      if (data.status === "success") {
        addLog(`تمت إضافة الفرد [${dependentPayload.name}] بنجاح وإلحاقه بالأسرة ذات الكود [${dependentPayload.familyCode}]`);
        await fetchData();
      }
    } catch (err) {
      alert("فشل إضافة التابع");
      console.error(err);
    }
  };

  // POST: Transfer Individual
  const handleTransferIndividual = async (dependentId: number, targetFamilyCode: string) => {
    try {
      const response = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependentId, targetFamilyCode })
      });
      const data = await response.json();
      if (data.status === "success") {
        const depName = dependents.find(d => d.id === dependentId)?.name || "الفرد";
        const targetHead = families.find(f => f.familyCode === targetFamilyCode)?.headName || "الأسرة الجديدة";
        addLog(`تم نقل الفرد [${depName}] ليعيش في كنف أسرة ربها [${targetHead}] بنجاح`);
        await fetchData();
      }
    } catch (err) {
      alert("فشل نقل الفرد");
      console.error(err);
    }
  };

  // POST: Vital Birth Registration
  const handleSaveBirth = async (birthPayload: any) => {
    try {
      const response = await fetch("/api/birth-death", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "birth", payload: birthPayload })
      });
      const data = await response.json();
      if (data.status === "success") {
        addLog(`👶 تم تسجيل ولادة طفل جديد باسم [${birthPayload.name} ${birthPayload.title}] بتاريخ [${birthPayload.birthDate}]`);
        await fetchData();
      }
    } catch (err) {
      alert("فشل تسجيل الولادة");
      console.error(err);
    }
  };

  // POST: Vital Death Registration
  const handleSaveDeath = async (deathPayload: any) => {
    try {
      const response = await fetch("/api/birth-death", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "death", payload: deathPayload })
      });
      const data = await response.json();
      if (data.status === "success") {
        let name = "الشخص";
        if (deathPayload.isHead) {
          name = families.find(f => f.id === parseInt(deathPayload.id))?.headName || "رب الأسرة";
        } else {
          name = dependents.find(d => d.id === parseInt(deathPayload.id))?.name || "التابع";
        }
        addLog(`🕯️ تم تسجيل وفاة [${name}] رحمه الله وغفر له بتاريخ [${deathPayload.deathDate}]`);
        await fetchData();
      }
    } catch (err) {
      alert("فشل تسجيل الوفاة");
      console.error(err);
    }
  };

  // PUT: Update Family
  const handleUpdateFamily = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingFamily) return;

    try {
      let updatedResidency = editingFamily.residency || editingFamily.neighborhood;
      let updatedLocation = editingFamily.location || updatedResidency;

      if (updatedResidency === "خارج القرية") {
        if (editFamGov === "مكان آخر (إدخال يدوي)") {
          updatedLocation = editFamOutsideLoc.trim() || "خارج القرية";
        } else {
          updatedLocation = editFamOutsideLoc.trim()
            ? `${editFamGov} - ${editFamOutsideLoc.trim()}`
            : editFamGov;
        }
      } else if (!editingFamily.location || editingFamily.location === "خارج القرية") {
        updatedLocation = updatedResidency;
      }

      const payload = {
        ...editingFamily,
        neighborhood: editingFamily.neighborhood,
        residency: updatedResidency,
        location: updatedLocation
      };

      const response = await fetch(`/api/family/${editingFamily.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.status === "success") {
        addLog(`تم تعديل بيانات أسرة ربها [${editingFamily.headName}] بنجاح`);
        setEditingFamily(null);
        await fetchData();
      } else {
        alert(data.message || "فشل تحديث بيانات الأسرة");
      }
    } catch (err) {
      alert("فشل تحديث بيانات العائلة");
      console.error(err);
    }
  };

  // PUT: Update Dependent
  const handleUpdateDependent = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingDependent) return;

    try {
      let updatedResidency = editingDependent.residency;
      let updatedLocation = editingDependent.location || "";

      const hostFam = families.find(f => f.familyCode === editingDependent.familyCode);
      const cleanedName = extractIndividualName(editingDependent.name, hostFam?.headName, hostFam?.title || editingDependent.title);

      if (editingDependent.residency === "خارج القرية") {
        updatedResidency = "خارج القرية";
        if (editDepGov === "مكان آخر (إدخال يدوي)") {
          updatedLocation = editDepOutsideLoc.trim() || "خارج القرية";
        } else {
          updatedLocation = editDepOutsideLoc.trim()
            ? `${editDepGov} - ${editDepOutsideLoc.trim()}`
            : editDepGov;
        }
      } else if (editingDependent.residency === "حسب إقامة الأسرة (تلقائياً)" || !editingDependent.residency) {
        if (hostFam) {
          updatedResidency = hostFam.residency;
          updatedLocation = hostFam.location;
        }
      } else {
        updatedLocation = updatedResidency;
      }

      const payload = {
        ...editingDependent,
        name: cleanedName,
        residency: updatedResidency,
        location: updatedLocation
      };

      const response = await fetch(`/api/dependent/${editingDependent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.status === "success") {
        addLog(`تم تعديل بيانات الفرد [${editingDependent.name}] بنجاح`);
        setEditingDependent(null);
        await fetchData();
      } else {
        alert(data.message || "فشل تحديث بيانات الفرد");
      }
    } catch (err) {
      alert("فشل تحديث بيانات الفرد");
      console.error(err);
    }
  };

  // DELETE: Delete Family (Super Admin ONLY)
  const handleDeleteFamily = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد تماماً من حذف عائلة [${name}] بالكامل؟ سيتم مسح جميع التابعين المرتبطين بها نهائياً!`)) {
      return;
    }
    try {
      const response = await fetch(`/api/family/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.status === "success") {
        addLog(`⚠️ تم حذف عائلة [${name}] والتابعين لها بالكامل من سجلات القرية`);
        await fetchData();
      }
    } catch (err) {
      alert("فشل حذف العائلة");
      console.error(err);
    }
  };

  // DELETE: Delete Dependent (Super Admin ONLY)
  const handleDeleteDependent = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف التابع [${name}]؟`)) {
      return;
    }
    try {
      const response = await fetch(`/api/dependent/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.status === "success") {
        addLog(`⚠️ تم حذف التابع [${name}] من قاعدة البيانات`);
        await fetchData();
      }
    } catch (err) {
      alert("فشل حذف الفرد التابع");
      console.error(err);
    }
  };

  // --- USER MANAGEMENT HANDLERS (ADMIN ONLY) ---

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserForm)
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setUserSuccess("تم إضافة المستخدم بنجاح");
        setIsAddingUser(false);
        setNewUserForm({ name: "", username: "", email: "", phone: "", password: "", role: "collector" });
        await fetchUsers();
      } else {
        setUserError(data.message || "فشل إضافة المستخدم");
      }
    } catch (err) {
      setUserError("حدث خطأ في الخادم");
    }
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserError(null);
    setUserSuccess(null);
    try {
      const response = await fetch(`/api/users/${editingUser.username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser)
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setUserSuccess("تم تحديث بيانات المستخدم بنجاح");
        setEditingUser(null);
        await fetchUsers();
      } else {
        setUserError(data.message || "فشل تحديث المستخدم");
      }
    } catch (err) {
      setUserError("حدث خطأ في الخادم");
    }
  };

  const handleDeleteUser = async (username: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب [${name}]؟`)) return;
    try {
      const response = await fetch(`/api/users/${username}`, { method: "DELETE" });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        addLog(`⚠️ تم حذف حساب المستخدم [${name}]`);
        await fetchUsers();
      } else {
        alert(data.message || "فشل حذف المستخدم");
      }
    } catch (err) {
      alert("حدث خطأ في الخادم");
    }
  };

  // ADMIN RESET PASSWORD
  const handleAdminResetPassword = async (username: string, name: string) => {
    const newPass = prompt(`أدخل كلمة المرور الجديدة للمستخدم [${name}]:`, "123456");
    if (!newPass) return;

    try {
      const response = await fetch(`/api/users/${username}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPass })
      });
      const data = await response.json();
      if (data.status === "success") {
        alert(data.message);
        addLog(`🔑 قام المدير بإعادة تعيين كلمة مرور المندوب [${name}]`);
      } else {
        alert(data.message || "فشل إعادة تعيين كلمة المرور");
      }
    } catch (err) {
      alert("حدث خطأ في الخادم");
    }
  };

  // PROFILE PASSWORD CHANGE
  const handleProfilePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (profilePassForm.newPassword !== profilePassForm.confirmPassword) {
      setProfileError("كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }

    try {
      const response = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser?.username,
          oldPassword: profilePassForm.currentPassword,
          newPassword: profilePassForm.newPassword
        })
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setProfileSuccess("تم تغيير كلمة المرور بنجاح");
        setProfilePassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setProfileError(data.message || "فشل تغيير كلمة المرور");
      }
    } catch (err) {
      setProfileError("حدث خطأ في الخادم");
    }
  };

  // Sync actions (POST to express proxy with direct Apps Script fallback)
  const handleSync = async (action: "pull" | "push") => {
    const effectiveScriptUrl = googleScriptUrl || localStorage.getItem("census_google_script_url") || DEFAULT_GOOGLE_SCRIPT_URL;

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === "success") {
          addLog(`☁️ [عملية مزامنة سحابية]: ${data.message}`);
          await fetchData();
          return;
        }
      }
    } catch (err: any) {
      console.warn("Backend /api/sync endpoint unavailable, falling back to direct Apps Script fetch:", err);
    }

    // Direct Google Apps Script Fallback
    if (!effectiveScriptUrl) {
      addLog("❌ يرجى تهيئة رابط Google Apps Script أولاً في الإعدادات");
      throw new Error("رابط Google Apps Script غير متاح");
    }

    try {
      addLog(`🔄 جاري الاتصال المباشر بسحابة جداول جوجل (${action})...`);
      
      if (action === "pull") {
        const directResp = await fetch(effectiveScriptUrl + (effectiveScriptUrl.includes("?") ? "&" : "?") + "action=pull");
        if (!directResp.ok) throw new Error("تعذر جلب البيانات المباشرة من سكريبت جوجل");
        const resData = await directResp.json();
        if (resData) {
          const fetchedFam = resData.families || [];
          const fetchedDep = resData.dependents || [];
          if (fetchedFam.length > 0) {
            setFamilies(fetchedFam);
            setDependents(fetchedDep);
            localStorage.setItem("census_families", JSON.stringify(fetchedFam));
            localStorage.setItem("census_dependents", JSON.stringify(fetchedDep));
            addLog(`✅ [مزامنة مباشرة ناجحة]: تم استيراد ${fetchedFam.length} أسرة من سحابة جوجل بنجاح`);
          } else {
            addLog("⚠️ تم الاتصال بسحابة جوجل بنجاح (لا توجد أسر سحابية)");
          }
          return;
        }
      } else {
        // Push action directly to Google Apps Script
        const payload = {
          action: "push",
          families,
          dependents
        };
        const pushResp = await fetch(effectiveScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        await pushResp.json().catch(() => ({}));
        addLog(`✅ [رفع مباشر ناجح]: تم رفع وتحديث الكشوفات في سحابة جداول جوجل بنجاح`);
        return;
      }
    } catch (directErr: any) {
      addLog(`❌ فشلت المزامنة المباشرة: ${directErr.message || "خطأ اتصال مع سكريبت جوجل"}`);
      throw directErr;
    }
  };

  // Bulk sync surnames & family titles from Google Sheets
  const handleSyncTitles = async () => {
    const effectiveScriptUrl = googleScriptUrl || localStorage.getItem("census_google_script_url") || DEFAULT_GOOGLE_SCRIPT_URL;

    try {
      addLog("🔄 جاري الاتصال بجداول جوجل لجلب ومزامنة كافة الألقاب وأسماء الأسر...");
      
      const response = await fetch("/api/sync-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleScriptUrl: effectiveScriptUrl })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "success" && Array.isArray(data.titles)) {
          setSchemaTitles(data.titles);
          localStorage.setItem("census_schema_titles", JSON.stringify(data.titles));

          // Also bulk update current families in React state
          let matchedCount = 0;
          const updatedFamilies = families.map((fam) => {
            const officialTitle = getExcelTitleForHeadName(fam.headName);
            if (officialTitle) {
              if (officialTitle !== fam.title) matchedCount++;
              return { ...fam, title: officialTitle };
            }
            return fam;
          });

          const famTitleMap = new Map<string, string>();
          updatedFamilies.forEach(f => {
            if (f.familyCode && f.title) famTitleMap.set(f.familyCode, f.title);
          });

          const updatedDependentsList = dependents.map(d => {
            if (d.familyCode && famTitleMap.has(d.familyCode)) {
              return { ...d, title: famTitleMap.get(d.familyCode)! };
            }
            return d;
          });

          setFamilies(updatedFamilies);
          setDependents(updatedDependentsList);
          localStorage.setItem("census_families", JSON.stringify(updatedFamilies));
          localStorage.setItem("census_dependents", JSON.stringify(updatedDependentsList));

          addLog(`✅ [مزامنة الألقاب]: تم تحديث وتطبيق الألقاب المعتمدة وفق ملف الإكسل لـ ${matchedCount || updatedFamilies.length} أسرة بنجاح`);
          setToastMessage(`تم جلب ومزامنة ${data.titles.length} لقباً ومطابقة ألقاب الأسر بنجاح!`);
          setTimeout(() => setToastMessage(null), 6000);
          return;
        }
      }
    } catch (err) {
      console.warn("Backend /api/sync-titles failed or offline, performing direct fetch:", err);
    }

    // Direct fetch fallback from Google Apps Script if server API endpoint is not reachable
    if (!effectiveScriptUrl) {
      alert("يرجى تهيئة رابط Google Apps Script أولاً في الإعدادات");
      return;
    }

    try {
      const directResp = await fetch(effectiveScriptUrl + (effectiveScriptUrl.includes("?") ? "&" : "?") + "action=pull");
      if (!directResp.ok) throw new Error("تعذر جلب البيانات المباشرة من سكريبت جوجل");
      const resData = await directResp.json();
      
      const fetchedFam = resData.families || [];
      const fetchedDep = resData.dependents || [];

      const titlesSet = new Set<string>(schemaTitles.length > 0 ? schemaTitles : ["الخطيب", "الغرافي", "الجعفري", "المجيدي", "بدون لقب"]);

      // Extract titles from families
      fetchedFam.forEach((f: any) => {
        const t = cleanString(f.title || f["اللقب"]);
        if (t && t !== "بدون لقب" && t.length >= 2) {
          titlesSet.add(t);
        }
        const head = cleanString(f.headName || f["رب الأسرة"]);
        if (head) {
          const parts = head.split(/\s+/);
          if (parts.length >= 2) {
            const surname = parts[parts.length - 1];
            if (surname.startsWith("ال") && surname.length >= 4) {
              titlesSet.add(surname);
            }
          }
        }
      });

      // Extract titles from dependents
      fetchedDep.forEach((d: any) => {
        const t = cleanString(d.title || d["اللقب"]);
        if (t && t !== "بدون لقب" && t.length >= 2) {
          titlesSet.add(t);
        }
      });

      // Extract from local families and dependents as well, plus ALL_UNIQUE_EXCEL_TITLES
      ALL_UNIQUE_EXCEL_TITLES.forEach(t => titlesSet.add(t));
      families.forEach((f) => {
        if (f.title && f.title !== "بدون لقب" && f.title.length >= 2) titlesSet.add(cleanString(f.title));
      });
      validDependents.forEach((d) => {
        if (d.title && d.title !== "بدون لقب" && d.title.length >= 2) titlesSet.add(cleanString(d.title));
      });

      const updatedList = Array.from(titlesSet).filter(Boolean);
      if (!updatedList.includes("بدون لقب")) {
        updatedList.push("بدون لقب");
      }

      setSchemaTitles(updatedList);
      localStorage.setItem("census_schema_titles", JSON.stringify(updatedList));

      // Match and update local families
      let localMatched = 0;
      const updatedFamilies = families.map((fam) => {
        const officialTitle = getExcelTitleForHeadName(fam.headName);
        if (officialTitle) {
          if (officialTitle !== fam.title) localMatched++;
          return { ...fam, title: officialTitle };
        }
        return fam;
      });

      const famTitleMap = new Map<string, string>();
      updatedFamilies.forEach(f => {
        if (f.familyCode && f.title) famTitleMap.set(f.familyCode, f.title);
      });

      const updatedDependentsList = dependents.map(d => {
        if (d.familyCode && famTitleMap.has(d.familyCode)) {
          return { ...d, title: famTitleMap.get(d.familyCode)! };
        }
        return d;
      });

      setFamilies(updatedFamilies);
      setDependents(updatedDependentsList);
      localStorage.setItem("census_families", JSON.stringify(updatedFamilies));
      localStorage.setItem("census_dependents", JSON.stringify(updatedDependentsList));

      // Post to /api/schema
      await fetch("/api/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighborhoods: schemaNeighborhoods,
          titles: updatedList,
          maritalStatuses: schemaMaritalStatuses,
          healthStatuses: schemaHealthStatuses
        })
      }).catch(() => {});

      addLog(`✅ [مزامنة الألقاب المباشرة]: تم تحديث ${updatedList.length} لقباً ومطابقة ألقاب الأسر بنجاح`);
      setToastMessage(`تم جلب ومزامنة ${updatedList.length} لقباً ومطابقة ألقاب الأسر بنجاح!`);
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      alert(`فشلت مزامنة الألقاب: ${err.message || "خطأ اتصال مع سكريبت جوجل"}`);
    }
  };

  // Toggle family expansion row
  const toggleFamilyRow = (code: string) => {
    setExpandedFamilies((prev) => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const validCleanHoods = useMemo(() => VALID_NEIGHBORHOODS.map(cleanString), []);

  // Unified Clean Dependents Array (Memoized)
  const validDependents = useMemo(() => {
    return dependents.filter(d => d && d.name && d.name.trim() !== '' && d.familyCode);
  }, [dependents]);

  // Filtering data logic based strictly on Column F (residency) as primary criterion (Memoized)
  const filteredFamilies = useMemo(() => {
    const searchLower = familySearch.toLowerCase().trim();
    const cleanFilter = familyHoodFilter ? cleanString(familyHoodFilter) : "";

    return families.filter((f) => {
      let matchesSearch = true;
      if (searchLower) {
        const headMatches = (f.headName && f.headName.toLowerCase().includes(searchLower)) ||
                            (f.familyCode && f.familyCode.toLowerCase().includes(searchLower)) ||
                            (f.title && f.title.toLowerCase().includes(searchLower)) ||
                            (f.phone && f.phone.includes(searchLower)) ||
                            (f.secondaryPhone && f.secondaryPhone.includes(searchLower));

        const familyDeps = validDependents.filter(d => d.familyCode === f.familyCode);
        const depMatches = familyDeps.some(d => 
          (d.name && d.name.toLowerCase().includes(searchLower)) ||
          (d.phone && d.phone.includes(searchLower)) ||
          (d.nationalId && d.nationalId.includes(searchLower)) ||
          formatDependentFullName(d, f).toLowerCase().includes(searchLower)
        );

        matchesSearch = headMatches || depMatches;
      }
      
      let matchesHood = true;
      if (cleanFilter) {
        if (cleanFilter === "خارج القرية") {
          matchesHood = cleanString(f.residency) === "خارج القرية";
        } else if (validCleanHoods.includes(cleanFilter)) {
          matchesHood = cleanString(f.residency) === cleanFilter;
        } else {
          matchesHood = cleanString(f.residency) === cleanFilter || cleanString(f.neighborhood) === cleanFilter;
        }
      }

      let matchesExt = true;
      if (healthFilter || ageFilter || maritalFilter || titleFilter || vitalFilter || qualificationFilter) {
        const familyDeps = validDependents.filter(d => d.familyCode === f.familyCode);

        // Health
        const headHealth = matchesHealthFilter(f.healthStatus, healthFilter);
        const depHealth = familyDeps.some(d => matchesHealthFilter(d.healthStatus, healthFilter));
        const healthOk = !healthFilter || headHealth || depHealth;

        // Age
        const headAge = matchesAgeFilter(f.birthDate, ageFilter);
        const depAge = familyDeps.some(d => matchesAgeFilter(d.birthDate, ageFilter));
        const ageOk = !ageFilter || headAge || depAge;

        // Marital
        const headMarital = matchesMaritalFilter(f.maritalStatus, maritalFilter, f.deathDate);
        const depMarital = familyDeps.some(d => matchesMaritalFilter(d.maritalStatus, maritalFilter, d.deathDate));
        const maritalOk = !maritalFilter || headMarital || depMarital;

        // Title
        const headTitle = !titleFilter || (f.title && f.title.trim().toLowerCase() === titleFilter.trim().toLowerCase());
        const depTitle = familyDeps.some(d => d.title && d.title.trim().toLowerCase() === titleFilter.trim().toLowerCase());
        const titleOk = !titleFilter || headTitle || depTitle;

        // Qualification
        const headQual = !qualificationFilter || (f.qualification && f.qualification.trim().toLowerCase() === qualificationFilter.trim().toLowerCase());
        const depQual = familyDeps.some(d => d.qualification && d.qualification.trim().toLowerCase() === qualificationFilter.trim().toLowerCase());
        const qualOk = !qualificationFilter || headQual || depQual;

        // Vital (Mowaleed & Wafaat / Living)
        let vitalOk = true;
        const headDead = isDeceasedStatus(f.maritalStatus, f.deathDate);
        const headRecent = isRecentBirthDate(f.birthDate);

        if (vitalFilter === "living") {
          vitalOk = !headDead || familyDeps.some(d => !isDeceasedStatus(d.maritalStatus, d.deathDate));
        } else if (vitalFilter === "births") {
          vitalOk = headRecent || familyDeps.some(d => isRecentBirthDate(d.birthDate));
        } else if (vitalFilter === "deceased") {
          vitalOk = headDead || familyDeps.some(d => isDeceasedStatus(d.maritalStatus, d.deathDate));
        }

        matchesExt = healthOk && ageOk && maritalOk && titleOk && qualOk && vitalOk;
      }

      return matchesSearch && matchesHood && matchesExt;
    });
  }, [families, validDependents, familySearch, familyHoodFilter, validCleanHoods, healthFilter, ageFilter, maritalFilter, titleFilter, vitalFilter, qualificationFilter]);

  // Memoized Filtered Dependents with O(1) map lookup
  const filteredDependents = useMemo(() => {
    const searchLower = dependentSearch.toLowerCase().trim();
    const famMap = new Map<string, Family>();
    for (let i = 0; i < families.length; i++) {
      if (families[i].familyCode) {
        famMap.set(families[i].familyCode, families[i]);
      }
    }

    return validDependents.filter((d) => {
      let matchesSearch = true;
      if (searchLower) {
        const hostFam = famMap.get(d.familyCode);
        const fullName = formatDependentFullName(d, hostFam);

        matchesSearch = (d.name && d.name.toLowerCase().includes(searchLower)) ||
                        fullName.toLowerCase().includes(searchLower) ||
                        (d.familyCode && d.familyCode.toLowerCase().includes(searchLower)) ||
                        (d.nationalId && d.nationalId.includes(searchLower)) ||
                        (d.phone && d.phone.includes(searchLower));
      }

      let matchesExt = true;
      if (healthFilter || ageFilter || maritalFilter || titleFilter || vitalFilter || qualificationFilter) {
        const hostFam = famMap.get(d.familyCode);

        const healthOk = matchesHealthFilter(d.healthStatus, healthFilter);
        const ageOk = matchesAgeFilter(d.birthDate, ageFilter);
        const maritalOk = matchesMaritalFilter(d.maritalStatus, maritalFilter, d.deathDate);

        const titleOk = !titleFilter || (d.title && d.title.trim().toLowerCase() === titleFilter.trim().toLowerCase()) || (hostFam?.title && hostFam.title.trim().toLowerCase() === titleFilter.trim().toLowerCase());
        const qualOk = !qualificationFilter || (d.qualification && d.qualification.trim().toLowerCase() === qualificationFilter.trim().toLowerCase());

        let vitalOk = true;
        const dead = isDeceasedStatus(d.maritalStatus, d.deathDate);
        if (vitalFilter === "living") {
          vitalOk = !dead;
        } else if (vitalFilter === "births") {
          vitalOk = !dead && isRecentBirthDate(d.birthDate);
        } else if (vitalFilter === "deceased") {
          vitalOk = dead;
        }

        matchesExt = healthOk && ageOk && maritalOk && titleOk && qualOk && vitalOk;
      }

      return matchesSearch && matchesExt;
    });
  }, [validDependents, families, dependentSearch, healthFilter, ageFilter, maritalFilter, titleFilter, vitalFilter, qualificationFilter]);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setFamilyPage(1);
    setDependentPage(1);
  }, [familySearch, familyHoodFilter, dependentSearch, healthFilter, ageFilter, maritalFilter, titleFilter, vitalFilter, qualificationFilter]);

  // Sliced paginated items for ultra-fast DOM rendering
  const paginatedFamilies = useMemo(() => {
    if (familyPageSize <= 0) return filteredFamilies;
    const start = (familyPage - 1) * familyPageSize;
    return filteredFamilies.slice(start, start + familyPageSize);
  }, [filteredFamilies, familyPage, familyPageSize]);

  const paginatedDependents = useMemo(() => {
    if (dependentPageSize <= 0) return filteredDependents;
    const start = (dependentPage - 1) * dependentPageSize;
    return filteredDependents.slice(start, start + dependentPageSize);
  }, [filteredDependents, dependentPage, dependentPageSize]);

  const totalFamilyPages = familyPageSize > 0 ? Math.ceil(filteredFamilies.length / familyPageSize) : 1;
  const totalDependentPages = dependentPageSize > 0 ? Math.ceil(filteredDependents.length / dependentPageSize) : 1;

  // Batch selection handlers
  const toggleSelectFamily = (id: number) => {
    setSelectedFamilyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFamilies = () => {
    const currentFilteredIds = filteredFamilies.map((f) => f.id);
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every((id) => selectedFamilyIds.includes(id));
    if (allSelected) {
      setSelectedFamilyIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedFamilyIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const toggleSelectDependent = (id: number) => {
    setSelectedDependentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDependents = () => {
    const currentFilteredIds = filteredDependents.map((d) => d.id);
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every((id) => selectedDependentIds.includes(id));
    if (allSelected) {
      setSelectedDependentIds((prev) => prev.filter((id) => !currentFilteredIds.includes(id)));
    } else {
      setSelectedDependentIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const openBatchModal = (
    target: "families" | "dependents",
    action: "edit_title" | "edit_neighborhood" | "edit_residency_location" | "edit_gender" | "delete"
  ) => {
    setBatchTitle(TITLES[0] || "الخطيب");
    setBatchNeighborhood(VALID_NEIGHBORHOODS[0] || "العنين");
    const initialRes = NEIGHBORHOODS[0] || "العنين";
    setBatchResidency(initialRes);
    setBatchLocation(initialRes);
    setCustomBatchLocation("");
    setBatchGender("ذكر");
    setUpdateDependentsTitle(true);
    setBatchModal({ target, action });
  };

  const handleBatchResidencySelect = (val: string) => {
    setBatchResidency(val);
    if (val === "خارج القرية") {
      setBatchLocation(YEMEN_GOVERNORATES[0]); // "أمانة العاصمة"
      setCustomBatchLocation("");
    } else {
      setBatchLocation(val); // equal to selected village neighborhood
    }
  };

  const handleExecuteBatchAction = async () => {
    if (!batchModal) return;
    const { target, action } = batchModal;
    const ids = target === "families" ? selectedFamilyIds : selectedDependentIds;

    if (ids.length === 0) return;

    let finalLocation = batchLocation;
    if (batchResidency === "خارج القرية") {
      if (batchLocation === "مكان آخر (إدخال يدوي)") {
        finalLocation = customBatchLocation.trim() || "خارج القرية";
      }
    } else {
      finalLocation = batchResidency;
    }

    setIsBatchExecuting(true);
    try {
      const response = await fetch(`/api/batch/${target}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids,
          data: {
            title: batchTitle,
            neighborhood: batchNeighborhood,
            residency: batchResidency,
            location: finalLocation,
            gender: batchGender,
            updateDependentsTitle
          }
        })
      });

      const data = await response.json();
      if (data.status === "success") {
        setFamilies(data.families);
        setDependents(data.dependents);
        if (target === "families") {
          setSelectedFamilyIds([]);
        } else {
          setSelectedDependentIds([]);
        }
        setBatchModal(null);
        setToastMessage(data.message || `تم تنفيذ الإجراء الجماعي بنجاح وتحديث الشيت`);
        setTimeout(() => setToastMessage(null), 6000);
      } else {
        alert("حدث خطأ أثناء تنفيذ الإجراء الجماعي: " + (data.message || "خطأ غير معروف"));
      }
    } catch (err) {
      console.error("Batch operation failed:", err);
      alert("فشلت عملية المزامنة والتحديث الجماعي. يرجى إعادة المحاولة.");
    } finally {
      setIsBatchExecuting(false);
    }
  };

  // Calculate next ID candidate for family code generation
  const nextFamilyId = families.length > 0 ? Math.max(...families.map((f) => f.id)) + 1 : 1;

  // Text cleaning function
  const cleanStr = (s: any) => String(s || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();

  // 1. حساب إجمالي المقيمين داخل كل محلة (من العمود F):
  const getNeighborhoodCount = (neighborhoodName: string) => {
    return families
      .filter(f => cleanStr(f.residency) === cleanStr(neighborhoodName))
      .reduce((sum, f) => {
        const famDepsCount = validDependents.filter(d => d.familyCode === f.familyCode).length;
        return sum + 1 + famDepsCount;
      }, 0);
  };

  // 2. حساب إجمالي المقيمين خارج القرية (من العمود F):
  const outsideVillageCount = families
    .filter(f => cleanStr(f.residency) === 'خارج القرية')
    .reduce((sum, f) => {
      const famDepsCount = validDependents.filter(d => d.familyCode === f.familyCode).length;
      return sum + 1 + famDepsCount;
    }, 0);

  // 3. حساب إجمالي السكان الأحياء:
  const totalPopulation = families.length + validDependents.length;

  const totalFamiliesCount = families.length;
  const totalLivingHeads = families.filter(f => !f.deathDate).length;
  const totalLivingDeps = validDependents.filter(d => d.maritalStatus !== "متوفى").length;
  const recentBirths = validDependents.filter(d => {
    if (!d.birthDate) return false;
    const birthYear = new Date(d.birthDate).getFullYear();
    return birthYear >= 2024 && d.maritalStatus !== "متوفى";
  }).length;

  // Unauthenticated screen
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // RBAC Role Restrictions & Granular Permissions
  const isSuperAdmin = currentUser.role === "admin";
  const isCollector = currentUser.role === "collector";
  const isViewer = currentUser.role === "viewer";

  // Granular permissions flags from backend user object
  const canModify = isSuperAdmin || (currentUser.permissions?.canEdit !== false && !isViewer);
  const canExport = isSuperAdmin || currentUser.permissions?.canExport !== false;
  const canUpload = isSuperAdmin || currentUser.permissions?.canUpload !== false;
  const canSync = isSuperAdmin || currentUser.permissions?.canSync === true;

  const renderPaginationBar = (
    currentPage: number,
    totalPages: number,
    pageSize: number,
    setPage: (val: number | ((prev: number) => number)) => void,
    setPageSize: (val: number | ((prev: number) => number)) => void,
    totalItems: number
  ) => {
    if (totalItems === 0) return null;

    const startItem = pageSize > 0 ? (currentPage - 1) * pageSize + 1 : 1;
    const endItem = pageSize > 0 ? Math.min(currentPage * pageSize, totalItems) : totalItems;

    return (
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 rounded-b-2xl select-none">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-700">
            عرض <strong className="font-mono text-emerald-800">{startItem}</strong> - <strong className="font-mono text-emerald-800">{endItem}</strong> من إجمالي <strong className="font-mono text-indigo-900">{totalItems}</strong> سجل
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">سجل لكل صفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>الكل ({totalItems})</option>
            </select>
          </div>
        </div>

        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed text-xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>

            <span className="px-3 py-1 font-mono font-bold text-slate-700 bg-white border border-slate-200 rounded-lg text-xs">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed text-xs"
            >
              <span>التالي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-right flex flex-col font-sans antialiased select-none" dir="rtl">
      {/* Top Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-black text-sm tracking-wider">DJ</div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900">نظام التعداد السكاني — قرية ذي الجمال</h1>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 uppercase tracking-widest mr-2">
            {currentUser.role === "admin" ? "SUPER ADMIN" : currentUser.role === "collector" ? "COLLECTOR" : "VIEWER"}
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-emerald-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            متصل بـ Google Sheets API
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-200 mx-1"></div>
          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-xs font-bold leading-none text-slate-900">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 leading-none mt-1 text-left">
                {currentUser.role === "admin" ? "المشرف العام" : currentUser.role === "collector" ? "جامع البيانات" : "مراقب عام"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition border border-transparent hover:border-rose-100 cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="bg-slate-50 p-3 border border-slate-200 rounded">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">إجمالي السكان الأحياء</p>
          <p className="text-2xl font-black text-slate-900">{totalPopulation.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 p-3 border border-slate-200 rounded">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">إجمالي الأسر المسجلة</p>
          <p className="text-2xl font-black text-slate-900">{totalFamiliesCount.toLocaleString()}</p>
        </div>
        <div className="bg-slate-50 p-3 border border-slate-200 rounded">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المواليد الجدد (منذ 2024)</p>
          <p className="text-2xl font-black text-emerald-600">+{recentBirths}</p>
        </div>
        <div className="bg-slate-50 p-3 border border-slate-200 rounded">
          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المقيمون خارج القرية</p>
          <p className="text-2xl font-black text-indigo-600">{outsideVillageCount}</p>
        </div>
      </div>

      {/* Main Action Toolbar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {canModify ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full xl:w-auto">
              <button
                onClick={() => {
                  setSelectedFamilyCodeForDep("");
                  setIsAddDependentOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة فرد
              </button>
              <button
                onClick={() => setIsAddFamilyOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#064E3B] hover:bg-[#043d2e] text-white rounded-lg font-bold text-[11px] shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Home className="w-3.5 h-3.5" /> إضافة أسرة جديدة
              </button>
              <button
                onClick={() => setIsTransferOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-[11px] shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> نقل فرد
              </button>
              <button
                onClick={() => setIsBirthDeathOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Baby className="w-3.5 h-3.5" /> المواليد والوفيات
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-500 py-1 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              وضع المشاهدة النشط: لا تمتلك صلاحيات لتعديل السجلات السكنية.
            </div>
          )}

          {/* Export Button for Users with Export Permission */}
          {canExport && (
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] shadow-sm cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> تصدير التقارير والبيانات
            </button>
          )}

          {/* Button: Automatic Missing Records Auditor with Notification Counter */}
          <button
            type="button"
            onClick={() => setIsIncompleteRecordsOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[11px] shadow-sm cursor-pointer transition-all active:scale-95 shrink-0 border border-amber-400"
            title="الكشف التلقائي عن السجلات والأفراد بدون رقم وطني أو تاريخ ميلاد"
          >
            <AlertTriangle className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>السجلات الناقصة</span>
            {incompleteRecordsCount > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                {incompleteRecordsCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-grow"></div>
        
        {/* Navigation Tabs built directly into action bar for a dense technical layout */}
        <div className="flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition select-none cursor-pointer ${
              activeTab === "dashboard" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            الرئيسية
          </button>
          <button
            onClick={() => setActiveTab("families")}
            className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition select-none cursor-pointer ${
              activeTab === "families" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            الأسر ({families.length})
          </button>
          <button
            onClick={() => setActiveTab("dependents")}
            className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition select-none cursor-pointer ${
              activeTab === "dependents" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            التابعين ({validDependents.length})
          </button>
          {canSync && (
            <button
              onClick={() => setActiveTab("sync")}
              className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition select-none cursor-pointer ${
                activeTab === "sync" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              سحابة المزامنة
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition select-none cursor-pointer ${
                activeTab === "users" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              إدارة الحسابات
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("schema")}
              className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition select-none cursor-pointer ${
                activeTab === "schema" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              إدارة القوائم
            </button>
          )}
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3.5 py-1.5 rounded-md text-[11px] font-bold transition select-none cursor-pointer ${
              activeTab === "profile" ? "bg-white text-indigo-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            الملف الشخصي
          </button>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-xs mr-2 border-r border-slate-300 pr-2">
          <RefreshCw 
            className={`w-3.5 h-3.5 cursor-pointer hover:text-indigo-600 transition ${isLoading ? "animate-spin text-indigo-600" : ""}`}
            onClick={fetchData} 
            title="تحديث البيانات من الخادم"
          />
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="flex grow overflow-hidden">
        {/* Sidebar Navigator - Approved Neighborhoods list */}
        <aside className="hidden md:flex w-60 border-l border-slate-200 bg-white p-4 flex-col gap-6 shrink-0 overflow-y-auto">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">المحلات المعتمدة</p>
            <ul className="space-y-1">
              <li 
                onClick={() => {
                  setFamilyHoodFilter("");
                  setActiveTab("families");
                }}
                className={`flex justify-between items-center px-3 py-2 rounded text-xs font-bold cursor-pointer transition ${
                  familyHoodFilter === "" && activeTab === "families"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                    : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <span>الكل (كل المحلات)</span>
                <span className="opacity-60">{totalPopulation}</span>
              </li>
              {NEIGHBORHOODS.map((hood) => {
                const count = getNeighborhoodCount(hood);
                const isSelected = familyHoodFilter === hood && activeTab === "families";
                return (
                  <li 
                    key={hood}
                    onClick={() => {
                      setFamilyHoodFilter(hood);
                      setActiveTab("families");
                    }}
                    className={`flex justify-between items-center px-3 py-2 rounded text-xs font-bold cursor-pointer transition ${
                      isSelected 
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                        : "hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span>{hood}</span>
                    <span className="opacity-60 font-mono">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-auto pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              آخر مزامنة مع السحابة:<br/>مكتملة وحية ومؤمنة بالكامل
            </p>
          </div>
        </aside>

        {/* Workspace content page */}
        <main className="grow bg-white overflow-y-auto p-6 flex flex-col min-w-0">
          
          {/* Notification Toast Alert */}
          {toastMessage && (
            <div className="bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-md flex items-center justify-between text-xs font-bold mb-4 border border-emerald-600 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-200" />
                <span>{toastMessage}</span>
              </div>
              <button 
                onClick={() => setToastMessage(null)}
                className="p-1 hover:bg-emerald-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-emerald-100" />
              </button>
            </div>
          )}
          
          {/* -------------------- TAB 1: Dashboard Analytics -------------------- */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Global Search Bar on Main Dashboard */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-2xl shadow-lg border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-indigo-600/30 p-2.5 rounded-xl border border-indigo-500/30 text-indigo-300">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-black">محرك البحث الشامل عن الأسر والأفراد بالقرية</h2>
                      <p className="text-xs text-slate-300">ابحث باسم رب الأسرة، اسم الفرد، اللقب، كود الأسرة، أو رقم الهاتف</p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="اكتب اسم رب الأسرة أو اسم الفرد (مثال: بسيم أو حلمي أو الخطيب)..."
                    className="w-full pl-10 pr-4 py-3 bg-white text-slate-900 text-sm font-bold rounded-xl border-0 outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400 placeholder:font-normal shadow-inner"
                  />
                  {globalSearch && (
                    <button
                      onClick={() => setGlobalSearch("")}
                      className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Integrated extended filter dropdowns */}
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 backdrop-blur-xs">
                  {renderExtendedSearchDropdowns()}
                </div>

                {/* Real-time search results preview */}
                {globalSearch.trim() && (() => {
                  const query = globalSearch.toLowerCase().trim();
                  const matchingFamResults = families.filter(f => 
                    f.headName.toLowerCase().includes(query) ||
                    f.familyCode.toLowerCase().includes(query) ||
                    (f.title && f.title.toLowerCase().includes(query)) ||
                    (f.phone && f.phone.includes(query)) ||
                    (f.secondaryPhone && f.secondaryPhone.includes(query))
                  );

                  const matchingDepResults = validDependents.filter(d => {
                    const hostFam = families.find(f => f.familyCode === d.familyCode);
                    const fullName = formatDependentFullName(d, hostFam);
                    return d.name.toLowerCase().includes(query) ||
                           fullName.toLowerCase().includes(query) ||
                           d.familyCode.toLowerCase().includes(query) ||
                           d.nationalId.toLowerCase().includes(query) ||
                           (d.phone && d.phone.includes(query));
                  });

                  const totalResults = matchingFamResults.length + matchingDepResults.length;

                  return (
                    <div className="bg-white rounded-xl p-4 text-slate-900 shadow-xl border border-indigo-100 max-h-96 overflow-y-auto space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-indigo-900">نتائج البحث ({totalResults} نتيجة)</span>
                        <span className="text-[11px] text-slate-500">انقر على النتيجة للانتقال للسجل الكامل</span>
                      </div>

                      {totalResults === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500 font-medium">
                          لا توجد نتائج مطابقة لـ "{globalSearch}"
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Family matches */}
                          {matchingFamResults.length > 0 && (
                            <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">الأسر ورب الأسرة ({matchingFamResults.length})</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {matchingFamResults.map(f => (
                                  <div
                                    key={`search-fam-${f.id}`}
                                    onClick={() => {
                                      setFamilySearch(f.headName);
                                      setActiveTab("families");
                                      setExpandedFamilies({ [f.familyCode]: true });
                                    }}
                                    className="p-3 bg-slate-50 hover:bg-indigo-50/80 rounded-xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer flex items-center justify-between group"
                                  >
                                    <div>
                                      <p className="text-xs font-black text-slate-900 group-hover:text-indigo-900">
                                        {f.headName} {f.title !== "بدون لقب" ? f.title : ""}
                                      </p>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        كود الأسرة: <span className="font-mono font-bold text-slate-700">{f.familyCode}</span> | المحلة: <span className="font-bold">{f.residency}</span>
                                      </p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition">عرض السجل</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Individual / Dependent matches */}
                          {matchingDepResults.length > 0 && (
                            <div>
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">الأفراد والتابعين ({matchingDepResults.length})</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {matchingDepResults.map(d => {
                                  const hostFam = families.find(f => f.familyCode === d.familyCode);
                                  const formattedName = formatDependentFullName(d, hostFam);

                                  return (
                                    <div
                                      key={`search-dep-${d.id}`}
                                      onClick={() => {
                                        setFamilySearch(d.name);
                                        setActiveTab("families");
                                        setExpandedFamilies({ [d.familyCode]: true });
                                      }}
                                      className="p-3 bg-slate-50 hover:bg-blue-50/80 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer flex items-center justify-between group"
                                    >
                                      <div>
                                        <p className="text-xs font-black text-slate-900 group-hover:text-blue-900">
                                          {formattedName}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          الصلة: <span className="font-bold text-slate-700">{d.relation}</span> | كود الأسرة: <span className="font-mono font-bold text-slate-700">{d.familyCode}</span>
                                          {d.healthStatus && d.healthStatus !== "سليم / جيدة" && (
                                            <span className="mr-1.5 text-rose-600 font-bold">({d.healthStatus})</span>
                                          )}
                                        </p>
                                      </div>
                                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md group-hover:bg-blue-600 group-hover:text-white transition">عرض الأسرة</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <CensusAnalytics families={filteredFamilies} dependents={filteredDependents} neighborhoods={schemaNeighborhoods} />
            </div>
          )}

          {/* -------------------- TAB 2: Families Table -------------------- */}
          {activeTab === "families" && (
            <div className="space-y-4">
              {/* Extended Search Dropdowns Row (Single line, color-coded) */}
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl shadow-xs">
                {renderExtendedSearchDropdowns()}
              </div>

              {/* Compact Unified Search & Filter Bar */}
              <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                <div className="relative flex-1 w-full flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={familySearch}
                      onChange={(e) => setFamilySearch(e.target.value)}
                      placeholder="ابحث باسم رب الأسرة، كود الأسرة، أو رقم الهاتف..."
                      className="w-full pr-9 pl-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-slate-50 transition"
                    />
                    {familySearch && (
                      <button 
                        onClick={() => setFamilySearch("")}
                        className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">بحث</span>
                  </button>
                </div>

                {/* Neighborhood select filter & Reading mode toggle */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={toggleReadingMode}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                      isReadingMode 
                        ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    }`}
                    title="تفعيل/إيقاف وضع القراءة لتكبير الخطوط وتوسيع مساحة الصفوف للشاشات الصغيرة والمناديب"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{isReadingMode ? "وضع القراءة مُفعّل 👓" : "وضع القراءة 👓"}</span>
                  </button>

                  <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <span className="text-xs font-bold text-slate-500 shrink-0">المحلة:</span>
                    <select
                      value={familyHoodFilter}
                      onChange={(e) => setFamilyHoodFilter(e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-emerald-500 font-medium text-slate-700 w-full sm:w-48"
                    >
                      <option value="">كل المحلات ({NEIGHBORHOODS.length})</option>
                      {NEIGHBORHOODS.map((hood) => {
                        const count = getNeighborhoodCount(hood);
                        return (
                          <option key={hood} value={hood}>
                            {hood} ({count} فرد)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

            {/* Batch Actions Toolbar for Families */}
            {selectedFamilyIds.length > 0 && (
              <div className="bg-indigo-900 text-white p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 border border-indigo-700 animate-fade-in sticky top-2 z-20">
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-800 text-indigo-100 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-700">
                    تم تحديد {selectedFamilyIds.length} أسرة
                  </span>
                  <button
                    onClick={() => setSelectedFamilyIds([])}
                    className="text-xs text-indigo-200 hover:text-white underline cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openBatchModal("families", "edit_title")}
                    className="px-2.5 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-indigo-600 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل اللقب جماعياً ✏️</span>
                  </button>

                  <button
                    onClick={() => openBatchModal("families", "edit_neighborhood")}
                    className="px-2.5 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-indigo-600 cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>تعديل المحلة / نقل جماعي 🏠</span>
                  </button>

                  <button
                    onClick={() => openBatchModal("families", "edit_residency_location")}
                    className="px-2.5 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-indigo-600 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>تعديل الإقامة ومكانها 📍</span>
                  </button>

                  <button
                    onClick={() => openBatchModal("families", "edit_gender")}
                    className="px-2.5 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-indigo-600 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>تعديل الجنس ⚧️</span>
                  </button>

                  {canModify && (
                    <button
                      onClick={() => openBatchModal("families", "delete")}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف جماعي 🗑️</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Families list grid */}
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className={`w-full text-right transition-all ${isReadingMode ? "text-base sm:text-lg" : "text-xs"}`}>
                  <thead className={`bg-slate-50 text-slate-600 font-bold select-none border-b border-slate-200 ${isReadingMode ? "text-sm sm:text-base" : "text-[11px]"}`}>
                    <tr>
                      <th className={`w-10 text-center ${isReadingMode ? "p-4" : "px-3 py-3.5"}`}>
                        <input
                          type="checkbox"
                          checked={filteredFamilies.length > 0 && filteredFamilies.every((f) => selectedFamilyIds.includes(f.id))}
                          onChange={toggleSelectAllFamilies}
                          className={`rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer ${isReadingMode ? "w-5 h-5" : "w-4 h-4"}`}
                          title="تحديد الكل / إلغاء تحديد الكل"
                        />
                      </th>
                      <th className={`w-10 text-center ${isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}`}>م</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}>رب الأسرة</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}>المحلة</th>
                      <th className={`text-center ${isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}`}>عدد الأفراد</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}>رقم الجوال</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}>الإقامة</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}>مكان الإقامة</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}>الجنس</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}>اللقب</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}>الحالة الاجتماعية</th>
                      <th className={`text-center ${isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}`}>تاريخ الميلاد</th>
                      <th className={`text-center ${isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}`}>تاريخ الوفاة</th>
                      <th className={`text-center ${isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}`}>تاريخ الزواج</th>
                      <th className={`font-mono text-center ${isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}`}>كود الأسرة</th>
                      <th className={`text-center ${isReadingMode ? "p-4 font-black text-slate-900" : "px-3 py-3.5"}`}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-slate-100 ${isReadingMode ? "divide-slate-200" : ""}`}>
                    {filteredFamilies.length === 0 ? (
                      <tr>
                        <td colSpan={16} className={`text-center text-slate-400 font-medium ${isReadingMode ? "p-8 text-lg" : "px-4 py-8 text-xs"}`}>
                          لا توجد نتائج مطابقة لفلترة البحث.
                        </td>
                      </tr>
                    ) : (
                      paginatedFamilies.map((fam, index) => {
                        const isExpanded = expandedFamilies[fam.familyCode] || false;
                        const familyDeps = validDependents.filter((d) => d.familyCode === fam.familyCode);
                        const isDead = isDeceasedStatus(fam.maritalStatus, fam.deathDate);
                        const isSelected = selectedFamilyIds.includes(fam.id);
                        const displayIndex = (familyPageSize > 0 ? (familyPage - 1) * familyPageSize : 0) + index + 1;

                        const cellClass = isReadingMode ? "px-4 py-4 sm:py-5 font-bold" : "px-3 py-3.5";

                        return (
                          <Fragment key={`fam-${fam.id || 'noid'}-${fam.familyCode || 'nocode'}-${index}`}>
                            <tr className={`hover:bg-amber-50/40 transition-colors ${isSelected ? "bg-indigo-50/80" : isDead ? "bg-rose-50/40" : isReadingMode ? "bg-white border-b border-slate-200" : ""}`}>
                              <td className={`${cellClass} text-center`}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectFamily(fam.id)}
                                  className={`rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer ${isReadingMode ? "w-5 h-5" : "w-4 h-4"}`}
                                />
                              </td>
                              <td className={`${cellClass} font-mono font-medium text-slate-400 text-center`}>{displayIndex}</td>
                              <td className={cellClass}>
                                {canModify ? (
                                  <button
                                    onClick={() => handleStartEditFamily(fam)}
                                    className={`font-black text-right hover:underline cursor-pointer transition ${
                                      isDead ? "line-through text-slate-500" : "text-emerald-700 hover:text-emerald-900"
                                    } ${isReadingMode ? "text-lg sm:text-xl" : ""}`}
                                    title="انقر لتعديل بيانات رب الأسرة"
                                  >
                                    {fam.headName || "—"}
                                  </button>
                                ) : (
                                  <span className={`font-black ${isDead ? "line-through text-slate-500" : "text-slate-800"} ${isReadingMode ? "text-lg sm:text-xl" : ""}`}>
                                    {fam.headName || "—"}
                                  </span>
                                )}
                                {isDead && (
                                  <span className={`mr-1.5 bg-rose-100 text-rose-700 rounded-full font-bold inline-block ${isReadingMode ? "text-xs px-2.5 py-1" : "text-[9px] px-1.5 py-0.5"}`}>
                                    متوفى
                                  </span>
                                )}
                              </td>
                              <td className={`${cellClass} font-bold text-slate-700`}>{fam.neighborhood || "—"}</td>
                              <td className={`${cellClass} text-center`}>
                                <span className={`bg-emerald-50 text-emerald-800 font-bold rounded-md border border-emerald-100 font-mono inline-block ${isReadingMode ? "text-sm px-3 py-1.5" : "text-[11px] px-2 py-1"}`}>
                                  {fam.memberCount} أفراد
                                </span>
                              </td>
                              <td className={`${cellClass} font-mono text-slate-700`}>{fam.phone || "—"}</td>
                              <td className={`${cellClass} text-slate-700`}>{fam.residency || "—"}</td>
                              <td className={`${cellClass} text-slate-700 font-medium`}>{fam.location || "—"}</td>
                              <td className={`${cellClass} text-slate-600`}>{fam.gender || "—"}</td>
                              <td className={`${cellClass} text-slate-700`}>{fam.title || "بدون لقب"}</td>
                              <td className={`${cellClass} text-slate-600`}>{fam.maritalStatus || "—"}</td>
                              <td className={`${cellClass} font-mono text-slate-700 text-center whitespace-nowrap`}>{fam.birthDate || "—"}</td>
                              <td className={`${cellClass} font-mono text-slate-700 text-center whitespace-nowrap`}>{fam.deathDate || "—"}</td>
                              <td className={`${cellClass} font-mono text-slate-700 text-center whitespace-nowrap`}>{fam.marriageDate || "—"}</td>
                              <td className={`${cellClass} text-center font-mono`}>
                                <span className={`bg-slate-100 rounded border border-slate-200 text-slate-700 font-bold inline-block ${isReadingMode ? "text-xs px-2.5 py-1" : "text-[10px] px-1.5 py-0.5"}`}>
                                  {fam.familyCode || "—"}
                                </span>
                              </td>
                              
                              {/* Action controls & Toggle expansion */}
                              <td className={`${cellClass} text-center`}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => toggleFamilyRow(fam.familyCode)}
                                    className={`inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition font-bold cursor-pointer ${isReadingMode ? "px-3 py-2 text-xs sm:text-sm" : "px-2 py-1 text-[10px]"}`}
                                    title={isExpanded ? "إخفاء التابعين" : "استعراض التابعين"}
                                  >
                                    <span>{isExpanded ? "إخفاء" : "التابعين"}</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                  {canModify && (
                                    <>
                                      <button
                                        onClick={() => handleStartEditFamily(fam)}
                                        className={`hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded transition border border-slate-200 cursor-pointer ${isReadingMode ? "p-2" : "p-1"}`}
                                        title="تعديل بيانات الأسرة"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      {isSuperAdmin && (
                                        <button
                                          onClick={() => handleDeleteFamily(fam.id, fam.headName)}
                                          className={`hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition border border-transparent hover:border-rose-100 cursor-pointer ${isReadingMode ? "p-2" : "p-1"}`}
                                          title="حذف الأسرة كاملة"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Dependents sub-table */}
                            {isExpanded && (
                              <tr className="bg-slate-50/50">
                                <td colSpan={15} className="px-6 py-4 border-t border-b border-slate-150">
                                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden p-4 space-y-3">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                      <div>
                                        <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                                          <Users className="w-4 h-4 text-emerald-600" />
                                          <span>قائمة التابعين لأسرة: [ {fam.headName} {fam.title} ]</span>
                                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                            كود الأسرة: {fam.familyCode}
                                          </span>
                                        </h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          عدد التابعين المسجلين: <strong className="text-slate-800">{familyDeps.length} فرد</strong> | محلة الإقامة: <strong className="text-slate-800">{fam.residency}</strong>
                                        </p>
                                      </div>
                                      {canModify && (
                                        <button
                                          onClick={() => {
                                            setSelectedFamilyCodeForDep(fam.familyCode);
                                            setIsAddDependentOpen(true);
                                          }}
                                          className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 cursor-pointer"
                                        >
                                          <UserPlus className="w-4 h-4" />
                                          <span>+ إضافة تابع لهذه الأسرة</span>
                                        </button>
                                      )}
                                    </div>

                                    {familyDeps.length === 0 ? (
                                      <div className="text-center py-6 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-2">
                                        <p className="text-xs font-bold text-slate-500">لا يوجد تابعين مسجلين لهذه الأسرة حتى الآن.</p>
                                        {canModify && (
                                          <button
                                            onClick={() => {
                                              setSelectedFamilyCodeForDep(fam.familyCode);
                                              setIsAddDependentOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                                          >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>+ إضافة أول تابع لهذه الأسرة</span>
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <table className="w-full text-right text-xs">
                                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                          <tr>
                                            <th className="px-3 py-2">الاسم واللقب</th>
                                            <th className="px-3 py-2">صلة القرابة</th>
                                            <th className="px-3 py-2 text-center">تاريخ الميلاد</th>
                                            <th className="px-3 py-2 text-center">الرقم الوطني</th>
                                            <th className="px-3 py-2">الحالة الاجتماعية</th>
                                            <th className="px-3 py-2">رقم الجوال الخاص</th>
                                            {canModify && <th className="px-3 py-2 text-center w-16">تعديل</th>}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {familyDeps.map((dep, depIdx) => {
                                            const isDepDead = isDeceasedStatus(dep.maritalStatus, dep.deathDate);
                                            return (
                                              <tr key={`famdep-${dep.id || 'noid'}-${dep.familyCode || ''}-${depIdx}`} className={`hover:bg-slate-50/50 ${isDepDead ? "bg-rose-50/20" : ""}`}>
                                                <td className={`px-3 py-2.5 font-semibold ${isDepDead ? "line-through text-slate-400" : "text-slate-700"}`}>
                                                  {canModify ? (
                                                    <button
                                                      onClick={() => handleStartEditDependent(dep)}
                                                      className={`font-bold text-right hover:underline cursor-pointer transition ${
                                                        isDepDead ? "line-through text-slate-400" : "text-blue-600 hover:text-blue-800"
                                                      }`}
                                                      title="انقر لتعديل بيانات التابع"
                                                    >
                                                      {formatDependentFullName(dep, fam)}
                                                    </button>
                                                  ) : (
                                                    <span>{formatDependentFullName(dep, fam)}</span>
                                                  )}
                                                  {isDepDead && <span className="mr-1.5 text-[8px] bg-rose-50 text-rose-600 px-1 py-0.5 rounded-full font-bold">متوفى</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-500">{dep.relation}</td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-600">{dep.birthDate}</td>
                                                <td className="px-3 py-2.5 text-center font-mono text-slate-600">{dep.nationalId || "—"}</td>
                                                <td className="px-3 py-2.5 text-slate-500">{dep.maritalStatus}</td>
                                                <td className="px-3 py-2.5 font-mono text-slate-600">{dep.phone || "—"}</td>
                                                
                                                {canModify && (
                                                  <td className="px-3 py-2.5 text-center">
                                                    <div className="flex justify-center gap-1">
                                                      <button
                                                        onClick={() => handleStartEditDependent(dep)}
                                                        className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded transition"
                                                        title="تعديل بيانات التابع"
                                                      >
                                                        <Edit2 className="w-3 h-3" />
                                                      </button>
                                                      {isSuperAdmin && (
                                                        <button
                                                          onClick={() => handleDeleteDependent(dep.id, dep.name)}
                                                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                                                          title="حذف الفرد"
                                                        >
                                                          <Trash2 className="w-3 h-3" />
                                                        </button>
                                                      )}
                                                    </div>
                                                  </td>
                                                )}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {renderPaginationBar(
                familyPage,
                totalFamilyPages,
                familyPageSize,
                setFamilyPage,
                setFamilyPageSize,
                filteredFamilies.length
              )}
            </div>
          </div>
        )}

        {/* -------------------- TAB 3: Dependents Table -------------------- */}
        {activeTab === "dependents" && (
          <div className="space-y-4">
            {/* Extended Search Dropdowns Row (Single line, color-coded) */}
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl shadow-xs">
              {renderExtendedSearchDropdowns()}
            </div>

            {/* Compact Unified Search & Filter Bar */}
            <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              <div className="relative flex-1 w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={dependentSearch}
                    onChange={(e) => setDependentSearch(e.target.value)}
                    placeholder="ابحث باسم التابع، الرقم الوطني، أو كود الأسرة..."
                    className="w-full pr-9 pl-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-slate-50 transition"
                  />
                  {dependentSearch && (
                    <button 
                      onClick={() => setDependentSearch("")}
                      className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">بحث</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                <button
                  type="button"
                  onClick={toggleReadingMode}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shrink-0 ${
                    isReadingMode 
                      ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-300" 
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                  title="تفعيل/إيقاف وضع القراءة لتكبير الخطوط وتوسيع مساحة الصفوف للشاشات الصغيرة والمناديب"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{isReadingMode ? "وضع القراءة مُفعّل 👓" : "وضع القراءة 👓"}</span>
                </button>

                <div className="text-[11px] text-slate-500 font-medium shrink-0">
                  إجمالي التابعين النشطين: <strong className="text-slate-800 font-bold">{validDependents.filter(d => d.maritalStatus !== "متوفى").length} فرد</strong>
                </div>
              </div>
            </div>

            {/* Batch Actions Toolbar for Dependents */}
            {selectedDependentIds.length > 0 && (
              <div className="bg-emerald-900 text-white p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3 border border-emerald-700 animate-fade-in sticky top-2 z-20">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-800 text-emerald-100 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-700">
                    تم تحديد {selectedDependentIds.length} من التابعين
                  </span>
                  <button
                    onClick={() => setSelectedDependentIds([])}
                    className="text-xs text-emerald-200 hover:text-white underline cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openBatchModal("dependents", "edit_title")}
                    className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-emerald-600 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل اللقب جماعياً ✏️</span>
                  </button>

                  <button
                    onClick={() => openBatchModal("dependents", "edit_residency_location")}
                    className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-emerald-600 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>تعديل الإقامة جماعياً 📍</span>
                  </button>

                  {canModify && (
                    <button
                      onClick={() => openBatchModal("dependents", "delete")}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف جماعي 🗑️</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Dependents list */}
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className={`w-full text-right transition-all ${isReadingMode ? "text-base sm:text-lg" : "text-xs"}`}>
                  <thead className={`bg-slate-50 text-slate-600 font-bold select-none border-b border-slate-200 ${isReadingMode ? "text-sm sm:text-base" : "text-[11px]"}`}>
                    <tr>
                      <th className={`w-10 text-center ${isReadingMode ? "p-4" : "px-3 py-3.5"}`}>
                        <input
                          type="checkbox"
                          checked={filteredDependents.length > 0 && filteredDependents.every((d) => selectedDependentIds.includes(d.id))}
                          onChange={toggleSelectAllDependents}
                          className={`rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer ${isReadingMode ? "w-5 h-5" : "w-4 h-4"}`}
                          title="تحديد الكل / إلغاء تحديد الكل"
                        />
                      </th>
                      <th className={`w-12 ${isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}`}>م</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}>اسم التابع بالكامل</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}>صلة القرابة</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}>الرقم الوطني</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}>تاريخ الميلاد</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}>الحالة الاجتماعية</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}>المحلة (الإقامة)</th>
                      <th className={isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}>رب الأسرة الحاضن</th>
                      <th className={`font-mono ${isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}`}>كود الأسرة</th>
                      {canModify && <th className={`text-center w-24 ${isReadingMode ? "p-4 font-black text-slate-900" : "px-4 py-3.5"}`}>إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-slate-100 ${isReadingMode ? "divide-slate-200" : ""}`}>
                    {filteredDependents.length === 0 ? (
                      <tr>
                        <td colSpan={canModify ? 11 : 10} className={`text-center text-slate-400 font-medium ${isReadingMode ? "p-8 text-lg" : "px-4 py-8 text-xs"}`}>
                          لا توجد نتائج مطابقة لفلترة البحث.
                        </td>
                      </tr>
                    ) : (
                      paginatedDependents.map((dep, index) => {
                        const hostFamily = families.find((f) => f.familyCode === dep.familyCode);
                        const isDepDead = isDeceasedStatus(dep.maritalStatus, dep.deathDate);
                        const isSelected = selectedDependentIds.includes(dep.id);
                        const fullName = formatDependentFullName(dep, hostFamily);
                        const displayIndex = (dependentPageSize > 0 ? (dependentPage - 1) * dependentPageSize : 0) + index + 1;

                        const cellClass = isReadingMode ? "px-4 py-4 sm:py-5 font-bold" : "px-4 py-3.5";

                        return (
                          <tr key={`alldep-${dep.id || 'noid'}-${index}`} className={`hover:bg-amber-50/40 transition-colors ${isSelected ? "bg-emerald-50/70" : isDepDead ? "bg-rose-50/20" : isReadingMode ? "bg-white border-b border-slate-200" : ""}`}>
                            <td className={`${cellClass} text-center`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectDependent(dep.id)}
                                className={`rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer ${isReadingMode ? "w-5 h-5" : "w-4 h-4"}`}
                              />
                            </td>
                            <td className={`${cellClass} font-mono text-slate-400`}>{displayIndex}</td>
                            <td className={`${cellClass} font-semibold ${isDepDead ? "line-through text-slate-400" : "text-slate-800"}`}>
                              {canModify ? (
                                <button
                                  onClick={() => handleStartEditDependent(dep)}
                                  className={`font-black text-right hover:underline cursor-pointer transition ${
                                    isDepDead ? "line-through text-slate-400" : "text-blue-600 hover:text-blue-800"
                                  } ${isReadingMode ? "text-lg sm:text-xl" : ""}`}
                                  title="انقر لتعديل بيانات التابع"
                                >
                                  {fullName}
                                </button>
                              ) : (
                                <span className={isReadingMode ? "text-lg sm:text-xl font-bold" : ""}>{fullName}</span>
                              )}
                              {isDepDead && <span className={`mr-1.5 bg-rose-100 text-rose-700 font-bold rounded-full inline-block ${isReadingMode ? "text-xs px-2.5 py-1" : "text-[8px] px-1.5 py-0.5"}`}>متوفى</span>}
                            </td>
                            <td className={`${cellClass} text-slate-600 font-medium`}>{dep.relation}</td>
                            <td className={`${cellClass} font-mono text-slate-600`}>{dep.nationalId || "—"}</td>
                            <td className={`${cellClass} font-mono text-slate-600`}>{dep.birthDate}</td>
                            <td className={`${cellClass} text-slate-600`}>{dep.maritalStatus}</td>
                            <td className={`${cellClass} font-bold text-emerald-700`}>{dep.residency}</td>
                            <td className={cellClass}>
                              {hostFamily ? (
                                canModify ? (
                                  <button
                                    onClick={() => handleStartEditFamily(hostFamily)}
                                    className={`font-medium text-slate-700 hover:text-emerald-700 hover:underline cursor-pointer block text-right ${isReadingMode ? "text-base font-bold" : ""}`}
                                    title="انقر لتعديل بيانات رب الأسرة"
                                  >
                                    {hostFamily.headName} {hostFamily.title}
                                  </button>
                                ) : (
                                  <span className={`font-medium text-slate-700 block ${isReadingMode ? "text-base font-bold" : ""}`}>
                                    {hostFamily.headName} {hostFamily.title}
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 italic">غير محدد</span>
                              )}
                            </td>
                            <td className={`${cellClass} text-center`}>
                              <span className={`bg-slate-100 rounded font-mono border border-slate-200 text-slate-700 font-bold inline-block ${isReadingMode ? "text-xs px-2.5 py-1" : "text-[10px] px-1.5 py-0.5"}`}>
                                {dep.familyCode}
                              </span>
                            </td>
                            
                            {/* Action controls */}
                            {canModify && (
                              <td className={`${cellClass} text-center`}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEditDependent(dep)}
                                    className={`hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded transition border border-slate-200 cursor-pointer ${isReadingMode ? "p-2" : "p-1"}`}
                                    title="تعديل بيانات التابع"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => handleDeleteDependent(dep.id, dep.name)}
                                      className={`hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition border border-transparent hover:border-rose-100 cursor-pointer ${isReadingMode ? "p-2" : "p-1"}`}
                                      title="حذف التابع نهائياً"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {renderPaginationBar(
                dependentPage,
                totalDependentPages,
                dependentPageSize,
                setDependentPage,
                setDependentPageSize,
                filteredDependents.length
              )}
            </div>
          </div>
        )}

        {/* -------------------- TAB 4: Sync & Settings Panel -------------------- */}
        {activeTab === "sync" && (
          <SyncSettingsPanel
            googleScriptUrl={googleScriptUrl}
            onSaveUrl={handleSaveGoogleUrl}
            onSync={handleSync}
            onSyncTitles={handleSyncTitles}
            syncLog={syncLog}
            familiesCount={families.length}
            dependentsCount={validDependents.length}
            families={families}
            dependents={validDependents}
          />
        )}

        {/* -------------------- TAB 5: User Management & Permissions (Super Admin) -------------------- */}
        {activeTab === "users" && isSuperAdmin && (
          <SuperAdminPermissionsPanel
            users={usersList}
            currentUser={currentUser}
            onUpdatePermissions={handleUpdatePermissions}
            onResetUserPassword={handleResetUserPassword}
            resetRequests={passwordResetRequests}
            onResolveResetRequest={handleResolveResetRequest}
            onDeleteResetRequest={handleDeleteResetRequest}
            onOpenAddUser={() => setIsAddingUser(true)}
            onDeleteUser={(un) => handleDeleteUser(un, un)}
            onUpdateUserFullInfo={handleUpdateUserFullInfo}
          />
        )}

        {/* -------------------- TAB 6: User Profile & Password -------------------- */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <UserIcon className="w-6 h-6 text-indigo-600" />
                <span>الملف الشخصي والإعدادات</span>
              </h2>
              <p className="text-xs text-slate-500">إدارة معلومات حسابك الشخصي وكلمة المرور</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">{currentUser.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{currentUser.username} • {
                      currentUser.role === "admin" ? "مدير عام" : "مندوب تعداد"
                    }</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-4 border-r-4 border-indigo-600 pr-3">تغيير كلمة المرور</h4>
                <form onSubmit={handleProfilePasswordChange} className="space-y-4">
                  {profileError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600">كلمة المرور الحالية</label>
                      <input 
                        type="password"
                        required
                        value={profilePassForm.currentPassword}
                        onChange={(e) => setProfilePassForm({...profilePassForm, currentPassword: e.target.value})}
                        className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-600">كلمة المرور الجديدة</label>
                        <input 
                          type="password"
                          required
                          value={profilePassForm.newPassword}
                          onChange={(e) => setProfilePassForm({...profilePassForm, newPassword: e.target.value})}
                          className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-600">تأكيد كلمة المرور الجديدة</label>
                        <input 
                          type="password"
                          required
                          value={profilePassForm.confirmPassword}
                          onChange={(e) => setProfilePassForm({...profilePassForm, confirmPassword: e.target.value})}
                          className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    تحديث كلمة المرور
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TAB 7: Schema Management (Super Admin) -------------------- */}
        {activeTab === "schema" && isSuperAdmin && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Settings className="w-6 h-6 text-indigo-600" />
                  <span>إدارة القوائم والحقول</span>
                </h2>
                <p className="text-xs text-slate-500">تعديل المحلات والألقاب والخيارات المنسدلة في النظام</p>
              </div>
              <button 
                onClick={handleUpdateSchema}
                disabled={isUpdatingSchema}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {isUpdatingSchema ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ التعديلات النهائية</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Neighborhoods Management */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">إدارة المحلات السكنية</h3>
                  <button 
                    onClick={() => {
                      const name = prompt("أدخل اسم المحلة الجديدة:");
                      if (name) setSchemaNeighborhoods([...schemaNeighborhoods, name.trim()]);
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition"
                  >
                    + إضافة محلة
                  </button>
                </div>
                <div className="p-4 h-[300px] overflow-y-auto space-y-2">
                  {schemaNeighborhoods.map((hood, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <input 
                        className="flex-grow px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                        value={hood}
                        onChange={(e) => {
                          const newList = [...schemaNeighborhoods];
                          newList[idx] = e.target.value;
                          setSchemaNeighborhoods(newList);
                        }}
                      />
                      <button 
                        onClick={() => setSchemaNeighborhoods(schemaNeighborhoods.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Titles Management */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">إدارة الألقاب</h3>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{schemaTitles.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button"
                      onClick={handleSyncTitles}
                      className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                      title="استخراج وتحديث كافة الألقاب وأسماء العائلات من جدول جوجل تلقائياً"
                    >
                      <span>🔄 جلب ومزامنة من جوجل</span>
                    </button>
                    <button 
                      onClick={() => {
                        const name = prompt("أدخل اللقب الجديد:");
                        if (name) setSchemaTitles([...schemaTitles, name.trim()]);
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition"
                    >
                      + إضافة لقب
                    </button>
                  </div>
                </div>
                <div className="p-4 h-[300px] overflow-y-auto space-y-2">
                  {schemaTitles.map((title, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <input 
                        className="flex-grow px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                        value={title}
                        onChange={(e) => {
                          const newList = [...schemaTitles];
                          newList[idx] = e.target.value;
                          setSchemaTitles(newList);
                        }}
                      />
                      <button 
                        onClick={() => setSchemaTitles(schemaTitles.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marital Statuses */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">الحالات الاجتماعية</h3>
                </div>
                <div className="p-4 space-y-2">
                  {schemaMaritalStatuses.map((status, idx) => (
                    <input 
                      key={idx}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                      value={status}
                      onChange={(e) => {
                        const newList = [...schemaMaritalStatuses];
                        newList[idx] = e.target.value;
                        setSchemaMaritalStatuses(newList);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Health Statuses */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">الحالات الصحية</h3>
                </div>
                <div className="p-4 space-y-2">
                  {schemaHealthStatuses.map((status, idx) => (
                    <input 
                      key={idx}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
                      value={status}
                      onChange={(e) => {
                        const newList = [...schemaHealthStatuses];
                        newList[idx] = e.target.value;
                        setSchemaHealthStatuses(newList);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) as any}

      </main>
    </div>

      {/* -------------------- INLINE EDIT MODAL: Family -------------------- */}
      {editingFamily && (() => {
        const headWords = editingFamily.headName.trim().split(/\s+/).filter(Boolean);
        const isHeadNameInvalid = headWords.length < 3;
        const isFormInvalid = isHeadNameInvalid;

        const isOutsideVillage = editingFamily.residency === "خارج القرية";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-2xl my-auto rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100 overflow-hidden max-h-[90vh]" dir="rtl">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 bg-slate-900 text-white shrink-0">
                <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  <span>تعديل بيانات الأسرة (كود: {editingFamily.familyCode})</span>
                </h3>
                <button onClick={() => setEditingFamily(null)} className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="edit-family-form" onSubmit={handleUpdateFamily} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 pb-24 sm:pb-32">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600">اسم رب الأسرة (ثلاثي أو رباعي على الأقل) *</label>
                    <input
                      type="text"
                      required
                      value={editingFamily.headName}
                      onChange={(e) => setEditingFamily({ ...editingFamily, headName: e.target.value })}
                      placeholder="مثال: حلمي عبدالكريم علي الخطيب"
                      className={`px-3 py-2 border rounded-lg outline-none transition text-xs bg-white ${
                        isHeadNameInvalid 
                          ? "border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500" 
                          : "border-slate-200 focus:border-emerald-500"
                      }`}
                    />
                    {isHeadNameInvalid && (
                      <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>⚠️ يجب إدخال اسم رب الأسرة ثلاثياً أو رباعياً على الأقل</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">اللقب الأساسي (العمود I)</label>
                    <select
                      value={editingFamily.title}
                      onChange={(e) => setEditingFamily({ ...editingFamily, title: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white"
                    >
                      {schemaTitles.map((t, idx) => (
                        <option key={`${t}-${idx}`} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">اللقب الفرعي / الشهرة (اختياري)</label>
                    <input
                      type="text"
                      value={editingFamily.subTitle || ""}
                      onChange={(e) => setEditingFamily({ ...editingFamily, subTitle: e.target.value })}
                      placeholder="مثال: حاجب، عثمان..."
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-slate-400" />
                      <span>المحلة السكنية (بالقرية) *</span>
                    </label>
                    <select
                      value={editingFamily.neighborhood}
                      onChange={(e) => setEditingFamily({ ...editingFamily, neighborhood: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white font-bold text-slate-800"
                    >
                      {schemaNeighborhoods.map((hood, idx) => (
                        <option key={`${hood}-${idx}`} value={hood}>{hood}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>مقر الإقامة الحالية *</span>
                    </label>
                    <select
                      value={editingFamily.residency || editingFamily.neighborhood}
                      onChange={(e) => setEditingFamily({ ...editingFamily, residency: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white font-bold text-slate-800"
                    >
                      {NEIGHBORHOODS.map((res, idx) => (
                        <option key={`res-${res}-${idx}`} value={res}>{res}</option>
                      ))}
                    </select>
                  </div>

                  {/* Outside village residency controls */}
                  {isOutsideVillage && (
                    <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 sm:col-span-2 space-y-3">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <span>تفاصيل مكان الإقامة خارج القرية (المحافظة / المديرية / المدينة)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-slate-600">المحافظة / المنطقة</label>
                          <select
                            value={editFamGov}
                            onChange={(e) => setEditFamGov(e.target.value)}
                            className="px-3 py-2 border border-amber-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white"
                          >
                            {YEMEN_GOVERNORATES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-slate-600">المديرية / المنطقة بالتفصيل</label>
                          <input
                            type="text"
                            value={editFamOutsideLoc}
                            onChange={(e) => setEditFamOutsideLoc(e.target.value)}
                            placeholder="مثال: حي المسبح - الشارع العام"
                            className="px-3 py-2 border border-amber-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">رقم الجوال الرئيسي</label>
                    <input
                      type="text"
                      value={editingFamily.phone}
                      onChange={(e) => setEditingFamily({ ...editingFamily, phone: e.target.value })}
                      placeholder="771787747"
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">رقم هاتف إضافي / جوال آخر</label>
                    <input
                      type="text"
                      value={editingFamily.secondaryPhone || ""}
                      onChange={(e) => setEditingFamily({ ...editingFamily, secondaryPhone: e.target.value })}
                      placeholder="770000000 (اختياري)"
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">الحالة الاجتماعية</label>
                    <select
                      value={editingFamily.maritalStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isDeadVal = val.includes("متوفي") || val.includes("متوفى");
                        setEditingFamily({
                          ...editingFamily,
                          maritalStatus: val,
                          ...(isDeadVal ? { healthStatus: "متوفى" } : {})
                        });
                      }}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white"
                    >
                      {schemaMaritalStatuses.map((status, idx) => (
                        <option key={`${status}-${idx}`} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">الجنس</label>
                    <select
                      value={editingFamily.gender || "ذكر"}
                      onChange={(e) => setEditingFamily({ ...editingFamily, gender: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white"
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span>المؤهل العلمي / الدراسي</span>
                    </label>
                    <select
                      value={editingFamily.qualification || "ثانوي"}
                      onChange={(e) => setEditingFamily({ ...editingFamily, qualification: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white font-medium"
                    >
                      {QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      <span>الحالة الصحية (اختياري)</span>
                    </label>
                    <select
                      value={editingFamily.healthStatus || "سليم / جيدة"}
                      onChange={(e) => setEditingFamily({ ...editingFamily, healthStatus: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white font-medium"
                    >
                      {HEALTH_STATUSES.map((hs) => (
                        <option key={hs} value={hs}>{hs}</option>
                      ))}
                    </select>
                  </div>

                  {/* Link / Button to directly open add dependent for this family */}
                  <div className="sm:col-span-2 bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-emerald-100 text-emerald-800 p-2 rounded-lg">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-950">إضافة فرد / تابع جديد لهذه الأسرة</p>
                        <p className="text-[11px] text-emerald-700">ربط مباشر بكود الأسرة ({editingFamily.familyCode})</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const code = editingFamily.familyCode;
                        setEditingFamily(null);
                        setSelectedFamilyCodeForDep(code);
                        setIsAddDependentOpen(true);
                      }}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ إضافة فرد جديد</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">تاريخ الميلاد *</label>
                    <input
                      type="date"
                      required
                      value={editingFamily.birthDate || ""}
                      onChange={(e) => setEditingFamily({ ...editingFamily, birthDate: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white text-right font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">تاريخ الزواج</label>
                    <input
                      type="date"
                      value={editingFamily.marriageDate || ""}
                      onChange={(e) => setEditingFamily({ ...editingFamily, marriageDate: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white text-right font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600">تاريخ الوفاة</label>
                    <input
                      type="date"
                      value={editingFamily.deathDate || ""}
                      onChange={(e) => setEditingFamily({ ...editingFamily, deathDate: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-xs bg-white text-right font-mono"
                    />
                  </div>
                </div>
              </form>

              {/* Sticky Footer */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-lg">
                <button
                  type="button"
                  onClick={() => setEditingFamily(null)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  form="edit-family-form"
                  disabled={isFormInvalid}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  <span>حفظ وتحديث بيانات الأسرة 💾</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* -------------------- INLINE EDIT MODAL: Dependent -------------------- */}
      {editingDependent && (() => {
        const hostFam = families.find(f => f.familyCode === editingDependent.familyCode);
        const rawTrimmed = editingDependent.name.trim();
        const cleanedDepName = extractIndividualName(rawTrimmed, hostFam?.headName, hostFam?.title || editingDependent.title);

        let isDepDuplicate = false;
        if (cleanedDepName) {
          if (hostFam && hostFam.headName) {
            const hostHeadWords = hostFam.headName.trim().split(/\s+/).filter(Boolean);
            if (hostHeadWords[0] && hostHeadWords[0].toLowerCase() === cleanedDepName.toLowerCase()) {
              isDepDuplicate = true;
            }
          }
          if (!isDepDuplicate) {
            const otherDeps = dependents.filter(d => d.familyCode === editingDependent.familyCode && d.id !== editingDependent.id);
            if (otherDeps.some(d => d.name && extractIndividualName(d.name, hostFam?.headName, hostFam?.title).toLowerCase() === cleanedDepName.toLowerCase())) {
              isDepDuplicate = true;
            }
          }
        }

        const isFormInvalid = !rawTrimmed || isDepDuplicate;
        const isOutsideVillage = editingDependent.residency === "خارج القرية";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white w-full max-w-xl my-auto rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100 overflow-hidden max-h-[90vh]" dir="rtl">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 bg-slate-900 text-white shrink-0">
                <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  <span>تعديل بيانات الفرد / التابع (كود الأسرة: {editingDependent.familyCode})</span>
                </h3>
                <button onClick={() => setEditingDependent(null)} className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="edit-dependent-form" onSubmit={handleUpdateDependent} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 pb-24 sm:pb-32">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600">اسم الفرد / التابع (الاسم الأول فقط) *</label>
                    <input
                      type="text"
                      required
                      value={editingDependent.name}
                      onChange={(e) => setEditingDependent({ ...editingDependent, name: e.target.value })}
                      placeholder="مثال: حلمي"
                      className={`px-3 py-2 border rounded-lg outline-none transition text-xs bg-white ${
                        isDepDuplicate
                          ? "border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500"
                          : "border-slate-200 focus:border-blue-500"
                      }`}
                    />
                    {isDepDuplicate && (
                      <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>⚠️ هذا الاسم مستخدم سابقاً داخل نفس العائلة!</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">اللقب الأساسي (العمود I)</label>
                    <select
                      value={editingDependent.title || hostFam?.title || "بدون لقب"}
                      onChange={(e) => setEditingDependent({ ...editingDependent, title: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white"
                    >
                      {schemaTitles.map((t, idx) => (
                        <option key={`deptitle-${t}-${idx}`} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">اللقب الفرعي / الشهرة (اختياري)</label>
                    <input
                      type="text"
                      value={editingDependent.subTitle || ""}
                      onChange={(e) => setEditingDependent({ ...editingDependent, subTitle: e.target.value })}
                      placeholder="مثال: حاجب، عثمان..."
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">صلة القرابة *</label>
                    <select
                      value={editingDependent.relation}
                      onChange={(e) => setEditingDependent({ ...editingDependent, relation: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white"
                    >
                      {RELATIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Residency and Location logic for dependent */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600">محلة الإقامة (مستقلة أو حسب الأسرة) *</label>
                    <select
                      value={editingDependent.residency || "حسب إقامة الأسرة (تلقائياً)"}
                      onChange={(e) => setEditingDependent({ ...editingDependent, residency: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white font-bold text-slate-800"
                    >
                      <option value="حسب إقامة الأسرة (تلقائياً)">حسب إقامة الأسرة (تلقائياً)</option>
                      {schemaNeighborhoods.map((hood, idx) => (
                        <option key={`${hood}-${idx}`} value={hood}>{hood}</option>
                      ))}
                    </select>
                  </div>

                  {/* Outside village residency details for dependent */}
                  {isOutsideVillage && (
                    <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 sm:col-span-2 space-y-3">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <span>تفاصيل مكان إقامة الفرد خارج القرية</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-slate-600">المحافظة / المنطقة</label>
                          <select
                            value={editDepGov}
                            onChange={(e) => setEditDepGov(e.target.value)}
                            className="px-3 py-2 border border-amber-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white"
                          >
                            {YEMEN_GOVERNORATES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-slate-600">المديرية / التفاصيل</label>
                          <input
                            type="text"
                            value={editDepOutsideLoc}
                            onChange={(e) => setEditDepOutsideLoc(e.target.value)}
                            placeholder="مثال: تعز - حي المسبح"
                            className="px-3 py-2 border border-amber-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">الرقم الوطني</label>
                    <input
                      type="text"
                      value={editingDependent.nationalId || ""}
                      onChange={(e) => setEditingDependent({ ...editingDependent, nationalId: e.target.value })}
                      placeholder="1010000000"
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">الجنس</label>
                    <select
                      value={editingDependent.gender || "ذكر"}
                      onChange={(e) => setEditingDependent({ ...editingDependent, gender: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white"
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span>المؤهل العلمي / الدراسي</span>
                    </label>
                    <select
                      value={editingDependent.qualification || "أُمّي / بدون مؤهل"}
                      onChange={(e) => setEditingDependent({ ...editingDependent, qualification: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white font-medium text-slate-800"
                    >
                      {QUALIFICATIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      <span>الحالة الصحية (اختياري)</span>
                    </label>
                    <select
                      value={editingDependent.healthStatus || "سليم / جيدة"}
                      onChange={(e) => setEditingDependent({ ...editingDependent, healthStatus: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white font-medium text-slate-800"
                    >
                      {HEALTH_STATUSES.map((hs) => (
                        <option key={hs} value={hs}>{hs}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">تاريخ الميلاد *</label>
                    <input
                      type="date"
                      required
                      value={editingDependent.birthDate || ""}
                      onChange={(e) => setEditingDependent({ ...editingDependent, birthDate: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white text-right font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">تاريخ الزواج</label>
                    <input
                      type="date"
                      value={editingDependent.marriageDate || ""}
                      onChange={(e) => setEditingDependent({ ...editingDependent, marriageDate: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white text-right font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">الحالة الاجتماعية</label>
                    <select
                      value={editingDependent.maritalStatus || "أعزب/عزباء"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isDeadVal = val.includes("متوفي") || val.includes("متوفى");
                        setEditingDependent({
                          ...editingDependent,
                          maritalStatus: val,
                          ...(isDeadVal ? { healthStatus: "متوفى" } : {})
                        });
                      }}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white"
                    >
                      {schemaMaritalStatuses.map((status, idx) => (
                        <option key={`${status}-${idx}`} value={status}>{status}</option>
                      ))}
                      <option value="متوفى">متوفى</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">تاريخ الوفاة (في حال المتوفى)</label>
                    <input
                      type="date"
                      value={editingDependent.deathDate || ""}
                      onChange={(e) => setEditingDependent({ ...editingDependent, deathDate: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white text-right font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">رقم الهاتف الخاص</label>
                    <input
                      type="text"
                      value={editingDependent.phone || ""}
                      onChange={(e) => setEditingDependent({ ...editingDependent, phone: e.target.value })}
                      placeholder="771787747"
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">رقم هاتف إضافي / جوال آخر</label>
                    <input
                      type="text"
                      value={editingDependent.secondaryPhone || ""}
                      onChange={(e) => setEditingDependent({ ...editingDependent, secondaryPhone: e.target.value })}
                      placeholder="770000000 (اختياري)"
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </form>

              {/* Sticky Footer */}
              <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-lg">
                <button
                  type="button"
                  onClick={() => setEditingDependent(null)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  form="edit-dependent-form"
                  disabled={isFormInvalid}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  <span>حفظ وتحديث بيانات الفرد 💾</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* -------------------- MAIN DIALOG MODALS -------------------- */}

      {/* 1. Add Family modal */}
      <AddFamilyModal
        isOpen={isAddFamilyOpen}
        onClose={() => setIsAddFamilyOpen(false)}
        onSave={handleSaveFamily}
        nextFamilyId={nextFamilyId}
        neighborhoods={schemaNeighborhoods}
        titles={schemaTitles}
        maritalStatuses={schemaMaritalStatuses}
      />

      {/* 2. Add Dependent modal */}
      <AddDependentModal
        isOpen={isAddDependentOpen}
        onClose={() => setIsAddDependentOpen(false)}
        onSave={handleSaveDependent}
        families={families}
        titles={schemaTitles}
        maritalStatuses={schemaMaritalStatuses}
        initialFamilyCode={selectedFamilyCodeForDep}
      />

      {/* 3. Transfer Individual modal */}
      <TransferIndividualModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSave={handleTransferIndividual}
        families={families}
        dependents={dependents}
      />

      {/* 4. Births & Deaths registration modal */}
      <BirthDeathModal
        isOpen={isBirthDeathOpen}
        onClose={() => setIsBirthDeathOpen(false)}
        onSaveBirth={handleSaveBirth}
        onSaveDeath={handleSaveDeath}
        families={families}
        dependents={dependents}
        titles={schemaTitles}
      />

      {/* 5. Add User Modal (Admin) */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100 overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4.5 bg-indigo-900 text-white">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>إضافة مندوب تعداد جديد</span>
              </h3>
              <button onClick={() => setIsAddingUser(false)} className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {userError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600">الاسم الكامل *</label>
                  <input 
                    type="text" required
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                    placeholder="مثال: حلمي الخطيب"
                    className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">اسم المستخدم *</label>
                    <input 
                      type="text" required
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})}
                      placeholder="username"
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">كلمة المرور *</label>
                    <input 
                      type="password" required
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">البريد الإلكتروني</label>
                    <input 
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                      placeholder="example@gmail.com"
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">رقم الهاتف</label>
                    <input 
                      type="text"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})}
                      placeholder="771787747"
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600">نوع الصلاحية *</label>
                  <select 
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value as Role})}
                    className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white"
                  >
                    <option value="collector">مندوب ميداني (ENUMERATOR)</option>
                    <option value="admin">مدير عام (SUPER ADMIN)</option>
                    <option value="viewer">مراقب عام (VIEWER)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition">
                  حفظ الحساب الجديد
                </button>
                <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit User Modal (Admin) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100 overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4.5 bg-indigo-900 text-white">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                <span>تعديل بيانات الحساب: {editingUser.username}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {userError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600">الاسم الكامل *</label>
                  <input 
                    type="text" required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">البريد الإلكتروني</label>
                    <input 
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">رقم الهاتف</label>
                    <input 
                      type="text"
                      value={editingUser.phone}
                      onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                      className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600">كلمة المرور (اتركها فارغة لعدم التغيير)</label>
                  <input 
                    type="password"
                    placeholder="كلمة مرور جديدة..."
                    onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                    className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600">نوع الصلاحية *</label>
                  <select 
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value as Role})}
                    className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs bg-white"
                  >
                    <option value="collector">مندوب ميداني (ENUMERATOR)</option>
                    <option value="admin">مدير عام (SUPER ADMIN)</option>
                    <option value="viewer">مراقب عام (VIEWER)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition">
                  تحديث البيانات
                </button>
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-xl text-xs transition">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Batch Operations Modal */}
      {batchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col text-right border border-slate-100 overflow-hidden" dir="rtl">
            <div className={`flex items-center justify-between px-6 py-4 text-white ${
              batchModal.action === "delete" ? "bg-rose-900" : "bg-indigo-900"
            }`}>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                {batchModal.action === "edit_title" && <Edit2 className="w-5 h-5 text-indigo-300" />}
                {batchModal.action === "edit_neighborhood" && <Home className="w-5 h-5 text-indigo-300" />}
                {batchModal.action === "edit_residency_location" && <MapPin className="w-5 h-5 text-indigo-300" />}
                {batchModal.action === "edit_gender" && <Users className="w-5 h-5 text-indigo-300" />}
                {batchModal.action === "delete" && <Trash2 className="w-5 h-5 text-rose-300" />}
                <span>
                  {batchModal.action === "edit_title" && `تعديل اللقب جماعياً (${batchModal.target === "families" ? selectedFamilyIds.length + " أسرة" : selectedDependentIds.length + " تابع"})`}
                  {batchModal.action === "edit_neighborhood" && `تعديل المحلة ونقل جماعي (${batchModal.target === "families" ? selectedFamilyIds.length + " أسرة" : selectedDependentIds.length + " تابع"})`}
                  {batchModal.action === "edit_residency_location" && `تعديل الإقامة ومكان الإقامة (${batchModal.target === "families" ? selectedFamilyIds.length + " أسرة" : selectedDependentIds.length + " تابع"})`}
                  {batchModal.action === "edit_gender" && `تعديل الجنس جماعياً (${batchModal.target === "families" ? selectedFamilyIds.length + " أسرة" : selectedDependentIds.length + " تابع"})`}
                  {batchModal.action === "delete" && `تأكيد الحذف الجماعي (${batchModal.target === "families" ? selectedFamilyIds.length + " أسرة" : selectedDependentIds.length + " تابع"})`}
                </span>
              </h3>
              <button
                onClick={() => setBatchModal(null)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Batch Title Edit */}
              {batchModal.action === "edit_title" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">اللقب الجديد المراد تطبيقه على العناصر المحددة:</label>
                    <select
                      value={batchTitle}
                      onChange={(e) => setBatchTitle(e.target.value)}
                      className="px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs bg-slate-50 font-semibold"
                    >
                      {schemaTitles.length > 0 ? (
                        schemaTitles.map((t) => <option key={t} value={t}>{t}</option>)
                      ) : (
                        TITLES.map((t) => <option key={t} value={t}>{t}</option>)
                      )}
                    </select>
                  </div>

                  {batchModal.target === "families" && (
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <input
                        type="checkbox"
                        checked={updateDependentsTitle}
                        onChange={(e) => setUpdateDependentsTitle(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span>تحديث اللقب لجميع التابعين المندرجين تحت هذه الأسر أيضاً</span>
                    </label>
                  )}
                </div>
              )}

              {/* Batch Neighborhood Edit */}
              {batchModal.action === "edit_neighborhood" && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">اختر المحلة الجديدة المستهدفة (من قائمة المحلات المعتمدة):</label>
                    <select
                      value={batchNeighborhood}
                      onChange={(e) => setBatchNeighborhood(e.target.value)}
                      className="px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs bg-slate-50 font-bold text-slate-800"
                    >
                      {NEIGHBORHOODS.map((hood) => (
                        <option key={hood} value={hood}>{hood}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200">
                    💡 <strong>ملاحظة:</strong> عند تغيير المحلة، سيتم تحديث حقل المحلة وحقل الإقامة (Column F) لجميع الأسر المحددة وكذلك التابعين لهم تلقائياً.
                  </p>
                </div>
              )}

              {/* Batch Residency & Location Edit */}
              {batchModal.action === "edit_residency_location" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700">حقل الإقامة الرئيسي (Column F):</label>
                    <select
                      value={batchResidency}
                      onChange={(e) => handleBatchResidencySelect(e.target.value)}
                      className="px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs bg-slate-50 font-bold text-slate-800"
                    >
                      {NEIGHBORHOODS.map((hood) => (
                        <option key={hood} value={hood}>{hood}</option>
                      ))}
                    </select>
                  </div>

                  {batchResidency === "خارج القرية" ? (
                    <div className="space-y-3 p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 animate-fade-in">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-indigo-950">
                          حقل مكان الإقامة التفصيلي (Column G) - اختيار المحافظة:
                        </label>
                        <select
                          value={batchLocation}
                          onChange={(e) => setBatchLocation(e.target.value)}
                          className="px-3 py-2.5 border border-indigo-200 rounded-xl outline-none focus:border-indigo-600 text-xs bg-white font-bold text-indigo-900 shadow-xs"
                        >
                          {YEMEN_GOVERNORATES.map((gov) => (
                            <option key={gov} value={gov}>{gov}</option>
                          ))}
                        </select>
                      </div>

                      {batchLocation === "مكان آخر (إدخال يدوي)" && (
                        <div className="flex flex-col gap-1.5 animate-fade-in pt-1">
                          <label className="text-xs font-bold text-slate-800">
                            اكتب اسم المكان أو الدولة يدوياً (سيتم حفظه في العمود G):
                          </label>
                          <input
                            type="text"
                            value={customBatchLocation}
                            onChange={(e) => setCustomBatchLocation(e.target.value)}
                            placeholder="مثال: المملكة العربية السعودية، مصر، دولة الإمارات..."
                            className="px-3 py-2.5 border border-indigo-300 rounded-xl outline-none focus:border-indigo-600 text-xs bg-white font-bold text-slate-900 shadow-xs"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>حقل مكان الإقامة التفصيلي (Column G):</span>
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                          {batchResidency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        تم ضبط حقل مكان الإقامة (Column G) تلقائياً ليطابق المحلة المختارة داخل القرية ({batchResidency}) بدقة دون الحاجة لإعادة كتابته.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Batch Gender Edit */}
              {batchModal.action === "edit_gender" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">الجنس المراد تعيينه للمحددين:</label>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setBatchGender("ذكر")}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition ${
                        batchGender === "ذكر"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>ذكر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBatchGender("أنثى")}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer transition ${
                        batchGender === "أنثى"
                          ? "bg-pink-600 text-white border-pink-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>أنثى</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Batch Delete Confirmation */}
              {batchModal.action === "delete" && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-900">
                  <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه</span>
                  </div>
                  <p className="text-xs leading-relaxed text-rose-800">
                    أنت على وشك حذف <strong>{batchModal.target === "families" ? `${selectedFamilyIds.length} أسرة` : `${selectedDependentIds.length} تابع`}</strong> نهائياً من النظام.
                    {batchModal.target === "families" && " سيتم حذف كافة التابعين المرتبطين بهذه الأسر تلقائياً وتحديث الشيت."}
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isBatchExecuting}
                  onClick={handleExecuteBatchAction}
                  className={`flex-1 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer text-white ${
                    batchModal.action === "delete"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isBatchExecuting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري المعالجة والمزامنة...</span>
                    </>
                  ) : (
                    <span>{batchModal.action === "delete" ? "نعم، تأكيد الحذف النهائي" : "تطبيق التعديل الجماعي والمزامنة"}</span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isBatchExecuting}
                  onClick={() => setBatchModal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Export Modal */}
      <AdvancedExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        families={families}
        dependents={dependents}
      />

      {/* Automatic Missing Records Auditor Modal */}
      <IncompleteRecordsModal
        isOpen={isIncompleteRecordsOpen}
        onClose={() => setIsIncompleteRecordsOpen(false)}
        families={families}
        dependents={dependents}
        onEditFamily={(family) => {
          setIsIncompleteRecordsOpen(false);
          handleStartEditFamily(family);
        }}
        onEditDependent={(dep) => {
          setIsIncompleteRecordsOpen(false);
          handleStartEditDependent(dep);
        }}
      />
    </div>
  );
}
