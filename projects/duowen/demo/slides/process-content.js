window.DUOWEN_PROCESS = ({link, cover, slide}) => {
  const stages = items => `<ol class="process-stages">${items.map(([label, detail]) => `
    <li><span>${label}</span><strong>${detail}</strong></li>`).join('')}</ol>`;
  const prices = [
    ['AssemblyAI', 'Universal-2', '0.17', 55],
    ['AssemblyAI', 'Universal-3.5 Pro', '0.23', 74],
    ['Deepgram · shipped', 'Nova-3 Multilingual', '0.31', 100],
  ];

  return {label:'AI process video', target:'2–3 min · Aim 2:45', min:120, max:180, slides:[
    cover({title:'Building Duowen’s transcription backend', lead:'A working path from upload to transcript.', section:'AI process video', seconds:15,
      image:`<figure class="process-cover-visual" aria-label="Browser upload through a speech API to an editable transcript">
        <div class="process-waveform" aria-hidden="true">${[22, 39, 62, 28, 82, 50, 98, 63, 32, 66, 87, 44, 60, 27, 48, 22].map(height =>
          `<i style="--wave-height:${height}%"></i>`).join('')}</div>
        ${stages([['Browser','Upload'],['Server','Speech API'],['Editor','Transcript']])}
      </figure>`,
      talk:'I knew what I wanted Duowen to do: drop in a class recording and get a transcript I could check and share with AI. I didn’t know what had to happen after I clicked Upload.'}),
    slide({title:'What has to come back?', section:'Discover & Define · The requirement', seconds:23,
      body:stages([['Input','Audio or video'],['Output','Text · speakers · timestamps'],['Proof','Playback from a line']]),
      talk:'Claude and Codex helped me work backward from what I wanted to see on the page. I needed to drop in a real file, see who said what and when, and click a line to hear it. Now I had a simple test for whether the site actually worked.'}),
    slide({title:'A skill, an engine, and an API', section:'Develop · Compare the routes', seconds:34,
      body:`<dl class="process-layers">
        <div><dt>Agent skill</dt><dd>Instructions for the coding agent</dd></div>
        <div><dt>Local engine</dt><dd>Speech recognition on my Mac</dd><dd class="process-layer-name">WhisperX</dd></div>
        <div><dt>Hosted API</dt><dd>Speech recognition on a provider’s server</dd><dd class="process-layer-name">Deepgram</dd></div>
      </dl>`,
      talk:'My first thought was, can I find a free skill that already does this? I asked a coding agent to look through public transcription skills and tell me what each one actually ran. Some pointed to tools I’d install myself. Others called paid APIs. That helped me see what I needed: something to do the actual transcription. I could run WhisperX on my Mac, or send the file to a service like Deepgram.'}),
    slide({title:'WhisperX ran locally', section:'Develop · What worked and what broke', seconds:34,
      body:`<div class="process-local">
        <div class="process-local-result"><strong>90<span> sec</span></strong><p>Real clip · timestamped text</p></div>
        <dl class="process-local-facts">
          <div><dt>Intel Mac</dt><dd>Compatible dependencies pinned</dd></div>
          <div><dt>Still needed</dt><dd>Speaker labels · deployment</dd></div>
        </dl>
      </div>`,
      talk:'I tried WhisperX first, and it kept crashing on my Intel Mac. I gave the agent the error messages, and it helped me find versions that worked together. We finally got words and timestamps out of a real recording. That was progress, but that run didn’t tell me who was speaking. And I still had to figure out how someone opening my website could use it.'}),
    slide({title:'Which model did I ship?', section:'Deliver · API and cost comparison', seconds:36,
      body:`<figure class="process-prices">
        <figcaption>USD per audio hour · speaker labels included</figcaption>
        <dl>${prices.map(([provider, model, price, width]) => `
          <div><dt><span>${provider}</span>${model}</dt>
            <dd><span class="process-price-track" aria-hidden="true"><i style="--price-width:${width}%"></i></span><strong>$${price}</strong></dd></div>`).join('')}
        </dl>
      </figure>`,
      talk:'I looked at the costs here, then chose Deepgram Nova-3 so I wouldn’t have to run my own model server. Vercel hosts the site. It sends the uploaded file to Deepgram and shows the transcript that comes back. Claude found a setting we had to carry over when we deployed. Without it, the page could load and transcription still wouldn’t work. With that in place, the site worked even with my laptop closed.',
      cue:'US pay-as-you-go rates for prerecorded audio with diarization. Deepgram lists $0.0052 per audio minute. A 40-minute example is $0.208 before credits or infrastructure, separate from actual project spend. ' + link('https://huggingface.co/pro','Hugging Face Pro') + ' ' + link('https://www.assemblyai.com/pricing/','AssemblyAI rates') + ' ' + link('https://deepgram.com/pricing','Deepgram rates')}),
    slide({title:'Test the chain with real audio', section:'Deliver · Evaluation & reflection', seconds:23, closing:true,
      body:`${stages([['Live upload','90-second clip'],['Transcript','Two speaker labels'],['Playback','Click-to-play']])}
        <p class="process-next"><strong>Next test</strong> Full-length recordings · word and speaker errors</p>`,
      talk:'We uploaded a real ninety-second clip on the live site. It came back with two speaker labels, and clicking a line played the right part. AI helped me get to that test. I still had to listen and judge what came back, and I’d want to do that with a full class next.',
      cue:'Click Finish to stop the timer.'}),
  ]};
};
