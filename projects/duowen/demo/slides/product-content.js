window.DUOWEN_PRODUCT = function ({app, link, shot, bullets, paragraph, cover, slide}) {
  const marketSources = '<p>Plan and connector details are from the providers’ documentation. ' +
    '<a href="https://help.otter.ai/hc/en-us/articles/360047538094-Conversation-import-and-app-limits-on-the-Basic-free-plan">Otter Basic limits</a> · ' +
    '<a href="https://www.notta.ai/en/pricing">Notta plans</a> · ' +
    '<a href="https://help.otter.ai/hc/en-us/articles/35287607569687-Otter-MCP-Server">Otter connectors</a> · ' +
    '<a href="https://www.notta.ai/en/features/notta-mcp">Notta connectors</a></p>';
  const planComparison = '<div class="cue-card"><h3>Otter Basic</h3>' +
    '<p>30 minutes per transcription. Three lifetime file imports.</p></div>' +
    '<div class="cue-card"><h3>Notta Free</h3>' +
    '<p>Three minutes per recording. Transcript export starts on Pro.</p></div>';

  const market = slide({
    title: 'The handoff after transcription',
    section: 'Define · Competitive gap',
    seconds: 35,
    body: paragraph('I wanted to move from a recording I already had to the AI chat I already use.'),
    side: '<div>' + planComparison + '</div>',
    talk: 'Otter and Notta both offer speaker labels. Their free plans put different limits on a long class recording, and some export features sit on paid plans. Both companies also offer AI connectors that require account setup. I chose a recording-first workflow. The user can review the text and bring it into a chat through copy and paste or a Markdown attachment.',
  });
  market.notes += marketSources;

  return {
    label: 'Project video',
    target: '3–4 min · Aim 3:30',
    min: 180,
    max: 240,
    slides: [
      cover({
        title: 'Duowen 多问',
        lead: 'Bring a class or discussion recording into the AI chat you already use.',
        section: 'Project video',
        seconds: 15,
        image: shot('transcript.jpg', 'Duowen transcript with speaker labels, timestamps, and audio controls'),
        talk: 'After a class or a discussion, I often want AI to help me make sense of what happened. I built Duowen to turn a recording into context I can bring into the chat where I’m already working.',
      }),
      slide({
        title: 'After a design class',
        section: 'Discover · Target user and scenario',
        seconds: 25,
        body: paragraph('Students who use AI to review classes, critiques, or group discussions.'),
        side: '<div class="cue-card"><h3>A recorded critique</h3><p>What feedback did I get? What should I try next?</p></div>',
        talk: 'I’m the first user. Imagine I leave a forty-minute design critique with a recording and a few notes. I remember the general feedback, but I miss details that would change what I do next. I want to use the recording to give AI enough context to summarize the discussion and help me decide how to revise the design.',
      }),
      market,
      slide({
        title: 'Upload, review, share',
        section: 'Develop · The workflow',
        seconds: 20,
        body: bullets([
          '<strong>Upload</strong> an audio or video file you have permission to use.',
          '<strong>Review</strong> speakers and timestamps against the audio.',
          '<strong>Share</strong> one recording or a project with the AI you use.',
        ]),
        talk: 'I designed three steps around that need. Upload a saved recording, review what the transcription got right or wrong, and prepare it for an AI chat. Keeping the speaker labels and timestamps makes the text easier to check.',
      }),
      slide({
        title: 'One recording into a chat',
        section: 'Deliver · Single-recording demo',
        seconds: 55,
        body: bullets(['Find and play a passage', 'Choose Copy and open Claude or ChatGPT', 'Paste the transcript and your prompt']) + link(app, 'Open Duowen'),
        side: shot('transcript.jpg', 'Recording page with the Send to AI control in the header'),
        talk: 'Deepgram Nova-3 transcribes the uploaded file. On the recording page, I can search, play the source from a timestamp, and edit the text. I open Send to AI and choose my assistant. Duowen copies the transcript and my prompt together and opens a new chat. I paste them into the composer. For one recording, that saves me from creating and reattaching a file.',
        cue: 'Prepare a shareable example recording in Duowen before recording. Show one timestamp and Send to AI. Use a test chat if you demonstrate the paste.',
      }),
      slide({
        title: 'Several sessions in one file',
        section: 'Deliver · Project demo',
        seconds: 45,
        body: bullets(['Check which recordings are included', 'Download and attach one Markdown file', 'Copy and paste the analysis prompt']) + link(app, 'Open Duowen'),
        side: shot('project-pack.jpg', 'Project dialog showing included recordings, Markdown download, and Copy prompt'),
        talk: 'For several classes or playtests, I group the recordings in a project. I can see which transcripts are included before I download one Markdown file. In Claude or ChatGPT, I attach that file and paste the analysis prompt separately. I can ask what themes appeared across sessions and request titles and timestamps so I can check the evidence.',
        cue: 'Show the included recordings, Download Markdown, and Copy prompt. Return to the deck to finish.',
      }),
      slide({
        title: 'What worked in the prototype',
        section: 'Deliver · Evaluation',
        seconds: 15,
        closing: true,
        body: bullets(['Live transcription, playback, and project export', 'Ordered export of ten synthetic transcripts']),
        talk: 'The working prototype lets me check the words before handing them off to AI. I verified the live export and prompt copy. My next test is a full class recording followed by checking the assistant’s citations against the audio.',
        cue: 'Click Finish to stop the timer.',
      }),
    ],
  };
};
