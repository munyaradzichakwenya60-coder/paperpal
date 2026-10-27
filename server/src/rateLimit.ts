import type { NextFunction, Request, Response } from "express";

type Options = { windowMs: number; max: number };

/**
 * Small in-memory limiter: at most `max` requests per IP in each `windowMs`.
 * It protects the AI key from being drained. On serverless hosting each instance keeps its own
 * counts, so treat it as a stopgap until users sign in and get per-account limits.
 */
export function createRateLimiter({ windowMs, max }: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress) || "unknown";

    if (hits.size > 5000) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }

    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({
        error: "You have generated a lot of papers in a short time. Please wait a few minutes and try again.",
      });
      return;
    }
    next();
  };
}
