/**
 * Workflo Widget Loader v1.0
 * 
 * This script loads the Workflo widget on customer websites.
 * Usage: Include this script with WorkfloWidgetConfig defined.
 * 
 * Example:
 * <script>
 *   window.WorkfloWidgetConfig = {
 *     pageToken: "YOUR_PAGE_TOKEN_HERE",
 *     apiBase: "https://api.yourapp.com",
 *     widgetUrl: "https://cdn.yourapp.com/workflo-widget-app.js"
 *   };
 * </script>
 * <script src="https://cdn.yourapp.com/workflo-widget-v1.js" async></script>
 */

(function() {
  // Prevent multiple loads
  if (window.__workfloWidgetLoaded) {
    console.warn('Workflo Widget: Already loaded');
    return;
  }
  window.__workfloWidgetLoaded = true;

  // Configuration
  const cfg = window.WorkfloWidgetConfig || {};
  
  // Validate required config
  if (!cfg.pageToken) {
    console.error('Workflo Widget: pageToken is required in WorkfloWidgetConfig');
    return;
  }

  // Default configuration
  const config = {
    pageToken: cfg.pageToken,
    apiBase: cfg.apiBase || 'http://localhost:3001',
    wsBase: cfg.wsBase || cfg.apiBase || 'http://localhost:3001',
    widgetUrl: cfg.widgetUrl || 'https://cdn.yourapp.com/workflo-widget-app.js',
    position: cfg.position || 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    theme: cfg.theme || 'light', // light, dark
    primaryColor: cfg.primaryColor || '#4F46E5',
  };

  // Position mapping
  const positions = {
    'bottom-right': { right: '20px', bottom: '20px' },
    'bottom-left': { left: '20px', bottom: '20px' },
    'top-right': { right: '20px', top: '20px' },
    'top-left': { left: '20px', top: '20px' },
  };

  /**
   * Mount the widget container
   */
  function mountContainer() {
    // Check if container already exists
    if (document.getElementById('workflo-widget-root')) {
      console.warn('Workflo Widget: Container already exists');
      return;
    }

    // Create widget container
    const container = document.createElement('div');
    container.id = 'workflo-widget-root';
    container.style.position = 'fixed';
    container.style.zIndex = '2147483647'; // Maximum z-index
    
    // Apply position
    const pos = positions[config.position] || positions['bottom-right'];
    Object.assign(container.style, pos);

    document.body.appendChild(container);

    // Load the widget application
    loadWidgetApp(container);
  }

  /**
   * Load the main widget application bundle
   */
  function loadWidgetApp(container) {
    const script = document.createElement('script');
    script.src = config.widgetUrl;
    script.defer = true;
    script.crossOrigin = 'anonymous';

    script.onload = function() {
      try {
        if (window.WorkfloWidgetApp && typeof window.WorkfloWidgetApp.init === 'function') {
          console.log('Workflo Widget: Initializing...');
          window.WorkfloWidgetApp.init(container, config);
          console.log('Workflo Widget: Initialized successfully');
        } else {
          console.error('Workflo Widget: WorkfloWidgetApp.init not found');
        }
      } catch (err) {
        console.error('Workflo Widget: Initialization failed', err);
      }
    };

    script.onerror = function() {
      console.error('Workflo Widget: Failed to load widget bundle from ' + config.widgetUrl);
    };

    document.head.appendChild(script);
  }

  /**
   * Initialize when DOM is ready
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountContainer);
  } else {
    // DOM already loaded
    mountContainer();
  }

  // Expose cleanup method
  window.WorkfloWidget = {
    destroy: function() {
      const container = document.getElementById('workflo-widget-root');
      if (container) {
        container.remove();
        window.__workfloWidgetLoaded = false;
        console.log('Workflo Widget: Destroyed');
      }
    },
    reload: function() {
      this.destroy();
      setTimeout(mountContainer, 100);
    },
  };
})();
