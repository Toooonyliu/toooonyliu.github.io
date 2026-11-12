window.DUOWEN_PRODUCT = ({app, link, bullets, paragraph, cover, slide}) => {
  const demo = kind => window.DUOWEN_DEMO.render(kind);
  const flow = '<ol class="presentation-flow"><li>Audio or video</li><li>Reviewed transcript</li><li>AI follow-up</li></ol>';
  const plans = '<div class="plan-comparison">' +
    '<div><h3>Otter Basic</h3><p>30 min per transcription · 3 lifetime imports</p><p class="plan-price">Pro: $8.33/month, billed annually</p></div>' +
    '<div><h3>Notta Free</h3><p>3 min per conversation · export on Pro</p><p class="plan-price">Pro: $8.17/month, billed annually</p></div>' +
    '<div class="duowen-plan"><h3>Duowen prototype</h3><p>No subscription · up to 100 MiB per file</p></div></div>';
  const market = slide({
    title:'The cost of getting a transcript', section:'Define · Competitive gap', seconds:31,
    body:paragraph('Longer uploads and usable exports can require a paid plan. Then the transcript still needs to reach the chat.'),
    side:plans,
    talk:'I looked at tools that already do speaker labeling. Otter Basic limits each transcription to thirty minutes and gives you three lifetime imports. Notta Free caps each conversation at three minutes, and transcript export starts on Pro. Both have AI connectors. Duowen’s prototype has no subscription and currently accepts files up to 100 MiB. I wanted a short path from a saved recording to the chat I already use.'
  });
  market.notes += '<p>The upload limit is by file size. For example, a 40-minute MP3 at 128 kbps is roughly 37 MiB. That fits the file limit, but successful transcription of a full class has yet to be verified. Deepgram usage is billed separately to the service account.</p><p>Sources (published US dollar prices): ' +
    '<a href="https://help.otter.ai/hc/en-us/articles/360047538094-Conversation-import-and-app-limits-on-the-Basic-free-plan">Otter Basic limits</a> · <a href="https://otter.ai/pricing">Otter plans</a> · ' +
    '<a href="https://www.notta.ai/en/pricing">Notta plans</a> · ' +
    '<a href="https://help.otter.ai/hc/en-us/articles/35287607569687-Otter-MCP-Server">Otter connector</a> · ' +
    '<a href="https://www.notta.ai/en/features/notta-mcp">Notta connector</a></p>';
  return {label:'Project video', target:'3–4 min · Aim 3:30', min:180, max:240, slides:[
    cover({title:'Duowen 多问', lead:'Turn recordings into context you can review and bring to AI.', section:'Project video', seconds:14,
      image:flow,
      talk:'Duowen is a browser tool for turning an audio or video recording into a transcript I can review and bring to ChatGPT or Claude.'}),
    slide({title:'Who it’s for', section:'Discover · Persona and scenario', seconds:27,
      body:paragraph('Alex, a student who uses AI to make sense of classes, critiques, and group discussions.'),
      side:'<div class="persona-example"><h3>A 40-minute recording</h3><p>Alex needs the feedback, the reasoning behind it, and the next decision.</p></div>',
      talk:'Alex represents students like me. Say Alex has a forty-minute recording of a class or team discussion and wants AI to help decide what to do next. Handing over the whole recording can be cumbersome. A transcript makes the material searchable, and Alex can listen back and correct important details before asking AI to interpret them.'}),
    market,
    slide({title:'Three steps in Duowen', section:'Develop · The workflow', seconds:23,
      body:bullets(['<strong>Upload</strong> a saved audio or video file.','<strong>Review</strong> the transcript against the recording.','<strong>Send to AI</strong> with one recording or a whole project.']) + '<p class="caveat">Production API · Deepgram Nova-3</p>',
      talk:'I kept the workflow to three steps. Upload the recording, review the text, and bring it into a chat. The server uses Deepgram Nova-3 to return speaker labels and timestamps. Those are useful because I can check a passage before it becomes evidence in the AI conversation.'}),
    slide({title:'Review and send a recording', section:'Deliver · Try the recording view', seconds:55,
      body:paragraph('Play a timestamp. Correct a line. Open Send to AI.'),
      side:demo('recording'),
      talk:'Here’s the recording view. I can click a timestamp to hear what was said and edit the line if the transcript got it wrong. Send to AI is right in the header. For one recording, I can copy the transcript and prompt and open Claude or ChatGPT. I paste it in the chat, which saves the separate download and attachment step.',
      cue:'Use the interactive sample on this slide. Click a timestamp, edit a line, then open Send to AI. The sample stays in the deck.'}),
    slide({title:'Bring several sessions together', section:'Deliver · Try the project view', seconds:45,
      body:paragraph('One Markdown attachment. A separate prompt you can edit.'),
      side:demo('project'),
      talk:'For several recordings I use a project. The dialog shows which sessions are included. I download one Markdown file and copy the prompt separately. I attach the file and paste the prompt in my chat. The assistant can refer to the source recording and timestamp when I ask what came up across sessions.',
      cue:'Click Send to AI in the project preview, then show the recording list, Download Markdown, and Copy prompt.'}),
    slide({title:'Keep the source in the conversation', section:'Deliver · Evaluation', seconds:15, closing:true,
      body:bullets(['Live transcription, playback, and project export verified','Next test: full-length recordings and AI citations']) + link(app,'Open the live Duowen app'),
      talk:'The biggest advantage is that I can bring reviewed context straight into the chat I use. I verified the live upload and export. My next test is a full-length class and whether the assistant’s citations hold up against the recording.',
      cue:'Click Finish to stop the timer.'}),
  ]};
};
