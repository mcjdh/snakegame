/**
 * Simple performance monitoring for the snake game
 * This utility helps track frame rate and update times
 */

const PerformanceMonitor = (() => {
    // Configuration
    const sampleSize = 60; // Number of frames to average
    const updateInterval = 1000; // Update display every second
    
    // State
    let frameRateHistory = [];
    let updateTimeHistory = [];
    let lastUpdateDisplayTime = 0;
    
    // DOM elements for display
    let fpsDisplay = null;
    let updateTimeDisplay = null;
    
    // Initialize the performance monitor
    function init() {
        // Create UI elements
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '10px';
        container.style.left = '10px';
        container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        container.style.padding = '5px 10px';
        container.style.borderRadius = '4px';
        container.style.color = '#fff';
        container.style.fontFamily = 'monospace';
        container.style.fontSize = '12px';
        
        fpsDisplay = document.createElement('div');
        fpsDisplay.textContent = 'FPS: --';
        container.appendChild(fpsDisplay);
        
        updateTimeDisplay = document.createElement('div');
        updateTimeDisplay.textContent = 'Update: -- ms';
        container.appendChild(updateTimeDisplay);
        
        document.body.appendChild(container);
    }
    
    // Record a new frame
    function recordFrame(deltaTime) {
        const fps = 1000 / deltaTime;
        frameRateHistory.push(fps);
        
        // Keep history at sampleSize
        if (frameRateHistory.length > sampleSize) {
            frameRateHistory.shift();
        }
        
        // Update display periodically
        const now = performance.now();
        if (now - lastUpdateDisplayTime > updateInterval) {
            updateDisplay();
            lastUpdateDisplayTime = now;
        }
    }
    
    // Record an update cycle time
    function recordUpdate(timeMs) {
        updateTimeHistory.push(timeMs);
        
        // Keep history at sampleSize
        if (updateTimeHistory.length > sampleSize) {
            updateTimeHistory.shift();
        }
    }
    
    // Update the display with current metrics
    function updateDisplay() {
        if (frameRateHistory.length > 0) {
            // Calculate average FPS
            const avgFps = frameRateHistory.reduce((sum, value) => sum + value, 0) / 
                           frameRateHistory.length;
            fpsDisplay.textContent = `FPS: ${avgFps.toFixed(1)}`;
            
            // Color code based on performance
            if (avgFps > 55) {
                fpsDisplay.style.color = '#4ade80'; // Good (green)
            } else if (avgFps > 45) {
                fpsDisplay.style.color = '#facc15'; // Warning (yellow)
            } else {
                fpsDisplay.style.color = '#ef4444'; // Poor (red)
            }
        }
        
        if (updateTimeHistory.length > 0) {
            // Calculate average update time
            const avgUpdateTime = updateTimeHistory.reduce((sum, value) => sum + value, 0) / 
                                  updateTimeHistory.length;
            updateTimeDisplay.textContent = `Update: ${avgUpdateTime.toFixed(2)} ms`;
            
            // Color code based on performance
            if (avgUpdateTime < 5) {
                updateTimeDisplay.style.color = '#4ade80'; // Good (green)
            } else if (avgUpdateTime < 10) {
                updateTimeDisplay.style.color = '#facc15'; // Warning (yellow)
            } else {
                updateTimeDisplay.style.color = '#ef4444'; // Poor (red)
            }
        }
    }
    
    // Public API
    return {
        init,
        recordFrame,
        recordUpdate
    };
})();