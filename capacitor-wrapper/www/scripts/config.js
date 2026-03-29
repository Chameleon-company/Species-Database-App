/**
 * API Configuration
 * 
 * Centralized configuration for backend API endpoints.
 * Used by sync.js and other scripts that need to communicate with the backend.
 */

const API_CONFIG = {
  // Base URL of the backend API server
  // Automatically detects development vs production environment
  // baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  //   ? 'http://127.0.0.1:5000'  // Development (local Flask server)
  //   : "https://species-database-app.onrender.com",   // Production (update this to your production URL if different)
  baseUrl: "https://species-database-app.onrender.com",

  // API endpoint paths (relative to baseUrl)
  endpoints: {
    // Sync endpoints
    bundle: '/api/bundle',                    // Full data bundle download
    changes: '/api/species/changes',          // Check if updates available
    incremental: '/api/species/incremental', // Get changed species only
    
    // Auth endpoints
    login: '/api/auth/login',                 // User login
    userState: '/api/auth/user-state',// Check user status
    translate: "/translate",         
  }
}

window.API_CONFIG = API_CONFIG

console.log("[API_CONFIG]", API_CONFIG)

// // Make API_CONFIG available globally
// if (typeof window !== 'undefined') {
//   window.API_CONFIG = API_CONFIG;
// }

// // Export for Node.js environments (testing)
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = API_CONFIG;
// }

