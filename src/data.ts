// Official data constants for the Census Application of Thee Al-Jamal Village

export const VALID_NEIGHBORHOODS = [
  "الأكمة",
  "البقير",
  "الدمنة",
  "الرميمية",
  "الزيلة",
  "الصفا",
  "العنين",
  "القحفة",
  "المجزع",
  "المعقرة",
  "الهقم",
  "براشة",
  "جحابر",
  "دار عبيد",
  "ذيك الشعب",
  "زعمة",
  "شارع القحيفة",
  "عبدان",
  "هوب المبرك"
];

export const NEIGHBORHOODS = [
  ...VALID_NEIGHBORHOODS,
  "خارج القرية"
];

export const TITLES = [
  "الخطيب",
  "الغرافي",
  "الجعفري",
  "المجيدي",
  "بدون لقب"
];

export const GOVERNORATES = [
  "صنعاء",
  "عدن",
  "تعز",
  "الحديدة",
  "حضرموت",
  "إب",
  "أبين",
  "البيضاء",
  "لحج",
  "مأرب",
  "شبوة",
  "الجوف",
  "المهرة",
  "المحويت",
  "ذمار",
  "حجة",
  "صعدة",
  "عمران",
  "الضالع",
  "ريمة",
  "سقطرى",
  "أمانة العاصمة"
];

export const RELATIONS = [
  "ابن",
  "ابنة",
  "زوجة",
  "أم",
  "أب",
  "أخت",
  "أخ",
  "جد",
  "جدة",
  "قريب آخر"
];

export const MARITAL_STATUSES = [
  "أعزب",
  "متزوج",
  "أرمل",
  "مطلّق",
  "متوفي / متوفاة"
];

export const QUALIFICATIONS = [
  "أُمّي / بدون مؤهل",
  "يقرأ ويكتب",
  "ابتدائي",
  "إعدادي / أساسي",
  "ثانوي",
  "دبلوم متوسط",
  "بكالوريوس / جامعي",
  "ماجستير",
  "دكتوراه",
  "دراسات أصلية / شرعية",
  "أخرى"
];

export const HEALTH_STATUSES = [
  "سليم / جيدة",
  "يعاني من مرض مزمن",
  "إعاقة / احتياجات خاصة",
  "طريح الفراش",
  "متوفى",
  "أخرى"
];

export const GOVERNORATES_WITH_CUSTOM = [
  ...GOVERNORATES,
  "إضافة مكان إقامة جديد (كتابة يدوية)"
];

export function extractIndividualName(depName: string, familyHeadName?: string, familyTitle?: string): string {
  if (!depName) return "";
  let clean = depName.trim();
  if (!clean) return "";

  if (!familyHeadName) return clean;

  const titleToUse = (familyTitle && familyTitle !== "بدون لقب") ? familyTitle.trim() : "";
  let headClean = familyHeadName.trim();

  if (titleToUse && headClean.endsWith(titleToUse)) {
    headClean = headClean.slice(0, headClean.length - titleToUse.length).trim();
  }

  // If clean includes headClean, strip headClean
  if (headClean && clean.includes(headClean)) {
    clean = clean.replace(headClean, "").trim();
  }

  // If clean includes full familyHeadName, strip it
  if (familyHeadName && clean.includes(familyHeadName.trim())) {
    clean = clean.replace(familyHeadName.trim(), "").trim();
  }

  // If clean includes titleToUse, strip titleToUse
  if (titleToUse && clean.includes(titleToUse)) {
    const titleRegex = new RegExp(`\\b${titleToUse.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g');
    clean = clean.replace(titleRegex, "").trim();
  }

  // Clean up remaining spaces
  clean = clean.replace(/\s+/g, " ").trim();

  return clean || depName.trim();
}

export function formatDependentFullName(dep: { name: string; title?: string; relation?: string }, family?: { headName: string; title?: string }): string {
  if (!dep || !dep.name) return "";
  
  const indivName = extractIndividualName(
    dep.name,
    family?.headName,
    family?.title || dep.title
  );

  if (!family || !family.headName) {
    const title = dep.title && dep.title !== "بدون لقب" ? ` ${dep.title}` : "";
    return `${indivName}${title}`.trim();
  }

  const titleToUse = (family.title && family.title !== "بدون لقب")
    ? family.title.trim()
    : ((dep.title && dep.title !== "بدون لقب") ? dep.title.trim() : "");

  let headClean = family.headName.trim();
  if (titleToUse && headClean.endsWith(titleToUse)) {
    headClean = headClean.slice(0, headClean.length - titleToUse.length).trim();
  }

  const titleSuffix = titleToUse ? ` ${titleToUse}` : "";

  return `${indivName} ${headClean}${titleSuffix}`.replace(/\s+/g, " ").trim();
}

export function isDeceasedStatus(status?: string, deathDate?: string, maritalStatus?: string): boolean {
  if (deathDate && String(deathDate).trim() !== "") return true;

  const checkVal = (val?: string) => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return s === "متوفى" || s === "متوفاة" || s === "متوفي" || s === "متوفية" || s === "متوفي / متوفاة" || s.includes("متوف");
  };

  return checkVal(status) || checkVal(maritalStatus);
}

export function isRecentBirthDate(birthDate?: string): boolean {
  if (!birthDate) return false;
  const str = String(birthDate).trim();
  let age: number | null = null;
  if (str.length === 4 && !isNaN(Number(str))) {
    age = new Date().getFullYear() - Number(str);
  } else {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      age = new Date().getFullYear() - d.getFullYear();
    }
  }
  return age !== null && age <= 2;
}

