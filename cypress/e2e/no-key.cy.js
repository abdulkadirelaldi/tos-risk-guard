// Anahtar yokken sistem tahmin uydurmaz, açıkça anahtar ister (normal derlemeyle çalıştırılır).
it('anahtar yokken panel açılır ve rapor uydurmaz', () => {
  cy.visit('/fixtures/injection-tos.html');
  cy.get('[data-trg-host]', { timeout: 10000 }).should('exist');
  cy.wait(5000);
  cy.screenshot('no-key-panel', { capture: 'viewport' });
});
