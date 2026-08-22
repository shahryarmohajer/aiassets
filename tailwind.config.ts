import type { Config } from "tailwindcss";

// Design tokens — "card catalog" concept: a search index for AI assets,
// styled like a library/terminal index rather than a generic SaaS dashboard.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0D12", // near-black, blue-tinted background
        surface: "#14171F",
        surface2: "#1B1F2A",
        line: "#262B38",
        muted: "#8B92A5",
        paper: "#E8EAF0",
        amber: "#F5B942", // primary accent — index-tab amber
        indigo2: "#5B5FEF", // secondary accent — link/interactive
        mint: "#3ECF8E", // success / active status
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        card: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
