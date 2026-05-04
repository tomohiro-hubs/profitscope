import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecf7ff",
          100: "#d9efff",
          200: "#b8e1ff",
          300: "#88ceff",
          400: "#4fb2ff",
          500: "#228fff",
          600: "#0f72f2",
          700: "#0f5ad1",
          800: "#144cab",
          900: "#174286"
        }
      }
    },
  },
  plugins: [],
};

export default config;
