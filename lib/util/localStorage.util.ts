export const getIdStorageKey = (): string | undefined => {
  return process.env.NEXT_PUBLIC_SESSION_ID_KEY;
};

export const getFromLocalStorage = (key: string): string | null => {
  if (typeof window !== "undefined") return window.localStorage.getItem(key);
  return null;
};

export const setToLocalStorage = (key: string, value: string): void => {
  if (typeof window !== "undefined") window.localStorage.setItem(key, value);
};

export const setLocalSessionId = (userId: string): void => {
  const storageKey = getIdStorageKey();
  if (storageKey) setToLocalStorage(storageKey, userId);
};

export const getLocalSession = (): string | null => {
  const storageKey = getIdStorageKey();
  if (storageKey) return getFromLocalStorage(storageKey);
  return null;
};
