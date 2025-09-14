// Kanban board JavaScript

const kanbanData = {
  New: [],
  "In Progress": [],
  Resolved: [],
  Closed: [],
}

const utils = {
  apiRequest: async (url, options = {}) => {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  },
  getPriorityClass: (priority) => {
    // Example implementation
    return `priority-${priority.toLowerCase()}`
  },
  escapeHtml: (text) => {
    // Example implementation
    return text.replace(/[&<>"']/g, (match) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[match]
    })
  },
  formatDate: (date) => {
    // Example implementation
    return new Date(date).toLocaleDateString()
  },
  showError: (message) => {
    // Example implementation
    console.error(message)
  },
}

const checkAuth = async () => {
  // Example implementation
  return true // Assume user is authenticated
}

document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  const user = await checkAuth()
  if (!user) return

  // Load kanban data
  await loadKanbanData()

  // Setup drag and drop
  setupDragAndDrop()
})

async function loadKanbanData() {
  try {
    const response = await utils.apiRequest("bugs.php?action=list&per_page=100")

    // Clear existing data
    Object.keys(kanbanData).forEach((status) => {
      kanbanData[status] = []
    })

    // Group bugs by status
    response.bugs.forEach((bug) => {
      if (kanbanData[bug.status]) {
        kanbanData[bug.status].push(bug)
      }
    })

    // Display the kanban board
    displayKanbanBoard()
    updateBugCounts()
  } catch (error) {
    console.error("Failed to load kanban data:", error)
    utils.showError("Failed to load kanban board")
  }
}

function displayKanbanBoard() {
  Object.keys(kanbanData).forEach((status) => {
    const columnId = getColumnId(status)
    const column = document.getElementById(columnId)

    if (!column) return

    if (kanbanData[status].length === 0) {
      column.innerHTML = `
                <div class="kanban-empty">
                    <i class="fas fa-inbox"></i>
                    <p>No ${status.toLowerCase()} bugs</p>
                </div>
            `
    } else {
      column.innerHTML = kanbanData[status].map((bug) => createKanbanCard(bug)).join("")
    }
  })
}

function createKanbanCard(bug) {
  return `
        <div class="kanban-card priority-${bug.priority.toLowerCase()}" 
             draggable="true" 
             data-bug-id="${bug.bug_id}"
             data-status="${bug.status}">
            <div class="card-header">
                <span class="card-id">#${bug.bug_id}</span>
                <span class="card-priority badge ${utils.getPriorityClass(bug.priority)}">
                    ${bug.priority}
                </span>
            </div>
            <div class="card-title">
                <a href="bugdetail.html?id=${bug.bug_id}">
                    ${utils.escapeHtml(bug.title)}
                </a>
            </div>
            <div class="card-meta">
                <div class="card-assignee">
                    <i class="fas fa-user"></i>
                    <span>${bug.assignee_name || "Unassigned"}</span>
                </div>
                <div class="card-date">
                    ${utils.formatDate(bug.created_at).split(",")[0]}
                </div>
            </div>
        </div>
    `
}

function getColumnId(status) {
  const columnMap = {
    New: "new-column",
    "In Progress": "progress-column",
    Resolved: "resolved-column",
    Closed: "closed-column",
  }
  return columnMap[status]
}

function updateBugCounts() {
  Object.keys(kanbanData).forEach((status) => {
    const countId = getCountId(status)
    const countElement = document.getElementById(countId)
    if (countElement) {
      countElement.textContent = kanbanData[status].length
    }
  })
}

function getCountId(status) {
  const countMap = {
    New: "new-count",
    "In Progress": "progress-count",
    Resolved: "resolved-count",
    Closed: "closed-count",
  }
  return countMap[status]
}

function setupDragAndDrop() {
  // Add drag event listeners to cards
  document.addEventListener("dragstart", handleDragStart)
  document.addEventListener("dragend", handleDragEnd)

  // Add drop event listeners to columns
  document.querySelectorAll(".column-content").forEach((column) => {
    column.addEventListener("dragover", handleDragOver)
    column.addEventListener("drop", handleDrop)
    column.addEventListener("dragenter", handleDragEnter)
    column.addEventListener("dragleave", handleDragLeave)
  })
}

function handleDragStart(e) {
  if (!e.target.classList.contains("kanban-card")) return

  e.target.classList.add("dragging")
  e.dataTransfer.setData("text/plain", e.target.dataset.bugId)
  e.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      bugId: e.target.dataset.bugId,
      currentStatus: e.target.dataset.status,
    }),
  )
}

function handleDragEnd(e) {
  if (!e.target.classList.contains("kanban-card")) return

  e.target.classList.remove("dragging")
}

function handleDragOver(e) {
  e.preventDefault()
}

function handleDragEnter(e) {
  if (e.target.classList.contains("column-content")) {
    e.target.classList.add("drag-over")
  }
}

function handleDragLeave(e) {
  if (e.target.classList.contains("column-content")) {
    e.target.classList.remove("drag-over")
  }
}

async function handleDrop(e) {
  e.preventDefault()

  if (!e.target.classList.contains("column-content")) return

  e.target.classList.remove("drag-over")

  try {
    const data = JSON.parse(e.dataTransfer.getData("application/json"))
    const newStatus = e.target.closest(".kanban-column").dataset.status

    if (data.currentStatus === newStatus) return // No change needed

    // Update bug status via API
    await updateBugStatusKanban(data.bugId, newStatus)

    // Reload kanban data
    await loadKanbanData()
  } catch (error) {
    console.error("Drop failed:", error)
    utils.showError("Failed to update bug status")
  }
}

async function updateBugStatusKanban(bugId, newStatus) {
  try {
    const formData = new FormData()
    formData.append("bug_id", bugId)
    formData.append("status", newStatus)

    await utils.apiRequest("updatebugstatus.php", {
      method: "POST",
      body: formData,
      headers: {},
    })

    // Show success message briefly
    const toast = document.createElement("div")
    toast.className = "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50"
    toast.textContent = `Bug #${bugId} moved to ${newStatus}`
    document.body.appendChild(toast)

    setTimeout(() => {
      document.body.removeChild(toast)
    }, 2000)
  } catch (error) {
    throw error
  }
}
