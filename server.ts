import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface Family {
  id: number;
  headName: string;
  neighborhood: string;
  memberCount: number;
  phone: string;
  residency: string;
  location: string;
  gender: string;
  qualification?: string;
  healthStatus?: string;
  title: string;
  maritalStatus: string;
  birthDate: string;
  deathDate: string;
  marriageDate: string;
  familyCode: string;
}

interface Dependent {
  id: number;
  name: string;
  title: string;
  relation: string;
  gender?: string;
  qualification?: string;
  healthStatus?: string;
  phone: string;
  secondaryPhone?: string;
  nationalId: string;
  residency: string;
  location?: string;
  birthDate: string;
  marriageDate?: string;
  deathDate?: string;
  maritalStatus: string;
  familyCode: string;
}

const PORT = 3000;
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Initial Seed Data - Empty by default, fetched live from Google Sheets
const INITIAL_FAMILIES: Family[] = [];
const INITIAL_DEPENDENTS: Dependent[] = [];

type Role = "admin" | "collector" | "viewer";

interface UserPermissions {
  canEdit: boolean;   // صلاحية إضافة/تعديل/حذف البيانات
  canExport: boolean; // صلاحية تصدير البيانات
  canUpload: boolean; // صلاحية رفع الكشوفات والملفات
  canSync: boolean;   // صلاحية التزامن السحابي
}

interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  password?: string;
  permissions?: UserPermissions;
}

interface PasswordResetRequest {
  id: string;
  contactInfo: string;
  userName?: string;
  username?: string;
  phone?: string;
  createdAt: string;
  status: "pending" | "resolved";
}

const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  canEdit: true,
  canExport: true,
  canUpload: true,
  canSync: true
};

const DEFAULT_COLLECTOR_PERMISSIONS: UserPermissions = {
  canEdit: true,
  canExport: true,
  canUpload: true,
  canSync: false
};

const INITIAL_USERS: User[] = [
  {
    id: 1,
    username: "helmi",
    name: "حلمي علي هزاع",
    role: "admin",
    email: "helmiali2014@gmail.com",
    phone: "780555001",
    password: "123456",
    permissions: DEFAULT_ADMIN_PERMISSIONS
  },
  {
    id: 2,
    username: "helmiali",
    name: "حلمي الخطيب",
    role: "admin",
    email: "helmialkhateeb@gmail.com",
    phone: "771787747",
    password: "123456",
    permissions: DEFAULT_ADMIN_PERMISSIONS
  },
  {
    id: 3,
    username: "N77393477@Gmail.com",
    name: "الأستاذ نجيب الخطيب",
    role: "collector",
    email: "N77393477@Gmail.com",
    phone: "774703263",
    password: "123456",
    permissions: DEFAULT_COLLECTOR_PERMISSIONS
  },
  {
    id: 4,
    username: "esamalhateb1988@gmail.com",
    name: "عصام الخطيب",
    role: "collector",
    email: "esamalhateb1988@gmail.com",
    phone: "774185016",
    password: "123456",
    permissions: DEFAULT_COLLECTOR_PERMISSIONS
  }
];

interface DBStructure {
  families: Family[];
  dependents: Dependent[];
  googleScriptUrl: string;
  users?: User[];
  resetRequests?: PasswordResetRequest[];
  neighborhoods?: string[];
  titles?: string[];
  maritalStatuses?: string[];
  healthStatuses?: string[];
}

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbym5VisvcTo0rhlKPh9K-fJ8HmbPKDMgDJPDDu0UQvHwjXS7q4UioJ4phb5nVih9ZkI/exec";

const cleanString = (str: any): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .normalize("NFC") // توحيد ترميز اليونيكود للأحرف العربية
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "") // إزالة المسافات الخفية والرموز البرمجية
    .trim();
};

function parseSheetFamilies(sheetFamilies: any[]): Family[] {
  const parsed = (sheetFamilies || []).map((row: any, idx: number) => {
    const isArray = Array.isArray(row);
    if (isArray) {
      return {
        id: Number(row[0]) || (idx + 1),
        headName: cleanString(row[1]),
        neighborhood: cleanString(row[2]),
        memberCount: Number(row[3]) || 0,
        phone: cleanString(row[4]),
        residency: String(row[5] || '').trim(),
        location: String(row[6] || '').trim(),
        gender: cleanString(row[7]),
        title: cleanString(row[8]) || "بدون لقب",
        maritalStatus: cleanString(row[9]),
        birthDate: cleanString(row[10]),
        deathDate: cleanString(row[11]),
        marriageDate: cleanString(row[12]),
        familyCode: cleanString(row[13])
      };
    }

    return {
      id: Number(row.id || row["م"]) || (idx + 1),
      headName: cleanString(row.headName || row["رب الأسرة"]),
      neighborhood: cleanString(row.neighborhood || row["المحلة"]),
      memberCount: Number(row.memberCount || row["عدد الأفراد"]) || 0,
      phone: cleanString(row.phone || row["رقم الجوال"]),
      residency: String(row.residency || row["الإقامة"] || '').trim(),
      location: String(row.location || row["مكان الإقامة"] || '').trim(),
      gender: cleanString(row.gender || row["الجنس"]),
      qualification: cleanString(row.qualification || row["المؤهل"] || row["المؤهل العلمي"]),
      healthStatus: cleanString(row.healthStatus || row["الحالة الصحية"]) || "سليم / جيدة",
      title: cleanString(row.title || row["اللقب"]) || "بدون لقب",
      maritalStatus: cleanString(row.maritalStatus || row["الحالة الاجتماعية"]),
      birthDate: cleanString(row.birthDate || row["تاريخ الميلاد"]),
      deathDate: cleanString(row.deathDate || row["تاريخ الوفاة"]),
      marriageDate: cleanString(row.marriageDate || row["تاريخ الزواج"]),
      familyCode: cleanString(row.familyCode || row["كود الأسرة"])
    };
  });

  // 1. Strict Data Cleansing: filter out empty rows without a headName
  const validFamilies = parsed.filter(f => f.headName && String(f.headName).trim() !== '');

  // 2. Auto Family Code Generation (e.g., FAM-001, FAM-062)
  validFamilies.forEach((f, idx) => {
    let code = cleanString(f.familyCode);
    if (!code || code === "FAM-" || code.endsWith("-") || code.trim() === "") {
      const paddedNum = String(idx + 1).padStart(3, '0');
      f.familyCode = `FAM-${paddedNum}`;
    }
  });

  return validFamilies;
}

function parseSheetDependents(sheetDependents: any[]): Dependent[] {
  const parsed = (sheetDependents || []).map((d: any, idx: number) => {
    const isArray = Array.isArray(d);
    if (isArray) {
      return {
        id: Number(d[0]) || (idx + 10000),
        name: cleanString(d[1]),
        title: cleanString(d[2]) || "بدون لقب",
        relation: cleanString(d[3]),
        gender: cleanString(d[4]),
        phone: cleanString(d[5]),
        secondaryPhone: cleanString(d[6]),
        nationalId: cleanString(d[7]),
        residency: String(d[8] || '').trim(),
        location: String(d[9] || '').trim(),
        birthDate: cleanString(d[10]),
        marriageDate: cleanString(d[11]),
        deathDate: cleanString(d[12]),
        maritalStatus: cleanString(d[13]),
        familyCode: cleanString(d[14])
      };
    }

    return {
      id: Number(d.id || d["م"]) || (idx + 10000),
      name: cleanString(d.name || d["الاسم"]),
      title: cleanString(d.title || d["اللقب"]) || "بدون لقب",
      relation: cleanString(d.relation || d["صلة القرابة"]),
      gender: cleanString(d.gender || d["الجنس"]),
      qualification: cleanString(d.qualification || d["المؤهل"] || d["المؤهل العلمي"]),
      healthStatus: cleanString(d.healthStatus || d["الحالة الصحية"]) || "سليم / جيدة",
      phone: cleanString(d.phone || d["رقم الهاتف للفرد"] || d["رقم الهاتف"]),
      secondaryPhone: cleanString(d.secondaryPhone || d["رقم هاتف إضافي"] || d["رقم جوال إضافي"]),
      nationalId: cleanString(d.nationalId || d["الرقم الوطني"]),
      residency: String(d.residency || d["الإقامة"] || '').trim(),
      location: String(d.location || d["مكان الإقامة"] || '').trim(),
      birthDate: cleanString(d.birthDate || d["تاريخ الميلاد"]),
      marriageDate: cleanString(d.marriageDate || d["تاريخ الزواج"]),
      deathDate: cleanString(d.deathDate || d["تاريخ الوفاة"]),
      maritalStatus: cleanString(d.maritalStatus || d["الحالة الاجتماعية"]),
      familyCode: cleanString(d.familyCode || d["كود الأسرة"])
    };
  });

  return parsed.filter(d => d.name && String(d.name).trim() !== '');
}

// Helper to auto-generate placeholder dependents for families with memberCount > 1
function generatePlaceholderDependentsIfNeeded(families: Family[], existingDependents: Dependent[]): Dependent[] {
  const result: Dependent[] = [...existingDependents];
  let tempIdCounter = existingDependents.length > 0 ? Math.max(...existingDependents.map(d => d.id)) + 1000 : 10001;

  families.forEach((fam) => {
    const mCount = Number(fam.memberCount) || 1;
    // Cap at 30 to avoid generating hundreds of bogus placeholders if memberCount is bad data
    if (mCount > 1 && mCount < 100 && fam.familyCode) {
      const famDeps = result.filter(d => d.familyCode === fam.familyCode);
      const needed = Math.min(30, (mCount - 1) - famDeps.length);
      if (needed > 0) {
        for (let i = 1; i <= needed; i++) {
          const depIndex = famDeps.length + i;
          result.push({
            id: tempIdCounter++,
            name: `تابع ${depIndex} - أسرة ${fam.headName}`,
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

  return result;
}

// Function to load database from JSON file
function loadDB(): DBStructure {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialData: DBStructure = {
        families: INITIAL_FAMILIES,
        dependents: INITIAL_DEPENDENTS,
        googleScriptUrl: DEFAULT_SCRIPT_URL,
        users: INITIAL_USERS,
        neighborhoods: [
          "الأكمة", "البقير", "الدمنة", "الرميمية", "الزيلة", "الصفا", "العنين", "القحفة",
          "المجزع", "المعقرة", "الهقم", "براشة", "جحابر", "دار عبيد", "ذيك الشعب", "زعمة",
          "شارع القحيفة", "عبدان", "هوب المبرك", "خارج القرية"
        ],
        titles: ["الخطيب", "الغرافي", "الجعفري", "المجيدي", "بدون لقب"],
        maritalStatuses: ["أعزب", "متزوج", "أرمل", "مطلّق"],
        healthStatuses: ["سليم", "يعاني من مرض مزمن", "احتياجات خاصة"]
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    // Ensure googleScriptUrl is initialized to direct endpoint
    if (!parsed.googleScriptUrl) {
      parsed.googleScriptUrl = DEFAULT_SCRIPT_URL;
    }
    // Safety check to ensure empty databases get seeded properly
    if (!parsed.families || parsed.families.length === 0) {
      parsed.families = INITIAL_FAMILIES;
      parsed.dependents = INITIAL_DEPENDENTS;
    }
    // Seed users if not exists or empty
    if (!parsed.users || parsed.users.length === 0) {
      parsed.users = INITIAL_USERS;
    } else {
      // Ensure preconfigured users exist
      INITIAL_USERS.forEach(initUser => {
        const exists = parsed.users.some((u: any) => u.username.toLowerCase() === initUser.username.toLowerCase());
        if (!exists) {
          parsed.users.push(initUser);
        }
      });
    }

    // Enforce default permissions on users if missing
    parsed.users.forEach((u: User) => {
      if (!u.permissions) {
        u.permissions = u.role === "admin" ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_COLLECTOR_PERMISSIONS;
      }
    });

    if (!parsed.resetRequests) {
      parsed.resetRequests = [];
    }

    // Initialize schema lists if missing
    if (!parsed.neighborhoods) parsed.neighborhoods = [
      "الأكمة", "البقير", "الدمنة", "الرميمية", "الزيلة", "الصفا", "العنين", "القحفة",
      "المجزع", "المعقرة", "الهقم", "براشة", "جحابر", "دار عبيد", "ذيك الشعب", "زعمة",
      "شارع القحيفة", "عبدان", "هوب المبرك", "خارج القرية"
    ];
    if (!parsed.titles) parsed.titles = ["الخطيب", "الغرافي", "الجعفري", "المجيدي", "بدون لقب"];
    if (!parsed.maritalStatuses) parsed.maritalStatuses = ["أعزب", "متزوج", "أرمل", "مطلّق"];
    if (!parsed.healthStatuses) parsed.healthStatuses = ["سليم", "يعاني من مرض مزمن", "احتياجات خاصة"];

    fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf8");
    return parsed;
  } catch (err) {
    console.error("Error reading database file, returning in-memory fallback:", err);
    return {
      families: INITIAL_FAMILIES,
      dependents: INITIAL_DEPENDENTS,
      googleScriptUrl: DEFAULT_SCRIPT_URL,
      users: INITIAL_USERS,
      neighborhoods: [
        "الأكمة", "البقير", "الدمنة", "الرميمية", "الزيلة", "الصفا", "العنين", "القحفة",
        "المجزع", "المعقرة", "الهقم", "براشة", "جحابر", "دار عبيد", "ذيك الشعب", "زعمة",
        "شارع القحيفة", "عبدان", "هوب المبرك", "خارج القرية"
      ],
      titles: ["الخطيب", "الغرافي", "الجعفري", "المجيدي", "بدون لقب"],
      maritalStatuses: ["أعزب", "متزوج", "أرمل", "مطلّق"],
      healthStatuses: ["سليم", "يعاني من مرض مزمن", "احتياجات خاصة"]
    };
  }
}

// Function to save database to JSON file
function saveDB(data: DBStructure) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// Helper function to map camelCase fields into precisely ordered Arabic keys for the Sheets schema
const mapFamiliesToSheet = (fams: Family[]) => {
  return fams.map(f => ({
    "م": f.id,
    "رب الأسرة": f.headName,
    "المحلة": f.neighborhood,
    "عدد الأفراد": f.memberCount,
    "رقم الجوال": f.phone || "",
    "الإقامة": f.residency || "",
    "مكان الإقامة": f.location || "",
    "الجنس": f.gender || "",
    "المؤهل": f.qualification || "",
    "الحالة الصحية": f.healthStatus || "سليم / جيدة",
    "اللقب": f.title || "بدون لقب",
    "الحالة الاجتماعية": f.maritalStatus || "",
    "تاريخ الميلاد": f.birthDate || "",
    "تاريخ الوفاة": f.deathDate || "",
    "تاريخ الزواج": f.marriageDate || "",
    "كود الأسرة": f.familyCode || ""
  }));
};

const mapDependentsToSheet = (deps: Dependent[], fams?: Family[]) => {
  const families = fams || [];
  return deps.map(d => {
    const hostFam = families.find(f => f.familyCode === d.familyCode);
    const title = (d.title && d.title !== "بدون لقب") ? d.title : (hostFam?.title || "بدون لقب");
    const residency = (d.residency && d.residency !== "حسب إقامة الأسرة (تلقائياً)") ? d.residency : (hostFam?.residency || hostFam?.neighborhood || "");

    return {
      "م": d.id,
      "الاسم": d.name,
      "اللقب": title,
      "صلة القرابة": d.relation || "",
      "الجنس": d.gender || "",
      "المؤهل": d.qualification || "",
      "الحالة الصحية": d.healthStatus || "سليم / جيدة",
      "رقم الهاتف للفرد": d.phone || "",
      "رقم جوال إضافي": d.secondaryPhone || "",
      "الرقم الوطني": d.nationalId || "",
      "الإقامة": residency,
      "مكان الإقامة": d.location || "",
      "تاريخ الميلاد": d.birthDate || "",
      "تاريخ الزواج": d.marriageDate || "",
      "تاريخ الوفاة": d.deathDate || "",
      "الحالة الاجتماعية": d.maritalStatus || "",
      "كود الأسرة": d.familyCode || ""
    };
  });
};

function syncSingleEntity(action: string, sheetName: string, data: any) {
  const db = loadDB();
  const url = db.googleScriptUrl || DEFAULT_SCRIPT_URL;
  if (!url) return;

  const payload = {
    action,
    sheetName,
    data
  };

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(res => res.text()).then(txt => {
    console.log(`Background Google Sheets sync (${action} on ${sheetName}) response:`, txt.substring(0, 150));
  }).catch(err => {
    console.error(`Background Google Sheets sync (${action} on ${sheetName}) error:`, err);
  });
}

function triggerGoogleSync(db: DBStructure) {
  const url = db.googleScriptUrl || DEFAULT_SCRIPT_URL;
  if (!url) return;

  const payload = {
    action: "sync",
    families: mapFamiliesToSheet(db.families),
    dependents: mapDependentsToSheet(db.dependents, db.families)
  };

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(res => res.text()).then(txt => {
    console.log("Background Google Sheets sync response:", txt.substring(0, 150));
  }).catch(err => {
    console.error("Background Google Sheets sync error:", err);
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoints

  // 1. Get entire state (including automatic sync with Google Sheets if local state is default/mock)
  app.get("/api/data", async (req, res) => {
    const db = loadDB();
    if (!db.googleScriptUrl) {
      db.googleScriptUrl = DEFAULT_SCRIPT_URL;
      saveDB(db);
    }
    
    // If database contains mock/initial sample data (less than 500 families), auto pull real state from Google Sheets
    if (db.families.length < 500 && db.googleScriptUrl) {
      try {
        const response = await fetch(db.googleScriptUrl);
        const resJson = await response.json();
        if (resJson.families && resJson.families.length > 0) {
          const mappedFamilies = parseSheetFamilies(resJson.families);
          const mappedDependents = parseSheetDependents(resJson.dependents || []);
          if (mappedFamilies.length > 0) {
            db.families = mappedFamilies;
            db.dependents = mappedDependents;
            saveDB(db);
          }
        }
      } catch (e) {
        console.error("Auto fetch error on /api/data:", e);
      }
    }

    // Always enforce strict data cleansing
    db.families = db.families.filter(f => f.headName && String(f.headName).trim() !== '');

    // Always enforce family code generation
    db.families.forEach((f, idx) => {
      let code = cleanString(f.familyCode);
      if (!code || code === "FAM-" || code.endsWith("-") || code.trim() === "") {
        const paddedNum = String(idx + 1).padStart(3, '0');
        f.familyCode = `FAM-${paddedNum}`;
      }
    });

    // Auto generate placeholder dependents if missing for memberCount > 1
    const completeDependents = generatePlaceholderDependentsIfNeeded(db.families, db.dependents || []);

    res.json({
      ...db,
      families: db.families,
      dependents: completeDependents
    });
  });

  // 1b. User Login API
  app.post("/api/login", (req, res) => {
    const { loginKey, password } = req.body;
    if (!loginKey || !password) {
      return res.status(400).json({ status: "error", message: "يرجى إدخال اسم المستخدم/البريد/الهاتف وكلمة المرور" });
    }

    const db = loadDB();
    const users = db.users || INITIAL_USERS;

    // Search by username, email, or phone case-insensitively
    const user = users.find(u => 
      (u.username && u.username.toLowerCase() === loginKey.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === loginKey.toLowerCase()) ||
      (u.phone && u.phone === loginKey)
    );

    if (!user) {
      return res.status(401).json({ status: "error", message: "المستخدم غير مسجل في النظام" });
    }

    if (user.password !== password) {
      return res.status(401).json({ status: "error", message: "كلمة المرور غير صحيحة" });
    }

    // Success! Return user details without password
    const { password: _, ...safeUser } = user;
    res.json({ status: "success", user: safeUser });
  });

  // 1c. Get All Users (Super Admin panel)
  app.get("/api/users", (req, res) => {
    const db = loadDB();
    res.json({ status: "success", users: db.users || INITIAL_USERS });
  });

  // 1d. Create User
  app.post("/api/users", (req, res) => {
    const newUser: User = req.body;
    if (!newUser.username || !newUser.name || !newUser.password || !newUser.role) {
      return res.status(400).json({ status: "error", message: "يرجى تعبئة كافة الحقول المطلوبة" });
    }

    const db = loadDB();
    if (!db.users) db.users = [...INITIAL_USERS];

    // Assign unique ID
    const nextId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
    newUser.id = nextId;

    // Check uniqueness of username, email, phone
    const usernameExists = db.users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase());
    if (usernameExists) {
      return res.status(400).json({ status: "error", message: "اسم المستخدم مستخدم بالفعل" });
    }

    if (newUser.email) {
      const emailExists = db.users.some(u => u.email.toLowerCase() === newUser.email!.toLowerCase());
      if (emailExists) {
        return res.status(400).json({ status: "error", message: "البريد الإلكتروني مستخدم بالفعل" });
      }
    }

    if (newUser.phone) {
      const phoneExists = db.users.some(u => u.phone === newUser.phone);
      if (phoneExists) {
        return res.status(400).json({ status: "error", message: "رقم الهاتف مستخدم بالفعل" });
      }
    }

    db.users.push(newUser);
    saveDB(db);
    res.json({ status: "success", user: newUser });
  });

  // 1e. Update User
  app.put("/api/users/:username", (req, res) => {
    const targetUsername = req.params.username;
    const updatedFields: Partial<User> = req.body;
    const db = loadDB();
    if (!db.users) db.users = [...INITIAL_USERS];

    const index = db.users.findIndex(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ status: "error", message: "المستخدم غير موجود" });
    }

    // Check duplicate username if updated
    if (updatedFields.username && updatedFields.username.toLowerCase() !== db.users[index].username.toLowerCase()) {
      const usernameExists = db.users.some((u, i) => i !== index && u.username.toLowerCase() === updatedFields.username!.toLowerCase());
      if (usernameExists) {
        return res.status(400).json({ status: "error", message: "اسم المستخدم الجديد مستخدم لحساب آخر" });
      }
    }

    // Check duplicate email / phone if updated
    if (updatedFields.email && updatedFields.email.toLowerCase() !== db.users[index].email.toLowerCase()) {
      const emailExists = db.users.some((u, i) => i !== index && u.email.toLowerCase() === updatedFields.email!.toLowerCase());
      if (emailExists) {
        return res.status(400).json({ status: "error", message: "البريد الإلكتروني مستخدم لحساب آخر" });
      }
    }

    if (updatedFields.phone && updatedFields.phone !== db.users[index].phone) {
      const phoneExists = db.users.some((u, i) => i !== index && u.phone === updatedFields.phone);
      if (phoneExists) {
        return res.status(400).json({ status: "error", message: "رقم الهاتف مستخدم لحساب آخر" });
      }
    }

    db.users[index] = {
      ...db.users[index],
      ...updatedFields,
      username: updatedFields.username ? updatedFields.username : db.users[index].username
    };

    saveDB(db);
    res.json({ status: "success", user: db.users[index] });
  });

  // 1f. Delete User
  app.delete("/api/users/:username", (req, res) => {
    const targetUsername = req.params.username;
    const db = loadDB();
    if (!db.users) db.users = [...INITIAL_USERS];

    const index = db.users.findIndex(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ status: "error", message: "المستخدم غير موجود" });
    }

    // Prevent deleting helmi/helmiali to avoid locking out the system
    if (targetUsername.toLowerCase() === "helmi" || targetUsername.toLowerCase() === "helmiali") {
      return res.status(400).json({ status: "error", message: "لا يمكن حذف حساب المدير العام أو المشرف الفائق" });
    }

    db.users = db.users.filter(u => u.username.toLowerCase() !== targetUsername.toLowerCase());
    saveDB(db);
    res.json({ status: "success", message: "تم حذف المستخدم بنجاح" });
  });

  // 1g. Self Password Change
  app.post("/api/profile/password", (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ status: "error", message: "يرجى إدخال كافة الحقول المطلوبة" });
    }

    const db = loadDB();
    if (!db.users) db.users = [...INITIAL_USERS];

    const index = db.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ status: "error", message: "المستخدم غير موجود" });
    }

    if (db.users[index].password !== oldPassword) {
      return res.status(400).json({ status: "error", message: "كلمة المرور القديمة غير صحيحة" });
    }

    db.users[index].password = newPassword;
    saveDB(db);
    res.json({ status: "success", message: "تم تغيير كلمة المرور بنجاح" });
  });

  // 1h. Admin Reset User Password
  app.post("/api/users/:username/reset-password", (req, res) => {
    const targetUsername = req.params.username;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ status: "error", message: "يرجى إدخال كلمة المرور الجديدة" });
    }

    const db = loadDB();
    if (!db.users) db.users = [...INITIAL_USERS];

    const index = db.users.findIndex(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ status: "error", message: "المستخدم غير موجود" });
    }

    db.users[index].password = newPassword;
    saveDB(db);
    res.json({ status: "success", message: `تم إعادة تعيين كلمة مرور المستخدم [${db.users[index].name}] بنجاح` });
  });

  // 1i. Update User Permissions (Super Admin)
  app.put("/api/users/:username/permissions", (req, res) => {
    const targetUsername = req.params.username;
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ status: "error", message: "يرجى توفير كائن الصلاحيات" });
    }

    const db = loadDB();
    if (!db.users) db.users = [...INITIAL_USERS];

    const index = db.users.findIndex(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (index === -1) {
      return res.status(404).json({ status: "error", message: "المستخدم غير موجود" });
    }

    db.users[index].permissions = {
      ...db.users[index].permissions,
      ...permissions
    };

    saveDB(db);
    res.json({ status: "success", user: db.users[index], message: `تم تحديث صلاحيات المستخدم [${db.users[index].name}] بنجاح` });
  });

  // 1j. Submit Forgot Password Request (Delegate)
  app.post("/api/forgot-password", (req, res) => {
    const { contactInfo } = req.body;
    if (!contactInfo || !contactInfo.trim()) {
      return res.status(400).json({ status: "error", message: "يرجى إدخال البريد الإلكتروني، رقم الهاتف، أو اسم المستخدم" });
    }

    const db = loadDB();
    const users = db.users || INITIAL_USERS;

    const trimmed = contactInfo.trim();
    const matchedUser = users.find(u => 
      (u.username && u.username.toLowerCase() === trimmed.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === trimmed.toLowerCase()) ||
      (u.phone && u.phone === trimmed)
    );

    if (!db.resetRequests) db.resetRequests = [];

    const newReq: PasswordResetRequest = {
      id: "REQ-" + Date.now(),
      contactInfo: trimmed,
      userName: matchedUser ? matchedUser.name : "غير معروف",
      username: matchedUser ? matchedUser.username : trimmed,
      phone: matchedUser ? matchedUser.phone : trimmed,
      createdAt: new Date().toLocaleDateString("ar-YE", {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      status: "pending"
    };

    db.resetRequests.unshift(newReq);
    saveDB(db);

    res.json({
      status: "success",
      message: "تم إرسال طلب إعادة تعيين كلمة المرور إلى لوحة المشرف العام بنجاح. يرجى التواصل مع المشرف للاعتماد."
    });
  });

  // 1k. Get Password Reset Requests (Super Admin)
  app.get("/api/reset-requests", (req, res) => {
    const db = loadDB();
    res.json({ status: "success", requests: db.resetRequests || [] });
  });

  // 1l. Resolve Password Reset Request
  app.post("/api/reset-requests/:id/resolve", (req, res) => {
    const reqId = req.params.id;
    const { newPassword } = req.body;

    const db = loadDB();
    if (!db.resetRequests) db.resetRequests = [];

    const reqIndex = db.resetRequests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) {
      return res.status(404).json({ status: "error", message: "الطلب غير موجود" });
    }

    const resetReq = db.resetRequests[reqIndex];

    if (newPassword && resetReq.username) {
      if (!db.users) db.users = [...INITIAL_USERS];
      const userIndex = db.users.findIndex(u => u.username.toLowerCase() === resetReq.username!.toLowerCase());
      if (userIndex !== -1) {
        db.users[userIndex].password = newPassword;
      }
    }

    db.resetRequests[reqIndex].status = "resolved";
    saveDB(db);

    res.json({ status: "success", message: "تمت معالجة الطلب بنجاح وتحديث كلمة المرور" });
  });

  // 1m. Delete Password Reset Request
  app.delete("/api/reset-requests/:id", (req, res) => {
    const reqId = req.params.id;
    const db = loadDB();
    if (!db.resetRequests) db.resetRequests = [];

    db.resetRequests = db.resetRequests.filter(r => r.id !== reqId);
    saveDB(db);

    res.json({ status: "success", message: "تم حذف الطلب" });
  });

  // 1i. Get Schema Lists
  app.get("/api/schema", (req, res) => {
    const db = loadDB();
    res.json({
      status: "success",
      neighborhoods: db.neighborhoods || [],
      titles: db.titles || [],
      maritalStatuses: db.maritalStatuses || [],
      healthStatuses: db.healthStatuses || []
    });
  });

  // 1j. Update Schema Lists
  app.post("/api/schema", (req, res) => {
    const { neighborhoods, titles, maritalStatuses, healthStatuses } = req.body;
    const db = loadDB();
    if (neighborhoods) db.neighborhoods = neighborhoods;
    if (titles) db.titles = titles;
    if (maritalStatuses) db.maritalStatuses = maritalStatuses;
    if (healthStatuses) db.healthStatuses = healthStatuses;
    saveDB(db);
    res.json({ status: "success", message: "تم تحديث القوائم بنجاح" });
  });

  // 2. Save Google Apps Script web app URL
  app.post("/api/config", (req, res) => {
    const { googleScriptUrl } = req.body;
    const db = loadDB();
    db.googleScriptUrl = googleScriptUrl || "";
    saveDB(db);
    res.json({ status: "success", googleScriptUrl: db.googleScriptUrl });
  });

  // 3. Add Family
  app.post("/api/family", (req, res) => {
    const familyData: Omit<Family, "id"> = req.body;
    const db = loadDB();
    
    // Auto-generate next ID
    const nextId = db.families.length > 0 ? Math.max(...db.families.map(f => f.id)) + 1 : 1;
    
    // Auto-generate Unique Family Code
    const prefix = "FAM-DJ-";
    let index = 1;
    let codeCandidate = `${prefix}${String(index).padStart(4, "0")}`;
    while (db.families.some(f => f.familyCode === codeCandidate)) {
      index++;
      codeCandidate = `${prefix}${String(index).padStart(4, "0")}`;
    }
    
    const newFamily: Family = {
      ...familyData,
      id: nextId,
      familyCode: codeCandidate,
      memberCount: 1 // Start with head of family
    };
    
    db.families.push(newFamily);
    saveDB(db);

    syncSingleEntity("saveFamily", "الأسر", {
      id: newFamily.id,
      familyCode: newFamily.familyCode,
      headName: newFamily.headName,
      neighborhood: newFamily.neighborhood,
      memberCount: newFamily.memberCount,
      phone: newFamily.phone || "",
      residency: newFamily.residency || "",
      location: newFamily.location || "",
      gender: newFamily.gender || "",
      title: newFamily.title || "بدون لقب",
      maritalStatus: newFamily.maritalStatus || "",
      birthDate: newFamily.birthDate || "",
      deathDate: newFamily.deathDate || "",
      marriageDate: newFamily.marriageDate || ""
    });

    triggerGoogleSync(db);
    res.json({ status: "success", family: newFamily });
  });

  // 4. Edit Family
  app.put("/api/family/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updatedFields: Partial<Family> = req.body;
    const db = loadDB();
    
    const index = db.families.findIndex(f => f.id === id);
    if (index === -1) {
      return res.status(404).json({ status: "error", message: "الأسرة غير موجودة" });
    }
    
    db.families[index] = {
      ...db.families[index],
      ...updatedFields,
      id // Ensure ID remains immutable
    };
    
    // Also update residency/title for all dependents of this family if changed
    const currentFamily = db.families[index];
    db.dependents = db.dependents.map(dep => {
      if (dep.familyCode === currentFamily.familyCode) {
        return {
          ...dep,
          residency: updatedFields.residency || dep.residency,
          title: (!dep.title || dep.title === "بدون لقب") ? (currentFamily.title || "بدون لقب") : dep.title
        };
      }
      return dep;
    });

    saveDB(db);

    syncSingleEntity("saveFamily", "الأسر", {
      id: currentFamily.id,
      familyCode: currentFamily.familyCode,
      headName: currentFamily.headName,
      neighborhood: currentFamily.neighborhood,
      memberCount: currentFamily.memberCount,
      phone: currentFamily.phone || "",
      residency: currentFamily.residency || "",
      location: currentFamily.location || "",
      gender: currentFamily.gender || "",
      title: currentFamily.title || "بدون لقب",
      maritalStatus: currentFamily.maritalStatus || "",
      birthDate: currentFamily.birthDate || "",
      deathDate: currentFamily.deathDate || "",
      marriageDate: currentFamily.marriageDate || ""
    });

    triggerGoogleSync(db);
    res.json({ status: "success", family: currentFamily });
  });

  // 5. Delete Family
  app.delete("/api/family/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const db = loadDB();
    
    const family = db.families.find(f => f.id === id);
    if (!family) {
      return res.status(404).json({ status: "error", message: "الأسرة غير موجودة" });
    }
    
    const famCode = family.familyCode;
    // Deleting a family also deletes its dependents or unlinks them
    db.dependents = db.dependents.filter(dep => dep.familyCode !== famCode);
    db.families = db.families.filter(f => f.id !== id);
    
    saveDB(db);

    syncSingleEntity("deleteFamily", "الأسر", {
      id: id,
      familyCode: famCode
    });

    triggerGoogleSync(db);
    res.json({ status: "success", message: "تم حذف الأسرة والتابعين لها بنجاح" });
  });

  // 6. Add Dependent
  app.post("/api/dependent", (req, res) => {
    const depData: Omit<Dependent, "id"> = req.body;
    const db = loadDB();
    
    const hostFam = db.families.find(f => f.familyCode === depData.familyCode);

    // Auto-inheritance for Title and Residency from head of family if empty
    let effectiveTitle = depData.title;
    if (!effectiveTitle || effectiveTitle.trim() === "" || effectiveTitle === "بدون لقب") {
      effectiveTitle = hostFam?.title || "بدون لقب";
    }

    let effectiveResidency = depData.residency;
    if (!effectiveResidency || effectiveResidency.trim() === "" || effectiveResidency === "حسب إقامة الأسرة (تلقائياً)") {
      effectiveResidency = hostFam?.residency || hostFam?.neighborhood || "";
    }

    const nextId = db.dependents.length > 0 ? Math.max(...db.dependents.map(d => d.id)) + 1 : 1;
    const newDependent: Dependent = {
      ...depData,
      title: effectiveTitle,
      residency: effectiveResidency,
      id: nextId
    };
    
    db.dependents.push(newDependent);
    
    // Recalculate member count for this family
    if (hostFam) {
      const depsOfFamily = db.dependents.filter(dep => dep.familyCode === depData.familyCode);
      hostFam.memberCount = 1 + depsOfFamily.length;
    }
    
    saveDB(db);

    syncSingleEntity("saveDependent", "التابعين", {
      id: newDependent.id,
      familyCode: newDependent.familyCode,
      name: newDependent.name,
      title: newDependent.title,
      relation: newDependent.relation || "تابع",
      phone: newDependent.phone || "",
      secondaryPhone: newDependent.secondaryPhone || "",
      nationalId: newDependent.nationalId || "",
      residency: newDependent.residency || "",
      location: newDependent.location || "",
      birthDate: newDependent.birthDate || "",
      maritalStatus: newDependent.maritalStatus || "أعزب"
    });

    triggerGoogleSync(db);
    res.json({ status: "success", dependent: newDependent });
  });

  // 7. Edit Dependent
  app.put("/api/dependent/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const updatedFields: Partial<Dependent> = req.body;
    const db = loadDB();
    
    let index = db.dependents.findIndex(d => d.id === id);
    if (index === -1) {
      const famCode = updatedFields.familyCode || "";
      const hostFam = db.families.find(f => f.familyCode === famCode);

      let effectiveTitle = updatedFields.title;
      if (!effectiveTitle || effectiveTitle.trim() === "" || effectiveTitle === "بدون لقب") {
        effectiveTitle = hostFam?.title || "بدون لقب";
      }

      let effectiveResidency = updatedFields.residency;
      if (!effectiveResidency || effectiveResidency.trim() === "" || effectiveResidency === "حسب إقامة الأسرة (تلقائياً)") {
        effectiveResidency = hostFam?.residency || hostFam?.neighborhood || "";
      }

      const nextId = db.dependents.length > 0 ? Math.max(...db.dependents.map(d => d.id)) + 1 : 1;
      const newDep: Dependent = {
        id: nextId,
        name: updatedFields.name || "تابع جديد",
        title: effectiveTitle,
        relation: updatedFields.relation || "تابع",
        phone: updatedFields.phone || "",
        nationalId: updatedFields.nationalId || "",
        residency: effectiveResidency,
        birthDate: updatedFields.birthDate || "",
        maritalStatus: updatedFields.maritalStatus || "أعزب",
        familyCode: famCode
      };
      db.dependents.push(newDep);
      
      if (hostFam) {
        hostFam.memberCount = 1 + db.dependents.filter(d => d.familyCode === famCode).length;
      }
      
      saveDB(db);

      syncSingleEntity("saveDependent", "التابعين", {
        id: newDep.id,
        familyCode: newDep.familyCode,
        name: newDep.name,
        title: newDep.title,
        relation: newDep.relation,
        phone: newDep.phone || "",
        nationalId: newDep.nationalId || "",
        residency: newDep.residency || "",
        birthDate: newDep.birthDate || "",
        maritalStatus: newDep.maritalStatus || "أعزب"
      });

      triggerGoogleSync(db);
      return res.json({ status: "success", dependent: newDep });
    }
    
    const oldFamilyCode = db.dependents[index].familyCode;
    const currentFamCode = updatedFields.familyCode || oldFamilyCode;
    const hostFam = db.families.find(f => f.familyCode === currentFamCode);

    let effectiveTitle = updatedFields.title !== undefined ? updatedFields.title : db.dependents[index].title;
    if (!effectiveTitle || effectiveTitle.trim() === "" || effectiveTitle === "بدون لقب") {
      if (hostFam?.title) {
        effectiveTitle = hostFam.title;
      }
    }

    let effectiveResidency = updatedFields.residency !== undefined ? updatedFields.residency : db.dependents[index].residency;
    if (!effectiveResidency || effectiveResidency.trim() === "" || effectiveResidency === "حسب إقامة الأسرة (تلقائياً)") {
      if (hostFam?.residency || hostFam?.neighborhood) {
        effectiveResidency = hostFam.residency || hostFam.neighborhood;
      }
    }

    db.dependents[index] = {
      ...db.dependents[index],
      ...updatedFields,
      title: effectiveTitle,
      residency: effectiveResidency,
      id
    };
    
    // If familyCode changed, recalculate member counts for old and new families
    if (updatedFields.familyCode && updatedFields.familyCode !== oldFamilyCode) {
      const oldFam = db.families.find(f => f.familyCode === oldFamilyCode);
      if (oldFam) {
        oldFam.memberCount = 1 + db.dependents.filter(d => d.familyCode === oldFamilyCode).length;
      }
      if (hostFam) {
        hostFam.memberCount = 1 + db.dependents.filter(d => d.familyCode === currentFamCode).length;
      }
    }
    
    saveDB(db);

    syncSingleEntity("saveDependent", "التابعين", {
      id: db.dependents[index].id,
      familyCode: db.dependents[index].familyCode,
      name: db.dependents[index].name,
      title: db.dependents[index].title,
      relation: db.dependents[index].relation,
      phone: db.dependents[index].phone || "",
      nationalId: db.dependents[index].nationalId || "",
      residency: db.dependents[index].residency || "",
      birthDate: db.dependents[index].birthDate || "",
      maritalStatus: db.dependents[index].maritalStatus || "أعزب"
    });

    triggerGoogleSync(db);
    res.json({ status: "success", dependent: db.dependents[index] });
  });

  // 8. Delete Dependent
  app.delete("/api/dependent/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const db = loadDB();
    
    const dep = db.dependents.find(d => d.id === id);
    if (!dep) {
      return res.status(404).json({ status: "error", message: "التابع غير موجود" });
    }
    
    const famCode = dep.familyCode;
    db.dependents = db.dependents.filter(d => d.id !== id);
    
    // Recalculate member count
    const family = db.families.find(f => f.familyCode === famCode);
    if (family) {
      family.memberCount = 1 + db.dependents.filter(d => d.familyCode === famCode).length;
    }
    
    saveDB(db);

    syncSingleEntity("deleteDependent", "التابعين", {
      id: id,
      dependentId: id,
      name: dep.name,
      familyCode: famCode
    });

    triggerGoogleSync(db);
    res.json({ status: "success", message: "تم حذف التابع بنجاح" });
  });

  // 8b. Batch Operations for Families
  app.post("/api/batch/families", (req, res) => {
    const { action, ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: "error", message: "لم يتم تحديد أي أسرة" });
    }
    const db = loadDB();
    const idSet = new Set(ids.map((id: any) => Number(id)));
    
    // Find target family codes before modification/deletion
    const targetFamilies = db.families.filter(f => idSet.has(f.id));
    const targetFamilyCodes = new Set(targetFamilies.map(f => f.familyCode));

    if (action === "edit_title") {
      const newTitle = data?.title || "";
      db.families.forEach(f => {
        if (idSet.has(f.id)) {
          f.title = newTitle;
        }
      });
      if (data?.updateDependentsTitle) {
        db.dependents.forEach(d => {
          if (targetFamilyCodes.has(d.familyCode)) {
            d.title = newTitle;
          }
        });
      }
    } else if (action === "edit_neighborhood") {
      const newHood = data?.neighborhood || "";
      db.families.forEach(f => {
        if (idSet.has(f.id)) {
          f.neighborhood = newHood;
          f.residency = newHood;
        }
      });
      db.dependents.forEach(d => {
        if (targetFamilyCodes.has(d.familyCode)) {
          d.residency = newHood;
        }
      });
    } else if (action === "edit_residency_location") {
      const newResidency = data?.residency || "";
      const newLocation = data?.location || "";
      db.families.forEach(f => {
        if (idSet.has(f.id)) {
          if (newResidency) f.residency = newResidency;
          if (newLocation) f.location = newLocation;
        }
      });
      if (newResidency) {
        db.dependents.forEach(d => {
          if (targetFamilyCodes.has(d.familyCode)) {
            d.residency = newResidency;
          }
        });
      }
    } else if (action === "edit_gender") {
      const newGender = data?.gender || "ذكر";
      db.families.forEach(f => {
        if (idSet.has(f.id)) {
          f.gender = newGender;
        }
      });
    } else if (action === "delete") {
      db.families = db.families.filter(f => !idSet.has(f.id));
      db.dependents = db.dependents.filter(d => !targetFamilyCodes.has(d.familyCode));
    }

    saveDB(db);
    triggerGoogleSync(db);
    return res.json({
      status: "success",
      count: idSet.size,
      message: `تم تنفيذ الإجراء الجماعي بنجاح على ${idSet.size} أسرة`,
      families: db.families,
      dependents: db.dependents
    });
  });

  // 8c. Batch Operations for Dependents
  app.post("/api/batch/dependents", (req, res) => {
    const { action, ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: "error", message: "لم يتم تحديد أي تابع" });
    }
    const db = loadDB();
    const idSet = new Set(ids.map((id: any) => Number(id)));

    const affectedFamilyCodes = new Set<string>();
    db.dependents.forEach(d => {
      if (idSet.has(d.id)) {
        affectedFamilyCodes.add(d.familyCode);
      }
    });

    if (action === "edit_title") {
      const newTitle = data?.title || "";
      db.dependents.forEach(d => {
        if (idSet.has(d.id)) {
          d.title = newTitle;
        }
      });
    } else if (action === "edit_residency_location" || action === "edit_neighborhood") {
      const newResidency = data?.residency || data?.neighborhood || "";
      db.dependents.forEach(d => {
        if (idSet.has(d.id)) {
          if (newResidency) d.residency = newResidency;
        }
      });
    } else if (action === "delete") {
      db.dependents = db.dependents.filter(d => !idSet.has(d.id));
      affectedFamilyCodes.forEach(famCode => {
        const family = db.families.find(f => f.familyCode === famCode);
        if (family) {
          family.memberCount = 1 + db.dependents.filter(d => d.familyCode === famCode).length;
        }
      });
    }

    saveDB(db);
    triggerGoogleSync(db);
    return res.json({
      status: "success",
      count: idSet.size,
      message: `تم تنفيذ الإجراء الجماعي بنجاح على ${idSet.size} تابع`,
      families: db.families,
      dependents: db.dependents
    });
  });

  // 9. Transfer Individual (dependent) to another family
  app.post("/api/transfer", (req, res) => {
    const { dependentId, targetFamilyCode } = req.body;
    const db = loadDB();
    
    const dep = db.dependents.find(d => d.id === parseInt(dependentId));
    if (!dep) {
      return res.status(404).json({ status: "error", message: "التابع غير موجود" });
    }
    
    const sourceFamilyCode = dep.familyCode;
    const targetFamily = db.families.find(f => f.familyCode === targetFamilyCode);
    if (!targetFamily) {
      return res.status(404).json({ status: "error", message: "العائلة المستهدفة غير موجودة" });
    }
    
    // Update the dependent's family code
    dep.familyCode = targetFamilyCode;
    
    // Recalculate member count for source family
    const sourceFamily = db.families.find(f => f.familyCode === sourceFamilyCode);
    if (sourceFamily) {
      sourceFamily.memberCount = 1 + db.dependents.filter(d => d.familyCode === sourceFamilyCode).length;
    }
    
    // Recalculate member count for target family
    targetFamily.memberCount = 1 + db.dependents.filter(d => d.familyCode === targetFamilyCode).length;
    
    saveDB(db);
    triggerGoogleSync(db);
    res.json({ status: "success", message: "تم نقل الفرد بنجاح بين العائلات" });
  });

  // 10. Record Birth or Death
  app.post("/api/birth-death", (req, res) => {
    const { type, payload } = req.body; // type: 'birth' | 'death'
    const db = loadDB();
    
    if (type === "birth") {
      // Add as dependent
      const nextId = db.dependents.length > 0 ? Math.max(...db.dependents.map(d => d.id)) + 1 : 1;
      const newDependent: Dependent = {
        id: nextId,
        name: payload.name,
        title: payload.title || "بدون لقب",
        relation: "ابن", // Or "ابنة"
        phone: "",
        nationalId: payload.nationalId || "",
        residency: payload.residency || "",
        birthDate: payload.birthDate,
        maritalStatus: "أعزب",
        familyCode: payload.familyCode
      };
      
      db.dependents.push(newDependent);
      
      // Increment family count
      const family = db.families.find(f => f.familyCode === payload.familyCode);
      if (family) {
        family.memberCount = 1 + db.dependents.filter(d => d.familyCode === payload.familyCode).length;
      }
      
      saveDB(db);
      triggerGoogleSync(db);
      return res.json({ status: "success", type: "birth", dependent: newDependent });
    } 
    
    if (type === "death") {
      const { isHead, id, deathDate } = payload;
      
      if (isHead) {
        // Update family record's deathDate
        const index = db.families.findIndex(f => f.id === parseInt(id));
        if (index !== -1) {
          db.families[index].deathDate = deathDate;
          saveDB(db);
          triggerGoogleSync(db);
          return res.json({ status: "success", type: "death", family: db.families[index] });
        }
      } else {
        // Update dependent's record - we can mark it. Since we don't have a direct 'deathDate' column on 'التابعين',
        // we can store it or suffix the name, or since the sheet has no death column on dependents,
        // we can set the maritalStatus to "متوفى" or similar, or record it in a local audit log.
        // Let's add 'متوفى' to maritalStatus, or keep a custom field, or just record it. Let's set its maritalStatus to 'متوفى'!
        const index = db.dependents.findIndex(d => d.id === parseInt(id));
        if (index !== -1) {
          db.dependents[index].maritalStatus = "متوفى";
          saveDB(db);
          triggerGoogleSync(db);
          return res.json({ status: "success", type: "death", dependent: db.dependents[index] });
        }
      }
      return res.status(404).json({ status: "error", message: "الشخص المستهدف غير موجود" });
    }
    
    res.status(400).json({ status: "error", message: "طلب غير صالح" });
  });

  // 11. Proxy Sync with Google Apps Script
  app.post("/api/sync", async (req, res) => {
    const db = loadDB();
    const { action, remoteData } = req.body; // action: 'push' | 'pull' | 'merge'
    
    if (!db.googleScriptUrl) {
      return res.status(400).json({ 
        status: "error", 
        message: "رابط Google Apps Script غير مبرمج بعد. يرجى تهيئته أولاً من لوحة الإعدادات." 
      });
    }

    try {
      // Helper function to map camelCase fields into precisely ordered Arabic keys for the Sheets schema
      const mapFamiliesToSheet = (fams: Family[]) => {
        return fams.map(f => ({
          "م": f.id,
          "رب الأسرة": f.headName,
          "المحلة": f.neighborhood,
          "عدد الأفراد": f.memberCount,
          "رقم الجوال": f.phone,
          "الإقامة": f.residency,
          "مكان الإقامة": f.location,
          "الجنس": f.gender,
          "اللقب": f.title,
          "الحالة الاجتماعية": f.maritalStatus,
          "تاريخ الميلاد": f.birthDate,
          "تاريخ الوفاة": f.deathDate,
          "تاريخ الزواج": f.marriageDate,
          "كود الأسرة": f.familyCode
        }));
      };

      const mapDependentsToSheet = (deps: Dependent[]) => {
        return deps.map(d => ({
          "م": d.id,
          "الاسم": d.name,
          "اللقب": d.title,
          "صلة القرابة": d.relation,
          "رقم الهاتف للفرد": d.phone,
          "الرقم الوطني": d.nationalId,
          "الإقامة": d.residency,
          "تاريخ الميلاد": d.birthDate,
          "الحالة الاجتماعية": d.maritalStatus,
          "كود الأسرة": d.familyCode
        }));
      };

      if (action === "push") {
        // Send our current JSON db payload to Apps Script
        const payload = {
          action: "sync",
          families: mapFamiliesToSheet(db.families),
          dependents: mapDependentsToSheet(db.dependents)
        };
        
        const response = await fetch(db.googleScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        const resText = await response.text();
        let resJson;
        try {
          resJson = JSON.parse(resText);
        } catch {
          resJson = { status: "success", raw: resText }; // Some Apps Script return text or html on redirects
        }
        
        return res.json({ 
          status: "success", 
          message: "تم رفع ومزامنة البيانات مع جدول جوجل بنجاح", 
          details: resJson 
        });
      }

      if (action === "pull") {
        // Get the spreadsheet data
        const response = await fetch(db.googleScriptUrl);
        const resJson = await response.json();
        
        if (resJson.families || resJson.status === "success") {
          const mappedFamilies = parseSheetFamilies(resJson.families || []);
          const mappedDependents = parseSheetDependents(resJson.dependents || []);

          if (mappedFamilies.length > 0) {
            db.families = mappedFamilies;
            db.dependents = mappedDependents;
            saveDB(db);
          }

          return res.json({ 
            status: "success", 
            message: "تم جلب وتحديث البيانات من جدول جوجل بنجاح", 
            familiesCount: db.families.length,
            dependentsCount: db.dependents.length
          });
        } else {
          throw new Error(resJson.message || "فشل الجلب من Google Apps Script");
        }
      }

      res.status(400).json({ status: "error", message: "إجراء مزامنة غير صالح" });
    } catch (err: any) {
      console.error("Sync Error:", err);
      res.status(500).json({ 
        status: "error", 
        message: `فشلت المزامنة: يرجى التحقق من رابط Web App وصلاحيات النشر (Anyone) في Apps Script. التفاصيل: ${err.message}` 
      });
    }
  });

  // Code.gs contents route so the user can easily copy/paste or download
  app.get("/api/script-code", (req, res) => {
    const code = `// Code.gs - Google Apps Script للتعداد السكاني لقرية ذي الجمال
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

    // saveFamily -> target sheet "الأسر"
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

    // saveDependent -> target sheet "التابعين"
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
    res.json({ code });
  });

  // Vite middleware setup

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
