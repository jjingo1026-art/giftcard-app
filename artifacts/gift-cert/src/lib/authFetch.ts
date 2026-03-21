const ADMIN_KEY = "gc_admin_token";
const STAFF_KEY = "gc_staff_token";

function getAdminTok(): string | null { return sessionStorage.getItem(ADMIN_KEY); }
function setAdminTok(t: string): void  { sessionStorage.setItem(ADMIN_KEY, t); }
function clearAdminTok(): void         { sessionStorage.removeItem(ADMIN_KEY); }

function getStaffTok(): string | null  { return localStorage.getItem(STAFF_KEY); }
function setStaffTok(t: string): void  { localStorage.setItem(STAFF_KEY, t); }
function clearStaffTok(): void         { localStorage.removeItem(STAFF_KEY); }

async function tryRefresh(refreshUrl: string): Promise<string | null> {
  try {
    const res = await fetch(refreshUrl, { method: "POST", credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminTok();
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token ?? ""}` },
  });

  if (res.status === 401) {
    const newToken = await tryRefresh("/api/admin/refresh");
    if (newToken) {
      setAdminTok(newToken);
      return fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      });
    }
    clearAdminTok();
    window.location.href = "/admin/login";
    return res;
  }

  return res;
}

export async function staffFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStaffTok();
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token ?? ""}` },
  });

  if (res.status === 401) {
    const newToken = await tryRefresh("/api/admin/staff/refresh");
    if (newToken) {
      setStaffTok(newToken);
      return fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
      });
    }
    clearStaffTok();
    localStorage.removeItem("gc_staff_id");
    localStorage.removeItem("gc_staff_name");
    window.location.href = "/staff/login";
    return res;
  }

  return res;
}
