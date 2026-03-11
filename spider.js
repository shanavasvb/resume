/**
 * Spider Invasion System
 * Spiders crawl around the page and can be killed with the hammer
 */

let spiders = [];
let spiderModeActive = false;

const SPIDER_COUNT_PER_SPAWN = 5; // spiders spawned per button click
const SPIDER_SPEED_MIN = 0.6;
const SPIDER_SPEED_MAX = 1.4;
const SPIDER_SIZE = 48;
const SPIDER_HAMMER_HIT_RADIUS = 55;

document.addEventListener('DOMContentLoaded', () => {
    injectSpiderWeaponItem();
    setupSpiderMode();
});

/**
 * Inject the spider weapon item into the existing weapon tray
 */
function injectSpiderWeaponItem() {
    // Wait for weapon cache to be created by backpack.js
    const waitForTray = setInterval(() => {
        const tray = document.querySelector('.weapon-tray');
        if (!tray) return;
        clearInterval(waitForTray);

        const spiderItem = document.createElement('div');
        spiderItem.className = 'weapon-item';
        spiderItem.dataset.weapon = 'spider';
        spiderItem.dataset.tooltip = 'Spider Invasion';
        spiderItem.innerHTML = `
            <img src="spider.png" alt="Spider" class="spider-icon">
            <span class="spider-count-badge" style="display:none;">0</span>
        `;
        tray.appendChild(spiderItem);

        spiderItem.addEventListener('click', () => {
            spawnSpiderWave();
            // Close the tray
            const cache = document.querySelector('.weapon-cache');
            if (cache) cache.classList.remove('open');
        });
    }, 50);
}

/**
 * Spawn a wave of spiders
 */
function spawnSpiderWave() {
    for (let i = 0; i < SPIDER_COUNT_PER_SPAWN; i++) {
        setTimeout(() => spawnSingleSpider(), i * 120);
    }
    updateSpiderBadge();
}

/**
 * Spawn one spider at a random edge of the viewport
 */
function spawnSingleSpider() {
    const el = document.createElement('div');
    el.className = 'deployed-spider';
    el.innerHTML = `<img src="spider.png" alt="Spider">`;
    document.body.appendChild(el);

    // Start from a random edge
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let startX, startY;
    switch (edge) {
        case 0: startX = Math.random() * window.innerWidth; startY = -SPIDER_SIZE; break;
        case 1: startX = window.innerWidth + SPIDER_SIZE; startY = Math.random() * window.innerHeight; break;
        case 2: startX = Math.random() * window.innerWidth; startY = window.innerHeight + SPIDER_SIZE; break;
        case 3: startX = -SPIDER_SIZE; startY = Math.random() * window.innerHeight; break;
    }

    el.style.left = startX + 'px';
    el.style.top = startY + 'px';

    // Random initial velocity heading inward
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const angle = Math.atan2(centerY - startY, centerX - startX) + (Math.random() - 0.5) * 1.5;
    const speed = SPIDER_SPEED_MIN + Math.random() * (SPIDER_SPEED_MAX - SPIDER_SPEED_MIN);

    const data = {
        el,
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        animId: null,
        dead: false,
        legPhase: Math.random() * Math.PI * 2,
        wanderTimer: 0,
        id: Date.now() + Math.random()
    };

    spiders.push(data);
    requestAnimationFrame((ts) => updateSpiderPhysics(data, ts, ts));
    updateSpiderBadge();
}

/**
 * Spider physics loop
 */
function updateSpiderPhysics(data, timestamp, lastTs) {
    if (data.dead) return;

    const dt = Math.min((timestamp - lastTs) / 16.67, 3); // capped delta

    // Wander: periodically change direction slightly
    data.wanderTimer += dt;
    if (data.wanderTimer > 60 + Math.random() * 80) {
        data.wanderTimer = 0;
        const turnAngle = (Math.random() - 0.5) * 1.2;
        const cos = Math.cos(turnAngle);
        const sin = Math.sin(turnAngle);
        const newVx = data.vx * cos - data.vy * sin;
        const newVy = data.vx * sin + data.vy * cos;
        data.vx = newVx;
        data.vy = newVy;
    }

    // Maintain speed
    const spd = Math.sqrt(data.vx * data.vx + data.vy * data.vy);
    const targetSpeed = SPIDER_SPEED_MIN + Math.random() * 0.1;
    if (spd > 0.01) {
        data.vx = (data.vx / spd) * targetSpeed;
        data.vy = (data.vy / spd) * targetSpeed;
    }

    data.x += data.vx * dt;
    data.y += data.vy * dt;

    // Bounce off viewport edges
    const margin = 10;
    if (data.x < margin) { data.x = margin; data.vx = Math.abs(data.vx); }
    if (data.x > window.innerWidth - SPIDER_SIZE - margin) { data.x = window.innerWidth - SPIDER_SIZE - margin; data.vx = -Math.abs(data.vx); }
    if (data.y < margin) { data.y = margin; data.vy = Math.abs(data.vy); }
    if (data.y > window.innerHeight - SPIDER_SIZE - margin) { data.y = window.innerHeight - SPIDER_SIZE - margin; data.vy = -Math.abs(data.vy); }

    // Rotation based on velocity
    const rotation = Math.atan2(data.vy, data.vx) * (180 / Math.PI) + 90;

    // Leg wiggle via scale
    data.legPhase += 0.18 * dt;
    const wiggle = 1 + Math.sin(data.legPhase) * 0.04;

    data.el.style.left = data.x + 'px';
    data.el.style.top = data.y + 'px';
    data.el.style.transform = `rotate(${rotation}deg) scale(${wiggle})`;

    data.animId = requestAnimationFrame((ts) => updateSpiderPhysics(data, ts, timestamp));
}

/**
 * Kill a spider (called from hammer hit detection)
 */
function killSpider(data) {
    if (data.dead) return;
    data.dead = true;

    if (data.animId) cancelAnimationFrame(data.animId);

    const el = data.el;

    // Death animation: splat
    el.classList.add('spider-dead');

    // Get current rotation to keep it
    const currentTransform = el.style.transform;
    const rotMatch = currentTransform.match(/rotate\(([-\d.]+)deg\)/);
    const rot = rotMatch ? parseFloat(rotMatch[1]) : 0;

    el.animate([
        { transform: `rotate(${rot}deg) scale(1)`, filter: 'brightness(1)' },
        { transform: `rotate(${rot + 180}deg) scale(1.6)`, filter: 'brightness(0.3) sepia(1) hue-rotate(-30deg)', offset: 0.3 },
        { transform: `rotate(${rot + 200}deg) scale(0.85)`, filter: 'brightness(0.15) sepia(1)', offset: 0.7 },
        { transform: `rotate(${rot + 200}deg) scale(0.7)`, filter: 'brightness(0) opacity(0.5)', offset: 1 }
    ], {
        duration: 500,
        easing: 'ease-out',
        fill: 'forwards'
    }).onfinish = () => {
        // Fade out
        el.animate([{ opacity: 0.5 }, { opacity: 0 }], {
            duration: 800,
            delay: 400,
            fill: 'forwards'
        }).onfinish = () => {
            el.remove();
            spiders = spiders.filter(s => s !== data);
            updateSpiderBadge();
        };
    };
}

/**
 * Check if hammer hit any spiders — called from hammer mousedown
 */
function checkHammerSpiderCollision(hitClientX, hitClientY) {
    let hitAny = false;
    spiders.forEach(data => {
        if (data.dead) return;
        const rect = data.el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = hitClientX - cx;
        const dy = hitClientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SPIDER_HAMMER_HIT_RADIUS) {
            killSpider(data);
            hitAny = true;
        }
    });
    return hitAny;
}

/**
 * Update the spider count badge on the button
 */
function updateSpiderBadge() {
    const badge = document.querySelector('.weapon-item[data-weapon="spider"] .spider-count-badge');
    if (!badge) return;
    const alive = spiders.filter(s => !s.dead).length;
    if (alive > 0) {
        badge.style.display = 'flex';
        badge.textContent = alive;
    } else {
        badge.style.display = 'none';
    }
}

/**
 * Hook into the existing hammer system to detect spider hits
 */
function setupSpiderMode() {
    // Patch the existing hammer mousedown to also check spiders
    // We do this by listening on the same event and checking spider collisions
    document.addEventListener('mousedown', (e) => {
        if (!document.body.classList.contains('hammer-mode')) return;
        if (e.target.closest('.weapon-cache') ||
            e.target.closest('.weapon-esc-hint') ||
            e.target.closest('.system-status-bar')) return;

        // Hit position (same offset logic as backpack.js)
        const hitX = e.clientX - 100;
        const hitY = e.clientY - 50;

        setTimeout(() => {
            checkHammerSpiderCollision(hitX, hitY);
        }, 65); // slightly after backpack.js check (60ms) so both can run
    }, true); // capture phase to run before backpack.js if needed
}