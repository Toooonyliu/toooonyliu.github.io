'use strict';
// Small, local interactions. The full prototype loads only on request.
function wireTabs(list, onChange) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const activate = (tab, focus = false) => {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
    onChange?.(tab);
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activate(tabs[next], true); }
    });
  });
}
wireTabs(document.querySelector('.feature-tabs'), tab => {
  const trips = tab.id === 'tab-trips';
  document.getElementById('hero-caption').textContent = trips
    ? 'A focused route, clear journey times, and a Passport for every trip.'
    : 'Current-tier benefits and a clear view of what your next flight could add.';
  const link = document.getElementById('hero-learn');
  link.href = trips ? '#trips' : '#mileage';
  link.firstChild.textContent = trips ? 'Explore Trips ' : 'Explore Mileage & status ';
});
wireTabs(document.querySelector('.comparison-tabs'));
const heroObserver = new IntersectionObserver(entries => {
  document.body.classList.toggle('hero-tabs-away', !entries[0].isIntersecting);
}, {rootMargin: '-110px 0px -70px 0px'});
heroObserver.observe(document.querySelector('.hero'));
const menuButton = document.querySelector('.mobile-menu-button');
const projectLinks = document.getElementById('project-links');
function closeMenu() {
  projectLinks.classList.remove('mobile-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open project navigation');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  projectLinks.classList.toggle('mobile-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close project navigation' : 'Open project navigation');
});
projectLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && projectLinks.classList.contains('mobile-open')) { closeMenu(); menuButton.focus(); }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.floating-nav')) closeMenu();
});


const scene = document.getElementById('aircraft-scene');
const motionButton = document.getElementById('motion-toggle');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
function updateMotion() {
  scene.classList.toggle('motion-paused', paused || reducedMotion.matches);
  motionButton.hidden = reducedMotion.matches;
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.setAttribute('aria-label', paused ? 'Play aircraft animation' : 'Pause aircraft animation');
  motionButton.querySelector('img').src = paused ? 'images/icons/play.svg' : 'images/icons/pause.svg';
}
motionButton.addEventListener('click', () => { paused = !paused; updateMotion(); });
reducedMotion.addEventListener('change', updateMotion);
updateMotion();
const sceneObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => scene.classList.toggle('in-view', entry.isIntersecting));
}, {threshold: .1});
sceneObserver.observe(scene);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) scene.classList.remove('in-view');
  else { sceneObserver.unobserve(scene); sceneObserver.observe(scene); }
});

// Values mirror source/src/domain.ts: jp1–jp4. No inferred surface-flight leg.
const tripFlights = [
  {route: 'PIT–ORD', km: 664, minutes: 95},
  {route: 'ORD–HND', km: 10140, minutes: 800},
  {route: 'KIX–SFO', km: 8695, minutes: 620},
  {route: 'SFO–PIT', km: 3620, minutes: 290},
];
const number = value => new Intl.NumberFormat('en-US').format(value);
const time = value => `${Math.floor(value / 60)}h ${value % 60}m`;
function renderTripChart(metric) {
  const unit = metric === 'km' ? 'distance' : 'flight time';
  document.getElementById('trip-chart-title').textContent = `Japan · ${unit} by flight`;
  const max = Math.max(...tripFlights.map(flight => flight[metric]));
  const rows = tripFlights.map(flight => {
    const row = document.createElement('div'); row.className = 'trip-bar-row';
    const label = document.createElement('span'); label.className = 'trip-bar-label'; label.textContent = flight.route;
    const track = document.createElement('div'); track.className = 'trip-bar-track'; track.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('span'); bar.className = 'trip-bar-value'; bar.style.width = `${flight[metric] / max * 100}%`; track.append(bar);
    const value = document.createElement('span'); value.className = 'trip-bar-number'; value.textContent = metric === 'km' ? `${number(flight.km)} km` : time(flight.minutes);
    row.append(label, track, value); return row;
  });
  document.getElementById('trip-bars').replaceChildren(...rows);
  document.querySelectorAll('[data-trip-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tripMetric === metric)));
}
document.querySelectorAll('[data-trip-metric]').forEach(button => button.addEventListener('click', () => renderTripChart(button.dataset.tripMetric)));
renderTripChart('km');
const tbody = document.querySelector('#trip-data-table tbody');
tripFlights.forEach(flight => {
  const row = document.createElement('tr');
  [flight.route, `${number(flight.km)} km`, time(flight.minutes)].forEach((value, index) => {
    const cell = document.createElement(index === 0 ? 'th' : 'td');
    if (index === 0) cell.scope = 'row';
    cell.textContent = value; row.append(cell);
  }); tbody.append(row);
});
document.getElementById('show-trip-data').addEventListener('click', event => {
  const table = document.getElementById('trip-data-table'); table.hidden = !table.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!table.hidden));
  event.currentTarget.textContent = table.hidden ? 'View data table' : 'Hide data table';
});

// Values mirror source/src/loyalty.ts. These are examples, not synced balances.
const accounts = {
  ana: {name:'ANA Mileage Club',tier:'Bronze',benefit:'Premium Economy check-in · ANA Group international flights',policy:'https://www.ana.co.jp/en/jp/amc/premium/overview/service-comparison/',carrier:'ANA',goal:'Reach Platinum',earned:42000,target:50000,unit:'Premium Points',estimate:9370,second:{name:'ANA Group points',earned:22000,target:25000,growth:8796},balance:'18,500 miles',balanceLabel:'Current redeemable balance',date:'Dec 31, 2026',context:'Both counters must be met. Calculated base credit, with tier/card bonuses excluded. ANA confirms and activates any new status.'},
  united: {name:'United MileagePlus',tier:'Premier Silver',benefit:'Economy Plus at check-in · when available on eligible United Economy tickets',policy:'https://marriottbonvoy.unitedmileageplus.com/faqs',carrier:'United',goal:'My annual flying target',earned:4200,target:6000,unit:'PQP',estimate:812,second:{name:'PQF',earned:16,target:20,growth:4},balance:'64,250 miles',balanceLabel:'Current redeemable balance',date:'Dec 31, 2026',context:'Personal target, not an elite threshold. Assumes a United-issued ticket and $812 eligible return fare, excluding $280 sample taxes.'},
  ba: {name:'British Airways Club',tier:'Bronze',benefit:'Priority check-in on eligible oneworld flights · no Ruby lounge entitlement',policy:'https://www.britishairways.com/content/information/partners-and-alliances/oneworld/frequent-flyer-benefits',carrier:'Japan Airlines',goal:'A future London getaway',earned:48000,target:60000,unit:'Avios',estimate:9932,second:null,balance:'2,100 tier points',balanceLabel:'Current separate status counter',date:'Mar 31, 2027',context:'JAL H-class scenario, credited to BA. A miles savings goal is separate from status and does not guarantee an award seat. Tier bonuses excluded.'}
};
let selectedAccount = 'ana';
let includeEstimates = true;
function setText(id, value) { document.getElementById(id).textContent = value; }
function renderAccount() {
  const account = accounts[selectedAccount];
  const estimate = includeEstimates ? account.estimate : 0;
  const remaining = Math.max(0, account.target - account.earned - estimate);
  setText('account-tier',account.tier);document.querySelector('.portfolio-tier').classList.toggle('silver',selectedAccount==='united');setText('account-benefit',account.benefit);document.getElementById('account-policy').href=account.policy;setText('account-scenario',`PIT → Tokyo · ${account.carrier} · Economy return`);setText('account-name', account.name); setText('account-goal', account.goal);
  setText('earned-value', number(account.earned)); setText('account-denominator', `/ ${number(account.target)} ${account.unit}`);
  document.getElementById('earned-segment').style.width = `${account.earned / Math.max(account.target,account.earned+estimate) * 100}%`;
  document.getElementById('estimate-segment').style.width = `${estimate / Math.max(account.target,account.earned+estimate) * 100}%`;
  document.getElementById('primary-progress').setAttribute('aria-label', `${number(account.earned)} current + ${number(estimate)} from this trip; target ${number(account.target)} ${account.unit}`);
  setText('goal-outcome', `${number(remaining)} ${account.unit} remaining${estimate?` after this trip adds ${number(estimate)} ${account.unit}.`:' with current credit only.'}`);
  document.getElementById('secondary-counter').hidden = !account.second;
  if (account.second) {
    const second = account.second;
    const growth=includeEstimates?second.growth:0,after=second.earned+growth,scale=Math.max(second.target,after);
    setText('second-name', second.name); setText('second-value', `${number(second.earned)}${growth?' → '+number(after):''} / ${number(second.target)}`);
    document.getElementById('second-progress').setAttribute('aria-label',`${number(second.earned)} current + ${number(growth)} projected ${second.name}; target ${number(second.target)}`);
    document.getElementById('second-current').style.width=`${second.earned/scale*100}%`;
    document.getElementById('second-growth').style.width=`${growth/scale*100}%`;
    setText('second-note', `${number(Math.max(0,second.target-after))} ${second.name} still needed.`);
  }
  setText('balance-label', account.balanceLabel); setText('balance-value', account.balance);
  setText('account-context', account.context); setText('account-date', `Sample account · Policy review Sep 16, 2026 · Goal ends ${account.date}`);
  document.getElementById('estimate-toggle').setAttribute('aria-checked', String(includeEstimates));
  document.querySelectorAll('[data-account]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.account === selectedAccount)));
}
document.querySelectorAll('[data-account]').forEach(button => button.addEventListener('click', () => { selectedAccount = button.dataset.account; renderAccount(); }));
document.getElementById('estimate-toggle').addEventListener('click', () => { includeEstimates = !includeEstimates; renderAccount(); });
renderAccount();

const demoShell = document.getElementById('demo-shell');
const demoPlaceholder = [...demoShell.childNodes];
document.getElementById('load-demo').addEventListener('click', () => {
  const shell = demoShell;
  const frame = document.createElement('iframe'); frame.src = 'demo/'; frame.title = 'Interactive Flighty redesign prototype'; frame.className = 'demo-frame';
  shell.replaceChildren(frame); frame.focus();
  const toolbar = document.createElement('div'); toolbar.className = 'demo-toolbar';
  const unload = document.createElement('button'); unload.type = 'button'; unload.className = 'text-button'; unload.textContent = 'Close embedded demo';
  const full = document.createElement('a'); full.href = 'demo/'; full.textContent = 'Open full screen';
  unload.addEventListener('click', () => { shell.replaceChildren(...demoPlaceholder); toolbar.remove(); document.getElementById('load-demo').focus(); }); toolbar.append(unload, full); shell.after(toolbar);
});

// Adapt the floating navigation to the section beneath it.
const darkSections = [...document.querySelectorAll('.dark-section,.opportunity-section,.mileage-section')];
let navFrame;
function updateNavigationTone() {
  const dark = darkSections.some(section => { const rect = section.getBoundingClientRect(); return rect.top <= 70 && rect.bottom > 70; });
  document.body.classList.toggle('nav-on-dark', dark);
  navFrame = null;
}
window.addEventListener('scroll', () => { if (!navFrame) navFrame = requestAnimationFrame(updateNavigationTone); }, {passive: true});
window.addEventListener('resize', updateNavigationTone);
updateNavigationTone();
