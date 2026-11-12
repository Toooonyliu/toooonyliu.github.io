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
      talk:'Duowen is a website that turns recorded classes and critiques into transcripts I can check before sharing them with AI. I built it so I could go back to the exact wording of design feedback.'}),
    slide({title:'Making transcription work on the website', section:'Define · The job I gave the agents', seconds:25,
      body:stages([['Upload','A real audio or video file'],['Transcribe','Turn speech into text'],['Show','Who spoke and when']]),
      talk:'The biggest thing I asked Claude and Codex to do was help me find a transcription tool and get it working on the website. I needed the site to take a real audio or video file and show me the words, who said them, and when.'}),
    slide({title:'WhisperX and Deepgram', section:'Develop · Trying two ways to transcribe', seconds:27,
      body:stages([['Skill','Instructions for the agent'],['WhisperX','Transcription on my Mac'],['Deepgram','Transcription on the live site']]),
      talk:'I asked the agents to look for free transcription skills. A skill tells the agent how to run a tool. We tried WhisperX, which turns speech into text with timestamps. It crashed on my Mac, and the agent helped me get it running. For the live site, I chose Deepgram, a service that transcribes recordings online. Claude helped me deploy with it enabled.'}),
    slide({title:'What people wanted to check', section:'Evaluate · In-person playtest', seconds:27,
      body:`<dl class="process-comparison">
        <div><dt>My starting point</dt><dd>Get the transcript into an AI chat</dd></div>
        <div><dt>Playtest feedback</dt><dd>See who said what and when. Catch mistakes first.</dd></div>
      </dl>`,
      talk:'I was focused on getting the transcript into AI. In an in-person playtest, I gave people transcript files to try. They wanted to look through them first. They wanted to see who spoke when, and spot anything that looked wrong before sending it on. That made the review step much more important to me.'}),
    slide({title:'Review before sending', section:'Design · The review screen', seconds:30,
      body:`<ul class="process-review-actions">
        <li>Scan speaker turns</li><li>Replay a line</li><li>Correct the text</li>
      </ul>`,
      side:`<figure class="deck-image">
        <img src="../../images/transcript.jpg" alt="Duowen review screen with color-coded speaker turns, timestamps, a player, and Send to AI">
        <figcaption>Duowen review screen · Example transcript</figcaption>
      </figure>`,
      talk:'Here’s what that looks like in Duowen. The colors separate speakers, and each turn has a timestamp. If a line looks wrong, I can click to hear it and edit the text. Then Send to AI is right here, so I can share the version I’ve checked.',
      cue:'Point to a speaker label, its timestamp, and then Send to AI.'}),
    slide({title:'Testing with a real recording', section:'Deliver · Live test', seconds:21, closing:true,
      body:`${stages([['Live upload','90-second clip'],['Transcript','Two speaker labels'],['Playback','Jump to a line']])}
        <p class="process-next"><strong>Next test</strong> Review and correct a full class recording</p>`,
      talk:'On the live site, a real ninety-second upload came back with two speaker labels. Clicking a line played the matching audio. My next test is a full class recording. I want to see which mistakes people spot and whether they can fix them before sharing.',
      cue:'Click Finish to stop the timer.'}),
  ]};
};
