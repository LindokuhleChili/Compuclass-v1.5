# gemini-proxy

Keeps the Gemini API key on the server. The app calls this function with the
user's Supabase session. The function checks that a real user is signed in,
validates and rate-limits the request (chat: 10/min per user, quiz: 5 per
10 min per user), and calls Gemini with a secret key.

The app always calls this function. It does not read `EXPO_PUBLIC_GEMINI_API_KEY`.
The function reads `GEMINI_API_KEY`, then `Compuclass-gemini-new` when that is unset.
This project stores the key under `Compuclass-gemini-new`. AI chat and quiz generation
fail until the function is deployed where one of those secrets is set.

## Switch-over (in this order)

Run these from `CompuClass-v.1.0-main/`. They need the
[Supabase CLI](https://supabase.com/docs/guides/cli).

1. **Create a new Gemini key** in Google AI Studio / Google Cloud. The current
   key has already shipped in public builds, so treat it as compromised.
   In Google Cloud, also set a daily quota on the new key as a hard cost cap.
2. **Store it as a function secret.** `GEMINI_API_KEY` is read first.
   `Compuclass-gemini-new` is used when `GEMINI_API_KEY` is unset. The live
   project already uses `Compuclass-gemini-new`.
   ```sh
   supabase secrets set Compuclass-gemini-new=<new key> --project-ref qdtbmdsssjmapodladcs
   # optional; defaults to gemini-2.5-flash when GEMINI_MODEL is not set
   supabase secrets set GEMINI_MODEL=<model name> --project-ref qdtbmdsssjmapodladcs
   ```
3. **Deploy:**
   ```sh
   supabase functions deploy gemini-proxy --project-ref qdtbmdsssjmapodladcs
   ```
4. **Remove `EXPO_PUBLIC_GEMINI_API_KEY` and `EXPO_PUBLIC_USE_AI_PROXY`** from
   `.env`, EAS, Vercel, and GitHub Actions if they are still set. The app does
   not read them. Test the chatbot and AI quiz generation after the deploy.
5. **Revoke the old key** in Google Cloud.

## Logs

Dashboard → Edge Functions → gemini-proxy → Logs. Each line is JSON, with
`event` set to one of: `unauthenticated_request`, `invalid_request`,
`rate_limited`, `ai_request_failed`, or `ai_request_ok`. Lines include the
user id and client IP where available. The Gemini key is sent in a request
header, not the URL, and any copy of it is replaced with `[redacted]` before
a line is written.

## Limits

The per-user rate limit is kept in memory for each function instance. It stops
bursts from one user, but it isn't an exact global quota. The Google Cloud key
quota from step 1 is the hard backstop.
