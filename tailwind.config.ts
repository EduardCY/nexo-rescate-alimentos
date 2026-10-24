import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        nexo: {
          green: "#22c55e",
          blue: "#0284c7",
          dark: "#0b132b",
          card: "#1c2541",
          bg: "#0b0f19",
          panel: "#0d1424",
          panel2: "#131b2e",
          os: "#d4d0c8",
          phosphor: "#00e676",
          cyan: "#00b0ff",
          amber: "#f59e0b",
          alert: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "'Courier New'", "monospace"],
        vt: ["var(--font-vt)", "'Courier New'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
