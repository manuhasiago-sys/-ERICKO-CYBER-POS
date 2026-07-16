export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_price: number;
  selling_price: number;
  reorder_level: number;
  is_active: boolean;
  category_id: string | null;
  category?: Category;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ProductWithStock extends Product {
  stock_quantity: number;
}

export function isLowStock(product: ProductWithStock): boolean {
  return product.stock_quantity <= product.reorder_level;
}
