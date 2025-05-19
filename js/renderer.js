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
    
    // Cache for power-up types info
    let powerUpTypes = null;
    
    // Initialize renderer
    function init(gridSize, tileCount, powerUpTypesData) {
        createGridCanvas(gridSize, tileCount);
        resizeCanvas();
        
        // Store power-up types data for UI
        if (powerUpTypesData) {
            powerUpTypes = powerUpTypesData;
        }
        
        return {
            canvas: canvas,
            canvasRect: canvasRect
        };
    }
    
    // Draw the entire game
    function drawGame(gameState, gridSize, halfGridSize) {
        const { snake, food, forbiddenZones, lastPositions, powerUps, activePowerUps, 
                zonePattern, score, gameOver, gameSpeed, snakeSpeed, particles, 
                shake, level, levelName, comboCount, multiplier } = gameState;
        const currentTime = performance.now();
        
        // Clear offscreen canvas
        offscreenCtx.fillStyle = '#1e1e1e';
        offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply screen shake if active
        if (shake && (shake.x !== 0 || shake.y !== 0)) {
            offscreenCtx.save();
            offscreenCtx.translate(shake.x, shake.y);
        }
        
        // Draw grid by copying from pre-rendered canvas
        offscreenCtx.drawImage(gridCanvas, 0, 0);
        
        // Draw subtle trail to show recent movement
        drawTrail(lastPositions, currentTime, gridSize);
        
        // Draw safety indicators when zones are about to decay
        drawSafetyIndicators(forbiddenZones, currentTime, gridSize);
        
        // Draw forbidden zones
        drawForbiddenZones(forbiddenZones, gridSize);
        
        // Draw particles
        drawParticles(particles);
        
        // Draw power-ups
        drawPowerUps(powerUps, gridSize, halfGridSize);
        
        // Draw food with type variation
        drawFood(food, gridSize, halfGridSize);
        
        // Draw snake with active effects
        drawSnake(snake, snakeSpeed, gridSize, halfGridSize, activePowerUps);
        
        // Draw game mode info and current level
        drawGameInfo(zonePattern, gameState.level, gameState.levelName, gameState.isPowerUpActive ? gameState.isPowerUpActive : () => false);
        
        // Draw active power-up indicators
        drawPowerUpIndicators(activePowerUps, currentTime);
        
        // Draw combo indicator if combo is active
        if (comboCount > 1) {
            drawComboIndicator(comboCount, multiplier);
        }
        
        // Draw game over screen if needed
        if (gameOver) {
            drawGameOver(score);
        }
        
        // Copy offscreen canvas to the visible canvas in one operation
        ctx.drawImage(offscreenCanvas, 0, 0);
        
        // Reset any transformations 
        if (shake && (shake.x !== 0 || shake.y !== 0)) {
            offscreenCtx.restore();
        }
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
    
    // Draw particles
    function drawParticles(particles) {
        if (!particles || particles.length === 0) return;
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            offscreenCtx.globalAlpha = p.alpha;
            offscreenCtx.fillStyle = p.color;
            offscreenCtx.beginPath();
            offscreenCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            offscreenCtx.fill();
        }
        
        // Reset alpha
        offscreenCtx.globalAlpha = 1;
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
    
    // Draw food with type variations
    function drawFood(food, gridSize, halfGridSize) {
        if (!food) return;
        
        // Get food color based on type
        let foodColor = '#ef4444'; // Default red
        let glowStrength = 10;
        let size = halfGridSize - 1;
        
        if (food.type) {
            // Different appearances based on food type
            switch (food.type) {
                case 'NORMAL':
                    foodColor = '#ef4444';
                    break;
                case 'BONUS':
                    foodColor = '#ff9f1c';
                    glowStrength = 12;
                    size += 1;
                    break;
                case 'SUPER':
                    foodColor = '#f72585';
                    glowStrength = 15;
                    size += 2;
                    
                    // Add pulse effect for super food
                    const pulsePhase = (performance.now() % 1000) / 1000;
                    const pulseFactor = 1 + 0.2 * Math.sin(pulsePhase * Math.PI * 2);
                    size *= pulseFactor;
                    break;
                case 'EPIC':
                    foodColor = '#7209b7';
                    glowStrength = 18;
                    size += 3;
                    
                    // Add rainbow effect for epic food
                    const hue = (performance.now() / 20) % 360;
                    foodColor = `hsl(${hue}, 80%, 60%)`;
                    break;
            }
        }
        
        // Draw glow
        offscreenCtx.shadowColor = foodColor;
        offscreenCtx.shadowBlur = glowStrength;
        
        // Draw food
        offscreenCtx.fillStyle = foodColor;
        offscreenCtx.beginPath();
        offscreenCtx.arc(
            food.x * gridSize + halfGridSize,
            food.y * gridSize + halfGridSize,
            size,
            0,
            Math.PI * 2
        );
        offscreenCtx.fill();
        
        // Reset shadow
        offscreenCtx.shadowBlur = 0;
    }
    
    // Draw snake with active effects
    function drawSnake(snake, snakeSpeed, gridSize, halfGridSize, activePowerUps) {
        if (!snake || snake.length === 0) return;
        
        // Check for special effects
        const isPhasing = activePowerUps && activePowerUps.some(pu => pu.type === 'PHASE_THROUGH' && pu.active);
        const isInvulnerable = activePowerUps && activePowerUps.some(pu => pu.type === 'INVULNERABILITY' && pu.active);
        const hasSpeedBoost = activePowerUps && activePowerUps.some(pu => pu.type === 'SPEED_BOOST' && pu.active);
        
        // Draw snake body segments with special effects
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            
            // Apply special effects
            if (isInvulnerable) {
                // Golden snake for invulnerability
                const hue = (performance.now() / 10 + i * 5) % 360;
                offscreenCtx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            } else if (isPhasing) {
                // Semi-transparent ghost effect when phasing
                if (i === 0) {
                    offscreenCtx.fillStyle = 'rgba(74, 222, 128, 0.9)'; // Head
                } else {
                    const alpha = 0.7 - (i / snake.length * 0.3);
                    offscreenCtx.fillStyle = `rgba(74, 222, 128, ${alpha})`;
                }
            } else if (hasSpeedBoost) {
                // Energized appearance for speed boost
                if (i === 0) {
                    offscreenCtx.fillStyle = '#4ade80'; // Head
                } else {
                    // Alternating pattern for speed boost
                    const factor = (i % 2 === 0) ? 60 : 40;
                    offscreenCtx.fillStyle = `hsl(142, 76%, ${factor}%)`;
                }
            } else {
                // Normal coloring
                if (i === 0) {
                    offscreenCtx.fillStyle = '#4ade80'; // Head
                } else {
                    // Body with gradient
                    offscreenCtx.fillStyle = `hsl(142, 76%, ${70 - (i * 2)}%)`;
                }
            }
            
            // Draw segment
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
            
            // Add trail for speed boost
            if (hasSpeedBoost && i === 0) {
                const trailLength = 3;
                const direction = { x: -snakeSpeed.x, y: -snakeSpeed.y }; // Opposite of movement
                
                offscreenCtx.globalAlpha = 0.7;
                for (let t = 1; t <= trailLength; t++) {
                    const trailX = segment.x + direction.x * t * 0.5;
                    const trailY = segment.y + direction.y * t * 0.5;
                    const alpha = 0.7 - (t / trailLength * 0.6);
                    const size = gridSize - 2 - (t * 3);
                    
                    offscreenCtx.fillStyle = `rgba(74, 222, 128, ${alpha})`;
                    offscreenCtx.beginPath();
                    offscreenCtx.roundRect(
                        trailX * gridSize + (gridSize - size) / 2,
                        trailY * gridSize + (gridSize - size) / 2,
                        size,
                        size,
                        4
                    );
                    offscreenCtx.fill();
                }
                offscreenCtx.globalAlpha = 1.0;
            }
        }
    }
    
    // Draw game mode info and level
    function drawGameInfo(zonePattern, level, levelName, isPowerUpActive) {
        offscreenCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        offscreenCtx.font = '12px "Segoe UI", sans-serif';
        offscreenCtx.textAlign = 'left';
        
        let patternName;
        switch(zonePattern) {
            case 'alternate': patternName = "Sparse"; break;
            case 'continuous': patternName = "Dense"; break;
            case 'random': patternName = "Chaotic"; break;
        }
        
        // Show level and active effects
        let statusText = `Level ${level+1}: ${levelName} - ${patternName}`;
        
        offscreenCtx.fillText(statusText, 10, 15);
    }
    
    // Draw combo indicator
    function drawComboIndicator(comboCount, multiplier) {
        offscreenCtx.save();
        
        // Position in the top right
        const x = canvas.width - 10;
        const y = 30;
        
        // Draw background
        offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        offscreenCtx.beginPath();
        offscreenCtx.roundRect(x - 90, y - 20, 90, 30, 5);
        offscreenCtx.fill();
        
        // Draw text
        offscreenCtx.fillStyle = '#ffd60a';
        offscreenCtx.font = 'bold 16px "Segoe UI", sans-serif';
        offscreenCtx.textAlign = 'right';
        offscreenCtx.fillText(`Combo: ${comboCount}x`, x - 10, y);
        
        // Draw multiplier
        offscreenCtx.fillStyle = '#4ade80';
        offscreenCtx.font = '12px "Segoe UI", sans-serif';
        offscreenCtx.fillText(`x${multiplier.toFixed(1)}`, x - 10, y + 15);
        
        offscreenCtx.restore();
    }
    
    // Draw power-up indicators
    function drawPowerUpIndicators(activePowerUps, currentTime) {
        if (!activePowerUps || activePowerUps.length === 0) return;
        
        const startY = 60;
        const height = 30;
        const spacing = 35;
        
        activePowerUps.forEach((pu, index) => {
            // Skip if no duration (like instant power-ups)
            if (!pu.duration) return;
            
            const y = startY + index * spacing;
            const progress = 1 - ((currentTime - pu.startTime) / pu.duration);
            
            // Only show if there's time remaining
            if (progress <= 0) return;
            
            offscreenCtx.save();
            
            // Draw background
            offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            offscreenCtx.beginPath();
            offscreenCtx.roundRect(10, y, 120, height, 5);
            offscreenCtx.fill();
            
            // Draw progress bar
            const barWidth = 110 * progress;
            const hue = 120 * progress; // Green to red gradient
            offscreenCtx.fillStyle = `hsl(${hue}, 80%, 60%)`;
            offscreenCtx.beginPath();
            offscreenCtx.roundRect(15, y + 5, barWidth, height - 10, 3);
            offscreenCtx.fill();
            
            // Default values if no symbol info
            let symbol = '✨';
            let typeName = pu.type.replace(/_/g, ' ');
            
            // Use cached power-up types if available
            if (powerUpTypes && powerUpTypes[pu.type]) {
                symbol = powerUpTypes[pu.type].symbol || '✨';
            }
            
            // Draw icon
            offscreenCtx.fillStyle = '#ffffff';
            offscreenCtx.font = '14px Arial';
            offscreenCtx.textAlign = 'left';
            offscreenCtx.textBaseline = 'middle';
            offscreenCtx.fillText(symbol, 20, y + height/2);
            
            // Draw name
            offscreenCtx.fillStyle = '#ffffff';
            offscreenCtx.font = 'bold 12px "Segoe UI", sans-serif';
            offscreenCtx.textAlign = 'left';
            offscreenCtx.fillText(typeName, 40, y + height/2);
            
            offscreenCtx.restore();
        });
    }
    
    // Draw game over screen with enhanced stats
    function drawGameOver(score) {
        // Draw background overlay
        offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        offscreenCtx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw game over title
        offscreenCtx.fillStyle = '#f5f5f5';
        offscreenCtx.font = 'bold 36px "Segoe UI", sans-serif';
        offscreenCtx.textAlign = 'center';
        offscreenCtx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 100);
        
        // Draw score
        offscreenCtx.font = '24px "Segoe UI", sans-serif';
        offscreenCtx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 - 60);
        
        // Draw high scores if available
        if (typeof Settings !== 'undefined') {
            const highScores = Settings.getSettings().highScores;
            if (highScores && highScores.length > 0) {
                offscreenCtx.fillStyle = '#ffce1a';
                offscreenCtx.fillText('High Scores', canvas.width / 2, canvas.height / 2 - 20);
                
                offscreenCtx.fillStyle = '#f5f5f5';
                offscreenCtx.font = '18px "Segoe UI", sans-serif';
                
                const displayScores = highScores.slice(0, 3); // Show top 3 scores
                displayScores.forEach((highScore, index) => {
                    offscreenCtx.fillText(
                        `${index + 1}. ${highScore}`, 
                        canvas.width / 2, 
                        canvas.height / 2 + 10 + (index * 25)
                    );
                });
            }
        }
        
        // Draw restart instructions
        offscreenCtx.font = '20px "Segoe UI", sans-serif';
        offscreenCtx.fillStyle = '#4ade80';
        offscreenCtx.fillText('Press R or Tap Restart', canvas.width / 2, canvas.height / 2 + 80);
    }
    
    // API exposed to other modules
    return {
        init,
        drawGame,
        getCanvasRect: () => canvasRect,
        cleanup: () => window.removeEventListener('resize', debouncedResize)
    };
})();
