(() => {
  const app = 'https://duowen-sandbox-trial.vercel.app/';
  const link = (url, label) => '<a class="slide-link" href="' + url + '" target="_blank" rel="noopener">' + label + ' ↗</a>';
  const shot = (file, description) => '<figure class="deck-image"><img src="../../images/' + file + '" alt="' + description + '"><figcaption>Synthetic playtest data</figcaption></figure>';
  const bullets = items => '<ul class="points">' + items.map(item => '<li>' + item + '</li>').join('') + '</ul>';
  const paragraph = text => '<p class="lead">' + text + '</p>';
  const notes = (text, cue = '') => '<p>' + text + '</p>' + (cue ? '<p class="cue">' + cue + '</p>' : '');
  const start = '<button class="start" data-start>Start presentation <span aria-hidden="true">↗</span></button><p class="start-hint">Click to start the timer. Advance when ready.</p>';
  function cover({title, lead, section, seconds, talk, image}) {
    return {title, section, seconds, theme:'dark', className:'cover',
      html:'<div class="split"><div><p class="eyebrow">CMU AI Augmented Design · Project 3</p><h1>' + title + '</h1>' + paragraph(lead) + '<p class="byline">Tony Liu · November 2026</p>' + start + '</div>' + image + '</div>',
      notes:notes(talk, 'Click to start, then press → when ready.')};
  }
  function slide({title, section, seconds, body, side, talk, cue, closing = false}) {
    const copy = '<div><p class="eyebrow">' + section + '</p><h2>' + title + '</h2>' + body + '</div>';
    return {title, section, seconds, ...(closing ? {theme:'dark', className:'closing'} : {}),
      html:side ? '<div class="split">' + copy + side + '</div>' : copy, notes:notes(talk, cue)};
  }
  const builders = {product:window.DUOWEN_PRODUCT, process:window.DUOWEN_PROCESS};
  const key = document.body.dataset.deck;
  window.DUOWEN_DECKS = {[key]:builders[key]({app, link, shot, bullets, paragraph, cover, slide})};
})();
