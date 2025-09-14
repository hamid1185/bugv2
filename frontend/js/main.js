// Main JavaScript utilities and shared functions

// API base URL - adjust this to match your backend location
const API_BASE = "../backend/api"

// Utility functions
const utils = {
  // Make API requests
  async apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}/${endpoint}`
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Request failed")
      }

      return data
    } catch (error) {
      console.error("API Request failed:", error)
      throw error
    }
  },

  // Show error message
  showError(message, containerId = "error-message") {
    const container = document.getElementById(containerId)
    if (container) {
      container.textContent = message
      container.style.display = "block"
      setTimeout(() => {
        container.style.display = "none"
      }, 5000)
    }
  },

  // Show success message
  showSuccess(message, containerId = "success-message") {
    const container = document.getElementById(containerId)
    if (container) {
      container.textContent = message
      container.style.display = "block"
      setTimeout(() => {
        container.style.display = "none"
      }, 3000)
    }
  },

  // Format date
  formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  },

  // Get priority color class
  getPriorityClass(priority) {
    const classes = {
      Low: "priority-low",
      Medium: "priority-medium",
      High: "priority-high",
      Critical: "priority-critical",
    }
    return classes[priority] || "priority-medium"
  },

  // Get status color class
  getStatusClass(status) {
    const classes = {
      New: "status-new",
      "In Progress": "status-progress",
      Resolved: "status-resolved",
      Closed: "status-closed",
    }
    return classes[status] || "status-new"
  },

  // Sanitize HTML
  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  },
}

// Authentication functions
async function checkAuth() {
  try {
    const response = await utils.apiRequest("auth.php?action=check")
    if (response.authenticated) {
      updateUserInfo(response.user)
      return response.user
    } else {
      // Redirect to login if not authenticated
      if (
        !window.location.pathname.includes("login.html") &&
        !window.location.pathname.includes("registration.html") &&
        !window.location.pathname.includes("index.html")
      ) {
        window.location.href = "login.html"
      }
      return null
    }
  } catch (error) {
    console.error("Auth check failed:", error)
    if (
      !window.location.pathname.includes("login.html") &&
      !window.location.pathname.includes("registration.html") &&
      !window.location.pathname.includes("index.html")
    ) {
      window.location.href = "login.html"
    }
    return null
  }
}

function updateUserInfo(user) {
  const userNameElements = document.querySelectorAll("#user-name, #welcome-name")
  userNameElements.forEach((element) => {
    if (element) {
      element.textContent = user.name
    }
  })
}

// Logout function
async function logout() {
  try {
    await utils.apiRequest("auth.php?action=logout", { method: "POST" })
    window.location.href = "login.html"
  } catch (error) {
    console.error("Logout failed:", error)
    // Force redirect even if logout fails
    window.location.href = "login.html"
  }
}

// Bug list functions
async function loadBugList(page = 1, filters = {}) {
  try {
    const params = new URLSearchParams({
      page: page,
      ...filters,
    })

    const response = await utils.apiRequest(`bugs.php?action=list&${params}`)
    displayBugList(response.bugs)
    displayPagination(response.pagination)
  } catch (error) {
    console.error("Failed to load bugs:", error)
    utils.showError("Failed to load bugs: " + error.message)
  }
}

function displayBugList(bugs) {
  const tbody = document.querySelector("#bugs-table tbody")
  if (!tbody) return

  if (bugs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No bugs found</td></tr>'
    return
  }

  tbody.innerHTML = bugs
    .map(
      (bug) => `
        <tr>
            <td>#${bug.bug_id}</td>
            <td>
                <a href="bugdetail.html?id=${bug.bug_id}" class="font-medium text-blue-600 hover:text-blue-800">
                    ${utils.escapeHtml(bug.title)}
                </a>
            </td>
            <td class="hidden-mobile">
                <span class="badge ${utils.getPriorityClass(bug.priority)}">
                    ${bug.priority}
                </span>
            </td>
            <td class="hidden-mobile">
                <span class="badge ${utils.getStatusClass(bug.status)}">
                    ${bug.status}
                </span>
            </td>
            <td class="hidden-tablet">${bug.assignee_name || "Unassigned"}</td>
            <td class="hidden-desktop">${utils.formatDate(bug.created_at)}</td>
            <td>
                <a href="bugdetail.html?id=${bug.bug_id}" class="btn btn-sm btn-primary">View</a>
            </td>
        </tr>
    `,
    )
    .join("")
}

function displayPagination(pagination) {
  const container = document.getElementById("pagination")
  if (!container) return

  const { current_page, total_pages } = pagination
  let html = ""

  // Previous button
  html += `<button ${current_page <= 1 ? "disabled" : ""} onclick="loadBugList(${current_page - 1})">Previous</button>`

  // Page numbers
  for (let i = Math.max(1, current_page - 2); i <= Math.min(total_pages, current_page + 2); i++) {
    html += `<button class="${i === current_page ? "active" : ""}" onclick="loadBugList(${i})">${i}</button>`
  }

  // Next button
  html += `<button ${current_page >= total_pages ? "disabled" : ""} onclick="loadBugList(${current_page + 1})">Next</button>`

  container.innerHTML = html
}

// Bug details functions
async function loadBugDetails(bugId) {
  try {
    const response = await utils.apiRequest(`bugs.php?action=details&id=${bugId}`)
    displayBugDetails(response.bug)
    displayComments(response.comments)
    displayAttachments(response.attachments)
  } catch (error) {
    console.error("Failed to load bug details:", error)
    utils.showError("Failed to load bug details: " + error.message)
  }
}

function displayBugDetails(bug) {
  document.getElementById("bug-title").textContent = `#${bug.bug_id}: ${bug.title}`
  document.getElementById("bug-id").textContent = bug.bug_id
  document.getElementById("bug-status").textContent = bug.status
  document.getElementById("bug-status").className = `badge ${utils.getStatusClass(bug.status)}`
  document.getElementById("bug-priority").textContent = bug.priority
  document.getElementById("bug-priority").className = `badge ${utils.getPriorityClass(bug.priority)}`
  document.getElementById("bug-reporter").textContent = bug.reporter_name
  document.getElementById("bug-assignee").textContent = bug.assignee_name || "Unassigned"
  document.getElementById("bug-created").textContent = utils.formatDate(bug.created_at)
  document.getElementById("bug-description-content").textContent = bug.description
}

function displayComments(comments) {
  const container = document.getElementById("comments-list")
  if (!container) return

  if (comments.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500">No comments yet</div>'
    return
  }

  container.innerHTML = comments
    .map(
      (comment) => `
        <div class="comment-item">
            <div class="comment-header">
                <span class="comment-author">${utils.escapeHtml(comment.user_name)}</span>
                <span class="comment-date">${utils.formatDate(comment.created_at)}</span>
            </div>
            <div class="comment-text">${utils.escapeHtml(comment.comment_text)}</div>
        </div>
    `,
    )
    .join("")
}

function displayAttachments(attachments) {
  const container = document.getElementById("attachments-list")
  if (!container) return

  if (attachments.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500">No attachments</div>'
    return
  }

  container.innerHTML = attachments
    .map(
      (attachment) => `
        <div class="attachment-item">
            <a href="${attachment.file_path}" target="_blank" class="text-blue-600 hover:text-blue-800">
                <i class="fas fa-paperclip"></i>
                ${utils.escapeHtml(attachment.original_name)}
            </a>
        </div>
    `,
    )
    .join("")
}

// Status update function
async function updateBugStatus(bugId, newStatus) {
  try {
    const formData = new FormData()
    formData.append("bug_id", bugId)
    formData.append("status", newStatus)

    await utils.apiRequest("updatebugstatus.php", {
      method: "POST",
      body: formData,
      headers: {}, // Remove Content-Type to let browser set it for FormData
    })

    utils.showSuccess("Status updated successfully")
    // Reload the page to show updated status
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } catch (error) {
    console.error("Failed to update status:", error)
    utils.showError("Failed to update status: " + error.message)
  }
}

// Setup filters
function setupFilters() {
  const applyBtn = document.getElementById("apply-filters")
  const clearBtn = document.getElementById("clear-filters")

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      const filters = {
        status: document.getElementById("status-filter")?.value || "",
        priority: document.getElementById("priority-filter")?.value || "",
        search: document.getElementById("search-input")?.value || "",
      }
      loadBugList(1, filters)
    })
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      document.getElementById("status-filter").value = ""
      document.getElementById("priority-filter").value = ""
      document.getElementById("search-input").value = ""
      loadBugList(1)
    })
  }
}

// Initialize common functionality
document.addEventListener("DOMContentLoaded", () => {
  // Setup logout button
  const logoutBtn = document.getElementById("logout-btn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout)
  }

  // Setup status buttons in bug details
  const statusButtons = document.querySelectorAll(".status-btn")
  statusButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const urlParams = new URLSearchParams(window.location.search)
      const bugId = urlParams.get("id")
      const newStatus = btn.dataset.status
      if (bugId && newStatus) {
        updateBugStatus(bugId, newStatus)
      }
    })
  })

  // Setup comment form
  const commentForm = document.getElementById("comment-form")
  if (commentForm) {
    commentForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const urlParams = new URLSearchParams(window.location.search)
      const bugId = urlParams.get("id")
      const comment = document.getElementById("comment-text").value.trim()

      if (!comment) {
        utils.showError("Please enter a comment")
        return
      }

      try {
        const formData = new FormData()
        formData.append("bug_id", bugId)
        formData.append("comment", comment)

        await utils.apiRequest("bugs.php?action=comment", {
          method: "POST",
          body: formData,
          headers: {},
        })

        utils.showSuccess("Comment added successfully")
        document.getElementById("comment-text").value = ""
        // Reload comments
        setTimeout(() => {
          loadBugDetails(bugId)
        }, 1000)
      } catch (error) {
        console.error("Failed to add comment:", error)
        utils.showError("Failed to add comment: " + error.message)
      }
    })
  }
})

// Export utils for use in other files
window.utils = utils
window.checkAuth = checkAuth
window.loadBugList = loadBugList
window.loadBugDetails = loadBugDetails
window.apiRequest = utils.apiRequest
window.showError = utils.showError
window.showSuccess = utils.showSuccess
