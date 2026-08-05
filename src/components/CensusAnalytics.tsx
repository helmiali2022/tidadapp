import { ReactNode } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Family, Dependent } from "../types";
import { NEIGHBORHOODS, VALID_NEIGHBORHOODS, isDeceasedStatus } from "../data";
import { Users, Home, UserCheck, Heart, Landmark, Award, GraduationCap, Bookmark, BarChart3, Filter } from "lucide-react";

interface CensusAnalyticsProps {
  families: Family[];
  dependents: Dependent[];
  neighborhoods: string[];
}

const cleanString = (str: any): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .normalize("NFC") // توحيد ترميز اليونيكود للأحرف العربية
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "") // إزالة المسافات الخفية والرموز البرمجية
    .trim();
};

export default function CensusAnalytics({ families, dependents, neighborhoods }: CensusAnalyticsProps) {
  // Unified Clean Dependents Array
  const validDependents = dependents.filter((d) => d.name && d.name.trim() !== '' && d.familyCode);

  // 1. Calculations
  const totalFamilies = families.length;
  
  // Total living family heads (those not deceased)
  const livingHeads = families.filter((f) => !isDeceasedStatus(f.maritalStatus, f.deathDate));
  const totalLivingHeadsCount = livingHeads.length;
  const deadHeadsCount = families.filter((f) => isDeceasedStatus(f.maritalStatus, f.deathDate)).length;

  // Total living dependents (those not deceased)
  const livingDependents = validDependents.filter((d) => !isDeceasedStatus(d.maritalStatus, d.deathDate));
  const totalLivingDependentsCount = livingDependents.length;
  const deadDependentsCount = validDependents.filter((d) => isDeceasedStatus(d.maritalStatus, d.deathDate)).length;

  const totalLivingPopulation = livingHeads.length + livingDependents.length;
  const totalRecordedDeaths = deadHeadsCount + deadDependentsCount;

  // Genders
  const maleHeads = livingHeads.filter((f) => cleanString(f.gender) === cleanString("ذكر")).length;
  const femaleHeads = livingHeads.filter((f) => cleanString(f.gender) === cleanString("أنثى")).length;

  // Let's assume male/female ratio of dependents
  // Since some relation names give hints, let's categorize them:
  // "ابن" -> male, "زوجة" -> female, "ابنة" -> female, "أم" -> female, "أخت" -> female, "أخ" -> male, "أب" -> male
  let maleDeps = 0;
  let femaleDeps = 0;
  livingDependents.forEach((d) => {
    const rel = cleanString(d.relation);
    if (rel === "ابن" || rel === "أخ" || rel === "أب") {
      maleDeps++;
    } else if (rel === "ابنة" || rel === "زوجة" || rel === "أم" || rel === "أخت") {
      femaleDeps++;
    } else {
      // fallback
      maleDeps++;
    }
  });

  const totalMales = maleHeads + maleDeps;
  const totalFemales = femaleHeads + femaleDeps;

  // Clean string helper function
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

  const outsideCount = outsideVillageCount;
  const insideCount = totalPopulation - outsideVillageCount;

  // 2. Prepare charts data
  
  // Neighborhood population distribution based strictly on Column F (residency)
  const neighborhoodData = VALID_NEIGHBORHOODS
    .map((hood) => {
      const popInHood = getNeighborhoodCount(hood);
      const headsInHood = families.filter((f) => cleanStr(f.residency) === cleanStr(hood)).length;

      return {
        name: hood,
        "عدد السكان": popInHood,
        "العائلات": headsInHood
      };
    })
    .filter((item) => item["عدد السكان"] > 0); // Only show neighborhoods with people

  // Gender data for Pie Chart
  const genderData = [
    { name: "الذكور", value: totalMales, color: "#0ea5e9" }, // sky-500
    { name: "الإناث", value: totalFemales, color: "#f43f5e" } // rose-500
  ];

  // Age group distribution
  // Current year is 2026
  const getAge = (birthDateStr: string) => {
    if (!birthDateStr) return 0;
    const birthYear = new Date(birthDateStr).getFullYear();
    return 2026 - birthYear;
  };

  let children = 0; // 0-14
  let youth = 0;    // 15-24
  let adults = 0;   // 25-64
  let seniors = 0;  // 65+

  livingHeads.forEach((f) => {
    const age = getAge(f.birthDate);
    if (age <= 14) children++;
    else if (age <= 24) youth++;
    else if (age <= 64) adults++;
    else seniors++;
  });

  livingDependents.forEach((d) => {
    const age = getAge(d.birthDate);
    if (age <= 14) children++;
    else if (age <= 24) youth++;
    else if (age <= 64) adults++;
    else seniors++;
  });

  const ageData = [
    { name: "أطفال (0-14 سنة)", value: children, color: "#10b981" }, // emerald-500
    { name: "شباب (15-24 سنة)", value: youth, color: "#f59e0b" },    // amber-500
    { name: "بالغون (25-64 سنة)", value: adults, color: "#6366f1" },   // indigo-500
    { name: "كبار سن (65+ سنة)", value: seniors, color: "#8b5cf6" }    // purple-500
  ];

  // Title / Surname analytics calculation
  const titleCountsMap: Record<string, { families: number; members: number }> = {};

  livingHeads.forEach((f) => {
    const rawTitle = cleanStr(f.title) || "بدون لقب";
    if (!titleCountsMap[rawTitle]) {
      titleCountsMap[rawTitle] = { families: 0, members: 0 };
    }
    titleCountsMap[rawTitle].families += 1;
    titleCountsMap[rawTitle].members += Number(f.memberCount) || 1;
  });

  const titleData = Object.entries(titleCountsMap)
    .map(([titleName, stats]) => ({
      name: titleName,
      "عدد الأفراد": stats.members,
      "عدد الأسر": stats.families,
      percentage: totalLivingPopulation > 0 ? ((stats.members / totalLivingPopulation) * 100).toFixed(1) : "0"
    }))
    .sort((a, b) => b["عدد الأفراد"] - a["عدد الأفراد"]);

  // Qualification analytics calculation
  const qualMap: Record<string, number> = {};
  livingHeads.forEach((f) => {
    const q = cleanStr(f.qualification) || "غير محدد / لم يُدخل";
    qualMap[q] = (qualMap[q] || 0) + 1;
  });
  livingDependents.forEach((d) => {
    const q = cleanStr(d.qualification) || "غير محدد / لم يُدخل";
    qualMap[q] = (qualMap[q] || 0) + 1;
  });

  const qualificationData = Object.entries(qualMap)
    .map(([qName, count]) => ({
      name: qName,
      value: count,
      percentage: totalLivingPopulation > 0 ? ((count / totalLivingPopulation) * 100).toFixed(1) : "0"
    }))
    .sort((a, b) => b.value - a.value);

  const TITLE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#64748b"];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total living people */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">إجمالي السكان الأحياء</span>
            <p className="text-2xl font-black text-slate-800">{totalLivingPopulation} فرد</p>
            <div className="text-[10px] text-slate-400">
              ذكور: <span className="text-sky-500 font-bold">{totalMales}</span> | إناث: <span className="text-rose-500 font-bold">{totalFemales}</span>
            </div>
          </div>
          <div className="bg-sky-50 text-sky-600 p-3 rounded-xl border border-sky-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Families */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">إجمالي الأسر المسجلة</span>
            <p className="text-2xl font-black text-slate-800">{totalFamilies} أسرة</p>
            <p className="text-[10px] text-slate-400">معدل حجم الأسرة: <span className="font-bold text-emerald-600">{(totalLivingPopulation / (totalFamilies || 1)).toFixed(1)} فرد/أسرة</span></p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100">
            <Home className="w-6 h-6" />
          </div>
        </div>

        {/* Inside vs Outside */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">توزيع مكان الإقامة</span>
            <p className="text-xl font-bold text-slate-800">بالداخل: {insideCount} | بالخارج: {outsideCount}</p>
            <p className="text-[10px] text-slate-400">نسبة المغتربين: <span className="font-bold text-indigo-600">{((outsideCount / (totalLivingPopulation || 1)) * 100).toFixed(0)}%</span></p>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl border border-indigo-100">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Recorded Deaths */}
        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-400">إجمالي الوفيات المسجلة</span>
            <p className="text-2xl font-black text-rose-600">{totalRecordedDeaths} حالة</p>
            <p className="text-[10px] text-slate-400">رب أسرة: <span className="font-bold">{deadHeadsCount}</span> | تابع: <span className="font-bold">{deadDependentsCount}</span></p>
          </div>
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl border border-rose-100">
            <Heart className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Neighborhood Bar Chart */}
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm lg:col-span-8 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800">التوزيع السكاني والعائلات حسب المحلات المسجلة</h3>
            <p className="text-xs text-slate-400 mt-0.5">يوضح الكثافة السكانية وعدد الأسر في محلات قرية ذي الجمال النشطة</p>
          </div>

          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={neighborhoodData}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ direction: "rtl", textAlign: "right", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="عدد السكان" fill="#059669" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="العائلات" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-emerald-600 rounded-md"></span>
              <span>عدد السكان</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-sky-500 rounded-md"></span>
              <span>عدد الأسر (العائلات)</span>
            </div>
          </div>
        </div>

        {/* Side Pies */}
        <div className="lg:col-span-4 grid grid-cols-1 gap-6">
          {/* Gender Ratio */}
          <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-2">التركيب النوعي للسكان (الذكور والإناث)</h3>
            </div>
            
            <div className="h-44 w-full flex items-center justify-center" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ direction: "rtl", textAlign: "right", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {genderData.map((g) => (
                <div key={g.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }}></span>
                    <span className="font-bold text-slate-700">{g.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    {g.value} فرد ({((g.value / (totalLivingPopulation || 1)) * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Age Distribution */}
          <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-2">الهرم الديموغرافي والفئات العمرية</h3>
            </div>
            
            <div className="h-44 w-full flex items-center justify-center" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ direction: "rtl", textAlign: "right", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {ageData.map((a) => (
                <div key={a.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }}></span>
                    <span className="font-bold text-slate-700">{a.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    {a.value} فرد ({((a.value / (totalLivingPopulation || 1)) * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Title / Surname Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Title Bar Chart */}
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-600" />
                <span>إحصائيات ورسوم بيانية للألقاب والقبائل (العائلات)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">توزيع إجمالي السكان والأسر حسب الألقاب والقبائل المسجلة</p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold">
              {titleData.length} ألقاب مسجلة
            </span>
          </div>

          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={titleData}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  fontWeight="bold" 
                  tickLine={false} 
                />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ direction: "rtl", textAlign: "right", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="عدد الأفراد" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                <Bar dataKey="عدد الأسر" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-50">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-emerald-500 rounded-md"></span>
              <span>عدد الأفراد</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-blue-500 rounded-md"></span>
              <span>عدد الأسر</span>
            </div>
          </div>
        </div>

        {/* Title Breakdown List Table */}
        <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">تفاصيل وتوزيع الألقاب</h3>
              <span className="text-xs text-slate-400 font-mono">النسبة المئوية</span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {titleData.map((item, idx) => {
                const color = TITLE_COLORS[idx % TITLE_COLORS.length];
                return (
                  <div key={item.name} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                        <span className="text-slate-800">{item.name}</span>
                      </div>
                      <div className="text-slate-700 font-mono">
                        <span className="text-emerald-700 font-black">{item["عدد الأفراد"]} فرد</span>
                        <span className="text-slate-400 font-normal mx-1">({item["عدد الأسر"]} أسرة)</span>
                        <span className="text-blue-600 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded mr-1.5 font-sans font-bold">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, Math.max(5, Number(item.percentage)))}%`, 
                          backgroundColor: color 
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Qualifications Section */}
      <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm">
        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">إحصائيات المؤهلات العلمية والدراسية للسكان</h3>
              <p className="text-xs text-slate-400 mt-0.5">توزيع أرباب الأسر والتابعين حسب المؤهل العلمي والدراسي</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {qualificationData.map((q) => (
            <div key={q.name} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 truncate" title={q.name}>{q.name}</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-black text-slate-800">{q.value}</span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{q.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
