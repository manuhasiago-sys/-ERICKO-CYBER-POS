<?php
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $pdo->beginTransaction();

        $saleId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $receiptNumber = 'REC-' . strtoupper(uniqid());

        $stmt = $pdo->prepare("INSERT INTO sales (id, receipt_number, customer_id, user_id, subtotal, discount_amount, tax_amount, total_amount, amount_paid, change_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $saleId,
            $receiptNumber,
            $data['customer_id'] ?? null,
            $data['user_id'] ?? null,
            $data['subtotal'],
            $data['discount_amount'] ?? 0,
            $data['tax_amount'] ?? 0,
            $data['total_amount'],
            $data['amount_paid'],
            $data['change_amount'] ?? 0
        ]);

        if (isset($data['items']) && is_array($data['items'])) {
            $stmtItem = $pdo->prepare("INSERT INTO sale_items (id, sale_id, product_id, product_name, product_sku, quantity, unit_price, line_total) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)");
            foreach ($data['items'] as $item) {
                $stmtItem->execute([
                    $saleId,
                    $item['product_id'],
                    $item['product_name'],
                    $item['product_sku'],
                    $item['quantity'],
                    $item['unit_price'],
                    $item['line_total']
                ]);
            }
        }

        $pdo->commit();
        echo json_encode(["success" => true, "sale_id" => $saleId, "receipt_number" => $receiptNumber]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
