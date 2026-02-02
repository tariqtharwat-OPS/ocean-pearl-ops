/**
 * EXTENDED I18N - FULL BILINGUAL SUPPORT
 * 
 * Full support for:
 * - 🇮🇩 Bahasa Indonesia (for operators & managers)
 * - 🇬🇧 English (for CEO & HQ)
 */

export const EXTENDED_TRANSLATIONS = {
    en: {
        // Unit Types
        "unit_type_gudang_ikan_teri": "Anchovy Warehouse",
        "unit_type_factory": "Factory",
        "unit_type_cold_storage": "Cold Storage",
        "unit_type_transport_boat": "Transport Boat",
        "unit_type_office": "Office / HQ",
        
        // Batch & Traceability
        "batch_ownership_our": "OUR",
        "batch_ownership_purchased": "PURCHASED",
        "batch_ownership_third_party": "THIRD PARTY",
        "batch_status_active": "Active",
        "batch_status_consumed": "Consumed",
        "batch_status_sold": "Sold",
        "batch_status_transferred": "Transferred",
        "batch_status_expired": "Expired",
        "batch_lineage": "Batch Lineage",
        "parent_batches": "Parent Batches",
        "traceability": "Traceability",
        
        // Processing
        "processing_run": "Production Run",
        "recipe": "Recipe",
        "input_material": "Input Material",
        "primary_output": "Primary Output",
        "by_product": "By-Product",
        "waste": "Waste",
        "yield": "Yield",
        "yield_percentage": "Yield %",
        "advisory_yield": "Advisory Yield",
        "add_by_product": "Add By-Product",
        "optional_by_products": "Optional By-Products",
        "waste_description": "Waste Description",
        
        // Storage
        "storage_cost": "Storage Cost",
        "cost_per_kg_per_day": "Cost per Kg/Day",
        "storage_days": "Storage Days",
        "total_storage_cost": "Total Storage Cost",
        
        // Transport
        "transport_trip": "Transport Trip",
        "freight_revenue": "Freight Revenue",
        "freight_per_kg": "Freight per Kg",
        "freight_per_trip": "Freight per Trip",
        "mixed_cargo": "Mixed Cargo",
        "our_cargo": "OUR Cargo",
        "third_party_cargo": "Third Party Cargo",
        
        // Container Shipment
        "container_shipment": "Container Shipment",
        "container_number": "Container Number",
        "export_destination": "Export Destination",
        "export_date": "Export Date",
        "hq_export_only": "HQ Export Only",
        
        // Grades (Anchovy specific)
        "grade_super": "Super",
        "grade_standard": "Standard",
        "grade_broken": "Broken",
        
        // Validation Messages
        "error_item_not_allowed": "Item not allowed for this unit type",
        "error_grade_not_allowed": "Grade not allowed for this unit type",
        "error_process_not_allowed": "Process not allowed for this unit type",
        "error_batch_mixing": "Cannot mix different ownership types",
        "error_insufficient_quantity": "Insufficient quantity in batch",
        "warning_low_yield": "CRITICAL LOW YIELD",
        "warning_high_yield": "HIGH YIELD - Check Inputs",
        "info_yield_ok": "Yield OK",
        
        // UI Labels
        "select_unit_type": "Select Unit Type",
        "unit_specialization": "Unit Specialization",
        "allowed_items": "Allowed Items",
        "allowed_grades": "Allowed Grades",
        "allowed_processes": "Allowed Processes",
        "filter_by_unit": "Filter by Unit",
        "unit_capabilities": "Unit Capabilities",
        
        // Actions
        "add_output_line": "Add Output Line",
        "remove_output": "Remove Output",
        "calculate_yield": "Calculate Yield",
        "validate_batch": "Validate Batch",
        "view_lineage": "View Lineage",
        
        // Status Messages
        "processing_in_progress": "Processing in progress...",
        "processing_completed": "Processing completed successfully",
        "batch_created": "Batch created successfully",
        "transport_scheduled": "Transport scheduled",
        "container_shipped": "Container shipped",
        
        // Financial
        "kg_day_costing": "Kg/Day Costing",
        "costing_enabled": "Costing Enabled",
        "freight_revenue_recorded": "Freight revenue recorded",
        
        // Reports
        "batch_report": "Batch Report",
        "processing_report": "Processing Report",
        "yield_report": "Yield Report",
        "storage_cost_report": "Storage Cost Report",
        "transport_report": "Transport Report",
        
        // Shark AI
        "shark_anomaly_detected": "Anomaly Detected",
        "shark_yield_check": "Yield Check",
        "shark_missing_byproduct": "Missing By-Product",
        "shark_storage_spike": "Storage Spike",
        "shark_cash_movement": "Unusual Cash Movement"
    },
    
    id: {
        // Unit Types
        "unit_type_gudang_ikan_teri": "Gudang Ikan Teri",
        "unit_type_factory": "Pabrik",
        "unit_type_cold_storage": "Gudang Beku",
        "unit_type_transport_boat": "Kapal Transportasi",
        "unit_type_office": "Kantor / HQ",
        
        // Batch & Traceability
        "batch_ownership_our": "MILIK KITA",
        "batch_ownership_purchased": "DIBELI",
        "batch_ownership_third_party": "PIHAK KETIGA",
        "batch_status_active": "Aktif",
        "batch_status_consumed": "Terpakai",
        "batch_status_sold": "Terjual",
        "batch_status_transferred": "Ditransfer",
        "batch_status_expired": "Kadaluarsa",
        "batch_lineage": "Pelacakan Batch",
        "parent_batches": "Batch Induk",
        "traceability": "Pelacakan",
        
        // Processing
        "processing_run": "Proses Produksi",
        "recipe": "Resep",
        "input_material": "Bahan Baku",
        "primary_output": "Hasil Utama",
        "by_product": "Hasil Sampingan",
        "waste": "Limbah",
        "yield": "Rendemen",
        "yield_percentage": "Rendemen %",
        "advisory_yield": "Rendemen Standar",
        "add_by_product": "Tambah Hasil Sampingan",
        "optional_by_products": "Hasil Sampingan (Opsional)",
        "waste_description": "Keterangan Limbah",
        
        // Storage
        "storage_cost": "Biaya Penyimpanan",
        "cost_per_kg_per_day": "Biaya per Kg/Hari",
        "storage_days": "Hari Penyimpanan",
        "total_storage_cost": "Total Biaya Penyimpanan",
        
        // Transport
        "transport_trip": "Perjalanan Transportasi",
        "freight_revenue": "Pendapatan Angkutan",
        "freight_per_kg": "Angkutan per Kg",
        "freight_per_trip": "Angkutan per Perjalanan",
        "mixed_cargo": "Muatan Campuran",
        "our_cargo": "Muatan KITA",
        "third_party_cargo": "Muatan Pihak Ketiga",
        
        // Container Shipment
        "container_shipment": "Pengiriman Kontainer",
        "container_number": "Nomor Kontainer",
        "export_destination": "Tujuan Ekspor",
        "export_date": "Tanggal Ekspor",
        "hq_export_only": "Hanya HQ yang Bisa Ekspor",
        
        // Grades (Anchovy specific)
        "grade_super": "Super",
        "grade_standard": "Standar",
        "grade_broken": "Pecah",
        
        // Validation Messages
        "error_item_not_allowed": "Barang tidak diizinkan untuk tipe unit ini",
        "error_grade_not_allowed": "Grade tidak diizinkan untuk tipe unit ini",
        "error_process_not_allowed": "Proses tidak diizinkan untuk tipe unit ini",
        "error_batch_mixing": "Tidak bisa mencampur tipe kepemilikan yang berbeda",
        "error_insufficient_quantity": "Jumlah di batch tidak cukup",
        "warning_low_yield": "RENDEMEN KRITIS RENDAH",
        "warning_high_yield": "RENDEMEN TINGGI - Cek Input",
        "info_yield_ok": "Rendemen OK",
        
        // UI Labels
        "select_unit_type": "Pilih Tipe Unit",
        "unit_specialization": "Spesialisasi Unit",
        "allowed_items": "Barang yang Diizinkan",
        "allowed_grades": "Grade yang Diizinkan",
        "allowed_processes": "Proses yang Diizinkan",
        "filter_by_unit": "Filter berdasarkan Unit",
        "unit_capabilities": "Kemampuan Unit",
        
        // Actions
        "add_output_line": "Tambah Baris Hasil",
        "remove_output": "Hapus Hasil",
        "calculate_yield": "Hitung Rendemen",
        "validate_batch": "Validasi Batch",
        "view_lineage": "Lihat Pelacakan",
        
        // Status Messages
        "processing_in_progress": "Proses sedang berjalan...",
        "processing_completed": "Proses selesai dengan sukses",
        "batch_created": "Batch berhasil dibuat",
        "transport_scheduled": "Transportasi dijadwalkan",
        "container_shipped": "Kontainer dikirim",
        
        // Financial
        "kg_day_costing": "Biaya Kg/Hari",
        "costing_enabled": "Biaya Diaktifkan",
        "freight_revenue_recorded": "Pendapatan angkutan dicatat",
        
        // Reports
        "batch_report": "Laporan Batch",
        "processing_report": "Laporan Produksi",
        "yield_report": "Laporan Rendemen",
        "storage_cost_report": "Laporan Biaya Penyimpanan",
        "transport_report": "Laporan Transportasi",
        
        // Shark AI
        "shark_anomaly_detected": "Anomali Terdeteksi",
        "shark_yield_check": "Cek Rendemen",
        "shark_missing_byproduct": "Hasil Sampingan Hilang",
        "shark_storage_spike": "Lonjakan Penyimpanan",
        "shark_cash_movement": "Pergerakan Kas Tidak Biasa"
    }
};

/**
 * Merge extended translations with existing i18n
 */
export function mergeTranslations(i18n) {
    Object.keys(EXTENDED_TRANSLATIONS).forEach(lang => {
        if (i18n.hasResourceBundle(lang, 'translation')) {
            i18n.addResourceBundle(lang, 'translation', EXTENDED_TRANSLATIONS[lang], true, true);
        } else {
            i18n.addResourceBundle(lang, 'translation', EXTENDED_TRANSLATIONS[lang]);
        }
    });
}
