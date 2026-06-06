import type { StoreCategory, StoreOutlet, StoreProduct } from './types';

export const MOCK_TENANT_NAME = 'Toko Bangun Jaya';

export const MOCK_OUTLETS: StoreOutlet[] = [
  {
    id: 'outlet-pusat',
    name: 'Cabang Pusat',
    code: 'PUSAT',
    address: 'Jl. Raya No. 12, Kota X',
    pickupHoursLabel: 'Senin–Sabtu 08:00–17:00',
  },
  {
    id: 'outlet-timur',
    name: 'Cabang Timur',
    code: 'TIMUR',
    address: 'Jl. Industri No. 45, Kota X',
    pickupHoursLabel: 'Senin–Sabtu 08:00–17:00',
  },
];

export const MOCK_CATEGORIES: StoreCategory[] = [
  { id: 'all', name: 'Semua' },
  { id: 'semen', name: 'Semen' },
  { id: 'cat', name: 'Cat' },
  { id: 'pipa', name: 'Pipa' },
  { id: 'besi', name: 'Besi' },
];

export const MOCK_PRODUCTS: StoreProduct[] = [
  {
    id: 'prod-semen-gresik',
    name: 'Semen Gresik PCC 40 kg',
    sku: 'SMN-GRS-40',
    unitSymbol: 'sak',
    price: 65000,
    imageUrl: null,
    placeholderKey: 'generic-building',
    categoryId: 'semen',
    description: 'Semen Portland untuk struktur bangunan. Cocok untuk proyek rumah dan komersial.',
    stockByOutlet: { 'outlet-pusat': 120, 'outlet-timur': 45 },
    moq: 2,
    orderStep: 2,
  },
  {
    id: 'prod-cat-avian',
    name: 'Cat Avian 25kg — Putih',
    sku: 'CAT-AVN-25',
    unitSymbol: 'pail',
    price: 89000,
    imageUrl: null,
    placeholderKey: 'generic-building',
    categoryId: 'cat',
    description: 'Cat tembok premium untuk interior dan eksterior.',
    stockByOutlet: { 'outlet-pusat': 30, 'outlet-timur': 0 },
    moq: 1,
    orderStep: 1,
  },
  {
    id: 'prod-pipa-pvc',
    name: 'Pipa PVC 4" AW',
    sku: 'PIP-PVC-4',
    unitSymbol: 'batang',
    price: 42000,
    imageUrl: null,
    placeholderKey: 'generic-building',
    categoryId: 'pipa',
    description: 'Pipa PVC tekanan untuk instalasi air bersih.',
    stockByOutlet: { 'outlet-pusat': 80, 'outlet-timur': 60 },
    moq: 1,
    orderStep: 1,
  },
  {
    id: 'prod-besi-8',
    name: 'Besi Beton 8 mm',
    sku: 'BSI-8MM',
    unitSymbol: 'batang',
    price: 55000,
    imageUrl: null,
    placeholderKey: 'generic-building',
    categoryId: 'besi',
    description: 'Besi beton polos untuk struktur beton bertulang.',
    stockByOutlet: { 'outlet-pusat': 0, 'outlet-timur': 25 },
    moq: 5,
    orderStep: 5,
  },
];
