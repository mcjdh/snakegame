// Main game module that coordinates all other modules

document.addEventListener('DOMContentLoaded', () => {
    // Animation frame ID for proper cleanup
    let animationFrameId;
    
    // Initialize game components
    const { gridSize, tileCount, halfGridSize } = GameState.init();
    
    // Get POWER_UP_TYPES to pass to the renderer
    const gameStateObj = GameState.getState();
    const powerUpTypes = gameStateObj.POWER_UP_TYPES;
    
    // Initialize renderer with power-up types data
    const rendererInfo = Renderer.init(gridSize, tileCount, powerUpTypes);
    
    // Initialize sound manager, but don't create the AudioContext yet
    if (typeof SoundManager !== 'undefined') {
        SoundManager.init();
    }
    
    // UI elements
    const levelDisplay = document.getElementById('level-display');
    const comboDisplay = document.getElementById('combo-display');
    const powerupsDisplay = document.getElementById('powerups-display');
    const foodDisplay = document.getElementById('food-display');
    
    // Track time for game loop
    let lastRenderTime = 0;
    
    // Game state
    let gameOver = false;
    
    // Update UI stats
    function updateStats() {
        const state = GameState.getState();
        
        if (levelDisplay) {
            levelDisplay.textContent = `${state.level + 1}: ${state.levelName}`;
        }
        
        if (comboDisplay) {
            comboDisplay.textContent = `x${state.multiplier.toFixed(1)}`;
        }
        
        if (powerupsDisplay) {
            powerupsDisplay.textContent = state.powerUpsCollected;
        }
        
        if (foodDisplay && state.food && state.food.type) {
            const foodTypes = {
                'NORMAL': 'Normal',
                'BONUS': 'Bonus',
                'SUPER': 'Super',
                'EPIC': 'Epic'
            };
            
            // Clear existing classes
            foodDisplay.className = '';
            
            // Add appropriate class for styling
            foodDisplay.classList.add(`food-${state.food.type.toLowerCase()}`);
            foodDisplay.textContent = foodTypes[state.food.type] || 'Normal';
        }
    }
    
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
        
        // Update UI stats periodically
        updateStats();
        
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
            
            // Play game over sound
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('death');
            }
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
        
        // Reset UI stats
        updateStats();
        
        // Restart the game loop
        lastRenderTime = performance.now();
        animationFrameId = window.requestAnimationFrame(gameLoop);
        
        // Don't play sound on initial load (only on user-initiated restart)
        // This fixes the AudioContext issue
        if (typeof SoundManager !== 'undefined' && animationFrameId !== undefined) {
            SoundManager.play('powerUp');
        }
    }
    
    // Initialize input handler
    const inputHandlerInfo = InputHandler.init(GameState, Renderer, resetGame);
    
    // Handle page visibility changes to pause/resume the game
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    
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
    
    // Add a click event listener to the whole document for first interaction
    // This will enable sound after the user has interacted with the page once
    const handleFirstInteraction = () => {
        if (typeof SoundManager !== 'undefined') {
            // Try to initialize the audio context on first interaction
            const soundEnabled = SoundManager.isSoundEnabled();
            if (soundEnabled) {
                SoundManager.play('powerUp');
            }
        }
        // Remove the event listener once it's been used
        document.removeEventListener('click', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    
    // Expose cleanup method for proper memory management
    window.snakeGameCleanup = cleanup;
});
