// Input handling for the Snake game

const InputHandler = (() => {
    // References
    let gameState;
    let renderer;
    let resetCallback;
    
    // Key mappings for faster lookups
    const keyDirections = {
        'ArrowUp':    { x: 0, y: -1, allowed: (speed) => speed.y !== 1 },
        'w':          { x: 0, y: -1, allowed: (speed) => speed.y !== 1 },
        'W':          { x: 0, y: -1, allowed: (speed) => speed.y !== 1 },
        'ArrowDown':  { x: 0, y: 1,  allowed: (speed) => speed.y !== -1 },
        's':          { x: 0, y: 1,  allowed: (speed) => speed.y !== -1 },
        'S':          { x: 0, y: 1,  allowed: (speed) => speed.y !== -1 },
        'ArrowLeft':  { x: -1, y: 0, allowed: (speed) => speed.x !== 1 },
        'a':          { x: -1, y: 0, allowed: (speed) => speed.x !== 1 },
        'A':          { x: -1, y: 0, allowed: (speed) => speed.x !== 1 },
        'ArrowRight': { x: 1, y: 0,  allowed: (speed) => speed.x !== -1 },
        'd':          { x: 1, y: 0,  allowed: (speed) => speed.x !== -1 },
        'D':          { x: 1, y: 0,  allowed: (speed) => speed.x !== -1 }
    };
    
    // Initialize input handlers
    function init(gameStateRef, rendererRef, resetFunc) {
        gameState = gameStateRef;
        renderer = rendererRef;
        resetCallback = resetFunc;
        
        setupKeyboardControls();
        setupTouchControls();
        setupButtonControls();
        
        return {
            cleanup
        };
    }
    
    // Setup keyboard controls
    function setupKeyboardControls() {
        document.addEventListener('keydown', handleKeyDown);
    }
    
    // Handle keyboard input
    function handleKeyDown(event) {
        const state = gameState.getState();
        
        // Handle restart with 'r' key when game is over
        if (state.gameOver && (event.key === 'r' || event.key === 'R')) {
            resetCallback();
            return;
        }
        
        // Optimize direction change with mapping
        const direction = keyDirections[event.key];
        if (direction && direction.allowed(state.snakeSpeed)) {
            gameState.setDirection({ x: direction.x, y: direction.y });
        }
    }
    
    // Setup touch controls
    function setupTouchControls() {
        const touchControls = document.querySelectorAll('.touch-btn');
        touchControls.forEach(btn => {
            btn.addEventListener('click', handleTouchButtonClick);
        });
        
        // Add swipe controls
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    
    // Handle touch button controls
    function handleTouchButtonClick(e) {
        const state = gameState.getState();
        
        // Prevent multiple event handling
        e.preventDefault();
        
        if (state.gameOver) {
            resetCallback();
            return;
        }
        
        if (this.classList.contains('up') && state.snakeSpeed.y !== 1) {
            gameState.setDirection({ x: 0, y: -1 });
        } else if (this.classList.contains('down') && state.snakeSpeed.y !== -1) {
            gameState.setDirection({ x: 0, y: 1 });
        } else if (this.classList.contains('left') && state.snakeSpeed.x !== 1) {
            gameState.setDirection({ x: -1, y: 0 });
        } else if (this.classList.contains('right') && state.snakeSpeed.x !== -1) {
            gameState.setDirection({ x: 1, y: 0 });
        }
    }
    
    // Touch variables for swipe detection
    let touchStartX = 0;
    let touchStartY = 0;
    let touchTimeStart = 0;
    
    // Handle touch start
    function handleTouchStart(e) {
        const canvasRect = renderer.getCanvasRect();
        touchStartX = e.changedTouches[0].clientX - canvasRect.left;
        touchStartY = e.changedTouches[0].clientY - canvasRect.top;
        touchTimeStart = Date.now();
        e.preventDefault(); // Prevent scrolling when touching the canvas
    }
    
    // Handle touch end (swipe detection)
    function handleTouchEnd(e) {
        const state = gameState.getState();
        
        if (state.gameOver) {
            resetCallback();
            return;
        }
        
        const canvasRect = renderer.getCanvasRect();
        const touchEndX = e.changedTouches[0].clientX - canvasRect.left;
        const touchEndY = e.changedTouches[0].clientY - canvasRect.top;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        const touchDuration = Date.now() - touchTimeStart;
        
        // Only handle quick swipes (less than 500ms)
        if (touchDuration > 500) return;
        
        // Minimum swipe distance threshold
        const minSwipeDistance = 30;
        
        // Check horizontal vs vertical
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (Math.abs(dx) > minSwipeDistance) {
                if (dx > 0 && state.snakeSpeed.x !== -1) {
                    gameState.setDirection({ x: 1, y: 0 }); // right
                } else if (dx < 0 && state.snakeSpeed.x !== 1) {
                    gameState.setDirection({ x: -1, y: 0 }); // left
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(dy) > minSwipeDistance) {
                if (dy > 0 && state.snakeSpeed.y !== -1) {
                    gameState.setDirection({ x: 0, y: 1 }); // down
                } else if (dy < 0 && state.snakeSpeed.y !== 1) {
                    gameState.setDirection({ x: 0, y: -1 }); // up
                }
            }
        }
        
        e.preventDefault();
    }
    
    // Setup button controls
    function setupButtonControls() {
        const restartButton = document.getElementById('restartButton');
        restartButton.addEventListener('click', resetCallback);
    }
    
    // Cleanup event listeners to prevent memory leaks
    function cleanup() {
        document.removeEventListener('keydown', handleKeyDown);
        
        const touchControls = document.querySelectorAll('.touch-btn');
        touchControls.forEach(btn => {
            btn.removeEventListener('click', handleTouchButtonClick);
        });
        
        const canvas = document.getElementById('gameCanvas');
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchend', handleTouchEnd);
        
        const restartButton = document.getElementById('restartButton');
        restartButton.removeEventListener('click', resetCallback);
    }
    
    return {
        init
    };
})();
