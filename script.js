document.addEventListener('DOMContentLoaded', () => {
    // Dynamic Year
    document.getElementById('year').textContent = new Date().getFullYear();

    // Clip-Path Scroll Reveal Animation using Intersection Observer
    if ('IntersectionObserver' in window) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                root: null,
                rootMargin: '0px 0px -80px 0px',
                threshold: 0
            }
        );

        // Reveal elements already in viewport immediately, observe the rest
        const windowHeight = window.innerHeight;
        document.querySelectorAll('.reveal').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < windowHeight && rect.bottom > 0) {
                el.classList.add('revealed');
            } else {
                revealObserver.observe(el);
            }
        });
    } else {
        // Fallback for older browsers
        document.querySelectorAll('.reveal').forEach(el => {
            el.classList.add('revealed');
        });
    }

    // Console System Init
    console.log(
        "%c SYSTEM INITIALIZED. WELCOME, USER. ",
        "background: #000; color: #00f3ff; font-family: monospace; padding: 10px; border: 1px solid #00f3ff;"
    );

    // Typing Effect for Title
    const titleElement = document.getElementById('typing-title');
    const textToType = "Research-oriented Software Engineer";
    let charIndex = 0;

    function typeText() {
        if (charIndex < textToType.length) {
            titleElement.textContent += textToType.charAt(charIndex);
            charIndex++;
            setTimeout(typeText, 45);
        } else {
            setInterval(() => {
                if (titleElement.textContent.endsWith('_')) {
                    titleElement.textContent = textToType;
                } else {
                    titleElement.textContent = textToType + '_';
                }
            }, 400);
        }
    }

    setTimeout(typeText, 450);

    // Real-time Clock
    const clockElement = document.getElementById('clock');
    
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    setInterval(updateClock, 1000);
    updateClock(); // Initial call


    // THEME DROPDOWN LOGIC
    const themeSelect = document.getElementById('theme-select');
    const body = document.body;
    const storageKey = 'selected-theme';
    
    const initialTheme = document.documentElement.getAttribute('data-theme') || 'terminal';
    body.setAttribute('data-theme', initialTheme);
    themeSelect.value = initialTheme;
    updateDynamicContent(initialTheme);
    
    themeSelect.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        
        body.setAttribute('data-theme', selectedTheme);
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem(storageKey, selectedTheme);
        
        updateDynamicContent(selectedTheme);
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: selectedTheme } }));
    });

    // Accordion functionality
    const accordionToggles = document.querySelectorAll('.accordion-toggle');
    accordionToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !isExpanded);
            const content = toggle.nextElementSibling;
            content.classList.toggle('open');
        });
    });

    // =============================================
    // PORTAL GRID - Simple click to navigate + 3D Tilt
    // =============================================
    
    const portalCards = document.querySelectorAll('.portal-card');
    const tiltStrength = 12; // Max rotation in degrees
    const glareOpacity = 0.18; // Glare effect intensity
    
    portalCards.forEach(card => {
        // Add glare overlay element
        const glare = document.createElement('div');
        glare.className = 'card-glare';
        card.appendChild(glare);
        
        card.addEventListener('click', () => {
            const href = card.dataset.href;
            if (href) {
                window.open(href, '_blank');
            }
        });
        
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calculate rotation based on cursor position relative to center
            const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -tiltStrength;
            const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * tiltStrength;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
            
            // Move glare based on cursor position
            const glareX = ((e.clientX - rect.left) / rect.width) * 100;
            const glareY = ((e.clientY - rect.top) / rect.height) * 100;
            glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,${glareOpacity}) 0%, transparent 60%)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            glare.style.background = 'transparent';
        });
    });

    // Hero ambient parallax (subtle)
    const heroAmbient = document.querySelector('.hero-ambient');
    if (heroAmbient) {
        window.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX / window.innerWidth - 0.5) * 12;
            const moveY = (e.clientY / window.innerHeight - 0.5) * 12;
            heroAmbient.style.setProperty('--hero-parallax-x', `${moveX}px`);
            heroAmbient.style.setProperty('--hero-parallax-y', `${moveY}px`);
        });
    }

    // =============================================
    // MAGNETIC HOVER EFFECT - Social Links
    // =============================================
    
    const magneticElements = document.querySelectorAll('.social-links a, .social-links button');
    const magnetStrength = 0.35; // How strongly elements follow cursor (0-1)
    
    magneticElements.forEach(el => {
        el.style.transition = 'transform 0.25s ease-out';
        
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = e.clientX - centerX;
            const deltaY = e.clientY - centerY;
            
            const moveX = deltaX * magnetStrength;
            const moveY = deltaY * magnetStrength;
            
            el.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
        
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0, 0)';
        });
    });

    function updateDynamicContent(theme) {
        // Dynamic Text Content
        const textElements = document.querySelectorAll('[data-text-terminal]');
        
        textElements.forEach(el => {
            if (theme === 'terminal') {
                if (el.dataset.textTerminal) {
                    el.textContent = el.dataset.textTerminal;
                }
            } else {
                if (el.dataset.textSimple) {
                    el.textContent = el.dataset.textSimple;
                }
            }
        });
    }
});
