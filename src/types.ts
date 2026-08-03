export interface Family {
  id: number;
  headName: string;
  neighborhood: string;
  memberCount: number;
  phone: string;
  secondaryPhone?: string;
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

export interface Dependent {
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

export type Role = "admin" | "collector" | "viewer";

export interface UserPermissions {
  canEdit: boolean;      // صلاحية إضافة/تعديل البيانات
  canExport: boolean;    // صلاحية تصدير البيانات
  canUpload: boolean;    // صلاحية رفع الكشوفات والملفات
  canSync: boolean;      // صلاحية التزامن السحابي
  canDelete?: boolean;   // صلاحية حذف السجلات
  canAddFamily?: boolean; // صلاحية إضافة أسر جديدة
  canAddDependent?: boolean; // صلاحية إضافة تابعين
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  email?: string;
  phone?: string;
  password?: string;
  permissions?: UserPermissions;
}

export interface PasswordResetRequest {
  id: string;
  contactInfo: string;
  userName?: string;
  username?: string;
  phone?: string;
  createdAt: string;
  status: "pending" | "resolved";
}
