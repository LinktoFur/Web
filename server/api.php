<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$category = isset($_GET['category']) ? $_GET['category'] : null;

function scanArticles($dir, $baseDir = '') {
    $result = [];
    $items = scandir($dir);
    
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $path = $dir . '/' . $item;
        $relativePath = $baseDir ? $baseDir . '/' . $item : $item;
        
        if (is_dir($path)) {
            $subItems = scanArticles($path, $relativePath);
            $result = array_merge($result, $subItems);
        } elseif (pathinfo($item, PATHINFO_EXTENSION) === 'md') {
            $content = file_get_contents($path);
            $result[] = [
                'path' => dirname($relativePath),
                'name' => $item,
                'content' => $content
            ];
        }
    }
    
    return $result;
}

function getFolders($dir, $baseDir = '') {
    $folders = [];
    $items = scandir($dir);
    
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $path = $dir . '/' . $item;
        $relativePath = $baseDir ? $baseDir . '/' . $item : $item;
        
        if (is_dir($path)) {
            $folders[] = $relativePath;
            $subFolders = getFolders($path, $relativePath);
            $folders = array_merge($folders, $subFolders);
        }
    }
    
    return $folders;
}

$baseDir = __DIR__;

if ($category === null) {
    $folders = getFolders($baseDir);
    $folders = array_filter($folders, function($f) {
        return !in_array($f, ['.git', '.vscode', '.kiro']);
    });
    echo json_encode([
        'folders' => array_values($folders)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} elseif ($category === '') {
    // Root directory md files (no category)
    $articles = [];
    $items = scandir($baseDir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $baseDir . '/' . $item;
        if (!is_dir($path) && pathinfo($item, PATHINFO_EXTENSION) === 'md') {
            $content = file_get_contents($path);
            $articles[] = [
                'path' => '',
                'name' => $item,
                'content' => $content
            ];
        }
    }
    echo json_encode([
        'category' => '',
        'articles' => $articles
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} else {
    $categoryPath = $baseDir . '/' . $category;
    
    if (!is_dir($categoryPath)) {
        http_response_code(404);
        echo json_encode(['error' => '分类不存在'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $articles = scanArticles($categoryPath, $category);
    echo json_encode([
        'category' => $category,
        'articles' => $articles
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
