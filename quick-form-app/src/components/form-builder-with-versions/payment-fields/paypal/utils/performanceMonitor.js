/**
 * Performance Monitor for Payment Field Components
 * Tracks re-renders, API calls, and state changes for optimization
 */

import React from 'react';

class PaymentFieldPerformanceMonitor {
  constructor() {
    this.metrics = {
      renders: 0,
      stateChanges: 0,
      apiCalls: 0,
      tabSwitches: 0,
      modalOpens: 0,
      lastReset: Date.now(),
      renderTimes: [],
      stateUpdateTimes: [],
      apiCallTimes: [],
    };

    this.isEnabled = process.env.NODE_ENV === "development";
    this.componentName = "PayPalFieldEditor";
  }

  // Track component renders
  trackRender(componentName = this.componentName) {
    if (!this.isEnabled) return;

    const renderTime = performance.now();
    this.metrics.renders++;
    this.metrics.renderTimes.push(renderTime);

    console.log(
      `🔄 [${componentName}] Render #${
        this.metrics.renders
      } at ${renderTime.toFixed(2)}ms`
    );

    // Warn about excessive renders
    if (this.metrics.renders > 10) {
      console.warn(
        `⚠️ [${componentName}] High render count: ${this.metrics.renders}`
      );
    }
  }

  // Track state changes
  trackStateChange(action, payload, componentName = this.componentName) {
    if (!this.isEnabled) return;

    const changeTime = performance.now();
    this.metrics.stateChanges++;
    this.metrics.stateUpdateTimes.push(changeTime);

    console.log(
      `📊 [${componentName}] State change #${this.metrics.stateChanges}:`,
      {
        action,
        payload,
        timestamp: changeTime.toFixed(2),
      }
    );
  }

  // Track API calls
  trackApiCall(endpoint, method = "GET", componentName = this.componentName) {
    if (!this.isEnabled) return;

    const callTime = performance.now();
    this.metrics.apiCalls++;
    this.metrics.apiCallTimes.push(callTime);

    console.log(`🌐 [${componentName}] API call #${this.metrics.apiCalls}:`, {
      endpoint,
      method,
      timestamp: callTime.toFixed(2),
    });

    // Warn about excessive API calls
    if (this.metrics.apiCalls > 5) {
      console.warn(
        `⚠️ [${componentName}] High API call count: ${this.metrics.apiCalls}`
      );
    }
  }

  // Track tab switches
  trackTabSwitch(fromTab, toTab, componentName = this.componentName) {
    if (!this.isEnabled) return;

    this.metrics.tabSwitches++;
    console.log(
      `🔀 [${componentName}] Tab switch #${this.metrics.tabSwitches}: ${fromTab} → ${toTab}`
    );
  }

  // Track modal operations
  trackModalOpen(modalType, componentName = this.componentName) {
    if (!this.isEnabled) return;

    this.metrics.modalOpens++;
    console.log(
      `🪟 [${componentName}] Modal opened #${this.metrics.modalOpens}: ${modalType}`
    );
  }

  // Get performance summary
  getSummary() {
    if (!this.isEnabled) return null;

    const now = Date.now();
    const duration = now - this.metrics.lastReset;

    return {
      duration: `${(duration / 1000).toFixed(2)}s`,
      renders: this.metrics.renders,
      stateChanges: this.metrics.stateChanges,
      apiCalls: this.metrics.apiCalls,
      tabSwitches: this.metrics.tabSwitches,
      modalOpens: this.metrics.modalOpens,
      averageRenderTime:
        this.metrics.renderTimes.length > 0
          ? (
              this.metrics.renderTimes.reduce((a, b) => a + b, 0) /
              this.metrics.renderTimes.length
            ).toFixed(2) + "ms"
          : "0ms",
      renderFrequency:
        duration > 0
          ? (this.metrics.renders / (duration / 1000)).toFixed(2) + "/s"
          : "0/s",
      efficiency: {
        rendersPerStateChange:
          this.metrics.stateChanges > 0
            ? (this.metrics.renders / this.metrics.stateChanges).toFixed(2)
            : "N/A",
        apiCallsPerRender:
          this.metrics.renders > 0
            ? (this.metrics.apiCalls / this.metrics.renders).toFixed(2)
            : "N/A",
      },
    };
  }

  // Print performance report
  printReport(componentName = this.componentName) {
    if (!this.isEnabled) return;

    const summary = this.getSummary();
    console.group(`📈 [${componentName}] Performance Report`);
    console.table(summary);
    console.groupEnd();

    // Performance warnings
    if (summary.renders > 20) {
      console.warn(`⚠️ High render count detected: ${summary.renders}`);
    }

    if (parseFloat(summary.efficiency.rendersPerStateChange) > 3) {
      console.warn(
        `⚠️ Inefficient rendering detected: ${summary.efficiency.rendersPerStateChange} renders per state change`
      );
    }

    if (parseFloat(summary.efficiency.apiCallsPerRender) > 0.5) {
      console.warn(
        `⚠️ Excessive API calls detected: ${summary.efficiency.apiCallsPerRender} calls per render`
      );
    }
  }

  // Reset metrics
  reset() {
    this.metrics = {
      renders: 0,
      stateChanges: 0,
      apiCalls: 0,
      tabSwitches: 0,
      modalOpens: 0,
      lastReset: Date.now(),
      renderTimes: [],
      stateUpdateTimes: [],
      apiCallTimes: [],
    };

    if (this.isEnabled) {
      console.log(`🔄 Performance metrics reset for ${this.componentName}`);
    }
  }

  // Enable/disable monitoring
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(
      `${enabled ? "✅" : "❌"} Performance monitoring ${
        enabled ? "enabled" : "disabled"
      } for ${this.componentName}`
    );
  }
}

// Create singleton instance
export const paymentFieldMonitor = new PaymentFieldPerformanceMonitor();

// React hook for component performance tracking
export function usePerformanceMonitor(componentName) {
  const monitor = paymentFieldMonitor;

  // Track renders
  React.useEffect(() => {
    monitor.trackRender(componentName);
  });

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      monitor.printReport(componentName);
    };
  }, []);

  return {
    trackStateChange: (action, payload) =>
      monitor.trackStateChange(action, payload, componentName),
    trackApiCall: (endpoint, method) =>
      monitor.trackApiCall(endpoint, method, componentName),
    trackTabSwitch: (fromTab, toTab) =>
      monitor.trackTabSwitch(fromTab, toTab, componentName),
    trackModalOpen: (modalType) =>
      monitor.trackModalOpen(modalType, componentName),
    getSummary: () => monitor.getSummary(),
    printReport: () => monitor.printReport(componentName),
    reset: () => monitor.reset(),
  };
}

export default PaymentFieldPerformanceMonitor;
