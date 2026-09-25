/** The token shown on the landing page and at /live: Sellvane's own test token. */
export function featuredSlug(): string {
  const v = process.env.TOKEN_ADDRESS;
  if (!v) throw new Error("Missing env TOKEN_ADDRESS");
  return v.toLowerCase();
}
