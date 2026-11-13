/**
 * API Configuration
 * 
 * Centralized configuration for backend API endpoints.
 * Used by sync.js and other scripts that need to communicate with the backend.
 */

const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.());

const PROD_SUPABASE_HOST = "oppcngtkhywxsazeqqet.supabase.co";
const DEV_SUPABASE_HOST = "tdiquvydwzxmtludjmpe.supabase.co";

const isLocalDevelopment =
  !isNativeApp &&
  window.location.protocol === "http:" &&
  (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );

const API_CONFIG = {
  // Base URL of the backend API server
  // Automatically detects development vs production environment
  baseUrl: isLocalDevelopment
    ? "http://127.0.0.1:5000"
    : "https://species-database-app.onrender.com",

  // Ensure it is from an allowed Supabase host
  SUPABASE_HOST: isLocalDevelopment ? DEV_SUPABASE_HOST : PROD_SUPABASE_HOST,


  // Approved Supabase projects that may contain species videos
  SUPABASE_VIDEO_HOSTS: isLocalDevelopment
    ? [PROD_SUPABASE_HOST, DEV_SUPABASE_HOST]
    : [PROD_SUPABASE_HOST],

  // Current and legacy video storage paths
  SUPABASE_VIDEO_PATHS: [
    "/storage/v1/object/public/species_videos/",
    "/storage/v1/object/public/media/videos/",
  ],

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


// // Make API_CONFIG available globally
// if (typeof window !== 'undefined') {
//   window.API_CONFIG = API_CONFIG;
// }

// // Export for Node.js environments (testing)
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = API_CONFIG;
// }

