/**
 * Data Module - Handles fetching, processing, and storing data from the API
 */

// Constants
const API_ENDPOINT = '/api/data'; // The endpoint to your Google Apps Script web app
const CATEGORY_COLUMN = 'CATEGORY'; // Change this to match your category column name

// State
let appData = {
  sheets: {},           // Holds all sheet data
  activeSheet: null,    // Currently active sheet name
  meta: {},             // Metadata for the sheets
  loading: true,        // Loading state
  error: null,          // Error state
  lastUpdated: null     // Timestamp for last data update
};

/**
 * Initialize data module
 */
function initDataModule() {
  console.log('Initializing data module...');
  
  // Initial loading of data
  return loadAllData();
}

/**
 * Load all data from the API
 */
async function loadAllData() {
  appData.loading = true;
  appData.error = null;
  
  try {
    // Show loader
    showLoader();
    
    // Fetch data from API
    const response = await fetch(API_ENDPOINT);
    
    // Check if response is OK
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    // Parse JSON response
    const data = await response.json();
    
    // Validate data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format received from API');
    }
    
    // Extract metadata
    appData.meta = data.meta || {
      lastUpdated: new Date().toISOString(),
      sheetNames: Object.keys(data).filter(key => key !== 'meta' && key !== 'legacy')
    };
    
    // Update last updated timestamp
    appData.lastUpdated = appData.meta.lastUpdated || new Date().toISOString();
    
    // Process each sheet
    const sheetNames = appData.meta.sheetNames || Object.keys(data).filter(key => key !== 'meta' && key !== 'legacy');
    
    if (sheetNames.length === 0) {
      // No sheets available
      appData.sheets = {};
      appData.activeSheet = null;
      hideLoader();
      return false;
    }
    
    // Process each sheet
    sheetNames.forEach(sheetName => {
      if (data[sheetName] && Array.isArray(data[sheetName])) {
        appData.sheets[sheetName] = processSheetData(data[sheetName]);
      }
    });
    
    // Set active sheet if not already set
    if (!appData.activeSheet || !appData.sheets[appData.activeSheet]) {
      appData.activeSheet = sheetNames[0];
    }
    
    // Set loading to false
    appData.loading = false;
    
    // Hide loader after a small delay to ensure UI updates
    setTimeout(hideLoader, 300);
    
    return true;
  } catch (error) {
    console.error('Error loading data:', error);
    appData.error = error.message;
    appData.loading = false;
    hideLoader();
    return false;
  }
}

/**
 * Process raw sheet data into a more usable format
 */
function processSheetData(sheetData) {
  try {
    if (!Array.isArray(sheetData) || sheetData.length === 0) {
      throw new Error('Invalid sheet data format or empty data');
    }
    
    // Extract headers (ensure they're uppercase for consistency)
    const headers = sheetData[0].map(header => String(header).toUpperCase());
    const rows = sheetData.slice(1);
    
    // Transform the data into an array of objects with header keys
    const processedData = rows.map(row => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      return rowData;
    });
    
    // Analyze category data if applicable
    const categories = {};
    const categoryIndex = headers.indexOf(CATEGORY_COLUMN);
    
    if (categoryIndex >= 0) {
      processedData.forEach(row => {
        const category = row[CATEGORY_COLUMN];
        if (category) {
          categories[category] = (categories[category] || 0) + 1;
        }
      });
    }
    
    return {
      headers: headers,
      rows: processedData,
      categories: categories,
      rowCount: processedData.length,
      filtered: null // Will hold filtered data when search is applied
    };
  } catch (error) {
    console.error('Error processing sheet data:', error);
    return {
      headers: [],
      rows: [],
      categories: {},
      rowCount: 0,
      error: error.message
    };
  }
}

/**
 * Get active sheet data
 */
function getActiveSheetData() {
  if (!appData.activeSheet || !appData.sheets[appData.activeSheet]) {
    return null;
  }
  
  return appData.sheets[appData.activeSheet];
}

/**
 * Switch to a different sheet
 */
function switchSheet(sheetName) {
  if (appData.sheets[sheetName]) {
    appData.activeSheet = sheetName;
    return true;
  }
  return false;
}

/**
 * Filter the active sheet data
 */
function filterActiveSheetData(searchTerm, categoryFilter = null) {
  const activeSheet = getActiveSheetData();
  
  if (!activeSheet) {
    return [];
  }
  
  // Start with all data
  let filteredData = [...activeSheet.rows];
  
  // Apply category filter if provided
  if (categoryFilter !== null) {
    filteredData = filteredData.filter(row => 
      row[CATEGORY_COLUMN] && row[CATEGORY_COLUMN].toString() === categoryFilter.toString()
    );
  }
  
  // Apply search filter if provided
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase().trim();
    
    filteredData = filteredData.filter(row => 
      Object.values(row).some(value => 
        value && String(value).toLowerCase().includes(term)
      )
    );
  }
  
  // Store filtered data
  activeSheet.filtered = filteredData;
  
  return filteredData;
}

/**
 * Sort the active sheet data
 */
function sortActiveSheetData(columnName, direction = 'asc') {
  const activeSheet = getActiveSheetData();
  
  if (!activeSheet) {
    return [];
  }
  
  // Determine which data array to sort (filtered or original)
  const dataToSort = Array.isArray(activeSheet.filtered) 
    ? [...activeSheet.filtered] 
    : [...activeSheet.rows];
  
  // Sort the data
  const sortedData = dataToSort.sort((a, b) => {
    const valueA = a[columnName];
    const valueB = b[columnName];
    
    // Handle numeric sorting
    if (!isNaN(valueA) && !isNaN(valueB)) {
      return direction === 'asc' 
        ? Number(valueA) - Number(valueB)
        : Number(valueB) - Number(valueA);
    }
    
    // Handle string sorting
    const stringA = String(valueA || '').toLowerCase();
    const stringB = String(valueB || '').toLowerCase();
    
    if (stringA < stringB) {
      return direction === 'asc' ? -1 : 1;
    }
    if (stringA > stringB) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
  
  // Update the appropriate data array
  if (Array.isArray(activeSheet.filtered)) {
    activeSheet.filtered = sortedData;
  } else {
    activeSheet.rows = sortedData;
  }
  
  return sortedData;
}

/**
 * Show the application loader
 */
function showLoader() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.classList.remove('hidden');
  }
}

/**
 * Hide the application loader
 */
function hideLoader() {
  const loader = document.getElementById('appLoader');
  if (loader) {
    loader.classList.add('hidden');
  }
}

/**
 * Show a notification toast
 */
function showNotification(message, type = 'info') {
  const toast = document.getElementById('notificationToast');
  const messageEl = document.getElementById('notificationMessage');
  const iconEl = document.getElementById('notificationIcon');
  
  // Set message
  messageEl.textContent = message;
  
  // Set icon based on type
  iconEl.className = 'fas';
  switch (type) {
    case 'success':
      iconEl.classList.add('fa-check-circle');
      break;
    case 'warning':
      iconEl.classList.add('fa-exclamation-circle');
      break;
    case 'error':
      iconEl.classList.add('fa-times-circle');
      break;
    default:
      iconEl.classList.add('fa-info-circle');
  }
  
  // Show toast
  toast.classList.add('show');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Export functions and data for use in other modules
window.dataModule = {
  init: initDataModule,
  loadAll: loadAllData,
  getActiveData: getActiveSheetData,
  switchSheet: switchSheet,
  filter: filterActiveSheetData,
  sort: sortActiveSheetData,
  showNotification: showNotification,
  showLoader: showLoader,
  hideLoader: hideLoader,
  getAppData: () => appData
};
