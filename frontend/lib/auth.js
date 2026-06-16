const TOKEN_KEY = "eventpulse-token";
const USER_KEY = "eventpulse-user";
const ROLE_KEY = "eventpulse-role";

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveToken(token) {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function saveUser(user) {
  if (!isBrowser()) return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (user?.role) {
    window.localStorage.setItem(ROLE_KEY, user.role);
  }
}

export function getUser() {
  if (!isBrowser()) return null;

  try {
    const value = window.localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function logout() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function hasRole(...roles) {
  const user = getUser();
  return Boolean(user?.role && roles.includes(user.role));
}
