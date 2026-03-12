/**
 * Spider Invasion System — Game Mode
 *
 * Rules:
 *  • Game starts with 11 spiders
 *  • Every 3 seconds a NEW spider spawns automatically (pressure builds)
 *  • Kill spiders with the hammer to keep count down
 *  • If live count reaches 15 → GAME OVER
 *  • Score +10 per kill, with combo multiplier for quick successive kills
 */

// ─── State ────────────────────────────────────────────────────────────────────
let spiders           = [];
let spiderScore       = 0;
let spiderGameOver    = false;
let spiderActive      = false;
let spiderSpawnInterval = null;   // the ticking spawn timer

let comboCount = 0;
let comboTimer = null;
const COMBO_WINDOW = 1800; // ms

const INITIAL_SPIDERS  = 11;
const LOSE_THRESHOLD   = 15;
const SPAWN_INTERVAL_MS = 3000; // new spider every 3s

// ─── Physics constants ────────────────────────────────────────────────────────
const SPIDER_SPEED_MIN = 0.7;
const SPIDER_SPEED_MAX = 1.6;
const SPIDER_SIZE      = 48;
const SPIDER_HAMMER_HIT_RADIUS = 55;

const SPIDER_MOUSE_COLLISION_DIST = 60;
const SPIDER_MOUSE_PANIC_DIST     = 180;
const SPIDER_MOUSE_AWARENESS_DIST = 320;

const SPIDER_SEPARATION_DIST  = 68;
const SPIDER_SEPARATION_FORCE = 0.14;

let spiderMouseX = window.innerWidth  / 2;
let spiderMouseY = window.innerHeight / 2;

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    injectSpiderWeaponItem();
    createSpiderHUD();
    setupSpiderMode();

    document.addEventListener('mousemove', (e) => {
        spiderMouseX = e.clientX;
        spiderMouseY = e.clientY;
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  HUD + Styles
// ═══════════════════════════════════════════════════════════════════════════════
function createSpiderHUD() {
    const style = document.createElement('style');
    style.textContent = `
        #spider-hud {
            position: fixed;
            top: 70px;
            right: 18px;
            z-index: 100000;
            pointer-events: none;
            opacity: 0;
            transform: translateY(-8px);
            transition: opacity .35s ease, transform .35s ease;
        }
        #spider-hud.visible { opacity: 1; transform: translateY(0); }
        .spider-hud-inner {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(10,10,10,.86);
            border: 1px solid rgba(255,255,255,.13);
            border-radius: 12px;
            padding: 7px 16px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: #fff;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 24px rgba(0,0,0,.5);
        }
        .spider-hud-icon  { font-size: 16px; }
        .spider-hud-label { color: rgba(255,255,255,.4); font-size: 10px; letter-spacing: .08em; }
        .spider-hud-score { color: #ffd700; font-weight: 700; font-size: 15px; min-width: 44px; text-align: right; }
        .spider-hud-count { color: #4fc3f7; font-weight: 700; font-size: 15px; min-width: 28px; text-align: right; }
        .spider-hud-sep   { color: rgba(255,255,255,.18); }
        .spider-hud-warn  {
            color: #ff1744; font-size: 11px; font-weight: 700; letter-spacing: .05em;
            min-width: 64px; animation: hud-warn-blink .55s ease-in-out infinite;
        }
        @keyframes hud-warn-blink { 0%,100%{opacity:1} 50%{opacity:.25} }

        /* Spawn warning flash — red border pulse on HUD */
        #spider-hud.spawn-flash .spider-hud-inner {
            border-color: rgba(255,23,68,.7);
            box-shadow: 0 0 18px rgba(255,23,68,.4);
            animation: spawn-flash-anim .4s ease-out forwards;
        }
        @keyframes spawn-flash-anim {
            0%   { box-shadow: 0 0 0 rgba(255,23,68,.7); }
            40%  { box-shadow: 0 0 22px rgba(255,23,68,.6); }
            100% { box-shadow: 0 4px 24px rgba(0,0,0,.5); border-color: rgba(255,255,255,.13); }
        }

        /* Floating score pop */
        .score-pop {
            position: fixed;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 800;
            font-size: 20px;
            color: #ffd700;
            text-shadow: 0 0 12px rgba(255,215,0,.7), 0 2px 4px rgba(0,0,0,.8);
            pointer-events: none;
            z-index: 999999;
            white-space: nowrap;
        }
        .score-pop.combo {
            color: #ff9800;
            font-size: 26px;
            text-shadow: 0 0 18px rgba(255,152,0,.9), 0 2px 4px rgba(0,0,0,.8);
        }

        /* Game Over overlay */
        #spider-game-over {
            position: fixed;
            inset: 0;
            z-index: 200000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,.78);
            backdrop-filter: blur(6px);
            opacity: 0;
            pointer-events: none;
            transition: opacity .5s ease;
        }
        #spider-game-over.visible { opacity: 1; pointer-events: all; }
        .sgo-box {
            background: #0d0d0d;
            border: 1px solid rgba(255,23,68,.45);
            border-radius: 20px;
            padding: 3rem 4.5rem;
            text-align: center;
            box-shadow: 0 0 80px rgba(255,23,68,.22), 0 24px 60px rgba(0,0,0,.7);
            animation: sgo-pop .5s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes sgo-pop { from{transform:scale(.65);opacity:0} to{transform:scale(1);opacity:1} }
        .sgo-emoji       { font-size: 4rem; display: block; margin-bottom: .5rem; }
        .sgo-title       { font-family: 'JetBrains Mono',monospace; font-size: 2.4rem; font-weight: 900;
                           color: #ff1744; letter-spacing: -.02em; margin-bottom: .35rem;
                           text-shadow: 0 0 30px rgba(255,23,68,.55); }
        .sgo-sub         { font-family: 'JetBrains Mono',monospace; color: rgba(255,255,255,.5);
                           font-size: .9rem; margin-bottom: .65rem; }
        .sgo-final-score { font-family: 'JetBrains Mono',monospace; font-size: 3.2rem; font-weight: 800;
                           color: #ffd700; text-shadow: 0 0 24px rgba(255,215,0,.5);
                           margin-bottom: 2rem; letter-spacing: -.03em; }
        .sgo-btn {
            background: #ff1744; color: #fff; border: none; border-radius: 10px;
            padding: 14px 38px; font-family: 'JetBrains Mono',monospace; font-size: 1rem;
            font-weight: 700; letter-spacing: .06em; cursor: pointer;
            transition: transform .15s ease, box-shadow .15s ease;
            box-shadow: 0 8px 24px rgba(255,23,68,.45);
        }
        .sgo-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(255,23,68,.6); }
    `;
    document.head.appendChild(style);

    // HUD element
    const hud = document.createElement('div');
    hud.id = 'spider-hud';
    hud.innerHTML = `
        <div class="spider-hud-inner">
            <span class="spider-hud-icon">🕷️</span>
            <span class="spider-hud-label">SCORE</span>
            <span class="spider-hud-score" id="spider-score-val">0</span>
            <span class="spider-hud-sep">│</span>
            <span class="spider-hud-label">ALIVE</span>
            <span class="spider-hud-count" id="spider-count-val">0</span>
            <span class="spider-hud-warn"  id="spider-warn"></span>
        </div>
    `;
    document.body.appendChild(hud);

    // Game Over overlay
    const go = document.createElement('div');
    go.id = 'spider-game-over';
    go.innerHTML = `
        <div class="sgo-box">
            <span class="sgo-emoji">🕷️</span>
            <div class="sgo-title">OVERRUN!</div>
            <div class="sgo-sub">The spiders took over the page.</div>
            <div class="sgo-final-score" id="sgo-score">0</div>
            <button class="sgo-btn" id="sgo-restart">Try Again</button>
        </div>
    `;
    document.body.appendChild(go);
    document.getElementById('sgo-restart').addEventListener('click', restartSpiderGame);
}

function refreshHUD() {
    const alive   = liveCount();
    const scoreEl = document.getElementById('spider-score-val');
    const countEl = document.getElementById('spider-count-val');
    const warnEl  = document.getElementById('spider-warn');
    if (scoreEl) scoreEl.textContent = spiderScore;
    if (countEl) {
        countEl.textContent = alive;
        countEl.style.color = alive >= 13 ? '#ff1744' : alive >= 11 ? '#ff7043' : '#4fc3f7';
    }
    if (warnEl) warnEl.textContent = alive >= 13 ? '⚠ DANGER' : '';

    // weapon-tray badge
    const badge = document.querySelector('.weapon-item[data-weapon="spider"] .spider-count-badge');
    if (badge) {
        if (alive > 0) { badge.style.display = 'flex'; badge.textContent = alive; }
        else           { badge.style.display = 'none'; }
    }
}

// Flash HUD border when a new spider spawns (pressure signal)
function flashHUDSpawn() {
    const hud = document.getElementById('spider-hud');
    if (!hud) return;
    hud.classList.remove('spawn-flash');
    // Force reflow to restart animation
    void hud.offsetWidth;
    hud.classList.add('spawn-flash');
    setTimeout(() => hud.classList.remove('spawn-flash'), 450);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Score & Combo
// ═══════════════════════════════════════════════════════════════════════════════
function addScore(clientX, clientY) {
    comboCount++;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { comboCount = 0; }, COMBO_WINDOW);

    const multiplier = comboCount;
    const points     = 10 * multiplier;
    spiderScore     += points;

    const pop = document.createElement('div');
    pop.className   = 'score-pop' + (multiplier > 1 ? ' combo' : '');
    pop.textContent = multiplier > 1 ? `+${points}  ×${multiplier} COMBO!` : `+${points}`;
    pop.style.left  = (clientX + 12) + 'px';
    pop.style.top   = (clientY - 18) + 'px';
    document.body.appendChild(pop);

    pop.animate([
        { transform: 'translateY(0)    scale(1)',    opacity: '1' },
        { transform: 'translateY(-60px) scale(1.1)', opacity: '0' }
    ], { duration: 900, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' })
       .onfinish = () => pop.remove();

    refreshHUD();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Game flow
// ═══════════════════════════════════════════════════════════════════════════════
function liveCount() {
    return spiders.filter(s => !s.dead).length;
}

function startSpiderGame() {
    if (spiderActive) return;
    spiderGameOver = false;
    spiderActive   = true;
    spiderScore    = 0;
    comboCount     = 0;
    document.getElementById('spider-hud')?.classList.add('visible');
    refreshHUD();

    // Spawn initial 11 spiders staggered
    for (let i = 0; i < INITIAL_SPIDERS; i++) {
        setTimeout(() => { if (!spiderGameOver) spawnSingleSpider(); }, i * 160);
    }

    // Every SPAWN_INTERVAL_MS, one more spider crawls in — this is what
    // drives the pressure and can push count above 11 toward 15
    spiderSpawnInterval = setInterval(() => {
        if (spiderGameOver) return;
        spawnSingleSpider();
        flashHUDSpawn();

        // Check lose condition right after spawning
        if (liveCount() >= LOSE_THRESHOLD) {
            triggerGameOver();
        }
    }, SPAWN_INTERVAL_MS);
}

function triggerGameOver() {
    if (spiderGameOver) return; // guard double-call
    spiderGameOver = true;
    spiderActive   = false;

    clearInterval(spiderSpawnInterval);
    spiderSpawnInterval = null;

    // Freeze all spiders
    spiders.forEach(s => {
        s.dead = true;
        if (s.animId) cancelAnimationFrame(s.animId);
    });

    // Victory dance on surviving spiders
    document.querySelectorAll('.deployed-spider').forEach((el, i) => {
        setTimeout(() => {
            el.animate([
                { transform: 'scale(1)' },
                { transform: 'scale(1.6) rotate(25deg)' },
                { transform: 'scale(1)  rotate(-25deg)' },
                { transform: 'scale(1)' }
            ], { duration: 600, iterations: 3, easing: 'ease-in-out' });
        }, i * 55);
    });

    setTimeout(() => {
        const go = document.getElementById('spider-game-over');
        const sc = document.getElementById('sgo-score');
        if (sc) sc.textContent = spiderScore;
        if (go) go.classList.add('visible');
    }, 900);
}

function restartSpiderGame() {
    document.getElementById('spider-game-over')?.classList.remove('visible');

    clearInterval(spiderSpawnInterval);
    spiderSpawnInterval = null;

    spiders.forEach(s => {
        s.dead = true;
        if (s.animId) cancelAnimationFrame(s.animId);
        s.el.remove();
    });
    spiders        = [];
    spiderScore    = 0;
    comboCount     = 0;
    spiderGameOver = false;
    spiderActive   = false;
    refreshHUD();

    setTimeout(() => startSpiderGame(), 350);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Weapon Tray Injection
// ═══════════════════════════════════════════════════════════════════════════════
function injectSpiderWeaponItem() {
    const waitForTray = setInterval(() => {
        const tray = document.querySelector('.weapon-tray');
        if (!tray) return;
        clearInterval(waitForTray);

        const spiderItem = document.createElement('div');
        spiderItem.className = 'weapon-item';
        spiderItem.dataset.weapon  = 'spider';
        spiderItem.dataset.tooltip = 'Spider Invasion';
        spiderItem.innerHTML = `
            <img src="spider.png" alt="Spider" class="spider-icon">
            <span class="spider-count-badge" style="display:none;">0</span>
        `;
        tray.appendChild(spiderItem);

        spiderItem.addEventListener('click', () => {
            const cache = document.querySelector('.weapon-cache');
            if (cache) cache.classList.remove('open');
            if (!spiderActive) startSpiderGame();
        });
    }, 50);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Spawning
// ═══════════════════════════════════════════════════════════════════════════════
function spawnSingleSpider() {
    if (spiderGameOver) return;

    const el = document.createElement('div');
    el.className = 'deployed-spider';
    el.innerHTML = `<img src="spider.png" alt="Spider">`;
    document.body.appendChild(el);

    const edge = Math.floor(Math.random() * 4);
    let startX, startY;
    switch (edge) {
        case 0: startX = Math.random() * window.innerWidth;  startY = -SPIDER_SIZE;                       break;
        case 1: startX = window.innerWidth  + SPIDER_SIZE;   startY = Math.random() * window.innerHeight; break;
        case 2: startX = Math.random() * window.innerWidth;  startY = window.innerHeight + SPIDER_SIZE;   break;
        case 3: startX = -SPIDER_SIZE;                        startY = Math.random() * window.innerHeight; break;
    }

    el.style.left = startX + 'px';
    el.style.top  = startY + 'px';

    const cx    = window.innerWidth  / 2;
    const cy    = window.innerHeight / 2;
    const angle = Math.atan2(cy - startY, cx - startX) + (Math.random() - 0.5) * 1.5;
    const speed = SPIDER_SPEED_MIN + Math.random() * (SPIDER_SPEED_MAX - SPIDER_SPEED_MIN);

    const data = {
        el,
        x: startX, y: startY,
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
    refreshHUD();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Physics
// ═══════════════════════════════════════════════════════════════════════════════
function updateSpiderPhysics(data, timestamp, lastTs) {
    if (data.dead) return;

    const dt = Math.min((timestamp - lastTs) / 16.67, 3);

    // Wander
    data.wanderTimer += dt;
    if (data.wanderTimer > 60 + Math.random() * 80) {
        data.wanderTimer = 0;
        const turn = (Math.random() - 0.5) * 1.2;
        const c = Math.cos(turn), s = Math.sin(turn);
        const nvx = data.vx * c - data.vy * s;
        const nvy = data.vx * s + data.vy * c;
        data.vx = nvx; data.vy = nvy;
    }

    // Mouse avoidance
    const mxD = data.x + SPIDER_SIZE / 2 - spiderMouseX;
    const myD = data.y + SPIDER_SIZE / 2 - spiderMouseY;
    const dm  = Math.sqrt(mxD * mxD + myD * myD);
    if (dm < SPIDER_MOUSE_COLLISION_DIST) {
        const pa = Math.atan2(myD, mxD);
        data.vx = Math.cos(pa) * SPIDER_SPEED_MAX * 1.9;
        data.vy = Math.sin(pa) * SPIDER_SPEED_MAX * 1.9;
    } else if (dm < SPIDER_MOUSE_PANIC_DIST) {
        const pa = Math.atan2(myD, mxD);
        const f  = 0.28 * (1 - dm / SPIDER_MOUSE_PANIC_DIST);
        data.vx += Math.cos(pa) * f * dt;
        data.vy += Math.sin(pa) * f * dt;
    } else if (dm < SPIDER_MOUSE_AWARENESS_DIST) {
        const pa = Math.atan2(myD, mxD);
        const f  = 0.06 * (1 - dm / SPIDER_MOUSE_AWARENESS_DIST);
        data.vx += Math.cos(pa) * f * dt;
        data.vy += Math.sin(pa) * f * dt;
    }

    // Spider–spider separation
    for (const other of spiders) {
        if (other === data || other.dead) continue;
        const sxD = (data.x + SPIDER_SIZE / 2) - (other.x + SPIDER_SIZE / 2);
        const syD = (data.y + SPIDER_SIZE / 2) - (other.y + SPIDER_SIZE / 2);
        const ds  = Math.sqrt(sxD * sxD + syD * syD);
        if (ds > 0 && ds < SPIDER_SEPARATION_DIST) {
            const f = SPIDER_SEPARATION_FORCE * (1 - ds / SPIDER_SEPARATION_DIST) * dt;
            data.vx += (sxD / ds) * f;
            data.vy += (syD / ds) * f;
        }
    }

    // Speed clamp
    const spd = Math.sqrt(data.vx * data.vx + data.vy * data.vy);
    if (spd > 0.01) {
        const target = Math.min(Math.max(spd, SPIDER_SPEED_MIN), SPIDER_SPEED_MAX);
        data.vx = (data.vx / spd) * target;
        data.vy = (data.vy / spd) * target;
    }

    data.x += data.vx * dt;
    data.y += data.vy * dt;

    // Edge bounce
    const m = 10;
    if (data.x < m)                                    { data.x = m;                                    data.vx =  Math.abs(data.vx); }
    if (data.x > window.innerWidth  - SPIDER_SIZE - m) { data.x = window.innerWidth  - SPIDER_SIZE - m; data.vx = -Math.abs(data.vx); }
    if (data.y < m)                                    { data.y = m;                                    data.vy =  Math.abs(data.vy); }
    if (data.y > window.innerHeight - SPIDER_SIZE - m) { data.y = window.innerHeight - SPIDER_SIZE - m; data.vy = -Math.abs(data.vy); }

    const rot = Math.atan2(data.vy, data.vx) * (180 / Math.PI) + 90;
    data.legPhase += 0.18 * dt;
    const wiggle = 1 + Math.sin(data.legPhase) * 0.04;
    data.el.style.left      = data.x + 'px';
    data.el.style.top       = data.y + 'px';
    data.el.style.transform = `rotate(${rot}deg) scale(${wiggle})`;

    data.animId = requestAnimationFrame((ts) => updateSpiderPhysics(data, ts, timestamp));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Kill
// ═══════════════════════════════════════════════════════════════════════════════
function killSpider(data, hitClientX, hitClientY) {
    if (data.dead) return;
    data.dead = true;
    if (data.animId) cancelAnimationFrame(data.animId);

    const el = data.el;
    const cx = data.x + SPIDER_SIZE / 2;
    const cy = data.y + SPIDER_SIZE / 2;

    addScore(hitClientX ?? cx, hitClientY ?? cy);

    // 1. Flash → implode
    el.animate([
        { transform: 'scale(1)',    filter: 'brightness(1)  saturate(1)',  opacity: '1' },
        { transform: 'scale(2.4)', filter: 'brightness(4)  saturate(0)',  opacity: '1',  offset: 0.1 },
        { transform: 'scale(0.4) rotate(60deg)', filter: 'brightness(0.2) saturate(3) hue-rotate(180deg)', opacity: '0.5', offset: 0.6 },
        { transform: 'scale(0)',   filter: 'brightness(0)', opacity: '0' }
    ], { duration: 400, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' })
    .onfinish = () => {
        el.remove();
        spiders = spiders.filter(s => s !== data);
        refreshHUD();
        // No auto-respawn here — the interval handles new spawns
    };

    // 2. Particle burst
    const colors = ['#3d2b1f','#6b3a2a','#ff4444','#cc2200','#ffaa00','#ffffff'];
    for (let i = 0; i < 12; i++) {
        const p    = document.createElement('div');
        const size = 3 + Math.random() * 7;
        p.style.cssText = `
            position:fixed; width:${size}px; height:${size}px;
            border-radius:${Math.random() > 0.45 ? '50%' : '2px'};
            background:${colors[Math.floor(Math.random() * colors.length)]};
            pointer-events:none; z-index:99999;
            left:${cx}px; top:${cy}px;
        `;
        document.body.appendChild(p);
        const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
        const dist  = 35 + Math.random() * 70;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        p.animate([
            { transform: `translate(-50%,-50%) scale(1)`, opacity: '1' },
            { transform: `translate(calc(-50% + ${tx}px),calc(-50% + ${ty}px)) scale(0)`, opacity: '0' }
        ], { duration: 380 + Math.random() * 250, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' })
        .onfinish = () => p.remove();
    }

    // 3. Shockwave ring
    const ring = document.createElement('div');
    ring.style.cssText = `
        position:fixed; left:${cx}px; top:${cy}px;
        width:10px; height:10px; border-radius:50%;
        border:2px solid rgba(200,50,0,.75);
        pointer-events:none; z-index:99998;
        transform:translate(-50%,-50%) scale(1);
    `;
    document.body.appendChild(ring);
    ring.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: '.9' },
        { transform: 'translate(-50%,-50%) scale(9)', opacity: '0'  }
    ], { duration: 400, easing: 'ease-out', fill: 'forwards' })
    .onfinish = () => ring.remove();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Hammer hook
// ═══════════════════════════════════════════════════════════════════════════════
function checkHammerSpiderCollision(hitClientX, hitClientY) {
    let hitAny = false;
    spiders.forEach(data => {
        if (data.dead) return;
        const rect = data.el.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = hitClientX - cx;
        const dy   = hitClientY - cy;
        if (Math.sqrt(dx * dx + dy * dy) < SPIDER_HAMMER_HIT_RADIUS) {
            killSpider(data, hitClientX, hitClientY);
            hitAny = true;
        }
    });
    return hitAny;
}

function setupSpiderMode() {
    document.addEventListener('mousedown', (e) => {
        if (!document.body.classList.contains('hammer-mode')) return;
        if (e.target.closest('.weapon-cache') ||
            e.target.closest('.weapon-esc-hint') ||
            e.target.closest('.system-status-bar')) return;

        const hitX = e.clientX - 100;
        const hitY = e.clientY - 50;
        setTimeout(() => checkHammerSpiderCollision(hitX, hitY), 65);
    }, true);
}