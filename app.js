// Minimal AR-like PDF viewer + voice Q&A on Quest 3
const statusEl = document.getElementById('status');
const askBtn = document.getElementById('askBtn');
const muteBtn = document.getElementById('muteBtn');
const providerEl = document.getElementById('provider');
const pdfUrlEl = document.getElementById('pdfUrl');
const loadPdfBtn = document.getElementById('loadPdf');

let speaking = true;
let docText = '';

function setStatus(msg) {
  statusEl.textContent = msg;
}

// Load and render first 3 pages to canvas textures
async function loadPdf(url) {
  try {
    setStatus('Loading PDF...');
    const loadingTask = pdfjsLib.getDocument({ url });
    const pdf = await loadingTask.promise;
    setStatus('Rendering pages...');

    const maxPages = Math.min(3, pdf.numPages);
    docText = '';

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);

      // Render to canvas as texture
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.getElementById('page' + i);
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Extract text content to build context for AI
      const textContent = await page.getTextContent();
      docText += textContent.items.map(it => it.str).join(' ') + '\n\n';
    }

    setStatus('Ready.');
  } catch (e) {
    console.error(e);
    setStatus('Error loading PDF.');
    alert('Failed to load PDF: ' + e.message);
  }
}

loadPdfBtn.addEventListener('click', () => loadPdf(pdfUrlEl.value));

// Initial load with default link
loadPdf(pdfUrlEl.value);

// Voice capture via Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;

function speak(text) {
  if (!speaking) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.0;
  synth.cancel();
  synth.speak(u);
}

muteBtn.addEventListener('click', () => {
  speaking = !speaking;
  muteBtn.textContent = speaking ? '🔈 Mute TTS' : '🔇 Unmute TTS';
  if (!speaking) speechSynthesis.cancel();
});

let rec;
if (SpeechRecognition) {
  rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
} else {
  askBtn.disabled = true;
  setStatus('Voice not supported in this browser.');
}

let isHolding = false;
askBtn.addEventListener('mousedown', () => startAsk());
askBtn.addEventListener('touchstart', () => startAsk());
askBtn.addEventListener('mouseup', () => stopAsk());
askBtn.addEventListener('mouseleave', () => stopAsk());
askBtn.addEventListener('touchend', () => stopAsk());

function startAsk() {
  if (!rec) return;
  isHolding = true;
  setStatus('Listening...');
  rec.start();
}

function stopAsk() {
  if (!rec) return;
  if (isHolding) {
    isHolding = false;
    try { rec.stop(); } catch {}
  }
}

if (rec) {
  rec.onresult = async (evt) => {
    const q = evt.results[0][0].transcript;
    setStatus('Heard: ' + q);
    document.getElementById('assistantText').setAttribute('value', 'You: ' + q);
    const answer = await askAI(q, docText);
    document.getElementById('assistantText').setAttribute('value', answer.slice(0, 200));
    speak(answer);
    setStatus('Ready.');
  };
  rec.onerror = (e) => setStatus('Voice error: ' + e.error);
}

// Call serverless proxy to Gemini/OpenAI with doc context
async function askAI(question, context) {
  try {
    setStatus('Thinking...');
    const provider = providerEl.value;
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        question,
        context: context.slice(0, 15000) // send up to ~15k chars
      })
    });
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    return data.answer || 'No answer.';
  } catch (e) {
    console.error(e);
    return 'Sorry, I had trouble answering that.';
  }
}
