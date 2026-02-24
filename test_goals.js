const http = require('http');

async function run() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '2306' })
    });
    const cookie = loginRes.headers.get('set-cookie');
    if (!cookie) throw new Error("No cookie");
    const sessionCookie = cookie.split(';')[0];
    console.log("Logged in:", sessionCookie);

    const addGoal = async (title) => {
      const res = await fetch('http://localhost:3000/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
        body: JSON.stringify({ title, targetAmount: 1000, isShared: true })
      });
      return await res.json();
    };

    console.log("Adding goals...");
    const g1 = await addGoal("Goal 1");
    const g2 = await addGoal("Goal 2");
    console.log(g1, g2);

    const deleteGoal = async (id) => {
      console.log("Deleting id:", id);
      const res = await fetch(`http://localhost:3000/api/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Cookie': sessionCookie }
      });
      const text = await res.text();
      console.log("Status:", res.status, text);
    };

    await deleteGoal(g1.id);
    await deleteGoal(g2.id);

    const goalsRes = await fetch('http://localhost:3000/api/goals', {
      headers: { 'Cookie': sessionCookie }
    });
    const remaining = await goalsRes.json();
    console.log("Remaining goals:", remaining);

  } catch (e) {
    console.error(e);
  }
}
run();
