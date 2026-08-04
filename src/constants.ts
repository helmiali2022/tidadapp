import { User } from "./types";

export const DEFAULT_GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbym5VisvcTo0rhlKPh9K-fJ8HmbPKDMgDJPDDu0UQvHwjXS7q4UioJ4phb5nVih9ZkI/exec";

export const DEFAULT_LOCAL_USERS: User[] = [
  {
    id: 1,
    username: "helmi",
    name: "حلمي علي هزاع",
    role: "admin",
    email: "helmiali2014@gmail.com",
    phone: "780555001",
    password: "123456",
    permissions: {
      canEdit: true,
      canExport: true,
      canUpload: true,
      canSync: true,
      canDelete: true,
      canAddFamily: true,
      canAddDependent: true,
    },
  },
  {
    id: 2,
    username: "helmiali",
    name: "حلمي الخطيب",
    role: "admin",
    email: "helmialkhateeb@gmail.com",
    phone: "771787747",
    password: "123456",
    permissions: {
      canEdit: true,
      canExport: true,
      canUpload: true,
      canSync: true,
      canDelete: true,
      canAddFamily: true,
      canAddDependent: true,
    },
  },
  {
    id: 3,
    username: "N77393477@Gmail.com",
    name: "الأستاذ نجيب الخطيب",
    role: "collector",
    email: "N77393477@Gmail.com",
    phone: "774703263",
    password: "123456",
    permissions: {
      canEdit: true,
      canExport: true,
      canUpload: true,
      canSync: false,
      canDelete: false,
      canAddFamily: true,
      canAddDependent: true,
    },
  },
  {
    id: 4,
    username: "esamalhateb1988@gmail.com",
    name: "عصام الخطيب",
    role: "collector",
    email: "esamalhateb1988@gmail.com",
    phone: "774185016",
    password: "123456",
    permissions: {
      canEdit: true,
      canExport: true,
      canUpload: true,
      canSync: false,
      canDelete: false,
      canAddFamily: true,
      canAddDependent: true,
    },
  },
];
