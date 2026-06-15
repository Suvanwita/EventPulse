import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#152126",
        campus: "#1c7c6e",
        signal: "#f3b23f",
        coral: "#e76f51",
        mist: "#eef7f4",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(21, 33, 38, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;

