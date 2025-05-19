// Main game module that coordinates all other modules

document.addEventListener('DOMContentLoaded', () => {
    // Animation frame ID for proper cleanup
    let animationFrameId;
    
    // Initialize settings
    if (typeof Settings !== 'undefined') {
        Settings.init();
    }
    
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
    // Use fixed time step for smoother movement
    const FIXED_TIME_STEP = 1000 / 60; // 60 updates per second
    let accumulator = 0;

    function gameLoop(currentTime) {
        if (gameOver) {
            // Only render once in game over state
            const state = GameState.getState();
            Renderer.drawGame(state, gridSize, halfGridSize);
            return;
        }

        animationFrameId = window.requestAnimationFrame(gameLoop);

        // Calculate deltaTime
        let deltaTime = currentTime - lastRenderTime;
        if (deltaTime > 1000) deltaTime = FIXED_TIME_STEP; // Prevent huge jumps on tab switch
        accumulator += deltaTime;
        lastRenderTime = currentTime;

        // Update UI stats periodically
        updateStats();

        // Fixed time step update
        while (accumulator >= FIXED_TIME_STEP) {
            GameState.update(currentTime, FIXED_TIME_STEP);
            accumulator -= FIXED_TIME_STEP;
        }

        // Get updated state and check for game over
        const updatedState = GameState.getState();
        if (updatedState.gameOver) {
            gameOver = true;
            
            // Store the score as high score if settings available
            if (typeof Settings !== 'undefined') {
                Settings.addHighScore(updatedState.score);
            }
            
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('death');
            }
        }

        // Draw everything (no interpolation for now, but could be added)
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
