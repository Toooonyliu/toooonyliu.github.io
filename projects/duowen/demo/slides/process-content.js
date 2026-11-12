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
      talk:'I had an idea for getting class and discussion recordings into the AI chats I already use. The first thing I needed to prove was that a real recording could go into my website and come back as a transcript.'}),
    slide({title:'What has to come back?', section:'Discover & Define · The requirement', seconds:23,
      body:stages([['Input','Audio or video'],['Output','Text · speakers · timestamps'],['Proof','Playback from a line']]),
      talk:'I asked AI to map the full path from an upload to a transcript I could review. A convincing interface was easy to generate. My acceptance test was a fresh file, actual inference, and a response with enough structure to link the words to the audio.'}),
    slide({title:'A skill, an engine, and an API', section:'Develop · Compare the routes', seconds:34,
      body:`<dl class="process-layers">
        <div><dt>Agent skill</dt><dd>Instructions for the coding agent</dd></div>
        <div><dt>Local engine</dt><dd>Speech recognition on my Mac</dd><dd class="process-layer-name">WhisperX</dd></div>
        <div><dt>Hosted API</dt><dd>Speech recognition on a provider’s server</dd><dd class="process-layer-name">Deepgram</dd></div>
      </dl>`,
      talk:'I used AI to inspect transcription skills, model requirements, and provider documentation. A skill could help the coding agent run a command or call an API. The engine still had to run somewhere. I tried WhisperX locally and compared hosted options. AssemblyAI and OpenAI were research candidates. The project did not run a head-to-head accuracy benchmark.'}),
    slide({title:'WhisperX ran locally', section:'Develop · What worked and what broke', seconds:34,
      body:`<div class="process-local">
        <div class="process-local-result"><strong>90<span> sec</span></strong><p>Real clip · timestamped text</p></div>
        <dl class="process-local-facts">
          <div><dt>Intel Mac</dt><dd>Compatible dependencies pinned</dd></div>
          <div><dt>Still needed</dt><dd>Speaker labels · deployment</dd></div>
        </dl>
      </div>`,
      talk:'The current dependency set did not fit my Intel Mac. AI helped me trace the incompatible packages and a runtime conflict. After pinning versions, WhisperX produced timestamped text from a real clip. The browser could also upload a new short file to my local API. It heard Duowen as Duane, and that run left speakers unassigned. Hosting would add compute, setup, and maintenance.'}),
    slide({title:'Which model did I ship?', section:'Deliver · API and cost comparison', seconds:36,
      body:`<figure class="process-prices">
        <figcaption>USD per audio hour · speaker labels included</figcaption>
        <dl>${prices.map(([provider, model, price, width]) => `
          <div><dt><span>${provider}</span>${model}</dt>
            <dd><span class="process-price-track" aria-hidden="true"><i style="--price-width:${width}%"></i></span><strong>$${price}</strong></dd></div>`).join('')}
        </dl>
      </figure>`,
      talk:'The WhisperX hosting proposal was nine dollars per month for Hugging Face Pro, plus maintenance. I also priced AssemblyAI Universal-2 and Universal-3.5 Pro with speaker labels. I shipped Deepgram Nova-3 Multilingual. It returned timestamps and speaker groups through the hosted API I verified on Vercel, without a model server to maintain. At the published rate, a forty-minute recording is about twenty-one cents in Deepgram usage. The prototype has no subscription for visitors.',
      cue:'US pay-as-you-go rates for prerecorded audio with diarization. Deepgram lists $0.0052 per audio minute. A 40-minute example is $0.208 before credits or infrastructure, separate from actual project spend. ' + link('https://huggingface.co/pro','Hugging Face Pro') + ' ' + link('https://www.assemblyai.com/pricing/','AssemblyAI rates') + ' ' + link('https://deepgram.com/pricing','Deepgram rates')}),
    slide({title:'Test the chain with real audio', section:'Deliver · Evaluation & reflection', seconds:23, closing:true,
      body:`${stages([['Live upload','90-second clip'],['Transcript','Two speaker labels'],['Playback','Click-to-play']])}
        <p class="process-next"><strong>Next test</strong> Full-length recordings · word and speaker errors</p>`,
      talk:'A real ninety-second upload returned two speakers, and I verified that clicking text played the corresponding audio. AI helped with research, debugging, and checks. I still had to run real files and judge the result. I have not measured accuracy or speed across full-length sessions.',
      cue:'Click Finish to stop the timer.'}),
  ]};
};
