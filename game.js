document.addEventListener('DOMContentLoaded', () => {
    // Game canvas setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: disable alpha for better performance
    const scoreElement = document.getElementById('score');
    const restartButton = document.getElementById('restartButton');
    
    // Performance optimization: Pre-calculate and cache frequently used values
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    const halfGridSize = gridSize / 2;
    
    // Cache DOM references and pre-calculate values for performance
    const bodyEl = document.body;
    let canvasRect = canvas.getBoundingClientRect(); // For touch controls
    
    // Make canvas responsive with debounced resize handler
    let resizeTimeout;
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.clientWidth;
        
        // Set canvas display size
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${containerWidth}px`;
        
        // Update canvas rect for touch controls
        canvasRect = canvas.getBoundingClientRect();
    }
    
    // Debounced resize handler for better performance
    function debouncedResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100);
    }
    
    // Call resize on load and window resize with debouncing
    resizeCanvas();
    window.addEventListener('resize', debouncedResize);
    
    // Game variables
    let score = 0;
    let gameOver = false;
    let gameSpeed = 150;
    let lastRenderTime = 0;
    
    // Without Return mechanic variables
    let forbiddenZones = []; 
    let forbiddenDuration = 3500;
    let difficultyLevel = 0.8;
    let lastPositions = [];
    let maxTrailLength = 10;
    let zonePattern = 'alternate';
    let moveCount = 0;
    
    // Optimization: Use object pooling for positions to reduce GC
    const positionPool = [];
    const MAX_POOL_SIZE = 100;
    
    function getPosition(x, y, time) {
        if (positionPool.length > 0) {
            const pos = positionPool.pop();
            pos.x = x;
            pos.y = y;
            pos.time = time;
            return pos;
        }
        return { x, y, time };
    }
    
    function recyclePosition(pos) {
        if (positionPool.length < MAX_POOL_SIZE) {
            positionPool.push(pos);
        }
    }
    
    // Snake initial state
    let snake = [
        { x: 10, y: 10 }
    ];
    let snakeSpeed = {
        x: 1,
        y: 0
    };
    
    // Food initial position
    let food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // Optimization: Precalculated values for rendering
    const eyeOffsets = {
        right: { x1: 0.7, y1: 0.3, x2: 0.7, y2: 0.7 },
        left: { x1: 0.3, y1: 0.3, x2: 0.3, y2: 0.7 },
        up: { x1: 0.3, y1: 0.3, x2: 0.7, y2: 0.3 },
        down: { x1: 0.3, y1: 0.7, x2: 0.7, y2: 0.7 }
    };
    
    // Animation frame ID for proper cleanup
    let animationFrameId;
    
    // Game loop using requestAnimationFrame with performance improvements
    function gameLoop(currentTime) {
        if (gameOver) {
            drawGame();
            return;
        }

        animationFrameId = window.requestAnimationFrame(gameLoop);
        
        // Throttle game updates based on game speed
        const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
        if (secondsSinceLastRender < gameSpeed / 1000) return;
        
        // Optimization: Calculate deltaTime properly for smoother animation
        const deltaTime = currentTime - lastRenderTime;
        lastRenderTime = currentTime;
        
        // Update game state
        updateGame(currentTime, deltaTime);
        
        // Draw everything
        drawGame();
    }
    
    // Separated update and draw for better organization and performance
    function updateGame(currentTime, deltaTime) {
        // Update forbidden zones
        updateForbiddenZones(currentTime);
        
        // Update game state
        moveSnake();
        checkCollision();
        
        // Track snake movement for trail
        trackSnakePosition(currentTime);
        
        // Check if snake eats food
        if (snake[0].x === food.x && snake[0].y === food.y) {
            // Don't remove tail to make snake longer
            generateFood();
            score += 10;
            scoreElement.textContent = score;
            
            // Increase game speed and adjust zone patterns based on score
            if (score % 60 === 0 && gameSpeed > 70) {
                gameSpeed -= 4;
                
                // Adjust difficulty and pattern as score increases
                if (difficultyLevel < 2.5) {
                    difficultyLevel += 0.15;
                }
                
                // Change zone pattern as player progresses
                if (score === 60) {
                    zonePattern = 'continuous'; // More challenging at higher scores
                } else if (score === 120) {
                    zonePattern = 'random';
                    maxTrailLength += 5; // Longer trail tracking
                }
            }
        } else {
            // Remove tail segment
            const tail = snake.pop();
            
            // Create forbidden zone where the tail was, with improved pattern logic
            if (snake.length > 3) {
                createForbiddenZone(tail.x, tail.y, currentTime);
            }
        }
        
        moveCount++;
    }
    
    // Track recent positions of the snake for trail visualization
    function trackSnakePosition(currentTime) {
        if (snake.length > 0) {
            // Use object pooling for position objects
            const newPos = getPosition(snake[0].x, snake[0].y, currentTime);
            lastPositions.unshift(newPos);
            
            // Limit the number of positions we track
            while (lastPositions.length > maxTrailLength) {
                const oldPos = lastPositions.pop();
                recyclePosition(oldPos); // Recycle for reuse
            }
        }
    }
    
    // Create a forbidden zone at the specified coordinates with improved pattern logic
    function createForbiddenZone(x, y, currentTime) {
        // Different zone generation patterns
        let shouldCreateZone = false;
        
        switch(zonePattern) {
            case 'alternate':
                // Create zones in alternating fashion (more forgiving)
                shouldCreateZone = (moveCount % 4 === 0);
                break;
                
            case 'continuous':
                // Create more connected zones (intermediate)
                shouldCreateZone = (moveCount % 3 === 0);
                break;
                
            case 'random':
                // Create zones randomly but with higher chance (challenging)
                shouldCreateZone = (Math.random() < 0.3 * difficultyLevel);
                break;
        }
        
        if (shouldCreateZone) {
            // Check if we already have a zone at this position
            // Optimization: Use Set or Map for faster lookups in large games
            const existingZone = forbiddenZones.find(zone => zone.x === x && zone.y === y);
            if (!existingZone) {
                forbiddenZones.push({
                    x: x,
                    y: y,
                    createdAt: currentTime,
                    opacity: 0.6,
                    isNew: true // For visual effect
                });
            }
        }
    }
    
    // Update and clean up forbidden zones
    function updateForbiddenZones(currentTime) {
        // Optimization: Filter in-place to avoid creating new array
        let i = 0;
        while (i < forbiddenZones.length) {
            const zone = forbiddenZones[i];
            const age = currentTime - zone.createdAt;
            
            // Mark new zones as old after a short time
            if (zone.isNew && age > 200) {
                zone.isNew = false;
            }
            
            // Update opacity as zones age
            zone.opacity = 0.6 * (1 - (age / forbiddenDuration));
            
            // Add visual pulsing effect to warn when zones are about to disappear
            if (age > forbiddenDuration * 0.7) {
                const pulsePhase = (age % 500) / 500; // Creates a 0-1 cycle every 500ms
                zone.opacity *= 0.7 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);
            }
            
            // Keep only zones that haven't expired yet
            if (age < forbiddenDuration) {
                i++;
            } else {
                // Remove expired zone without creating a new array
                forbiddenZones.splice(i, 1);
            }
        }
    }
    
    // Update snake position
    function moveSnake() {
        // Calculate new head position
        const newHead = {
            x: snake[0].x + snakeSpeed.x,
            y: snake[0].y + snakeSpeed.y
        };
        
        // Add new head to beginning of snake
        snake.unshift(newHead);
    }
    
    // Check for collisions with optimizations
    function checkCollision() {
        // Only check collisions if the snake is actually moving
        if (snakeSpeed.x === 0 && snakeSpeed.y === 0) {
            return;
        }
        
        const head = snake[0];
        
        // Wall collision - fast path with early return
        if (
            head.x < 0 || 
            head.x >= tileCount || 
            head.y < 0 || 
            head.y >= tileCount
        ) {
            gameOver = true;
            return;
        }
        
        // Self collision (start from index 1 to skip the head)
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                gameOver = true;
                return;
            }
        }
        
        // Collision with forbidden zones
        for (let i = 0; i < forbiddenZones.length; i++) {
            const zone = forbiddenZones[i];
            if (head.x === zone.x && head.y === zone.y) {
                gameOver = true;
                return;
            }
        }
    }
    
    // Generate new food position with optimization
    function generateFood() {
        // Optimization: Pre-calculate all available positions and pick from them
        const availablePositions = [];
        
        // Create a grid to track occupied cells
        const occupiedCells = new Array(tileCount * tileCount).fill(false);
        
        // Mark snake cells as occupied
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            const index = segment.y * tileCount + segment.x;
            occupiedCells[index] = true;
        }
        
        // Mark forbidden zones as occupied
        for (let i = 0; i < forbiddenZones.length; i++) {
            const zone = forbiddenZones[i];
            const index = zone.y * tileCount + zone.x;
            occupiedCells[index] = true;
        }
        
        // Find all available positions
        for (let y = 0; y < tileCount; y++) {
            for (let x = 0; x < tileCount; x++) {
                const index = y * tileCount + x;
                if (!occupiedCells[index]) {
                    availablePositions.push({x, y});
                }
            }
        }
        
        // Pick a random available position
        if (availablePositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            food = availablePositions[randomIndex];
        } else {
            // Fallback if no positions are available (rare edge case)
            food = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
        }
    }
    
    // Drawing optimization: Use layer-based rendering to minimize redraw operations
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    
    // Pre-render the grid once and reuse it
    let gridCanvas = null;
    
    function createGridCanvas() {
        gridCanvas = document.createElement('canvas');
        gridCanvas.width = canvas.width;
        gridCanvas.height = canvas.height;
        const gridCtx = gridCanvas.getContext('2d');
        
        // Draw grid (subtle)
        gridCtx.strokeStyle = '#333333';
        gridCtx.lineWidth = 0.5;
        
        for(let i = 0; i <= tileCount; i++) {
            gridCtx.beginPath();
            gridCtx.moveTo(i * gridSize, 0);
            gridCtx.lineTo(i * gridSize, canvas.height);
            gridCtx.stroke();
            
            gridCtx.beginPath();
            gridCtx.moveTo(0, i * gridSize);
            gridCtx.lineTo(canvas.width, i * gridSize);
            gridCtx.stroke();
        }
    }
    
    // Create grid canvas on init
    createGridCanvas();
    
    // Draw game elements with optimizations
    function drawGame() {
        // Clear offscreen canvas
        offscreenCtx.fillStyle = '#1e1e1e';
        offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid by copying from pre-rendered canvas
        offscreenCtx.drawImage(gridCanvas, 0, 0);
        
        // Draw subtle trail to show recent movement
        if (lastPositions.length > 1) {
            for (let i = 1; i < lastPositions.length; i++) {
                const pos = lastPositions[i];
                const age = performance.now() - pos.time;
                const alpha = Math.max(0, 0.15 - (age / 2000) * 0.15); // Fade out based on age
                
                offscreenCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                offscreenCtx.beginPath();
                offscreenCtx.roundRect(
                    pos.x * gridSize + gridSize * 0.35, 
                    pos.y * gridSize + gridSize * 0.35, 
                    gridSize * 0.3, 
                    gridSize * 0.3,
                    3
                );
                offscreenCtx.fill();
            }
        }
        
        // Batch drawing of forbidden zones for better performance
        offscreenCtx.save();
        for (let i = 0; i < forbiddenZones.length; i++) {
            const zone = forbiddenZones[i];
            // Base color is red, but new zones "flash" briefly
            let zoneOpacity = zone.opacity;
            if (zone.isNew) {
                offscreenCtx.fillStyle = `rgba(255, 100, 100, ${zoneOpacity * 1.2})`;
            } else {
                offscreenCtx.fillStyle = `rgba(239, 68, 68, ${zoneOpacity})`;
            }
            
            offscreenCtx.fillRect(
                zone.x * gridSize,
                zone.y * gridSize,
                gridSize,
                gridSize
            );
            
            // Add X pattern with improved visual effect
            offscreenCtx.strokeStyle = `rgba(255, 255, 255, ${zoneOpacity})`;
            offscreenCtx.lineWidth = 2;
            offscreenCtx.beginPath();
            offscreenCtx.moveTo(zone.x * gridSize + 4, zone.y * gridSize + 4);
            offscreenCtx.lineTo((zone.x + 1) * gridSize - 4, (zone.y + 1) * gridSize - 4);
            offscreenCtx.moveTo((zone.x + 1) * gridSize - 4, zone.y * gridSize + 4);
            offscreenCtx.lineTo(zone.x * gridSize + 4, (zone.y + 1) * gridSize - 4);
            offscreenCtx.stroke();
        }
        offscreenCtx.restore();
        
        // Draw food with a glow effect
        offscreenCtx.shadowColor = '#ef4444';
        offscreenCtx.shadowBlur = 10;
        offscreenCtx.fillStyle = '#ef4444';
        offscreenCtx.beginPath();
        offscreenCtx.arc(
            food.x * gridSize + halfGridSize,
            food.y * gridSize + halfGridSize,
            halfGridSize - 1,
            0,
            Math.PI * 2
        );
        offscreenCtx.fill();
        
        // Reset shadow
        offscreenCtx.shadowBlur = 0;
        
        // Draw snake with segments and rounded corners - batch all segments together
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            
            if (i === 0) {
                // Head - different color
                offscreenCtx.fillStyle = '#4ade80';
            } else {
                // Body with gradient
                offscreenCtx.fillStyle = `hsl(142, 76%, ${70 - (i * 2)}%)`;
            }
            
            offscreenCtx.beginPath();
            offscreenCtx.roundRect(
                segment.x * gridSize, 
                segment.y * gridSize, 
                gridSize - 2, 
                gridSize - 2,
                4
            );
            offscreenCtx.fill();
            
            // Add eye details to the head
            if (i === 0) {
                offscreenCtx.fillStyle = '#000';
                
                // Position eyes based on direction - use pre-calculated offsets
                let eyeOffset;
                
                if (snakeSpeed.x === 1) eyeOffset = eyeOffsets.right;
                else if (snakeSpeed.x === -1) eyeOffset = eyeOffsets.left;
                else if (snakeSpeed.y === -1) eyeOffset = eyeOffsets.up;
                else eyeOffset = eyeOffsets.down;
                
                // Batch draw both eyes
                const x1 = segment.x * gridSize + gridSize * eyeOffset.x1;
                const y1 = segment.y * gridSize + gridSize * eyeOffset.y1;
                const x2 = segment.x * gridSize + gridSize * eyeOffset.x2;
                const y2 = segment.y * gridSize + gridSize * eyeOffset.y2;
                const eyeRadius = gridSize * 0.1;
                
                offscreenCtx.beginPath();
                offscreenCtx.arc(x1, y1, eyeRadius, 0, Math.PI * 2);
                offscreenCtx.arc(x2, y2, eyeRadius, 0, Math.PI * 2);
                offscreenCtx.fill();
            }
        }
        
        // Draw game mode info with pattern indicator
        offscreenCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        offscreenCtx.font = '12px "Segoe UI", sans-serif';
        offscreenCtx.textAlign = 'left';
        
        let patternName;
        switch(zonePattern) {
            case 'alternate': patternName = "Sparse"; break;
            case 'continuous': patternName = "Dense"; break;
            case 'random': patternName = "Chaotic"; break;
        }
        
        offscreenCtx.fillText(`Without Return Mode (${patternName}): Avoid red zones`, 10, 15);
        
        // Draw game over screen
        if (gameOver) {
            offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            offscreenCtx.fillStyle = '#f5f5f5';
            offscreenCtx.font = 'bold 36px "Segoe UI", sans-serif';
            offscreenCtx.textAlign = 'center';
            offscreenCtx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 40);
            
            offscreenCtx.font = '24px "Segoe UI", sans-serif';
            offscreenCtx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
            
            offscreenCtx.font = '20px "Segoe UI", sans-serif';
            offscreenCtx.fillStyle = '#4ade80';
            offscreenCtx.fillText('Press R or Tap Restart', canvas.width / 2, canvas.height / 2 + 40);
        }
        
        // Copy the offscreen canvas to the visible canvas in one operation
        ctx.drawImage(offscreenCanvas, 0, 0);
    }
    
    // Reset game state with proper cleanup
    function resetGame() {
        // Cancel any pending animation frame
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
        
        snake = [{ x: 10, y: 10 }];
        snakeSpeed = { x: 1, y: 0 }; // Start moving right
        forbiddenZones = [];
        
        // Clear and reset lastPositions
        while (lastPositions.length > 0) {
            recyclePosition(lastPositions.pop());
        }
        
        difficultyLevel = 0.8;
        zonePattern = 'alternate'; // Reset to easiest pattern
        moveCount = 0;
        generateFood();
        score = 0;
        gameOver = false;
        gameSpeed = 150;
        scoreElement.textContent = score;
        
        // Restart the game loop
        lastRenderTime = performance.now();
        animationFrameId = window.requestAnimationFrame(gameLoop);
    }
    
    // Optimized keyboard input using key mapping for faster lookups
    const keyDirections = {
        'ArrowUp':    { x: 0, y: -1, allowed: () => snakeSpeed.y !== 1 },
        'w':          { x: 0, y: -1, allowed: () => snakeSpeed.y !== 1 },
        'W':          { x: 0, y: -1, allowed: () => snakeSpeed.y !== 1 },
        'ArrowDown':  { x: 0, y: 1,  allowed: () => snakeSpeed.y !== -1 },
        's':          { x: 0, y: 1,  allowed: () => snakeSpeed.y !== -1 },
        'S':          { x: 0, y: 1,  allowed: () => snakeSpeed.y !== -1 },
        'ArrowLeft':  { x: -1, y: 0, allowed: () => snakeSpeed.x !== 1 },
        'a':          { x: -1, y: 0, allowed: () => snakeSpeed.x !== 1 },
        'A':          { x: -1, y: 0, allowed: () => snakeSpeed.x !== 1 },
        'ArrowRight': { x: 1, y: 0,  allowed: () => snakeSpeed.x !== -1 },
        'd':          { x: 1, y: 0,  allowed: () => snakeSpeed.x !== -1 },
        'D':          { x: 1, y: 0,  allowed: () => snakeSpeed.x !== -1 }
    };
    
    // Handle keyboard input
    document.addEventListener('keydown', (event) => {
        // Handle restart with 'r' key when game is over
        if (gameOver && (event.key === 'r' || event.key === 'R')) {
            resetGame();
            return;
        }
        
        // Optimize direction change with mapping
        const direction = keyDirections[event.key];
        if (direction && direction.allowed()) {
            snakeSpeed = { x: direction.x, y: direction.y };
        }
    });
    
    // Touch controls with improved accuracy and performance
    const touchControls = document.querySelectorAll('.touch-btn');
    touchControls.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Prevent multiple event handling
            e.preventDefault();
            
            if (gameOver) {
                resetGame();
                return;
            }
            
            if (this.classList.contains('up') && snakeSpeed.y !== 1) {
                snakeSpeed = { x: 0, y: -1 };
            } else if (this.classList.contains('down') && snakeSpeed.y !== -1) {
                snakeSpeed = { x: 0, y: 1 };
            } else if (this.classList.contains('left') && snakeSpeed.x !== 1) {
                snakeSpeed = { x: -1, y: 0 };
            } else if (this.classList.contains('right') && snakeSpeed.x !== -1) {
                snakeSpeed = { x: 1, y: 0 };
            }
        });
    });
    
    // Optimized swipe controls for mobile (better response)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchTimeStart = 0;
    
    canvas.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].clientX - canvasRect.left;
        touchStartY = e.changedTouches[0].clientY - canvasRect.top;
        touchTimeStart = Date.now();
        e.preventDefault(); // Prevent scrolling when touching the canvas
    }, { passive: false });
    
    canvas.addEventListener('touchend', function(e) {
        if (gameOver) {
            resetGame();
            return;
        }
        
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
                if (dx > 0 && snakeSpeed.x !== -1) {
                    snakeSpeed = { x: 1, y: 0 }; // right
                } else if (dx < 0 && snakeSpeed.x !== 1) {
                    snakeSpeed = { x: -1, y: 0 }; // left
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(dy) > minSwipeDistance) {
                if (dy > 0 && snakeSpeed.y !== -1) {
                    snakeSpeed = { x: 0, y: 1 }; // down
                } else if (dy < 0 && snakeSpeed.y !== 1) {
                    snakeSpeed = { x: 0, y: -1 }; // up
                }
            }
        }
        
        e.preventDefault();
    }, { passive: false });
    
    // Restart button with event delegation for better performance
    restartButton.addEventListener('click', resetGame);
    
    // Cleanup function to prevent memory leaks
    function cleanup() {
        window.removeEventListener('resize', debouncedResize);
        if (animationFrameId) {
            window.cancelAnimationFrame(animationFrameId);
        }
    }
    
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
    
    // Expose cleanup method for proper memory management
    window.snakeGameCleanup = cleanup;
});