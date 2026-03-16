export function normalizeBaseColor(rawToken: string): string | null {
  const token = rawToken.trim().toLowerCase();
  if (!token) {
    return null;
  }
  if (
    /multi[\s-]?(colour|color)|multicolou?r|rainbow|patterned|printed|floral|striped|checked/.test(
      token
    )
  ) {
    return "multicolor";
  }
  if (/black|charcoal/.test(token)) {
    return "black";
  }
  if (/white|ivory|off white|off-white/.test(token)) {
    return "white";
  }
  if (/grey|gray|silver/.test(token)) {
    return "gray";
  }
  if (/beige|cream|tan|taupe|camel|nude/.test(token)) {
    return "beige";
  }
  if (/brown|chocolate|mocha|espresso|cognac|rust/.test(token)) {
    return "brown";
  }
  if (/red|burgundy|maroon|crimson|wine/.test(token)) {
    return "red";
  }
  if (/orange|coral|peach|terracotta|apricot/.test(token)) {
    return "orange";
  }
  if (/yellow|mustard|gold/.test(token)) {
    return "yellow";
  }
  if (/green|mint|sage|olive|khaki|lime|emerald|forest/.test(token)) {
    return "green";
  }
  if (/blue|navy|teal|turquoise|aqua|cyan|denim|cobalt|sky/.test(token)) {
    return "blue";
  }
  if (/purple|violet|lavender|lilac|plum/.test(token)) {
    return "purple";
  }
  if (/pink|rose|fuchsia|magenta|blush/.test(token)) {
    return "pink";
  }
  return token || null;
}

export function extractColorTokens(raw?: string): string[] {
  const normalized = (raw || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }
  return Array.from(
    new Set(
      normalized
        .split(/,|\/|&|\band\b/)
        .map((token) => normalizeBaseColor(token))
        .filter((token): token is string => Boolean(token))
    )
  );
}
