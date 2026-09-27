# HW4 integration

Backend deployed: https://ask-backend-s507.onrender.com

Backend repository: https://github.com/Toooonyliu/Ask-backend

The frontend configuration now points to this service.

The separate backend lives in the sibling `ask-backend` workspace folder and should be published as a new public GitHub repository. It provides `GET /health`, `GET /api/calendar?date=YYYY-MM-DD`, and `POST /api/reading`.

`backend-config.js` automatically uses http://127.0.0.1:5050 on localhost. Set `DEPLOYED_BACKEND_URL` to the verified Render base URL before publishing the frontend. The deployed URL is configured.

`backend-api.js` sends date/time/time-zone input using browser fetch, checks JSON responses, and exposes friendly error codes. `app.js` uses the server's lunar date, hour index, palace positions, and stages for personal readings. It does not silently compute a fallback result if the server fails. The browser's old direct calendar fetch was removed from `core.js`; local calculation remains for the Method page's teaching examples.

Question text and account tokens are not sent to the new backend. Topic-based written reflections, guest history, Google sign-in, and Supabase history retain their existing behavior. Reopening a previously saved question deliberately reuses its first result; use a new question when demonstrating the network request.

Run the backend, serve this portfolio at port 4173, and open `/projects/xiaoliuren/`. Run `npm test` for regression and API-client checks. See the backend README for the API contract and `DEPLOYMENT_GUIDE_ZH.md` for deployment steps.
