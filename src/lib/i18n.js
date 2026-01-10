import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    en: {
        translation: {
            "welcome": "Welcome",
            "receiving": "Receiving",
            "expenses": "Expenses",
            "storage": "Cold Storage",
            "requests": "Requests",
            "wallet": "Site Wallet",
            "login_title": "Login",
            "secure_access": "Secure Access",
            "email": "Email",
            "password": "Password",
            "auth_btn": "Sign In",
            "auth_loading": "Authenticating...",
            "supplier": "Supplier",
            "item": "Item",
            "qty": "Quantity (Kg)",
            "price": "Price / Kg",
            "submit_btn": "Submit",
            "save_btn": "Save Record",
            "offline": "Offline",
            "pending": "Pending",
            "logout": "Logout",
            "language": "Language",
            "auth_error": "Sign In Failed: Check your credentials.",

            // Phase 6.3 - Traceability & Yield
            "traceability_notice": "Traceability Level: Mass-Balance (Not Batch-Level)",
            "yield_critical_low": "CRITICAL LOW YIELD (<30%)",
            "yield_high": "HIGH YIELD (Check Inputs)",
            "yield_ok": "Yield OK",
            "production_run": "Production Run",
            "source_material": "Source Material",
            "processing_output": "Processing Output",
            "add_output": "Add Output",
            "confirm_production": "Confirm Production",
            "processing": "Processing..."
        }
    },
    id: {
        translation: {
            "welcome": "Selamat Datang",
            "receiving": "Penerimaan Stok",
            "expenses": "Pengeluaran",
            "storage": "Gudang Beku (Cold Storage)",
            "requests": "Permintaan Dana",
            "wallet": "Dompet Lokasi",
            "login_title": "Masuk",
            "secure_access": "Akses Aman",
            "email": "Surel",
            "password": "Kata Sandi",
            "auth_btn": "Masuk",
            "auth_loading": "Mengautentikasi...",
            "supplier": "Pemasok",
            "item": "Barang",
            "qty": "Jumlah (Kg)",
            "price": "Harga / Kg",
            "submit_btn": "Kirim",
            "save_btn": "Simpan Data",
            "offline": "Luring",
            "pending": "Tertunda",
            "logout": "Keluar",
            "language": "Bahasa",
            "auth_error": "Gagal Masuk: Periksa kredensial Anda.",

            // Phase 6.3 - Traceability & Yield
            "traceability_notice": "Tingkat Pelacakan: Keseimbangan Massa (Bukan Per-Batch)",
            "yield_critical_low": "RENDEMEN KRITIS RENDAH (<30%)",
            "yield_high": "RENDEMEN TINGGI (Cek Input)",
            "yield_ok": "Rendemen OK",
            "production_run": "Proses Produksi",
            "source_material": "Bahan Baku",
            "processing_output": "Hasil Produksi",
            "add_output": "Tambah Baris",
            "confirm_production": "Konfirmasi Produksi",
            "processing": "Sedang Proses..."
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
