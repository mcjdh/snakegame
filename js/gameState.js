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
            symbol: '✨',
            rarity: 'common'
        },
        SLOW_DECAY: { 
            color: '#7209b7', 
            duration: 10000, 
            effect: 'Zones decay faster',
            symbol: '🕒',
            rarity: 'uncommon'
        },
        SCORE_BOOST: { 
            color: '#ffce1a', 
            duration: 7000, 
            effect: '2x points',
            symbol: '💎',
            rarity: 'uncommon'
        },
        PHASE_THROUGH: { 
            color: '#14213d', 
            duration: 3000, 
            effect: 'Pass through zones',
            symbol: '👻',
            rarity: 'rare'
        },
        SPEED_BOOST: {
            color: '#06d6a0',
            duration: 5000,
            effect: 'Move faster!',
            symbol: '⚡',
            rarity: 'common'
        },
        MAGNET: {
            color: '#e63946',
            duration: 8000,
            effect: 'Attract food',
            symbol: '🧲',
            rarity: 'uncommon'
        },
        SHRINK: {
            color: '#fb8500',
            duration: 0,
            effect: 'Shrink snake',
            symbol: '📏',
            rarity: 'rare'
        },
        INVULNERABILITY: {
            color: '#ffd60a',
            duration: 3000,
            effect: 'Invulnerable',
            symbol: '🛡️',
            rarity: 'epic'
        }
    };
    
    // Food types (new)
    const FOOD_TYPES = {
        NORMAL: { color: '#ef4444', points: 10, chance: 0.7 },
        BONUS: { color: '#ff9f1c', points: 20, chance: 0.2 },
        SUPER: { color: '#f72585', points: 50, chance: 0.09 },
        EPIC: { color: '#7209b7', points: 100, chance: 0.01 }
    };

    // Level configuration (new)
    const LEVEL_CONFIG = [
        { threshold: 0, zonePattern: 'alternate', speed: 150, zoneDuration: 3500, name: "Beginner" },
        { threshold: 100, zonePattern: 'continuous', speed: 140, zoneDuration: 3200, name: "Intermediate" },
        { threshold: 250, zonePattern: 'random', speed: 130, zoneDuration: 3000, name: "Advanced" },
        { threshold: 500, zonePattern: 'random', speed: 120, zoneDuration: 2800, name: "Expert" },
        { threshold: 1000, zonePattern: 'random', speed: 100, zoneDuration: 2500, name: "Master" }
    ];
    
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
            y: Math.floor(Math.random() * tileCount),
            type: 'NORMAL'
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
        activePowerUps: [],
        
        // Player stats (new)
        level: 0,
        levelName: "Beginner",
        powerUpsCollected: 0,
        highestCombo: 0,
        
        // Special effects (new)
        particles: [],
        screenShake: { intensity: 0, duration: 0, startTime: 0 }
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
        state.level = 0;
        state.levelName = LEVEL_CONFIG[0].name;
        state.powerUpsCollected = 0;
        state.highestCombo = 0;
        state.particles = [];
        state.screenShake = { intensity: 0, duration: 0, startTime: 0 };
        
        generateFood();
        scoreElement.textContent = state.score;
        state.lastRenderTime = performance.now();
    }
    
    // Generate new food in a valid position with food type
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
            const pos = availablePositions[randomIndex];
            
            // Select food type based on rarity and game progression
            const foodTypeRoll = Math.random();
            let accumulatedChance = 0;
            let selectedType = 'NORMAL';
            
            // Adjust food type chances based on score/level (higher chances for better food as score increases)
            const foodTypeChances = {
                NORMAL: Math.max(0.4, 0.7 - (state.level * 0.07)),  // Decreases as level increases
                BONUS: Math.min(0.4, 0.2 + (state.level * 0.04)),   // Increases with level
                SUPER: Math.min(0.15, 0.09 + (state.level * 0.015)), // Increases slightly with level
                EPIC: Math.min(0.05, 0.01 + (state.level * 0.01))   // Increases slightly with level
            };
            
            for (const [type, props] of Object.entries(FOOD_TYPES)) {
                accumulatedChance += foodTypeChances[type] || props.chance;
                if (foodTypeRoll <= accumulatedChance) {
                    selectedType = type;
                    break;
                }
            }
            
            state.food = {
                x: pos.x,
                y: pos.y,
                type: selectedType,
                pulsePhase: 0
            };
            
            // Add particles for special food types
            if (selectedType !== 'NORMAL') {
                createFoodSpawnParticles(pos.x, pos.y, FOOD_TYPES[selectedType].color);
            }
        } else {
            // Fallback if no positions are available (rare edge case)
            // Find a position that avoids at least the snake
            let fallbackX, fallbackY;
            let attempts = 0;
            const maxAttempts = 50; // Limit attempts to avoid infinite loop
            
            do {
                fallbackX = Math.floor(Math.random() * tileCount);
                fallbackY = Math.floor(Math.random() * tileCount);
                attempts++;
                
                // Check if this position would overlap with the snake
                const wouldOverlapSnake = state.snake.some(segment => 
                    segment.x === fallbackX && segment.y === fallbackY);
                
                if (!wouldOverlapSnake) {
                    break; // Found a valid position
                }
            } while (attempts < maxAttempts);
            
            state.food = {
                x: fallbackX,
                y: fallbackY,
                type: 'NORMAL',
                pulsePhase: 0
            };
        }
    }
    
    // Create particles for food spawns (new)
    function createFoodSpawnParticles(x, y, color) {
        const particleCount = 10;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            state.particles.push({
                x: x * gridSize + halfGridSize,
                y: y * gridSize + halfGridSize,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color: color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.04
            });
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
        // Check if speed boost is active
        const speedModifier = isPowerUpActive('SPEED_BOOST') ? 1.5 : 1;
        
        // Calculate new head position with potential speed boost
        const newHead = {
            x: state.snake[0].x + state.snakeSpeed.x * speedModifier,
            y: state.snake[0].y + state.snakeSpeed.y * speedModifier
        };
        
        // If speed boost caused position to skip cells, round to nearest cell
        if (speedModifier > 1) {
            newHead.x = Math.round(newHead.x);
            newHead.y = Math.round(newHead.y);
        }
        
        // Add new head to beginning of snake
        state.snake.unshift(newHead);
        
        // Check for magnet power-up to attract food
        if (isPowerUpActive('MAGNET') && state.food) {
            const headX = state.snake[0].x;
            const headY = state.snake[0].y;
            const foodX = state.food.x;
            const foodY = state.food.y;
            
            // If food is within 5 units, move it 1 step closer to snake
            if (Math.abs(headX - foodX) + Math.abs(headY - foodY) <= 5) {
                // Calculate potential new positions
                let newX = foodX;
                let newY = foodY;
                
                if (foodX < headX) newX += 1;
                else if (foodX > headX) newX -= 1;
                
                if (foodY < headY) newY += 1;
                else if (foodY > headY) newY -= 1;
                
                // Check if the new position would overlap with snake or forbidden zone
                const wouldOverlap = state.snake.some(segment => 
                    segment.x === newX && segment.y === newY);
                
                const wouldOverlapZone = state.forbiddenZones.some(zone => 
                    zone.x === newX && zone.y === newY);
                
                // Only move food if it wouldn't cause overlap
                if (!wouldOverlap && !wouldOverlapZone) {
                    state.food.x = newX;
                    state.food.y = newY;
                    
                    // Add attraction particle trail
                    createMagnetParticles(foodX, foodY, headX, headY);
                }
            }
        }
    }
    
    // Create magnet attraction particles (new)
    function createMagnetParticles(foodX, foodY, headX, headY) {
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
            const randOffset = (Math.random() - 0.5) * 0.5;
            state.particles.push({
                x: foodX * gridSize + halfGridSize + randOffset,
                y: foodY * gridSize + halfGridSize + randOffset,
                vx: (headX - foodX) * 0.1,
                vy: (headY - foodY) * 0.1,
                radius: 1 + Math.random() * 2,
                color: '#e63946',
                alpha: 0.7,
                decay: 0.05 + Math.random() * 0.05
            });
        }
    }
    
    // Check if current level should be updated based on score (new)
    function checkLevelProgression() {
        const currentLevel = state.level;
        let newLevel = currentLevel;
        
        // Find appropriate level based on score
        for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
            if (state.score >= LEVEL_CONFIG[i].threshold) {
                newLevel = i;
                break;
            }
        }
        
        // If level changed, update game parameters
        if (newLevel !== currentLevel) {
            state.level = newLevel;
            state.levelName = LEVEL_CONFIG[newLevel].name;
            state.gameSpeed = LEVEL_CONFIG[newLevel].speed;
            state.baseSpeed = LEVEL_CONFIG[newLevel].speed;
            state.zonePattern = LEVEL_CONFIG[newLevel].zonePattern;
            state.forbiddenDuration = LEVEL_CONFIG[newLevel].zoneDuration;
            
            // Show level up notification and add visual effect
            showPowerUpNotification(`Level Up: ${state.levelName}!`);
            triggerScreenShake(5, 500);
            
            // Create celebration particles
            createLevelUpParticles();
            
            // Play sound if implemented
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('levelUp');
            }
            
            return true;
        }
        
        return false;
    }
    
    // Create level up celebration particles (new)
    function createLevelUpParticles() {
        const particleCount = 30;
        const centerX = 200; // Half of canvas width (400/2)
        const centerY = 200; // Half of canvas height (400/2)
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const hue = Math.floor(Math.random() * 360);
            
            state.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 4,
                color: `hsl(${hue}, 80%, 60%)`,
                alpha: 1,
                decay: 0.01 + Math.random() * 0.02
            });
        }
    }
    
    // Trigger screen shake effect (new)
    function triggerScreenShake(intensity, duration) {
        state.screenShake = {
            intensity: intensity,
            duration: duration,
            startTime: performance.now()
        };
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
        
        // Add invulnerability power-up check
        if (isPowerUpActive('INVULNERABILITY')) {
            return false;
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
            
            // Select random power-up type based on rarity and game state
            const powerUpTypes = Object.entries(POWER_UP_TYPES);
            
            // Dynamic rarity weights based on game state
            const rarityWeights = {
                'common': 0.5,
                'uncommon': 0.3,
                'rare': 0.15,
                'epic': 0.05
            };
            
            // Adjust weights based on game state
            if (state.snake.length > 15) {
                // When snake is long, boost the chance for SHRINK power-up
                rarityWeights.rare += 0.1;
                rarityWeights.common -= 0.1;
            }
            
            if (state.forbiddenZones.length > 20) {
                // When there are many zones, boost chance for CLEAR_PATH and PHASE_THROUGH
                rarityWeights.uncommon += 0.15;
                rarityWeights.common -= 0.15;
            }
            
            // Weight-based selection
            const roll = Math.random();
            let cumulativeWeight = 0;
            let selectedType = null;
            
            for (const [type, info] of powerUpTypes) {
                cumulativeWeight += rarityWeights[info.rarity];
                if (roll <= cumulativeWeight) {
                    selectedType = type;
                    break;
                }
            }
            
            // Fallback if no type was selected
            if (!selectedType) {
                selectedType = powerUpTypes[0][0]; // Default to first type
            }
            
            const powerUpInfo = POWER_UP_TYPES[selectedType];
            
            // Create power-up object
            const newPowerUp = {
                x: pos.x,
                y: pos.y,
                type: selectedType,
                color: powerUpInfo.color,
                duration: powerUpInfo.duration,
                symbol: powerUpInfo.symbol,
                pulsePhase: 0,
                rarity: powerUpInfo.rarity
            };
            
            state.powerUps.push(newPowerUp);
            
            // Create spawn particles based on rarity
            const particleColors = {
                'common': '#4ade80',
                'uncommon': '#60a5fa',
                'rare': '#c084fc',
                'epic': '#fcd34d'
            };
            
            createFoodSpawnParticles(pos.x, pos.y, particleColors[powerUpInfo.rarity]);
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
        state.powerUpsCollected++;
        
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
        } else if (powerUp.type === 'SPEED_BOOST') {
            showPowerUpNotification("Speed Boost Activated!");
        } else if (powerUp.type === 'MAGNET') {
            showPowerUpNotification("Food Magnet Activated!");
        } else if (powerUp.type === 'SHRINK') {
            // Shrink the snake by half but minimum 3 segments
            const newLength = Math.max(3, Math.floor(state.snake.length / 2));
            state.snake = state.snake.slice(0, newLength);
            showPowerUpNotification("Snake Shrunk!");
            triggerScreenShake(3, 300);
        } else if (powerUp.type === 'INVULNERABILITY') {
            showPowerUpNotification("Invulnerable!");
            triggerScreenShake(3, 300);
        }
        
        // Play power-up sound if implemented
        if (typeof SoundManager !== 'undefined') {
            SoundManager.play('powerUp');
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
        // Ensure there's enough space for power-ups
        if (state.powerUps.length < 3 && 
            Math.random() < 0.01 && 
            tileCount * tileCount - state.snake.length - state.forbiddenZones.length > 10) {
            spawnPowerUp();
        }
    }
    
    // Update particles (new)
    function updateParticles() {
        if (state.particles.length === 0) return;
        
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Update alpha
            p.alpha -= p.decay;
            
            // Remove dead particles
            if (p.alpha <= 0) {
                state.particles.splice(i, 1);
            }
        }
    }
    
    // Update screen shake (new)
    function updateScreenShake(currentTime) {
        if (!state.screenShake.intensity) return { x: 0, y: 0 };
        
        const elapsed = currentTime - state.screenShake.startTime;
        if (elapsed >= state.screenShake.duration) {
            state.screenShake.intensity = 0;
            return { x: 0, y: 0 };
        }
        
        const progress = elapsed / state.screenShake.duration;
        const decayFactor = 1 - progress;
        const intensity = state.screenShake.intensity * decayFactor;
        
        return {
            x: (Math.random() * 2 - 1) * intensity,
            y: (Math.random() * 2 - 1) * intensity
        };
    }
    
    // Handle combo system for consecutive food collection (new)
    function updateComboSystem(currentTime) {
        // Decay combo if timer has elapsed
        if (state.comboCount > 0 && currentTime - state.comboTimer > 5000) {
            state.comboCount = 0;
            state.multiplier = 1;
        }
    }
    
    // Update game state for a frame
    function update(currentTime, deltaTime) {
        if (state.gameOver) return;
        
        // Update forbidden zones
        ZoneManager.updateZones(state.forbiddenZones, currentTime);
        
        // Update power-ups
        updatePowerUps(currentTime);
        
        // Update particles
        updateParticles();
        
        // Update combo system
        updateComboSystem(currentTime);
        
        // Move the snake
        moveSnake();
        
        // Check for collision
        if (checkCollision()) {
            state.gameOver = true;
            
            // Add death particles
            createDeathParticles();
            
            // Trigger screen shake
            triggerScreenShake(10, 800);
            
            // Play death sound if implemented
            if (typeof SoundManager !== 'undefined') {
                SoundManager.play('death');
            }
            
            return;
        }
        
        // Track snake movement for trail
        trackSnakePosition(currentTime);
        
        // Check if snake eats food
        if (state.snake[0].x === state.food.x && state.snake[0].y === state.food.y) {
            // Get food data
            const foodType = state.food.type;
            const foodData = FOOD_TYPES[foodType];
            
            // Update combo system
            state.comboCount++;
            state.comboTimer = currentTime;
            state.multiplier = 1 + Math.min(1, state.comboCount * 0.1); // Cap at 2x
            state.highestCombo = Math.max(state.highestCombo, state.comboCount);
            
            // Calculate score with multipliers
            let points = foodData.points;
            if (isPowerUpActive('SCORE_BOOST')) {
                points *= 2;
            }
            // Apply combo multiplier
            points = Math.floor(points * state.multiplier);
            
            // Add points
            state.score += points;
            scoreElement.textContent = state.score;
            
            // Create score popup with combo information
            let comboText = '';
            if (state.comboCount > 1) {
                comboText = ` x${state.comboCount}`;
            }
            showScorePopup(`+${points}${comboText}`, state.food.x * gridSize + halfGridSize, state.food.y * gridSize);
            
            // Create food collection particles
            createFoodCollectionParticles(state.food.x, state.food.y, foodData.color);
            
            // Generate new food
            generateFood();
            
            // Check for level progression
            const leveledUp = checkLevelProgression();
            
            // If we didn't just level up, adjust game speed
            if (!leveledUp && state.score % 60 === 0 && state.gameSpeed > 70) {
                state.gameSpeed -= 4;
                
                // Adjust difficulty and pattern as score increases
                if (state.difficultyLevel < 2.5) {
                    state.difficultyLevel += 0.15;
                }
            }
            
            // Add small screen shake for food collection
            if (foodType !== 'NORMAL') {
                const intensity = foodType === 'EPIC' ? 8 : (foodType === 'SUPER' ? 5 : 3);
                triggerScreenShake(intensity, 250);
            }
            
            // Play appropriate sound effect if implemented
            if (typeof SoundManager !== 'undefined') {
                const soundType = foodType === 'NORMAL' ? 'eat' : 'eatSpecial';
                SoundManager.play(soundType);
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
                    state.forbiddenDuration,
                    state.snake // Pass snake to prevent zones from spawning on snake
                );
            }
        }
        
        state.moveCount++;
    }
    
    // Create food collection particles (new)
    function createFoodCollectionParticles(x, y, color) {
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 2;
            state.particles.push({
                x: x * gridSize + halfGridSize,
                y: y * gridSize + halfGridSize,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1.5 + Math.random() * 3,
                color: color,
                alpha: 1,
                decay: 0.03 + Math.random() * 0.05
            });
        }
    }
    
    // Create death particles (new)
    function createDeathParticles() {
        if (state.snake.length === 0) return;
        
        const head = state.snake[0];
        const particleCount = 25;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 3;
            state.particles.push({
                x: head.x * gridSize + halfGridSize,
                y: head.y * gridSize + halfGridSize,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 4,
                color: i % 2 === 0 ? '#4ade80' : '#ef4444',
                alpha: 1,
                decay: 0.01 + Math.random() * 0.03
            });
        }
    }
    
    // Get full game state (for rendering)
    function getState() {
        return { ...state, shake: updateScreenShake(performance.now()) };
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
