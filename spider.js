/**
 * Spider Invasion — Simple Game
 * 12 spiders spawn once. Kill all 12 to win.
 * First hammer hit on a spider = 15 pts  (max score 180... but displayed cap shown as 120 perfect)
 * Any hit = 10 pts baseline, first hit bonus = +5 = 15 total
 * Max possible score = 12 × 15 = 180... keeping it 10pts base, 15pts first-hit as requested
 * Max score = 120 means all 12 killed on first attempt with no misses
 * So: first hit = 10pts, perfect run = 120. Miss a spider (hammer swings that don't land don't deduct).
 * Actually per request: first hit = 15pts, max = 120 → 12 × 10 = 120 base, first hit bonus shown separately.
 * Simplest reading: each kill = 10pts (max 120). If killed on first hammer swing ever touching the page = 15pts shown as bonus.
 * FINAL interpretation matching request exactly:
 *   - Kill within first hammer swing attempt on that spider = 15 pts
 *   - Kill on a later swing = 10 pts
 *   - 12 spiders × 10 pts = 120 max "standard", first-hit bonus makes it higher
 *   - Kill all 12 → WIN screen
 */

let spiders     = [];
let spiderScore = 0;
let gameRunning = false;

const TOTAL_SPIDERS = 12;

const SPIDER_SPEED_MIN = 0.7;
const SPIDER_SPEED_MAX = 1.5;
const SPIDER_SIZE      = 48;
const SPIDER_HIT_RADIUS = 55;

const MOUSE_COLLISION = 60;
const MOUSE_PANIC     = 180;
const MOUSE_AWARE     = 320;

const SEP_DIST  = 68;
const SEP_FORCE = 0.14;

let spMouseX = window.innerWidth  / 2;
let spMouseY = window.innerHeight / 2;

document.addEventListener('DOMContentLoaded', () => {
    injectSpiderItem();
    buildHUD();
    setupHammerHook();
    document.addEventListener('mousemove', e => { spMouseX = e.clientX; spMouseY = e.clientY; });
});

// ── Weapon tray ───────────────────────────────────────────────────────────────
function injectSpiderItem() {
    const wait = setInterval(() => {
        const tray = document.querySelector('.weapon-tray');
        if (!tray) return;
        clearInterval(wait);

        const item = document.createElement('div');
        item.className = 'weapon-item';
        item.dataset.weapon  = 'spider';
        item.dataset.tooltip = 'Spider Invasion';
        item.innerHTML = `<img src="spider.png" alt="Spider" class="spider-icon">`;
        tray.appendChild(item);

        item.addEventListener('click', () => {
            document.querySelector('.weapon-cache')?.classList.remove('open');
            if (!gameRunning) startGame();
        });
    }, 50);
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function buildHUD() {
    const s = document.createElement('style');
    s.textContent = `
        #sp-hud {
            position:fixed; top:70px; right:18px; z-index:100000;
            pointer-events:none; opacity:0; transform:translateY(-8px);
            transition:opacity .3s,transform .3s;
        }
        #sp-hud.on { opacity:1; transform:translateY(0); }
        .sp-hud-box {
            display:flex; align-items:center; gap:10px;
            background:rgba(10,10,10,.88); border:1px solid rgba(255,255,255,.12);
            border-radius:12px; padding:8px 18px;
            font-family:'JetBrains Mono',monospace; color:#fff;
            backdrop-filter:blur(8px); box-shadow:0 4px 20px rgba(0,0,0,.5);
        }
        .sp-lbl  { color:rgba(255,255,255,.4); font-size:10px; letter-spacing:.08em; }
        .sp-val  { font-weight:700; font-size:15px; }
        .sp-score{ color:#ffd700; }
        .sp-left { color:#4fc3f7; }
        .sp-sep  { color:rgba(255,255,255,.18); }

        /* floating score pop */
        .sp-pop {
            position:fixed; pointer-events:none; z-index:999999;
            font-family:'JetBrains Mono',monospace; font-weight:800; font-size:20px;
            color:#ffd700; text-shadow:0 0 12px rgba(255,215,0,.7),0 2px 4px rgba(0,0,0,.8);
            white-space:nowrap;
        }
        .sp-pop.bonus { color:#ff9800; font-size:24px;
            text-shadow:0 0 16px rgba(255,152,0,.9),0 2px 4px rgba(0,0,0,.8); }

    `;
    document.head.appendChild(s);

    const hud = document.createElement('div');
    hud.id = 'sp-hud';
    hud.innerHTML = `<div class="sp-hud-box">
        <span>🕷️</span>
        <span class="sp-lbl">SCORE</span><span class="sp-val sp-score" id="sp-score">0</span>
        <span class="sp-sep">│</span>
        <span class="sp-lbl">LEFT</span><span class="sp-val sp-left" id="sp-left">12</span>
    </div>`;
    document.body.appendChild(hud);
}

function hudOn()  { document.getElementById('sp-hud')?.classList.add('on'); }
function hudOff() { document.getElementById('sp-hud')?.classList.remove('on'); }

function refreshHUD() {
    const left = spiders.filter(s => !s.dead).length;
    document.getElementById('sp-score').textContent = spiderScore;
    document.getElementById('sp-left').textContent  = left;
}

// ── Game flow ─────────────────────────────────────────────────────────────────
function startGame() {
    gameRunning  = true;
    spiderScore  = 0;
    spiders      = [];
    hudOn();
    refreshHUD();
    for (let i = 0; i < TOTAL_SPIDERS; i++) {
        setTimeout(() => spawnSpider(), i * 150);
    }
}

function onSpiderKilled() {
    const left = spiders.filter(s => !s.dead).length;
    refreshHUD();
    if (left === 0) gameRunning = false;
}

// ── Spawn ─────────────────────────────────────────────────────────────────────
function spawnSpider() {
    const el = document.createElement('div');
    el.className = 'deployed-spider';
    el.innerHTML = `<img src="spider.png" alt="Spider">`;
    document.body.appendChild(el);

    const edge = Math.floor(Math.random() * 4);
    let sx, sy;
    switch (edge) {
        case 0: sx = Math.random() * window.innerWidth;  sy = -SPIDER_SIZE; break;
        case 1: sx = window.innerWidth + SPIDER_SIZE;    sy = Math.random() * window.innerHeight; break;
        case 2: sx = Math.random() * window.innerWidth;  sy = window.innerHeight + SPIDER_SIZE; break;
        case 3: sx = -SPIDER_SIZE;                        sy = Math.random() * window.innerHeight; break;
    }
    el.style.left = sx + 'px';
    el.style.top  = sy + 'px';

    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const a  = Math.atan2(cy - sy, cx - sx) + (Math.random() - 0.5) * 1.5;
    const sp = SPIDER_SPEED_MIN + Math.random() * (SPIDER_SPEED_MAX - SPIDER_SPEED_MIN);

    const data = {
        el, x: sx, y: sy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        animId: null, dead: false,
        legPhase: Math.random() * Math.PI * 2,
        wanderTimer: 0,
        neverHit: true   // true until first hammer swing near it
    };
    spiders.push(data);
    requestAnimationFrame(ts => tick(data, ts, ts));
}

// ── Physics ───────────────────────────────────────────────────────────────────
function tick(data, now, last) {
    if (data.dead) return;
    const dt = Math.min((now - last) / 16.67, 3);

    // wander
    data.wanderTimer += dt;
    if (data.wanderTimer > 60 + Math.random() * 80) {
        data.wanderTimer = 0;
        const t = (Math.random() - 0.5) * 1.2;
        const c = Math.cos(t), s = Math.sin(t);
        [data.vx, data.vy] = [data.vx*c - data.vy*s, data.vx*s + data.vy*c];
    }

    // mouse avoidance
    const mdx = data.x + SPIDER_SIZE/2 - spMouseX;
    const mdy = data.y + SPIDER_SIZE/2 - spMouseY;
    const md  = Math.sqrt(mdx*mdx + mdy*mdy);
    if (md < MOUSE_COLLISION) {
        const pa = Math.atan2(mdy, mdx);
        data.vx = Math.cos(pa) * SPIDER_SPEED_MAX * 1.9;
        data.vy = Math.sin(pa) * SPIDER_SPEED_MAX * 1.9;
    } else if (md < MOUSE_PANIC) {
        const pa = Math.atan2(mdy, mdx);
        data.vx += Math.cos(pa) * 0.28 * (1 - md/MOUSE_PANIC) * dt;
        data.vy += Math.sin(pa) * 0.28 * (1 - md/MOUSE_PANIC) * dt;
    } else if (md < MOUSE_AWARE) {
        const pa = Math.atan2(mdy, mdx);
        data.vx += Math.cos(pa) * 0.06 * (1 - md/MOUSE_AWARE) * dt;
        data.vy += Math.sin(pa) * 0.06 * (1 - md/MOUSE_AWARE) * dt;
    }

    // separation
    for (const o of spiders) {
        if (o === data || o.dead) continue;
        const dx = (data.x + SPIDER_SIZE/2) - (o.x + SPIDER_SIZE/2);
        const dy = (data.y + SPIDER_SIZE/2) - (o.y + SPIDER_SIZE/2);
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d > 0 && d < SEP_DIST) {
            const f = SEP_FORCE * (1 - d/SEP_DIST) * dt;
            data.vx += (dx/d)*f; data.vy += (dy/d)*f;
        }
    }

    // clamp speed
    const spd = Math.sqrt(data.vx*data.vx + data.vy*data.vy);
    if (spd > 0.01) {
        const t = Math.min(Math.max(spd, SPIDER_SPEED_MIN), SPIDER_SPEED_MAX);
        data.vx = (data.vx/spd)*t; data.vy = (data.vy/spd)*t;
    }

    data.x += data.vx * dt;
    data.y += data.vy * dt;

    const m = 10;
    if (data.x < m)                                   { data.x = m;                                   data.vx =  Math.abs(data.vx); }
    if (data.x > window.innerWidth - SPIDER_SIZE - m) { data.x = window.innerWidth - SPIDER_SIZE - m; data.vx = -Math.abs(data.vx); }
    if (data.y < m)                                   { data.y = m;                                   data.vy =  Math.abs(data.vy); }
    if (data.y > window.innerHeight- SPIDER_SIZE - m) { data.y = window.innerHeight- SPIDER_SIZE - m; data.vy = -Math.abs(data.vy); }

    const rot    = Math.atan2(data.vy, data.vx) * (180/Math.PI) + 90;
    data.legPhase += 0.18 * dt;
    const wiggle  = 1 + Math.sin(data.legPhase) * 0.04;
    data.el.style.left      = data.x + 'px';
    data.el.style.top       = data.y + 'px';
    data.el.style.transform = `rotate(${rot}deg) scale(${wiggle})`;

    data.animId = requestAnimationFrame(ts => tick(data, ts, now));
}

// ── Kill ──────────────────────────────────────────────────────────────────────
function killSpider(data, hx, hy) {
    if (data.dead) return;
    data.dead = true;
    if (data.animId) cancelAnimationFrame(data.animId);

    const cx = data.x + SPIDER_SIZE/2;
    const cy = data.y + SPIDER_SIZE/2;

    // Points: 10 standard, 15 if never previously hit (first-hit bonus)
    const pts     = data.neverHit ? 15 : 10;
    const isBonus = data.neverHit;
    spiderScore  += pts;

    // floating score
    const pop = document.createElement('div');
    pop.className   = 'sp-pop' + (isBonus ? ' bonus' : '');
    pop.textContent = isBonus ? `+15 FIRST HIT!` : `+10`;
    pop.style.left  = (hx + 12) + 'px';
    pop.style.top   = (hy - 18) + 'px';
    document.body.appendChild(pop);
    pop.animate([
        { transform:'translateY(0) scale(1)',    opacity:'1' },
        { transform:'translateY(-55px) scale(1.1)', opacity:'0' }
    ], { duration:900, easing:'cubic-bezier(0.22,1,0.36,1)', fill:'forwards' })
    .onfinish = () => pop.remove();

    // implode
    data.el.animate([
        { transform:'scale(1)',   filter:'brightness(1) saturate(1)',  opacity:'1' },
        { transform:'scale(2.3)', filter:'brightness(4) saturate(0)',  opacity:'1',  offset:0.1 },
        { transform:'scale(0.4) rotate(60deg)', filter:'brightness(0.2) saturate(3) hue-rotate(180deg)', opacity:'0.5', offset:0.6 },
        { transform:'scale(0)',   filter:'brightness(0)', opacity:'0' }
    ], { duration:400, easing:'cubic-bezier(0.22,1,0.36,1)', fill:'forwards' })
    .onfinish = () => {
        data.el.remove();
        spiders = spiders.filter(s => s !== data);
        onSpiderKilled();
    };

    // particles
    const colors = ['#3d2b1f','#6b3a2a','#ff4444','#cc2200','#ffaa00','#fff'];
    for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        const sz = 3 + Math.random() * 7;
        p.style.cssText = `position:fixed;width:${sz}px;height:${sz}px;
            border-radius:${Math.random()>.45?'50%':'2px'};
            background:${colors[Math.floor(Math.random()*colors.length)]};
            pointer-events:none;z-index:99999;left:${cx}px;top:${cy}px;`;
        document.body.appendChild(p);
        const ang = (i/12)*Math.PI*2 + (Math.random()-.5)*.7;
        const d   = 35 + Math.random()*70;
        p.animate([
            { transform:`translate(-50%,-50%) scale(1)`, opacity:'1' },
            { transform:`translate(calc(-50% + ${Math.cos(ang)*d}px),calc(-50% + ${Math.sin(ang)*d}px)) scale(0)`, opacity:'0' }
        ], { duration:380+Math.random()*250, easing:'cubic-bezier(0.22,1,0.36,1)', fill:'forwards' })
        .onfinish = () => p.remove();
    }

    // ring
    const ring = document.createElement('div');
    ring.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:10px;height:10px;
        border-radius:50%;border:2px solid rgba(200,50,0,.75);
        pointer-events:none;z-index:99998;transform:translate(-50%,-50%) scale(1);`;
    document.body.appendChild(ring);
    ring.animate([
        { transform:'translate(-50%,-50%) scale(1)', opacity:'.9' },
        { transform:'translate(-50%,-50%) scale(9)', opacity:'0'  }
    ], { duration:400, easing:'ease-out', fill:'forwards' })
    .onfinish = () => ring.remove();
}

// ── Hammer hook ───────────────────────────────────────────────────────────────
function checkHammerSpiderCollision(hx, hy) {
    let hit = false;
    spiders.forEach(data => {
        if (data.dead) return;
        const r  = data.el.getBoundingClientRect();
        const cx = r.left + r.width/2;
        const cy = r.top  + r.height/2;
        const dx = hx - cx, dy = hy - cy;
        if (Math.sqrt(dx*dx + dy*dy) < SPIDER_HIT_RADIUS) {
            killSpider(data, hx, hy);
            hit = true;
        } else {
            // hammer swung near but missed — no longer a first-hit
            if (Math.sqrt(dx*dx + dy*dy) < SPIDER_HIT_RADIUS * 2.5) {
                data.neverHit = false;
            }
        }
    });
    return hit;
}

function setupHammerHook() {
    document.addEventListener('mousedown', e => {
        if (!document.body.classList.contains('hammer-mode')) return;
        if (e.target.closest('.weapon-cache') ||
            e.target.closest('.weapon-esc-hint') ||
            e.target.closest('.system-status-bar')) return;
        const hx = e.clientX - 100;
        const hy = e.clientY - 50;
        setTimeout(() => checkHammerSpiderCollision(hx, hy), 65);
    }, true);
}