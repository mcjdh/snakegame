// Renderer for the Snake game

const Renderer = (() => {
    // Canvas setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Offscreen canvas for performance
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    
    // Grid background canvas (pre-rendered)
    let gridCanvas = null;
    
    // Precalculated values for rendering
    const eyeOffsets = {
        right: { x1: 0.7, y1: 0.3, x2: 0.7, y2: 0.7 },
        left: { x1: 0.3, y1: 0.3, x2: 0.3, y2: 0.7 },
        up: { x1: 0.3, y1: 0.3, x2: 0.7, y2: 0.3 },
        down: { x1: 0.3, y1: 0.7, x2: 0.7, y2: 0.7 }
    };
    
    // Make canvas responsive
    let canvasRect = canvas.getBoundingClientRect();
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
    const debouncedResize = debounce(resizeCanvas, 100);
    window.addEventListener('resize', debouncedResize);
    
    // Create grid canvas with pre-rendered grid
    function createGridCanvas(gridSize, tileCount) {
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
    
    // Initialize renderer
    function init(gridSize, tileCount) {
        createGridCanvas(gridSize, tileCount);
        resizeCanvas();
        return {
            canvas: canvas,
            canvasRect: canvasRect
        };
    }
    
    // Draw the entire game
    function drawGame(gameState, gridSize, halfGridSize) {
        const { snake, food, forbiddenZones, lastPositions, powerUps, activePowerUps, zonePattern, score, gameOver, gameSpeed, snakeSpeed } = gameState;
        const currentTime = performance.now();
        
        // Clear offscreen canvas
        offscreenCtx.fillStyle = '#1e1e1e';
        offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid by copying from pre-rendered canvas
        offscreenCtx.drawImage(gridCanvas, 0, 0);
        
        // Draw subtle trail to show recent movement
        drawTrail(lastPositions, currentTime, gridSize);
        
        // Draw safety indicators when zones are about to decay
        drawSafetyIndicators(forbiddenZones, currentTime, gridSize);
        
        // Draw forbidden zones
        drawForbiddenZones(forbiddenZones, gridSize);
        
        // Draw power-ups
        drawPowerUps(powerUps, gridSize, halfGridSize);
        
        // Draw food
        drawFood(food, gridSize, halfGridSize);
        
        // Draw snake
        drawSnake(snake, snakeSpeed, gridSize, halfGridSize);
        
        // Draw game mode info
        drawGameInfo(zonePattern, gameState.isPowerUpActive ? gameState.isPowerUpActive : () => false);
        
        // Draw game over screen if needed
        if (gameOver) {
            drawGameOver(score);
        }
        
        // Copy offscreen canvas to the visible canvas in one operation
        ctx.drawImage(offscreenCanvas, 0, 0);
    }
    
    // Draw the movement trail
    function drawTrail(lastPositions, currentTime, gridSize) {
        if (lastPositions.length > 1) {
            for (let i = 1; i < lastPositions.length; i++) {
                const pos = lastPositions[i];
                const age = currentTime - pos.time;
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
    }
    
    // Draw visual indicators for zones that are about to decay
    function drawSafetyIndicators(forbiddenZones, currentTime, gridSize) {
        if (forbiddenZones.length > 5) {
            for (let i = 0; i < forbiddenZones.length; i++) {
                const zone = forbiddenZones[i];
                const age = currentTime - zone.createdAt;
                const baseDuration = zone.dangerLevel === 'high' ? zone.duration * 1.5 : zone.duration;
                
                // If zone is about to disappear soon, show a subtle indicator
                if (age > baseDuration * 0.75) {
                    const safetyLevel = (age - baseDuration * 0.75) / (baseDuration * 0.25);
                    offscreenCtx.fillStyle = `rgba(122, 255, 122, ${0.1 + safetyLevel * 0.1})`;
                    offscreenCtx.beginPath();
                    offscreenCtx.roundRect(
                        zone.x * gridSize + gridSize * 0.25,
                        zone.y * gridSize + gridSize * 0.25,
                        gridSize * 0.5,
                        gridSize * 0.5,
                        3
                    );
                    offscreenCtx.fill();
                }
            }
        }
    }
    
    // Draw forbidden zones
    function drawForbiddenZones(forbiddenZones, gridSize) {
        offscreenCtx.save();
        for (let i = 0; i < forbiddenZones.length; i++) {
            const zone = forbiddenZones[i];
            // Base color is red, but new zones "flash" briefly
            let zoneOpacity = zone.opacity;
            
            // Different visual appearance based on danger level
            let zoneColor;
            if (zone.dangerLevel === 'high') {
                zoneColor = zone.isNew ? 'rgba(255, 50, 50, ' : 'rgba(239, 35, 35, ';
            } else {
                zoneColor = zone.isNew ? 'rgba(255, 100, 100, ' : 'rgba(239, 68, 68, ';
            }
            offscreenCtx.fillStyle = zoneColor + zoneOpacity + ")";
            
            offscreenCtx.fillRect(
                zone.x * gridSize,
                zone.y * gridSize,
                gridSize,
                gridSize
            );
            
            // Add X pattern with improved visual effect
            offscreenCtx.strokeStyle = `rgba(255, 255, 255, ${zoneOpacity})`;
            offscreenCtx.lineWidth = zone.dangerLevel === 'high' ? 3 : 2;
            offscreenCtx.beginPath();
            offscreenCtx.moveTo(zone.x * gridSize + 4, zone.y * gridSize + 4);
            offscreenCtx.lineTo((zone.x + 1) * gridSize - 4, (zone.y + 1) * gridSize - 4);
            offscreenCtx.moveTo((zone.x + 1) * gridSize - 4, zone.y * gridSize + 4);
            offscreenCtx.lineTo(zone.x * gridSize + 4, (zone.y + 1) * gridSize - 4);
            offscreenCtx.stroke();
            
            // Add extra warning pulse for high danger zones
            if (zone.dangerLevel === 'high') {
                const pulsePhase = (performance.now() % 1000) / 1000;
                const pulseSize = Math.sin(pulsePhase * Math.PI * 2) * 3;
                
                offscreenCtx.strokeStyle = `rgba(255, 255, 255, ${zoneOpacity * 0.5})`;
                offscreenCtx.beginPath();
                offscreenCtx.roundRect(
                    zone.x * gridSize - pulseSize,
                    zone.y * gridSize - pulseSize,
                    gridSize + pulseSize * 2,
                    gridSize + pulseSize * 2,
                    3 + pulseSize
                );
                offscreenCtx.stroke();
            }
        }
        offscreenCtx.restore();
    }
    
    // Draw power-ups
    function drawPowerUps(powerUps, gridSize, halfGridSize) {
        for (let i = 0; i < powerUps.length; i++) {
            const pu = powerUps[i];
            const pulseAmount = Math.sin(pu.pulsePhase) * 2;
            
            // Draw glow effect
            offscreenCtx.shadowColor = pu.color;
            offscreenCtx.shadowBlur = 10 + pulseAmount;
            
            // Draw power-up base
            offscreenCtx.fillStyle = pu.color;
            offscreenCtx.beginPath();
            offscreenCtx.roundRect(
                pu.x * gridSize + 2,
                pu.y * gridSize + 2,
                gridSize - 4,
                gridSize - 4,
                5
            );
            offscreenCtx.fill();
            
            // Draw power-up symbol
            offscreenCtx.shadowBlur = 0;
            offscreenCtx.fillStyle = '#fff';
            offscreenCtx.font = '12px Arial';
            offscreenCtx.textAlign = 'center';
            offscreenCtx.textBaseline = 'middle';
            offscreenCtx.fillText(
                pu.symbol,
                pu.x * gridSize + halfGridSize,
                pu.y * gridSize + halfGridSize
            );
        }
    }
    
    // Draw food
    function drawFood(food, gridSize, halfGridSize) {
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
    }
    
    // Draw snake
    function drawSnake(snake, snakeSpeed, gridSize, halfGridSize) {
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            
            if (i === 0) {
                // Head
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
                
                // Position eyes based on direction
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
    }
    
    // Draw game mode info
    function drawGameInfo(zonePattern, isPowerUpActive) {
        offscreenCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        offscreenCtx.font = '12px "Segoe UI", sans-serif';
        offscreenCtx.textAlign = 'left';
        
        let patternName;
        switch(zonePattern) {
            case 'alternate': patternName = "Sparse"; break;
            case 'continuous': patternName = "Dense"; break;
            case 'random': patternName = "Chaotic"; break;
        }
        
        // Show active power-up status
        let statusText = `Without Return Mode (${patternName})`;
        if (isPowerUpActive('PHASE_THROUGH')) {
            statusText += " - PHASE ACTIVE";
        } else if (isPowerUpActive('SCORE_BOOST')) {
            statusText += " - 2X SCORE";
        }
        
        offscreenCtx.fillText(statusText, 10, 15);
    }
    
    // Draw game over screen
    function drawGameOver(score) {
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
    
    // API exposed to other modules
    return {
        init,
        drawGame,
        getCanvasRect: () => canvasRect,
        cleanup: () => window.removeEventListener('resize', debouncedResize)
    };
})();
