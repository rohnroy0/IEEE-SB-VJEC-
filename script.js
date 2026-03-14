document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const header = document.querySelector('.header');
    const body = document.body;

    // 1. Page Loader Logic
    window.addEventListener('load', () => {
        requestAnimationFrame(() => {
            loader.classList.add('hidden');
            body.classList.remove('loading');
        });
    });

    // 2. Mobile Menu Toggle
    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        body.classList.toggle('overflow-hidden');
    });

    // Close mobile menu on link click
    document.querySelectorAll('.mobile-nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            body.classList.remove('overflow-hidden');
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
    // This intercepts clicks on internal links to show the loader before navigating
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');

        // Only trigger for local .html links that are not fragments
        if (href && href.endsWith('.html') && !href.startsWith('#')) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.href;

                // Show loader
                loader.classList.remove('hidden');
                body.classList.add('loading');

                // Navigate faster
                setTimeout(() => {
                    window.location.href = target;
                }, 150);
            });
        }
    });

    // 5. Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.1
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
