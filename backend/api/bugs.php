<?php
require_once '../config/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch($method) {
    case 'GET':
        if ($action === 'list') {
            getBugsList();
        } elseif ($action === 'details') {
            getBugDetails();
        } elseif ($action === 'search') {
            searchBugs();
        } else {
            jsonResponse(['error' => 'Invalid action'], 400);
        }
        break;
    case 'POST':
        if ($action === 'create') {
            createBug();
        } elseif ($action === 'comment') {
            addComment();
        } else {
            jsonResponse(['error' => 'Invalid action'], 400);
        }
        break;
    case 'PUT':
        if ($action === 'update') {
            updateBug();
        } else {
            jsonResponse(['error' => 'Invalid action'], 400);
        }
        break;
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function getBugsList() {
    requireLogin();
    
    global $pdo;
    
    $page = max(1, intval($_GET['page'] ?? 1));
    $offset = ($page - 1) * BUGS_PER_PAGE;
    
    $filters = [];
    $params = [];
    
    if (!empty($_GET['status'])) {
        $filters[] = "b.status = ?";
        $params[] = $_GET['status'];
    }
    
    if (!empty($_GET['priority'])) {
        $filters[] = "b.priority = ?";
        $params[] = $_GET['priority'];
    }
    
    if (!empty($_GET['assignee'])) {
        $filters[] = "b.assignee_id = ?";
        $params[] = $_GET['assignee'];
    }
    
    $whereClause = !empty($filters) ? 'WHERE ' . implode(' AND ', $filters) : '';
    
    $sql = "SELECT b.*, p.name as project_name, 
                   reporter.name as reporter_name,
                   assignee.name as assignee_name
            FROM bugs b
            LEFT JOIN projects p ON b.project_id = p.project_id
            LEFT JOIN users reporter ON b.reporter_id = reporter.user_id
            LEFT JOIN users assignee ON b.assignee_id = assignee.user_id
            $whereClause
            ORDER BY b.created_at DESC
            LIMIT " . BUGS_PER_PAGE . " OFFSET $offset";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bugs = $stmt->fetchAll();
    
    // Get total count
    $countSql = "SELECT COUNT(*) FROM bugs b $whereClause";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalBugs = $countStmt->fetchColumn();
    
    jsonResponse([
        'bugs' => $bugs,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => ceil($totalBugs / BUGS_PER_PAGE),
            'total_bugs' => $totalBugs
        ]
    ]);
}

function getBugDetails() {
    requireLogin();
    
    $bugId = intval($_GET['id'] ?? 0);
    if (!$bugId) {
        jsonResponse(['error' => 'Bug ID required'], 400);
    }
    
    global $pdo;
    
    // Get bug details
    $stmt = $pdo->prepare("
        SELECT b.*, p.name as project_name, 
               reporter.name as reporter_name,
               assignee.name as assignee_name
        FROM bugs b
        LEFT JOIN projects p ON b.project_id = p.project_id
        LEFT JOIN users reporter ON b.reporter_id = reporter.user_id
        LEFT JOIN users assignee ON b.assignee_id = assignee.user_id
        WHERE b.bug_id = ?
    ");
    $stmt->execute([$bugId]);
    $bug = $stmt->fetch();
    
    if (!$bug) {
        jsonResponse(['error' => 'Bug not found'], 404);
    }
    
    // Get comments
    $stmt = $pdo->prepare("
        SELECT c.*, u.name as user_name
        FROM comments c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.bug_id = ?
        ORDER BY c.created_at ASC
    ");
    $stmt->execute([$bugId]);
    $comments = $stmt->fetchAll();
    
    // Get attachments
    $stmt = $pdo->prepare("SELECT * FROM attachments WHERE bug_id = ?");
    $stmt->execute([$bugId]);
    $attachments = $stmt->fetchAll();
    
    jsonResponse([
        'bug' => $bug,
        'comments' => $comments,
        'attachments' => $attachments
    ]);
}

function createBug() {
    requireLogin();
    
    $title = sanitizeInput($_POST['title'] ?? '');
    $description = sanitizeInput($_POST['description'] ?? '');
    $priority = sanitizeInput($_POST['priority'] ?? 'Medium');
    $projectId = intval($_POST['project_id'] ?? 0);
    $assigneeId = intval($_POST['assignee_id'] ?? 0) ?: null;
    
    if (empty($title) || empty($description)) {
        jsonResponse(['error' => 'Title and description are required'], 400);
    }
    
    global $pdo;
    
    // Check for duplicates using FULLTEXT search
    $stmt = $pdo->prepare("
        SELECT bug_id, title, 
               MATCH(title, description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
        FROM bugs 
        WHERE MATCH(title, description) AGAINST(? IN NATURAL LANGUAGE MODE)
        AND relevance > 0.5
        ORDER BY relevance DESC
        LIMIT 5
    ");
    $stmt->execute([$title . ' ' . $description, $title . ' ' . $description]);
    $duplicates = $stmt->fetchAll();
    
    if (!empty($duplicates)) {
        jsonResponse([
            'warning' => 'Potential duplicates found',
            'duplicates' => $duplicates
        ]);
        return;
    }
    
    // Create the bug
    $stmt = $pdo->prepare("
        INSERT INTO bugs (project_id, title, description, priority, assignee_id, reporter_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    
    if ($stmt->execute([$projectId ?: null, $title, $description, $priority, $assigneeId, $_SESSION['user_id']])) {
        $bugId = $pdo->lastInsertId();
        jsonResponse(['success' => true, 'bug_id' => $bugId, 'message' => 'Bug created successfully']);
    } else {
        jsonResponse(['error' => 'Failed to create bug'], 500);
    }
}

function updateBug() {
    requireLogin();
    
    $bugId = intval($_GET['id'] ?? 0);
    if (!$bugId) {
        jsonResponse(['error' => 'Bug ID required'], 400);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    global $pdo;
    
    // Get current bug data for history tracking
    $stmt = $pdo->prepare("SELECT * FROM bugs WHERE bug_id = ?");
    $stmt->execute([$bugId]);
    $currentBug = $stmt->fetch();
    
    if (!$currentBug) {
        jsonResponse(['error' => 'Bug not found'], 404);
    }
    
    $updates = [];
    $params = [];
    
    foreach (['title', 'description', 'priority', 'status', 'assignee_id'] as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = ?";
            $params[] = $input[$field];
            
            // Track history
            if ($currentBug[$field] != $input[$field]) {
                $historyStmt = $pdo->prepare("
                    INSERT INTO bug_history (bug_id, changed_by, field_changed, old_value, new_value)
                    VALUES (?, ?, ?, ?, ?)
                ");
                $historyStmt->execute([
                    $bugId,
                    $_SESSION['user_id'],
                    $field,
                    $currentBug[$field],
                    $input[$field]
                ]);
            }
        }
    }
    
    if (empty($updates)) {
        jsonResponse(['error' => 'No fields to update'], 400);
    }
    
    $params[] = $bugId;
    $sql = "UPDATE bugs SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE bug_id = ?";
    
    $stmt = $pdo->prepare($sql);
    if ($stmt->execute($params)) {
        jsonResponse(['success' => true, 'message' => 'Bug updated successfully']);
    } else {
        jsonResponse(['error' => 'Failed to update bug'], 500);
    }
}

function addComment() {
    requireLogin();
    
    $bugId = intval($_POST['bug_id'] ?? 0);
    $comment = sanitizeInput($_POST['comment'] ?? '');
    
    if (!$bugId || empty($comment)) {
        jsonResponse(['error' => 'Bug ID and comment are required'], 400);
    }
    
    global $pdo;
    
    $stmt = $pdo->prepare("INSERT INTO comments (bug_id, user_id, comment_text) VALUES (?, ?, ?)");
    if ($stmt->execute([$bugId, $_SESSION['user_id'], $comment])) {
        jsonResponse(['success' => true, 'message' => 'Comment added successfully']);
    } else {
        jsonResponse(['error' => 'Failed to add comment'], 500);
    }
}

function searchBugs() {
    requireLogin();
    
    $query = sanitizeInput($_GET['q'] ?? '');
    if (empty($query)) {
        jsonResponse(['error' => 'Search query required'], 400);
    }
    
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT b.*, p.name as project_name,
               reporter.name as reporter_name,
               assignee.name as assignee_name,
               MATCH(b.title, b.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
        FROM bugs b
        LEFT JOIN projects p ON b.project_id = p.project_id
        LEFT JOIN users reporter ON b.reporter_id = reporter.user_id
        LEFT JOIN users assignee ON b.assignee_id = assignee.user_id
        WHERE MATCH(b.title, b.description) AGAINST(? IN NATURAL LANGUAGE MODE)
        ORDER BY relevance DESC
        LIMIT 20
    ");
    
    $stmt->execute([$query, $query]);
    $results = $stmt->fetchAll();
    
    jsonResponse(['results' => $results]);
}
?>
