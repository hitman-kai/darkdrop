import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        card: "#0a0a0a",
        primary: "#00ff41",
        danger: "#ff0044",
        text: "#e0e0e0",
      },
      fontFamily: {
        mono: ["Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
