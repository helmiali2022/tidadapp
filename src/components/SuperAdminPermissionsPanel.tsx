import React, { useState, FormEvent } from "react";
import { 
  ShieldCheck, ShieldAlert, Key, RefreshCw, ToggleLeft, ToggleRight, 
  UserPlus, User, Mail, Phone, Lock, Trash2, AlertCircle, CheckCircle2,
  BellRing, Check, Clock, Shield, Edit2, Download
} from "lucide-react";
import { User as UserType, UserPermissions, PasswordResetRequest } from "../types";

interface SuperAdminPermissionsPanelProps {
  users: UserType[];
  currentUser: UserType;
  onUpdatePermissions: (username: string, permissions: UserPermissions) => Promise<void>;
  onResetUserPassword: (username: string, newPass: string) => Promise<void>;
  resetRequests: PasswordResetRequest[];
  onResolveResetRequest: (id: string, newPass?: string) => Promise<void>;
  onDeleteResetRequest: (id: string) => Promise<void>;
  onOpenAddUser: () => void;
  onDeleteUser: (username: string) => Promise<void>;
  onUpdateUserFullInfo?: (targetUsername: string, updatedUserData: Partial<UserType>) => Promise<void>;
}

export default function SuperAdminPermissionsPanel({
  users,
  currentUser,
  onUpdatePermissions,
  onResetUserPassword,
  resetRequests,
  onResolveResetRequest,
  onDeleteResetRequest,
  onOpenAddUser,
  onDeleteUser,
  onUpdateUserFullInfo,
}: SuperAdminPermissionsPanelProps) {
  const [updatingUsername, setUpdatingUsername] = useState<string | null>(null);
  const [resetModalUser, setResetModalUser] = useState<UserType | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Full Delegate Edit Modal State
  const [editDelegateUser, setEditDelegateUser] = useState<UserType | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "collector" | "viewer">("collector");
  const [editPerms, setEditPerms] = useState<UserPermissions>({
    canEdit: true,
    canExport: true,
    canUpload: true,
    canSync: false,
    canDelete: false,
    canAddFamily: true,
    canAddDependent: true
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Request resolution modal state
  const [activeRequest, setActiveRequest] = useState<PasswordResetRequest | null>(null);
  const [reqNewPassword, setReqNewPassword] = useState("");
  const [isResolvingReq, setIsResolvingReq] = useState(false);

  const openEditDelegateModal = (u: UserType) => {
    setEditDelegateUser(u);
    setEditName(u.name || "");
    setEditUsername(u.username || "");
    setEditEmail(u.email || "");
    setEditPhone(u.phone || "");
    setEditPassword(u.password || "");
    setEditRole(u.role || "collector");
    setEditPerms(u.permissions || {
      canEdit: u.role === "admin",
      canExport: true,
      canUpload: u.role === "admin",
      canSync: u.role === "admin",
      canDelete: u.role === "admin",
      canAddFamily: true,
      canAddDependent: true
    });
  };

  const handleSaveFullDelegateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDelegateUser || !onUpdateUserFullInfo) return;

    setIsSubmittingEdit(true);
    try {
      const payload: Partial<UserType> = {
        name: editName.trim(),
        username: editUsername.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        role: editRole,
        permissions: editPerms,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      await onUpdateUserFullInfo(editDelegateUser.username, payload);
      setEditDelegateUser(null);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Toggle single permission for user
  const handleTogglePermission = async (
    targetUser: UserType, 
    permKey: keyof UserPermissions
  ) => {
    const currentPerms: UserPermissions = targetUser.permissions || {
      canEdit: targetUser.role === "admin",
      canExport: true,
      canUpload: targetUser.role === "admin",
      canSync: targetUser.role === "admin"
    };

    const updatedPerms: UserPermissions = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey]
    };

    setUpdatingUsername(targetUser.username);
    try {
      await onUpdatePermissions(targetUser.username, updatedPerms);
    } finally {
      setUpdatingUsername(null);
    }
  };

  // Submit direct admin password reset
  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordInput.trim()) return;

    setIsResetting(true);
    setResetSuccess(null);
    try {
      await onResetUserPassword(resetModalUser.username, newPasswordInput.trim());
      setResetSuccess(`تم تغيير كلمة المرور لـ ${resetModalUser.name} بنجاح`);
      setNewPasswordInput("");
      setTimeout(() => {
        setResetModalUser(null);
        setResetSuccess(null);
      }, 1500);
    } finally {
      setIsResetting(false);
    }
  };

  // Submit password reset request resolution
  const handleResolveRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    setIsResolvingReq(true);
    try {
      await onResolveResetRequest(activeRequest.id, reqNewPassword.trim() || undefined);
      setActiveRequest(null);
      setReqNewPassword("");
    } finally {
      setIsResolvingReq(false);
    }
  };

  const pendingRequests = resetRequests.filter(r => r.status === "pending");

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner for Super Admin */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-lg font-black text-white">لوحة تحكم وتوزيع صلاحيات المندوبين (SUPER ADMIN)</h2>
          </div>
          <p className="text-xs text-slate-300">
            تتيح هذه اللوحة للمشرف العام التحكم اللحظي والتفصيلي بكل صلاحية للمندوبين وجامعي البيانات بشكل مستقل، مع متابعة طلبات استعادة كلمة المرور.
          </p>
        </div>

        <button
          onClick={onOpenAddUser}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مندوب / جامع بيانات جديد</span>
        </button>
      </div>

      {/* SECTION 1: Pending Password Reset Notifications */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50/70 border-2 border-amber-300 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
              <span>طلبات إعادة تعيين كلمة المرور المعلقة ({pendingRequests.length})</span>
            </h3>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
              يتطلب إجراء المشرف
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((req, index) => (
              <div key={req.id ? `reset-req-${req.id}` : `reset-req-idx-${index}`} className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{req.userName || "مندوب"}</span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {req.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-mono">
                    البيانات المدخلة: <strong className="text-indigo-700">{req.contactInfo}</strong>
                  </p>
                  {req.username && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono inline-block">
                      المستخدم: {req.username}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setActiveRequest(req);
                      setReqNewPassword("");
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>اعتماد كلمة مرور جديدة</span>
                  </button>
                  <button
                    onClick={() => onDeleteResetRequest(req.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 font-bold rounded-lg text-xs transition cursor-pointer"
                    title="حذف الطلب"
                  >
                    مسح
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Users & Interactive Permission Tree Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>قائمة المستخدمين والمندوبين وجدول التراخيص التفاعلي</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            إجمالي الحسابات: <strong className="text-slate-800 font-bold">{users.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">المستخدم / المندوب</th>
                <th className="px-3 py-3">الدور والصفة</th>
                <th className="px-3 py-3 text-center bg-emerald-50/50">
                  <div className="flex items-center justify-center gap-1 text-emerald-900">
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>إضافة/تعديل السجلات</span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center bg-blue-50/50">
                  <div className="flex items-center justify-center gap-1 text-blue-900">
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير البيانات</span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center bg-amber-50/50">
                  <div className="flex items-center justify-center gap-1 text-amber-900">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>رفع الملفات والكشوفات</span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center bg-purple-50/50">
                  <div className="flex items-center justify-center gap-1 text-purple-900">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>التزامن السحابي</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center">إجراءات الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {users.map((usr, index) => {
                const isAdmin = usr.role === "admin";
                const isSelf = usr.username ? usr.username.toLowerCase() === currentUser.username.toLowerCase() : false;
                const perms: UserPermissions = usr.permissions || {
                  canEdit: isAdmin,
                  canExport: true,
                  canUpload: isAdmin,
                  canSync: isAdmin
                };

                const isUpdatingThis = updatingUsername === usr.username;
                const userKey = usr.id !== undefined && usr.id !== null ? `usr-${usr.id}-${usr.username || index}` : `usr-${usr.username || index}`;

                return (
                  <tr key={userKey} className="hover:bg-slate-50 transition-colors">
                    {/* User Info */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{usr.name}</span>
                          {isSelf && (
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">حسابك</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                          <span>@{usr.username}</span>
                          {usr.phone && <span>• {usr.phone}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {isAdmin ? (
                        <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" />
                          <span>مشرف عام</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-emerald-600" />
                          <span>مندوب / جامع بيانات</span>
                        </span>
                      )}
                    </td>

                    {/* Toggle 1: Add/Edit Permission */}
                    <td className="px-3 py-3.5 text-center bg-emerald-50/20">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(usr, "canEdit")}
                        disabled={isAdmin || isUpdatingThis}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          perms.canEdit
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-slate-200 text-slate-500"
                        } disabled:opacity-75 disabled:cursor-not-allowed`}
                        title={isAdmin ? "المشرف العام يملك كافة الصلاحيات دائماً" : "تبديل صلاحية التعديل والإضافة"}
                      >
                        {perms.canEdit ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>مسموح</span>
                          </>
                        ) : (
                          <span>محظور</span>
                        )}
                      </button>
                    </td>

                    {/* Toggle 2: Export Permission */}
                    <td className="px-3 py-3.5 text-center bg-blue-50/20">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(usr, "canExport")}
                        disabled={isAdmin || isUpdatingThis}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          perms.canExport
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-200 text-slate-500"
                        } disabled:opacity-75 disabled:cursor-not-allowed`}
                        title={isAdmin ? "المشرف العام يملك كافة الصلاحيات دائماً" : "تبديل صلاحية التصدير"}
                      >
                        {perms.canExport ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>مسموح</span>
                          </>
                        ) : (
                          <span>محظور</span>
                        )}
                      </button>
                    </td>

                    {/* Toggle 3: Upload Permission */}
                    <td className="px-3 py-3.5 text-center bg-amber-50/20">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(usr, "canUpload")}
                        disabled={isAdmin || isUpdatingThis}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          perms.canUpload
                            ? "bg-amber-600 text-white shadow-2xs"
                            : "bg-slate-200 text-slate-500"
                        } disabled:opacity-75 disabled:cursor-not-allowed`}
                        title={isAdmin ? "المشرف العام يملك كافة الصلاحيات دائماً" : "تبديل صلاحية رفع الكشوفات"}
                      >
                        {perms.canUpload ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>مسموح</span>
                          </>
                        ) : (
                          <span>محظور</span>
                        )}
                      </button>
                    </td>

                    {/* Toggle 4: Sync Permission */}
                    <td className="px-3 py-3.5 text-center bg-purple-50/20">
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(usr, "canSync")}
                        disabled={isAdmin || isUpdatingThis}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          perms.canSync
                            ? "bg-purple-600 text-white shadow-2xs"
                            : "bg-slate-200 text-slate-500"
                        } disabled:opacity-75 disabled:cursor-not-allowed`}
                        title={isAdmin ? "المشرف العام يملك كافة الصلاحيات دائماً" : "تبديل صلاحية التزامن السحابي"}
                      >
                        {perms.canSync ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>مسموح</span>
                          </>
                        ) : (
                          <span>محظور</span>
                        )}
                      </button>
                    </td>

                    {/* User Actions */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditDelegateModal(usr)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 border border-indigo-200"
                          title="تعديل كافة بيانات المندوب والصلاحيات"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>تعديل الحساب</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetModalUser(usr);
                            setNewPasswordInput("");
                            setResetSuccess(null);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                          title="إعادة تعيين كلمة المرور فقط"
                        >
                          <Key className="w-3.5 h-3.5 text-slate-500" />
                          <span>كلمة المرور</span>
                        </button>

                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`هل أنت تأكد من حذف حساب المندوب [${usr.name}] نهائياً؟`)) {
                                onDeleteUser(usr.username);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="حذف الحساب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Reset Password Direct Dialog */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>إعادة تعيين كلمة المرور للمستخدم [{resetModalUser.name}]</span>
              </h3>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword} className="p-5 space-y-4">
              {resetSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-slate-50 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  {isResetting ? "جاري الحفظ..." : "تأكيد كلمة المرور الجديدة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Resolve Pending Forgot Password Request */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-amber-600 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-2">
                <BellRing className="w-4 h-4" />
                <span>الموافقة على إعادة تعيين كلمة المرور للمندوب</span>
              </h3>
              <button
                onClick={() => setActiveRequest(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveRequestSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                <div>الاسم: <strong className="text-slate-900">{activeRequest.userName}</strong></div>
                <div>اسم المستخدم: <span className="font-mono text-indigo-700">{activeRequest.username || activeRequest.contactInfo}</span></div>
                <div>وقت الطلب: <span className="text-slate-500 font-mono">{activeRequest.createdAt}</span></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">كلمة المرور الجديدة المعتمدة للمندوب</label>
                <input
                  type="text"
                  required
                  value={reqNewPassword}
                  onChange={(e) => setReqNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-amber-500 bg-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isResolvingReq}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                >
                  {isResolvingReq ? "جاري الاعتماد..." : "اعتماد وتحديث كلمة المرور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Comprehensive Full Delegate Profile & Checkbox Permissions Edit */}
      {editDelegateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
          <div className="bg-white w-full max-w-xl max-h-[90vh] my-auto rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">تعديل حساب وبيانات المندوب كاملاً</h3>
                  <p className="text-[11px] text-indigo-200 mt-0.5">
                    التحكم في اسم المستخدم، البريد، كلمة المرور، مسميات ودور الحساب، وتخصيص الصلاحيات بمربعات اختيار
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditDelegateUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveFullDelegateProfile} className="p-5 space-y-4 overflow-y-auto flex-1 text-right">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* الاسم الكامل */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">الاسم الكامل للمندوب *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="اسم المندوب الثلاثي"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white"
                  />
                </div>

                {/* اسم المستخدم */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم المستخدم (تسجيل الدخول) *</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="username"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white font-mono"
                  />
                </div>

                {/* البريد الإلكتروني */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white font-mono"
                  />
                </div>

                {/* رقم الجوال */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="771787747"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white font-mono"
                  />
                </div>

                {/* كلمة المرور */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">كلمة المرور الجديدة (تغيير مباثر)</label>
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="اتركها كما هي أو أدخل الجديدة"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white font-mono"
                  />
                </div>

                {/* الدور / الصفة */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700">الدور والصفة النظامية</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white font-bold"
                  >
                    <option value="collector">مندوب / جامع بيانات ميداني</option>
                    <option value="admin">مشرف عام (Super Admin)</option>
                    <option value="viewer">مستعرض فقط (عرض)</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes for Permissions */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>تحديد الصلاحيات الممنوحة للمندوب (مربعات اختيار)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {/* canEdit */}
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-bold cursor-pointer hover:text-indigo-700">
                    <input
                      type="checkbox"
                      checked={editPerms.canEdit}
                      onChange={(e) => setEditPerms({ ...editPerms, canEdit: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>إضافة وتعديل الأسر والتابعين</span>
                  </label>

                  {/* canExport */}
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-bold cursor-pointer hover:text-indigo-700">
                    <input
                      type="checkbox"
                      checked={editPerms.canExport}
                      onChange={(e) => setEditPerms({ ...editPerms, canExport: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>تصدير البيانات والتقارير (Excel/PDF/JSON)</span>
                  </label>

                  {/* canUpload */}
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-bold cursor-pointer hover:text-indigo-700">
                    <input
                      type="checkbox"
                      checked={editPerms.canUpload}
                      onChange={(e) => setEditPerms({ ...editPerms, canUpload: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>رفع الملفات والكشوفات المستوردة</span>
                  </label>

                  {/* canSync */}
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-bold cursor-pointer hover:text-indigo-700">
                    <input
                      type="checkbox"
                      checked={editPerms.canSync}
                      onChange={(e) => setEditPerms({ ...editPerms, canSync: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>المزامنة السحابية مع جدول جوجل</span>
                  </label>

                  {/* canDelete */}
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-bold cursor-pointer hover:text-indigo-700">
                    <input
                      type="checkbox"
                      checked={!!editPerms.canDelete}
                      onChange={(e) => setEditPerms({ ...editPerms, canDelete: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>حذف السجلات والتابعين</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditDelegateUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  {isSubmittingEdit ? "جاري التحديث..." : "حفظ التعديلات الشاملة 💾"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
