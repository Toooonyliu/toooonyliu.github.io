window.DUOWEN_PROCESS = ({cover, slide}) => {
  const stages = items => `<ol class="process-stages">${items.map(([label, detail]) => `
    <li><span>${label}</span><strong>${detail}</strong></li>`).join('')}</ol>`;

  return {label:'AI process video', target:'2–3 min · Aim 2:25', min:120, max:180, slides:[
    cover({title:'How I built Duowen', lead:'Revisiting design feedback with AI.', section:'AI process video', seconds:15,
      image:`<figure class="process-cover-visual" aria-label="Review a recording before sharing it with AI">
        <div class="process-waveform" aria-hidden="true">${[22, 39, 62, 28, 82, 50, 98, 63, 32, 66, 87, 44, 60, 27, 48, 22].map(height =>
          `<i style="--wave-height:${height}%"></i>`).join('')}</div>
        ${stages([['Record','Capture'],['Transcript','Review'],['AI chat','Share']])}
      </figure>`,
      talk:'I built Duowen for a moment in my design process: going back to feedback after a class or a critique, then bringing it into an AI conversation.'}),
    slide({title:'Revisiting feedback after a critique', section:'Discover & Define', seconds:25,
      body:'<p class="visual-phrase">I need the exact wording to decide what to change.</p>' +
        stages([['Find','The feedback'],['Check','The original audio'],['Share','The context with AI']]),
      talk:'When I work from my notes, I can miss the exact wording that matters for my next design decision. I wanted to drop in the recording, find the part I needed, and check it against the audio before I asked AI what to do next.'}),
    slide({title:'Getting transcription to work', section:'Develop · Building with AI', seconds:27,
      body:stages([['Research','Free transcription skills'],['Prototype','WhisperX on my Mac'],['Deploy','Deepgram on Vercel']]),
      talk:'I asked coding agents to find free transcription skills and check what they actually ran. They helped me get WhisperX working on my Mac after it crashed. For the live site, I picked Deepgram, and Claude helped me deploy with the Vercel build setting that connects the site to Deepgram.'}),
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
