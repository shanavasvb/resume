// =============================================
// PEEKING ROBOT - Shy periodic peek
// =============================================

(function() {
    const robot = document.querySelector('.peeking-robot');
    if (!robot) return;

    let hideTimeout = null;
    let isHiding = false;
    
    // Normal distribution random (Box-Muller transform)
    const randomNormal = (mean = 0.5, stdDev = 0.15) => {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(0.15, Math.min(0.85, mean + z * stdDev)); // Clamp 15%-85%
    };
    
    const setSide = (side) => {
        robot.classList.remove('side-left', 'side-right');
        robot.classList.add(`side-${side}`);
    };
    
    // Initialize on right side
    setSide('right');
    
    // Randomly choose robot variant
    const setRandomVariant = () => {
        robot.classList.remove('show-normal', 'show-weird');
        robot.classList.add(Math.random() > 0.5 ? 'show-weird' : 'show-normal');
    };
    setRandomVariant();
    
    const showRobot = (className = 'visible') => {
        if (isHiding) return;
        clearTimeout(hideTimeout);
        robot.classList.remove('peek', 'visible', 'hiding');
        robot.classList.add(className);
    };
    
    const hideRobot = (delay = 2000) => {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            if (!isHiding) {
                robot.classList.remove('peek', 'visible');
            }
        }, delay);
    };
    
    const teleportRobot = () => {
        isHiding = true;
        robot.classList.remove('peek', 'visible');
        robot.classList.add('hiding');
        
        // After hide animation, teleport
        setTimeout(() => {
            // Random side
            const newSide = Math.random() > 0.5 ? 'left' : 'right';
            setSide(newSide);
            
            // Normal distribution Y position (15% - 85% of viewport)
            const yPercent = randomNormal(0.5, 0.18) * 100;
            robot.style.top = `${yPercent}%`;
            
            robot.classList.remove('hiding');
            isHiding = false;
            
            // Randomize variant and peek after repositioning
            setRandomVariant();
            setTimeout(() => {
                showRobot('peek');
                hideRobot(3000);
            }, 800);
        }, 500);
    };
    
    // Click to teleport
    robot.addEventListener('click', (e) => {
        e.stopPropagation();
        teleportRobot();
    });
    
    // Hover behavior
    robot.addEventListener('mouseenter', () => {
        showRobot('visible');
    });
    
    robot.addEventListener('mouseleave', () => {
        hideRobot(1500);
    });
    
    // Initial peek after 3 seconds
    setTimeout(() => {
        showRobot('peek');
        hideRobot(2500);
    }, 3000);
    
    // Random peek every 20-40 seconds
    setInterval(() => {
        if (!robot.classList.contains('visible') && !isHiding) {
            showRobot('peek');
            hideRobot(3000);
        }
    }, Math.random() * 20000 + 20000);
    
    // Eyes follow cursor
    const pupils = robot.querySelectorAll('.pupil');
    const maxMove = 3;
    
    document.addEventListener('mousemove', (e) => {
        const robotRect = robot.getBoundingClientRect();
        const robotCenterX = robotRect.left + robotRect.width / 2;
        const robotCenterY = robotRect.top + robotRect.height / 2;
        
        const deltaX = e.clientX - robotCenterX;
        const deltaY = e.clientY - robotCenterY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        let moveX = (deltaX / Math.max(distance, 1)) * maxMove;
        const moveY = (deltaY / Math.max(distance, 1)) * maxMove;
        
        // Invert X when robot is flipped on left side
        if (robot.classList.contains('side-left')) {
            moveX = -moveX;
        }
        
        pupils.forEach(pupil => {
            pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
    
    // Mobile: crossing behavior (DISABLED for now)
    // const isMobile = window.matchMedia('(max-width: 768px)').matches;
    // 
    // if (isMobile) {
    //     let isCrossing = false;
    //     let crossingTimeout = null;
    //     let crossingInterval = null;
    //     
    //     const resetRobot = () => {
    //         robot.classList.remove('crossing', 'crossing-left', 'crossing-right', 'floating', 'stopped', 'vanish');
    //         robot.style.left = '';
    //         robot.style.right = '';
    //         robot.style.transform = '';
    //         robot.style.transition = '';
    //         isCrossing = false;
    //     };
    //     
    //     const startCrossing = () => {
    //         if (isCrossing) return;
    //         isCrossing = true;
    //         
    //         // Random direction
    //         const goingRight = Math.random() > 0.5;
    //         const startSide = goingRight ? 'crossing-right' : 'crossing-left';
    //         
    //         // Random Y position (20% - 80%)
    //         const yPos = (Math.random() * 60 + 20);
    //         
    //         // Reset position and randomize variant
    //         robot.classList.remove('side-left', 'side-right', 'peek', 'visible', 'hiding', 'crossing', 'crossing-left', 'crossing-right', 'stopped', 'vanish');
    //         robot.classList.add(startSide, 'crossing', 'floating');
    //         setRandomVariant();
    //         robot.style.top = `${yPos}%`;
    //         robot.style.transition = '';
    //         
    //         // Start crossing after a frame - use transform to avoid layout shifts
    //         requestAnimationFrame(() => {
    //             requestAnimationFrame(() => {
    //                 const distance = window.innerWidth + 160; // 80px start + 80px end
    //                 if (goingRight) {
    //                     robot.style.transform = `translateY(-50%) scale(0.7) translateX(${distance}px)`;
    //                 } else {
    //                     robot.style.transform = `translateY(-50%) scale(0.7) translateX(-${distance}px)`;
    //                 }
    //             });
    //         });
    //         
    //         // Reset after crossing
    //         crossingTimeout = setTimeout(() => {
    //             resetRobot();
    //         }, 9000);
    //     };
    //     
    //     // Click to jumpscare, then vanish and reappear
    //     robot.addEventListener('click', (e) => {
    //         e.stopPropagation();
    //         
    //         clearTimeout(crossingTimeout);
    //         robot.style.transition = '';
    //         robot.style.left = '';
    //         robot.style.right = '';
    //         robot.classList.remove('crossing', 'crossing-left', 'crossing-right', 'floating', 'stopped');
    //         robot.classList.add('jumpscare');
    //         
    //         // Vanish after jumpscare
    //         setTimeout(() => {
    //             robot.classList.remove('jumpscare');
    //             robot.classList.add('vanish');
    //             
    //             // Reappear after vanish animation
    //             setTimeout(() => {
    //                 resetRobot();
    //                 startCrossing();
    //             }, 400);
    //         }, 800);
    //     });
    //     
    //     // Initial crossing after 4s
    //     setTimeout(startCrossing, 4000);
    //     
    //     // Random crossings every 20-40s
    //     crossingInterval = setInterval(() => {
    //         if (!isCrossing) {
    //             startCrossing();
    //         }
    //     }, Math.random() * 20000 + 20000);
    // }
})();
