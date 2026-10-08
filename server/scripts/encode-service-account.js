const fs = require('fs');
const path = require('path');

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node encode-service-account.js <path-to-service-account.json>');
  process.exit(1);
}

try {
  const fileContent = fs.readFileSync(path.resolve(jsonPath), 'utf8');
  // Validate it's JSON
  JSON.parse(fileContent);
  
  const base64Str = Buffer.from(fileContent).toString('base64');
  
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const regex = /^FIREBASE_SERVICE_ACCOUNT_BASE64=.*$/m;
  const newVar = `FIREBASE_SERVICE_ACCOUNT_BASE64=${base64Str}`;
  
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, newVar);
  } else {
    envContent += `\n${newVar}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('Successfully encoded JSON and wrote to server/.env');
  
} catch (error) {
  console.error('Error processing service account file:', error.message);
  process.exit(1);
}
