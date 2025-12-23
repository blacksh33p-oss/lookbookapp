<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1jfvRKZiufEe4sDygUQe60fEbn8ieRkhJ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure your Gemini API key:
   - **Serverless API (required):** set `API_KEY` for the serverless function runtime (e.g., Vercel/Netlify function env vars). The `/api/generate` handler reads `process.env.API_KEY`.
   - **Client fallback (optional):** if you still rely on client-side env injection, the app will also look for `VITE_API_KEY`, `VITE_GOOGLE_API_KEY`, or `VITE_GEMINI_API_KEY` and map one of them to `process.env.API_KEY` in the browser.

   Minimal `.env.local` example (for local dev):
   ```bash
   # Used by the serverless API
   API_KEY=your_gemini_api_key

   # Optional: client-side fallback (only if you need it)
   # VITE_GEMINI_API_KEY=your_gemini_api_key
   ```
3. Run the app:
   `npm run dev`
