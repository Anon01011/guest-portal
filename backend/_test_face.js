const fs = require('fs');
const path = require('path');
const { processDocumentOcr } = require('./utils/ocrParser');

const imgPath = path.join(__dirname, '_test_qid.png');
if (!fs.existsSync(imgPath)) {
  console.error('Missing _test_qid.png');
  process.exit(1);
}

(async () => {
  const t0 = Date.now();
  const buffer = fs.readFileSync(imgPath);
  const result = await processDocumentOcr(buffer, 'ronny_page-0001.jpg.jpeg', 'QID');
  console.log('Time:', Date.now() - t0, 'ms');
  console.log('Name:', result.name);
  console.log('QID:', result.idNum);
  if (result.facePhotoBase64) {
    fs.writeFileSync(path.join(__dirname, '_face_out.jpg'), Buffer.from(result.facePhotoBase64.split(',')[1], 'base64'));
    console.log('Face saved to _face_out.jpg');
  }
  process.exit(0);
})();
