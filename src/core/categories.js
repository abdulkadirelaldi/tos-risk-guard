// Risk kategorileri sabittir. LLM yalnızca bu listeden seçebilir;
// ağırlıkları LLM değil bu tablo belirler (bkz. score.js).

export const CATEGORIES = {
  otomatik_yenileme: {
    label: 'Otomatik yenileme / ücretlendirme',
    weight: 15,
    hint: 'Abonelik kullanıcı iptal etmedikçe otomatik yenilenir veya fiyat bildirimsiz/tek taraflı artırılabilir.',
  },
  iptal_iade_kisitlamasi: {
    label: 'İptal ve iade kısıtlaması',
    weight: 15,
    hint: 'İade yapılmaz, kısmi dönem iadesi yoktur, iptal zorlaştırılmıştır veya ücret iptalden sonra da alınır.',
  },
  tek_tarafli_degisiklik: {
    label: 'Tek taraflı sözleşme değişikliği',
    weight: 10,
    hint: 'Şirket koşulları kullanıcının açık onayı olmadan, bildirimsiz ya da yalnızca siteye koyarak değiştirebilir.',
  },
  ucuncu_taraf_veri_paylasimi: {
    label: 'Üçüncü taraflarla veri paylaşımı',
    weight: 15,
    hint: 'Kişisel veriler reklam ortakları, iştirakler veya üçüncü taraflarla paylaşılır/satılır.',
  },
  genis_veri_toplama: {
    label: 'Kapsamlı veri toplama / izleme',
    weight: 10,
    hint: 'Konum, cihaz, tarama davranışı, kişiler vb. geniş kapsamlı veri toplanır veya siteler arası izleme yapılır.',
  },
  icerik_lisansi: {
    label: 'Kullanıcı içeriği üzerinde geniş lisans',
    weight: 10,
    hint: 'Kullanıcının yüklediği içerik için şirkete dünya çapında, telifsiz, alt lisanslanabilir vb. geniş hak verilir.',
  },
  tahkim_dava_feragati: {
    label: 'Tahkim / toplu davadan feragat',
    weight: 15,
    hint: 'Uyuşmazlıklar zorunlu tahkime gider, toplu dava veya jüri hakkından feragat edilir.',
  },
  sorumluluk_sinirlamasi: {
    label: 'Sorumluluk sınırlaması',
    weight: 5,
    hint: 'Şirketin sorumluluğu belirli bir tutarla sınırlanır veya hizmet "olduğu gibi" sunulur, garantiler reddedilir.',
  },
  hesap_kapatma: {
    label: 'Gerekçesiz hesap kapatma',
    weight: 5,
    hint: 'Şirket hesabı herhangi bir zamanda, gerekçe göstermeden veya bildirimsiz askıya alabilir/kapatabilir.',
  },
  veri_saklama: {
    label: 'Uzun / belirsiz veri saklama',
    weight: 5,
    hint: 'Veriler hesap silindikten sonra da saklanır veya saklama süresi belirsizdir.',
  },
  yabanci_yetki_hukuk: {
    label: 'Yabancı yetkili mahkeme / hukuk',
    weight: 5,
    hint: 'Uyuşmazlıklarda kullanıcının ülkesi dışındaki bir mahkeme veya hukuk yetkilidir.',
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);
