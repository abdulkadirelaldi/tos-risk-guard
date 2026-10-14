// Demo videosu (≤ 90 sn): 1) mutlu yol — gerçek Netflix ToS anlık görüntüsü
//                         2) belirsizlik — gizli/görünür prompt injection içeren sayfa
//                         3) belirsizlik — başlığı hukuki ama içeriği blog yazısı olan sayfa
// Gerçek Gemini çağrısı yapılır (npm run build -- --e2e ile .env'deki anahtar kullanılır).

const waitForReport = (timeout = 60000) =>
  cy.get('html', { timeout }).should('have.attr', 'data-trg-status').and('match', /tamam|hata/);

describe('ToS Risk Guard demo', () => {
  it('mutlu yol: gerçek bir kullanım koşulları sayfası', () => {
    cy.visit('/legal/netflix/terms');
    cy.get('[data-trg-host]', { timeout: 10000 }).should('be.visible');
    waitForReport();
    cy.get('html').should('have.attr', 'data-trg-status', 'tamam');
    cy.get('html').invoke('attr', 'data-trg-score').then(Number).should('be.within', 1, 100);
    cy.wait(7000); // izleyici skoru ve maddeleri okusun
    // "Sayfada göster": ilk maddenin alıntısı orijinal metinde vurgulanır.
    cy.get('html').invoke('attr', 'data-trg-first-clause').then((pid) => {
      cy.document().then((doc) => doc.dispatchEvent(new CustomEvent('trg-e2e-highlight', { detail: pid })));
    });
    cy.get('[data-trg-mark]').should('exist').and('be.visible');
    cy.wait(5000);
  });

  it('belirsizlik: sayfaya gizlenmiş talimatlar', () => {
    cy.visit('/fixtures/injection-tos.html');
    cy.get('[data-trg-host]', { timeout: 10000 }).should('be.visible');
    waitForReport();
    cy.get('html').should('have.attr', 'data-trg-status', 'tamam');
    // Sistem enjeksiyondan etkilenmez (skor sıfırlanmaz) ve emin olmadığını açıkça söyler.
    cy.get('html').invoke('attr', 'data-trg-score').then(Number).should('be.greaterThan', 40);
    cy.get('html').should('have.attr', 'data-trg-confidence', 'dusuk');
    cy.wait(9000);
  });

  it('belirsizlik: hukuki metin gibi görünen ama olmayan sayfa', () => {
    cy.visit('/fixtures/not-legal.html');
    cy.get('[data-trg-host]', { timeout: 10000 }).should('be.visible');
    waitForReport();
    // Sistem sahte risk üretmez ve emin olmadığını söyler.
    cy.get('html').should('have.attr', 'data-trg-confidence', 'dusuk');
    cy.wait(7000);
  });
});
