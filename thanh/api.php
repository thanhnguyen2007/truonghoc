<?php
declare(strict_types=1);

// ============ CẤU HÌNH CSDL ============
const DB_HOST       = 'localhost';
const DB_NAME       = 'site';
const DB_USER       = 'root';
const DB_PASS       = '';
const MAX_QUERY_LEN = 200;
const MAX_RESULTS   = 5;

// TÙY CHỌN: Điền Gemini API Key nếu muốn AI tự tổng hợp, để trống sẽ dùng dữ liệu mẫu
const GEMINI_API_KEY = ''; 
// ======================================

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}

function json_out(int $code, array $payload): void
{
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

// === ĐÃ SỬA: Hàm search_articles lọc chuẩn xác theo tiêu đề trước ===
function search_articles(string $q): array
{
    $db = db();
    $q = trim($q);

    // 1. Ưu tiên tìm kiếm chính xác theo tiêu đề bài viết (Title LIKE)
    $likeTitle = '%' . addcslashes($q, '%_\\') . '%';
    $stmt = $db->prepare(
        'SELECT id, title, category, url, LEFT(content, 220) AS snippet, content
         FROM articles
         WHERE title LIKE :t1
         LIMIT ' . MAX_RESULTS
    );
    $stmt->execute([':t1' => $likeTitle]);
    $rows = $stmt->fetchAll();
    
    // Nếu tìm thấy bài viết có tiêu đề khớp, trả về luôn để tránh lan man
    if ($rows) {
        return $rows;
    }

    // 2. Nếu không thấy ở tiêu đề, mới mở rộng tìm trong nội dung (Content LIKE)
    $likeContent = '%' . addcslashes($q, '%_\\') . '%';
    $stmt = $db->prepare(
        'SELECT id, title, category, url, LEFT(content, 220) AS snippet, content
         FROM articles
         WHERE content LIKE :c1
         LIMIT ' . MAX_RESULTS
    );
    $stmt->execute([':c1' => $likeContent]);
    return $stmt->fetchAll();
}

function log_search(string $query, int $count): int
{
    $stmt = db()->prepare('INSERT INTO search_logs (query_text, results_count) VALUES (:q, :c)');
    $stmt->execute([':q' => $query, ':c' => $count]);
    return (int)db()->lastInsertId();
}

function build_answer(string $query, array $results): string
{
    $count = count($results);
    if ($count === 0) {
        return 'Không tìm thấy văn bản hay quy định nào của trường khớp với "' . $query
            . '". Bạn thử chọn các gợi ý bên dưới (như học phí, lịch thi, học bổng) nhé!';
    }
    return 'Tìm thấy ' . $count . ' thông tin quy định của nhà trường liên quan đến "' . $query . '":';
}

// ============ XỬ LÝ REQUEST ============
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(405, ['status' => 'error', 'message' => 'Phương thức không được hỗ trợ.']);
}

$body   = json_decode(file_get_contents('php://input') ?: '', true);
$action = is_array($body) ? ($body['action'] ?? 'search') : 'search';

try {
    if ($action === 'feedback') {
        $logId = (int)($body['log_id'] ?? 0);
        $vote  = (int)($body['vote'] ?? 0);
        if ($logId <= 0 || !in_array($vote, [1, -1], true)) {
            json_out(400, ['status' => 'error', 'message' => 'Dữ liệu đánh giá không hợp lệ.']);
        }
        $stmt = db()->prepare('UPDATE search_logs SET feedback = :v WHERE id = :id');
        $stmt->execute([':v' => $vote, ':id' => $logId]);
        json_out(200, ['status' => 'success']);
    }

    $query = is_array($body) ? trim((string)($body['query'] ?? '')) : '';
    if ($query === '' || mb_strlen($query, 'UTF-8') > MAX_QUERY_LEN) {
        json_out(400, ['status' => 'error', 'message' => 'Câu hỏi không hợp lệ (tối đa 200 ký tự).']);
    }

    $results = search_articles($query);
    $logId   = log_search($query, count($results));
    $answer  = build_answer($query, $results);

    $cleanResults = array_map(static fn($r) => [
        'id'       => $r['id'],
        'title'    => $r['title'],
        'category' => $r['category'] ?? 'Chung',
        'snippet'  => $r['snippet'],
        'url'      => $r['url'],
    ], $results);

    json_out(200, [
        'status'  => 'success',
        'log_id'  => $logId,
        'query'   => $query,
        'answer'  => $answer,
        'results' => $cleanResults,
    ]);
} catch (Throwable $e) {
    error_log('[copilot-api] ' . $e->getMessage());
    json_out(500, ['status' => 'error', 'message' => 'Lỗi máy chủ, vui lòng thử lại.']);
}