const featureTabs = [...document.querySelectorAll('[data-feature]')];

function selectFeature(tab) {
  for (const candidate of featureTabs) {
    const selected = candidate === tab;
    candidate.setAttribute('aria-selected', String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    document.getElementById(candidate.getAttribute('aria-controls')).hidden = !selected;
  }
}

if (featureTabs.length) {
  selectFeature(featureTabs[0]);
  for (const tab of featureTabs) {
    tab.addEventListener('click', () => selectFeature(tab));
    tab.addEventListener('keydown', event => {
      const index = featureTabs.indexOf(tab);
      let next;
      if (event.key === 'ArrowRight') next = featureTabs[(index + 1) % featureTabs.length];
      if (event.key === 'ArrowLeft') next = featureTabs[(index - 1 + featureTabs.length) % featureTabs.length];
      if (event.key === 'Home') next = featureTabs[0];
      if (event.key === 'End') next = featureTabs[featureTabs.length - 1];
      if (!next) return;
      event.preventDefault();
      selectFeature(next);
      next.focus();
    });
  }
}
