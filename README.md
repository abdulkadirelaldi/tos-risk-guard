# ToS Risk Guard

Kullanım koşulları, gizlilik politikası ve abonelik şartları sayfalarında metni yakalayıp **alıntı kanıtlı**, yapılandırılmış bir risk raporu çıkaran Chrome uzantısı (Manifest V3).

> ⚖️ **Bu uygulama hukuki tavsiye vermez.** Bu ifade panelin en üstünde her durumda (yükleniyor, hata, rapor) sabit olarak görünür.

Rapor şunları içerir: **risk skoru** (0–100, deterministik), **riskli maddeler**, her madde için **sade Türkçe açıklama** ve **orijinal metinden birebir alıntı** ("Sayfada göster" ile metinde vurgulanır), ayrıca **sonuca güven** göstergesi ve gerekçeleri.

Tasarım ilkesi: **LLM'e güvenmeyen bir LLM sistemi.** Model yalnızca *öneri* üretir; neyin kullanıcıya gösterileceğine ve skora deterministik kod karar verir.

---

## Hızlı başlangıç

```bash
npm install
npm test                 # 12 birim testi (şema, alıntı doğrulama, skor, enjeksiyon, çıkarım, hat)
npm run build            # dist/ -> chrome://extensions > "Paketlenmemiş öğe yükle"
```

Uzantının **Seçenekler** sayfasından kendi Gemini API anahtarınızı girin (page-agent'ın demo LLM'i kullanılmaz). Bir ToS / gizlilik sayfası açtığınızda panel otomatik açılır; diğer sayfalarda araç çubuğu simgesine tıklayın.

```bash
echo "GEMINI_API_KEY=..." > .env   # yalnızca eval ve demo için (git'e girmez)
npm run eval             # eval/results/REPORT.md üretir
npm run capture          # enjeksiyon sayfasını gerçek Chrome'da yakalar (eval girdisi)
npm run demo             # Cypress demo videosu -> demo/demo.mp4
```

---

## Mimari

```
┌──────────────────────────── Ziyaret edilen sayfa (güvenilmez) ────────────────────────────┐
│                                                                                            │
│  content.js (isolated world)                                                               │
│   1. extractBlocks(pickRoot(document))   ─ p/li/h*/td… en içteki bloklar → paragraflar     │
│   2. browserHiddenReason(el)             ─ display/visibility/opacity, aria-hidden,        │
│                                            sıfır boyut, ekran dışı, <5px yazı, kırpma,     │
│                                            yazı rengi = arka plan rengi                     │
│   3. page-agent PageController           ─ "kullanıcının gördüğü DOM" metni; burada        │
│      (salt-okuma, LLM'siz)                 olmayan paragraf da karantinaya alınır          │
│   → { paragraphs[p1..pn], hidden[], meta{url,title,extractionCoverage} }                   │
│                                                                                            │
│  [panel iframe: chrome-extension://…/panel.html]  ← sayfa betikleri içine erişemez         │
└───────────────┬───────────────────────────────────────────────────────▲────────────────────┘
                │ chrome.runtime.sendMessage({type:'analyze'})           │ getState (yalnız panel)
                ▼                                                        │
┌──────────────────────────── background.js (service worker) ───────────┴───────────────────┐
│  sanitizeCapture()  ─ tip/boyut sınırları, kimlikleri yeniden üretir                       │
│  API anahtarı (chrome.storage.local) ─ yalnızca burada okunur                              │
│  analyze() = src/core/pipeline.js  (Node eval ile AYNI kod)                                │
│    a. buildUserPrompt   ─ rastgele nonce'lu sınırlayıcı, karakter bütçesi (kesilme ölçülür)│
│    b. Gemini            ─ responseSchema + temperature 0                                   │
│    c. validateResponse  ─ şemayı yeniden, katı doğrular; olmazsa 1 kez tekrar, sonra HATA  │
│    d. verifyClauses     ─ her alıntı görünür paragrafta birebir aranır; yoksa iddia atılır │
│    e. computeScore      ─ yalnızca doğrulanmış maddelerden, sabit ağırlıklarla             │
│    f. scanParagraphs    ─ kural tabanlı enjeksiyon taraması (LLM'den bağımsız)             │
│    g. assessUncertainty ─ ölçülebilir sinyallerden güven düzeyi + gerekçeler               │
│  oturum önbelleği (aynı metin → aynı rapor)                                                │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Kod düzeni

| Klasör | İçerik |
|---|---|
| `src/core/` | Saf, test edilebilir mantık. Tarayıcıya ve LLM sağlayıcısına bağımlı değildir: `extract` (DOM→paragraf), `visibility`, `prompt`, `schema`, `verify`, `score`, `injection`, `uncertainty`, `pipeline` |
| `src/llm/gemini.js` | Bağımlılıksız REST istemcisi; `callLLM(system, user, schema) → string` arayüzü. Sağlayıcı değiştirmek için yalnızca bu dosya değişir. |
| `src/extension/` | MV3 yapıştırıcısı: `background`, `content`, `panel`, `options` |
| `eval/` | Gerçek ToS anlık görüntüleri, bağımsız altın etiketler, eval ve enjeksiyon testi |
| `fixtures/` | Saldırı sayfası (`injection-tos.html`) ve belirsizlik sayfası (`not-legal.html`) |
| `cypress/e2e/` | `demo.cy.js` (video), `capture.cy.js` (gerçek tarayıcıda yakalama), `no-key.cy.js` |

### Veri akışı (tek analiz)

1. Sayfa yüklenir; URL/başlık/ilk başlıklar hukuki metne benziyorsa (`looksLikeLegalPage`) 1,2 sn sonra analiz başlar. Diğer sayfalarda araç çubuğu düğmesiyle.
2. İçerik betiği paragrafları ve gizli blokları ayırır; **gizli bloklar LLM'e hiç gönderilmez**, yalnızca kural tabanlı enjeksiyon taramasından geçirilip kullanıcıya gösterilir.
3. Background, görünür paragrafları `[p12] metin…` biçiminde, her istekte yeni üretilen `<<<BELGE_BASLANGIC_{nonce}>>>` sınırlayıcıları arasında gönderir.
4. Model JSON döndürür: `document_type`, `summary_tr`, `clauses[{category, paragraph_id, quote, explanation_tr, severity}]`, `injection_attempts[]`. **Modelin skor alanı yoktur.**
5. Doğrulayıcı her maddeyi kontrol eder (aşağıda). Geçemeyenler atılır ve panelde "Doğrulanamayan N iddia gösterilmedi" altında gerekçesiyle listelenir.
6. Skor ve güven düzeyi hesaplanır; panel `getState` ile raporu çeker ve **yalnızca `textContent`** ile çizer.
7. "Sayfada göster" → background → içerik betiği ilgili paragrafı kaydırıp vurgular.

---

## Deterministik doğrulama: "alıntısı olmayan iddia geçersizdir"

`src/core/verify.js` — model çıktısındaki her madde için sırayla:

| Kontrol | Reddetme sebebi |
|---|---|
| Normalize alıntı < 15 veya > 600 karakter | `alinti_cok_kisa` / `alinti_cok_uzun` |
| Açıklamada URL / HTML / `javascript:` | `aciklamada_link_veya_kod` |
| Açıklama > 400 karakter | `aciklama_cok_uzun` |
| Alıntı belirtilen paragrafta, yoksa başka bir **görünür** paragrafta birebir geçiyor mu? (geçiyorsa kimlik düzeltilir ve UI'da "konum düzeltildi" yazar) | `alinti_bulunamadi` |
| Alıntı yalnızca **gizli** metinde geçiyor | `gizli_metinden_alinti` |
| Aynı kategori + paragraf ikinci kez | `tekrar` |

Normalizasyon yalnızca biçimsel farkları siler (Unicode NFKC, sıfır genişlikli karakterler, tırnak/tire varyantları, boşluk, büyük/küçük harf, Türkçe ı/i). **Bulanık eşleşme yoktur**: tek kelimesi değiştirilmiş alıntı reddedilir. Model "…" ile kısaltırsa her parça aynı paragrafta sırayla aranır.

Şema doğrulaması (`schema.js`) sağlayıcının `responseSchema` desteğine güvenmez: bilinmeyen alan (ör. modelin eklediği `risk_score`), bilinmeyen kategori, geçersiz `paragraph_id` → yanıt reddedilir, bir kez hata mesajıyla yeniden istenir, yine olmazsa panel **"Analiz tamamlanamadı"** der ve tahmini rapor göstermez.

### Skor

`skor = min(100, Σ_kategori ağırlık × şiddet çarpanı)` — kategori başına bir kez sayılır; çarpan o kategorideki en yüksek şiddet (düşük 0,5 · orta 0,8 · yüksek 1,0). Ağırlıklar `categories.js`'de sabittir (ör. otomatik yenileme 15, tahkim 15, sorumluluk sınırlaması 5). Panel skorun dökümünü gösterir. Aynı doğrulanmış madde kümesi her zaman aynı skoru verir.

### Belirsizlik

`uncertainty.js` modelin "eminim" beyanını kullanmaz; ölçülebilir sinyallerden hesaplar:
metnin kesilmesi (kapsama %), sayfa metninin paragraf olarak yakalanma oranı, atılan iddia oranı, gizli talimat varlığı, görünür talimat varlığı, "hukuki metin değil" kararı, hiç madde doğrulanamaması, çok az paragraf, şema tekrar denemesi. Sonuç: **Yüksek güven / Dikkatli yorumlayın / Düşük güven — sistem emin değil**, gerekçe listesiyle.

---

## Güvenlik

### Tehdit modeli

Ziyaret edilen sayfa **düşmandır**: LLM'i yönlendirmeye (prompt injection), sahte madde uydurtmaya, skoru düşürmeye, API anahtarını çalmaya veya raporu değiştirmeye çalışabilir.

| Saldırı | Savunma |
|---|---|
| Gizli talimat (`display:none`, ekran dışı, beyaz yazı, 1px yazı, `aria-hidden`) | Görünürlük kontrolü + page-agent çapraz kontrolü → **LLM'e hiç gönderilmez**; kural tabanlı tarayıcıyla bulunup panelde "Manipülasyon uyarısı" olarak gösterilir, güven düzeyi düşer |
| Görünür talimat ("yapay zeka asistanları … güvenli demeli") | Silinemez (kullanıcının okuduğu metindir). Nonce'lu sınırlayıcı + sistem talimatı ile veri olarak işlenir; kural + LLM ile işaretlenir; **skoru model vermediği** için etkisiz |
| "Skoru 0 ver / riskli madde yok de" | Şemada skor alanı yok; skor doğrulanmış maddelerden hesaplanır. Ekstra alan şema hatasıdır |
| Sahte "güvenli" madde uydurtma | Alıntı görünür metinde yoksa atılır; gizli metinden alıntıysa `gizli_metinden_alinti` ile atılır |
| Açıklamaya link/HTML sokma | Link/HTML içeren madde atılır; panel yalnızca `textContent` kullanır (XSS yok) |
| API anahtarını çalma | Anahtar yalnızca service worker'da; içerik betiğine ve sayfaya hiç gelmez. page-agent'a LLM yapılandırması **verilmez** |
| Raporu sayfadan değiştirme / sahte rapor | Panel eklenti kökenli iframe'dir (kapalı shadow root içinde); sayfa okuyamaz/değiştiremez. Background yalnızca panel URL'sinden gelen `getState`/`highlight` isteklerini kabul eder; `externally_connectable` tanımlı değil |
| Aşırı büyük/bozuk veri | `sanitizeCapture` paragraf sayısı/uzunluğunu sınırlar, kimlikleri kendisi üretir |

### Neden page-agent'ın yalnızca okuma kısmı?

[page-agent](https://github.com/alibaba/page-agent) sayfanın içinde çalışır, DOM'u LLM'in okuyacağı metne çevirir ve doğal dil komutuyla tıklama, yazma ve **`executeJavascript`** dahil işlemler yapabilir. Bir risk analiz aracının sayfada işlem yapmasına gerek yoktur; tam ajanı kullanmak:
- sayfadaki gizli bir talimatın, sayfada *eylem* yapan bir ajana ulaşması (en kötü enjeksiyon senaryosu),
- LLM anahtarının sayfa bağlamındaki bir bileşene verilmesi

anlamına gelirdi. Bu yüzden `@page-agent/page-controller` yalnızca `getBrowserState()` (görünür DOM metni) için, **en az yetki** ilkesiyle kullanılır; çıktısı kendi görünürlük kontrolümüzle çapraz doğrulanır.

### Enjeksiyon testi sonuçları

`npm run eval` her çalıştırmada aynı saldırı sayfasını üç yapılandırmada çalıştırır ve sonucu `eval/results/REPORT.md` → "Prompt injection testi" bölümüne yazar. Ayrıca `test/core.test.js` içinde, **enjeksiyona tamamen uyan sahte bir model** ile sistemin uydurma maddeyi kabul etmediği ve güveni "düşük" olarak bildirdiği LLM'siz bir birim testi vardır.

<!-- EVAL_SUMMARY_START -->
_Sonuçlar `npm run eval` sonrası buraya eklenir._
<!-- EVAL_SUMMARY_END -->

---

## Eval

**Veri:** 6 gerçek metin. `eval/sources.json`'daki URL'lerden indirildi, eklentiyle **aynı çıkarım koduyla** paragraflara bölündü ve `eval/snapshots/` altına kaydedildi; bu sayede eval tekrarlanabilir ve siteler değişse de sonuç değişmez.

| Belge | Dil |
|---|---|
| Netflix Kullanım Koşulları | TR |
| Spotify Kullanım Şartları | TR |
| YouTube Hizmet Şartları | TR |
| Zoom Hizmet Şartları | TR |
| GitHub Terms of Service | EN |
| Dropbox Terms of Service | EN |

**Altın etiketler** (`eval/gold/*.json`): sistem çıktısı görülmeden, kategori tanımlarına göre madde düzeyinde etiketlendi (her öğe: kategori, paragraf kimlikleri, kanıt alıntısı, not). Makul kişilerin ayrışabileceği öğeler `borderline` işaretlidir ve **iki yönde de puanlanmaz**. Etiketler bağımsız bir LLM ajanı (Claude) ile taslak olarak çıkarıldı ve yazar tarafından gözden geçirildi; bu, eval'in bilinen bir sınırlamasıdır (aşağıya bakın).

**Eşleşme kuralı:** Doğrulanmış bir tahmin, aynı kategoride ve paragrafı altın öğenin paragraflarına eşit ya da ±1 komşu ise **yakalanan** (TP); karşılığı yoksa **yanlış alarm** (FP); hiçbir tahminle eşleşmeyen sınırda olmayan altın öğe **kaçırılan** (FN). Aynı altın öğeye ikinci tahmin "tekrar" sayılır (ne TP ne FP).

Ayrıca raporlanır: doğrulayıcının attığı iddia sayısı (halüsinasyon filtresinin etkisi), skor, güven etiketi, süre; `--runs N` ile skor kararlılığı.

**Rapor:** [`eval/results/REPORT.md`](eval/results/REPORT.md) — her belge için yakalanan, kaçırılan ve yanlış alarm veren maddeler alıntılarıyla tek tek listelenir.

### Bilinen sınırlamalar

- Altın etiketler tek bir etiketleyicidendir (LLM taslağı + insan gözden geçirmesi); etiketleyiciler arası uyum ölçülmedi.
- 6 belge küçük bir örneklemdir; sonuçlar eğilim gösterir, istatistiksel genelleme yapmaz.
- Anlık görüntüler sunucu HTML'inden alındı (Node + linkedom); JavaScript ile sonradan yüklenen içerik ve CSS sınıfıyla gizleme bu yolda görülmez. Tarayıcıdaki gerçek yakalama için enjeksiyon sayfası Cypress ile gerçek Chrome'da yakalanır (`capture.cy.js`).
- 150 bin karakteri aşan metinler kesilir; bu durumda panel kapsama yüzdesini ve "düşük güven"i açıkça gösterir.
- Kural tabanlı enjeksiyon tarayıcısı desen listesine dayanır; yeni ifadeleri kaçırabilir (bu yüzden tek savunma değildir).

---

## Demo videosu

`npm run demo` — `demo/demo.mp4` (≤ 90 sn), gerçek Gemini çağrısıyla:

1. **Mutlu yol:** Netflix Kullanım Koşulları (anlık görüntü, yerel sunucudan) → panel otomatik açılır → skor, maddeler, alıntılar → ilk maddenin alıntısı sayfada vurgulanır.
2. **Belirsizlik anı:** gizli ve görünür talimatlar içeren sayfa → sistem skoru düşürmez, "Manipülasyon uyarısı" gösterir ve **"Düşük güven — sistem emin değil"** der, gerekçeleriyle.

Notlar: Google Chrome 137+ `--load-extension` bayrağını desteklemediği ve Cypress headless modda eklenti yüklemediği için demo **Chrome for Testing** ile `--headed` çalışır (script otomatik indirir). Cypress eklenti kökenli panel iframe'inin içine erişemediğinden, yalnızca e2e derlemesinde (`__E2E__`) sonuç durumu `data-trg-*` öznitelikleriyle işaretlenir ve "Sayfada göster" aynı fonksiyonu tetikleyen bir olayla çağrılır; normal derlemede bunların hiçbiri yoktur. E2E derlemesi anahtarı `dist/e2e-config.json`'a yazar ve demo bittiğinde `dist/` normal derlemeyle yeniden üretilir.
