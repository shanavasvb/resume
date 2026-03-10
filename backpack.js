/**
 * Backpack Tool System
 * A fun interactive feature with tools from the backpack
 */

// Track active weapon and deployed cars
let activeWeaponType = null;
let deployedCars = [];
let carCursorRotation = 0; // Captured rotation when car is selected

// Mouse position for car collision detection
let mouseX = 0;
let mouseY = 0;

// Collision detection constants
const MOUSE_HITBOX_RADIUS = 40; // Big cursor support
const CAR_HITBOX_RADIUS = 40;
const COLLISION_DISTANCE = MOUSE_HITBOX_RADIUS + CAR_HITBOX_RADIUS;
const PANIC_DISTANCE = 250; // Fast avoidance zone
const AWARENESS_DISTANCE = 500; // Gentle avoidance zone
const HAMMER_HIT_RADIUS = 60; // not so big and not so small hitbox

document.addEventListener('DOMContentLoaded', () => {
    // Create the weapon cache UI
    createWeaponCache();
    
    // Create crack layer in the main container (so cracks scroll with content)
    createCrackLayer();
    
    // Create custom cursor elements
    createHammerCursor();
    createCarCursor();
    
    // Setup weapon modes
    setupHammerMode();
    setupCarMode();
    
    // Global mouse tracking for car collision
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
});

/**
 * Create the weapon cache UI in bottom-left corner
 */
function createWeaponCache() {
    const cache = document.createElement('div');
    cache.className = 'weapon-cache';
    cache.innerHTML = `
        <div class="weapon-tray">
            <div class="weapon-item" data-weapon="hammer" data-tooltip="Toy Hammer">
                <img src="toy-hammer.png" alt="Hammer">
            </div>
            <div class="weapon-item" data-weapon="car" data-tooltip="Toy Car">
                <img src="car-white.svg" alt="Car" class="car-icon">
                <span class="car-recall-badge" style="display:none;">↩</span>
            </div>
        </div>
        <button class="cache-toggle" aria-label="Open weapon cache">
            <span class="cache-toggle-icon cache-toggle-backpack">🎒</span>
            <span class="cache-toggle-icon cache-toggle-close">✕</span>
        </button>
    `;
    
    document.body.appendChild(cache);
    
    // Toggle cache open/close (or deactivate weapon on mobile)
    const toggle = cache.querySelector('.cache-toggle');
    const toggleIcon = cache.querySelector('.cache-toggle-icon');
    
    toggle.addEventListener('click', () => {
        // If in any weapon mode, clicking toggle deactivates the weapon
        if (activeWeaponType) {
            deactivateWeapon();
            return;
        }
        cache.classList.toggle('open');
    });
    
    // Weapon selection
    const weapons = cache.querySelectorAll('.weapon-item');
    weapons.forEach(weapon => {
        weapon.addEventListener('click', () => {
            const weaponType = weapon.dataset.weapon;
            
            // Special case: if car is deployed and clicking car icon, recall all cars
            if (weaponType === 'car' && deployedCars.length > 0) {
                recallAllCars();
                return;
            }
            
            activateWeapon(weaponType, weapon);
            cache.classList.remove('open');
        });
    });
    
    // Create ESC hint text
    const escHint = document.createElement('div');
    escHint.className = 'weapon-esc-hint';
    escHint.textContent = 'Press ESC to cancel';
    document.body.appendChild(escHint);
}

/**
 * Create the crack layer inside the main container
 */
function createCrackLayer() {
    const container = document.querySelector('.container') || document.body;
    
    // Make container position relative for absolute crack positioning
    container.style.position = 'relative';
    
    const crackLayer = document.createElement('div');
    crackLayer.className = 'crack-layer';
    crackLayer.id = 'crack-layer';
    container.appendChild(crackLayer);
}

/**
 * Create the custom hammer cursor element
 */
function createHammerCursor() {
    const hammer = document.createElement('img');
    hammer.className = 'hammer-cursor';
    hammer.id = 'hammer-cursor';
    hammer.src = 'toy-hammer.png';
    hammer.alt = '';
    document.body.appendChild(hammer);
}



/**
 * Activate a weapon
 */
function activateWeapon(weaponType, element) {
    // Deactivate any current weapon first
    deactivateWeapon();
    
    activeWeaponType = weaponType;
    element.classList.add('active');
    document.body.style.userSelect = 'none';
    
    if (weaponType === 'hammer') {
        document.body.classList.add('hammer-mode');
    } else if (weaponType === 'car') {
        document.body.classList.add('car-mode');
        // Capture current rotation of spinning car icon
        const carIcon = document.querySelector('.weapon-item[data-weapon="car"] .car-icon');
        if (carIcon) {
            const style = getComputedStyle(carIcon);
            const matrix = new DOMMatrix(style.transform);
            carCursorRotation = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
        }
        // Apply rotation to cursor
        const carCursor = document.getElementById('car-cursor');
        if (carCursor) {
            carCursor.style.transform = `rotate(${carCursorRotation}deg)`;
        }
    }
}

/**
 * Deactivate current weapon
 */
function deactivateWeapon() {
    activeWeaponType = null;
    document.body.classList.remove('hammer-mode', 'car-mode');
    document.querySelectorAll('.weapon-item').forEach(w => w.classList.remove('active'));
    document.body.style.userSelect = '';
}

/**
 * Setup hammer mode interactions
 */
function setupHammerMode() {
    const hammerCursor = document.getElementById('hammer-cursor');
    
    // Track mouse movement for custom cursor using page coordinates
    document.addEventListener('mousemove', (e) => {
        if (!document.body.classList.contains('hammer-mode')) return;
        
        // Use pageX/pageY for document-relative positioning
        hammerCursor.style.left = (e.pageX - 64) + 'px';
        hammerCursor.style.top = (e.pageY - 64) + 'px';
    });
    
    // Handle mousedown (hammer swing) - more responsive than click
    document.addEventListener('mousedown', (e) => {
        if (!document.body.classList.contains('hammer-mode')) return;
        
        // Don't trigger on UI elements
        if (e.target.closest('.weapon-cache') || 
            e.target.closest('.weapon-esc-hint') ||
            e.target.closest('.system-status-bar')) {
            return;
        }
        
        // Update position using page coordinates (document-relative)
        const x = e.pageX - 64;
        const y = e.pageY - 64;
        hammerCursor.style.left = x + 'px';
        hammerCursor.style.top = y + 'px';
        
        // Swing animation (just rotation, position is set via left/top)
        hammerCursor.animate([
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(-40deg)', offset: 0.35 },
            { transform: 'rotate(0deg)' }
        ], {
            duration: 180,
            easing: 'ease-out'
        });
        
        // Screen shake
        document.body.classList.add('screen-shake');
        
        // Create crack at hammer HEAD position (offset from cursor toward upper-left)
        const hammerHitX = e.clientX - 100;
        const hammerHitY = e.clientY - 50;
        
        setTimeout(() => {
            // Check if hammer hit any cars first
            const hitCar = checkHammerCarCollision(hammerHitX, hammerHitY);
            
            // Only create crack if no car was hit
            if (!hitCar) {
                const crackX = e.pageX - 100;
                const crackY = e.pageY - 50;
                createCrack(crackX, crackY);
                createImpactFlash(crackX, crackY);
            }
        }, 60);
        
        // Reset shake
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
        }, 150);
    });
    
    // ESC to cancel weapon mode (shared handler)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeWeaponType) {
            deactivateWeapon();
        }
    });
}

/**
 * Create a crack at the specified position
 */
function createCrack(pageX, pageY) {
    const crackLayer = document.getElementById('crack-layer');
    if (!crackLayer) return;
    
    // Get container offset to convert page coords to relative coords
    const container = crackLayer.parentElement;
    const rect = container.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Calculate position relative to container
    const x = pageX - rect.left - scrollLeft;
    const y = pageY - rect.top - scrollTop;
    
    // Generate random crack SVG
    const crackSvg = generateCrackSVG();
    
    const crackEl = document.createElement('div');
    crackEl.className = 'crack';
    crackEl.innerHTML = crackSvg;
    
    // Random rotation for variety
    const rotation = Math.random() * 360;
    crackEl.style.left = x + 'px';
    crackEl.style.top = y + 'px';
    crackEl.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    
    crackLayer.appendChild(crackEl);
}

/**
 * Create impact flash effect
 */
function createImpactFlash(pageX, pageY) {
    const flash = document.createElement('div');
    flash.className = 'impact-flash';
    flash.style.left = pageX + 'px';
    flash.style.top = pageY + 'px';
    flash.style.position = 'absolute';
    
    const crackLayer = document.getElementById('crack-layer');
    if (!crackLayer) return;
    
    const container = crackLayer.parentElement;
    const rect = container.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    const x = pageX - rect.left - scrollLeft;
    const y = pageY - rect.top - scrollTop;
    
    flash.style.left = x + 'px';
    flash.style.top = y + 'px';
    
    crackLayer.appendChild(flash);
    
    // Remove after animation
    setTimeout(() => flash.remove(), 200);
}

/**
 * Generate a random crack SVG
 */
function generateCrackSVG() {
    const size = 80 + Math.random() * 60; // 80-140px
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Check if terminal theme is active
    const isTerminalTheme = document.body.getAttribute('data-theme') === 'terminal';
    
    // Colors based on theme
    const mainStroke = isTerminalTheme ? 'rgba(255, 50, 50, 0.9)' : 'rgba(0,0,0,0.7)';
    const subStroke = isTerminalTheme ? 'rgba(255, 80, 80, 0.7)' : 'rgba(0,0,0,0.5)';
    const fragFill = isTerminalTheme ? 'rgba(255, 50, 50, 0.5)' : 'rgba(0,0,0,0.3)';
    const glowFilter = isTerminalTheme ? `<defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` : '';
    const filterAttr = isTerminalTheme ? 'filter="url(#glow)"' : '';
    
    // Generate random crack lines from center
    const numBranches = 4 + Math.floor(Math.random() * 4); // 4-7 branches
    let paths = '';
    
    for (let i = 0; i < numBranches; i++) {
        const angle = (i / numBranches) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const length = 20 + Math.random() * (size / 2 - 10);
        
        // Main branch
        const endX = centerX + Math.cos(angle) * length;
        const endY = centerY + Math.sin(angle) * length;
        
        // Add some jaggedness
        const midX = centerX + Math.cos(angle) * (length * 0.5) + (Math.random() - 0.5) * 10;
        const midY = centerY + Math.sin(angle) * (length * 0.5) + (Math.random() - 0.5) * 10;
        
        paths += `<path d="M ${centerX} ${centerY} L ${midX} ${midY} L ${endX} ${endY}" 
                        stroke="${mainStroke}" stroke-width="${1 + Math.random() * 2}" 
                        fill="none" stroke-linecap="round" ${filterAttr}/>`;
        
        // Sub-branches
        if (Math.random() > 0.4) {
            const subAngle = angle + (Math.random() - 0.5) * 1.2;
            const subLength = length * 0.4 + Math.random() * 10;
            const subEndX = midX + Math.cos(subAngle) * subLength;
            const subEndY = midY + Math.sin(subAngle) * subLength;
            
            paths += `<path d="M ${midX} ${midY} L ${subEndX} ${subEndY}" 
                            stroke="${subStroke}" stroke-width="${0.5 + Math.random()}" 
                            fill="none" stroke-linecap="round" ${filterAttr}/>`;
        }
    }
    
    // Add some small fragments/shatter marks near center
    for (let i = 0; i < 3; i++) {
        const fragX = centerX + (Math.random() - 0.5) * 20;
        const fragY = centerY + (Math.random() - 0.5) * 20;
        const fragSize = 2 + Math.random() * 4;
        
        paths += `<polygon points="${fragX},${fragY - fragSize} ${fragX + fragSize},${fragY + fragSize} ${fragX - fragSize},${fragY + fragSize/2}" 
                          fill="${fragFill}" ${filterAttr}/>`;
    }
    
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" 
                 style="overflow:visible">${glowFilter}${paths}</svg>`;
}

/**
 * Create the custom car cursor element
 */
function createCarCursor() {
    const car = document.createElement('img');
    car.className = 'car-cursor';
    car.id = 'car-cursor';
    car.src = 'car-white.svg';
    car.alt = '';
    document.body.appendChild(car);
}

/**
 * Setup car mode interactions
 */
function setupCarMode() {
    const carCursor = document.getElementById('car-cursor');
    
    // Track mouse movement for custom cursor
    document.addEventListener('mousemove', (e) => {
        if (!document.body.classList.contains('car-mode')) return;
        
        carCursor.style.left = (e.pageX - 40) + 'px';
        carCursor.style.top = (e.pageY - 20) + 'px';
        carCursor.style.transform = `rotate(${carCursorRotation}deg)`;
    });
    
    // Handle clicks - deploy a car
    document.addEventListener('click', (e) => {
        if (!document.body.classList.contains('car-mode')) return;
        
        // Don't trigger on UI elements
        if (e.target.closest('.weapon-cache') || 
            e.target.closest('.weapon-esc-hint') ||
            e.target.closest('.system-status-bar')) {
            return;
        }
        
        // Deploy car at click position
        deployCar(e.clientX, e.clientY);
        
        // Deactivate car mode after deploying
        deactivateWeapon();
        
        // Update car icon to show recall badge
        updateCarRecallBadge();
    });
}

/**
 * Deploy a bouncing car at position
 */
function deployCar(x, y) {
    const car = document.createElement('div');
    car.className = 'deployed-car';
    car.innerHTML = '<img src="car-white.svg" alt="Car">';
    car.style.left = x + 'px';
    car.style.top = y + 'px';
    car.style.transform = `rotate(${carCursorRotation}deg)`;
    
    document.body.appendChild(car);
    
    // Use captured rotation as initial direction (convert degrees to radians)
    const speed = 3 + Math.random() * 2;
    const angle = carCursorRotation * (Math.PI / 180);
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    
    // Current position (viewport-relative for fixed positioning)
    let posX = x;
    let posY = y;
    
    // Track car data
    const carData = {
        element: car,
        animationId: null
    };
    
    deployedCars.push(carData);
    
    // Grace period - ignore mouse detection initially
    let ignoreMouseFrames = 60; // ~1 second at 60fps
    
    // Car physics loop
    function updateCarPhysics() {
        const carWidth = 80;
        const carHeight = 40;
        
        // Car center position
        const carCenterX = posX + carWidth / 2;
        const carCenterY = posY + carHeight / 2;
        
        // Distance to mouse
        const dx = mouseX - carCenterX;
        const dy = mouseY - carCenterY;
        const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
        
        // Decrement grace period
        if (ignoreMouseFrames > 0) {
            ignoreMouseFrames--;
        }
        
        // Mouse collision and avoidance (skip during grace period)
        if (ignoreMouseFrames <= 0 && distanceToMouse < COLLISION_DISTANCE) {
            // Direct collision - bounce 180 degrees back
            vx = -vx;
            vy = -vy;
            // Push car away from mouse to prevent sticking
            const pushAngle = Math.atan2(-dy, -dx);
            posX += Math.cos(pushAngle) * 10;
            posY += Math.sin(pushAngle) * 10;
            const newRotation = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'mouse', newRotation);
        } else if (ignoreMouseFrames <= 0 && distanceToMouse < PANIC_DISTANCE) {
            // Panic mode - fast avoidance
            const avoidAngle = Math.atan2(-dy, -dx);
            const avoidStrength = 0.3 * (1 - distanceToMouse / PANIC_DISTANCE);
            vx += Math.cos(avoidAngle) * avoidStrength;
            vy += Math.sin(avoidAngle) * avoidStrength;
        } else if (ignoreMouseFrames <= 0 && distanceToMouse < AWARENESS_DISTANCE) {
            // Gentle awareness - slight steering away
            const avoidAngle = Math.atan2(-dy, -dx);
            const avoidStrength = 0.08 * (1 - distanceToMouse / AWARENESS_DISTANCE);
            vx += Math.cos(avoidAngle) * avoidStrength;
            vy += Math.sin(avoidAngle) * avoidStrength;
        }
        
        // Clamp speed to prevent crazy acceleration
        const currentSpeed = Math.sqrt(vx * vx + vy * vy);
        const maxSpeed = 8;
        const minSpeed = 2;
        if (currentSpeed > maxSpeed) {
            vx = (vx / currentSpeed) * maxSpeed;
            vy = (vy / currentSpeed) * maxSpeed;
        } else if (currentSpeed < minSpeed) {
            vx = (vx / currentSpeed) * minSpeed;
            vy = (vy / currentSpeed) * minSpeed;
        }
        
        // Update position
        posX += vx;
        posY += vy;
        
        // Bounce off edges with some energy retention
        const bounceEnergy = 0.95;
        
        // Left/right bounds
        if (posX < 0) {
            posX = 0;
            vx = -vx * bounceEnergy;
            const newRotation = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'left', newRotation);
        } else if (posX > window.innerWidth - carWidth) {
            posX = window.innerWidth - carWidth;
            vx = -vx * bounceEnergy;
            const newRotation = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'right', newRotation);
        }
        
        // Top/bottom bounds
        if (posY < 0) {
            posY = 0;
            vy = -vy * bounceEnergy;
            const newRotation = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'top', newRotation);
        } else if (posY > window.innerHeight - carHeight) {
            posY = window.innerHeight - carHeight;
            vy = -vy * bounceEnergy;
            const newRotation = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'bottom', newRotation);
        }
        
        // Update car position and rotation based on velocity
        const rotation = Math.atan2(vy, vx) * (180 / Math.PI);
        car.style.left = posX + 'px';
        car.style.top = posY + 'px';
        car.style.transform = `rotate(${rotation}deg)`;
        
        carData.animationId = requestAnimationFrame(updateCarPhysics);
    }
    
    carData.animationId = requestAnimationFrame(updateCarPhysics);
}

/**
 * Trigger bounce effect on car
 * @param {HTMLElement} car - The car element
 * @param {string} direction - Bounce direction
 * @param {string} newRotation - The new rotation after velocity reversal
 */
function triggerBounceEffect(car, direction, newRotation) {
    car.classList.add('bouncing');
    
    const baseTransform = `rotate(${newRotation}deg)`;
    
    // Mouse collision gets special treatment
    if (direction === 'mouse') {
        car.classList.add('mouse-hit');
        car.style.transform = baseTransform;
        car.animate([
            { transform: baseTransform, filter: 'brightness(2)' },
            { transform: baseTransform + ' scale(1.2)', filter: 'brightness(1.5)' },
            { transform: baseTransform, filter: 'brightness(1)' }
        ], {
            duration: 200,
            easing: 'ease-out'
        });
        setTimeout(() => car.classList.remove('bouncing', 'mouse-hit'), 200);
        return;
    }
    
    // Add a little bump animation for wall bounces
    let bumpX = 0, bumpY = 0;
    if (direction === 'left') bumpX = 5;
    if (direction === 'right') bumpX = -5;
    if (direction === 'top') bumpY = 5;
    if (direction === 'bottom') bumpY = -5;
    
    car.style.transform = baseTransform;
    car.animate([
        { transform: baseTransform },
        { transform: baseTransform + ` translate(${bumpX}px, ${bumpY}px) scaleY(0.8)` },
        { transform: baseTransform }
    ], {
        duration: 150,
        easing: 'ease-out'
    });
    
    setTimeout(() => car.classList.remove('bouncing'), 150);
}

/**
 * Update car icon to show/hide recall badge
 */
function updateCarRecallBadge() {
    const carItem = document.querySelector('.weapon-item[data-weapon="car"]');
    const badge = carItem?.querySelector('.car-recall-badge');
    if (badge) {
        badge.style.display = deployedCars.length > 0 ? 'flex' : 'none';
    }
    
    // Update tooltip
    if (carItem) {
        carItem.dataset.tooltip = deployedCars.length > 0 ? 'Recall Cars' : 'Toy Car';
    }
}

/**
 * Recall all deployed cars
 */
function recallAllCars() {
    deployedCars.forEach(carData => {
        // Cancel animation
        if (carData.animationId) {
            cancelAnimationFrame(carData.animationId);
        }
        
        // Animate car flying back to backpack
        const car = carData.element;
        const backpack = document.querySelector('.cache-toggle');
        const backpackRect = backpack.getBoundingClientRect();
        
        car.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        car.style.left = backpackRect.left + 'px';
        car.style.top = backpackRect.top + 'px';
        car.style.transform = 'scale(0.3) rotate(720deg)';
        car.style.opacity = '0';
        
        setTimeout(() => car.remove(), 400);
    });
    
    deployedCars = [];
    updateCarRecallBadge();
}

/**
 * Check if hammer hit any deployed cars and trigger spin effect
 * @returns {boolean} True if a car was hit
 */
function checkHammerCarCollision(hitX, hitY) {
    let hitCar = false;
    
    deployedCars.forEach(carData => {
        if (carData.isStunned) return; // Already stunned
        
        const car = carData.element;
        const rect = car.getBoundingClientRect();
        const carCenterX = rect.left + rect.width / 2;
        const carCenterY = rect.top + rect.height / 2;
        
        const dx = hitX - carCenterX;
        const dy = hitY - carCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < HAMMER_HIT_RADIUS) {
            stunCar(carData);
            hitCar = true;
        }
    });
    
    return hitCar;
}

/**
 * Stun a car - spin it 360-720 degrees, pause 2 seconds, then resume
 */
function stunCar(carData) {
    carData.isStunned = true;
    
    // Cancel current animation
    if (carData.animationId) {
        cancelAnimationFrame(carData.animationId);
        carData.animationId = null;
    }
    
    const car = carData.element;
    
    // Get current rotation
    const currentTransform = car.style.transform;
    const rotationMatch = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
    const currentRotation = rotationMatch ? parseFloat(rotationMatch[1]) : 0;
    
    // Random spin: 360 to 720 degrees
    const spinAmount = 360 + Math.random() * 360;
    const finalRotation = currentRotation + spinAmount;
    
    // Add stunned class for visual effect
    car.classList.add('stunned');
    
    // Animate the spin using Web Animations API for reliable rotation
    const spinAnimation = car.animate([
        { transform: `rotate(${currentRotation}deg)` },
        { transform: `rotate(${finalRotation}deg)` }
    ], {
        duration: 600,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
    });
    
    // After spin completes, wait 2 seconds then resume
    spinAnimation.onfinish = () => {
        // Commit animation styles and cancel to avoid interference with physics
        spinAnimation.commitStyles();
        spinAnimation.cancel();
        car.style.transform = `rotate(${finalRotation}deg)`;
        
        // Wait 2 seconds
        setTimeout(() => {
            car.classList.remove('stunned');
            carData.isStunned = false;
            
            // Resume movement with new direction based on final rotation
            resumeCarMovement(carData, finalRotation);
        }, 2000);
    };
}

/**
 * Resume car movement after stun
 */
function resumeCarMovement(carData, rotation) {
    const car = carData.element;
    
    // Get current position
    let posX = parseFloat(car.style.left);
    let posY = parseFloat(car.style.top);
    
    // Set velocity based on rotation
    const speed = 3 + Math.random() * 2;
    const angle = rotation * (Math.PI / 180);
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    
    const carWidth = 80;
    const carHeight = 40;
    
    function updateCarPhysics() {
        if (carData.isStunned) return;
        
        const carCenterX = posX + carWidth / 2;
        const carCenterY = posY + carHeight / 2;
        
        const dx = mouseX - carCenterX;
        const dy = mouseY - carCenterY;
        const distanceToMouse = Math.sqrt(dx * dx + dy * dy);
        
        // Mouse collision and avoidance
        if (distanceToMouse < COLLISION_DISTANCE) {
            vx = -vx;
            vy = -vy;
            const pushAngle = Math.atan2(-dy, -dx);
            posX += Math.cos(pushAngle) * 10;
            posY += Math.sin(pushAngle) * 10;
            const newRot = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'mouse', newRot);
        } else if (distanceToMouse < PANIC_DISTANCE) {
            const avoidAngle = Math.atan2(-dy, -dx);
            const avoidStrength = 0.3 * (1 - distanceToMouse / PANIC_DISTANCE);
            vx += Math.cos(avoidAngle) * avoidStrength;
            vy += Math.sin(avoidAngle) * avoidStrength;
        } else if (distanceToMouse < AWARENESS_DISTANCE) {
            const avoidAngle = Math.atan2(-dy, -dx);
            const avoidStrength = 0.08 * (1 - distanceToMouse / AWARENESS_DISTANCE);
            vx += Math.cos(avoidAngle) * avoidStrength;
            vy += Math.sin(avoidAngle) * avoidStrength;
        }
        
        // Clamp speed
        const currentSpeed = Math.sqrt(vx * vx + vy * vy);
        const maxSpeed = 8;
        const minSpeed = 2;
        if (currentSpeed > maxSpeed) {
            vx = (vx / currentSpeed) * maxSpeed;
            vy = (vy / currentSpeed) * maxSpeed;
        } else if (currentSpeed < minSpeed) {
            vx = (vx / currentSpeed) * minSpeed;
            vy = (vy / currentSpeed) * minSpeed;
        }
        
        posX += vx;
        posY += vy;
        
        // Bounce off edges
        const bounceEnergy = 0.95;
        
        if (posX < 0) {
            posX = 0;
            vx = -vx * bounceEnergy;
            const newRot = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'left', newRot);
        } else if (posX > window.innerWidth - carWidth) {
            posX = window.innerWidth - carWidth;
            vx = -vx * bounceEnergy;
            const newRot = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'right', newRot);
        }
        
        if (posY < 0) {
            posY = 0;
            vy = -vy * bounceEnergy;
            const newRot = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'top', newRot);
        } else if (posY > window.innerHeight - carHeight) {
            posY = window.innerHeight - carHeight;
            vy = -vy * bounceEnergy;
            const newRot = Math.atan2(vy, vx) * (180 / Math.PI);
            triggerBounceEffect(car, 'bottom', newRot);
        }
        
        const newRotation = Math.atan2(vy, vx) * (180 / Math.PI);
        car.style.left = posX + 'px';
        car.style.top = posY + 'px';
        car.style.transform = `rotate(${newRotation}deg)`;
        
        carData.animationId = requestAnimationFrame(updateCarPhysics);
    }
    
    carData.animationId = requestAnimationFrame(updateCarPhysics);
}
