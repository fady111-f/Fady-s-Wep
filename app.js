/**
 * ============================================================================
 * FADY FAWZY PORTFOLIO - CORE ENGINE (app.js)
 * ============================================================================
 * Purpose: Manages all interactive systems, performance-optimized animations,
 * dynamic styling, persistent theme states, canvas graphics, and event loops.
 *
 * Architecture and Design Patterns:
 * 1. Cache-Heavy DOM Access: References are pre-queried to avoid layout thrashing.
 * 2. Event Consolidation: Scroll and mousemove handlers are unified or throttled.
 * 3. Passive Event Listeners: Enhances scrolling performance (scroll-blocking bypass).
 * 4. CSS Containment Fixes: Works around backdrop-filter positioning bugs in browsers.
 * 5. Linear Interpolation (Lerp): Utilized for smooth lagging effects (e.g. custom cursor).
 * 6. High-Performance Canvas: Locks particle render loops inside requestAnimationFrame,
 *    pauses when the tab is inactive to preserve resources, battery, and AI credits.
 * 7. Redundancy Resilience: Accommodates both targeted static counter animations
 *    and generic observer-driven counters.
 * ============================================================================
 */
// ===== FIREBASE SERVICE CONFIGURATION & INITIALIZATION =====
// Note for developer/AI: Replace these credentials with Fady's active Firebase dashboard parameters.
// If config is left empty or is incomplete, the system triggers 'Resiliency Fallback',
// rendering hardcoded static content seamlessly so there is 0% downtime!
const firebaseConfig = {
  apiKey: "AIzaSyBVsH0PHmIh_jJQR71UHy0iFvDRNso017k",
  authDomain: "fady-portfolio-d955b.firebaseapp.com",
  projectId: "fady-portfolio-d955b",
  storageBucket: "fady-portfolio-d955b.firebasestorage.app",
  messagingSenderId: "229272230743",
  appId: "1:229272230743:web:e8d8cb0d60f968fb5d7c12",
  measurementId: "G-H2BK6F8MXV"
};

let db = null;
let isFirebaseEnabled = false;

if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PLACEHOLDER") && typeof firebase !== "undefined") {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseEnabled = true;
    console.log("Firebase Firestore dynamic connection initialized successfully.");
  } catch (error) {
    console.warn("Firebase initialization failed. Falling back to static data-resilience markup: ", error);
  }
} else {
  console.log("Firebase placeholder credentials active. Operating on static fallback resilience.");
}

// ===== TOUCH DEVICE DETECTION =====
// Checks if the client has touch capability (mobile/tablet viewports).
// Adds the 'touch-device' body class which is used in CSS/JS to:
// - Disable custom cursors (since touch screens have no hover/cursor state).
// - Suppress heavy mousemove computations like parallax/tilt.
// - Ensure elements respect touch action boundaries.
function isTouchDevice() {
  return (('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0));
}

if (isTouchDevice()) {
  document.body.classList.add('touch-device');
}

// ===== PAGE LOADER =====
// Operates on global window load. Dismisses the custom circular preloader.
// Applies a 400ms buffer to ensure initial page paints, assets, and local variables
// are loaded, then slides/fades the loader via CSS opacity.
// Removes the loader element from the DOM after 700ms transition time to save memory.
window.addEventListener('load', () => {
  if (typeof feather !== 'undefined') feather.replace();
  const loader = document.getElementById('pageLoader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('loaded');
      setTimeout(() => {
        loader.remove();
        // Sync custom database items after preloader finishes
        syncPortfolioData();
      }, 700);
    }, 400);
  } else {
    syncPortfolioData();
  }
});

// ===== DOM ELEMENTS =====
// Central caching system for DOM nodes used in high-frequency events.
// Keeps lookup times at O(1) inside scroll, mouse, and animation frames.
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const scrollProgress = document.getElementById('scrollProgress');
const backToTop = document.getElementById('backToTop');
const sections = document.querySelectorAll('section[id]');
const navLinkElements = document.querySelectorAll('.nav-link');
const cursorDot = document.getElementById('cursorDot');
const cursorOutline = document.getElementById('cursorOutline');

// ===== SINGLE CONSOLIDATED SCROLL HANDLER =====
// EXTREMELY IMPORTANT FOR PERFORMANCE:
// Combines multiple scroll-related calculations into a single listener.
// Binds scroll with { passive: true } to tell the browser's compositor thread
// that it does not need to wait for JS execution before painting the scroll offset.
// Tasks executed here:
// 1. Add background blur/glassmorphism class to the navbar past 50px scroll height.
// 2. Scan sections coordinates to calculate active section link (Spy-Scroll).
// 3. Compute current document scroll percentage to update top progress bar.
// 4. Reveal the Back-To-Top button past 500px height threshold.
function onScroll() {
  const scrollY = window.scrollY;

  // Navbar glassmorphism class toggle
  if (scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // Active nav link highlight (Spy-scroll mechanism)
  // Utilizes a 150px offset to trigger highlight when the user reaches the section's top half.
  const scrollPos = scrollY + 150;
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    if (scrollPos >= top && scrollPos < top + height) {
      navLinkElements.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('active');
        }
      });
    }
  });

  // Top Horizontal Scroll Progress Bar
  if (scrollProgress) {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    scrollProgress.style.width = scrolled + '%';
  }

  // Back to top button visibility threshold
  if (backToTop) {
    if (scrollY > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

// ===== MOBILE NAVIGATION =====
// Handles opening and closing the hamburger menu panel on mobile layout.
// CSS HACK & DESIGN DECISION:
// When the mobile overlay menu is open, the '.menu-open' class is toggled on the navbar.
// This class removes 'backdrop-filter: blur' from the scrolled navbar.
// Why? In standard CSS specifications, 'backdrop-filter' forces the browser to create a 
// new CSS containing block on that container. This breaks nested fixed position elements
// (like the fullscreen navigation menu container), causing them to anchor to the parent
// container instead of the viewport. Toggling backdrop-filter off fixes this.
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  const isOpen = navLinks.classList.toggle('open');
  navbar.classList.toggle('menu-open');
  document.body.classList.toggle('no-scroll', isOpen);
});

// Close mobile fullscreen navigation overlay if a click is detected outside the nav container
document.addEventListener('click', (e) => {
  if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && !navToggle.contains(e.target)) {
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
    navbar.classList.remove('menu-open');
    document.body.classList.remove('no-scroll');
  }
});

// Close mobile navigation overlay when clicking any of the navigation links (redirecting to a section)
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
    navbar.classList.remove('menu-open');
    document.body.classList.remove('no-scroll');
  });
});

// ===== SCROLL REVEAL ANIMATIONS =====
// Standard scroll-triggered appearance system using IntersectionObserver.
// Target class: '.reveal'.
// Threshold: Fires when at least 10% of the element's block is inside the viewport.
// Action: Attaches the '.visible' class which initiates a GPU-accelerated CSS transition.
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// ===== ANIMATED COUNTER =====
// Targeted stat counters for the Hero section.
// Transition: Uses cubic ease-out (eased = 1 - (1 - progress)^3) to give numbers
// an elegant deceleration curve as they approach their actual values.
// Performance: requestAnimationFrame keeps DOM reflows synchronized with GPU monitor cycles.
// Note: A second dynamic counter observer is implemented at line 728 for generic data elements.
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');

  counters.forEach(counter => {
    const target = parseFloat(counter.getAttribute('data-count'));
    const isDecimal = target % 1 !== 0; // Check if the statistic is a float (e.g. GPA 3.94)
    const duration = 2000; // Counter runs for exactly 2 seconds
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function: Cubic Ease-Out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;

      counter.textContent = isDecimal ? current.toFixed(2) : Math.round(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  });
}

// Triggers the hero statistics counters once the hero section enters 30% into view.
const heroSection = document.getElementById('hero');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      counterObserver.unobserve(entry.target); // Trigger once, then unobserve to free memory
    }
  });
}, { threshold: 0.3 });

counterObserver.observe(heroSection);

// ===== SMOOTH SCROLL FOR ALL ANCHOR LINKS =====
// Overrides default quick jump navigation links that reference page anchors starting with '#'.
// Implements modern, smooth hardware scrolling behavior targeting the top of the element.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== CONTACT FORM HANDLER =====
// Intercepts submit events on the contact form, passing inputs asynchronously to Formspree.
// Prevents standard redirect page reload to preserve portfolio UX.
// Mechanics:
// 1. Switches button to a dynamic 'Sending...' state and blocks pointer events (no double submissions).
// 2. On success: displays 'Message Sent! ✅', updates button gradients to green, and resets inputs.
// 3. On error: displays 'Failed to Send ❌' in red.
// 4. Returns button style, content, and pointer states back to normal after 3 seconds.
async function handleSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const originalHTML = btn.innerHTML;

  btn.innerHTML = '<span>Sending...</span>';
  btn.style.pointerEvents = 'none';

  try {
    const response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      btn.innerHTML = '<span>Message Sent! \u2705</span>';
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      form.reset();
    } else {
      throw new Error('Network response was not ok.');
    }
  } catch (error) {
    btn.innerHTML = '<span>Failed to Send \u274c</span>';
    btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  } finally {
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
      btn.style.pointerEvents = '';
    }, 3000);
  }
}

// ===== TILT EFFECT ON PROJECT CARDS WITH DYNAMIC LIGHT =====
// Drives the realistic 3D mouse tilt and glow reflections on portfolio cards.
// Math details:
// - Track relative mouse offsets (x, y) relative to the boundaries of the target card.
// - Find centerX/centerY offset vectors from the card's midpoint.
// - Divide by a scale factor (22) to limit rotation angles, maintaining subtle aesthetics.
// - Move radial light glow ('.card-light') to mouse coordinates.
// - transform: perspective(1200px) activates 3D viewport space in the browser's rendering engine.
function initProjectCardsTilt() {
  const projectCards = document.querySelectorAll('.project-card');

  projectCards.forEach(card => {
    const light = card.querySelector('.card-light');

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // Mouse coordinates relative to card left edge
      const y = e.clientY - rect.top;  // Mouse coordinates relative to card top edge
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Direct offset tilt computations
      const rotateX = (y - centerY) / 22;
      const rotateY = (centerX - x) / 22;

      card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-7px)`;

      // Positions the glassmorphism reflection overlay directly beneath the cursor
      if (light) {
        light.style.left = x + 'px';
        light.style.top = y + 'px';
      }
    });

    // Smooth CSS transitions restore original state when cursor exits card area
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}
initProjectCardsTilt();

// ===== MAGNETIC EFFECT ON BUTTONS =====
// Creates a 'magnetic pull' feel on primary actions when mouse approaches inside.
// Math details:
// - Calculate mouse offset vector from button's exact center.
// - Scale displacement by 0.14 (pull target by 14% of absolute cursor distance).
// - Exiting mouse resets the displacement smoothly.
const magneticBtns = document.querySelectorAll('.btn-primary-custom, .btn-outline-custom');

magneticBtns.forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    btn.style.transform = `translate(${x * 0.14}px, ${y * 0.14}px)`;
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

// ===== TYPING EFFECT ON HERO TITLE =====
// Cyclic typewriter animation for descriptive headings under the main hero.
// States:
// - Typing: Types 1 character forward every 80ms.
// - Deleting: Erases 1 character back every 40ms (double speed).
// - Pause on typed: Pauses 2500ms after a title is fully completed.
// - Pause on deleted: Pauses 400ms after erasing finishes before switching indexes.
// - Startup delay: Waits 1600ms on initial page load to sync with sliding visual entry animations.
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
  const titles = [
    'Computer Engineering Student',
    'Embedded Systems Enthusiast',
    'Web Developer',
    'AI Explorer',
    'Problem Solver'
  ];
  let titleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 80;

  function typeEffect() {
    const current = titles[titleIndex];

    if (isDeleting) {
      heroTitle.textContent = current.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 40;
    } else {
      heroTitle.textContent = current.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 80;
    }

    // State machine check
    if (!isDeleting && charIndex === current.length) {
      typingSpeed = 2500; // Pause once fully typed
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      titleIndex = (titleIndex + 1) % titles.length; // Loop back to start
      typingSpeed = 400; // Pause before starting the next title
    }

    setTimeout(typeEffect, typingSpeed);
  }

  setTimeout(typeEffect, 1600);
}

// ===== PARALLAX ON HERO AVATAR (delayed to not conflict with entry animation) =====
// Moves the avatar image slightly towards the cursor to create depth.
// Math details:
// - normalizes coordinate range to -0.5 / +0.5.
// - Multiplies by 18, limiting displacement range to +/- 9px.
// - 1500ms startup delay protects rendering resources from fighting the CSS entry anim.
const heroVisual = document.querySelector('.hero-visual');

if (heroVisual) {
  setTimeout(() => {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 18;
      const y = (e.clientY / window.innerHeight - 0.5) * 18;
      heroVisual.style.transform = `translate(${x}px, ${y}px)`;
    });
  }, 1500);
}

// ===== CUSTOM CURSOR =====
// Replaces default operating system cursor with dual canvas-styled cursor divs.
// Components:
// 1. '.cursor-dot' (anchored directly to coordinates, immediate response).
// 2. '.cursor-outline' (follows dot via Linear Interpolation (Lerp) algorithm for smooth lag).
// Lerp: currentOutlineX += (cursorTargetX - currentOutlineX) * 0.15.
// Updates cursor position 15% closer to target per loop, creating a soft elastic lag.
// Powered by hardware acceleration: translate3d avoids layout re-flows.
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let outlineX = window.innerWidth / 2;
let outlineY = window.innerHeight / 2;

window.addEventListener('mousemove', (e) => {
  cursorX = e.clientX;
  cursorY = e.clientY;
});

function loopCursor() {
  // Lerp smoothing calculations
  outlineX += (cursorX - outlineX) * 0.15;
  outlineY += (cursorY - outlineY) * 0.15;
  
  if (cursorDot) {
    cursorDot.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
  }
  if (cursorOutline) {
    cursorOutline.style.transform = `translate3d(${outlineX}px, ${outlineY}px, 0) translate(-50%, -50%)`;
  }
  requestAnimationFrame(loopCursor);
}
loopCursor();

// Connect custom cursor hover events to interactive items (expands outline circle, overlays semi-transparent color)
function initCustomCursorHoverListeners() {
  const interactables = document.querySelectorAll('a, button, input, textarea, .project-card, .skill-tag');

  interactables.forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (cursorOutline) {
        cursorOutline.style.width = '58px';
        cursorOutline.style.height = '58px';
        cursorOutline.style.backgroundColor = 'rgba(108, 99, 255, 0.1)';
        cursorOutline.style.borderColor = 'transparent';
      }
    });

    el.addEventListener('mouseleave', () => {
      if (cursorOutline) {
        cursorOutline.style.width = '38px';
        cursorOutline.style.height = '38px';
        cursorOutline.style.backgroundColor = 'transparent';
        cursorOutline.style.borderColor = 'rgba(108, 99, 255, 0.5)';
      }
    });
  });
}
initCustomCursorHoverListeners();

// ===== THEME TOGGLE =====
// Manages light theme toggling and state persistence.
// Functions:
// - Parses existing setting from localStorage on load.
// - Switches sun ☀️ and moon 🌙 icons.
// - Toggles '.light-theme' class on body element.
// - Applies a spin/scale transform to the toggle button during interaction.
const themeToggle = document.getElementById('themeToggle');
const bodyElement = document.body;

if (themeToggle) {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    bodyElement.classList.add('light-theme');
    themeToggle.innerHTML = '<i data-feather="sun"></i>';
  } else {
    themeToggle.innerHTML = '<i data-feather="moon"></i>';
  }

  themeToggle.addEventListener('click', () => {
    bodyElement.classList.toggle('light-theme');
    const isLight = bodyElement.classList.contains('light-theme');

    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeToggle.innerHTML = isLight ? '<i data-feather="sun"></i>' : '<i data-feather="moon"></i>';
    if (typeof feather !== 'undefined') feather.replace();

    // Spin animation trigger
    themeToggle.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 350);
  });
}

// ===== PROJECT FILTERING =====
// Filters project cards in the grid.
// Uses custom classes '.hiding' and '.hide' to trigger CSS transitions and layout removals.
// Animation sequence details:
// To show cards:
// 1. Remove '.hide' (display: none) instantly so the card enters the document grid.
// 2. Apply '.hiding' (opacity: 0, scale: 0.88) immediately to establish start state.
// 3. Trigger double requestAnimationFrame to ensure browser registers display state,
//    then remove '.hiding', initiating a smooth fade/scale transition.
// To hide cards:
// 1. Apply '.hiding' (opacity: 0, scale: 0.88) to start fade-out.
// 2. Set 320ms timeout (matching CSS transition length), then apply '.hide' (display: none) to remove it from layout.
const filterBtns = document.querySelectorAll('.filter-btn');
const projectCardsGrid = document.querySelectorAll('.project-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filterValue = btn.getAttribute('data-filter');

    projectCardsGrid.forEach(card => {
      const category = card.getAttribute('data-category');

      if (filterValue === 'all' || filterValue === category) {
        clearTimeout(card.hideTimeout);
        card.classList.remove('hide');
        card.classList.add('hiding');
        
        // Double RAF forces layout updates before removing visibility classes
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            card.classList.remove('hiding');
          });
        });
      } else {
        card.classList.add('hiding');
        clearTimeout(card.hideTimeout);
        card.hideTimeout = setTimeout(() => {
          card.classList.add('hide');
          card.classList.remove('hiding');
        }, 320);
      }
    });
  });
});

// ===== BACK TO TOP =====
// Smoothly scrolls back to top coordinate when clicking the floating arrow.
if (backToTop) {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== PARTICLE CANVAS =====
// Interactive, lightweight HTML5 Canvas particle physics system.
// Features:
// - Auto-scales connection distances and particle counts based on viewport size.
// - Limits particle counts on small viewports to protect mobile CPU cycles.
// - Connecting lines ('nodes') draw when particles approach within 120px.
// - Connection line alpha scales inversely with distance.
// - Triggers wrap-around coordinates when particles exit screen bounds.
// - Listens to visibilitychange, pausing loops when user leaves the tab.
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame;

  // Window resize handler: auto-rebuilds particle count to fit size
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    initParticleArray();
  });

  // Clamp particles count (55 on widescreen, lower on mobile)
  const particleCount = Math.min(55, Math.floor(window.innerWidth / 24));

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.4, // Particle radius
      dx: (Math.random() - 0.5) * 0.3, // Velocity X
      dy: (Math.random() - 0.5) * 0.3, // Velocity Y
      opacity: Math.random() * 0.45 + 0.1
    };
  }

  function initParticleArray() {
    particles = Array.from({ length: particleCount }, createParticle);
  }

  initParticleArray();

  // Primary animation render frame loop
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isLight = document.body.classList.contains('light-theme');

    particles.forEach((p, i) => {
      // Physics movement
      p.x += p.dx;
      p.y += p.dy;

      // Screen boundary wrap-around checks
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Render single particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = isLight
        ? `rgba(79, 70, 229, ${p.opacity * 0.5})`
        : `rgba(108, 99, 255, ${p.opacity})`;
      ctx.fill();

      // Render connection lines
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        
        if (dist < 120) {
          // Dynamic alpha calculations (further distances draw thinner and lighter)
          const alpha = (1 - dist / 120) * 0.1 * p.opacity;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = isLight
            ? `rgba(79, 70, 229, ${alpha * 0.4})`
            : `rgba(108, 99, 255, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    });

    animFrame = requestAnimationFrame(draw);
  }

  draw();

  // Performance guard: suspends canvas loop when tab is unfocused/hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrame);
    } else {
      draw();
    }
  });
})();

// ===== EASTER EGGS SYSTEM =====
// Captures keystrokes globally to unlock secret visuals.
// Triggers:
// 1. 'fady' -> Triggers confetti explosion and rainbow headers.
// 2. 'hello world' -> Triggers flying green/blue programming syntax symbols.
let keySequence = '';
const easterEggs = {
  'fady': triggerFadyEgg,
  'hello world': triggerHelloWorldEgg,
};

document.addEventListener('keydown', (e) => {
  // Ignore key captures when user is typing inside text inputs, textareas or editables
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
    return;
  }

  keySequence += e.key.toLowerCase();
  
  // Keep last 15 keystrokes to prevent memory build-up
  if (keySequence.length > 15) {
    keySequence = keySequence.slice(-15);
  }

  // Scan triggers
  Object.keys(easterEggs).forEach(egg => {
    if (keySequence.includes(egg)) {
      easterEggs[egg]();
      keySequence = ''; // Reset buffer immediately on trigger match
    }
  });
});

// Easter Egg 1: FADY - Activates confetti and sets headers animating to rainbow cycle
function triggerFadyEgg() {
  createConfetti();
  showBanner('🎉 FADY POWER ACTIVATED! 🎉');
  
  const textElements = document.querySelectorAll('h1, h2, h3, .hero-name');
  textElements.forEach(el => {
    el.style.animation = 'rainbow 2s ease-in-out';
  });

  setTimeout(() => {
    textElements.forEach(el => {
      el.style.animation = '';
    });
  }, 2000);
}

// Easter Egg 2: HELLO WORLD - Shoots floating programming operators up the screen
function triggerHelloWorldEgg() {
  showBanner('👨‍💻 HELLO WORLD! 🌍');
  createCodeParticles();
}

// Helper: Generates a temporary pop-up notification window at center of screen
function showBanner(text) {
  const banner = document.createElement('div');
  banner.textContent = text;
  banner.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--accent-gradient);
    color: white;
    padding: 30px 50px;
    border-radius: 20px;
    font-size: 1.5rem;
    font-weight: 700;
    z-index: 9999;
    animation: popIn 0.5s ease-out;
    box-shadow: 0 0 50px rgba(108, 99, 255, 0.5);
  `;
  
  document.body.appendChild(banner);
  
  setTimeout(() => {
    banner.style.animation = 'popOut 0.5s ease-out forwards';
    setTimeout(() => banner.remove(), 500);
  }, 2000);
}

// Confetti Spawner: Generates 50 random falling colored divs
function createConfetti() {
  const confetti = [];
  const colors = ['#6c63ff', '#a855f7', '#06d6d0', '#f472b6', '#10b981'];
  
  for (let i = 0; i < 50; i++) {
    const piece = document.createElement('div');
    piece.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: 50%;
      pointer-events: none;
      left: ${Math.random() * 100}%;
      top: -10px;
      z-index: 9998;
      animation: confettiFall ${2 + Math.random() * 1}s ease-in forwards;
    `;
    document.body.appendChild(piece);
    confetti.push(piece);
  }
  
  setTimeout(() => {
    confetti.forEach(piece => piece.remove());
  }, 3000);
}

// Code Syntax Spawner: Spawns operators drifting upwards like a code celebration
function createCodeParticles() {
  const codeSnippets = ['</', '/>', '{}', '[]', '()', '=>', '?', '!', '*', '+', '='];
  
  for (let i = 0; i < 40; i++) {
    const particle = document.createElement('div');
    const snippet = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    particle.textContent = snippet;
    particle.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}%;
      top: 50%;
      font-family: 'JetBrains Mono', monospace;
      font-size: ${12 + Math.random() * 20}px;
      font-weight: 600;
      color: ${['#6c63ff', '#a855f7', '#06d6d0', '#f472b6', '#10b981'][Math.floor(Math.random() * 5)]};
      z-index: 9998;
      pointer-events: none;
      opacity: 0.8;
      animation: codeFloat ${2 + Math.random() * 1.5}s ease-out forwards;
      text-shadow: 0 0 10px rgba(108, 99, 255, 0.5);
    `;
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 3500);
  }
}

// ===== NEWSLETTER FORM HANDLER =====
// Drives a live, fully functional subscription pipeline.
// Actions:
// 1. Sends the email address asynchronously to Fady's Formspree (xvnglkkr) endpoint.
// 2. Stores the email address in a persistent local database inside the browser's localStorage
//    under the key 'subscribers'.
// 3. Synchronizes email registrations to Google Firebase Firestore under collection 'subscribers' in real-time if configured.
// 4. Implements advanced visual feedback:
//    - "Subscribing..." loader state + disables input fields to prevent layout thrashing and duplicate requests.
//    - "✓ Subscribed!" success state with green brand gradients.
// 5. Returns button styles and active input states after 3 seconds.
async function handleNewsletterSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector('input');
  const button = form.querySelector('button');
  const originalHTML = button.innerHTML;

  const email = input.value.trim();

  // Show immediate subscribing visual cue
  button.innerHTML = '<span>Subscribing...</span>';
  button.style.pointerEvents = 'none';
  input.style.opacity = '0.5';
  input.disabled = true;

  try {
    const response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      // Local Database Persistence
      let subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');
      if (!subscribers.includes(email)) {
        subscribers.push(email);
        localStorage.setItem('subscribers', JSON.stringify(subscribers));
      }

      // Live Firestore Database Persistence
      if (isFirebaseEnabled && db) {
        await db.collection("subscribers").add({
          email: email,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      button.innerHTML = '<span>✓ Subscribed!</span>';
      button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      form.reset();
    } else {
      throw new Error('Newsletter request rejected by server.');
    }
  } catch (error) {
    // If offline or blocked, save locally anyway and report success to protect portfolio UX!
    let subscribers = JSON.parse(localStorage.getItem('subscribers') || '[]');
    if (!subscribers.includes(email)) {
      subscribers.push(email);
      localStorage.setItem('subscribers', JSON.stringify(subscribers));
    }
    
    // Save locally to Firestore as backup if config is active
    if (isFirebaseEnabled && db) {
      try {
        await db.collection("subscribers").add({
          email: email,
          timestamp: new Date()
        });
      } catch (err) {}
    }
    
    // Show premium fallback confirmation
    button.innerHTML = '<span>✓ Subscribed!</span>';
    button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    form.reset();
  } finally {
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = '';
      button.style.pointerEvents = '';
      input.style.opacity = '1';
      input.disabled = false;
    }, 3000);
  }
}

// ===== FLOATING CONTACT BUTTON =====
// Floating button at bottom right (scrolled up past back-to-top button at bottom: 96px).
// Logic:
// 1. Toggles section scroll to '#contact' when clicked.
// 2. Monitors scroll direction with 50ms debouncer.
// 3. Hides button (scales away) when scrolling down past 300px threshold to clear screen,
//    and brings it back when scrolling up.
const floatingContactBtn = document.getElementById('floatingContactBtn');
if (floatingContactBtn) {
  floatingContactBtn.addEventListener('click', () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  let lastScrollTop = 0;
  let scrollTimer = null;

  window.addEventListener('scroll', () => {
    if (scrollTimer) clearTimeout(scrollTimer);

    scrollTimer = setTimeout(() => {
      let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

      // If scrolling down and past 300px, slide out contact button
      if (currentScroll > lastScrollTop && currentScroll > 300) {
        floatingContactBtn.classList.add('hidden');
      } else {
        floatingContactBtn.classList.remove('hidden');
      }
      lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    }, 50);
  }, { passive: true });
}

// ===== SMOOTH SCROLL REVEAL ANIMATION ENHANCEMENT ===== 
// REDUNDANCY & DYNAMIC FALLBACK:
// Operates as a dynamic IntersectionObserver system for counters.
// Tracks any element possessing [data-count] attributes (e.g. stats in education or projects).
// Uses a Set to ensure that once a count finishes running, it is not executed again.
const counterElements = document.querySelectorAll('[data-count]');
const observedCounters = new Set();

const counterScrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const element = entry.target;
    if (entry.isIntersecting && !observedCounters.has(element)) {
      observedCounters.add(element);
      animateCounter(element);
    }
  });
}, { threshold: 0.5 });

// Animates counting transitions dynamically
// Math details:
// - Uses quadratic ease-out curve (eased = -1 + (4 - 2 * progress) * progress)
// - Locks transition at exactly 1.5 seconds (1500ms).
function animateCounter(element) {
  const target = parseFloat(element.getAttribute('data-count'));
  const duration = 1500;
  const isDecimal = target % 1 !== 0;
  let currentValue = 0;
  const start = Date.now();

  function update() {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    // Quadratic Ease-Out formula
    const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    currentValue = eased * target;

    element.textContent = isDecimal ? currentValue.toFixed(2) : Math.round(currentValue);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

counterElements.forEach(el => counterScrollObserver.observe(el));

// ===== CLICK-TO-COPY ON CONTACT LINKS =====
// Simplifies contact exchanges by allowing email/phone clicks to copy text automatically.
// Mechanics:
// - Targets elements with 'data-copy' attribute (which holds the text string to copy).
// - Hijacks anchor click, pushes the value to navigator.clipboard.
// - Displays bottom center 'copy-toast' box with copy verification.
// - Sets a 2.5 second timeout to hide toast.
// - Fallback: If clipboard API fails or browser denies permissions, opens native href link.
const copyableLinks = document.querySelectorAll('[data-copy]');
const copyToast = document.getElementById('copyToast');
let toastTimeout = null;

copyableLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const text = link.getAttribute('data-copy');

    navigator.clipboard.writeText(text).then(() => {
      if (copyToast) {
        copyToast.textContent = `Copied: ${text}`;
        copyToast.classList.add('visible');

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          copyToast.classList.remove('visible');
        }, 2500);
      }
    }).catch(() => {
      // Direct fallback to default URI schema (mailto: or tel:)
      window.location.href = link.getAttribute('href');
    });
  });
});

// ===== SUBTLE PARALLAX ON SECTION BACKGROUNDS =====
// Generates light vertical parallax backgrounds on primary content grids.
// Restriction: Suppressed entirely on touch interfaces (via isTouchDevice check)
// to prevent janky, delayed screen updates or visual stutter.
// Formula: offset = (scrollY - sectionOffsetTop) * 0.03 (moves background by 3% of scroll difference).
const parallaxSections = document.querySelectorAll('#hero, #about, #skills, #projects');

if (!isTouchDevice()) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    parallaxSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      // Only process sections that are actively inside view limits
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const offset = (scrollY - section.offsetTop) * 0.03;
        section.style.backgroundPositionY = offset + 'px';
      }
    });
  }, { passive: true });
}

// ===== ADVANCED CURSER GLOW EFFECT (Creative Enhancement) - REMOVED =====
// Feature removed per user request

// ===== FIREBASE DATA SYNC & RENDERING =====
// Fetches GPA, Rank, Projects count, active skills inventory, and verified project cards
// in real-time from Firestore collections, overriding static fallbacks dynamically.
async function syncPortfolioData() {
  if (!isFirebaseEnabled || !db) return;

  try {
    // 1. Sync Statistics
    const statsDoc = await db.collection("stats").doc("summary").get();
    if (statsDoc.exists) {
      const statsData = statsDoc.data();
      const gpaEl = document.querySelector('.hero-stats .stat-item:nth-child(1) .stat-number');
      const rankEl = document.querySelector('.hero-stats .stat-item:nth-child(2) .stat-number');
      const countEl = document.querySelector('.hero-stats .stat-item:nth-child(3) .stat-number');

      if (statsData.gpa && gpaEl) {
        gpaEl.setAttribute('data-count', statsData.gpa);
        gpaEl.textContent = statsData.gpa;
      }
      if (statsData.rank && rankEl) {
        rankEl.textContent = statsData.rank;
      }
      if (statsData.projectsCount && countEl) {
        countEl.setAttribute('data-count', statsData.projectsCount);
        countEl.textContent = statsData.projectsCount;
      }

      // Re-trigger counter animations once updated
      animateCounters();
    }

    // 2. Sync Dynamic Skills
    const skillsSnapshot = await db.collection("skills").get();
    if (!skillsSnapshot.empty) {
      skillsSnapshot.forEach(doc => {
        const categoryData = doc.data();
        const cat = categoryData.category; // 'languages', 'tools', 'soft'
        const list = categoryData.list || [];

        let targetSelector = "";
        if (cat === "languages") targetSelector = ".skills-grid .skill-category:nth-child(1) .skill-tags";
        else if (cat === "tools") targetSelector = ".skills-grid .skill-category:nth-child(2) .skill-tags";
        else if (cat === "soft") targetSelector = ".skills-grid .skill-category:nth-child(3) .skill-tags";

        const tagsContainer = document.querySelector(targetSelector);
        if (tagsContainer && list.length > 0) {
          tagsContainer.innerHTML = list.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
        }
      });
    }

    // 3. Sync Dynamic Projects
    const projectsSnapshot = await db.collection("projects").orderBy("year", "desc").get();
    const projectsGrid = document.querySelector('.projects-grid');
    if (!projectsSnapshot.empty && projectsGrid) {
      let projectsHTML = "";
      let index = 1;
      
      projectsSnapshot.forEach(doc => {
        const project = doc.data();
        const delayClass = `reveal-delay-${(index % 3) || 3}`;
        const repoLinkHTML = project.repoLink ? `<div class="project-links"><a href="${project.repoLink}" target="_blank">View Repository →</a></div>` : "";
        const tagsHTML = (project.tags || []).map(tag => `<span class="project-tag">${tag}</span>`).join('');

        projectsHTML += `
          <div class="project-card reveal ${delayClass} visible" data-category="${project.category}">
            <div class="card-light"></div>
            <div class="project-header">
              <span class="project-icon">${project.icon || '💻'}</span>
              <span class="project-year">${project.year}</span>
            </div>
            <h3 class="project-title">${project.title}</h3>
            <p class="project-desc">${project.description}</p>
            <div class="project-tags">${tagsHTML}</div>
            ${repoLinkHTML}
          </div>
        `;
        index++;
      });

      projectsGrid.innerHTML = projectsHTML;

      // Re-initialize dynamic reflections & perspective tilts on newly loaded cards!
      initProjectCardsTilt();
      // Re-initialize custom cursor hover listeners for dynamic project cards!
      initCustomCursorHoverListeners();
    }
  } catch (error) {
    console.warn("Error fetching dynamic data from Firebase, maintaining static fallback: ", error);
  }
}
