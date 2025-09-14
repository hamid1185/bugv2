<?php
require_once '../config/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

requireLogin();

$action = $_GET['action'] ?? 'stats';

switch($action) {
    case 'stats':
        getDashboardStats();
        break;
    case 'recent':
        getRecentBugs();
        break;
    case 'charts':
        getChartData();
        break;
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

function getDashboardStats() {
    global $pdo;
    
    // Total bugs
    $stmt = $pdo->query("SELECT COUNT(*) FROM bugs");
    $totalBugs = $stmt->fetchColumn();
    
    // Bugs by status
    $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM bugs GROUP BY status");
    $statusCounts = $stmt->fetchAll();
    
    // Bugs by priority
    $stmt = $pdo->query("SELECT priority, COUNT(*) as count FROM bugs GROUP BY priority");
    $priorityCounts = $stmt->fetchAll();
    
    // My assigned bugs
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM bugs WHERE assignee_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $myBugs = $stmt->fetchColumn();
    
    // Recent activity (last 7 days)
    $stmt = $pdo->query("SELECT COUNT(*) FROM bugs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $recentBugs = $stmt->fetchColumn();
    
    jsonResponse([
        'total_bugs' => $totalBugs,
        'my_bugs' => $myBugs,
        'recent_bugs' => $recentBugs,
        'status_counts' => $statusCounts,
        'priority_counts' => $priorityCounts
    ]);
}

function getRecentBugs() {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT b.*, p.name as project_name,
               reporter.name as reporter_name,
               assignee.name as assignee_name
        FROM bugs b
        LEFT JOIN projects p ON b.project_id = p.project_id
        LEFT JOIN users reporter ON b.reporter_id = reporter.user_id
        LEFT JOIN users assignee ON b.assignee_id = assignee.user_id
        ORDER BY b.created_at DESC
        LIMIT 10
    ");
    
    $stmt->execute();
    $recentBugs = $stmt->fetchAll();
    
    jsonResponse(['recent_bugs' => $recentBugs]);
}

function getChartData() {
    global $pdo;
    
    // Bugs created over time (last 30 days)
    $stmt = $pdo->query("
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM bugs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
    ");
    $bugsOverTime = $stmt->fetchAll();
    
    // Resolution time analysis
    $stmt = $pdo->query("
        SELECT 
            AVG(DATEDIFF(updated_at, created_at)) as avg_resolution_days,
            priority
        FROM bugs 
        WHERE status = 'Resolved'
        GROUP BY priority
    ");
    $resolutionTimes = $stmt->fetchAll();
    
    jsonResponse([
        'bugs_over_time' => $bugsOverTime,
        'resolution_times' => $resolutionTimes
    ]);
}
?>
