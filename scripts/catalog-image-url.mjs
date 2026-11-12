export function isUsableCoverImage(value) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !/(?:no[-_ ]?image|placeholder|default[-_ ]?image|(?:^|\/)default(?:\.[a-z0-9]+)?(?:[?#]|$))/i.test(value);
  } catch {
    return false;
  }
}
