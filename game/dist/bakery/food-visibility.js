/** Late-loaded actors are opaque: show only on a completely revealed upper floor.
 * No mutation of pooled actor materials or construction-owned reveal materials. */
export function cafeUpperPresentationReady(view,support){
 const reveal=view?.upperReveal?.();return Number.isFinite(reveal)&&reveal>=.999;
}
