// js/particleSystem.js
const ParticleSystem = (() => {
    let particles = [];
    let gridSize;
    let halfGridSize;

    function init(gSize, hfGridSize) {
        gridSize = gSize;
        halfGridSize = hfGridSize;
        particles = []; // Ensure particles are reset on init
    }

    function createFoodSpawnParticles(x, y, color) {
        const particleCount = 10;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            particles.push({
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

    function createFoodCollectionParticles(x, y, color) {
        const particleCount = 25; // Increased from 15
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 2.5; // Slightly increased speed
            const hue = Math.floor(Math.random() * 60); // Add randomness to color
            
            // Determine particle color based on food color with some variations
            let particleColor = color;
            if (i % 4 === 0) {
                // Every 4th particle is white for a sparkling effect
                particleColor = '#ffffff';
            } else if (i % 5 === 0 && color.startsWith('#')) {
                // Create some color variations for 1/5 of particles
                try {
                    const r = parseInt(color.slice(1, 3), 16);
                    const g = parseInt(color.slice(3, 5), 16);
                    const b = parseInt(color.slice(5, 7), 16);
                    particleColor = `rgb(${Math.min(255, r + hue)}, ${Math.min(255, g + hue)}, ${Math.min(255, b + hue)})`;
                } catch (e) {
                    // Fall back to original color if there's an issue
                    particleColor = color;
                }
            }
            
            particles.push({
                x: x * gridSize + halfGridSize,
                y: y * gridSize + halfGridSize,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1.5 + Math.random() * 3.5, // Slightly larger particles
                color: particleColor,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.05 // Slower decay
            });
        }
    }

    function createDeathParticles(headX, headY) {
        const particleCount = 40; // Increased from 25
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 4; // Increased max speed
            
            // Different types of particles for more dramatic effect
            let particleColor;
            let radius;
            let decay;
            
            if (i % 4 === 0) {
                // Large, slow-decaying red particles
                particleColor = '#ef4444';
                radius = 3 + Math.random() * 5;
                decay = 0.005 + Math.random() * 0.015;
            } else if (i % 4 === 1) {
                // Medium white particles for flash effect
                particleColor = '#ffffff';
                radius = 2 + Math.random() * 3;
                decay = 0.02 + Math.random() * 0.03;
            } else if (i % 4 === 2) {
                // Small, fast-decaying green particles (snake color)
                particleColor = '#4ade80';
                radius = 1 + Math.random() * 3;
                decay = 0.015 + Math.random() * 0.025;
            } else {
                // Yellow/orange particles for explosion feel
                particleColor = '#fbbf24';
                radius = 2 + Math.random() * 4;
                decay = 0.01 + Math.random() * 0.02;
            }
            
            particles.push({
                x: headX * gridSize + halfGridSize,
                y: headY * gridSize + halfGridSize,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: radius,
                color: particleColor,
                alpha: 1,
                decay: decay
            });
        }
        
        // Add a few larger explosion particles that expand
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push({
                x: headX * gridSize + halfGridSize,
                y: headY * gridSize + halfGridSize,
                vx: Math.cos(angle) * 0.2,
                vy: Math.sin(angle) * 0.2,
                radius: 5,
                growRate: 1.5, // New property for particle growth
                color: 'rgba(239, 68, 68, 0.6)', // Semi-transparent red
                alpha: 0.8,
                decay: 0.03
            });
        }
    }

    function createLevelUpParticles() {
        const particleCount = 30;
        const centerX = (tileCount * gridSize) / 2; // Assuming tileCount is available or passed
        const centerY = (tileCount * gridSize) / 2; // Or use canvas width/height if known

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const hue = Math.floor(Math.random() * 360);
            particles.push({
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

    function createMagnetParticles(foodX, foodY, headX, headY) {
        const particleCount = 3;
        for (let i = 0; i < particleCount; i++) {
            const randOffset = (Math.random() - 0.5) * 0.5;
            particles.push({
                x: foodX * gridSize + halfGridSize + randOffset,
                y: foodY * gridSize + halfGridSize + randOffset,
                vx: (headX - foodX) * 0.1, // Attract towards snake head
                vy: (headY - foodY) * 0.1, // Attract towards snake head
                radius: 1 + Math.random() * 2,
                color: '#e63946',
                alpha: 0.7,
                decay: 0.05 + Math.random() * 0.05
            });
        }
    }

    function update() {
        if (particles.length === 0) return;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            
            // Handle growing particles if they have a growRate property
            if (p.growRate) {
                p.radius += p.growRate;
                // Decrease growth rate over time for a natural slowdown
                p.growRate *= 0.9;
            }
            
            if (p.alpha <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function getParticles() {
        return particles;
    }

    function clear() {
        particles = [];
    }

    // Need tileCount for createLevelUpParticles, if it's not globally available
    // For now, assuming it might be implicitly available or needs to be passed to init/createLevelUpParticles
    // A simple fix is to calculate centerX/Y based on a known canvas dimension if tileCount isn't passed.
    // Let's assume canvas is 400x400 for now for createLevelUpParticles.
    const canvasWidth = 400; 
    const canvasHeight = 400;

    function createLevelUpParticles_revised() {
        const particleCount = 30;
        const centerX = canvasWidth / 2; 
        const centerY = canvasHeight / 2;

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            const hue = Math.floor(Math.random() * 360);
            particles.push({
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


    return {
        init,
        createFoodSpawnParticles,
        createFoodCollectionParticles,
        createDeathParticles,
        createLevelUpParticles: createLevelUpParticles_revised, // Using revised one
        createMagnetParticles,
        update,
        getParticles,
        clear
    };
})();
