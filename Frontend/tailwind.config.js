/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./node_modules/flowbite/**/*.js"],
  theme: {
    extend: {
      colors: {
        primary: "#42389E",
        grey: {
          DEFAULT: "#CACED8",
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827"
        },
        light_purple: "#ECE1FF",
        greenown: "#17E098",
        orange: "#FC5924",
        green: {
          DEFAULT: "#06C698",
          50: "#E6F7F3",
          100: "#CCEFE7",
          200: "#99DFCF",
          300: "#66CFB7",
          400: "#33BF9F",
          500: "#06C698",
          600: "#059E7A",
          700: "#04775C",
          800: "#024F3E",
          900: "#01281F"
        },
        red: {
          DEFAULT: "#FE0000",
          50: "#FFE5E5",
          100: "#FFCCCC",
          200: "#FF9999",
          300: "#FF6666",
          400: "#FF3333",
          500: "#FE0000",
          600: "#CC0000",
          700: "#990000",
          800: "#660000",
          900: "#330000"
        },
        primary_dark: "#d36635",
        primary_extra_light: "#eb764133"
      },
      backgroundImage: {
        foodbanner: "url('src/assets/images/foodbanner.png')",
      },
    },
  },
  plugins: [require("flowbite/plugin")],
};
