window.DUOWEN_PROCESS = ({link, shot, paragraph, cover, slide}) => {
  const rows = items => '<dl class="deck-evidence">' + items.map(([name, detail]) =>
    '<div><dt>' + name + '</dt><dd>' + detail + '</dd></div>').join('') + '</dl>';

  return {label:'AI process video', target:'2–3 min · Aim 2:45', min:120, max:180, slides:[
    cover({title:'Building Duowen’s transcription backend', lead:'What I asked AI to research, build, and prove.', section:'AI process video', seconds:15,
      image:shot('transcript.jpg','A timestamped Duowen transcript with speakers and playback'),
      talk:'I had an idea for getting class and discussion recordings into the AI chats I already use. The first thing I needed to prove was that a real recording could go into my website and come back as a transcript.'}),
    slide({title:'What has to come back?', section:'Discover & Define · The requirement', seconds:23,
      body:rows([['Input','An audio or video file'],['Output','Text with timestamps and speaker labels'],['Proof','Upload a new file and play back a returned passage']]),
      talk:'I asked AI to map the full path from an upload to a transcript I could review. A convincing interface was easy to generate. My acceptance test was a fresh file, actual inference, and a response with enough structure to link the words to the audio.'}),
    slide({title:'A skill, an engine, and an API', section:'Develop · Compare the routes', seconds:34,
      body:rows([['Agent skill','Instructions or a wrapper that helps the coding agent use a tool'],['WhisperX','Open-source pipeline I could run on my own machine'],['Hosted speech API','A service my website can call for transcription']]),
      talk:'I used AI to inspect transcription skills, model requirements, and provider documentation. A skill could help the coding agent run a command or call an API. The engine still had to run somewhere. I tried WhisperX locally and compared hosted options. AssemblyAI and OpenAI were research candidates. The project did not run a head-to-head accuracy benchmark.'}),
    slide({title:'WhisperX ran locally', section:'Develop · What worked and what broke', seconds:34,
      body:rows([['Intel Mac','Pinned older dependencies and fixed a runtime conflict'],['Real output','Timestamped text from a 90-second clip'],['What still needed work','Speaker separation and a hosted runtime']]),
      talk:'The current dependency set did not fit my Intel Mac. AI helped me trace the incompatible packages and a runtime conflict. After pinning versions, WhisperX produced timestamped text from a real clip. The browser could also upload a new short file to my local API. It heard Duowen as Duane, and that run left speakers unassigned. Hosting would add compute, setup, and maintenance.'}),
    slide({title:'Why I shipped Deepgram', section:'Deliver · Cost and integration', seconds:36,
      body:rows([['Self-hosted WhisperX','Local compute or a $9/month Hugging Face CPU hosting proposal'],['Hosted APIs','Usage billing · compare speaker labeling and compute costs'],['Production path','Browser upload → Vercel → Nova-3 → Duowen transcript']]),
      talk:'The Hugging Face CPU proposal was nine dollars a month for Pro, plus the work of maintaining the server. With a hosted API I could pay by audio duration. AssemblyAI, for example, lists seventeen or twenty-three cents an hour with speaker labeling. I shipped Nova-3 because I could verify the whole upload path without running a model server. Vercel calls Deepgram and returns the transcript.',
      cue:'Published prices are an example, separate from actual project spend. ' + link('https://huggingface.co/pro','Hugging Face Pro') + ' ' + link('https://www.assemblyai.com/pricing/','AssemblyAI rates') + ' ' + link('https://deepgram.com/pricing','Deepgram rates')}),
    slide({title:'Test the chain with real audio', section:'Deliver · Evaluation & reflection', seconds:23, closing:true,
      body:paragraph('Live upload → two speakers → click-to-play') + paragraph('Next test: full-length recordings and speaker errors.'),
      talk:'A real ninety-second upload returned two speakers, and I verified that clicking text played the corresponding audio. AI helped with research, debugging, and checks. I still had to run real files and judge the result. I have not measured accuracy or speed across full-length sessions.',
      cue:'Click Finish to stop the timer.'}),
  ]};
};
