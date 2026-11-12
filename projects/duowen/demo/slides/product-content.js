window.DUOWEN_PRODUCT = ({app, link, shot, cover, slide}) => {
  const competitors = `<dl class="competitor-list">
    <div><dt>Otter</dt><dd>Searchable meeting notes · AI summaries</dd></div>
    <div><dt>Notta</dt><dd>Audio and video transcription · editing and export</dd></div>
    <div><dt>Fireflies</dt><dd>Meeting capture · summaries and action items</dd></div>
  </dl>`;
  const market = slide({
    title:'Transcription tools I looked at', section:'Define · Competitive analysis', seconds:31,
    body:'<p class="visual-phrase">From a transcript to the next project decision.</p>',
    side:competitors,
    talk:'I looked at Otter for searchable meeting notes, Notta for turning saved audio and video into editable transcripts, and Fireflies for capturing meetings and tracking follow-ups. These products helped me see what people can do once they have a transcript. I built Duowen around Alex’s recurring workflow. He can check the source, then bring reviewed context into the AI chat he already uses.'
  });
  market.notes += '<p>Product references · ' +
    '<a href="https://otter.ai/">Otter</a> · ' +
    '<a href="https://www.notta.ai/en/tools/audio-to-text-converter">Notta</a> · ' +
    '<a href="https://fireflies.ai/">Fireflies</a></p>';
  return {label:'Project video', target:'3–4 min · Aim 3:30', min:180, max:240, slides:[
    cover({title:'Duowen 多闻', lead:'From recordings to reviewed context for AI.', section:'Project video', seconds:14,
      image:shot('transcript.jpg','Duowen recording view with timestamps, speaker labels, and audio player'),
      talk:'Duowen is a browser tool for turning an audio or video recording into a transcript I can review and bring to ChatGPT or Claude.'}),
    slide({title:'Who it’s for', section:'Discover · Persona and scenario', seconds:27,
      body:'<p class="visual-phrase">Alex, a design student</p><p class="support-phrase">Records classes, discussions, and meetings throughout a project</p>',
      side:`<dl class="persona-needs">
        <div><dt>Recover the exact wording</dt><dd>Trace feedback back to the recording</dd></div>
        <div><dt>Keep AI agents up to date</dt><dd>Share new context as the project changes</dd></div>
      </dl>`,
      talk:'Alex records classes, discussions, and meetings throughout a project. He wants to recover the exact wording and trace it back to the recording. He also regularly shares transcripts with his AI agents. When a critique changes the brief, the next AI conversation can start with what actually changed.'}),
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
