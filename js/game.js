// Main game module that coordinates all other modules

document.addEventListener('DOMContentLoaded', () => {
    // Animation frame ID for proper cleanup
    let animationFrameId;
    
    // Initialize game components
    const { gridSize, tileCount, halfGridSize } = GameState.init();
    const rendererInfo = Renderer.init(gridSize, tileCount);
    
    // Track time for game loop
    let lastRenderTime = 0;
    
    // Game state
    let gameOver = false;
    
    // Game loop using requestAnimationFrame with performance improvements
    function gameLoop(currentTime) {
        if (gameOver) {
            // Only render once in game over state
            const state = GameState.getState();
            Renderer.drawGame(state, gridSize, halfGridSize);
            return;
        }

        animationFrameId = window.requestAnimationFrame(gameLoop);
        
        const state = GameState.getState();
        
        // Throttle game updates based on game speed
        const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
        if (secondsSinceLastRender < state.gameSpeed / 1000) return;
        
        // Calculate deltaTime properly for smoother animation
        const deltaTime = currentTime - lastRenderTime;
        lastRenderTime = currentTime;
        
        // Update game state
        GameState.update(currentTime, deltaTime);
        
        // Get updated state and check for game over
        const updatedState = GameState.getState();
        if (updatedState.gameOver) {
            gameOver = true;
        }
        
        // Draw everything
        Renderer.drawGame(updatedState, gridSize, halfGridSize);
    }
    
    // Reset game state and start new game
    function resetGame() {
        // Cancel any pending animation frame
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
        
        GameState.resetState();
        gameOver = false;
        
        // Restart the game loop
        lastRenderTime = performance.now();
        animationFrameId = window.requestAnimationFrame(gameLoop);
    }
    
    // Initialize input handler
    const inputHandlerInfo = InputHandler.init(GameState, Renderer, resetGame);
    
    // Handle page visibility changes to pause/resume the game
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden (user switched tabs or minimized window)
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
                animationFrameId = undefined;
            }
        } else if (!gameOver) {
            // Page is visible again, reset time and continue
            lastRenderTime = performance.now();
            animationFrameId = window.requestAnimationFrame(gameLoop);
        }
    });
    
    // Start the game
    resetGame();
    
    // Cleanup function for proper garbage collection
    function cleanup() {
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
        
        Renderer.cleanup();
        inputHandlerInfo.cleanup();
        document.removeEventListener('visibilitychange', visibilityChangeHandler);
    }
    
    // Handler function for visibility changes
    function visibilityChangeHandler() {
        if (document.hidden) {
            if (animationFrameId) {
                window.cancelAnimationFrame(animationFrameId);
                animationFrameId = undefined;
            }
        } else if (!gameOver) {
            lastRenderTime = performance.now();
            animationFrameId = window.requestAnimationFrame(gameLoop);
        }
    }
    
    // Expose cleanup method for proper memory management
    window.snakeGameCleanup = cleanup;
});
