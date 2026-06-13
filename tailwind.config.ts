import type { Config } from "tailwindcss";

const config: Config = {
  // Notice we removed 'src/' from these paths to match your folder structure
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Our 2-color constraint system
        brand: {
          blue: "#2563EB", // Primary Accent (Cobalt Blue)
          dark: "#0F172A", // Primary Background/Text (Deep Slate)
          light: "#F8FAFC", // Off-white for dashboard backgrounds
          surface: "#FFFFFF", // Pure white for cards
        }
      },
    },
  },
  plugins: [],
};
export default config;