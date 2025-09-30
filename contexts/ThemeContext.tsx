"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "ocean",
  setTheme: () => {}
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState("ocean");

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedTheme");
    if (saved) setTheme(saved);
  }, []);

  // Apply theme to body and save
  useEffect(() => {
    document.body.dataset.theme = theme; // add theme as data attribute
    localStorage.setItem("selectedTheme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
