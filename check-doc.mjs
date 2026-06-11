const resp = await fetch('http://localhost:5175/api/state');
const d = await resp.json();
const doc = d.prdDocuments[0];
if (!doc) { console.log('No docs'); process.exit(); }

console.log('Filename:', doc.filename);
console.log('Length:', doc.rawText.length);

const hasImg = doc.rawText.includes('![') || doc.rawText.includes('<img') || doc.rawText.includes('data:image');
console.log('Has image syntax:', hasImg);

const lines = doc.rawText.split('\n');
lines.forEach((l, i) => {
  if (l.includes('img') || l.includes('![') || l.includes('data:image') || l.includes('.png') || l.includes('.jpg')) {
    console.log(`Line ${i}:`, l.slice(0, 200));
  }
});

console.log('---Full content (first 3000 chars)---');
console.log(doc.rawText.slice(0, 3000));
