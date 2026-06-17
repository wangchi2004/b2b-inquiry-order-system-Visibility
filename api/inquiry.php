<?php

header('Content-Type: application/json');

function respond(array $payload): void
{
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'message' => 'Invalid request method.']);
}

$config = require __DIR__ . '/../config/database.php';
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['customer']['email']) || empty($input['items'])) {
    respond(['ok' => false, 'message' => 'Please complete your contact details and cart.']);
}

if (($config['password'] ?? '') === 'CHANGE_THIS_PASSWORD') {
    respond(['ok' => true, 'message' => 'Demo mode: inquiry was not saved because database password is not configured.']);
}

try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['host'],
        $config['database'],
        $config['charset']
    );
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $pdo->beginTransaction();

    $customer = $input['customer'];
    $stmt = $pdo->prepare(
        'INSERT INTO inquiries (customer_name, email, company, phone, message, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        trim($customer['customer_name'] ?? ''),
        trim($customer['email'] ?? ''),
        trim($customer['company'] ?? ''),
        trim($customer['phone'] ?? ''),
        trim($customer['message'] ?? ''),
        'new',
    ]);

    $inquiryId = (int) $pdo->lastInsertId();
    $itemStmt = $pdo->prepare(
        'INSERT INTO inquiry_items (inquiry_id, product_id, size_label, quantity) VALUES (?, ?, ?, ?)'
    );

    foreach ($input['items'] as $item) {
        foreach ($item['sizes'] as $size) {
            $itemStmt->execute([
                $inquiryId,
                (int) $item['product_id'],
                (string) $size['size'],
                max(1, (int) $size['quantity']),
            ]);
        }
    }

    $pdo->commit();
    respond(['ok' => true, 'message' => 'Inquiry saved.']);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    respond(['ok' => false, 'message' => 'Database error. Please check configuration.']);
}
