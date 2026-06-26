import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./node_modules/@shadcn/ui/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        baloo: ["var(--font-baloo)", "cursive"],
        nunito: ["var(--font-nunito)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "nimi-orange": "#F26522",
        "nimi-pink": "#F94D8C",
        "nimi-gold": "#F6C600",
        "nimi-blue": "#5C9EFF",
        "nimi-green": "#00BA78",
        "nimi-bg": "#FFF7ED",
        "nimi-white": "#FFFFFF",
        "nimi-gray": "#E0E0E0",
        "nimi-dark": "#212529",
        'piko-pink': '#ff9a9e',
        'piko-purple': '#5e548e',
        'piko-cream': '#f0e6d2',
        'piko-peach': '#ffb7b2',
        'piko-paper': '#f9f7f2',
        'sidebar-indigo': '#3730A3',
        'sidebar-purple': '#4C1D95'
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
        "pulse-slow": "pulse 3s infinite",
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
