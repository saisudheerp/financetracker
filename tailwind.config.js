/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class", // enables dark mode via a 'dark' class
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        oswald: ["Oswald", "sans-serif"],
        lora: ["Lora", "serif"],
        anton: ["Anton", "sans-serif"],
        playfair: ["Playfair", "serif"],
        bbh: ["BBH Sans Hegarty", "sans-serif"],
      },
      colors: {
        primary: "#3B82F6", // blue
        secondary: "#2563EB", // darker blue
        accent: "#F59E0B", // orange/gold
        success: "#10B981", // green
        danger: "#EF4444", // red
        background: "#F3F4F6", // light gray
        darkBackground: "#1F2937", // dark mode bg
        darkText: "#F9FAFB", // text color for dark mode
      },
      borderRadius: {
        xl: "1rem", // smooth rounded corners
      },
      boxShadow: {
        card: "0 4px 15px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};
