const http = require('http');

async function run() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '2306' })
    });
    const cookie = loginRes.headers.get('set-cookie');
    const sessionCookie = cookie.split(';')[0];

    const goalsRes = await fetch('http://localhost:3000/api/goals', {
      headers: { 'Cookie': sessionCookie }
    });
    const goals = await goalsRes.json();
    const kvartira = goals.find(g => g.title === "Квартира");
    
    if (kvartira) {
      console.log("Found goal, attempting to delete:", kvartira.id);
      const res = await fetch(`http://localhost:3000/api/goals/${kvartira.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': sessionCookie }
      });
      const text = await res.text();
      console.log("Status:", res.status, text);
    }

  } catch (e) {
    console.error(e);
  }
}
run();
