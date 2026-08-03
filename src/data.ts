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
  "مطلّق"
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

export function formatDependentFullName(dep: { name: string; title?: string; relation?: string }, family?: { headName: string; title?: string }): string {
  if (!dep || !dep.name) return "";
  const nameTrimmed = dep.name.trim();

  // If dep.name starts with "تابع " (placeholder name)
  if (nameTrimmed.startsWith("تابع ")) {
    return nameTrimmed;
  }

  if (!family) {
    const title = dep.title && dep.title !== "بدون لقب" ? ` ${dep.title}` : "";
    return `${nameTrimmed}${title}`.trim();
  }

  const titleToUse = (family.title && family.title !== "بدون لقب")
    ? family.title
    : ((dep.title && dep.title !== "بدون لقب") ? dep.title : "");

  let headClean = (family.headName || "").trim();
  if (titleToUse && headClean.endsWith(titleToUse)) {
    headClean = headClean.slice(0, headClean.length - titleToUse.length).trim();
  }

  // If dep.name is identical to headName or headClean
  if (nameTrimmed === headClean || nameTrimmed === family.headName.trim()) {
    return titleToUse && !nameTrimmed.includes(titleToUse) ? `${nameTrimmed} ${titleToUse}`.trim() : nameTrimmed;
  }

  // If dependent name already has 3 or more words or already includes headClean
  const words = nameTrimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 3 || (headClean && nameTrimmed.includes(headClean))) {
    if (titleToUse && !nameTrimmed.includes(titleToUse)) {
      return `${nameTrimmed} ${titleToUse}`.trim();
    }
    return nameTrimmed;
  }

  const titleSuffix = titleToUse ? ` ${titleToUse}` : "";

  if (dep.relation === "زوجة") {
    return `${nameTrimmed} (زوجة ${headClean})${titleSuffix}`.trim();
  }

  return `${nameTrimmed} ${headClean}${titleSuffix}`.trim();
}

