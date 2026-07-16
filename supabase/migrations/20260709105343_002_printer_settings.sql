/*
# Add Printer Configuration Settings

This migration adds default printer configuration settings for receipt printing
with Xprinter support including auto-cut functionality.

## Settings Added:
- Printer type: network, usb, bluetooth
- Printer IP address and port (for network printers)
- Paper width: 58mm or 80mm
- Auto-cut: Enable/disable automatic paper cutting
- Receipt header/footer
- Font size settings
- Print itemized receipt toggle
- Print QR code toggle
*/

-- Insert printer configuration settings
INSERT INTO system_settings (key, value, description) VALUES
('printer_type', 'network', 'Printer connection type: network, usb, bluetooth'),
('printer_ip', '192.168.1.100', 'Network printer IP address'),
('printer_port', '9100', 'Network printer port'),
('printer_paper_width', '80', 'Paper width in mm: 58 or 80'),
('printer_auto_cut', 'true', 'Enable auto paper cut after printing'),
('printer_cut_type', 'full', 'Cut type: full or partial'),
('printer_feed_lines', '5', 'Number of lines to feed before cut'),
('receipt_show_logo', 'true', 'Show company logo on receipt'),
('receipt_show_barcode', 'false', 'Show barcode on receipt'),
('receipt_show_qr', 'false', 'Show QR code on receipt'),
('receipt_font_size', 'normal', 'Receipt font size: small, normal, large'),
('receipt_show_tax', 'true', 'Show tax breakdown on receipt'),
('receipt_footer_line1', 'Thank you for your business!', 'Receipt footer line 1'),
('receipt_footer_line2', 'Please come again', 'Receipt footer line 2'),
('receipt_footer_line3', 'Powered by ERICKO POS', 'Receipt footer line 3'),
('receipt_print_copy', '1', 'Number of receipt copies to print'),
('receipt_customer_copy_prompt', 'true', 'Prompt for customer copy after sale')
ON CONFLICT (key) DO NOTHING;

-- Create a table for printer configurations if needed for multi-printer
CREATE TABLE IF NOT EXISTS receipt_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    template_config jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default receipt template
INSERT INTO receipt_templates (name, is_default, template_config) VALUES
('Default Receipt', true, '{
  "showLogo": true,
  "showCompanyInfo": true,
  "showCustomerInfo": true,
  "showItemDetails": true,
  "showTaxBreakdown": true,
  "showPaymentDetails": true,
  "showFooter": true,
  "showBarcode": false,
  "showQRCode": false,
  "fontSize": "normal",
  "fontStyle": "normal",
  "alignment": "left",
  "paperWidth": 80,
  "margins": {"top": 0, "bottom": 0, "left": 0, "right": 0}
}')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_receipt_templates_crud" ON receipt_templates;
CREATE POLICY "anon_receipt_templates_crud" ON receipt_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);