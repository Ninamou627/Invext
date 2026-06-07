// @ts-nocheck
const fs = require('fs');
const path = require('path');

const directories = [
  'src/components',
  'src/components/ui',
  'src/components/layout',
  'src/lib',
  'src/app/auth',
  'src/app/auth/login',
  'src/app/auth/register',
  'src/app/dashboard'
];

directories.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created ${dir}`);
  }
});
