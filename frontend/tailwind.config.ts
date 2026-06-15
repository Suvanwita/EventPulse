import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#edf7ff",
        campus: "#00e5ff",
        signal: "#facc15",
        coral: "#fb7185",
        mist: "rgba(148, 163, 184, 0.12)",
        void: "#050812",
        panel: "rgba(8, 17, 31, 0.72)",
        violet: "#a78bfa",
        lime: "#a3e635",
        amber: "#f59e0b",
      },
      boxShadow: {
        soft: "0 22px 80px rgba(0, 229, 255, 0.08)",
        glow: "0 0 32px rgba(0, 229, 255, 0.22)",
        violet: "0 0 36px rgba(167, 139, 250, 0.20)",
      },
    },
  },
  plugins: [],
};

export default config;
