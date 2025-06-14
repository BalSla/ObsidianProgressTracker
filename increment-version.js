const fs = require('fs');
const files = ['manifest.json', 'package.json'];

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const versionParts = data.version.split('.');
  versionParts[1] = parseInt(versionParts[1], 10) + 1;
  // Reset all version parts after the second '.'
  if (versionParts.length < 3) {
    versionParts[2] = '0';
  } else {
    for (let i = 2; i < versionParts.length; i++){
      versionParts[i] = '0';
    }
  }
  data.version = versionParts.join('.');
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${file} to version ${data.version}`);
});