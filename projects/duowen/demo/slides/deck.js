// Timer and navigation adapted from the Mibly recording decks.
(() => {
  const config = window.DUOWEN_DECKS[document.body.dataset.deck];
  const root = document.getElementById('presentation');
  root.innerHTML = `
    <header class="deck-header"><div class="deck-identity"><a class="wordmark" href="../../" aria-label="Back to the Duowen case study">Duowen</a><span class="deck-label">${config.label}</span></div><div class="tools"><div class="timer-cluster"><output class="timer" aria-label="Elapsed presentation time">00:00</output><span class="timer-status">${config.target}</span><button class="tool" data-clock aria-label="Start timer">Start</button><button class="tool" data-reset aria-label="Reset presentation">Reset</button></div><span class="timer-rule"></span><button class="tool" data-notes aria-haspopup="dialog">Notes</button><button class="tool fullscreen-button" data-fullscreen>Full screen</button></div></header>
    <main class="deck-main" aria-label="${config.label} slides">${config.slides.map((slide, index) => `<section class="slide ${slide.className || ''}" id="slide-${index + 1}" tabindex="-1" aria-label="Slide ${index + 1}: ${slide.title}" ${index ? 'hidden inert' : ''}>${slide.html}</section>`).join('')}</main>
    <footer class="deck-footer"><span class="section-label"></span><span class="shortcut-hint">← → slides &nbsp; · &nbsp; F full screen &nbsp; · &nbsp; N notes</span><div class="nav-controls"><button class="nav-button" data-prev aria-label="Previous slide">←</button><span class="slide-counter" aria-live="polite"></span><button class="nav-button" data-next aria-label="Next slide">→</button><button class="tool" data-finish hidden>Finish</button></div></footer>
    <div class="progress" aria-hidden="true"></div>
    <dialog class="notes-dialog" aria-labelledby="notes-title"><div class="notes-top"><h2 id="notes-title">Speaker notes</h2><button class="notes-close" aria-label="Close notes">×</button></div><div class="notes-body"></div></dialog><div class="toast" role="status" hidden></div>`;

  const $ = selector => root.querySelector(selector);
  const slides = [...root.querySelectorAll('.slide')];
  const notes = $('.notes-dialog');
  let index = 0, elapsed = 0, startedAt = null, hasStarted = false, toastTimeout;
  const seconds = () => (elapsed + (startedAt === null ? 0 : performance.now() - startedAt)) / 1000;
  function updateClock() {
    const time = Math.floor(seconds());
    $('.timer').textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
    const status = $('.timer-status');
    status.textContent = time > config.max ? 'Over target' : time >= config.min ? 'In range' : config.target;
    status.className = `timer-status ${time > config.max ? 'over' : time >= config.min ? 'in-range' : ''}`;
    $('[data-clock]').textContent = startedAt !== null ? 'Pause' : hasStarted ? 'Resume' : 'Start';
    $('[data-clock]').setAttribute('aria-label', startedAt !== null ? 'Pause timer' : hasStarted ? 'Resume timer' : 'Start timer');
  }
  function start() {
    if (startedAt !== null) return;
    startedAt = performance.now(); hasStarted = true;
    document.body.classList.add('started');
    root.querySelectorAll('[data-start]').forEach(button => { button.innerHTML = 'Continue <span aria-hidden="true">→</span>'; });
    root.querySelectorAll('.start-hint').forEach(hint => { hint.textContent = 'Timer running. Press → or Continue when ready.'; });
    $('[data-finish]').textContent = 'Finish';
    updateClock();
  }
  function pause() {
    if (startedAt !== null) elapsed += performance.now() - startedAt;
    startedAt = null; updateClock();
  }
  function toast(message) {
    $('.toast').textContent = message; $('.toast').hidden = false;
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { $('.toast').hidden = true; }, 3000);
  }
  function render() {
    slides.forEach((slide, position) => { slide.hidden = position !== index; slide.inert = position !== index; });
    document.body.classList.toggle('dark', config.slides[index].theme === 'dark');
    $('.section-label').textContent = config.slides[index].section;
    $('.slide-counter').textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    $('[data-prev]').disabled = index === 0;
    $('[data-next]').hidden = index === slides.length - 1;
    $('[data-finish]').hidden = index !== slides.length - 1;
    $('.progress').style.width = `${((index + 1) / slides.length) * 100}%`;
    const cue = config.slides.slice(0, index).reduce((sum, slide) => sum + slide.seconds, 0);
    const format = time => `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
    $('#notes-title').textContent = `${index + 1}. ${config.slides[index].title}`;
    $('.notes-body').innerHTML = `<p class="small">Suggested timing ${format(cue)}–${format(cue + config.slides[index].seconds)} · ${config.slides[index].seconds} seconds</p>${config.slides[index].notes}`;
    $('.deck-main').scrollTop = 0;
    document.title = `Duowen | ${config.label} | ${index + 1}/${slides.length}`;
    history.replaceState(null, '', `#${index + 1}`);
  }
  function go(next) {
    if (next < 0 || next >= slides.length || next === index) return;
    if (!hasStarted) start();
    index = next; render(); slides[index].focus({ preventScroll: true });
  }
  function reset() {
    elapsed = 0; startedAt = null; hasStarted = false; index = 0;
    clearTimeout(toastTimeout); $('.toast').hidden = true;
    document.body.classList.remove('started');
    root.querySelectorAll('[data-start]').forEach(button => { button.innerHTML = 'Start presentation <span aria-hidden="true">↗</span>'; });
    root.querySelectorAll('.start-hint').forEach(hint => { hint.textContent = 'Click this cover to start the timer. Advance when ready.'; });
    if (notes.open) notes.close();
    $('[data-finish]').textContent = 'Finish';
    updateClock(); render(); slides[0].focus({ preventScroll: true });
  }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { toast('Full screen is unavailable. You can still present in this window.'); }
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.matches('[data-start]')) { if (!hasStarted) start(); else go(1); return; }
    if (button?.matches('[data-next]')) go(index + 1);
    else if (button?.matches('[data-prev]')) go(index - 1);
    else if (button?.matches('[data-clock]')) startedAt === null ? start() : pause();
    else if (button?.matches('[data-reset]')) reset();
    else if (button?.matches('[data-finish]')) {
      if (!hasStarted) start(); pause();
      button.textContent = 'Finished ✓'; toast(`Finished at ${$('.timer').textContent} · target ${config.target}`);
    }
    else if (button?.matches('[data-notes]')) notes.showModal();
    else if (button?.matches('.notes-close')) notes.close();
    else if (button?.matches('[data-fullscreen]')) fullscreen();
    else if (index === 0 && event.target.closest('.slide') && !event.target.closest('a,button') && !hasStarted) start();
  });
  document.addEventListener('keydown', event => {
    if (notes.open || event.target.closest('input,textarea,select,[contenteditable=true]') || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.target.closest('button,a') && ['Enter', ' '].includes(event.key)) return;
    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); if (index === 0 && !hasStarted) start(); else go(index + 1); }
    else if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); go(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); go(0); }
    else if (event.key === 'Enter' && !hasStarted) start();
    else if (event.key.toLowerCase() === 'f') fullscreen();
    else if (event.key.toLowerCase() === 'n') notes.showModal();
  });
  document.addEventListener('fullscreenchange', () => { $('[data-fullscreen]').textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
  // Reloading always re-arms the timer. A hash can choose a slide, never start time.
  const requested = Number(location.hash.slice(1));
  if (Number.isInteger(requested) && requested >= 1 && requested <= slides.length) index = requested - 1;
  setInterval(updateClock, 200);
  render(); updateClock();
})();
