import { useState } from 'react';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const MASTER_DATA = {
  locations: [
    { id: 'HQ_JAKARTA', name_en: 'HQ Jakarta', name_id: 'HQ Jakarta', type: 'headquarters' },
    { id: 'KAIMANA', name_en: 'Kaimana', name_id: 'Kaimana', type: 'operations' },
    { id: 'SAUMLAKI', name_en: 'Saumlaki', name_id: 'Saumlaki', type: 'factory' },
    { id: 'JAKARTA_CS', name_en: 'Jakarta Cold Storage', name_id: 'Cold Storage Jakarta', type: 'storage' }
  ],
  units: [
    { id: 'KAIMANA_GUDANG_TERI_01', locationId: 'KAIMANA', name_en: 'Gudang Ikan Teri 01', name_id: 'Gudang Ikan Teri 01', type: 'GUDANG_IKAN_TERI' },
    { id: 'KAIMANA_CS_01', locationId: 'KAIMANA', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' },
    { id: 'SAUMLAKI_FACTORY_01', locationId: 'SAUMLAKI', name_en: 'Factory 01', name_id: 'Pabrik 01', type: 'FACTORY' },
    { id: 'SAUMLAKI_CS_01', locationId: 'SAUMLAKI', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' },
    { id: 'TRANSPORT_BOAT_01', locationId: 'TRANSPORT', name_en: 'Transport Boat 01', name_id: 'Kapal Transport 01', type: 'TRANSPORT_BOAT' },
    { id: 'JAKARTA_CS_01', locationId: 'JAKARTA_CS', name_en: 'Cold Storage 01', name_id: 'Cold Storage 01', type: 'COLD_STORAGE' }
  ],
  raw_materials: [
    { id: 'anchovy', name_en: 'Anchovy', name_id: 'Ikan Teri', category: 'fish' },
    { id: 'yellowfin_tuna', name_en: 'Yellowfin Tuna', name_id: 'Tuna', category: 'fish' },
    { id: 'skipjack', name_en: 'Skipjack', name_id: 'Cakalang', category: 'fish' },
    { id: 'mahi_mahi', name_en: 'Mahi-mahi', name_id: 'Lemadang', category: 'fish' },
    { id: 'snapper', name_en: 'Snapper', name_id: 'Kakap Merah', category: 'fish' },
    { id: 'grouper', name_en: 'Grouper', name_id: 'Kerapu', category: 'fish' },
    { id: 'spanish_mackerel', name_en: 'Spanish Mackerel', name_id: 'Tenggiri', category: 'fish' },
    { id: 'trevally', name_en: 'Trevally', name_id: 'Kuwe', category: 'fish' },
    { id: 'wahoo', name_en: 'Wahoo', name_id: 'Tenggiri Papan', category: 'fish' },
    { id: 'barracuda', name_en: 'Barracuda', name_id: 'Alu-alu', category: 'fish' },
    { id: 'emperor', name_en: 'Emperor', name_id: 'Lencam', category: 'fish' }
  ],
  finished_products: [
    { id: 'tuna_loin', name_en: 'Tuna Loin', name_id: 'Tuna Loin', category: 'tuna_products' },
    { id: 'tuna_saku', name_en: 'Tuna Saku', name_id: 'Tuna Saku', category: 'tuna_products' },
    { id: 'tuna_steak', name_en: 'Tuna Steak', name_id: 'Tuna Steak', category: 'tuna_products' },
    { id: 'tuna_cube', name_en: 'Tuna Cube', name_id: 'Tuna Cube', category: 'tuna_products' },
    { id: 'fish_fillet', name_en: 'Fish Fillet', name_id: 'Fillet Ikan', category: 'general_products' },
    { id: 'fish_portion', name_en: 'Fish Portion', name_id: 'Porsi Ikan', category: 'general_products' },
    { id: 'fish_steak', name_en: 'Fish Steak', name_id: 'Steak Ikan', category: 'general_products' },
    { id: 'anchovy_dried', name_en: 'Anchovy Dried (Packed)', name_id: 'Teri Kering (Kemasan)', category: 'anchovy_products' },
    { id: 'roe', name_en: 'Roe', name_id: 'Telur Ikan', category: 'byproducts' },
    { id: 'fish_maw', name_en: 'Fish Maw', name_id: 'Gelembung Ikan', category: 'byproducts' },
    { id: 'trimmings', name_en: 'Trimmings', name_id: 'Potongan', category: 'byproducts' },
    { id: 'frames_bones', name_en: 'Frames/Bones', name_id: 'Tulang/Rangka', category: 'byproducts' }
  ],
  partners: [
    { id: 'supplier_kaimana_01', name: 'Supplier Kaimana 01', type: 'supplier', location: 'KAIMANA' },
    { id: 'supplier_saumlaki_01', name: 'Supplier Saumlaki 01', type: 'supplier', location: 'SAUMLAKI' },
    { id: 'customer_jakarta_01', name: 'Customer Jakarta 01', type: 'customer', location: 'JAKARTA' },
    { id: 'customer_export_01', name: 'Export Customer 01', type: 'customer', location: 'EXPORT' }
  ]
};

export default function BulkImport() {
  const { currentUser } = useAuth();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState(null);

  async function handleImport() {
    if (!currentUser || currentUser.role !== 'ceo') {
      alert('Only CEO can perform bulk import');
      return;
    }

    if (!confirm('This will import all master data. Continue?')) {
      return;
    }

    setImporting(true);
    setProgress('Starting import...');
    const importResults = {};

    try {
      // Import locations
      setProgress('Importing locations...');
      const batch1 = writeBatch(db);
      MASTER_DATA.locations.forEach(loc => {
        const ref = doc(db, 'locations', loc.id);
        batch1.set(ref, { ...loc, createdAt: new Date() });
      });
      await batch1.commit();
      importResults.locations = MASTER_DATA.locations.length;

      // Import units
      setProgress('Importing units...');
      const batch2 = writeBatch(db);
      MASTER_DATA.units.forEach(unit => {
        const ref = doc(db, 'units', unit.id);
        batch2.set(ref, { ...unit, createdAt: new Date() });
      });
      await batch2.commit();
      importResults.units = MASTER_DATA.units.length;

      // Import raw materials
      setProgress('Importing raw materials...');
      const batch3 = writeBatch(db);
      MASTER_DATA.raw_materials.forEach(item => {
        const ref = doc(db, 'raw_materials', item.id);
        batch3.set(ref, { ...item, createdAt: new Date() });
      });
      await batch3.commit();
      importResults.raw_materials = MASTER_DATA.raw_materials.length;

      // Import finished products
      setProgress('Importing finished products...');
      const batch4 = writeBatch(db);
      MASTER_DATA.finished_products.forEach(item => {
        const ref = doc(db, 'finished_products', item.id);
        batch4.set(ref, { ...item, createdAt: new Date() });
      });
      await batch4.commit();
      importResults.finished_products = MASTER_DATA.finished_products.length;

      // Import partners
      setProgress('Importing partners...');
      const batch5 = writeBatch(db);
      MASTER_DATA.partners.forEach(partner => {
        const ref = doc(db, 'partners', partner.id);
        batch5.set(ref, { ...partner, createdAt: new Date() });
      });
      await batch5.commit();
      importResults.partners = MASTER_DATA.partners.length;

      setProgress('Import complete!');
      setResults(importResults);
    } catch (error) {
      console.error('Import error:', error);
      setProgress(`Error: ${error.message}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Bulk Import Master Data</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
        <p className="text-yellow-800 font-semibold">⚠️ CEO Only</p>
        <p className="text-yellow-700 text-sm mt-2">
          This tool imports all master data required for the 7-day simulation.
        </p>
      </div>

      <div className="bg-white rounded shadow p-6 mb-6">
        <h2 className="font-bold mb-4">Data to Import:</h2>
        <ul className="space-y-2">
          <li>✓ {MASTER_DATA.locations.length} Locations</li>
          <li>✓ {MASTER_DATA.units.length} Units</li>
          <li>✓ {MASTER_DATA.raw_materials.length} Raw Materials</li>
          <li>✓ {MASTER_DATA.finished_products.length} Finished Products</li>
          <li>✓ {MASTER_DATA.partners.length} Partners</li>
        </ul>
      </div>

      <button
        onClick={handleImport}
        disabled={importing}
        className="bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
      >
        {importing ? 'Importing...' : 'Start Import'}
      </button>

      {progress && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-blue-800">{progress}</p>
        </div>
      )}

      {results && (
        <div className="mt-6 p-6 bg-green-50 rounded">
          <h3 className="font-bold text-green-800 mb-4">✅ Import Successful!</h3>
          <ul className="space-y-2 text-green-700">
            <li>Locations: {results.locations}</li>
            <li>Units: {results.units}</li>
            <li>Raw Materials: {results.raw_materials}</li>
            <li>Finished Products: {results.finished_products}</li>
            <li>Partners: {results.partners}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
