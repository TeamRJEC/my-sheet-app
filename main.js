/**
 * Main Application Entry Point
 * 
 * This file initializes the application and coordinates between modules.
 */

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApplication);

/**
 * Initialize the application
 */
async function initApplication() {
  console.log('Initializing application...');
  
  try {
    // Initialize modules
    await window.dataModule.init();
    window.componentsModule.init();
    
    // Render the dashboard
    window.componentsModule.renderDashboard();
    
  } catch (error) {
    console.error('Error initializing application:', error);
    
    // Show error notification
    if (window.dataModule && window.dataModule.showNotification) {
      window.dataModule.showNotification(
        'Failed to initialize application. Please refresh the page.',
        'error'
      );
    }
  }
}

/**
 * Handle application errors
 */
window.addEventListener('error', function(event) {
  console.error('Global error:', event.error);
  
  // Show error notification if modules are initialized
  if (window.dataModule && window.dataModule.showNotification) {
    window.dataModule.showNotification(
      'An error occurred. Please refresh the page.',
      'error'
    );
  }
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Show error notification if modules are initialized
  if (window.dataModule && window.dataModule.showNotification) {
    window.dataModule.showNotification(
      'An error occurred. Please refresh the page.',
      'error'
    );
  }
});

/**
 * Create API endpoint for Cloudflare Pages
 * This is needed to proxy the Google Apps Script web app
 */
// Define the file for Cloudflare Pages function routing
// This doesn't execute here but serves as a template for creating api.js

/*
// api.js example for Cloudflare Pages - place this in a separate file in your project
export async function onRequest(context) {
  const { request } = context;
  
  // URL of your Google Apps Script web app
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
  
  try {
    // Forward the request to the Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL);
    
    // Check if the response is ok
    if (!response.ok) {
      throw new Error(`Google Apps Script returned status ${response.status}`);
    }
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // CORS header
        'Cache-Control': 'no-cache, no-store, must-revalidate' // No caching
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    
    // Return error response
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
*/
