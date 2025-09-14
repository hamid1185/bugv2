// Dashboard JavaScript

// Declare the checkAuth and utils variables
const checkAuth = async () => {
  // Placeholder for authentication check logic
  return true // Assuming authentication is successful for demonstration
}

const utils = {
  apiRequest: async (url) => {
    // Placeholder for API request logic
    return {
      total_bugs: 100,
      my_bugs: 20,
      status_counts: [
        { status: "New", count: 30 },
        { status: "In Progress", count: 40 },
      ],
      priority_counts: [{ priority: "Critical", count: 10 }],
    }
  },
  escapeHtml: (str) => {
    // Placeholder for HTML escaping logic
    return str
  },
  getPriorityClass: (priority) => {
    // Placeholder for priority class logic
    return "priority-class"
  },
  getStatusClass: (status) => {
    // Placeholder for status class logic
    return "status-class"
  },
  formatDate: (date) => {
    // Placeholder for date formatting logic
    return date
  },
}

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  const user = await checkAuth()
  if (!user) return

  // Load dashboard data
  loadDashboardStats()
  loadRecentBugs()
  loadMyBugs()
})

async function loadDashboardStats() {
  try {
    const response = await utils.apiRequest("dashboard.php?action=stats")
    displayStats(response)
    displayStatusOverview(response.status_counts)
  } catch (error) {
    console.error("Failed to load dashboard stats:", error)
    utils.showError("Failed to load dashboard statistics")
  }
}

function displayStats(stats) {
  // Update stat cards
  const totalBugs = document.getElementById("total-bugs")
  const activeBugs = document.getElementById("active-bugs")
  const criticalBugs = document.getElementById("critical-bugs")
  const myBugs = document.getElementById("my-bugs")

  if (totalBugs) totalBugs.textContent = stats.total_bugs || 0
  if (myBugs) myBugs.textContent = stats.my_bugs || 0

  // Calculate active bugs (New + In Progress)
  const activeCount = stats.status_counts.reduce((sum, status) => {
    if (status.status === "New" || status.status === "In Progress") {
      return sum + Number.parseInt(status.count)
    }
    return sum
  }, 0)

  if (activeBugs) activeBugs.textContent = activeCount

  // Get critical bugs count
  const criticalCount = stats.priority_counts.find((p) => p.priority === "Critical")?.count || 0
  if (criticalBugs) criticalBugs.textContent = criticalCount
}

function displayStatusOverview(statusCounts) {
  const container = document.getElementById("status-overview")
  if (!container) return

  const statusMap = {
    New: { color: "new", count: 0 },
    "In Progress": { color: "progress", count: 0 },
    Resolved: { color: "resolved", count: 0 },
    Closed: { color: "closed", count: 0 },
  }

  // Update counts from API response
  statusCounts.forEach((status) => {
    if (statusMap[status.status]) {
      statusMap[status.status].count = status.count
    }
  })

  container.innerHTML = Object.entries(statusMap)
    .map(
      ([status, data]) => `
        <div class="status-item">
            <div class="status-item-label">
                <div class="status-dot ${data.color}"></div>
                <span>${status}</span>
            </div>
            <span class="font-medium">${data.count}</span>
        </div>
    `,
    )
    .join("")
}

async function loadRecentBugs() {
  try {
    const response = await utils.apiRequest("dashboard.php?action=recent")
    displayRecentBugs(response.recent_bugs)
  } catch (error) {
    console.error("Failed to load recent bugs:", error)
    const tbody = document.querySelector("#recent-bugs-table tbody")
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500">Failed to load recent bugs</td></tr>'
    }
  }
}

function displayRecentBugs(bugs) {
  const tbody = document.querySelector("#recent-bugs-table tbody")
  if (!tbody) return

  if (bugs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500">No recent bugs</td></tr>'
    return
  }

  tbody.innerHTML = bugs
    .map(
      (bug) => `
        <tr>
            <td>
                <a href="bugdetail.html?id=${bug.bug_id}" class="font-medium text-blue-600 hover:text-blue-800">
                    #${bug.bug_id}: ${utils.escapeHtml(bug.title.substring(0, 40))}${bug.title.length > 40 ? "..." : ""}
                </a>
            </td>
            <td class="hidden-mobile">
                <span class="badge ${utils.getPriorityClass(bug.priority)}">
                    ${bug.priority}
                </span>
            </td>
            <td class="hidden-tablet">
                <span class="badge ${utils.getStatusClass(bug.status)}">
                    ${bug.status}
                </span>
            </td>
            <td class="hidden-desktop">${utils.formatDate(bug.created_at)}</td>
        </tr>
    `,
    )
    .join("")
}

async function loadMyBugs() {
  try {
    const response = await utils.apiRequest("bugs.php?action=list&assignee=" + encodeURIComponent("me"))
    displayMyBugs(response.bugs)
  } catch (error) {
    console.error("Failed to load my bugs:", error)
    const container = document.getElementById("my-bugs-list")
    if (container) {
      container.innerHTML = '<div class="text-center text-red-500">Failed to load assigned bugs</div>'
    }
  }
}

function displayMyBugs(bugs) {
  const container = document.getElementById("my-bugs-list")
  if (!container) return

  if (bugs.length === 0) {
    container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-check-circle text-3xl mb-2 text-green-400"></i>
                <p>All caught up!</p>
            </div>
        `
    return
  }

  container.innerHTML = bugs
    .slice(0, 5)
    .map(
      (bug) => `
        <div class="bug-item">
            <div class="bug-item-header">
                <a href="bugdetail.html?id=${bug.bug_id}" class="bug-item-title">
                    #${bug.bug_id}: ${utils.escapeHtml(bug.title.substring(0, 50))}${bug.title.length > 50 ? "..." : ""}
                </a>
                <div class="bug-item-badges">
                    <span class="badge ${utils.getPriorityClass(bug.priority)}">
                        ${bug.priority}
                    </span>
                    <span class="badge ${utils.getStatusClass(bug.status)}">
                        ${bug.status}
                    </span>
                </div>
            </div>
        </div>
    `,
    )
    .join("")
}
