
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const app = next({ dev: true });
const handle = app.getRequestHandler();

async function runTests() {
  await app.prepare();
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3001, async () => {
    console.log('> Server ready on http://localhost:3001');

    try {
      const nim = '2407999';
      const password = 'Password123!';
      
      // 1. Delete user if exists to ensure clean state
      const sqlite3 = require('better-sqlite3');
      const db = sqlite3('./db.sqlite');
      db.prepare('DELETE FROM users WHERE nim = ?').run(nim);

      console.log('--- TESTING REGISTRATION ---');
      const regRes = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, nama: 'Test User', email: 'test@itg.ac.id', password })
      });
      console.log('Register Status:', regRes.status);
      const regData = await regRes.json();
      console.log('Register Response:', regData);

      console.log('\n--- TESTING LOGIN (UNVERIFIED) ---');
      const loginUnverifiedRes = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, password, role: 'mahasiswa' })
      });
      console.log('Login Unverified Status:', loginUnverifiedRes.status);
      const loginUnverifiedData = await loginUnverifiedRes.json();
      console.log('Login Unverified Response:', loginUnverifiedData);

      console.log('\n--- TESTING RESEND VERIFY ---');
      const resendRes = await fetch('http://localhost:3001/api/auth/resend-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim })
      });
      console.log('Resend Status:', resendRes.status);
      const resendData = await resendRes.json();
      console.log('Resend Response:', resendData);

      console.log('\n--- GETTING TOKEN FROM DB ---');
      const user = db.prepare('SELECT email_token FROM users WHERE nim = ?').get(nim);
      console.log('Email Token:', user.email_token);

      console.log('\n--- TESTING VERIFY ---');
      const verifyRes = await fetch(`http://localhost:3001/api/auth/verify?token=${user.email_token}`, {
        redirect: 'manual'
      });
      console.log('Verify Status:', verifyRes.status);
      console.log('Verify Location:', verifyRes.headers.get('location'));

      console.log('\n--- TESTING LOGIN (VERIFIED) ---');
      const loginVerifiedRes = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nim, password, role: 'mahasiswa' })
      });
      console.log('Login Verified Status:', loginVerifiedRes.status);
      const loginVerifiedData = await loginVerifiedRes.json();
      console.log('Login Verified Response:', loginVerifiedData);

      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
}

runTests();
