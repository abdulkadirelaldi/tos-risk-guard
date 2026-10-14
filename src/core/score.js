// Risk skoru tamamen deterministiktir: yalnızca DOĞRULANMIŞ maddelerin
// kategorilerinden hesaplanır. LLM'in skor üzerinde doğrudan söz hakkı yoktur;
// bu yüzden "skoru 0 ver" türü bir enjeksiyon skoru değiştiremez.
//
// skor = min(100, Σ_kategori ağırlık(k) × şiddet çarpanı(k))
// Bir kategori birden çok kez geçse de bir kez sayılır; şiddet çarpanı
// o kategorideki en yüksek şiddettir (düşük 0.5, orta 0.8, yüksek 1.0).

import { CATEGORIES } from './categories.js';

const SEVERITY_FACTOR = { dusuk: 0.5, orta: 0.8, yuksek: 1.0 };

export function computeScore(verifiedClauses) {
  const perCategory = new Map();
  for (const c of verifiedClauses) {
    const f = SEVERITY_FACTOR[c.severity] ?? 1;
    perCategory.set(c.category, Math.max(perCategory.get(c.category) ?? 0, f));
  }
  const breakdown = [...perCategory.entries()]
    .map(([category, factor]) => ({
      category,
      label: CATEGORIES[category].label,
      points: Math.round(CATEGORIES[category].weight * factor),
      count: verifiedClauses.filter((c) => c.category === category).length,
    }))
    .sort((a, b) => b.points - a.points);
  const score = Math.min(100, breakdown.reduce((s, b) => s + b.points, 0));
  return { score, level: level(score), breakdown };
}

export function level(score) {
  if (score >= 60) return 'yuksek';
  if (score >= 30) return 'orta';
  return 'dusuk';
}
