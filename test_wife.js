const http = require('http');
async function run() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '3010' })
  });
  const sessionCookie = loginRes.headers.get('set-cookie').split(';')[0];
  const goalsRes = await fetch('http://localhost:3000/api/goals', { headers: { 'Cookie': sessionCookie } });
  const goals = await goalsRes.json();
  const kvartira = goals.find(g => g.title === "Квартира");
  if (kvartira) {
    const res = await fetch(`http://localhost:3000/api/goals/${kvartira.id}`, {
      method: 'DELETE', headers: { 'Cookie': sessionCookie }
    });
    console.log("Status:", res.status, await res.text());
  }
}
run();
