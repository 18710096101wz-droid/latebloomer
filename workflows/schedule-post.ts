import { sleep, FatalError } from "workflow";

export interface ScheduledPostInput {
  text: string;
  delaySeconds: number;
  scheduledAt: string;
}

export interface ScheduledPostResult {
  ok: boolean;
  scheduledAt: string;
  postId?: string;
  mock?: boolean;
}

export async function schedulePostWorkflow(
  input: ScheduledPostInput,
): Promise<ScheduledPostResult> {
  "use workflow";

  if (input.delaySeconds > 0) {
    await sleep(`${input.delaySeconds} seconds`);
  }

  const result = await publishPost(input.text);
  return {
    ...result,
    scheduledAt: input.scheduledAt,
  };
}

async function publishPost(
  text: string,
): Promise<{ ok: true; postId?: string; mock?: boolean }> {
  "use step";

  if (process.env.MOCK_X === "true") {
    console.log("[XQueue mock publish]", { text });
    return { ok: true, mock: true, postId: `mock_${Date.now()}` };
  }

  const required = [
    "X_API_KEY",
    "X_API_SECRET",
    "X_ACCESS_TOKEN",
    "X_ACCESS_TOKEN_SECRET",
  ] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new FatalError(`Missing required environment variable: ${key}`);
    }
  }

  try {
    const OAuth = (await import("oauth-1.0a")).default;
    const crypto = await import("node:crypto");

    const oauth = new OAuth({
      consumer: {
        key: process.env.X_API_KEY!,
        secret: process.env.X_API_SECRET!,
      },
      signature_method: "HMAC-SHA1",
      hash_function(baseString, key) {
        return crypto.createHmac("sha1", key).update(baseString).digest("base64");
      },
    });

    const token = {
      key: process.env.X_ACCESS_TOKEN!,
      secret: process.env.X_ACCESS_TOKEN_SECRET!,
    };

    const url = "https://api.x.com/2/tweets";
    const requestData = { url, method: "POST" as const };
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const body = await response.json().catch(() => null) as
      | { data?: { id?: string }; detail?: string; title?: string }
      | null;

    if (!response.ok) {
      throw new FatalError(
        `X API ${response.status}: ${body?.detail || body?.title || "post failed"}`,
      );
    }

    return { ok: true, postId: body?.data?.id };
  } catch (error) {
    if (error instanceof FatalError) throw error;

    // Creating a post is not safely idempotent. A blind retry after a network
    // failure can create duplicate posts, so fail once and require manual review.
    throw new FatalError(
      `X publish failed without retry: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

// Posting to X is a side effect without an idempotency key. Disable automatic
// retries to avoid duplicate posts if X accepted the request but the response
// was lost in transit.
// @ts-ignore Workflow SDK reads maxRetries metadata on step functions.
publishPost.maxRetries = 0;
