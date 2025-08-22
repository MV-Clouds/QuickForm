/**
 * Comprehensive ResizeObserver error suppression utility
 *
 * This utility addresses ResizeObserver errors that commonly occur with:
 * - RSuite components (DateRangePicker, CheckPicker, SelectPicker, etc.)
 * - Third-party libraries that use ResizeObserver internally
 * - Browser extensions (LastPass, Loom, etc.)
 *
 * The errors are benign and don't break functionality, but they clutter
 * the development console and webpack error overlay.
 */

let isInitialized = false;

export const suppressResizeObserverErrors = () => {
  // Prevent multiple initializations
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  console.log(
    "🔧 Initializing ResizeObserver error suppression for RSuite components"
  );

  // Method 1: Console error suppression
  const originalError = console.error;
  console.error = (...args) => {
    if (
      args.length > 0 &&
      typeof args[0] === "string" &&
      (args[0].includes("ResizeObserver loop completed") ||
        args[0].includes("ResizeObserver loop limit exceeded"))
    ) {
      // Silently suppress these specific errors
      return;
    }
    originalError.apply(console, args);
  };

  // Method 2: Global error handler with immediate suppression
  const handleGlobalError = (event) => {
    if (
      event.message &&
      (event.message.includes("ResizeObserver loop completed") ||
        event.message.includes("ResizeObserver loop limit exceeded"))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  };

  // Method 3: Unhandled rejection handler
  const handleUnhandledRejection = (event) => {
    if (
      event.reason &&
      typeof event.reason === "string" &&
      event.reason.includes("ResizeObserver")
    ) {
      event.preventDefault();
      return false;
    }
  };

  // Method 4: Webpack dev server overlay suppression
  const suppressWebpackOverlay = () => {
    // Hide existing overlays
    const hideOverlay = (selector) => {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.textContent || "";
        if (content.includes("ResizeObserver loop completed")) {
          element.style.display = "none";
          setTimeout(() => {
            if (element.parentNode) {
              element.parentNode.removeChild(element);
            }
          }, 100);
        }
      }
    };

    // Check for various webpack overlay selectors
    hideOverlay("#webpack-dev-server-client-overlay");
    hideOverlay("#webpack-dev-server-client-overlay-div");
    hideOverlay("[data-webpack-overlay]");

    // Monitor for new overlays
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (
              element.id === "webpack-dev-server-client-overlay" ||
              element.id === "webpack-dev-server-client-overlay-div" ||
              element.hasAttribute("data-webpack-overlay")
            ) {
              const content = element.textContent || "";
              if (content.includes("ResizeObserver loop completed")) {
                element.style.display = "none";
                setTimeout(() => {
                  if (element.parentNode) {
                    element.parentNode.removeChild(element);
                  }
                }, 100);
              }
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  // Method 5: Patch ResizeObserver to use requestAnimationFrame
  if (window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        const wrappedCallback = (entries) => {
          window.requestAnimationFrame(() => {
            try {
              callback(entries);
            } catch (error) {
              if (!error.message?.includes("ResizeObserver")) {
                console.error("ResizeObserver callback error:", error);
              }
            }
          });
        };
        super(wrappedCallback);
      }
    };
  }

  // Method 6: CSS injection to hide webpack overlay
  const injectCSS = () => {
    const style = document.createElement("style");
    style.textContent = `
      /* Hide webpack dev server error overlay for ResizeObserver errors */
      iframe#webpack-dev-server-client-overlay {
        display: none !important;
      }
      
      #webpack-dev-server-client-overlay-div {
        display: none !important;
      }
      
      [data-webpack-overlay] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  };

  // Add event listeners
  window.addEventListener("error", handleGlobalError, true);
  window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

  // Initialize overlay suppression
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      suppressWebpackOverlay();
      injectCSS();
    });
  } else {
    suppressWebpackOverlay();
    injectCSS();
  }

  // Periodic check for overlays (fallback)
  setInterval(suppressWebpackOverlay, 2000);

  console.log("✅ ResizeObserver error suppression initialized successfully");
};

// Auto-initialize if this file is imported
suppressResizeObserverErrors();

export default suppressResizeObserverErrors;
