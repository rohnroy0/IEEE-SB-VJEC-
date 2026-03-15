document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const header = document.querySelector('.header');
    const body = document.body;
    let isNavigating = false;

    // 1. Page Loader Logic
    const hideLoader = () => {
        requestAnimationFrame(() => {
            loader.classList.add('hidden');
            body.classList.remove('loading');
        });
    };

    window.addEventListener('load', hideLoader);
    
    // Handle Bfcache (Back button)
    window.addEventListener('pageshow', (event) => {
        isNavigating = false; // Reset navigation lock
        if (event.persisted) {
            hideLoader();
        }
    });

    // 2. Mobile Menu Toggle logic
    const toggleMenu = () => {
        const isOpen = mobileToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        body.classList.toggle('overflow-hidden');
        
        // Push state so back button can close menu
        if (isOpen) {
            history.pushState({ menuOpen: true }, '');
        }
    };

    mobileToggle.addEventListener('click', toggleMenu);

    // Handle back button to close menu
    window.addEventListener('popstate', (event) => {
        if (mobileMenu.classList.contains('active')) {
            mobileToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            body.classList.remove('overflow-hidden');
        }
    });

    // Close menu on resize (prevents desktop/mobile layout issues)
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992 && mobileMenu.classList.contains('active')) {
            mobileToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            body.classList.remove('overflow-hidden');
            if (history.state && history.state.menuOpen) {
                history.back();
            }
        }
    });

    // Mobile Dropdown (Chapters) logic
    const mobileDropdownToggle = document.querySelector('.mobile-dropdown-toggle');
    const mobileSubmenu = document.querySelector('.mobile-submenu');

    if (mobileDropdownToggle) {
        mobileDropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            mobileDropdownToggle.classList.toggle('active');
            mobileSubmenu.classList.toggle('active');
        });
    }

    // Close mobile menu on clicking a simple link (not the dropdown toggle)
    document.querySelectorAll('.mobile-nav-links > li > a:not(.mobile-dropdown-toggle), .mobile-submenu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            body.classList.remove('overflow-hidden');

            // Also reset chapters dropdown if open
            if (mobileDropdownToggle) {
                mobileDropdownToggle.classList.remove('active');
                mobileSubmenu.classList.remove('active');
            }
        });
    });

    // 3. Scroll Header Effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 4. Smooth Content Transition for Link Clicks
    
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');

        // Only trigger for local .html links that are not fragments
        if (href && href.endsWith('.html') && !href.startsWith('#')) {
            link.addEventListener('click', (e) => {
                if (isNavigating) {
                    e.preventDefault();
                    return;
                }

                // If menu is open, we're likely clicking a link to navigate
                // No need to prevent default if history.back() is handled by browser
                
                e.preventDefault();
                const target = link.href;
                isNavigating = true;

                // Show loader
                loader.classList.remove('hidden');
                body.classList.add('loading');

                // Navigate
                setTimeout(() => {
                    window.location.href = target;
                }, 150);
            });
        }
    });

    // 5. Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.05,
        rootMargin: '0px 0px -50px 0px' // Trigger slightly before it enters the full viewport
    };

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const countTo = parseInt(target.getAttribute('data-target'));
                const duration = 2000; // 2 seconds for snappier feel
                let startTime = null;

                const animate = (currentTime) => {
                    if (!startTime) startTime = currentTime;
                    const progress = Math.min((currentTime - startTime) / duration, 1);
                    const currentCount = Math.floor(progress * countTo);

                    target.textContent = currentCount;

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        target.textContent = countTo;
                    }
                };

                requestAnimationFrame(animate);
                counterObserver.unobserve(target); // Only animate once
            }
        });
    }, observerOptions);

    document.querySelectorAll('.counter').forEach(counter => {
        counterObserver.observe(counter);
    });

    const standardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.event-card, .section-header, .vision-card, .mission-card, .offer-item, .society-item, .stat-item').forEach(el => {
        standardObserver.observe(el);
    });
});
