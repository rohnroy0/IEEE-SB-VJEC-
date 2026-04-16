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
        header.classList.toggle('menu-active');
        body.classList.toggle('overflow-hidden');
        
        // Push state so back button can close menu
        if (isOpen) {
            history.pushState({ menuOpen: true }, '');
        }
    };

    const closeAllMenus = () => {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        header.classList.remove('menu-active');
        body.classList.remove('overflow-hidden');
        if (mobileDropdownToggle) {
            mobileDropdownToggle.classList.remove('active');
            mobileSubmenu.classList.remove('active');
        }
        
        // Desktop dropdown fix - absolute lock for 1 second
        document.querySelectorAll('.nav-links li.dropdown').forEach(dropdown => {
            dropdown.classList.add('hide-menu');
            
            // Force arrow reset visually
            const toggleIcon = dropdown.querySelector('.dropdown-toggle i');
            if (toggleIcon) {
                toggleIcon.style.transition = 'none';
                toggleIcon.style.transform = '';
                // force reflow
                toggleIcon.offsetHeight;
                toggleIcon.style.transition = '';
            }
            
            // Remove the lock after a small window enough for scrolling/navigation to settle
            setTimeout(() => {
                dropdown.classList.remove('hide-menu');
            }, 1000);
        });
    };

    mobileToggle.addEventListener('click', toggleMenu);

    // Handle back button to close menu
    window.addEventListener('popstate', (event) => {
        if (mobileMenu.classList.contains('active')) {
            mobileToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            header.classList.remove('menu-active');
            body.classList.remove('overflow-hidden');
        }
    });

    // Close menu on resize (prevents desktop/mobile layout issues)
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992 && mobileMenu.classList.contains('active')) {
            mobileToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            header.classList.remove('menu-active');
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

    // Close menus on any navigation link click
    document.querySelectorAll('.nav-links a, .mobile-nav-links a, .dropdown-menu a, .mobile-submenu a').forEach(link => {
        // Skip the dropdown toggles themselves as they need to open/close sections
        if (link.classList.contains('mobile-dropdown-toggle') || link.classList.contains('dropdown-toggle')) {
            return;
        }

        link.addEventListener('click', () => {
            closeAllMenus();
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

    // 6. Search Functionality
    const searchInputs = document.querySelectorAll('.search-input');
    const searchData = [
        { title: "Home", url: "index.html", keywords: "home main vjec landing" },
        { title: "Chapters & Societies", url: "chapters.html", keywords: "chapters societies cs ras cis wie pes ias pels cass sps" },
        { title: "Computer Society (CS)", url: "chapters.html#cs", keywords: "computer society cs programming software" },
        { title: "Robotics & Automation (RAS)", url: "chapters.html#ras", keywords: "robotics automation ras hardware robots" },
        { title: "Computational Intelligence (CIS)", url: "chapters.html#cis", keywords: "computational intelligence cis ai machine learning" },
        { title: "Women in Engineering (WIE)", url: "chapters.html#wie", keywords: "women in engineering wie female tech" },
        { title: "Power & Energy Society (PES)", url: "chapters.html#pes", keywords: "power energy pes electrical" },
        { title: "Industry Applications Society (IAS)", url: "chapters.html#ias", keywords: "industry applications ias" },
        { title: "Power Electronics Society (PELS)", url: "chapters.html#pels", keywords: "power electronics pels hardware" },
        { title: "Circuits & Systems Society (CASS)", url: "chapters.html#cass", keywords: "circuits systems cass hardware analog" },
        { title: "Signal Processing Society (SPS)", url: "chapters.html#sps", keywords: "signal processing sps" },
        { title: "The Team", url: "team.html", keywords: "team members execom chairs webmaster faculty branch counselor" },
        { title: "Achievements", url: "achievements.html", keywords: "achievements awards prizes recognition" },
        { title: "Contact Us", url: "contact.html", keywords: "contact email phone location map reach" },
        { title: "Upcoming Events", url: "index.html#events", keywords: "events upcoming summer school internship workshop webinar seminar" },
        { title: "Summer School", url: "https://summerschool.ieeesbvjec.in", keywords: "event summer school intensive technical program workshop" },
        { title: "Hands-On Summer Internship", url: "index.html#events", keywords: "event internship program project mentorship skills ai machine learning data science web development" },
        { title: "Who We Are (About)", url: "index.html#about", keywords: "about vision mission history who we are" }
    ];

    searchInputs.forEach(input => {
        const resultsContainer = input.nextElementSibling;
        
        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length === 0) {
                resultsContainer.classList.add('hidden');
                resultsContainer.innerHTML = '';
                return;
            }

            const matches = searchData.filter(item => 
                item.title.toLowerCase().includes(query) || 
                item.keywords.toLowerCase().includes(query)
            );

            if (matches.length > 0) {
                resultsContainer.innerHTML = matches.map(match => 
                    `<a href="${match.url}" class="search-result-item">
                        ${match.title}
                    </a>`
                ).join('');
                resultsContainer.classList.remove('hidden');
            } else {
                resultsContainer.innerHTML = `<div class="search-result-item" style="color: var(--gray);">No results found</div>`;
                resultsContainer.classList.remove('hidden');
            }
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });
        
        // Show results when focusing back if there's text
        input.addEventListener('focus', () => {
            if (input.value.trim().length > 0) {
                resultsContainer.classList.remove('hidden');
            }
        });
    });
});

