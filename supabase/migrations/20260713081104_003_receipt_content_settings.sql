-- Add receipt content toggle settings
-- These control which sections appear on the printed receipt

INSERT INTO system_settings (key, value, description) VALUES
('receipt_show_header', 'true', 'Show receipt header with company name/address/phone'),
('receipt_show_company_info', 'true', 'Show company address and phone under company name'),
('receipt_show_customer_info', 'true', 'Show customer name on receipt'),
('receipt_show_payment_details', 'true', 'Show payment method, amount paid, and change'),
('receipt_show_served_by', 'true', 'Show served by / cashier name on receipt'),
('receipt_show_timestamp', 'true', 'Show date and time on receipt'),
('receipt_timestamp_format', 'full', 'Timestamp format: date_only, time_only, full, iso'),
('receipt_served_by_label', 'Served By', 'Label for the served by / cashier field'),
('receipt_header_line', '', 'Optional custom header line below company info'),
('receipt_show_item_count', 'true', 'Show total item count on receipt'),
('receipt_show_subtotal', 'true', 'Show subtotal line on receipt'),
('receipt_show_change', 'true', 'Show change amount on receipt')
ON CONFLICT (key) DO NOTHING;
