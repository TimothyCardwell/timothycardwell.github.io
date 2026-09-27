(() => {
  if (!('IntersectionObserver' in window)) return;

  // Reveal on scroll. The html.js class is what hides .reveal, so it is only added when we can un-hide.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const reveal = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          reveal.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    document.documentElement.classList.add('js');
    document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el));
  }

  // Mark the nav link for the section currently in view.
  const links = new Map(
    [...document.querySelectorAll('.nav-list a[href^="#"]')].map((a) => [a.hash.slice(1), a])
  );
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => link.removeAttribute('aria-current'));
      links.get(entry.target.id).setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });
})();
