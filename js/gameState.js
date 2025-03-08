// Game state management

const GameState = (() => {
    // DOM elements
    const scoreElement = document.getElementById('score');
    
    // Game configuration
    const gridSize = 20;
    const tileCount = 400 / gridSize; // Canvas is 400x400
    const halfGridSize = gridSize / 2;
    
    // Power-up configuration
    const POWER_UP_TYPES = {
        CLEAR_PATH: { 
            color: '#4361ee', 
            duration: 5000, 
            effect: 'Clears nearby zones',
            symbol: '✨'
        },
        SLOW_DECAY: { 
            color: '#7209b7', 
            duration: 10000, 
            effect: 'Zones decay faster',
            symbol: '🕒'
        },
        SCORE_BOOST: { 
            color: '#ffce1a', 
            duration: 7000, 
            effect: '2x points',
            symbol: '💎'
        },
        PHASE_THROUGH: { 
            color: '#14213d', 
            duration: 3000, 
            effect: 'Pass through zones',
            symbol: '👻'
        }
    };
    
    // Game state
    let state = {
        // Core game variables
        score: 0,
        gameOver: false,
        gameSpeed: 150,
        baseSpeed: 150,
        lastRenderTime: 0,
        
        // Snake properties
        snake: [{ x: 10, y: 10 }],
        snakeSpeed: { x: 1, y: 0 },
        
        // Food
        food: {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        },
        
        // Movement tracking
        lastPositions: [],
        maxTrailLength: 10,
        moveCount: 0,
        
        // Forbidden zones
        forbiddenZones: [],
        forbiddenDuration: 3500,
        difficultyLevel: 0.8,
        zonePattern: 'alternate',
        zoneStrength: 1.0,
        
        // Combo system
        comboCount: 0,
        comboTimer: 0,
        multiplier: 1,
        
        // Adaptive difficulty
        difficultyAdjusted: false,
        consecutiveDangerZones: 0,
        
        // Power-ups
        powerUps: [],
        activePowerUps: []
    };
    
    // Initialize the game state
    function init() {
        resetState();
        return {
            gridSize,
            tileCount,
            halfGridSize
        };
    }
    
    // Reset the game state
    function resetState() {
        state.snake = [{ x: 10, y: 10 }];
        state.snakeSpeed = { x: 1, y: 0 };
        state.forbiddenZones = [];
        
        // Clear and recycle lastPositions
        while (state.lastPositions.length > 0) {
            PositionManager.recyclePosition(state.lastPositions.pop());
        }
        
        state.difficultyLevel = 0.8;
        state.zonePattern = 'alternate';
        state.moveCount = 0;
        state.score = 0;
        state.gameOver = false;
        state.gameSpeed = 150;
        state.baseSpeed = 150;
        state.powerUps = [];
        state.activePowerUps = [];
        state.comboCount = 0;
        state.multiplier = 1;
        state.difficultyAdjusted = false;
        state.consecutiveDangerZones = 0;
        
        generateFood();
        scoreElement.textContent = state.score;
        state.lastRenderTime = performance.now();
    }
    
    // Generate new food in a valid position
    function generateFood() {
        const availablePositions = [];
        
        // Create a grid to track occupied cells
        const occupiedCells = new Array(tileCount * tileCount).fill(false);
        
        // Mark snake cells as occupied
        for (let i = 0; i < state.snake.length; i++) {
            const segment = state.snake[i];
            const index = segment.y * tileCount + segment.x;
            occupiedCells[index] = true;
        }
        
        // Mark forbidden zones as occupied
        for (let i = 0; i < state.forbiddenZones.length; i++) {
            const zone = state.forbiddenZones[i];
            const index = zone.y * tileCount + zone.x;
            occupiedCells[index] = true;
        }
        
        // Mark existing power-ups as occupied
        for (let i = 0; i < state.powerUps.length; i++) {
            const pu = state.powerUps[i];
            const index = pu.y * tileCount + pu.x;
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
            state.food = availablePositions[randomIndex];
        } else {
            // Fallback if no positions are available (rare edge case)
            state.food = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount)
            };
        }
    }
    
    // Track the snake's recent positions for trail visualization
    function trackSnakePosition(currentTime) {
        if (state.snake.length > 0) {
            // Use object pooling for position objects
            const newPos = PositionManager.getPosition(state.snake[0].x, state.snake[0].y, currentTime);
            state.lastPositions.unshift(newPos);
            
            // Limit the number of positions we track
            while (state.lastPositions.length > state.maxTrailLength) {
                const oldPos = state.lastPositions.pop();
                PositionManager.recyclePosition(oldPos);
            }
        }
    }
    
    // Move the snake
    function moveSnake() {
        // Calculate new head position
        const newHead = {
            x: state.snake[0].x + state.snakeSpeed.x,
            y: state.snake[0].y + state.snakeSpeed.y
        };
        
        // Add new head to beginning of snake
        state.snake.unshift(newHead);
    }
    
    // Check for collisions
    function checkCollision() {
        // Only check collisions if the snake is actually moving
        if (state.snakeSpeed.x === 0 && state.snakeSpeed.y === 0) {
            return false;
        }
        
        const head = state.snake[0];
        
        // Wall collision
        if (
            head.x < 0 || 
            head.x >= tileCount || 
            head.y < 0 || 
            head.y >= tileCount
        ) {
            return true;
        }
        
        // Self collision
        for (let i = 1; i < state.snake.length; i++) {
            if (head.x === state.snake[i].x && head.y === state.snake[i].y) {
                return true;
            }
        }
        
        // Check if phase through power-up is active
        if (!isPowerUpActive('PHASE_THROUGH')) {
            // Collision with forbidden zones
            for (let i = 0; i < state.forbiddenZones.length; i++) {
                const zone = state.forbiddenZones[i];
                if (head.x === zone.x && head.y === zone.y) {
                    // High danger zones always kill, normal ones only if they're solid enough
                    if (zone.dangerLevel === 'high' || zone.opacity > 0.3) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    // Check if a specific power-up type is active
    function isPowerUpActive(type) {
        return state.activePowerUps.some(pu => pu.type === type && pu.active);
    }
    
    // Spawn a power-up at a valid position
    function spawnPowerUp() {
        const availablePositions = [];
        
        // Create a grid to track occupied cells
        const occupiedCells = new Array(tileCount * tileCount).fill(false);
        
        // Mark snake cells as occupied
        for (let i = 0; i < state.snake.length; i++) {
            const segment = state.snake[i];
            const index = segment.y * tileCount + segment.x;
            occupiedCells[index] = true;
        }
        
        // Mark forbidden zones as occupied
        for (let i = 0; i < state.forbiddenZones.length; i++) {
            const zone = state.forbiddenZones[i];
            const index = zone.y * tileCount + zone.x;
            occupiedCells[index] = true;
        }
        
        // Mark existing power-ups and food as occupied
        for (let i = 0; i < state.powerUps.length; i++) {
            const pu = state.powerUps[i];
            const index = pu.y * tileCount + pu.x;
            occupiedCells[index] = true;
        }
        
        // Mark food as occupied
        const foodIndex = state.food.y * tileCount + state.food.x;
        occupiedCells[foodIndex] = true;
        
        // Find all available positions
        for (let y = 0; y < tileCount; y++) {
            for (let x = 0; x < tileCount; x++) {
                const index = y * tileCount + x;
                if (!occupiedCells[index]) {
                    availablePositions.push({x, y});
                }
            }
        }
        
        // Only spawn if there are valid positions
        if (availablePositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            const pos = availablePositions[randomIndex];
            
            // Select random power-up type
            const powerUpTypes = Object.keys(POWER_UP_TYPES);
            const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            const powerUpInfo = POWER_UP_TYPES[randomType];
            
            // Create power-up object
            const newPowerUp = {
                x: pos.x,
                y: pos.y,
                type: randomType,
                color: powerUpInfo.color,
                duration: powerUpInfo.duration,
                symbol: powerUpInfo.symbol,
                pulsePhase: 0
            };
            
            state.powerUps.push(newPowerUp);
        }
    }
    
    // Apply power-up effect
    function applyPowerUp(powerUp) {
        // Create active power-up object
        const activePU = {
            type: powerUp.type,
            startTime: performance.now(),
            duration: powerUp.duration,
            active: true
        };
        
        state.activePowerUps.push(activePU);
        
        // Handle immediate effects
        if (powerUp.type === 'CLEAR_PATH') {
            // Remove nearby forbidden zones (5x5 area around snake head)
            const head = state.snake[0];
            state.forbiddenZones = state.forbiddenZones.filter(zone => {
                const distance = Math.abs(zone.x - head.x) + Math.abs(zone.y - head.y);
                return distance > 5;
            });
            showPowerUpNotification("Path Cleared!");
        } else if (powerUp.type === 'SLOW_DECAY') {
            // Double the decay rate for all zones
            state.forbiddenZones.forEach(zone => {
                zone.duration = zone.duration * 0.5;
            });
            showPowerUpNotification("Zones Decaying Faster!");
        } else if (powerUp.type === 'SCORE_BOOST') {
            showPowerUpNotification("Double Score Activated!");
        } else if (powerUp.type === 'PHASE_THROUGH') {
            showPowerUpNotification("Phase Through Activated!");
        }
    }
    
    // Update active power-ups
    function updatePowerUps(currentTime) {
        // Update power-up pulse effects
        state.powerUps.forEach(pu => {
            pu.pulsePhase = (pu.pulsePhase + 0.05) % (Math.PI * 2);
        });
        
        // Check for power-up collection
        const head = state.snake[0];
        for (let i = state.powerUps.length - 1; i >= 0; i--) {
            if (state.powerUps[i].x === head.x && state.powerUps[i].y === head.y) {
                const powerUp = state.powerUps[i];
                applyPowerUp(powerUp);
                state.powerUps.splice(i, 1);
            }
        }
        
        // Update active power-ups
        for (let i = state.activePowerUps.length - 1; i >= 0; i--) {
            const pu = state.activePowerUps[i];
            if (currentTime - pu.startTime > pu.duration) {
                pu.active = false;
                state.activePowerUps.splice(i, 1);
            }
        }
        
        // Occasionally spawn power-ups (1% chance per update, limited to 3 at a time)
        if (state.powerUps.length < 3 && Math.random() < 0.01) {
            spawnPowerUp();
        }
    }
    
    // Update game state for a frame
    function update(currentTime, deltaTime) {
        if (state.gameOver) return;
        
        // Update forbidden zones
        ZoneManager.updateZones(state.forbiddenZones, currentTime);
        
        // Update power-ups
        updatePowerUps(currentTime);
        
        // Move the snake
        moveSnake();
        
        // Check for collision
        if (checkCollision()) {
            state.gameOver = true;
            return;
        }
        
        // Track snake movement for trail
        trackSnakePosition(currentTime);
        
        // Check if snake eats food
        if (state.snake[0].x === state.food.x && state.snake[0].y === state.food.y) {
            // Calculate score with multipliers
            let points = 10;
            if (isPowerUpActive('SCORE_BOOST')) {
                points *= 2;
            }
            
            // Apply points
            state.score += points;
            scoreElement.textContent = state.score;
            
            // Create score popup
            showScorePopup(points, state.food.x * gridSize + halfGridSize, state.food.y * gridSize);
            
            // Generate new food
            generateFood();
            
            // Increase game speed and adjust zone patterns based on score
            if (state.score % 60 === 0 && state.gameSpeed > 70) {
                state.gameSpeed -= 4;
                
                // Adjust difficulty and pattern as score increases
                if (state.difficultyLevel < 2.5) {
                    state.difficultyLevel += 0.15;
                }
                
                // Change zone pattern as player progresses
                if (state.score === 60) {
                    state.zonePattern = 'continuous'; // More challenging at higher scores
                } else if (state.score === 120) {
                    state.zonePattern = 'random';
                    state.maxTrailLength += 5; // Longer trail tracking
                }
            }
        } else {
            // Remove tail segment
            const tail = state.snake.pop();
            
            // Create forbidden zone where the tail was
            if (state.snake.length > 3) {
                ZoneManager.createZone(
                    tail.x, 
                    tail.y, 
                    currentTime, 
                    state.moveCount, 
                    state.zonePattern, 
                    state.difficultyLevel,
                    state.forbiddenZones,
                    state.forbiddenDuration
                );
            }
        }
        
        state.moveCount++;
    }
    
    // Get full game state (for rendering)
    function getState() {
        return { ...state };
    }
    
    // Set snake direction
    function setDirection(direction) {
        state.snakeSpeed = direction;
    }
    
    // Public API
    return {
        init,
        resetState,
        update,
        getState,
        setDirection,
        isPowerUpActive,
        trackSnakePosition
    };
})();
