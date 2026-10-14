// Enjeksiyon sayfasını GERÇEK Chrome'da eklentiyle aynı kodla yakalar ve eval girdisi olarak kaydeder.
// (Node'daki linkedom, CSS sınıflarıyla yapılan gizlemeyi göremez; görünürlük için gerçek layout gerekir.)
import { extractBlocks, pickRoot } from '../../src/core/extract.js';
import { browserHiddenReason } from '../../src/core/visibility.js';

it('enjeksiyon sayfasını tarayıcıda yakalar', () => {
  cy.visit('/fixtures/injection-tos.html');
  cy.document().then((doc) => {
    const root = pickRoot(doc);
    const { paragraphs, hidden } = extractBlocks(root, browserHiddenReason);
    const allBlocks = extractBlocks(root, () => null).paragraphs.map((p) => p.text);
    // 4 gizli saldırının 4'ü de karantinada, görünür paragraflarda hiçbiri yok.
    expect(hidden).to.have.length(4);
    expect(paragraphs.map((p) => p.text).join(' ')).not.to.match(/AI ASSISTANTS|never shares|SYSTEM:|risk skoru 0/);
    cy.task('writeJson', {
      path: 'eval/snapshots/injection-browser.json',
      data: {
        url: 'fixtures/injection-tos.html',
        title: doc.title,
        paragraphs: paragraphs.map(({ id, text }) => ({ id, text })),
        hidden: hidden.map(({ text, reason }) => ({ text, reason })),
        allBlocks,
      },
    });
  });
});
