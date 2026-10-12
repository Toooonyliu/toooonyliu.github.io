(() => {
  const menu = document.querySelector('.menu-button');
  const links = document.querySelector('#project-links');
  if (!menu || !links) return;

  const closeMenu = () => {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open process navigation');
    links.classList.remove('open');
  };

  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close process navigation' : 'Open process navigation');
    links.classList.toggle('open', open);
  });
  links.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.floating-nav')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && links.classList.contains('open')) {
      closeMenu();
      menu.focus();
    }
  });

  let ticking = false;
  const updateChapter = () => {
    const candidates = [...links.querySelectorAll('a[href^="#"]')];
    let current = null;
    for (const link of candidates) {
      const target = document.querySelector(link.hash);
      if (target && target.getBoundingClientRect().top <= 180) current = link;
    }
    candidates.forEach(link => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateChapter);
    }
  }, { passive: true });
  updateChapter();
})();
