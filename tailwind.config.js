/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#1B2A4A', // Deep Navy
                secondary: '#006D77', // Ocean Teal
                accent: '#83C5BE', // Soft Teal
                neutral: {
                    50: '#F8F9FA',
                    100: '#E9ECEF',
                    200: '#DEE2E6',
                    800: '#343A40',
                    900: '#212529',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
