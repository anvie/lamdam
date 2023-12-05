import { nextui } from "@nextui-org/theme";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        "lamdam-light": {
          extend: "light",
          colors: {
            background: "#ffffff",
            foreground: "#1F2A37",
            focus: "transparent",
            primary: {
              DEFAULT: "#1F2A37",
              foreground: "#ffffff",
            },
            default: {
              DEFAULT: "#E5E7EB",
              foreground: "#1F2A37",
            },
            success: {
              DEFAULT: "#19B378",
              foreground: "#FFFFFF",
            },
            warning: {
              DEFAULT: "#FACA15",
              foreground: "#FFFFFF",
            },
            danger: {
              DEFAULT: "#EA4335",
              foreground: "#FFFFFF",
            },
            secondary: {
              DEFAULT: "#1C64F2",
              foreground: "#FFFFFF",
            },
          },
          layout: {
            disabledOpacity: "0.6",
            radius: {
              small: "6px",
              medium: "8px",
              large: "12px",
            },
            borderWidth: {
              small: "1px",
              medium: "1.5px",
              large: "3px",
            },
          },
        },
        "lamdam-dark": {
          extend: "dark",
          colors: {
            background: "#1F2A37",
            foreground: "#FFFFFF",
            focus: "transparent",
            content1: "#1F2A37",
            primary: {
              DEFAULT: "#637381",
              foreground: "#ffffff",
            },
            default: {
              DEFAULT: "#374151",
              foreground: "#ffffff",
            },
            success: {
              DEFAULT: "#19B378",
              foreground: "#FFFFFF",
            },
            warning: {
              DEFAULT: "#FACA15",
              foreground: "#FFFFFF",
            },
            danger: {
              DEFAULT: "#EA4335",
              foreground: "#FFFFFF",
            },
            secondary: {
              DEFAULT: "#1C64F2",
              foreground: "#FFFFFF",
            },
          },
          layout: {
            disabledOpacity: "0.3",
            radius: {
              small: "6px",
              medium: "8px",
              large: "12px",
            },
            borderWidth: {
              small: "1px",
              medium: "1.5px",
              large: "3px",
            },
          },
        },
      },
    }),
  ],
};
