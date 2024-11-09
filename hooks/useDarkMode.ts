import { useEffect, useState } from "react";

const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const userPreference = localStorage.getItem("theme");
    const userPreferenceIsDark = userPreference === "dark";
    const systemPreferenceIsDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (userPreferenceIsDark || (!userPreference && systemPreferenceIsDark)) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
      return;
    }
    document.documentElement.classList.remove("dark");
    setIsDarkMode(false);
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
      return;
    }
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
    setIsDarkMode(true);
  };

  return [isDarkMode, toggleDarkMode] as const;
};

export default useDarkMode;
