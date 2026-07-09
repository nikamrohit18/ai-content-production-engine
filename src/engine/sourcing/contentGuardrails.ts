/**
 * Terms that mark a trend-sourced title as pseudo-archaeology / ancient-astronaut
 * framing. This niche's history/archaeology channel legitimately covers disputed
 * and "unexplained" claims (see fact-check step), but ancient-astronaut-theory
 * content specifically is the pattern YouTube's borderline-content classifier
 * penalizes for reach/monetization — so it's excluded before it can be researched.
 */
const BORDERLINE_TERMS = [
  "ancient aliens",
  "ancient astronaut",
  "ancient astronauts",
  "aliens built",
  "alien technology",
  "extraterrestrial",
  "anunnaki",
  "nephilim",
];

export function borderlineContentReason(title: string): string | null {
  const normalized = title.toLowerCase();
  const match = BORDERLINE_TERMS.find((term) => normalized.includes(term));
  return match ? `matched borderline term: "${match}"` : null;
}
