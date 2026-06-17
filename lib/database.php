<?php

function databaseConfig(): array
{
    $isLocalRequest = PHP_SAPI === 'cli' || in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1', '::1'], true);
    $localConfigPath = __DIR__ . '/../config/database.local.php';

    if ($isLocalRequest && file_exists($localConfigPath)) {
        return require $localConfigPath;
    }

    return require __DIR__ . '/../config/database.php';
}

function db(): ?PDO
{
    static $pdo = null;
    static $checked = false;

    if ($checked) {
        return $pdo;
    }

    $checked = true;
    $config = databaseConfig();

    if (($config['password'] ?? '') === 'CHANGE_THIS_PASSWORD') {
        return null;
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
    } catch (Throwable $error) {
        $pdo = null;
    }

    return $pdo;
}
