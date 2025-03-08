// Zone management for the Snake game

const ZoneManager = (() => {
    // Create a forbidden zone at the specified coordinates with pattern logic
    function createZone(x, y, currentTime, moveCount, pattern, difficultyLevel, forbiddenZones, duration) {
        // Different zone generation patterns
        let shouldCreateZone = false;
        let dangerLevel = 'normal';
        
        switch(pattern) {
            case 'alternate':
                // Create zones in alternating fashion (more forgiving)
                shouldCreateZone = (moveCount % 4 === 0);
                break;
                
            case 'continuous':
                // Create more connected zones (intermediate)
                shouldCreateZone = (moveCount % 3 === 0);
                // Add occasional high danger zones
                if (moveCount % 15 === 0) dangerLevel = 'high';
                break;
                
            case 'random':
                // Create zones randomly but with higher chance (challenging)
                shouldCreateZone = (Math.random() < 0.3 * difficultyLevel);
                // More frequent high danger zones
                if (Math.random() < 0.2) dangerLevel = 'high';
                break;
        }
        
        if (shouldCreateZone) {
            // Check if we already have a zone at this position
            const existingZone = forbiddenZones.find(zone => zone.x === x && zone.y === y);
            if (!existingZone) {
                forbiddenZones.push({
                    x: x,
                    y: y,
                    createdAt: currentTime,
                    opacity: 0.6,
                    isNew: true,
                    duration: duration,
                    dangerLevel: dangerLevel
                });
            }
        }
    }
    
    // Update and clean up forbidden zones
    function updateZones(forbiddenZones, currentTime) {
        // Update in-place to avoid creating new arrays
        let i = 0;
        while (i < forbiddenZones.length) {
            const zone = forbiddenZones[i];
            const age = currentTime - zone.createdAt;
            
            // Mark new zones as old after a short time
            if (zone.isNew && age > 200) {
                zone.isNew = false;
            }
            
            // Calculate base duration based on danger level
            const baseDuration = zone.dangerLevel === 'high' ? zone.duration * 1.5 : zone.duration;
            
            // Update opacity as zones age
            zone.opacity = 0.6 * (1 - (age / baseDuration));
            
            // Add visual pulsing effect to warn when zones are about to disappear
            if (age > baseDuration * 0.7) {
                const pulsePhase = (age % 500) / 500; // Creates a 0-1 cycle every 500ms
                zone.opacity *= 0.7 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);
            }
            
            // Keep only zones that haven't expired yet
            if (age < baseDuration) {
                i++;
            } else {
                // Remove expired zone
                forbiddenZones.splice(i, 1);
            }
        }
    }
    
    // Clear zones in a specific area
    function clearZonesInArea(forbiddenZones, centerX, centerY, radius) {
        return forbiddenZones.filter(zone => {
            const distance = Math.abs(zone.x - centerX) + Math.abs(zone.y - centerY);
            return distance > radius;
        });
    }
    
    // Accelerate zone decay
    function accelerateZoneDecay(forbiddenZones, factor) {
        forbiddenZones.forEach(zone => {
            zone.duration *= factor;
        });
    }
    
    return {
        createZone,
        updateZones,
        clearZonesInArea,
        accelerateZoneDecay
    };
})();
