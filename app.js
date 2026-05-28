// ===== DOM ELEMENTS =====
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
function onScroll() {
  const scrollY = window.scrollY;

  // Navbar scroll effect
  if (scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // Active nav link highlight
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

  // Scroll progress bar
  if (scrollProgress) {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    scrollProgress.style.width = scrolled + '%';
  }

  // Back to top button
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
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navLinks.classList.remove('open');
  });
});

// ===== SCROLL REVEAL ANIMATIONS =====
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
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');

  counters.forEach(counter => {
    const target = parseFloat(counter.getAttribute('data-count'));
    const isDecimal = target % 1 !== 0;
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

const heroSection = document.getElementById('hero');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounters();
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

counterObserver.observe(heroSection);

// ===== SMOOTH SCROLL FOR ALL ANCHOR LINKS =====
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
function handleSubmit(e) {
  e.preventDefault();

  const btn = e.target.querySelector('button[type="submit"]');
  const originalHTML = btn.innerHTML;

  btn.innerHTML = '<span>Sending...</span>';
  btn.style.pointerEvents = 'none';

  setTimeout(() => {
    btn.innerHTML = '<span>Message Sent! \u2705</span>';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

    e.target.reset();

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
      btn.style.pointerEvents = '';
    }, 3000);
  }, 1500);
}

// ===== TILT EFFECT ON PROJECT CARDS =====
const projectCards = document.querySelectorAll('.project-card');

projectCards.forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 22;
    const rotateY = (centerX - x) / 22;

    card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-7px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ===== MAGNETIC EFFECT ON BUTTONS =====
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

    if (!isDeleting && charIndex === current.length) {
      typingSpeed = 2500;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      titleIndex = (titleIndex + 1) % titles.length;
      typingSpeed = 400;
    }

    setTimeout(typeEffect, typingSpeed);
  }

  setTimeout(typeEffect, 1600);
}

// ===== PARALLAX ON HERO AVATAR (delayed to not conflict with entry animation) =====
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
window.addEventListener('mousemove', (e) => {
  const posX = e.clientX;
  const posY = e.clientY;

  if (cursorDot) {
    cursorDot.style.left = `${posX}px`;
    cursorDot.style.top = `${posY}px`;
  }

  if (cursorOutline) {
    cursorOutline.animate({
      left: `${posX}px`,
      top: `${posY}px`
    }, { duration: 500, fill: 'forwards' });
  }
});

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

// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('themeToggle');
const bodyElement = document.body;

if (themeToggle) {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    bodyElement.classList.add('light-theme');
    themeToggle.textContent = '\u2600\uFE0F'; // ☀️
  } else {
    themeToggle.textContent = '\uD83C\uDF19'; // 🌙
  }

  themeToggle.addEventListener('click', () => {
    bodyElement.classList.toggle('light-theme');
    const isLight = bodyElement.classList.contains('light-theme');

    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeToggle.textContent = isLight ? '\u2600\uFE0F' : '\uD83C\uDF19';

    themeToggle.style.transform = 'rotate(360deg) scale(1.2)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 350);
  });
}

// ===== PROJECT FILTERING =====
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
        // 1. Remove display:none first so the card enters the layout
        card.classList.remove('hide');
        // 2. Add hiding (opacity:0 scale:0.88) immediately so there's a start state
        card.classList.add('hiding');
        // 3. On next two frames, remove hiding to trigger the CSS transition in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            card.classList.remove('hiding');
          });
        });
      } else {
        // 1. Start fade-out animation
        card.classList.add('hiding');
        // 2. After transition ends, remove from layout
        setTimeout(() => {
          card.classList.add('hide');
          card.classList.remove('hiding');
        }, 320);
      }
    });
  });
});

// ===== BACK TO TOP =====
if (backToTop) {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== PARTICLE CANVAS =====
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', () => {
    resize();
    initParticleArray();
  });

  const particleCount = Math.min(55, Math.floor(window.innerWidth / 24));

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.4,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.45 + 0.1
    };
  }

  function initParticleArray() {
    particles = Array.from({ length: particleCount }, createParticle);
  }

  initParticleArray();

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isDark = !document.body.classList.contains('light-theme');

    particles.forEach((p, i) => {
      // Move
      p.x += p.dx;
      p.y += p.dy;

      // Wrap
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(108, 99, 255, ${p.opacity})`
        : `rgba(79, 70, 229, ${p.opacity * 0.5})`;
      ctx.fill();

      // Draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.1 * p.opacity;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = isDark
            ? `rgba(108, 99, 255, ${alpha})`
            : `rgba(79, 70, 229, ${alpha * 0.4})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    });

    animFrame = requestAnimationFrame(draw);
  }

  draw();

  // Pause when tab is hidden for performance
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrame);
    } else {
      draw();
    }
  });
})();
