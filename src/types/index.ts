export type ProductType = 'full_size' | 'chiet';
export type CostType = 'fixed' | 'variable';
export type Channel = 'facebook' | 'tiktok' | 'all';

export interface Product {
  id: string;
  name: string;
  brand: string;
  type: ProductType;
  size_ml: number;
  purchase_price: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CostTemplate {
  id: string;
  name: string;
  cost_type: CostType;
  is_percentage: boolean;
  default_value: number;
  channel: Channel;
  is_active: boolean;
  created_at?: string;
}

export interface SelectedCost {
  template_id: string;
  name: string;
  is_percentage: boolean;
  value: number;
  cost_type: CostType;
}

export interface PriceHistory {
  id: string;
  product_name: string;
  brand?: string;
  product_type: ProductType;
  size_ml?: number;
  // For chiết
  bottle_size_ml?: number;
  decant_size_ml?: number;
  purchase_price: number;
  costs: SelectedCost[];
  total_cost: number;
  profit_margin: number;
  selling_price: number;
  selling_price_rounded: number;
  channel: Channel;
  notes?: string;
  created_at: string;
}

export interface PriceCalculation {
  purchasePrice: number;
  costsBreakdown: { name: string; amount: number; is_percentage: boolean; rate?: number }[];
  totalCostAmount: number;
  totalCostPercent: number;
  profitMargin: number;
  costBase: number;
  sellingPrice: number;
  sellingPriceRounded: number;
}
