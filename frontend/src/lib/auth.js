const CREDENTIALS = { username: "kukusin", password: "kukusin2024" };
const AUTH_KEY = "kukusin_auth";

export const login = (username, password) => {
  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    localStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
};

export const logout = () => localStorage.removeItem(AUTH_KEY);

export const isAuthenticated = () => localStorage.getItem(AUTH_KEY) === "1";
