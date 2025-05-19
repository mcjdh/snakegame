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
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 2;
            particles.push({
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

    function createDeathParticles(headX, headY) {
        const particleCount = 25;
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 3;
            particles.push({
                x: headX * gridSize + halfGridSize,
                y: headY * gridSize + halfGridSize,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 4,
                color: i % 2 === 0 ? '#4ade80' : '#ef4444',
                alpha: 1,
                decay: 0.01 + Math.random() * 0.03
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
