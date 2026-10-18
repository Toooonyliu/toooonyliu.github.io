/* Two intentionally different stories. Durations are rehearsal cues, not auto-advance. */
const mealImage = name => `../assets/meals/${name}.jpg`;
const photo = (name, alt, caption) => `<figure class="photo"><img src="${mealImage(name)}" alt="${alt}"><figcaption>${caption}</figcaption></figure>`;
const demo = scene => `<div class="demo-wrap"><iframe data-src="../?presentation=1&scene=${scene}" title="Interactive Mibly phone demo" allow="clipboard-write; fullscreen"></iframe><div class="demo-caption"><span>Interactive prototype · temporary demo state</span><a href="../?presentation=1&scene=${scene}" target="_blank" rel="noopener">Open separately ↗</a></div><div class="demo-fallback" hidden><p>The phone is taking a moment to load.</p><p><a href="../?presentation=1&scene=${scene}" target="_blank" rel="noopener">Open the demo separately ↗</a></p></div></div>`;
const features = [
  ['map', 'Today’s map', 'Zoom into your circle’s day. Tap a food photo to open a meal.'],
  ['feed', 'Meals & feed', 'Browse more posts, filter by date, and open a meal to react or reply.'],
  ['people', 'Friends & discovery', 'Find people, manage requests, or explore opted-in posts from friends of friends.'],
  ['restaurant', 'Restaurants & sharing', 'Copy an address, share a restaurant, or open it in Google Maps.'],
  ['capture', 'Capture a meal', 'Record a meal and choose its place and audience before posting.'],
  ['chat', 'Meal conversations', 'Continue a conversation from a friend’s shared meal.'],
  ['memories', 'Memories', 'Revisit your own meals as moments, a calendar, or a monthly recap.'],
  ['profile', 'Your profile', 'See your meals, friends, saved places, and settings.']
];
const featureNavigator = () => `<nav class="feature-nav" aria-label="Demo features">${features.map(([key, label, description], i) => `<button class="feature" data-scene="${key}" data-feature="${key}" data-description="${description}" aria-pressed="false"><span class="feature-number">${String(i + 1).padStart(2, '0')}</span><span>${label}</span><span class="feature-arrow" aria-hidden="true">↗</span></button>`).join('')}</nav><div class="feature-detail"><p class="feature-now">On the phone <span data-current-screen role="status">Loading demo…</span></p><p class="feature-description" data-feature-description>Click a label or explore the phone. Both stay in sync.</p><div class="feature-examples" data-examples-for="feed" hidden><button data-scene="post">Restaurant meal ↗</button><button data-scene="home-meal">Home cooking ↗</button></div><div class="feature-examples" data-examples-for="people" hidden><button data-scene="extended">Friends of friends ↗</button></div></div>`;
const liveDemo = (eyebrow, title, scene) => `<div class="split demo-layout feature-layout"><div class="feature-panel"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p class="feature-help">Choose a feature. Or explore the phone.</p>${featureNavigator()}</div>${demo(scene)}</div>`;
const sourceLinks = `<div class="sources">Project evidence: <a href="assets/methodology.json" target="_blank" rel="noopener">Sampling & coding method</a><a href="assets/stats.json" target="_blank" rel="noopener">Coded review counts</a></div>`;
const startButton = `<button class="start" data-start>Start presentation <span aria-hidden="true">↗</span></button><p class="start-hint">Click this cover to start the timer. Advance when ready.</p>`;

window.MIBLY_DECKS = {
  product: {
    label: 'Product story', min: 180, max: 240, target: '3–4 min',
    slides: [
      {
        title: 'Mibly', section: '01 / The product', seconds: 20, theme: 'dark', className: 'cover',
        html: `<div class="split"><div><p class="eyebrow">Project 2 · Design a competitive product</p><h1 class="brand-title">Mibly<span class="accent">.</span></h1><p class="lead">Your friends’ meals,<br>on one map.</p><p class="byline">Tony Liu · October 2026</p>${startButton}</div><div class="cover-art" aria-label="Illustrated food map with real meal photographs"><figure class="food-sticker"><img src="${mealImage('kura-sushi')}" alt="A stack of sushi plates at Kura"><figcaption>Kura Sushi</figcaption></figure><figure class="food-sticker"><img src="${mealImage('braised-pork')}" alt="Home-cooked braised pork"><figcaption>At home</figcaption></figure><figure class="food-sticker"><img src="${mealImage('speckled-egg')}" alt="An omelette with toast"><figcaption>Brunch with friends</figcaption></figure><span class="art-label">Real meal photos · illustrative map</span></div></div>`,
        notes: `<p>Mibly is a food-sharing app for small groups of friends. The starting question is simple: what did my friends eat today, and where? The homepage puts their food photos and avatars on a playful map, including meals cooked at home.</p><p class="cue">20 seconds. Click the cover to start, then use → when ready. The full talk track targets 3:30, including interaction time.</p>`
      },
      {
        title: 'The everyday meal', section: '02 / User need', seconds: 25,
        html: `<div class="split"><div><p class="eyebrow">The opportunity</p><h2>Some of the best<br>food moments<br>happen at home.</h2><p class="lead">Friends want a glimpse of each other’s day, even when nobody goes out.</p><p class="caveat">Design hypothesis: everyday meal sharing can create a reason to check in.</p></div><div class="photos">${photo('home-dinner', 'A home-cooked meal beside a laptop', 'A quiet night in')}${photo('wellington', 'Beef Wellington on a shared platter', 'A dinner out together')}</div></div>`,
        notes: `<p>I’m designing for friend groups who already share food pictures. A meal might be homemade leftovers, a casual brunch, or dinner out. I wanted all of those moments to belong in the same experience. The hypothesis is that everyday meals can help friends feel connected, even when they are not choosing a restaurant.</p><p class="cue">25 seconds. These are my supplied meal photos. This need is a design hypothesis, not a claim validated by a participant study.</p>`
      },
      {
        title: 'A different center of gravity', section: '03 / Competitive position', seconds: 30,
        html: `<p class="eyebrow">Competing with Beli</p><h2>A different reason to open the app.</h2><div class="comparison"><div><h3>Beli</h3><p class="positioning">Keep track of<br>restaurants.</p><p class="small">Ranked lists, maps and recommendations.</p></div><div class="ours"><h3>Mibly</h3><p class="positioning">Catch up through<br>today’s meals.</p><p class="small">People and plates first, including home cooking.</p></div></div><p class="caveat">Beli already has maps and friend activity. Mibly’s proposed distinction is the everyday, map-first social ritual.</p>`,
        notes: `<p>Beli already has maps, restaurant lists, and friend activity, so adding a map alone would not distinguish this project. Mibly changes the primary focus from collecting and ranking restaurants to seeing friends’ everyday meals. A post connects a person, a plate, a time, and a shared place. There are still useful restaurant actions, but they sit behind the social moment.</p><p class="cue">30 seconds. Frame this as a proposed positioning, not proof that no competitor offers similar features.</p><div class="sources">Competitive baseline: <a href="https://beliapp.com/" target="_blank" rel="noopener">Beli official product site</a> · Reviewed October 8, 2026.</div>`
      },
      {
        title: 'See today at a glance', section: '04 / Live demo · Discover a meal', seconds: 55,
        html: liveDemo('Live demo · Discover a meal', 'Your people.<br>Their plates.', 'map'),
        notes: `<p>Here is the working prototype. I can zoom the map and tap Maya’s photo to see her sushi post. The pin tells me who posted, what they ate, where they ate, and when the post was made. If I prefer scrolling, the Feed shows more meals and date filters. Eric’s home-cooked meal appears alongside restaurant visits, with no home address exposed.</p><p class="cue">55 seconds, including about 25 seconds of interaction. Zoom once → tap Maya → open her meal → choose “Home cooking” under Meals & feed. The left labels follow the phone; clicking a label also opens that feature.</p><p class="sources">The people, timestamps and visits are demo scenarios. Photos are supplied by the designer. Terrain and pin positions are illustrative, not geographic navigation.</p>`
      },
      {
        title: 'From a meal to a plan', section: '05 / Live demo · Connect & share', seconds: 40,
        html: liveDemo('Live demo · Connect & share', '“Let’s eat here.”', 'restaurant'),
        notes: `<p>From a meal, I can open the restaurant card, copy its address, share it, or launch Google Maps. The share contains the venue, not someone’s private post. Adding friends has one clear entry on Home. Requests stay pending until accepted. Friends of friends is a separate scope, with mutual-friend context and only restaurant posts that the author opted into sharing.</p><p class="cue">40 seconds. Click Copy address, then Friends & discovery. If there is time, choose its Friends of friends shortcut. Google Maps opens a new tab, so copying is the smoother action during recording.</p><div class="sources">Example venue: <a href="https://kurasushi.com/locations/pennsylvania" target="_blank" rel="noopener">Kura Pennsylvania locations</a>. The example branch does not establish where the original photo was taken.</div>`
      },
      {
        title: 'A meal location, not live tracking', section: '06 / Trust & boundaries', seconds: 25,
        html: `<div class="split"><div><p class="eyebrow">Privacy is part of the experience</p><h2>A meal location.<br>No live tracking.</h2><div class="rules"><div class="rule"><h3>At home stays approximate.</h3><p>No home address or directions.</p></div><div class="rule"><h3>A wider circle is opt-in.</h3><p>Home and private posts stay out of discovery.</p></div><div class="rule"><h3>Old posts are still old posts.</h3><p>A timestamp never means “here right now.”</p></div></div></div><div><img class="photo-hero home" src="${mealImage('home-table')}" alt="An everyday home-cooked meal spread"></div></div>`,
        notes: `<p>A social map can easily feel like tracking. Mibly shows a declared meal location from a post, not someone’s live position. Home stays approximate. Missing locations do not get a map pin. Private meals stay in the author’s memories, and home meals do not spread through friends-of-friends discovery. Those limits are part of the design, not an optional extra.</p><p class="cue">25 seconds. Keep the distinction between shared past visits and live presence explicit.</p>`
      },
      {
        title: 'The next question', section: '07 / Evaluation & next step', seconds: 15, theme: 'dark', className: 'closing',
        html: `<p class="eyebrow">What this prototype lets us test</p><h2>Would friends come back<br>for an ordinary meal?</h2><p class="lead">That is the habit Mibly needs to earn.</p><div class="closing-row"><div><h3>Built</h3><p class="small">Interactive map, posting, discovery, sharing and memories.</p></div><div><h3>Next</h3><p class="small">Test with real friend groups.<br>Observe return visits and privacy understanding.</p></div></div><p class="caveat small">Local prototype. No real accounts, message delivery or participant study yet.</p>`,
        notes: `<p>The interactive flows are built and functionally checked. What remains unproven is the daily habit. My next step is a real friend-group study to see whether people return for ordinary meals and understand the map’s privacy boundaries.</p><p class="cue">15 seconds. Total target: 3:30. Click Finish below to stop the timer.</p>`
      }
    ]
  },
  process: {
    label: 'AI design process', min: 120, max: 180, target: '2–3 min',
    slides: [
      {
        title: 'Designing Mibly with AI', section: '01 / The process', seconds: 15, theme: 'dark', className: 'cover process',
        html: `<div class="split"><div><p class="eyebrow">Project 2 · Process reflection</p><h1>Designing<br><span class="accent">Mibly</span><br>with AI.</h1><div class="phase-rail"><span>Discover</span><span>Define</span><span>Develop</span><span>Deliver</span></div><p class="byline">Tony Liu · October 2026</p>${startButton}</div><div><img class="process-cover" src="${mealImage('home-wings')}" alt="A real home-cooked meal with wings and shared dishes"></div></div>`,
        notes: `<p>I used AI for research, concepts, coding, and testing. It made iteration faster. The challenge was separating plausible output from real evidence, and keeping the app focused on the experience I wanted.</p><p class="cue">15 seconds. Target for this deck: 2:30. Click the cover to start.</p>`
      },
      {
        title: 'Discover: organize evidence', section: '02 / Discover', seconds: 30,
        html: `<p class="eyebrow">Discover · AI-assisted review analysis</p><div class="split"><div><div class="research-number">250</div><p class="research-label">Beli reviews analyzed</p><p class="evidence-note">125 App Store + 125 Google Play<br>Equal sampling across star ratings</p></div><div><h2>Useful patterns.<br>Limited evidence.</h2><div style="margin-top:30px"><div class="insight-line"><strong>26</strong><span>Social connection</span></div><div class="insight-line"><strong>23</strong><span>Records &amp; memories</span></div></div><p class="caveat">Overlapping themes in a selected sample, not population estimates. One AI coder.</p></div></div><p class="caveat">Five AI-simulated interviews explored scenarios. They were not real user interviews.</p>`,
        notes: `<p>I started with 250 Beli reviews. AI helped organize themes and keep an evidence trail. Social connection appeared in 26 reviews, and personal records and memories in 23. The sample was not representative, and there was only one AI coder. Five simulated interviews also helped explore scenarios, but they were not evidence from real users.</p><p class="cue">30 seconds. The theme counts overlap. Do not present the synthetic interviews as participants or the sample as a market survey.</p>${sourceLinks}`
      },
      {
        title: 'Define: choose the real question', section: '03 / Define', seconds: 25,
        html: `<div class="split"><div><p class="eyebrow">Define · My turning point</p><h2>The map needed<br>a social purpose.</h2><p class="quote">Where did my friends<br>eat today?</p><p class="decision">Make each friend’s meal the main thing on Home.</p><p class="caveat">My design direction, refined through prototype critique.</p></div><figure class="artifact"><img src="assets/early-map.png" alt="An earlier prototype with a conventional map panel"><figcaption>Earlier prototype: a conventional map was not enough.</figcaption></figure></div>`,
        notes: `<p>The early map still felt like a restaurant utility. I narrowed the question to where my friends ate today, including at home. That changed the hierarchy: the map became Home, and friends’ photos became the main content. AI implemented the direction, but I had to choose it.</p><p class="cue">25 seconds. The image is a saved screenshot of the earlier prototype, not an invented before state.</p>`
      },
      {
        title: 'Develop: critique the generated result', section: '04 / Develop', seconds: 30,
        html: `<div class="split"><div><p class="eyebrow">Develop · Prompt, inspect, revise</p><h2>Generation was<br>the beginning.</h2><div class="iteration-list"><div><strong>A generic map → a food world</strong><p>Zenly-inspired terrain, photo-and-avatar pins.</p></div><div><strong>Two Chat entries → one</strong><p>Home’s top action now opens Friends.</p></div><div><strong>Sample food → real meals</strong><p>My photos made the situations more specific.</p></div></div></div><figure class="artifact"><img src="assets/duplicate-chat.png" alt="Earlier prototype with two Chat entry points"><figcaption>Saved iteration before the navigation cleanup.</figcaption></figure></div>`,
        notes: `<p>I critiqued each generated version. I asked for a distinctive map, used my BeReal screenshots to clarify navigation, and pointed out duplicate Chat entries. The top action became Friends. My own meal photos replaced the generic images. AI made revisions easier to build. I still had to inspect the result and explain what felt wrong.</p><p class="cue">30 seconds. Tap a real-photo pin. The interactive prototype is evidence of the current result, not evidence of user adoption.</p>`
      },
      {
        title: 'Deliver: test beyond the happy path', section: '05 / Deliver', seconds: 30,
        html: liveDemo('Deliver · Functional checks', 'Test the edges.', 'people'),
        notes: `<p>I used browser checks and walkthroughs to examine edge cases. A request should not unlock private posts. Home meals should stay out of discovery. Restaurant sharing needs a fallback when the share sheet or clipboard is unavailable. These checks verify behavior. They cannot tell me whether friends will enjoy the product or return tomorrow.</p><p class="cue">30 seconds. Show a pending request or switch to the restaurant card. Keep any real user study in future tense.</p>`
      },
      {
        title: 'What I would do again', section: '06 / Reflection', seconds: 20, theme: 'dark', className: 'closing',
        html: `<p class="eyebrow">What I learned</p><h2>AI made iteration faster.<br>Judgment stayed with me.</h2><div class="reflection"><div><h3>I would use AI again for</h3><p>Organizing review evidence.<br>Turning critique into working UI.<br>Checking interaction states.</p></div><div><h3>I would keep in human hands</h3><p>Choosing the user need.<br>Evaluating trust and privacy.<br>Learning from real people.</p></div></div><p class="small" style="margin-top:30px">Next: put Mibly in front of a real friend group.</p>`,
        notes: `<p>I would use AI again to organize evidence, build revisions, and check interactions. Choosing the problem and learning from people still need human judgment. Next, I want a real friend group to use Mibly and challenge the design.</p><p class="cue">20 seconds. Total target: 2:30. Click Finish below to stop the timer.</p>`
      }
    ]
  }
};

// Historical artifacts replace the two process beats without adding slides or time.
if (window.MIBLY_ITERATION_EVIDENCE) {
  Object.assign(window.MIBLY_DECKS.process.slides[2], window.MIBLY_ITERATION_EVIDENCE.define);
  Object.assign(window.MIBLY_DECKS.process.slides[3], window.MIBLY_ITERATION_EVIDENCE.develop);
}
