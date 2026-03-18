export interface StoredSavedItem {
  type: string;
  amount: number;
  rate: number;
  payment: number;
  isGift: boolean;
}

export interface StoredEntry {
  kind: "reservation" | "urgent";
  id: number;
  createdAt: string;
  phone: string;
  location: string;
  items: StoredSavedItem[];
  totalPayment: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  name?: string;
  date?: string;
  time?: string;
}

const STORAGE_KEY = "gc_entries";
const COUNTER_KEY = "gc_counter";
const AUTH_KEY = "gc_admin_auth";
const ADMIN_PASSWORD = "admin1234";

export function getNextId(): number {
  const current = parseInt(localStorage.getItem(COUNTER_KEY) || "0");
  const next = current + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

export function saveEntry(entry: StoredEntry): void {
  const entries = getEntries();
  entries.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getEntries(): StoredEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getEntry(id: number): StoredEntry | undefined {
  return getEntries().find((e) => e.id === id);
}

export function adminLogin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
}

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

export function adminLogout(): void {
  sessionStorage.removeItem(AUTH_KEY);
}
