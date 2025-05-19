// Utility functions for the Snake game

// Position object pooling to reduce GC
const PositionManager = (() => {
    const positionPool = [];
    const MAX_POOL_SIZE = 100;
    
    return {
        getPosition: function(x, y, time) {
            if (positionPool.length > 0) {
                const pos = positionPool.pop();
                pos.x = x;
                pos.y = y;
                pos.time = time;
                return pos;
            }
            return { x, y, time };
        },
        
        recyclePosition: function(pos) {
            if (positionPool.length < MAX_POOL_SIZE) {
                positionPool.push(pos);
            }
        }
    };
})();

// Debounce function for performance critical operations like resize
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show a temporary score popup at a position
function showScorePopup(points, x, y) {
    // Create popup element for visual feedback
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;

    // Position popup below the canvas, centered horizontally
    const canvas = document.getElementById('gameCanvas');
    const canvasRect = canvas.getBoundingClientRect();
    // Center horizontally, float below the canvas (never over the grid)
    popup.style.left = `${canvasRect.left + canvasRect.width / 2}px`;
    popup.style.top = `${canvasRect.bottom + 16}px`;
    popup.style.transform = 'translateX(-50%)';
    popup.style.pointerEvents = 'none';

    // Add to DOM and animate
    document.body.appendChild(popup);

    // Remove after animation completes
    setTimeout(() => {
        popup.remove();
    }, 1000);
}

// Show power-up notification
function showPowerUpNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'power-up-notification';
    notification.textContent = message;

    // Position notification below the canvas, centered
    const canvas = document.getElementById('gameCanvas');
    const canvasRect = canvas.getBoundingClientRect();
    notification.style.position = 'absolute';
    notification.style.left = `${canvasRect.left + canvasRect.width / 2}px`;
    notification.style.top = `${canvasRect.bottom + 48}px`;
    notification.style.transform = 'translateX(-50%)';
    notification.style.pointerEvents = 'none';

    document.body.appendChild(notification);

    // Animate and remove
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 1500);
}
