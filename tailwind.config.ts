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
        },
      },
    },
  },
  plugins: [],
};

export default config;
