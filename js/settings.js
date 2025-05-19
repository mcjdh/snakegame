// Settings manager for the Snake game

const Settings = (() => {
    // Default settings
    const DEFAULT_SETTINGS = {
        gameSpeed: 'normal',       // slow, normal, fast
        gridSize: 'medium',        // small, medium, large
        soundEnabled: true,        // true/false
        gameMode: 'standard',      // standard, other modes if added
        highScores: []
    };
    
    // Speed values for each game speed setting
    const SPEED_VALUES = {
        slow: 200,     // Slower
        normal: 150,   // Default
        fast: 100      // Faster
    };
    
    // Grid size values for different grid settings
    const GRID_SIZES = {
        small: 25,     // 16x16 grid (400/25)
        medium: 20,    // 20x20 grid (400/20) - default
        large: 16      // 25x25 grid (400/16)
    };
    
    // Current settings
    let settings = { ...DEFAULT_SETTINGS };
    
    // Initialize settings
    function init() {
        loadSettings();
        return settings;
    }
    
    // Load settings from localStorage
    function loadSettings() {
        try {
            const savedSettings = localStorage.getItem('snakeGameSettings');
            if (savedSettings) {
                settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
            }
        } catch (e) {
            console.error('Error loading settings:', e);
            // Use defaults if there was an error
            settings = { ...DEFAULT_SETTINGS };
        }
    }
    
    // Save settings to localStorage
    function saveSettings() {
        try {
            localStorage.setItem('snakeGameSettings', JSON.stringify(settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }
    
    // Get current settings
    function getSettings() {
        return { ...settings };
    }
    
    // Update settings
    function updateSettings(newSettings) {
        settings = { ...settings, ...newSettings };
        saveSettings();
        return settings;
    }
    
    // Reset high scores
    function resetHighScores() {
        settings.highScores = [];
        saveSettings();
    }
    
    // Add a high score
    function addHighScore(score) {
        if (!settings.highScores) {
            settings.highScores = [];
        }
        
        settings.highScores.push(score);
        settings.highScores.sort((a, b) => b - a); // Sort descending
        
        // Keep only top 5 scores
        if (settings.highScores.length > 5) {
            settings.highScores = settings.highScores.slice(0, 5);
        }
        
        saveSettings();
    }
    
    // Get numerical values for current settings
    function getNumericValues() {
        return {
            gameSpeed: SPEED_VALUES[settings.gameSpeed] || SPEED_VALUES.normal,
            gridSize: GRID_SIZES[settings.gridSize] || GRID_SIZES.medium
        };
    }
    
    // Public API
    return {
        init,
        getSettings,
        updateSettings,
        resetHighScores,
        addHighScore,
        getNumericValues,
        DEFAULT_SETTINGS,
        SPEED_VALUES,
        GRID_SIZES
    };
})();