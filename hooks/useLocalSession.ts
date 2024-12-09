import { getLocalSession } from "@/lib/localStorage.util";

const useLocalSession = () => {
  const localSession = getLocalSession();
  if (!localSession) return null;
  return JSON.parse(localSession);
};

export default useLocalSession;
