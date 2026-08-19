class ColorPicker {
    constructor() {
        this.preview = document.getElementById('preview');
        this.codeInput = document.getElementById('code-input');
        this.randomBtn = document.getElementById('random-btn');
        this.lockBtn = document.getElementById('lock-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.pasteBtn = document.getElementById('paste-btn');
        this.historyContainer = document.getElementById('history');
        
        this.currentColor = '#6366f1';
        this.isLocked = false;
        this.history = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.setColor(this.currentColor);
    }

    setupEventListeners() {
        this.randomBtn.addEventListener('click', () => this.generateRandom());
        this.lockBtn.addEventListener('click', () => this.toggleLock());
        this.clearBtn.addEventListener('click', () => this.clear());
        this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
        this.preview.addEventListener('click', () => this.copyToClipboard(this.currentColor));
        this.codeInput.addEventListener('input', (e) => this.handleColorInput(e.target.value));
        
        // Color value copy handlers
        document.querySelectorAll('.color-value').forEach(el => {
            el.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                const colorValue = document.getElementById(format).textContent;
                this.copyToClipboard(colorValue);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.generateRandom();
            }
            if (e.key.toLowerCase() === 'c') {
                this.copyToClipboard(this.currentColor);
            }
            if (e.key.toLowerCase() === 'l') {
                this.toggleLock();
            }
        });
    }

    /**
     * Generate a random color
     */
    generateRandom() {
        if (this.isLocked) return;
        
        const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        this.setColor(hex);
        this.addToHistory(hex);
    }

    /**
     * Set the color and update all displays
     */
    setColor(color) {
        try {
            const hex = this.normalizeToHex(color);
            if (!hex) {
                this.showError('Invalid color');
                return;
            }
            
            this.currentColor = hex;
            this.preview.style.backgroundColor = hex;
            this.updateColorDisplay(hex);
            this.saveToLocalStorage();
        } catch (error) {
            this.showError('Invalid color format');
        }
    }

    /**
     * Normalize any color format to HEX
     */
    normalizeToHex(color) {
        color = color.trim();
        
        // Already hex
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            return color.toUpperCase();
        }
        
        // RGB format: rgb(99, 102, 241)
        const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
            return '#' + (r + g + b).toUpperCase();
        }
        
        // Named colors
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        if (ctx.fillStyle !== color && !color.startsWith('#')) {
            return null;
        }
        
        return null;
    }

    /**
     * Convert HEX to RGB object
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Convert HEX to HSL object
     */
    hexToHsl(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return null;
        
        let r = rgb.r / 255;
        let g = rgb.g / 255;
        let b = rgb.b / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    /**
     * Update all color format displays (HEX, RGB, RGBA, HSL)
     */
    updateColorDisplay(hex) {
        const rgb = this.hexToRgb(hex);
        const hsl = this.hexToHsl(hex);
        
        document.getElementById('hex').textContent = hex;
        document.getElementById('rgb').textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        document.getElementById('rgba').textContent = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        document.getElementById('hsl').textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        
        this.codeInput.value = hex;
    }

    /**
     * Handle input field changes
     */
    handleColorInput(value) {
        if (value.trim()) {
            this.setColor(value);
        }
    }

    /**
     * Toggle lock state to prevent random generation
     */
    toggleLock() {
        this.isLocked = !this.isLocked;
        this.lockBtn.classList.toggle('active');
        this.lockBtn.innerHTML = this.isLocked 
            ? '<i class="fas fa-lock"></i> Locked'
            : '<i class="fas fa-lock-open"></i> Lock';
    }

    /**
     * Clear everything and reset to default
     */
    clear() {
        this.setColor('#6366f1');
        this.history = [];
        this.renderHistory();
        this.saveToLocalStorage();
    }

    /**
     * Add a color to history (prevent duplicates, limit to 8)
     */
    addToHistory(color) {
        this.history = [color, ...this.history.filter(c => c !== color)].slice(0, 8);
        this.renderHistory();
        this.saveToLocalStorage();
    }

    /**
     * Render color swatches from history
     */
    renderHistory() {
        this.historyContainer.innerHTML = '';
        this.history.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'history-swatch';
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => this.setColor(color));
            this.historyContainer.appendChild(swatch);
        });
    }

    /**
     * Copy text to clipboard
     */
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast(`Copied: ${text}`);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    /**
     * Paste from clipboard
     */
    async pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            this.codeInput.value = text;
            this.handleColorInput(text);
        } catch (err) {
            this.showError('Failed to paste from clipboard');
        }
    }

    /**
     * Show success toast notification
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    /**
     * Show error notification
     */
    showError(message) {
        this.showToast(`⚠ ${message}`);
    }

    /**
     * Save state to localStorage
     */
    saveToLocalStorage() {
        localStorage.setItem('colorPickerState', JSON.stringify({
            color: this.currentColor,
            history: this.history,
            locked: this.isLocked
        }));
    }

    /**
     * Load state from localStorage
     */
    loadFromLocalStorage() {
        const saved = localStorage.getItem('colorPickerState');
        if (saved) {
            const state = JSON.parse(saved);
            this.currentColor = state.color;
            this.history = state.history;
            this.isLocked = state.locked;
            this.renderHistory();
            if (this.isLocked) this.toggleLock();
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ColorPicker();
});
