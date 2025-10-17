# Quest 3 AR PDF + Voice AI (Gemini/OpenAI)

This is a lightweight **AR-style WebXR** viewer for Meta Quest 3 passthrough. It renders the first 3 pages of your PDF as floating panels and lets you **hold-to-speak** to ask an AI about the guide. Answers are read aloud (TTS).

- **index.html** — WebXR scene (A-Frame)
- **app.js** — PDF.js rendering + voice + fetch to `/api/ask`
- **/api/ask.js** — Vercel serverless proxy (keeps your API keys **server-side**)
- **styles.css** — HUD styling

### 1) Deploy on Vercel
1. Create a new Vercel project from this folder (or `vercel deploy`).
2. In **Vercel → Project → Settings → Environment Variables**, add one of:
   - `GEMINI_API_KEY = <your-key>`
   - or `OPENAI_API_KEY = <your-key>`
3. Deploy. Your site will be `https://<project>.vercel.app`.

### 2) Use it on Quest 3
- Open your site in the **Quest Browser**.
- Meta button → **Quick Settings → Passthrough ON**.
- Pin the window.
- Press **Hold to Ask** and ask questions about the visible guide.
- Toggle **Gemini/OpenAI** from the dropdown.

### 3) Change the PDF
- Paste a new PDF URL (e.g., a Google Drive *direct* link: `https://drive.google.com/uc?export=download&id=<FILE_ID>`) and click **Load**.

### Notes
- Voice uses the **Web Speech API**. If your browser doesn’t support it, you can type questions by adapting `askBtn` logic.
- The app extracts text from the first 3 pages for context. Increase pages by adding more canvases and loops in `app.js`.
- Keep API keys **only** in the serverless function. Never ship them in client code.
