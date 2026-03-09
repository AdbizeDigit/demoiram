// Performance monitoring utilities

export const measurePerformance = () => {
  if (typeof window === 'undefined' || !window.performance) {
    return null
  }

  const perfData = window.performance.getEntriesByType('navigation')[0]

  if (!perfData) return null

  return {
    // Page load metrics
    dns: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
    tcp: Math.round(perfData.connectEnd - perfData.connectStart),
    request: Math.round(perfData.responseStart - perfData.requestStart),
    response: Math.round(perfData.responseEnd - perfData.responseStart),
    domProcessing: Math.round(perfData.domComplete - perfData.domLoading),
    domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
    loadComplete: Math.round(perfData.loadEventEnd - perfData.loadEventStart),

    // Total times
    totalLoadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart),
    domInteractive: Math.round(perfData.domInteractive - perfData.fetchStart),

    // First Paint metrics
    firstPaint: getFirstPaint(),
    firstContentfulPaint: getFirstContentfulPaint(),

    // Memory usage (if available)
    memory: getMemoryUsage(),
  }
}

const getFirstPaint = () => {
  if (typeof window === 'undefined') return null

  const paintEntries = window.performance.getEntriesByType('paint')
  const fpEntry = paintEntries.find(entry => entry.name === 'first-paint')
  return fpEntry ? Math.round(fpEntry.startTime) : null
}

const getFirstContentfulPaint = () => {
  if (typeof window === 'undefined') return null

  const paintEntries = window.performance.getEntriesByType('paint')
  const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
  return fcpEntry ? Math.round(fcpEntry.startTime) : null
}

const getMemoryUsage = () => {
  if (typeof window === 'undefined' || !window.performance.memory) return null

  const memory = window.performance.memory
  return {
    usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
    totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
    jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
  }
}

// Log performance metrics to console in development
export const logPerformance = () => {
  if (process.env.NODE_ENV === 'development') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const metrics = measurePerformance()
        if (metrics) {
          console.group('🚀 Performance Metrics')
          console.log('Total Load Time:', metrics.totalLoadTime, 'ms')
          console.log('DOM Interactive:', metrics.domInteractive, 'ms')
          console.log('First Paint:', metrics.firstPaint, 'ms')
          console.log('First Contentful Paint:', metrics.firstContentfulPaint, 'ms')
          if (metrics.memory) {
            console.log('JS Heap Used:', metrics.memory.usedJSHeapSize, 'MB')
          }
          console.groupEnd()
        }
      }, 0)
    })
  }
}

// Web Vitals tracking
export const trackWebVitals = (metric) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric)
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // Send to your analytics service
    // Example: sendToAnalytics(metric)
  }
}
