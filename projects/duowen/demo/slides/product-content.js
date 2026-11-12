window.DUOWEN_PRODUCT = ({app, link, shot, cover, slide}) => {
  const plans = '<div class="plan-comparison">' +
    '<div><h3>Otter Basic</h3><p><strong>30 min</strong> per transcription · 3 lifetime imports</p><small>Pro · $8.49/month on annual billing</small></div>' +
    '<div><h3>Notta Free</h3><p><strong>3 min</strong> per recording · export on Pro</p><small>Pro · $8.17/month on annual billing</small></div>' +
    '<div class="duowen-plan"><h3>Duowen prototype</h3><p><strong>100 MiB</strong> per file · no subscription</p></div></div>';
  const market = slide({
    title:'The cost of getting a transcript', section:'Define · Competitive gap', seconds:31,
    body:'<p class="visual-phrase">Long uploads.<br>Export limits.</p>',
    side:plans,
    talk:'I looked at tools that already do speaker labeling. Otter Basic limits each transcription to thirty minutes and gives you three lifetime imports. Notta Free caps each conversation at three minutes, and transcript export starts on Pro. Both have AI connectors. Duowen’s prototype has no subscription and currently accepts files up to 100 MiB. I wanted a short path from a saved recording to the chat I already use.'
  });
  market.notes += '<p>The upload limit is by file size. For example, a 40-minute MP3 at 128 kbps is roughly 37 MiB. That fits the file limit, but successful transcription of a full class has yet to be verified. Deepgram usage is billed separately to the service account.</p><p>Sources (published US dollar prices): ' +
    '<a href="https://help.otter.ai/hc/en-us/articles/360047538094-Conversation-import-and-app-limits-on-the-Basic-free-plan">Otter Basic limits</a> · <a href="https://otter.ai/pricing">Otter plans</a> · ' +
    '<a href="https://www.notta.ai/en/pricing">Notta plans</a> · ' +
    '<a href="https://help.otter.ai/hc/en-us/articles/35287607569687-Otter-MCP-Server">Otter connector</a> · ' +
    '<a href="https://www.notta.ai/en/features/notta-mcp">Notta connector</a></p>';
  return {label:'Project video', target:'3–4 min · Aim 3:30', min:180, max:240, slides:[
    cover({title:'Duowen 多闻', lead:'From recordings to reviewed context for AI.', section:'Project video', seconds:14,
      image:shot('transcript.jpg','Duowen recording view with timestamps, speaker labels, and audio player'),
      talk:'Duowen is a browser tool for turning an audio or video recording into a transcript I can review and bring to ChatGPT or Claude.'}),
    slide({title:'Who it’s for', section:'Discover · Persona and scenario', seconds:27,
      body:'<p class="visual-phrase">Alex, a design student</p><p class="support-phrase">Classes · critiques · group discussions</p>',
      side:'<figure class="scenario-visual"><strong>40<span>min</span></strong><figcaption>One critique recording</figcaption><p>Feedback · rationale · next decision</p></figure>',
      talk:'Alex represents students like me. Say Alex has a forty-minute recording of a class or team discussion and wants AI to help decide what to do next. Handing over the whole recording can be cumbersome. A transcript makes the material searchable, and Alex can listen back and correct important details before asking AI to interpret them.'}),
    market,
    slide({title:'Three steps in Duowen', section:'Develop · The workflow', seconds:23,
      body:'<ol class="workflow-steps"><li><strong>Upload</strong><span>Audio or video</span></li><li><strong>Review</strong><span>Listen · correct</span></li><li><strong>Send to AI</strong><span>Recording or project</span></li></ol><p class="support-phrase">Production API · Deepgram Nova-3</p>',
      talk:'I kept the workflow to three steps. Upload the recording, review the text, and bring it into a chat. The server uses Deepgram Nova-3 to return speaker labels and timestamps. Those are useful because I can check a passage before it becomes evidence in the AI conversation.'}),
    slide({title:'Review and send a recording', section:'Deliver · Recording view', seconds:55,
      body:'<p class="visual-phrase">Check the audio.<br>Copy to chat.</p>',
      side:shot('recording-send.jpg','Duowen’s single recording Send to AI dialog with copy-and-open actions for Claude and ChatGPT'),
      talk:'In the recording view, I can click a timestamp to hear the source and edit the text before using it. This screenshot shows what opens when I click Send to AI. I can copy the transcript and my prompt together and open Claude or ChatGPT. I paste them into the chat, which saves a separate download and attachment step.',
      cue:'Point to Copy and open Claude or Copy and open ChatGPT in the screenshot.'}),
    slide({title:'Bring several sessions together', section:'Deliver · Project view', seconds:45,
      body:'<p class="visual-phrase">One Markdown file.<br>One editable prompt.</p>',
      side:shot('project-pack.jpg','Duowen project Send to AI dialog with included recordings, Markdown download, and Copy prompt'),
      talk:'For several recordings I use a project. The dialog shows which sessions are included. I download one Markdown file and copy the prompt separately. I attach the file and paste the prompt in my chat. The assistant can refer to the source recording and timestamp when I ask what came up across sessions.',
      cue:'Point to the included recordings, Download Markdown, and Copy prompt in the screenshot.'}),
    slide({title:'Keep the source in the conversation', section:'Deliver · Evaluation', seconds:15, closing:true,
      body:'<div class="project-outcomes"><p><strong>Verified</strong> Live transcription · playback · export</p><p><strong>Next test</strong> Full-length recordings · AI citations</p></div>' + link(app,'Open Duowen'),
      talk:'The biggest advantage is that I can bring reviewed context straight into the chat I use. I verified the live upload and export. My next test is a full-length class and whether the assistant’s citations hold up against the recording.',
      cue:'Click Finish to stop the timer.'}),
  ]};
};
