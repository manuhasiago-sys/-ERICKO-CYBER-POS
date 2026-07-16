export interface CartItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  product_barcode: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  requires_reference: boolean;
}

export interface SalePayment {
  payment_method_id: string;
  amount: number;
  reference_number: string | null;
}

export interface Sale {
  id: string;
  receipt_number: string;
  branch_id: string;
  terminal_id: string | null;
  customer_id: string | null;
  user_id: string | null;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  status: string;
  notes: string | null;
}

export interface Customer {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_head_office: boolean;
}

export interface Terminal {
  id: string;
  code: string;
  name: string;
  branch_id: string;
  is_active: boolean;
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
}
