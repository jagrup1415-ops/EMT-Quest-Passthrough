// Vercel serverless function for Gemini or OpenAI Q&A
// Store one of these in your Vercel project settings:
// - GEMINI_API_KEY
// - OPENAI_API_KEY
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { provider = 'gemini', question = '', context = '' } = req.body || {};
  try {
    if (!question) return res.status(400).json({ error: 'Missing question' });

    if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
      const body = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert assistant answering questions strictly from the provided user guide context. If the answer is not in context, say so briefly.' },
          { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }
        ],
        temperature: 0.2
      };
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body)
      });
      const json = await r.json();
      const answer = json.choices?.[0]?.message?.content || 'No answer';
      return res.status(200).json({ answer });
    } else {
      // Gemini default
      const key = process.env.GEMINI_API_KEY;
      if (!key) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
      const payload = {
        contents: [{
          role: 'user',
          parts: [{ text: `Answer based only on this context. If not present, say you cannot find it.\n\nContext:\n${context}\n\nQuestion: ${question}` }]
        }],
        generationConfig: { temperature: 0.2 }
      };
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await r.json();
      const answer = json.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer';
      return res.status(200).json({ answer });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
