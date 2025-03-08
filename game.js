document.addEventListener('DOMContentLoaded', () => {
    // Game canvas setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const restartButton = document.getElementById('restartButton');
    
    // Make canvas responsive
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.clientWidth;
        
        // Set canvas display size
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${containerWidth}px`;
        
        // Keep the same logical resolution for game logic
        canvas.width = 400;
        canvas.height = 400;
    }
    
    // Call resize on load and window resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Game constants
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    
    // Game variables
    let score = 0;
    let gameOver = false;
    let gameSpeed = 100;  // Initial speed (milliseconds)
    let lastRenderTime = 0;
    
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
    
    // Game loop using requestAnimationFrame
    function gameLoop(currentTime) {
        if (gameOver) {
            drawGame();
            return;
        }

        window.requestAnimationFrame(gameLoop);
        
        // Throttle game updates based on game speed
        const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
        if (secondsSinceLastRender < gameSpeed / 1000) return;
        lastRenderTime = currentTime;
        
        // Update game state
        moveSnake();
        checkCollision();
        
        // Check if snake eats food
        if (snake[0].x === food.x && snake[0].y === food.y) {
            // Don't remove tail to make snake longer
            generateFood();
            score += 10;
            scoreElement.textContent = score;
            
            // Increase game speed (make it faster) after certain score thresholds
            if (score % 50 === 0 && gameSpeed > 50) {
                gameSpeed -= 5;
            }
        } else {
            // Remove tail segment
            snake.pop();
        }
        
        // Draw everything
        drawGame();
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
    
    // Check for collisions
    function checkCollision() {
        // Only check collisions if the snake is actually moving
        if (snakeSpeed.x === 0 && snakeSpeed.y === 0) {
            return;
        }
        
        // Wall collision
        if (
            snake[0].x < 0 || 
            snake[0].x >= tileCount || 
            snake[0].y < 0 || 
            snake[0].y >= tileCount
        ) {
            gameOver = true;
            return;
        }
        
        // Self collision (start from index 1 to skip the head)
        for (let i = 1; i < snake.length; i++) {
            if (snake[0].x === snake[i].x && snake[0].y === snake[i].y) {
                gameOver = true;
                return;
            }
        }
    }
    
    // Generate new food position
    function generateFood() {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        
        // Make sure food doesn't appear on snake
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                generateFood(); // Try again
                break;
            }
        }
    }
    
    // Draw game elements
    function drawGame() {
        // Clear canvas
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid (subtle)
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 0.5;
        
        for(let i = 0; i <= tileCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, 0);
            ctx.lineTo(i * gridSize, canvas.height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, i * gridSize);
            ctx.lineTo(canvas.width, i * gridSize);
            ctx.stroke();
        }
        
        // Draw food with a glow effect
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize/2,
            food.y * gridSize + gridSize/2,
            gridSize/2 - 1,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Draw snake with segments and rounded corners
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            
            if (i === 0) {
                // Head - different color
                ctx.fillStyle = '#4ade80';
            } else {
                // Body with gradient
                ctx.fillStyle = `hsl(142, 76%, ${70 - (i * 2)}%)`;
            }
            
            ctx.beginPath();
            ctx.roundRect(
                segment.x * gridSize, 
                segment.y * gridSize, 
                gridSize - 2, 
                gridSize - 2,
                4
            );
            ctx.fill();
            
            // Add eye details to the head
            if (i === 0) {
                ctx.fillStyle = '#000';
                
                // Position eyes based on direction
                let eyeX1, eyeY1, eyeX2, eyeY2;
                
                if (snakeSpeed.x === 1) { // Right
                    eyeX1 = segment.x * gridSize + gridSize * 0.7;
                    eyeY1 = segment.y * gridSize + gridSize * 0.3;
                    eyeX2 = segment.x * gridSize + gridSize * 0.7;
                    eyeY2 = segment.y * gridSize + gridSize * 0.7;
                } else if (snakeSpeed.x === -1) { // Left
                    eyeX1 = segment.x * gridSize + gridSize * 0.3;
                    eyeY1 = segment.y * gridSize + gridSize * 0.3;
                    eyeX2 = segment.x * gridSize + gridSize * 0.3;
                    eyeY2 = segment.y * gridSize + gridSize * 0.7;
                } else if (snakeSpeed.y === -1) { // Up
                    eyeX1 = segment.x * gridSize + gridSize * 0.3;
                    eyeY1 = segment.y * gridSize + gridSize * 0.3;
                    eyeX2 = segment.x * gridSize + gridSize * 0.7;
                    eyeY2 = segment.y * gridSize + gridSize * 0.3;
                } else { // Down
                    eyeX1 = segment.x * gridSize + gridSize * 0.3;
                    eyeY1 = segment.y * gridSize + gridSize * 0.7;
                    eyeX2 = segment.x * gridSize + gridSize * 0.7;
                    eyeY2 = segment.y * gridSize + gridSize * 0.7;
                }
                
                // Draw eyes
                ctx.beginPath();
                ctx.arc(eyeX1, eyeY1, gridSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(eyeX2, eyeY2, gridSize * 0.1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw game over screen
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#f5f5f5';
            ctx.font = 'bold 36px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 40);
            
            ctx.font = '24px "Segoe UI", sans-serif';
            ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
            
            ctx.font = '20px "Segoe UI", sans-serif';
            ctx.fillStyle = '#4ade80';
            ctx.fillText('Press R or Tap Restart', canvas.width / 2, canvas.height / 2 + 40);
        }
    }
    
    // Reset game state
    function resetGame() {
        snake = [{ x: 10, y: 10 }];
        snakeSpeed = { x: 1, y: 0 }; // Start moving right
        generateFood();
        score = 0;
        gameOver = false;
        gameSpeed = 100;
        scoreElement.textContent = score;
        window.requestAnimationFrame(gameLoop);
    }
    
    // Handle keyboard input
    document.addEventListener('keydown', (event) => {
        // Handle restart with 'r' key when game is over
        if (gameOver && (event.key === 'r' || event.key === 'R')) {
            resetGame();
            return;
        }
        
        // Prevent reverse direction (no 180-degree turns)
        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (snakeSpeed.y !== 1) {
                    snakeSpeed = { x: 0, y: -1 };
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (snakeSpeed.y !== -1) {
                    snakeSpeed = { x: 0, y: 1 };
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (snakeSpeed.x !== 1) {
                    snakeSpeed = { x: -1, y: 0 };
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (snakeSpeed.x !== -1) {
                    snakeSpeed = { x: 1, y: 0 };
                }
                break;
        }
    });
    
    // Touch controls
    const touchControls = document.querySelectorAll('.touch-btn');
    touchControls.forEach(btn => {
        btn.addEventListener('click', function() {
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
    
    // Restart button
    restartButton.addEventListener('click', resetGame);
    
    // Start the game
    resetGame();
});
