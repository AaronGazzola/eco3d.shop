import { Poppins, Rubik, Comfortaa, Urbanist } from "next/font/google";

export const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap", // or other values for Display if applicable
  preload: true,
  fallback: ["Arial", "sans-serif"], // add more fallback fonts if needed
  adjustFontFallback: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-poppins", // Add this
});

export const comfortaa = Comfortaa({
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal"],
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: true,
  subsets: ["latin", "latin-ext"],
});

export const rubik = Rubik({
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: true,
  subsets: ["latin", "latin-ext"],
});

export const urbanist = Urbanist({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: true,
  subsets: ["latin", "latin-ext"],
  variable: "--font-urbanist", // Add this
});
