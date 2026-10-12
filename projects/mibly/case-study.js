(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const menu = $('.menu-button');
  const links = $('#project-links');
  const closeMenu = () => {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open project navigation');
    links.classList.remove('open');
  };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close project navigation' : 'Open project navigation');
    links.classList.toggle('open', open);
  });
  links.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.floating-nav')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && links.classList.contains('open')) { closeMenu(); menu.focus(); } });

  const previews = {
    map: ['images/map.png', 'Friends’ meal photos and avatars on Mibly’s illustrated map', 'See who ate what, where, and when—without opening every post.'],
    feed: ['images/feed.png', 'Mibly’s photo-led meal feed with date filters', 'A familiar feed for more meals, more context, and a longer catch-up.'],
    memories: ['images/memories.png', 'Your personal meal-photo memories in Mibly', 'Your own meals become a private diary, one ordinary day at a time.'],
  };
  $$('[data-preview]').forEach(button => button.addEventListener('click', () => {
    const [src, alt, caption] = previews[button.dataset.preview];
    $('#hero-screen').src = src;
    $('#hero-screen').alt = alt;
    $('#hero-caption').textContent = caption;
    $$('[data-preview]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  $$('[data-iteration]').forEach(button => button.addEventListener('click', () => {
    $$('[data-iteration]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $$('.iteration-panel').forEach(panel => { panel.hidden = panel.id !== `iteration-${button.dataset.iteration}`; });
  }));

  // Feature labels are driven by the embedded app, never by an assumed click result.
  const featureDescriptions = {
    map: 'Zoom into today’s shared meals. Tap a photo to open its story.',
    feed: 'Browse more meals, filter by date, and open a post to react or reply.',
    people: 'Find friends, manage requests, and explore opted-in restaurant posts.',
    restaurant: 'Copy an address, share a venue, or open Google Maps.',
    capture: 'Record your meal, then choose its place and audience.',
    chat: 'Continue a conversation around a friend’s meal.',
    memories: 'Revisit your own meals as moments, a calendar, or a recap.',
    profile: 'Your meals, friends, saved places, and settings in one place.',
  };
  const shell = $('#demo-shell');
  const placeholder = $('#demo-placeholder');
  let frame = null;
  let session = null;
  let ready = false;
  let pending = null;
  let warning;
  const setStatus = text => { $('[data-current-screen]').textContent = text; };
  const send = scene => frame?.contentWindow?.postMessage({ type: 'mibly-demo', scene }, location.origin);
  function selectFeature(feature, screen) {
    $$('.feature-nav [data-feature]').forEach(button => {
      const active = button.dataset.feature === feature;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('active', active);
    });
    setStatus(screen);
    $('[data-feature-description]').textContent = featureDescriptions[feature] || 'Start with the map, or pick any feature above.';
    $$('[data-examples-for]').forEach(group => { group.hidden = group.dataset.examplesFor !== feature; });
  }
  function launch(scene = 'map') {
    if (frame) {
      if (ready) send(scene);
      else pending = scene;
      return;
    }
    session = crypto.randomUUID();
    ready = false;
    pending = scene;
    setStatus('Loading interactive demo…');
    frame = document.createElement('iframe');
    frame.title = 'Interactive Mibly phone prototype';
    frame.allow = 'clipboard-write; fullscreen';
    const url = new URL('demo/', location.href);
    url.searchParams.set('presentation', '1');
    url.searchParams.set('scene', scene);
    url.searchParams.set('presentationSession', session);
    frame.src = url.href;
    frame.addEventListener('load', () => frame?.contentWindow?.postMessage({ type: 'mibly-demo-state-request' }, location.origin));
    shell.replaceChildren(frame);
    $('#close-demo').hidden = false;
    $('#reload-demo').hidden = false;
    warning = setTimeout(() => {
      if (!ready) {
        setStatus('Still loading. Try Reload or Open separately.');
        $('[data-feature-description]').textContent = 'The case study and saved screen previews are still available.';
      }
    }, 15000);
  }
  function closeDemo() {
    clearTimeout(warning);
    frame = null; session = null; ready = false; pending = null;
    shell.replaceChildren(placeholder);
    $('#close-demo').hidden = true;
    $('#reload-demo').hidden = true;
    selectFeature(null, 'Ready when you are.');
  }
  window.addEventListener('message', event => {
    const data = event.data;
    if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow || data?.type !== 'mibly-demo-state' || data.version !== 1 || data.session !== session) return;
    if (!Object.hasOwn(featureDescriptions, data.feature) || typeof data.screen !== 'string' || data.screen.length > 80) return;
    ready = true;
    clearTimeout(warning);
    if (pending) { const scene = pending; pending = null; send(scene); return; }
    selectFeature(data.feature, data.screen);
  });
  $('#load-demo').addEventListener('click', () => launch());
  $('#close-demo').addEventListener('click', () => { closeDemo(); $('#load-demo').focus(); });
  $('#reload-demo').addEventListener('click', () => { closeDemo(); launch(); });
  $$('.feature-nav [data-feature]').forEach(button => button.addEventListener('click', () => launch(button.dataset.feature)));
  $$('[data-scene]').forEach(button => button.addEventListener('click', () => launch(button.dataset.scene)));
  $$('[data-jump-demo]').forEach(link => link.addEventListener('click', () => launch(link.dataset.jumpDemo)));

  // The chapter indicator follows scrolling without rewriting browser history.
  let ticking = false;
  function updateChapter() {
    const candidates = [...links.querySelectorAll('a[href^="#"]')];
    let current = null;
    for (const link of candidates) if ($(link.hash)?.getBoundingClientRect().top <= 180) current = link;
    candidates.forEach(link => { if (link === current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateChapter); } }, { passive: true });
  updateChapter();
})();
