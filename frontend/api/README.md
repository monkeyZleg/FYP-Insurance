# Frontend API layer

```
frontend/api/
  config.ts        backend URL (NEXT_PUBLIC_BACKEND_URL) and log switch (NEXT_PUBLIC_API_LOG)
  client.ts        send(): the only fetch call; throws ApiError
  run.ts           the shared try/catch every controller uses
  logger.ts        console log format:  [api:<controller.function>] FAILED { status, method, url, message }
  routes/          method + path of each backend endpoint
  controllers/     one function per endpoint; returns { ok, data } or { ok, error, status }
  index.ts         authApi, policiesApi, claimsApi, documentsApi, blockchainApi, healthApi
```

## Using a controller in a page

```ts
import { authApi } from "@/api";

const result = await authApi.login(email, password, "policyholder");
if (!result.ok) {
  setError(result.error);   // already logged as [api:auth.login] FAILED
  return;
}
localStorage.setItem("jwt", result.data.token);
```

## Setting up step by step

1. Start the backend (`cd backend && npm run dev`).
2. Check the backend is reachable: open `http://localhost:5000/api/health` in the browser. It should show `{"status":"ok",...}`.
3. Use a controller. If it fails, the console shows which controller, the URL, the HTTP status and the message.

`status: 0` means the request never reached the backend (it is off, the URL is wrong, or CORS blocked it). `401` is a bad login or token, `403` a role without permission, `400` a rejected input, `503` the blockchain could not be read.

## Adding an endpoint

1. Add its method and path to the matching file in `routes/`.
2. Add a function to the matching controller: `export const x = (...) => run("group.x", () => send<ResponseType>(route, {...}))`.
