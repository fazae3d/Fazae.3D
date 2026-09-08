function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Deterministic demo review stats derived from the product slug — placeholder until real reviews exist. */
export function getDemoReviewStats(slug: string) {
  const hash = hashString(slug);
  const average = 4.2 + (hash % 8) / 10;
  const count = 18 + (hash % 140);
  return { average: Math.min(5, Number(average.toFixed(1))), count };
}

export const demoReviews = [
  {
    author: "Cliente Demo",
    rating: 5,
    text: "Avaliação demonstrativa, conteúdo de exemplo para o ambiente de desenvolvimento.",
  },
  {
    author: "Cliente Demo",
    rating: 4,
    text: "Avaliação demonstrativa, conteúdo de exemplo para o ambiente de desenvolvimento.",
  },
];
