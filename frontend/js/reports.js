import { Chart } from "@/components/ui/chart"
// Reports and analytics JavaScript

const charts = {}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.checkAuth()
  if (!user) return

  // Load chart data and create charts
  await loadChartData()
})

async function loadChartData() {
  try {
    const [statsResponse, chartsResponse] = await Promise.all([
      window.apiRequest("dashboard.php?action=stats"),
      window.apiRequest("dashboard.php?action=charts"),
    ])

    createStatusChart(statsResponse.status_counts)
    createPriorityChart(statsResponse.priority_counts)
    createBugsOverTimeChart(chartsResponse.bugs_over_time)
    createResolutionChart(chartsResponse.resolution_times)
  } catch (error) {
    console.error("Failed to load chart data:", error)
    window.showError("Failed to load reports data")
  }
}

function createStatusChart(statusData) {
  const ctx = document.getElementById("statusChart")
  if (!ctx) return

  const labels = statusData.map((item) => item.status)
  const data = statusData.map((item) => Number.parseInt(item.count))
  const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#6b7280"]

  charts.statusChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
      },
    },
  })
}

function createPriorityChart(priorityData) {
  const ctx = document.getElementById("priorityChart")
  if (!ctx) return

  const labels = priorityData.map((item) => item.priority)
  const data = priorityData.map((item) => Number.parseInt(item.count))
  const colors = ["#10b981", "#f59e0b", "#f97316", "#ef4444"]

  charts.priorityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Number of Bugs",
          data: data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  })
}

function createBugsOverTimeChart(timeData) {
  const ctx = document.getElementById("bugsOverTimeChart")
  if (!ctx) return

  const labels = timeData.map((item) => {
    const date = new Date(item.date)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  })
  const data = timeData.map((item) => Number.parseInt(item.count))

  charts.bugsOverTimeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bugs Created",
          data: data,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  })
}

function createResolutionChart(resolutionData) {
  const ctx = document.getElementById("resolutionChart")
  if (!ctx) return

  const labels = resolutionData.map((item) => item.priority)
  const data = resolutionData.map((item) => Number.parseFloat(item.avg_resolution_days).toFixed(1))
  const colors = ["#10b981", "#f59e0b", "#f97316", "#ef4444"]

  charts.resolutionChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Average Days to Resolve",
          data: data,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Days",
          },
        },
      },
    },
  })
}

// Export chart data functionality
function exportChartData(chartType) {
  const chart = charts[chartType]
  if (!chart) return

  const data = chart.data
  let csvContent = "data:text/csv;charset=utf-8,"

  // Add headers
  csvContent += "Label,Value\n"

  // Add data rows
  data.labels.forEach((label, index) => {
    const value = data.datasets[0].data[index]
    csvContent += `"${label}",${value}\n`
  })

  // Create download link
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `${chartType}_data.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Add export buttons functionality
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("export-btn")) {
    const chartType = e.target.dataset.chart
    if (chartType) {
      exportChartData(chartType)
    }
  }
})
