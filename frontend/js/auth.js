// Authentication JavaScript

const utils = {
  apiRequest: async (url, options = {}) => {
    const response = await fetch(url, options)
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return response.json()
    } else {
      const text = await response.text()
      throw new Error("Server returned non-JSON response: " + text)
    }
  },
  showError: (message) => {
    alert(message)
  },
  showSuccess: (message) => {
    alert(message)
  },
}

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is already logged in
  checkAuthStatus()

  // Setup login form
  const loginForm = document.getElementById("login-form")
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }

  // Setup register form
  const registerForm = document.getElementById("register-form")
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister)
  }
})

async function checkAuthStatus() {
  try {
    const response = await utils.apiRequest("/bugsagev3/backend/api/auth.php?action=check")
    if (response.authenticated) {
      // User is already logged in, redirect to dashboard
      window.location.href = "dashboard.html"
    }
  } catch (error) {
    // User is not logged in, stay on current page
    console.log("User not authenticated")
  }
}

async function handleLogin(e) {
  e.preventDefault()

  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value

  if (!email || !password) {
    utils.showError("Please fill in all fields")
    return
  }

  try {
    const formData = new FormData()
    formData.append("email", email)
    formData.append("password", password)

    const response = await utils.apiRequest("/bugsagev3/backend/api/auth.php?action=login", {
      method: "POST",
      body: formData,
      headers: {}, // Remove Content-Type for FormData
    })

    if (response.success) {
      utils.showSuccess("Login successful! Redirecting...")
      setTimeout(() => {
        window.location.href = "dashboard.html"
      }, 1000)
    }
  } catch (error) {
    console.error("Login failed:", error)
    utils.showError(error.message || "Login failed")
  }
}

async function handleRegister(e) {
  e.preventDefault()

  const name = document.getElementById("name").value.trim()
  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value
  const role = document.getElementById("role").value

  if (!name || !email || !password) {
    utils.showError("Please fill in all fields")
    return
  }

  if (password.length < 6) {
    utils.showError("Password must be at least 6 characters long")
    return
  }

  try {
    const formData = new FormData()
    formData.append("name", name)
    formData.append("email", email)
    formData.append("password", password)
    formData.append("role", role)

    const response = await utils.apiRequest("/bugsagev3/backend/api/auth.php?action=register", {
      method: "POST",
      body: formData,
      headers: {},
    })

    if (response.success) {
      utils.showSuccess("Registration successful! You can now login.")
      setTimeout(() => {
        window.location.href = "login.html"
      }, 2000)
    }
  } catch (error) {
    console.error("Registration failed:", error)
    utils.showError(error.message || "Registration failed")
  }
}
