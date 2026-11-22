import { send } from "../client";
import { run } from "../run";
import { healthRoutes } from "../routes/health.routes";

/** First thing to try when something fails: is the backend reachable at all? */
export const checkBackend = () =>
  run("health.checkBackend", () => send<{ status: string; timestamp: string }>(healthRoutes.check));
