window.DUOWEN_PROCESS = ({cover, slide}) => {
  const stages = items => `<ol class="process-stages">${items.map(([label, detail]) => `
    <li><span>${label}</span><strong>${detail}</strong></li>`).join('')}</ol>`;

  return {label:'AI process video', target:'2–3 min · Aim 2:25', min:120, max:180, slides:[
    cover({title:'How I built Duowen', lead:'Turn recordings into transcripts you can check and share with AI.', section:'AI process video', seconds:15,
      image:`<figure class="process-cover-visual" aria-label="Review a recording before sharing it with AI">
        <div class="process-waveform" aria-hidden="true">${[22, 39, 62, 28, 82, 50, 98, 63, 32, 66, 87, 44, 60, 27, 48, 22].map(height =>
          `<i style="--wave-height:${height}%"></i>`).join('')}</div>
        ${stages([['Record','Capture'],['Transcript','Review'],['AI chat','Share']])}
      </figure>`,
      talk:'Duowen is a website that turns recordings of classes and design critiques into transcripts I can check and share with AI. I built it to revisit the exact feedback before deciding what to change.'}),
    slide({title:'Making transcription work on the website', section:'Define · The job I gave the agents', seconds:25,
      body:stages([['Upload','A real audio or video file'],['Transcribe','Turn speech into text'],['Show','Who spoke and when']]),
      talk:'The hardest part was making the website transcribe a real upload. I asked Claude and Codex to help me find a tool, try it, and connect it to the website. I needed the result to show the words, who said them, and when.'}),
    slide({title:'WhisperX and Deepgram', section:'Develop · Trying two ways to transcribe', seconds:27,
      body:stages([['Skill','Instructions for the agent'],['WhisperX','Transcription on my Mac'],['Deepgram','Transcription on the live site']]),
      talk:'I asked the agents to find free transcription skills, which give them instructions for using tools. We tried WhisperX, a tool that turns speech into text with timestamps. It crashed on my Mac, and an agent helped me fix the setup. For the live site, I chose Deepgram to transcribe files on its servers. Claude helped me get that working on Vercel.'}),
    slide({title:'What people wanted to check', section:'Evaluate · In-person playtest', seconds:27,
      body:`<dl class="process-comparison">
        <div><dt>My starting point</dt><dd>Get the transcript into an AI chat</dd></div>
        <div><dt>Playtest feedback</dt><dd>See who said what and when. Catch mistakes first.</dd></div>
      </dl>`,
      talk:'I gave people the transcript files to try in person. I’d been focused on getting the text into an AI chat. They wanted to read it first, see who said what and when, and spot anything that looked wrong. That told me the review step had to be easy.'}),
    slide({title:'Review before sending', section:'Design · The review screen', seconds:30,
      body:`<ul class="process-review-actions">
        <li>Scan speaker turns</li><li>Replay a line</li><li>Correct the text</li>
      </ul>`,
      side:`<figure class="deck-image">
        <img src="../../images/transcript.jpg" alt="Duowen review screen with color-coded speaker turns, timestamps, a player, and Send to AI">
        <figcaption>Duowen review screen · Example transcript</figcaption>
      </figure>`,
      talk:'On this screen, the colors separate speakers, and the timestamps show when each person spoke. If something looks off, I can click the line, hear the original audio, and fix the text. Then I can use Send to AI with a transcript I’ve checked.',
      cue:'Point to a speaker label, its timestamp, and then Send to AI.'}),
    slide({title:'Testing with a real recording', section:'Deliver · Live test', seconds:21, closing:true,
      body:`${stages([['Live upload','90-second clip'],['Transcript','Two speaker labels'],['Playback','Jump to a line']])}
        <p class="process-next"><strong>Next test</strong> Review and correct a full class recording</p>`,
      talk:'A real ninety-second upload returned two speaker labels, and clicking a line played the matching audio. AI helped me build and debug that path. I still had to listen back and see what people needed from the transcript. My next test is a full class recording.',
      cue:'Click Finish to stop the timer.'}),
  ]};
};
