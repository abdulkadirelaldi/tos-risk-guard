# Mini Eval Raporu

Model: `gemini-3.8-flash` · Belge sayısı: 6 · Çalıştırma/belge: 1 · Tarih: 2026-10-14

Bu dosya `npm run eval` tarafından otomatik üretilir. Yöntem için README'deki "Eval" bölümüne bakın.

## Özet

| Belge | Dil | Paragraf | Altın (sınırda) | Yakalanan | Kaçırılan | Yanlış alarm | Precision | Recall | Doğrulanamayan iddia | Skor | Güven | Süre |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Netflix Kullanım Koşulları | tr | 54 | 8 (6) | 6 | 2 | 0 | 100% | 75% | 1 | 63 | Dikkatli yorumlayın | 305 sn |
| Spotify Son Kullanıcı Sözleşmesi | tr | 168 | 13 (14) | 8 | 5 | 1 | 89% | 62% | 2 | 65 | Dikkatli yorumlayın | 158 sn |
| GitHub Terms of Service | en | 255 | 13 (14) | 9 | 4 | 0 | 100% | 69% | 0 | 51 | Yüksek güven | 30 sn |
| Dropbox Terms of Service | en | 97 | 14 (12) | 9 | 5 | 0 | 100% | 64% | 0 | 72 | Yüksek güven | 59 sn |
| Zoom Hizmet Şartları | tr | 175 | 20 (26) | 9 | 11 | 1 | 90% | 45% | 0 | 75 | Yüksek güven | 26 sn |
| YouTube Hizmet Şartları | tr | 143 | 6 (7) | 5 | 1 | 0 | 100% | 83% | 0 | 36 | Yüksek güven | 29 sn |
| **Toplam** | | | | **46** | **28** | **2** | **96%** | **62%** | **3/57** | | | |

- **Precision** 96% · **Recall** 62% · **F1** 75% (madde düzeyi, ±1 paragraf toleransı).
- Model toplam 57 iddia üretti; **3 tanesi (5%) alıntısı orijinal metinde bulunamadığı için doğrulayıcı tarafından atıldı** ve kullanıcıya gösterilmedi.
- Aynı altın maddeye düşen 0 tekrar tahmin TP/FP olarak sayılmadı.

## Kategori bazında

| Kategori | Yakalanan | Kaçırılan | Yanlış alarm | Precision | Recall |
|---|---|---|---|---|---|
| Otomatik yenileme / ücretlendirme | 4 | 4 | 0 | 100% | 50% |
| İptal ve iade kısıtlaması | 5 | 4 | 0 | 100% | 56% |
| Tek taraflı sözleşme değişikliği | 6 | 2 | 2 | 75% | 75% |
| Kapsamlı veri toplama / izleme | 0 | 1 | 0 | — | 0% |
| Kullanıcı içeriği üzerinde geniş lisans | 5 | 3 | 0 | 100% | 63% |
| Tahkim / toplu davadan feragat | 6 | 2 | 0 | 100% | 75% |
| Sorumluluk sınırlaması | 10 | 7 | 0 | 100% | 59% |
| Gerekçesiz hesap kapatma | 3 | 4 | 0 | 100% | 43% |
| Uzun / belirsiz veri saklama | 1 | 0 | 0 | 100% | 100% |
| Yabancı yetkili mahkeme / hukuk | 6 | 1 | 0 | 100% | 86% |

## Prompt injection testi

_Bu model için çalıştırılamadı: Gemini HTTP 429: {
  "error": {
    "code": 429,
    "message": "You exceeded your current quota, please check your plan and billing details. For more informati_

## Belge bazında ayrıntı

### Netflix Kullanım Koşulları

Kaynak: https://help.netflix.com/legal/termsofuse (anlık görüntü: 2026-10-14)

**Yakalanan**

- ✅ `iptal_iade_kisitlamasi` p38 — “İlgili yasaların izin verdiği ölçüde ödemelerin iadesi yoktur ve tamamlanmamış abonelik dönemleri ya da kullanılmamış Netflix içerikleri için tarafımızca para iadesi ya da kredi t…”
- ✅ `sorumluluk_sinirlamasi` p44 — “Netflix hizmeti "olduğu gibi" ve taahhüt ya da koşul olmaksızın sunulmaktadır. Özellikle belirtmek gerekirse, hizmetimiz kesintisiz veya hatasız olmayabilir. Tarafımıza karşı tüm …”
- ✅ `tahkim_dava_feragati` p45 — “İLGİLİ KANUN KAPSAMINDA İZİN VERİLDİĞİ HÂLLERDE, NETFLIX VE SİZ, YALNIZCA BİREYSEL OLARAK BİRBİRİNİZE KARŞI TALEPTE BULUNABİLECEĞİNİZİ VE HERHANGİ BİR TOPLU YA DA TEMSİLÎ DAVANIN …”
- ✅ `otomatik_yenileme` p33 — “Aboneliğinizi fatura kesim tarihinden önce iptal etmediğiniz sürece, tarafımıza bir sonraki faturalama döneminin abonelik ücretini Ödeme Yöntemi üzerinden tahsil etme yetkisi verm…”
- ✅ `yabanci_yetki_hukuk` p47 — “Bu Kullanım Koşulları, Hollanda kanunlarına tabidir ve yine Hollanda kanunları kapsamında yorumlanabilir.”
- ✅ `tek_tarafli_degisiklik` p52 — “Bu Kullanım Koşullarını zaman zaman değiştirebiliriz. Somut değişiklikler olması durumunda, bu değişiklikler sizin için geçerli olmadan en az bir ay önce sizi bilgilendireceğiz. D…”

**Kaçırılan**

- ❌ `otomatik_yenileme` p39 — “Abonelik planımızda ve hizmetimizin ücretinde zaman zaman değişiklik yapabiliriz.” _(Fiyat tek taraflı artırılabilir; bir ay önceden bildirim ve iptal imkânı var (koruyucu nüans).)_
- ❌ `icerik_lisansi` p49 — “herhangi bir amaçla dünya çapında ve süresiz olarak kullanmakta serbesttir” _(Kullanıcı geri bildirimleri bedelsiz, atıfsız, dünya çapında ve süresiz kullanılabilir; manevi haklardan feragat istenir.)_

**Yanlış alarm** (altın etikette karşılığı yok)

- (yok)

**Sınırda (puanlanmadı)**

- ◻️ `hesap_kapatma` p28 — “Bu Kullanım Koşullarını ihlal etmeniz veya hizmeti yasadışı bir şekilde ya da dolandırıcılık amaçlı kullanmanız halinde…”
- ◻️ `tek_tarafli_degisiklik` p39 — “Abonelik planımızda ve hizmetimizin ücretinde zaman zaman değişiklik yapabiliriz. Herhangi bir ücret değişikliğinin vey…”

**Doğrulayıcının attığı iddialar**

- 🚫 `icerik_lisansi` p49 — Alıntı çok uzun: “Netflix, anketlere verdiğiniz yanıtlar veya web sitelerimiz ve kullanıcı arayüzlerimiz dâhil Netflix hizmetine gönderdiğiniz iletileri de k…”

### Spotify Son Kullanıcı Sözleşmesi

Kaynak: https://www.spotify.com/tr-tr/legal/end-user-agreement/ (anlık görüntü: 2026-10-14)

**Yakalanan**

- ✅ `icerik_lisansi` p79 — “Bu doğrultuda Spotify'a herhangi bir Kullanıcı İçeriğinizi Spotify Hizmeti ile bağlantılı olarak herhangi bir ortam aracılığıyla, tek başına ya da başka İçerik ile veya materyalle…”
- ✅ `tahkim_dava_feragati` p117 — “GEÇERLİ KANUNLARIN İZİN VERDİĞİ DURUMLARDA SİZ VE SPOTIFY, BİRBİRİNİZE KARŞI HERHANGİ BİR TOPLU YA DA TEMSİLİ GİBİ GÖRÜNEN DAVADA BİR DAVACI YA DA TOPLU DAVA TARAFI OLARAK DEĞİL, …”
- ✅ `tahkim_dava_feragati` p121 — “Siz ve Spotify, bu Sözleşmeler ile veya Hizmet'in bir kullanıcısı olarak Spotify ile aranızdaki ilişkiyle herhangi bir şekilde bağlantılı ya da ilişkili olarak Spotify ile aranızd…”
- ✅ `otomatik_yenileme` p51 — “Aksi belirtilmedikçe (örneğin, Ön Ödemeli Süre için kaydolduysanız) Ücretli Abonelikler iptal edilene kadar süresiz olarak devam eder. Her faturalandırma döneminin ilk gününde tek…”
- ✅ `iptal_iade_kisitlamasi` p52 — “Aksi belirtilmedikçe iptal işlemi iptal ettiğiniz fatura döneminin sonunda geçerli olur ve Spotify Hizmeti'nin ücretsiz sürümüne düşürülürsünüz. Bu Şartlar'da aksi belirtilmediği …”
- ✅ `sorumluluk_sinirlamasi` p101 — “Ancak bu duruma tabi olmak üzere Spotify Hizmeti "olduğu gibi" ve "kullanılabilir olduğu şekliyle", hiçbir türde açık, zımni veya yasal garanti olmaksızın sunulmaktadır. Ayrıca, S…”
- ✅ `tek_tarafli_degisiklik` p138 — “Bu Şartlar'da yapılacak herhangi bir değişiklik sonrasında Spotify Hizmeti'ni kullanmanız, bu değişiklikleri kabul ettiğiniz anlamına gelir. Güncellenen Şartlar kapsamında Spotify…”
- ✅ `yabanci_yetki_hukuk` p114 — “İkamet ettiğiniz ülkenin zorunlu kanunları kapsamında aksi gerekmediği müddetçe, Sözleşmeler (ve bunlar nedeniyle ya da bunlarla bağlantılı olarak ortaya çıkan tüm sözleşme dışı a…”

**Kaçırılan**

- ❌ `otomatik_yenileme` p56,p57 — “siz Ücretli Abonelik'i iptal edene kadar kararlaştırılan tutarı size her ay otomatik olarak yansıtması için Spotify'ı yetkilendirmiş olursunuz” _(Avantajlı kullanım bitince iptal edilmezse ücretli aboneliğe otomatik geçilir ve her ay ücret alınır.)_
- ❌ `iptal_iade_kisitlamasi` p97 — “halihazırda yapmış olduğunuz ödemeleri iade etmeyeceğini kabul edersiniz” _(Fesih/askıya alma durumunda yapılmış ödemeler iade edilmez.)_
- ❌ `icerik_lisansi` p81 — “ilgili Geri Bildirim gizli olmayacaktır ve Spotify bu Geri Bildirim'i sınırlama olmaksızın ve size ödeme yapmaksızın kullanabilir” _(Geri bildirimler sınırsız ve ücretsiz kullanılabilir.)_
- ❌ `sorumluluk_sinirlamasi` p103,p104 — “(a) Spotify'a ilk iddiadan önceki on iki ay içinde ödemiş olduğunuz tutar veya (b) 30,00 $ arasında hangisi daha yüksekse” _(Tek çözüm yolu kullanımı bırakmak; sorumluluk 12 aylık ödeme/30$ ile sınırlı, dolaylı zararlar hariç.)_
- ❌ `hesap_kapatma` p97 — “Spotify, herhangi bir zamanda bu Şartlar'ı ... feshedebilir ya da Spotify Hizmeti'ne erişiminizi askıya alabilir” _(İhlal şüphesi veya hizmetin durdurulması halinde her zaman fesih/askıya alma; bazı hallerde makul bildirim var.)_

**Yanlış alarm** (altın etikette karşılığı yok)

- ⚠️ `tek_tarafli_degisiklik` p47 — “Spotify; düzenli abonelik ücretleri, Ön Ödeme Dönemi (henüz ödemesi yapılmamış dönemler için) ya da Kodlar (yukarıda tanımlanmıştır) dahil Ücretli Abonelikler'in ücretini zaman za…” → _Spotify abonelik ücretlerini tek taraflı artırabilir; hizmeti kullanmaya devam etmeniz yeni fiyatı kabul ettiğiniz anlamına gelir._

**Doğrulayıcının attığı iddialar**

- 🚫 `hesap_kapatma` p97 — Alıntı çok uzun: “Bu Şartlar'ı ihlal ettiğinizi düşünürsek, tarafınıza makul bir süre öncesinde bildirimde bulunarak Spotify Hizmeti'ni ya da herhangi bir ön…”
- 🚫 `sorumluluk_sinirlamasi` p104 — Alıntı çok uzun: “Spotify, yetkilileri, hissedarları, çalışanları, temsilcileri, yöneticileri, bağlı ortaklıkları, iştirakleri, halefleri, görevlileri, tedar…”

### GitHub Terms of Service

Kaynak: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service (anlık görüntü: 2026-10-14)

**Yakalanan**

- ✅ `icerik_lisansi` p36 — “You grant GitHub and our Affiliates the right to store, host, archive, parse, display, and make copies of Your Content as necessary to provide, develop, and improve the Service, i…”
- ✅ `iptal_iade_kisitlamasi` p116 — “For monthly or yearly payment plans, the Service is billed in advance on a monthly or yearly basis respectively and is non-refundable. There will be no refunds or credits for part…”
- ✅ `hesap_kapatma` p132 — “GitHub has the right to suspend or terminate your access to all or any part of the Website at any time, with or without cause, with or without notice, effective immediately. GitHu…”
- ✅ `sorumluluk_sinirlamasi` p149 — “You understand and agree that we will not be liable to you or any third party for any loss of profits, use, goodwill, or data, or for any incidental, indirect, special, consequent…”
- ✅ `yabanci_yetki_hukuk` p161 — “Except to the extent applicable law provides otherwise, this Agreement between you and GitHub and any access to or use of the Website or the Service are governed by the federal la…”
- ✅ `icerik_lisansi` p90 — “You also grant GitHub and its Affiliates a license to collect and use your Inputs and Outputs to develop, train and improve artificial intelligence and machine learning models and…”
- ✅ `sorumluluk_sinirlamasi` p145 — “GitHub provides the Website and the Service “as is” and “as available,” without warranty of any kind. Without limiting this, we expressly disclaim all warranties, whether express,…”
- ✅ `tek_tarafli_degisiklik` p157 — “We reserve the right, at our sole discretion, to amend these Terms of Service at any time and will update these Terms of Service in the event of any such amendments.”
- ✅ `veri_saklama` p128 — “We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements, but barring legal requirements, we will de…”

**Kaçırılan**

- ❌ `icerik_lisansi` p109 — “GitHub will have a royalty-free, fully paid-up, worldwide, transferable, sub-licensable, irrevocable and perpetual license” _(Geri bildirim için dünya çapında, telifsiz, alt lisanslanabilir, geri alınamaz lisans.)_
- ❌ `iptal_iade_kisitlamasi` p118 — “Amounts payable under this Agreement are non-refundable, except as otherwise provided in this Agreement.” _(Faturalı kullanıcılar için ödemeler iade edilmez.)_
- ❌ `sorumluluk_sinirlamasi` p95 — “Output is provided "as-is" and subject to the disclaimers in Section O.” _(YZ çıktıları 'olduğu gibi' sunulur, hatasızlık garanti edilmez.)_
- ❌ `tek_tarafli_degisiklik` p169 — “or by the posting by GitHub of a revised version in accordance with Section R.” _(Sözleşme revize sürümün yayınlanmasıyla değiştirilebilir (Bölüm R'ye atıf).)_

**Yanlış alarm** (altın etikette karşılığı yok)

- (yok)

### Dropbox Terms of Service

Kaynak: https://www.dropbox.com/terms (anlık görüntü: 2026-10-14)

**Yakalanan**

- ✅ `iptal_iade_kisitlamasi` p45 — “You may cancel your Paid Account at any time. Refunds are only issued if required by law.”
- ✅ `hesap_kapatma` p55 — “Once we suspend or terminate your access to the Services, you will not be able to access or export Your Stuff. Dropbox does not provide refunds if we suspend or terminate your acc…”
- ✅ `sorumluluk_sinirlamasi` p65 — “WE LIMIT OUR LIABILITY TO YOU TO THE GREATER OF $20 USD OR 100% OF ANY AMOUNT YOU'VE PAID UNDER YOUR CURRENT SERVICE PLAN WITH DROPBOX.”
- ✅ `tahkim_dava_feragati` p70 — “You and Dropbox agree to resolve any claims relating to or arising out of these Terms or the Services through final and binding individual arbitration by a single arbitrator, exce…”
- ✅ `tahkim_dava_feragati` p75 — “NO CLASS OR REPRESENTATIVE ACTIONS. You may only resolve disputes with us on an individual basis, and may not bring a claim as a plaintiff or a class member in a class, consolidat…”
- ✅ `otomatik_yenileme` p44 — “We’ll automatically bill you from the date you convert to a Paid Account and on each periodic renewal until cancellation.”
- ✅ `sorumluluk_sinirlamasi` p59 — “THE SERVICES ARE PROVIDED "AS IS." WE ALSO DISCLAIM ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.”
- ✅ `yabanci_yetki_hukuk` p78 — “These Terms will be governed by California law except for its conflicts of laws principles.”
- ✅ `tek_tarafli_degisiklik` p86 — “By continuing to use or access the Services after the updates come into effect, you agree to be bound by the revised Terms.”

**Kaçırılan**

- ❌ `otomatik_yenileme` p47 — “We may change the fees in effect on renewal of your subscription, to reflect factors such as changes to our product offerings, changes to our business, or changes in economic cond…” _(Yenilemede fiyat tek taraflı artırılabilir; 30 gün önceden e-posta bildirimi ve iptal imkânı var.)_
- ❌ `iptal_iade_kisitlamasi` p55 — “Dropbox does not provide refunds if we suspend or terminate your access to the Services, unless required by law.” _(Şirket hesabı askıya alır/kapatırsa ücret iadesi yapılmaz.)_
- ❌ `sorumluluk_sinirlamasi` p62,p63,p93,p94 — “DROPBOX, ITS AFFILIATES, SUPPLIERS OR DISTRIBUTORS WON’T BE LIABLE FOR:” _(Dolaylı, arızi, cezai zararlar ile veri/kâr kaybından sorumluluk hariç tutulur.)_
- ❌ `sorumluluk_sinirlamasi` p65 — “WE LIMIT OUR LIABILITY TO YOU TO THE GREATER OF $20 USD OR 100% OF ANY AMOUNT YOU'VE PAID UNDER YOUR CURRENT SERVICE PLAN WITH DROPBOX.” _(Sorumluluk 20 USD veya ödenen tutarla sınırlı.)_
- ❌ `yabanci_yetki_hukuk` p68 — “any judicial proceeding to resolve claims relating to these Terms or the Services will be brought in the federal or state courts of San Francisco County, California” _(Yetkili mahkeme San Francisco (ABD); yerel mahkeme hakkı veren ülkeler hariç.)_

**Yanlış alarm** (altın etikette karşılığı yok)

- (yok)

**Sınırda (puanlanmadı)**

- ◻️ `icerik_lisansi` p12 — “To provide these and other features, Dropbox accesses, stores, and scans Your Stuff. You give us permission to do those…”

### Zoom Hizmet Şartları

Kaynak: https://www.zoom.com/en/trust/terms/ (anlık görüntü: 2026-10-14)

**Yakalanan**

- ✅ `iptal_iade_kisitlamasi` p44 — “Zoom tarafından aksi kabul edilmedikçe Kanunlar tarafından aksi zorunlu tutulmadıkça ve Sipariş Formunuzda aksi belirtilmedikçe Ödemelerin tamamının İlk Abonelik Süresi boyunca ve…”
- ✅ `otomatik_yenileme` p62 — “taraflardan biri ilgili Sipariş Formunda yer alan Hizmetlerle ilgili olarak (i) yeni Yenileme Dönemi başlamadan en az otuz (30) takvim günü önce veya (ii) geçerli Kanunlar uyarınc…”
- ✅ `tahkim_dava_feragati` p102 — “Zoom ile aranızdaki bazı anlaşmazlıkları bağlayıcı tahkim yoluyla ("Tahkim Anlaşması") çözmeyi kabul etmektesiniz. Tahkim, hakim veya jüriden ziyade, bir hakemin anlaşmazlığa kara…”
- ✅ `yabanci_yetki_hukuk` p139 — “ABD'nin Kaliforniya Eyaleti yasaları, yasaların çatışması ilkelerine bakılmaksızın, Federal Tahkim Yasası'nın tahkimle ilgili hükümleri yönetmesi dışında, bu Sözleşmeden kaynaklan…”
- ✅ `sorumluluk_sinirlamasi` p175 — “İŞBU SÖZLEŞMEDEN KAYNAKLANAN VEYA ONUNLA İLGİLİ TÜM TAZMİNAT TALEPLERİNİZ İÇİN YEKUN OLARAK, TAZMİNAT TALEBİNDE BULUNMANIZA YOL AÇAN OLAY VEYA DURUM ÖNCESİNDEKİ ON İKİ (12) AYDA H…”
- ✅ `icerik_lisansi` p34 — “Zoom'a kalıcı, geri alınamaz, dünya çapında geçerli, münhasır olmayan, telifsiz, alt lisanslandırılabilir ve devredilebilir bir lisans ve İzin Verilen Kullanımlar için ihtiyaç duy…”
- ✅ `hesap_kapatma` p64 — “Ayrıca Zoom, bu Sözleşmeyi otuz (30) iş günü önceden bildirimle herhangi bir nedenle veya nedensiz olarak feshedebilir.”
- ✅ `tek_tarafli_degisiklik` p68 — “Hizmetleri, Değişikliklerin yürürlüğe giriş tarihinden sonra kullanmaya devam ederseniz, revize edilmiş hüküm ve koşulları kabul etmiş olursunuz.”
- ✅ `sorumluluk_sinirlamasi` p93 — “HİZMETLERİN VE YAZILIMIN "OLDUĞU GİBİ" SAĞLANDIĞINI KABUL EDERSİNİZ VE ZOOM, İŞTİRAKLERİ, TEDARİKÇİLERİ VE LİSANS VERENLERİ, SATILABİLİRLİK, BELİRLİ BİR AMACA UYGUNLUK VEYA İHLÂLD…”

**Kaçırılan**

- ❌ `otomatik_yenileme` p45 — “Zoom, kendi takdirine bağlı olarak herhangi bir zamanda Hizmet fiyatlarını değiştirebilir.” _(Fiyat tek taraflı değiştirilebilir; 30 gün bildirim var, fesih edilmezse otomatik kabul sayılır.)_
- ❌ `iptal_iade_kisitlamasi` p65 — “önceden ödediğiniz Ücretlerin, geçerli Kanunlar uyarınca yasaklanmadığı takdirde Zoom tarafından alıkonulması da dahil” _(Fesihte önceden ödenen ücretler alıkonur; askıya alma süresince de ücret borcu sürer.)_
- ❌ `tek_tarafli_degisiklik` p69,p70 — “size bildirimde bulunarak veya bulunmadan ve Hizmetleri kullanımınız için geçerli benzer yönetmeliklerde, beyanlarda ve bildirimler için ilgili web sayfasında güncellenmiş bir sür…” _(Politikalar bildirimsiz, yalnızca web sayfasında yayımlanarak değiştirilebilir; takip yükü kullanıcıda.)_
- ❌ `genis_veri_toplama` p38 — “Telemetri verisini, ürün kullanım verilerini, tanı verilerini ve benzer Hizmetlerin veya Yazılımın” _(Telemetri, kullanım ve tanı verileri toplanır ve mülkiyeti Zoom'a aittir.)_
- ❌ `tahkim_dava_feragati` p110 — “mahkemede dava açma ve bir yargıç veya jüri huzurunda duruşma talep etmeye ilişkin her türlü anayasal ve yasal haklarınızdan feragat etmektesiniz” _(Jüri duruşmasından feragat.)_
- ❌ `tahkim_dava_feragati` p111 — “toplu, kitlesel, temsili dava veya grup davası açamayacağını” _(Toplu dava feragati ayrı madde olarak.)_
- ❌ `sorumluluk_sinirlamasi` p175 — “ON İKİ (12) AYDA HİZMETLER İÇİN FİİLEN ÖDEDİĞİNİZ MİKTARI AŞAN TAZMİNAT TALEPLERİ” _(Sorumluluk son 12 ayda ödenen tutarla sınırlanıyor.)_
- ❌ `sorumluluk_sinirlamasi` p20 — “hiçbir koşulda sorumlu olmayacaktır” _(İçerik/veri hataları ve erişim sorunları için sorumluluk tamamen reddediliyor.)_
- ❌ `hesap_kapatma` p14 — “Hizmetlere ve Yazılımlara erişiminizin ve bunları kullanımınızın Zoom'un kendi takdirine göre iptal edilebileceğini” _(Erişim Zoom'un takdirine göre iptal edilebilir.)_
- ❌ `hesap_kapatma` p21 — “hesapları veya Son Kullanıcı profillerini sonlandırma ya da başka makul eylemlerde bulunma dahil olmak üzere kendi takdirine göre” _(Şikayet üzerine kendi takdirine göre askıya alma/hesap sonlandırma.)_
- ❌ `hesap_kapatma` p49 — “Zoom, Hizmetlerinizi derhal ve önceden bildirimde bulunmaksızın feshedebilir, askıya alabilir veya bağlantısını kesebilir.” _(Ödeme 5 gün gecikirse bildirimsiz fesih/askıya alma (gerekçe var ama bildirimsiz).)_

**Yanlış alarm** (altın etikette karşılığı yok)

- ⚠️ `tek_tarafli_degisiklik` p45 — “Zoom, kendi takdirine bağlı olarak herhangi bir zamanda Hizmet fiyatlarını değiştirebilir.” → _Şirket dilediği zaman hizmet ücretlerini tek taraflı olarak artırabilir veya değiştirebilir._

**Sınırda (puanlanmadı)**

- ◻️ `tek_tarafli_degisiklik` p10 — “Zoom, kendi takdirine göre (i) Hizmetleri sonlandırabilir veya (ii) Hizmetlerin ya da Yazılımların özelliklerini veya i…”

### YouTube Hizmet Şartları

Kaynak: https://www.youtube.com/static?template=terms&hl=tr (anlık görüntü: 2026-10-14)

**Yakalanan**

- ✅ `icerik_lisansi` p53 — “Hizmet'e İçerik sağlayarak YouTube'a Hizmet'i çalıştırmak, tanıtmak ve iyileştirmek amacıyla bu İçeriği kullanması için (çoğaltmak, dağıtmak, değiştirmek, görüntülemek ve sunmak d…”
- ✅ `yabanci_yetki_hukuk` p108 — “Bu Sözleşme ve YouTube ile bu Sözleşme kapsamındaki ilişkiniz İngiliz Kanunlarına tabi olacak ve yasal anlaşmazlıklar için İngiltere ve Galler mahkemelerine başvurulabilecektir.”
- ✅ `sorumluluk_sinirlamasi` p142 — “YouTube ve İş Ortakları kâr, gelir veya veri kaybından, fırsat kaybından veya beklenen tasarrufların kaybedilmesinden, dolaylı ya da netice kabilinden doğan kayıplardan veya cezai…”
- ✅ `sorumluluk_sinirlamasi` p88 — “Bu Sözleşme'de açıkça belirtilen veya yasaların gerektirdiği durumlar haricinde, YouTube Hizmet'e dair belirli hiçbir vaatte bulunmamaktadır. Örneğin: Hizmet aracılığıyla sağlanan…”
- ✅ `tek_tarafli_degisiklik` p98 — “Bu Sözleşme'de esaslı değişiklik yapmamız durumunda, (1) yeni bir ürün veya özelliği kullanıma sunmamız ya da (2) devam eden kötüye kullanımı önlemek veya yasal şartları yerine ge…”

**Kaçırılan**

- ❌ `sorumluluk_sinirlamasi` p92,p142,p143 — “toplam sorumluluğu, hangisi daha fazla ise: (a) ... 12 ay içinde ... YouTube'un size ödemiş olduğu gelir tutarı ve (b) 500 € ile sınırlıdır” _(İşletme kullanıcıları için dolaylı zararlar hariç tutulur ve toplam sorumluluk 500 € / 12 aylık gelirle sınırlanır.)_

**Yanlış alarm** (altın etikette karşılığı yok)

- (yok)

**Sınırda (puanlanmadı)**

- ◻️ `veri_saklama` p57 — “Örneğin; İçeriğin tarafınızca kaldırılması, YouTube'un: (a) Hizmet'in herhangi bir sınırlı çevrimdışı görüntüleme işlev…”
- ◻️ `hesap_kapatma` p74 — “YouTube; (a) bu Sözleşme'yi esaslı şekilde veya üst üste ihlal etmeniz; (b) bir yasal şart ya da bir mahkeme emrine uym…”
