<?php
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM categories WHERE is_deleted = 0 AND is_active = 1 ORDER BY display_order ASC, name ASC");
        $categories = $stmt->fetchAll();
        echo json_encode($categories);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Generate a simple UUID-like string for id if not using MySQL's UUID() default
        $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $display_order = isset($data['display_order']) && $data['display_order'] !== '' ? (int)$data['display_order'] : 0;

        $stmt = $pdo->prepare("INSERT INTO categories (id, name, description, display_order) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $id,
            $data['name'],
            $data['description'] ?? null,
            $display_order
        ]);

        echo json_encode(["success" => true, "id" => $id, "message" => "Category added successfully"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
