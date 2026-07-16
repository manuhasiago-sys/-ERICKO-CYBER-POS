/*
# ERICKO ENTERPRISE POS - Initial Database Schema

This migration creates the complete POS system database schema adapted from SQL Server to PostgreSQL/Supabase.

## Modules Covered:
1. **Organization** - Branches, Warehouses, Terminals
2. **Identity & RBAC** - Roles, Permissions, User Profiles, Login History
3. **HR** - Employees, Attendance, Leave, Payroll
4. **Catalog** - Categories, Brands, Units, Suppliers, Products, Variants
5. **Inventory** - Stock Levels, Movements, Transfers, Adjustments, Counts
6. **Purchasing** - Purchase Orders, Goods Received Notes, Returns, Supplier Payments
7. **Customers** - Customer Groups, Customers, Loyalty Transactions
8. **Promotions** - Coupons, Promotions
9. **POS/Sales** - Payment Methods, Sales, Sale Items, Payments, M-Pesa Transactions
10. **Expenses** - Expense Categories, Expenses
11. **Accounting** - Chart of Accounts, Journal Entries
12. **System** - Settings, Printer Configs, Backup History

## Key Design Decisions:
- Stock ledger pattern: stock_movements is immutable source of truth
- Snapshotting on sale_items: product details copied at sale time
- Soft deletes (is_deleted) on master data
- Multi-branch by design
- RBAC is data-driven via role_permissions
- M-Pesa has dedicated table with own lifecycle

## Security:
- RLS enabled on all tables
- Single-tenant mode (anon + authenticated) for demo purposes
*/

-- Organization Tables
CREATE TABLE IF NOT EXISTS branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    is_active boolean NOT NULL DEFAULT true,
    is_head_office boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false,
    UNIQUE(code)
);

CREATE TABLE IF NOT EXISTS warehouses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    code text NOT NULL,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false,
    UNIQUE(code)
);

CREATE TABLE IF NOT EXISTS terminals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    code text NOT NULL,
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false,
    UNIQUE(code)
);

-- Identity & RBAC
CREATE TABLE IF NOT EXISTS roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    module text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id uuid,
    branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
    role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    is_revoked boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS login_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
    terminal_id uuid REFERENCES terminals(id) ON DELETE SET NULL,
    login_at timestamptz NOT NULL DEFAULT now(),
    logout_at timestamptz,
    ip_address text,
    user_agent text
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- HR Module
CREATE TABLE IF NOT EXISTS employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
    employee_code text NOT NULL UNIQUE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    hire_date date,
    termination_date date,
    department text,
    position text,
    salary numeric(12,2),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS employee_attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    date date NOT NULL,
    check_in timestamptz,
    check_out timestamptz,
    status text NOT NULL DEFAULT 'present',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS employee_leave (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_payroll (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    pay_period_start date NOT NULL,
    pay_period_end date NOT NULL,
    basic_salary numeric(12,2) NOT NULL,
    allowances numeric(12,2) NOT NULL DEFAULT 0,
    deductions numeric(12,2) NOT NULL DEFAULT 0,
    net_salary numeric(12,2) NOT NULL,
    payment_date date,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Catalog Module
CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    image_url text,
    display_order int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS brands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    logo_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    abbreviation text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(abbreviation)
);

CREATE TABLE IF NOT EXISTS suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    tax_id text,
    payment_terms text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
    supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
    unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
    sku text NOT NULL,
    barcode text,
    name text NOT NULL,
    description text,
    image_url text,
    cost_price numeric(12,2) NOT NULL DEFAULT 0,
    selling_price numeric(12,2) NOT NULL,
    reorder_level int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    is_serialized boolean NOT NULL DEFAULT false,
    is_batch_tracked boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false,
    UNIQUE(sku)
);

CREATE TABLE IF NOT EXISTS product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku text NOT NULL,
    barcode text,
    name text NOT NULL,
    attributes jsonb,
    cost_price numeric(12,2) NOT NULL DEFAULT 0,
    selling_price numeric(12,2) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false,
    UNIQUE(sku)
);

CREATE TABLE IF NOT EXISTS product_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    is_primary boolean NOT NULL DEFAULT false,
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_number text NOT NULL,
    manufacturing_date date,
    expiry_date date,
    quantity int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(product_id, batch_number)
);

CREATE TABLE IF NOT EXISTS product_serials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    serial_number text NOT NULL,
    status text NOT NULL DEFAULT 'in_stock',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(serial_number)
);

-- Inventory Module
CREATE TABLE IF NOT EXISTS stock_levels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity numeric(12,3) NOT NULL DEFAULT 0,
    committed_quantity numeric(12,3) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    movement_type text NOT NULL,
    reference_type text,
    reference_id uuid,
    quantity numeric(12,3) NOT NULL,
    unit_cost numeric(12,2),
    notes text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number text NOT NULL,
    source_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    destination_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending',
    requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_at timestamptz NOT NULL DEFAULT now(),
    shipped_at timestamptz,
    received_at timestamptz,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(transfer_number)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_requested numeric(12,3) NOT NULL,
    quantity_shipped numeric(12,3) NOT NULL DEFAULT 0,
    quantity_received numeric(12,3) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_number text NOT NULL,
    warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    adjustment_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    reason text,
    total_value numeric(12,2) NOT NULL DEFAULT 0,
    requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(adjustment_number)
);

CREATE TABLE IF NOT EXISTS stock_adjustment_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_id uuid NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    current_quantity numeric(12,3) NOT NULL,
    adjusted_quantity numeric(12,3) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_counts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    count_number text NOT NULL,
    warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'pending',
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(count_number)
);

CREATE TABLE IF NOT EXISTS stock_count_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    count_id uuid NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    system_quantity numeric(12,3) NOT NULL,
    counted_quantity numeric(12,3) NOT NULL,
    variance numeric(12,3) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Purchasing Module
CREATE TABLE IF NOT EXISTS purchase_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number text NOT NULL,
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'draft',
    order_date date NOT NULL DEFAULT CURRENT_DATE,
    expected_date date,
    subtotal numeric(12,2) NOT NULL DEFAULT 0,
    tax_amount numeric(12,2) NOT NULL DEFAULT 0,
    total_amount numeric(12,2) NOT NULL DEFAULT 0,
    notes text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(po_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_ordered numeric(12,3) NOT NULL,
    quantity_received numeric(12,3) NOT NULL DEFAULT 0,
    unit_cost numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goods_received_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number text NOT NULL,
    po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    received_date date NOT NULL DEFAULT CURRENT_DATE,
    subtotal numeric(12,2) NOT NULL DEFAULT 0,
    tax_amount numeric(12,2) NOT NULL DEFAULT 0,
    total_amount numeric(12,2) NOT NULL DEFAULT 0,
    notes text,
    received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(grn_number)
);

CREATE TABLE IF NOT EXISTS goods_received_note_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id uuid NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id uuid REFERENCES product_batches(id) ON DELETE SET NULL,
    quantity_received numeric(12,3) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number text NOT NULL,
    grn_id uuid REFERENCES goods_received_notes(id) ON DELETE SET NULL,
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    return_date date NOT NULL DEFAULT CURRENT_DATE,
    subtotal numeric(12,2) NOT NULL DEFAULT 0,
    tax_amount numeric(12,2) NOT NULL DEFAULT 0,
    total_amount numeric(12,2) NOT NULL DEFAULT 0,
    reason text,
    status text NOT NULL DEFAULT 'pending',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(return_number)
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id uuid NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_returned numeric(12,3) NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number text NOT NULL,
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
    amount numeric(12,2) NOT NULL,
    payment_method text NOT NULL,
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    reference_number text,
    notes text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(payment_number)
);

-- Customers Module
CREATE TABLE IF NOT EXISTS customer_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    discount_percent numeric(5,2) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_group_id uuid REFERENCES customer_groups(id) ON DELETE SET NULL,
    code text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text NOT NULL,
    address text,
    city text,
    loyalty_points int NOT NULL DEFAULT 0,
    credit_limit numeric(12,2) NOT NULL DEFAULT 0,
    current_balance numeric(12,2) NOT NULL DEFAULT 0,
    tax_id text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false,
    UNIQUE(code)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sale_id uuid,
    points int NOT NULL,
    transaction_type text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Promotions Module
CREATE TABLE IF NOT EXISTS coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    description text,
    discount_type text NOT NULL,
    discount_value numeric(12,2) NOT NULL,
    min_purchase numeric(12,2) NOT NULL DEFAULT 0,
    max_uses int,
    uses_count int NOT NULL DEFAULT 0,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    promotion_type text NOT NULL,
    discount_value numeric(12,2) NOT NULL,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

-- POS / Sales Module
CREATE TABLE IF NOT EXISTS payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    requires_reference boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number text NOT NULL,
    branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    terminal_id uuid REFERENCES terminals(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    sale_date timestamptz NOT NULL DEFAULT now(),
    subtotal numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) NOT NULL DEFAULT 0,
    tax_amount numeric(12,2) NOT NULL DEFAULT 0,
    total_amount numeric(12,2) NOT NULL,
    amount_paid numeric(12,2) NOT NULL,
    change_amount numeric(12,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'completed',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(receipt_number)
);

CREATE TABLE IF NOT EXISTS sale_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name text NOT NULL,
    product_sku text NOT NULL,
    product_barcode text,
    quantity numeric(12,3) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) NOT NULL DEFAULT 0,
    tax_amount numeric(12,2) NOT NULL DEFAULT 0,
    line_total numeric(12,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method_id uuid NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    reference_number text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
    checkout_request_id text,
    merchant_request_id text,
    result_code text,
    result_desc text,
    amount numeric(12,2) NOT NULL,
    mpesa_receipt_number text,
    phone_number text NOT NULL,
    transaction_date timestamptz,
    status text NOT NULL DEFAULT 'pending',
    transaction_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS held_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    terminal_id uuid REFERENCES terminals(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    hold_number text NOT NULL,
    notes text,
    sale_data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(hold_number)
);

CREATE TABLE IF NOT EXISTS sale_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number text NOT NULL,
    original_sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    return_date timestamptz NOT NULL DEFAULT now(),
    subtotal numeric(12,2) NOT NULL,
    refund_amount numeric(12,2) NOT NULL,
    refund_method text NOT NULL,
    reason text,
    status text NOT NULL DEFAULT 'completed',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(return_number)
);

CREATE TABLE IF NOT EXISTS sale_return_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id uuid NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_item_id uuid NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    product_name text NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    line_total numeric(12,2) NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Expenses Module
CREATE TABLE IF NOT EXISTS expense_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    expense_number text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    payment_method text,
    reference_number text,
    notes text,
    status text NOT NULL DEFAULT 'pending',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(expense_number)
);

-- Accounting Module
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    account_type text NOT NULL,
    parent_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false,
    UNIQUE(code)
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number text NOT NULL,
    entry_date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    reference_type text,
    reference_id uuid,
    total_debit numeric(12,2) NOT NULL DEFAULT 0,
    total_credit numeric(12,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft',
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    posted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(entry_number)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit numeric(12,2) NOT NULL DEFAULT 0,
    credit numeric(12,2) NOT NULL DEFAULT 0,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- System Module
CREATE TABLE IF NOT EXISTS system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS printer_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
    terminal_id uuid REFERENCES terminals(id) ON DELETE CASCADE,
    printer_name text NOT NULL,
    printer_type text NOT NULL,
    connection_type text NOT NULL,
    ip_address text,
    port int,
    is_receipt_printer boolean NOT NULL DEFAULT true,
    is_report_printer boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backup_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type text NOT NULL,
    file_name text NOT NULL,
    file_size bigint NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    error_message text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type text NOT NULL,
    recipient text NOT NULL,
    subject text,
    body text,
    status text NOT NULL DEFAULT 'pending',
    sent_at timestamptz,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_product ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);

-- Enable RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (anon + authenticated for demo)
DROP POLICY IF EXISTS "anon_branches_crud" ON branches;
CREATE POLICY "anon_branches_crud" ON branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_warehouses_crud" ON warehouses;
CREATE POLICY "anon_warehouses_crud" ON warehouses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_terminals_crud" ON terminals;
CREATE POLICY "anon_terminals_crud" ON terminals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_roles_crud" ON roles;
CREATE POLICY "anon_roles_crud" ON roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_permissions_crud" ON permissions;
CREATE POLICY "anon_permissions_crud" ON permissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_role_permissions_crud" ON role_permissions;
CREATE POLICY "anon_role_permissions_crud" ON role_permissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_user_profiles_crud" ON user_profiles;
CREATE POLICY "anon_user_profiles_crud" ON user_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_categories_crud" ON categories;
CREATE POLICY "anon_categories_crud" ON categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_brands_crud" ON brands;
CREATE POLICY "anon_brands_crud" ON brands FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_units_crud" ON units;
CREATE POLICY "anon_units_crud" ON units FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_suppliers_crud" ON suppliers;
CREATE POLICY "anon_suppliers_crud" ON suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_products_crud" ON products;
CREATE POLICY "anon_products_crud" ON products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_product_variants_crud" ON product_variants;
CREATE POLICY "anon_product_variants_crud" ON product_variants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_product_images_crud" ON product_images;
CREATE POLICY "anon_product_images_crud" ON product_images FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_product_batches_crud" ON product_batches;
CREATE POLICY "anon_product_batches_crud" ON product_batches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_product_serials_crud" ON product_serials;
CREATE POLICY "anon_product_serials_crud" ON product_serials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_stock_levels_crud" ON stock_levels;
CREATE POLICY "anon_stock_levels_crud" ON stock_levels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_stock_movements_all" ON stock_movements;
CREATE POLICY "anon_stock_movements_all" ON stock_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_customer_groups_crud" ON customer_groups;
CREATE POLICY "anon_customer_groups_crud" ON customer_groups FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_customers_crud" ON customers;
CREATE POLICY "anon_customers_crud" ON customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_payment_methods_crud" ON payment_methods;
CREATE POLICY "anon_payment_methods_crud" ON payment_methods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_sales_crud" ON sales;
CREATE POLICY "anon_sales_crud" ON sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_sale_items_all" ON sale_items;
CREATE POLICY "anon_sale_items_all" ON sale_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_sale_payments_all" ON sale_payments;
CREATE POLICY "anon_sale_payments_all" ON sale_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_mpesa_transactions_all" ON mpesa_transactions;
CREATE POLICY "anon_mpesa_transactions_all" ON mpesa_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_held_sales_all" ON held_sales;
CREATE POLICY "anon_held_sales_all" ON held_sales FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_coupons_crud" ON coupons;
CREATE POLICY "anon_coupons_crud" ON coupons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_promotions_crud" ON promotions;
CREATE POLICY "anon_promotions_crud" ON promotions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_system_settings_crud" ON system_settings;
CREATE POLICY "anon_system_settings_crud" ON system_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed Data
INSERT INTO branches (code, name, address, phone, email, is_head_office)
VALUES ('HQ', 'Head Office', '123 Main Street, Nairobi', '+254700000000', 'info@ericko.co.ke', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO warehouses (branch_id, code, name)
SELECT id, 'WH-HQ', 'Main Warehouse' FROM branches WHERE code = 'HQ'
ON CONFLICT (code) DO NOTHING;

INSERT INTO terminals (branch_id, code, name)
SELECT id, 'T-001', 'Terminal 1' FROM branches WHERE code = 'HQ'
ON CONFLICT (code) DO NOTHING;

INSERT INTO categories (name, description, display_order) VALUES
('Electronics', 'Electronic devices and accessories', 1),
('Groceries', 'Food and household items', 2),
('Beverages', 'Soft drinks, juices, and water', 3),
('Personal Care', 'Health and beauty products', 4)
ON CONFLICT DO NOTHING;

INSERT INTO brands (name) VALUES ('Generic'), ('Samsung'), ('Coca-Cola'), ('Unilever')
ON CONFLICT (name) DO NOTHING;

INSERT INTO units (name, abbreviation) VALUES
('Piece', 'pc'), ('Kilogram', 'kg'), ('Liter', 'L'), ('Pack', 'pk')
ON CONFLICT (abbreviation) DO NOTHING;

INSERT INTO payment_methods (name, code, requires_reference) VALUES
('Cash', 'CASH', false),
('M-Pesa', 'MPESA', true),
('Card', 'CARD', true),
('Bank Transfer', 'BANK', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
('company_name', 'ERICKO ENTERPRISE', 'Company name displayed on receipts'),
('company_address', '123 Main Street, Nairobi', 'Company address'),
('company_phone', '+254700000000', 'Company phone'),
('tax_rate', '16', 'Default tax rate percentage'),
('currency', 'KES', 'Default currency'),
('receipt_prefix', 'REC', 'Receipt number prefix')
ON CONFLICT (key) DO NOTHING;

INSERT INTO products (sku, barcode, name, description, selling_price, cost_price, reorder_level)
VALUES
('SKU001', '1234567890123', 'Coca-Cola 500ml', 'Refreshing soft drink', 50.00, 35.00, 24),
('SKU002', '1234567890124', 'Bread White', 'Fresh white bread', 60.00, 45.00, 10),
('SKU003', '1234567890125', 'Milk 1L', 'Fresh pasteurized milk', 120.00, 100.00, 15),
('SKU004', '1234567890126', 'Sugar 1kg', 'Refined white sugar', 150.00, 120.00, 20),
('SKU005', '1234567890127', 'Rice 1kg', 'Premium white rice', 180.00, 150.00, 15),
('SKU006', '1234567890128', 'Cooking Oil 1L', 'Pure vegetable cooking oil', 250.00, 200.00, 10),
('SKU007', '1234567890129', 'Soap Bar', 'Bathing soap bar', 80.00, 60.00, 30),
('SKU008', '1234567890130', 'Toothpaste', 'Mint toothpaste 100ml', 180.00, 140.00, 20),
('SKU009', '1234567890131', 'Bottled Water 500ml', 'Purified drinking water', 30.00, 20.00, 50),
('SKU010', '1234567890132', 'Biscuits Pack', 'Assorted cream biscuits', 100.00, 75.00, 25)
ON CONFLICT (sku) DO NOTHING;

UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Beverages') WHERE sku IN ('SKU001', 'SKU009');
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Groceries') WHERE sku IN ('SKU002', 'SKU003', 'SKU004', 'SKU005', 'SKU006');
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Personal Care') WHERE sku IN ('SKU007', 'SKU008', 'SKU010');

INSERT INTO stock_levels (product_id, warehouse_id, quantity)
SELECT p.id, w.id, 100.0
FROM products p
CROSS JOIN warehouses w
WHERE w.code = 'WH-HQ'
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

INSERT INTO customer_groups (name, discount_percent) VALUES
('Regular', 0), ('Bronze', 5), ('Silver', 10), ('Gold', 15)
ON CONFLICT DO NOTHING;

INSERT INTO customers (code, first_name, last_name, phone, customer_group_id)
SELECT 'C001', 'John', 'Doe', '+254711111111', id FROM customer_groups WHERE name = 'Regular'
ON CONFLICT (code) DO NOTHING;