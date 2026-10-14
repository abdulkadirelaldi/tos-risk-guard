// Belirsizlik değerlendirmesi. LLM'in kendi "eminim" beyanını kullanmaz;
// yalnızca ölçülebilir sinyallerden (kapsama, reddedilen iddialar, gizli metin…)
// deterministik olarak hesaplanır ve kullanıcıya gerekçeleriyle gösterilir.

/**
 * @returns {{level: 'yuksek'|'orta'|'dusuk', label: string, reasons: string[], coverage: number}}
 *   level = sonuca duyulan GÜVEN düzeyi
 */
export function assessUncertainty(s) {
  const reasons = [];
  let penalty = 0;

  const coverage = s.totalChars ? s.sentChars / s.totalChars : 0;
  if (s.truncated) {
    reasons.push(`Metnin yalnızca %${Math.round(coverage * 100)}'i analiz edilebildi (uzunluk sınırı); geri kalan maddeler kontrol edilmedi.`);
    penalty += coverage < 0.6 ? 3 : 2;
  }
  if (typeof s.extractionCoverage === 'number' && s.extractionCoverage < 0.6) {
    reasons.push(`Sayfadaki metnin yalnızca %${Math.round(s.extractionCoverage * 100)}'i paragraf olarak yakalanabildi; sayfa yapısı alışılmadık olabilir.`);
    penalty += 2;
  }
  const total = s.verifiedCount + s.rejectedCount;
  if (s.rejectedCount > 0) {
    const ratio = s.rejectedCount / total;
    reasons.push(`Modelin ${total} iddiasından ${s.rejectedCount} tanesi orijinal metinde doğrulanamadığı için atıldı.`);
    penalty += ratio >= 0.3 ? 2 : 1;
  }
  if (s.hiddenInjectionCount > 0) {
    reasons.push(`Sayfada kullanıcıya görünmeyen ${s.hiddenInjectionCount} adet yapay zekaya yönelik talimat bulundu ve analizden çıkarıldı. Sayfa bu raporu manipüle etmeye çalışıyor olabilir.`);
    penalty += 2;
  } else if (s.hiddenCount > 0) {
    reasons.push(`${s.hiddenCount} gizli metin bloğu analize dahil edilmedi.`);
  }
  if (s.visibleInjectionCount > 0) {
    reasons.push(`Görünür metinde ${s.visibleInjectionCount} paragraf yapay zekaya talimat veriyor gibi görünüyor; model bunlara uymaması için kısıtlandı ama sonucu dikkatle okuyun.`);
    penalty += 2;
  }
  if (s.documentType === 'hukuki_metin_degil') {
    reasons.push('Model bu sayfanın bir kullanım koşulu / gizlilik politikası olmadığını düşünüyor.');
    penalty += 3;
  } else if (s.verifiedCount === 0) {
    reasons.push('Hiç riskli madde doğrulanamadı. Bu, metnin risksiz olduğu anlamına gelmez.');
    penalty += 2;
  }
  if (s.paragraphCount < 5) {
    reasons.push('Çok az metin yakalandı; sayfa içeriği dinamik yükleniyor veya bir bölümü kapalı olabilir.');
    penalty += 2;
  }
  if (s.attempts > 1) {
    reasons.push('Model ilk denemede geçerli çıktı vermedi; ikinci denemede düzeldi.');
    penalty += 1;
  }

  const level = penalty >= 3 ? 'dusuk' : penalty >= 1 ? 'orta' : 'yuksek';
  const label = { yuksek: 'Yüksek güven', orta: 'Dikkatli yorumlayın', dusuk: 'Düşük güven — sistem emin değil' }[level];
  return { level, label, reasons, coverage: Math.round(coverage * 100) / 100 };
}
