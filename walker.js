document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const stickWalkerTrack = document.querySelector('.hero-stick-walker');
    const stickWalker = document.querySelector('.stick-walker');
    const sorbetBubbles = document.querySelectorAll('.sorbet-bubble');
    const asciiWorm = document.querySelector('.ascii-worm');

    if (!stickWalkerTrack || !stickWalker) {
        return;
    }

    let stickWalkerTimer;
    let walkerX = -30;
    let walkerSpeed = 34;
    let walkerState = 'walking';
    let lastWalkerTimestamp = 0;
    let isSorbetBlowing = false;
    let sorbetStopHandledThisLap = false;
    let gaitPhase = 0;
    let wormAttemptedThisLap = false;
    let wormActive = false;
    let wormStartMs = 0;
    let wormX = 0;
    let wormFrameIndex = 0;
    let wormFrameTimerMs = 0;
    let wormLastUpdateMs = 0;

    const walkerStartX = -30;
    const sorbetPauseProgress = 0.25;
    const bubbleSourceX = -10;
    const bubbleSourceY = 0;
    const bubbleDelayStep = 0.28;
    const bubbleDelayJitter = 0.08;
    const bubbleLaneOffsets = [-1.2, -0.6, 0, 0.6, 1.2];
    const bubbleDelayByIndex = Array.from({ length: sorbetBubbles.length }, (_, index) => {
        return index * bubbleDelayStep + Math.random() * bubbleDelayJitter;
    });
    const FULL_TURN = Math.PI * 2;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wormBaseFrames = [
        "  _/\\__/\\__(o>",
        " _/\\__/\\___(O>",
        "  _/\\__/\\__(o>",
        " _/\\__/\\___(0>"
    ];
    const wormChompFrames = [
        "  _/\\__/\\__( 0>",
        " _/\\__/\\___( 0>",
        "  _/\\__/\\__( 0>"
    ];

    function isTerminalThemeActive() {
        return getActiveTheme() === 'terminal';
    }

    function setWormActive(active, timestampMs = 0) {
        if (!asciiWorm) return;
        wormActive = active;
        stickWalkerTrack.classList.toggle('worm-active', active);

        if (!active) {
            asciiWorm.textContent = '';
            return;
        }

        wormStartMs = timestampMs;
        wormFrameTimerMs = timestampMs;
        wormLastUpdateMs = timestampMs;
        wormFrameIndex = 0;
        asciiWorm.textContent = wormBaseFrames[0];
    }

    function maybeTriggerWormAttack(progress, timestampMs) {
        if (!asciiWorm || reducedMotionQuery.matches || !isTerminalThemeActive() || wormActive || wormAttemptedThisLap) {
            return;
        }

        if (progress < 0.3) {
            return;
        }

        wormAttemptedThisLap = true;
        wormX = walkerStartX;
        setWormActive(true, timestampMs);
    }

    function updateWormVisual(timestampMs) {
        if (!asciiWorm) return;

        if (!wormActive || !isTerminalThemeActive() || reducedMotionQuery.matches) {
            setWormActive(false);
            return;
        }

        const deltaSeconds = Math.max(0, (timestampMs - wormLastUpdateMs) / 1000);
        wormLastUpdateMs = timestampMs;
        const distanceFromBack = walkerX - wormX;
        const distanceToWalker = Math.abs(distanceFromBack);
        const shouldChomp = distanceToWalker < 30;
        const frames = shouldChomp ? wormChompFrames : wormBaseFrames;
        const frameTickMs = shouldChomp ? 70 : 95;

        const slitherSpeed = Math.max(walkerSpeed + 10, shouldChomp ? 82 : 46);
        wormX += slitherSpeed * deltaSeconds;

        if (timestampMs - wormFrameTimerMs > frameTickMs) {
            wormFrameIndex = (wormFrameIndex + 1) % frames.length;
            wormFrameTimerMs = timestampMs;
        }

        asciiWorm.textContent = frames[wormFrameIndex];
        const bobY = Math.sin((timestampMs - wormStartMs) * 0.015) * 1.5;
        asciiWorm.style.left = `${wormX}px`;
        asciiWorm.style.transform = `translate3d(0, ${bobY.toFixed(2)}px, 0)`;

        // Worm keeps chasing until lap reset/theme change.
    }

    function setWalkerPose(armA, armB, legA, legB) {
        stickWalker.style.setProperty('--walker-arm-a-angle', `${armA.toFixed(2)}deg`);
        stickWalker.style.setProperty('--walker-arm-b-angle', `${armB.toFixed(2)}deg`);
        stickWalker.style.setProperty('--walker-leg-a-angle', `${legA.toFixed(2)}deg`);
        stickWalker.style.setProperty('--walker-leg-b-angle', `${legB.toFixed(2)}deg`);
    }

    function resetWalkerPose() {
        setWalkerPose(14, -36, -14, 18);
    }

    function updateProceduralGait(deltaSeconds) {
        if (reducedMotionQuery.matches) {
            resetWalkerPose();
            return;
        }

        if (isSorbetBlowing) return;

        const isRunning = walkerState === 'running';
        const stepFrequency = isRunning ? 3.8 : 2.2;
        gaitPhase = (gaitPhase + deltaSeconds * FULL_TURN * stepFrequency) % FULL_TURN;

        const stride = Math.sin(gaitPhase);
        const leadLift = Math.max(0, Math.sin(gaitPhase));
        const trailLift = Math.max(0, Math.sin(gaitPhase + Math.PI));
        const armWave = Math.sin(gaitPhase + (isRunning ? 0.36 : 0.28));
        const armReachDamping = 1 - Math.abs(stride) * 0.18;

        if (isRunning) {
            const armSwing = 24 * armReachDamping;
            const armA = 10 - armWave * armSwing + trailLift * 3;
            const armB = -32 + armWave * armSwing + leadLift * 3;
            const legA = -14 + stride * 34 - leadLift * 12;
            const legB = 16 - stride * 34 - trailLift * 12;
            setWalkerPose(armA, armB, legA, legB);
            return;
        }

        const armSwing = 16 * armReachDamping;
        const armA = 10 - armWave * armSwing + trailLift * 2;
        const armB = -30 + armWave * armSwing + leadLift * 2;
        const legA = -12 + stride * 22 - leadLift * 8;
        const legB = 16 - stride * 22 - trailLift * 8;
        setWalkerPose(armA, armB, legA, legB);
    }

    function getActiveTheme() {
        return document.documentElement.getAttribute('data-theme') || body.getAttribute('data-theme') || 'simple';
    }

    function isSorbetThemeActive() {
        return getActiveTheme() === 'sorbet';
    }

    function filterThemeForWalker() {
        const activeTheme = getActiveTheme();
        return activeTheme === 'terminal' || activeTheme === 'signal' || activeTheme === 'sorbet';
    }

    function randomizeSorbetBubbleMotion(bubble) {
        const driftX = 50 + Math.random() * 2.8;
        const driftY = 28 + Math.random() * 6;
        const duration = 2.7 + Math.random() * 0.55;
        const wobbleDuration = 1.0 + Math.random() * 0.25;
        const scaleStart = 0.24 + Math.random() * 0.03;
        const scaleEnd = 1.08 + Math.random() * 0.5;

        bubble.style.setProperty('--bubble-drift-x', `${driftX.toFixed(2)}px`);
        bubble.style.setProperty('--bubble-drift-y', `${driftY.toFixed(2)}px`);
        bubble.style.setProperty('--bubble-duration', `${duration.toFixed(2)}s`);
        bubble.style.setProperty('--bubble-wobble-duration', `${wobbleDuration.toFixed(2)}s`);
        bubble.style.setProperty('--bubble-scale-start', scaleStart.toFixed(2));
        bubble.style.setProperty('--bubble-scale-end', scaleEnd.toFixed(2));
    }

    function primeSorbetBubbles() {
        sorbetBubbles.forEach((bubble, index) => {
            const laneOffset = bubbleLaneOffsets[index] || 0;
            const delay = bubbleDelayByIndex[index] || 0;

            bubble.style.setProperty('--bubble-delay', `${delay.toFixed(2)}s`);
            bubble.style.setProperty('--bubble-x', `${(bubbleSourceX + laneOffset).toFixed(2)}px`);
            bubble.style.setProperty('--bubble-y', `${bubbleSourceY.toFixed(2)}px`);
            randomizeSorbetBubbleMotion(bubble);
        });
    }

    function setSorbetBlowingState(shouldBlow) {
        if (isSorbetBlowing === shouldBlow) return;
        isSorbetBlowing = shouldBlow;
        stickWalkerTrack.classList.toggle('is-blowing', shouldBlow);

        if (shouldBlow) {
            primeSorbetBubbles();
        }
    }

    function setStickWalkerState(state) {
        stickWalkerTrack.classList.remove('is-running');
        walkerState = 'walking';

        if (state === 'running' && !isSorbetThemeActive()) {
            stickWalkerTrack.classList.add('is-running');
            walkerState = 'running';
            walkerSpeed = 68;
            return;
        }

        walkerSpeed = 34;
    }

    function scheduleStickWalkerState() {
        clearTimeout(stickWalkerTimer);

        if (!filterThemeForWalker()) {
            setStickWalkerState('walking');
            return;
        }

        const roll = Math.random();
        let nextState = 'walking';
        let duration = 3000 + Math.random() * 2200;

        if (roll < 0.35) {
            nextState = 'running';
            duration = 1800 + Math.random() * 1700;
        }

        setStickWalkerState(nextState);
        stickWalkerTimer = setTimeout(scheduleStickWalkerState, duration);
    }

    function animateStickWalker(timestamp) {
        if (filterThemeForWalker()) {
            if (!lastWalkerTimestamp) {
                lastWalkerTimestamp = timestamp;
            }

            const deltaSeconds = (timestamp - lastWalkerTimestamp) / 1000;
            lastWalkerTimestamp = timestamp;
            const loopWidth = stickWalkerTrack.clientWidth + 20;
            const loopDistance = loopWidth - walkerStartX;
            const sorbetStopX = walkerStartX + loopDistance * sorbetPauseProgress;
            const loopProgress = Math.max(0, Math.min(1, (walkerX - walkerStartX) / loopDistance));

            maybeTriggerWormAttack(loopProgress, timestamp);

            if (isSorbetThemeActive()) {
                const reachedSorbetStop = !sorbetStopHandledThisLap && walkerX >= sorbetStopX;
                if (reachedSorbetStop) {
                    walkerX = sorbetStopX;
                    sorbetStopHandledThisLap = true;
                    setSorbetBlowingState(true);
                }

                if (sorbetStopHandledThisLap) {
                    updateProceduralGait(deltaSeconds);
                    stickWalker.style.left = `${walkerX}px`;
                    stickWalkerTrack.style.setProperty('--walker-x', `${walkerX}px`);
                    window.requestAnimationFrame(animateStickWalker);
                    return;
                }
            } else {
                sorbetStopHandledThisLap = false;
                setSorbetBlowingState(false);
            }

            walkerX += walkerSpeed * deltaSeconds;
            updateProceduralGait(deltaSeconds);
            updateWormVisual(timestamp);

            if (walkerX > loopWidth) {
                walkerX = walkerStartX;
                sorbetStopHandledThisLap = false;
                setSorbetBlowingState(false);
                wormAttemptedThisLap = false;
                setWormActive(false);
            }

            stickWalker.style.left = `${walkerX}px`;
            stickWalkerTrack.style.setProperty('--walker-x', `${walkerX}px`);
        } else {
            lastWalkerTimestamp = timestamp;
            sorbetStopHandledThisLap = false;
            setSorbetBlowingState(false);
            stickWalker.style.left = `${walkerStartX}px`;
            stickWalkerTrack.style.setProperty('--walker-x', `${walkerStartX}px`);
            resetWalkerPose();
            wormAttemptedThisLap = false;
            setWormActive(false);
        }

        window.requestAnimationFrame(animateStickWalker);
    }

    window.addEventListener('themechange', scheduleStickWalkerState);

    resetWalkerPose();
    scheduleStickWalkerState();
    window.requestAnimationFrame(animateStickWalker);
});
