/**
 * Hop Bypass – Apply Link Priority Resolver
 *
 * Resolves the best available "apply" link for a job posting using a
 * strict priority chain:
 *
 *   1. Direct URL  (applyUrl)  — e.g. a company careers page or form
 *   2. Email       (applyEmail) — mailto: link so the user can apply via email
 *   3. Post URL    (postUrl)   — the original Telegram / website post as a last resort
 *
 * The resolved result is a plain object with two fields:
 *   • applyLink     — the URL/mailto string the client should use, or null if none exist
 *   • applyLinkType — 'url' | 'email' | 'post' | null  (tells the UI how to render/label it)
 *
 * This keeps the resolution logic in one place so every endpoint (list,
 * detail, saved) behaves identically and front-end / bot clients never need
 * to replicate the chain themselves.
 */

export type ApplyLinkType = 'url' | 'email' | 'post' | null;

export interface ResolvedApplyLink {
  applyLink: string | null;
  applyLinkType: ApplyLinkType;
}

/**
 * Resolves the highest-priority apply link for a job.
 *
 * @param applyUrl   - Direct application URL stored on the Job record
 * @param applyEmail - Application e-mail address stored on the Job record
 * @param postUrl    - URL of the originating Telegram / web post (from JobSource)
 */
export function resolveApplyLink(
  applyUrl:   string | null | undefined,
  applyEmail: string | null | undefined,
  postUrl:    string | null | undefined,
): ResolvedApplyLink {
  // Priority 1 — Direct URL
  if (applyUrl && applyUrl.trim()) {
    return { applyLink: applyUrl.trim(), applyLinkType: 'url' };
  }

  // Priority 2 — Email (wrap in mailto: so clients can open natively)
  if (applyEmail && applyEmail.trim()) {
    const email = applyEmail.trim();
    const href  = email.startsWith('mailto:') ? email : `mailto:${email}`;
    return { applyLink: href, applyLinkType: 'email' };
  }

  // Priority 3 — Fall back to the source post URL
  if (postUrl && postUrl.trim()) {
    return { applyLink: postUrl.trim(), applyLinkType: 'post' };
  }

  // No link available at all
  return { applyLink: null, applyLinkType: null };
}
