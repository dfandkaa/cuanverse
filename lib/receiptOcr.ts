export interface ParsedReceiptItem {
  name: string;
  price: number;
}

export interface ParsedReceipt {
  merchant: string;
  total: number;
  categoryKey: 'food' | 'shopping' | 'bills' | 'fun' | 'transport';
  confidence: number;
  items?: ParsedReceiptItem[];
}

const MOCK_RECEIPTS: ParsedReceipt[] = [
  {
    merchant: 'Indomaret / Alfamart',
    total: 45500,
    categoryKey: 'food',
    confidence: 0.94,
    items: [
      { name: 'Roti Tawar & Susu UHT', price: 28500 },
      { name: 'Air Mineral 1.5L', price: 17000 },
    ],
  },
  {
    merchant: 'Kopi Kenangan',
    total: 38000,
    categoryKey: 'fun',
    confidence: 0.91,
    items: [
      { name: 'Kopi Kenangan Mantan (L)', price: 26000 },
      { name: 'Roti Coklat', price: 12000 },
    ],
  },
  {
    merchant: 'SPBU Pertamina',
    total: 50000,
    categoryKey: 'transport',
    confidence: 0.98,
    items: [{ name: 'Pertamax 3.7L', price: 50000 }],
  },
];

export async function mockReceiptOcr(_file: File): Promise<ParsedReceipt> {
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const randomIndex = Math.floor(Math.random() * MOCK_RECEIPTS.length);
  return MOCK_RECEIPTS[randomIndex];
}