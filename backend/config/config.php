<?php
// BugSage Configuration File

// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Application settings
define('APP_NAME', 'BugSage');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'http://localhost/bugsage/');

// File upload settings
define('UPLOAD_DIR', '../uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt']);

// Pagination settings
define('BUGS_PER_PAGE', 20);

// Security settings
define('PASSWORD_MIN_LENGTH', 6);

// Include database configuration
require_once 'database.php';

// Helper functions
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit();
    }
}

function getUserRole() {
    return $_SESSION['user_role'] ?? null;
}

function isAdmin() {
    return getUserRole() === 'Admin';
}

function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

function formatDate($date) {
    return date('M j, Y g:i A', strtotime($date));
}

function getPriorityColor($priority) {
    switch($priority) {
        case 'Critical': return 'bg-red-500';
        case 'High': return 'bg-orange-500';
        case 'Medium': return 'bg-yellow-500';
        case 'Low': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
}

function getStatusColor($status) {
    switch($status) {
        case 'New': return 'bg-blue-500';
        case 'In Progress': return 'bg-purple-500';
        case 'Resolved': return 'bg-green-500';
        case 'Closed': return 'bg-gray-500';
        default: return 'bg-gray-500';
    }
}

// JSON response helper
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}
?>
