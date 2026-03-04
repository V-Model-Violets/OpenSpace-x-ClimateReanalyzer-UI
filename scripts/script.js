// Main navigation JavaScript for Climate Reanalyzer

/**
 * Navigates to the specified page URL with a brief opacity fade transition
 * to soften the visual jump between pages.
 *
 * @param {string} page - Relative URL of the target page.
 */
function navigateTo(page) {
  // Add a smooth transition effect
  document.body.style.opacity = "0.8";
  setTimeout(() => {
    window.location.href = page;
  }, 150);
}

// Add enhanced interactive effects
document.addEventListener("DOMContentLoaded", function () {
  // Create floating particles
  createFloatingParticles();

  // Add enhanced button interactions
  const buttons = document.querySelectorAll(".nav-button");

  buttons.forEach((button) => {
    // Add ripple effect on click
    button.addEventListener("click", function (e) {
      const ripple = document.createElement("div");
      ripple.classList.add("ripple");

      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";

      button.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Add parallax scrolling effect to background layers
  window.addEventListener("scroll", () => {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll(
      ".background-overlay, .stars",
    );

    parallaxElements.forEach((element) => {
      const speed = 0.5;
      element.style.transform = `translateY(${scrolled * speed}px)`;
    });
  });

  // Trigger a fade-in animation whenever a key element scrolls into the viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = "fadeInUp 0.8s ease forwards";
      }
    });
  });

  document
    .querySelectorAll(".nav-button, .hero-content, .logo-container")
    .forEach((el) => {
      observer.observe(el);
    });
});

/**
 * Spawns a set of small translucent circular particles into the #app container.
 * Each particle is positioned at a random horizontal offset and animated to
 * drift upward perpetually, creating a subtle aurora-like background effect.
 * Particles are non-interactive (pointer-events: none) and sit behind content (z-index: -1).
 */
function createFloatingParticles() {
  const container = document.getElementById("app");
  const particleCount = 20; // Number of particles to generate

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "floating-particle";
    particle.style.cssText = `
      position: absolute;
      width: ${Math.random() * 4 + 2}px;        /* 2–6 px wide */
      height: ${Math.random() * 4 + 2}px;       /* 2–6 px tall */
      background: rgba(121, 189, 232, ${Math.random() * 0.4 + 0.1}); /* 10–50% opacity */
      border-radius: 50%;
      left: ${Math.random() * 100}%;             /* random horizontal start */
      animation: float-particle ${Math.random() * 10 + 10}s linear infinite; /* 10–20 s cycle */
      pointer-events: none;
      z-index: -1;
    `;
    container.appendChild(particle);
  }
}

// Inject animation keyframes and component styles programmatically so they
// are co-located with the JavaScript that depends on them (ripple effect,
// particle float, and fade-in transitions).
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes float-particle {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(-100px) rotate(360deg);
      opacity: 0;
    }
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    pointer-events: none;
    animation: ripple-animation 0.6s ease-out;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
