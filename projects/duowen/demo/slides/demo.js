(() => {
  const project = 'Transit app research';
  const recording = 'Transit app design review';
  const secondRecording = 'Route planner playtest';
  const sampleDuration = 12.095;
  const segments = [
    {start: 0, label: '0:00', speaker: 'Maya', text: 'We need to explain why the transit map omits stops that are closed.'},
    {start: 4.31, label: '0:04', speaker: 'Leo', text: 'I thought the missing stops meant the app had lost my route.'},
    {start: 7.833, label: '0:07', speaker: 'Maya', text: 'Try a short message in the route details and test whether people notice it.'},
  ];
  const projectSegments = [
    {label: '0:00', speaker: 'Participant', text: 'I saw the detour on the map, but I wanted to know whether my stop was still open.'},
    {label: '0:07', speaker: 'Moderator', text: 'Where would you expect to find the closure information?'},
    {label: '0:12', speaker: 'Participant', text: 'In the route details, next to the name of the stop.'},
  ];
  const chatUrls = {chatgpt: 'https://chatgpt.com/', claude: 'https://claude.ai/new'};
  const action = (label, name, style = '') =>
    `<button type="button" class="dw-button ${style}" data-dw-action="${name}">${label}</button>`;
  const chatLink = (label, target) =>
    `<a class="dw-link" href="${chatUrls[target]}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  const sampleRows = [
    [recording, '0:12', 'recording-md'],
    [secondRecording, '0:18', 'playtest-md'],
  ];

  function render(mode) {
    const isProject = mode === 'project';
    const title = isProject ? project : recording;
    const header = `<header class="dw-header">
      <div class="dw-heading">
        <p class="dw-meta">${isProject ? 'Projects' : project}</p>
        <h3>${title}</h3>
        <p class="dw-meta">${isProject ? '2 recordings' : '0:12 · 2 speakers'}</p>
      </div>
      ${action('Send to AI', 'send', 'dw-primary')}
    </header>`;
    const body = isProject ? projectBody() : recordingBody();
    return `<figure class="dw-demo" data-duowen-demo="${mode}">
      <div class="dw-shell">${header}${body}<dialog class="dw-dialog" aria-label="Send to AI">
        ${dialogBody(isProject)}
      </dialog></div>
      <figcaption>${isProject ? 'Interactive demo · synthetic transcripts' : 'Interactive demo · synthetic recording'}</figcaption>
    </figure>`;
  }

  function recordingBody() {
    return `<div class="dw-transcript">
      <div class="dw-bar"><strong>Transcript</strong>${action('Edit transcript', 'edit', 'dw-quiet')}</div>
      <div class="dw-lines">${segments.map(({start, label, speaker, text}) => `
        <div class="dw-line" data-dw-start="${start}" data-dw-speaker="${speaker}" data-dw-time="${label}">
          <button type="button" class="dw-time" data-dw-action="seek" aria-label="Play from ${label}">${label}</button>
          <div><strong>${speaker}</strong><p class="dw-line-text">${text}</p></div>
        </div>`).join('')}</div>
      <div class="dw-player">
        <button type="button" class="dw-play" data-dw-action="play">Play</button>
        <input class="dw-slider" type="range" min="0" max="${sampleDuration}" step="0.1" value="0" aria-label="Recording position">
        <output class="dw-position">0:00 / 0:12</output>
        <audio src="demo-audio.m4a" preload="metadata"></audio>
      </div>
    </div>`;
  }

  function projectBody() {
    return `<div class="dw-transcript"><div class="dw-bar"><strong>Recordings</strong></div>
      <ul class="dw-recordings">${sampleRows.map(([title, duration]) =>
        `<li><span><strong>${title}</strong><small>Transcript ready</small></span><span>${duration}</span></li>`).join('')}</ul>
    </div>`;
  }

  function dialogBody(isProject) {
    const prompt = isProject
      ? 'Compare the feedback across recordings. Suggest what to test next and cite the recording titles and timestamps.'
      : 'Summarize the main feedback. Suggest what to test next and cite timestamps.';
    const details = isProject ? `
      <p>Download the Markdown for <strong>${project}</strong>. Attach it in a new chat and paste your analysis prompt.</p>
      <strong>Included recordings</strong>
      <ol class="dw-pack-recordings">${sampleRows.map(([title, duration, key]) =>
        `<li><span>${title} <small>${duration}</small></span><button type="button" class="dw-button dw-quiet" data-dw-action="${key}" aria-label="Download .md for ${title}">.md</button></li>`).join('')}</ol>`
      : `<p>Prepare the transcript from <strong>${recording}</strong> for a new chat.</p>`;
    const controls = isProject
      ? `${action('Download Markdown', 'download', 'dw-primary')}${chatLink('Open Claude', 'claude')}${chatLink('Open ChatGPT', 'chatgpt')}`
      : `${action('Copy and open Claude', 'claude', 'dw-primary')}${action('Copy and open ChatGPT', 'chatgpt', 'dw-primary')}`;
    return `<div class="dw-dialog-header"><strong>Send to AI</strong><button class="dw-close" data-dw-action="close" type="button" aria-label="Close Send to AI">×</button></div>
      <div class="dw-dialog-body">
        ${details}
        <div class="dw-prompt"><label>${isProject ? 'Analysis prompt' : 'What should the assistant do?'}
          <textarea rows="3">${prompt}</textarea>
        </label>${isProject ? action('Copy prompt', 'prompt') : ''}</div>
        <div class="dw-actions">${controls}</div>
        ${isProject ? '' : '<p class="dw-hint">Paste the copied transcript and prompt into the new chat.</p><div class="dw-actions">' + action('Copy only', 'copy') + action('Download .md', 'download') + '</div>'}
        <p class="dw-feedback" role="status"></p>
      </div>`;
  }

  function transcriptFrom(demo) {
    const lines = [...demo.querySelectorAll('.dw-line')];
    return lines.length ? lines.map(line => ({
      label: line.dataset.dwTime,
      speaker: line.dataset.dwSpeaker,
      text: line.querySelector('.dw-line-text').textContent.trim(),
    })) : segments;
  }

  function markdown(demo, scope, prompt = '') {
    const transcript = (title, lines) => [
      `## ${title}`,
      ...lines.map(({label, speaker, text}) => `[${label}] ${speaker}: ${text}`),
    ].join('\n\n');
    if (scope === 'playtest-md') return transcript(secondRecording, projectSegments);
    const primary = transcript(recording, transcriptFrom(demo));
    if (scope === 'project') {
      return [
        `# ${project}`,
        `## Included recordings\n1. ${recording}\n2. ${secondRecording}`,
        primary,
        transcript(secondRecording, projectSegments),
      ].join('\n\n');
    }
    return prompt ? `## Analysis prompt\n\n${prompt}\n\n${primary}` : primary;
  }

  function download(demo, scope, prompt) {
    const filenames = {project: 'transit-app-research', 'playtest-md': 'route-planner-playtest'};
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([markdown(demo, scope, prompt)], {type: 'text/markdown;charset=utf-8'}));
    link.href = url;
    link.download = `${filenames[scope] || 'transit-app-design-review'}.md`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function updatePlayer(demo) {
    const audio = demo.querySelector('audio');
    const time = audio.currentTime;
    const lines = [...demo.querySelectorAll('.dw-line')];
    const active = lines.findLastIndex(line => Number(line.dataset.dwStart) <= time);
    lines.forEach((line, index) => line.classList.toggle('is-active', index === active && (time > 0 || !audio.paused)));
    demo.querySelector('.dw-play').textContent = audio.paused ? 'Play' : 'Pause';
    demo.querySelector('.dw-slider').value = time;
    demo.querySelector('.dw-position').value = `0:${String(Math.floor(time)).padStart(2, '0')} / 0:12`;
  }

  function play(demo) {
    const audio = demo.querySelector('audio');
    audio.play().catch(() => {
      demo.querySelector('.dw-position').value = 'Audio unavailable';
    });
  }

  function seek(audio, time) {
    if (audio.readyState >= 1) audio.currentTime = time;
    else audio.dataset.dwPendingSeek = String(time);
  }

  function editTranscript(demo, button) {
    const editing = button.textContent === 'Save edits';
    demo.querySelectorAll('.dw-line-text').forEach(line => {
      line.contentEditable = editing ? 'false' : 'plaintext-only';
      if (!editing && line.contentEditable !== 'plaintext-only') line.contentEditable = 'true';
    });
    button.textContent = editing ? 'Edit transcript' : 'Save edits';
    if (!editing) demo.querySelector('.dw-line-text').focus();
  }

  async function copy(text, feedback, message) {
    try {
      await navigator.clipboard.writeText(text);
      feedback.textContent = message;
    } catch {
      feedback.textContent = 'The browser blocked clipboard access.';
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-dw-action]');
    if (!button) return;
    const demo = button.closest('[data-duowen-demo]');
    const dialog = demo.querySelector('dialog');
    const audio = demo.querySelector('audio');
    const name = button.dataset.dwAction;

    if (name === 'send') {
      audio?.pause();
      dialog.showModal();
      dialog.querySelector('.dw-primary').focus({preventScroll: true});
      return;
    }
    if (name === 'close') {
      dialog.close();
      return;
    }
    if (name === 'edit') {
      editTranscript(demo, button);
      return;
    }
    if (name === 'play') {
      if (audio.paused) play(demo);
      else audio.pause();
      return;
    }
    if (name === 'seek') {
      seek(audio, Number(button.closest('.dw-line').dataset.dwStart));
      play(demo);
      return;
    }

    const prompt = dialog.querySelector('textarea').value.trim();
    const feedback = dialog.querySelector('.dw-feedback');
    const isProject = demo.dataset.duowenDemo === 'project';
    if (name === 'download' || name.endsWith('-md')) {
      const scope = name === 'download' && isProject ? 'project' : name;
      download(demo, scope, isProject ? '' : prompt);
      feedback.textContent = 'Markdown downloaded.';
    } else if (name === 'prompt') {
      copy(prompt, feedback, 'Prompt copied.');
    } else {
      copy(markdown(demo, 'recording', prompt), feedback, 'Transcript and prompt copied.');
      if (name in chatUrls) window.open(chatUrls[name], '_blank', 'noopener,noreferrer');
    }
  });

  document.addEventListener('input', event => {
    if (!event.target.matches('.dw-slider')) return;
    const audio = event.target.closest('[data-duowen-demo]').querySelector('audio');
    seek(audio, Number(event.target.value));
  });

  document.addEventListener('loadedmetadata', event => {
    const audio = event.target;
    if (!(audio instanceof HTMLAudioElement) || !audio.hasAttribute('data-dw-pending-seek')) return;
    const time = Number(audio.dataset.dwPendingSeek);
    delete audio.dataset.dwPendingSeek;
    seek(audio, time);
  }, true);

  for (const type of ['timeupdate', 'play', 'pause', 'seeking', 'ended']) {
    document.addEventListener(type, event => {
      if (event.target instanceof HTMLAudioElement) {
        const demo = event.target.closest('[data-duowen-demo]');
        if (demo) updatePlayer(demo);
      }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const deck = document.getElementById('presentation');
    if (!deck?.querySelector('[data-duowen-demo]')) return;
    const stopHiddenAudio = new MutationObserver(entries => {
      for (const {target} of entries) {
        if (target.matches('.slide[hidden]')) target.querySelector('[data-duowen-demo] audio')?.pause();
      }
    });
    stopHiddenAudio.observe(deck, {subtree: true, attributes: true, attributeFilter: ['hidden']});
  });

  window.DUOWEN_DEMO = {render};
})();
