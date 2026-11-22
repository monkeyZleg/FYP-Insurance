import { send } from "../client";
import { run } from "../run";
import { documentRoutes } from "../routes/documents.routes";
import type { Document as ClaimDocument } from "@/types";

/** The files attached to a claim (names and hashes; the bytes stay in the database). */
export const documentsByClaim = (auth: { token: string } | { wallet: string }, claimId: string) =>
  run("documents.documentsByClaim", () =>
    send<{ documents: ClaimDocument[] }>(documentRoutes.byClaim(claimId), { auth })
  );
