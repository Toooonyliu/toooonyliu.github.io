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
  window.DUOWEN_DECKS = {
    product: {label:'Project video', target:'3–4 min · Aim 3:30', min:180, max:240, slides:[
      cover({title:'Duowen 多问', lead:'A transcript workspace for design critiques and playtests.', section:'Project video', seconds:20,
        image:shot('transcript.jpg','Duowen’s transcript workspace with a playtest recording'),
        talk:'I built Duowen for the part of design work that happens after a critique or playtest. I can return to what someone said, check it against the audio, and compare it with feedback from other sessions.'}),
      slide({title:'Finding the original moment', section:'Discover · User need', seconds:30,
        body:paragraph('A long recording is easy to keep and slow to revisit.') + bullets(['Who said it?', 'What was the exact wording?', 'Did it come up in another session?']),
        talk:'In Flighty and Mibly I practiced tracing a design decision back to evidence. I wanted the same trail for spoken feedback. I’m the first user here. I designed around a thirty- to forty-minute studio recording, where I may remember the issue but need to find the exact moment before I can act on it.'}),
      slide({title:'The transcript is the workspace', section:'Define & Develop', seconds:30,
        body:bullets(['Speaker labels and quiet timestamps','Click a sentence to hear it','Search and correct text where you read it']),
        side:shot('mobile.jpg','Mobile transcript layout and audio controls'),
        talk:'My requirements were to find, verify, and compare. I kept the Library for navigation and made the transcript a reading surface. Speakers are named once per turn, and audio follows the sentence. I can fix a word or a speaker without leaving what I’m reading.'}),
      slide({title:'Check a quote against the audio', section:'Walkthrough · One recording', seconds:50,
        body:paragraph('Open a prepared recording. Find a passage, play it, and correct the transcript.') + link(app,'Open Duowen'),
        side:shot('transcript.jpg','Search, speakers, timestamps, and playback in the recording view'),
        talk:'I drop in a file and Deepgram Nova-3 returns the transcript, timestamps, and speaker groups. Here I’ve opened a prepared recording so I can show the review flow. I look for a phrase, click the sentence, and hear the source. I can edit the transcript if recognition got it wrong.',
        cue:'Allow about 25 seconds for the live walkthrough. Prepare a recording you can show, in the same browser profile, before recording. If the app is unavailable, narrate the screenshot.'}),
      slide({title:'Compare the sessions together', section:'Walkthrough · A project', seconds:50,
        body:bullets(['Review the included recordings','Download one Markdown attachment','Copy the editable analysis prompt']) + link(app,'Open Duowen'),
        side:shot('project-pack.jpg','Send to AI project dialog with recording list, prompt, and Markdown export'),
        talk:'I put related sessions in a project. Send to AI shows what will go in the file. The Markdown keeps each recording separate inside the pack, with timestamps and speakers. I copy the analysis prompt separately, then attach the file in a chat. I can ask which sessions raised the same issue and use the timestamps to check the examples.',
        cue:'Open the project, click Send to AI, then show Download Markdown and Copy prompt. Return to this deck with the timer running.'}),
      slide({title:'What I verified', section:'Deliver · Evaluation', seconds:20,
        body:bullets(['Live transcription and playback','Live Markdown download and prompt copy','Ten synthetic transcripts exported in order']),
        talk:'I verified the core workflow on the live site. I used a ten-recording synthetic project to check that every transcript stayed in order. I still want to test full-length recordings and check the quality of AI citations against the original audio.'}),
      slide({title:'Bring the source with you', section:'Close', seconds:10, closing:true,
        body:paragraph('Find the passage. Hear it again. Carry it into the next design decision.') + link('../../','Read the case study'),
        talk:'Duowen helps me carry the original evidence into the next design decision. That is what I wanted to make easier.', cue:'Click Finish to stop the timer.'}),
    ]},
    process: {label:'AI process video', target:'2–3 min · Aim 2:45', min:120, max:180, slides:[
      cover({title:'Designing Duowen with AI', lead:'How the prototype changed when I used it.', section:'AI process video', seconds:15,
        image:shot('mobile.jpg','Duowen’s recording interface on a narrow screen'),
        talk:'I used AI to compare options, build working prototypes, and check the interactions. The decisions that mattered most came from trying the workflow myself.'}),
      slide({title:'Use my own work as the starting point', section:'Discover · What I tried', seconds:27,
        body:bullets(['Reflect on Flighty and Mibly','Compare existing transcription workflows','Use simulations to surface questions']),
        talk:'I looked back at Flighty and Mibly and asked where AI could support how I design. I used AI to compare tools and simulate possible recording workflows. The simulated interviews helped me ask better questions. My own work gave me the concrete need to revisit and verify feedback.'}),
      slide({title:'Choose a smaller problem', section:'Define · My decision', seconds:25,
        body:paragraph('Find the original wording and make it easy to check.') + bullets(['Design critiques and playtests','Readable, editable, timestamped evidence']),
        talk:'There were many things this tool could do, like notes, summaries, or chat. I chose to focus on reviewing the recording and keeping the evidence reusable. That choice gave me a clearer test for each feature. Could it help me locate, verify, or carry a passage forward?'}),
      slide({title:'Critique the working versions', section:'Develop · Where AI helped', seconds:36,
        body:bullets(['Explore library, focus view, and batch notebook','Use Wispr Flow as an interaction reference','Try WhisperX, then ship with Deepgram Nova-3']),
        side:shot('transcript.jpg','The current document-style Duowen transcript'),
        talk:'The agents helped me build different versions quickly. The first transcript view felt like a list of controls, so I asked Claude to study the low-friction feel of Wispr Flow. We moved editing and playback into the text. I tried WhisperX while exploring the backend, then shipped with Deepgram. I still had to decide what felt usable and why.'}),
      slide({title:'Make the handoff explicit', section:'Deliver · Where I had to intervene', seconds:38,
        body:bullets(['Surface Send to AI in the header','List exactly which recordings are included','Test the file and clipboard separately']),
        side:shot('project-pack.jpg','The revised project handoff with a separate copyable prompt'),
        talk:'The earlier version put Send to AI behind three dots and copied the whole project as text. Once I thought about comparing ten sessions, I wanted to see what was included and keep the prompt separate from the source material. Codex built that change and checked the file, clipboard, and narrow layout. I reviewed the version before approving production.'}),
      slide({title:'Where AI fell short', section:'Reflection', seconds:24, closing:true,
        body:paragraph('AI helped me build and check the tool. I still had to choose the workflow and verify the evidence.') + link('../../ai-process.html','Read the AI process reflection'),
        talk:'AI could produce a working feature before the hierarchy made sense. It could also misassign a speaker, which matters when I quote someone. Next I want to take real playtests through the full workflow and compare the AI’s citations with the recording. That will tell me more than a clean export.', cue:'Click Finish to stop the timer.'}),
    ]},
  };
})();
