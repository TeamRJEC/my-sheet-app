/**
 * Components Module - Handles rendering dashboard UI components
 */

// Configuration
const COLORS = [
  '#ff6384', '#36a2eb', '#9966ff', '#ff9f40', '#4bc0c0',
  '#ffcd56', '#7b68ee', '#2ecc71', '#9b59b6', '#e74c3c'
];

// State
let dashboardState = {
  activeFilter: null,
  sortConfig: { column: null, direction: 'asc' },
  chart: null
};

/**
 * Initialize components module
 */
function initComponentsModule() {
  console.log('Initializing components module...');
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Set up event listeners for various components
 */
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('tableSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value;
      const filteredData = window.dataModule.filter(searchTerm, dashboardState.activeFilter);
      renderTable(filteredData);
      updateRecordCount(filteredData.length);
    });
  }
  
  // Close toast button
  const closeToastBtn = document.getElementById('closeToast');
  if (closeToastBtn) {
    closeToastBtn.addEventListener('click', function() {
      document.getElementById('notificationToast').classList.remove('show');
    });
  }
  
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async function() {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Refreshing...';
      
      const success = await window.dataModule.loadAll();
      
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh';
      
      if (success) {
        renderDashboard();
        window.dataModule.showNotification('Dashboard data refreshed successfully!', 'success');
      } else {
        window.dataModule.showNotification('Failed to refresh data. Please try again.', 'error');
      }
    });
  }
  
  // Retry button for error state
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', async function() {
      const success = await window.dataModule.loadAll();
      if (success) {
        renderDashboard();
      }
    });
  }
}

/**
 * Render the entire dashboard based on active sheet
 */
function renderDashboard() {
  const appData = window.dataModule.getAppData();
  
  // Update timestamp
  updateTimestamp(appData.lastUpdated);
  
  // If there's an error, show error state
  if (appData.error) {
    showErrorState(appData.error);
    return;
  }
  
  // If there are no sheets or data, show empty state
  if (Object.keys(appData.sheets).length === 0) {
    showEmptyState();
    return;
  }
  
  // Hide error and empty states
  hideErrorState();
  hideEmptyState();
  
  // Show dashboard container
  document.getElementById('dashboardContainer').classList.remove('d-none');
  
  // Render sheet tabs
  renderSheetTabs(Object.keys(appData.sheets), appData.activeSheet);
  
  // Get active sheet data
  const activeSheetData = window.dataModule.getActiveData();
  
  if (!activeSheetData) {
    showErrorState('No active sheet data available');
    return;
  }
  
  // Render dashboard components
  renderSummaryCards(activeSheetData);
  renderTable(Array.isArray(activeSheetData.filtered) ? activeSheetData.filtered : activeSheetData.rows);
  renderChart(activeSheetData);
  
  // Update record count
  updateRecordCount(Array.isArray(activeSheetData.filtered) 
    ? activeSheetData.filtered.length 
    : activeSheetData.rows.length);
}

/**
 * Render navigation tabs for sheets
 */
function renderSheetTabs(sheetNames, activeSheet) {
  const tabsContainer = document.getElementById('sheetTabs');
  if (!tabsContainer) return;
  
  // Clear existing tabs
  tabsContainer.innerHTML = '';
  
  // Create tab for each sheet
  sheetNames.forEach((sheetName, index) => {
    const tabItem = document.createElement('li');
    tabItem.className = 'nav-tab';
    tabItem.dataset.sheet = sheetName;
    
    if (sheetName === activeSheet) {
      tabItem.classList.add('active');
    }
    
    // Add sheet icon based on index
    const iconClass = getSheetIcon(index);
    
    tabItem.innerHTML = `
      <i class="${iconClass} nav-icon"></i>
      <span>${sheetName}</span>
    `;
    
    // Add click handler to switch sheets
    tabItem.addEventListener('click', () => {
      switchActiveSheet(sheetName);
    });
    
    tabsContainer.appendChild(tabItem);
  });
}

/**
 * Get an appropriate icon class for a sheet based on its index
 */
function getSheetIcon(index) {
  // Array of Font Awesome icon classes to cycle through
  const icons = [
    'fas fa-table',
    'fas fa-clipboard-list',
    'fas fa-list-alt',
    'fas fa-chart-bar',
    'fas fa-file-alt',
    'fas fa-database'
  ];
  
  return icons[index % icons.length];
}

/**
 * Switch to a different active sheet
 */
function switchActiveSheet(sheetName) {
  const appData = window.dataModule.getAppData();
  
  // If already on this sheet, do nothing
  if (appData.activeSheet === sheetName) return;
  
  // Switch sheet in data module
  const success = window.dataModule.switchSheet(sheetName);
  
  if (success) {
    // Reset filters and sorts
    dashboardState.activeFilter = null;
    dashboardState.sortConfig = { column: null, direction: 'asc' };
    
    // Re-render dashboard
    renderDashboard();
    
    // Show notification
    window.dataModule.showNotification(`Switched to "${sheetName}" sheet`, 'info');
  }
}

/**
 * Render summary cards for categories
 */
function renderSummaryCards(sheetData) {
  const summarySection = document.getElementById('summaryCards');
  if (!summarySection) return;
  
  // Clear existing cards
  summarySection.innerHTML = '';
  
  // Check if we have category data
  if (Object.keys(sheetData.categories).length > 0) {
    // Create summary cards for each category
    Object.entries(sheetData.categories).forEach(([category, count], index) => {
      const percentage = Math.round((count / sheetData.rowCount) * 100);
      const catIndex = (parseInt(category) % 10) || index % 10;
      
      const card = document.createElement('div');
      card.className = `summary-card cat-${catIndex + 1}-border cat-${catIndex + 1}-bg`;
      card.dataset.category = category;
      
      // If this is the active filter, add active class
      if (dashboardState.activeFilter === category) {
        card.classList.add('active');
      }
      
      card.innerHTML = `
        <div class="value">${count}</div>
        <div class="label">Category ${category}</div>
        <div class="percentage">${percentage}% of total</div>
      `;
      
      // Add click event for filtering
      card.addEventListener('click', function() {
        toggleCategoryFilter(category);
      });
      
      summarySection.appendChild(card);
    });
  } else {
    // If no category data, show total records card
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div class="value">${sheetData.rowCount}</div>
      <div class="label">Total Records</div>
    `;
    
    summarySection.appendChild(card);
  }
}

/**
 * Toggle category filter
 */
function toggleCategoryFilter(category) {
  if (dashboardState.activeFilter === category) {
    // Clear filter
    dashboardState.activeFilter = null;
    
    // Update card UI
    document.querySelectorAll('.summary-card').forEach(card => {
      card.classList.remove('active');
    });
    
    // Show notification
    window.dataModule.showNotification('Filter cleared', 'info');
  } else {
    // Set filter
    dashboardState.activeFilter = category;
    
    // Update card UI
    document.querySelectorAll('.summary-card').forEach(card => {
      if (card.dataset.category === category) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
    
    // Show notification
    window.dataModule.showNotification(`Filtering Category ${category}`, 'info');
  }
  
  // Apply filter
  const searchTerm = document.getElementById('tableSearch').value;
  const filteredData = window.dataModule.filter(searchTerm, dashboardState.activeFilter);
  
  // Update UI components
  renderTable(filteredData);
  updateRecordCount(filteredData.length);
}

/**
 * Render data table
 */
function renderTable(data) {
  const table = document.getElementById('dataTable');
  if (!table) return;
  
  // Get active sheet data
  const activeSheetData = window.dataModule.getActiveData();
  if (!activeSheetData) return;
  
  // Get headers
  const headers = activeSheetData.headers;
  
  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.className = 'sortable';
    
    // If this column is currently sorted, add the appropriate class
    if (dashboardState.sortConfig.column === header) {
      th.classList.add(dashboardState.sortConfig.direction);
    }
    
    // Add click handler for sorting
    th.addEventListener('click', () => {
      sortTable(header);
    });
    
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  
  // Create table body
  const tbody = document.createElement('tbody');
  
  if (data.length === 0) {
    // No data after filtering
    const noDataRow = document.createElement('tr');
    const noDataCell = document.createElement('td');
    noDataCell.colSpan = headers.length;
    noDataCell.className = 'text-center p-4';
    noDataCell.textContent = 'No matching records found';
    noDataRow.appendChild(noDataCell);
    tbody.appendChild(noDataRow);
  } else {
    // Create rows for each data item
    data.forEach(row => {
      const tr = document.createElement('tr');
      
      headers.forEach(header => {
        const td = document.createElement('td');
        const value = row[header];
        
        // If this is the category column, add special styling
        if (header === CATEGORY_COLUMN) {
          const catIndex = (parseInt(value) % 10) || 0;
          td.innerHTML = `<span class="badge badge-cat-${catIndex + 1}">${value}</span>`;
        } else {
          td.textContent = value || '';
        }
        
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
  }
  
  // Replace existing table content
  table.innerHTML = '';
  table.appendChild(thead);
  table.appendChild(tbody);
}

/**
 * Sort table by column
 */
function sortTable(columnName) {
  if (dashboardState.sortConfig.column === columnName) {
    // Toggle direction if already sorting by this column
    dashboardState.sortConfig.direction = 
      dashboardState.sortConfig.direction === 'asc' ? 'desc' : 'asc';
  } else {
    // Set new sort column and default to ascending
    dashboardState.sortConfig.column = columnName;
    dashboardState.sortConfig.direction = 'asc';
  }
  
  // Sort the data
  const sortedData = window.dataModule.sort(
    columnName, 
    dashboardState.sortConfig.direction
  );
  
  // Re-render the table with sorted data
  renderTable(sortedData);
}

/**
 * Render chart
 */
function renderChart(sheetData) {
  const chartCanvas = document.getElementById('dataChart');
  if (!chartCanvas) return;
  
  // Check if we have categories
  if (Object.keys(sheetData.categories).length === 0) {
    // No categories available, show message
    chartCanvas.parentElement.innerHTML = `
      <div class="d-flex align-items-center justify-content-center h-100 text-center text-muted">
        <div>
          <i class="fas fa-chart-pie fa-3x mb-3"></i>
          <p>No category data available<br>for visualization</p>
        </div>
      </div>
    `;
    return;
  }
  
  // Prepare chart data
  const chartLabels = Object.keys(sheetData.categories).map(cat => `Category ${cat}`);
  const chartData = Object.values(sheetData.categories);
  const chartColors = Object.keys(sheetData.categories).map((cat, index) => {
    const catIndex = (parseInt(cat) % 10) || index % 10;
    return COLORS[catIndex];
  });
  
  // Destroy existing chart if any
  if (dashboardState.chart) {
    dashboardState.chart.destroy();
  }
  
  // Create new chart
  dashboardState.chart = new Chart(chartCanvas, {
    type: 'pie',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderColor: 'white',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${value} records (${percentage}%)`;
            }
          }
        }
      }
    }
  });
  
  // Create custom legend
  renderChartLegend(chartLabels, chartColors);
}

/**
 * Render custom chart legend
 */
function renderChartLegend(labels, colors) {
  const legendContainer = document.getElementById('chartLegend');
  if (!legendContainer) return;
  
  // Clear existing legend
  legendContainer.innerHTML = '';
  
  // Create legend items
  labels.forEach((label, index) => {
    const category = label.replace('Category ', '');
    
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.dataset.category = category;
    
    // If this is the active filter, add active class
    if (dashboardState.activeFilter === category) {
      legendItem.classList.add('active');
    }
    
    const colorBox = document.createElement('div');
    colorBox.className = 'legend-color';
    colorBox.style.backgroundColor = colors[index];
    
    const labelText = document.createElement('span');
    labelText.className = 'legend-label';
    labelText.textContent = label;
    
    legendItem.appendChild(colorBox);
    legendItem.appendChild(labelText);
    
    // Add click event for filtering
    legendItem.addEventListener('click', function() {
      toggleCategoryFilter(category);
    });
    
    legendContainer.appendChild(legendItem);
  });
}

/**
 * Update record count display
 */
function updateRecordCount(count) {
  const recordCountElement = document.getElementById('recordCount');
  if (recordCountElement) {
    recordCountElement.textContent = `${count} record${count !== 1 ? 's' : ''}`;
  }
}

/**
 * Update timestamp display
 */
function updateTimestamp(timestamp) {
  const timestampElement = document.getElementById('updateTime');
  if (timestampElement && timestamp) {
    const date = new Date(timestamp);
    const formattedTime = date.toLocaleString();
    timestampElement.textContent = formattedTime;
  }
}

/**
 * Show error state
 */
function showErrorState(errorMessage) {
  // Hide dashboard container
  document.getElementById('dashboardContainer').classList.add('d-none');
  
  // Hide empty state
  hideEmptyState();
  
  // Show error container
  const errorContainer = document.getElementById('errorContainer');
  const errorMessageEl = document.getElementById('errorMessage');
  
  errorMessageEl.textContent = errorMessage;
  errorContainer.classList.remove('d-none');
}

/**
 * Hide error state
 */
function hideErrorState() {
  const errorContainer = document.getElementById('errorContainer');
  errorContainer.classList.add('d-none');
}

/**
 * Show empty state
 */
function showEmptyState() {
  // Hide dashboard container
  document.getElementById('dashboardContainer').classList.add('d-none');
  
  // Hide error state
  hideErrorState();
  
  // Show empty container
  const emptyContainer = document.getElementById('emptyContainer');
  emptyContainer.classList.remove('d-none');
}

/**
 * Hide empty state
 */
function hideEmptyState() {
  const emptyContainer = document.getElementById('emptyContainer');
  emptyContainer.classList.add('d-none');
}

// Export functions for use in other modules
window.componentsModule = {
  init: initComponentsModule,
  renderDashboard: renderDashboard
};
