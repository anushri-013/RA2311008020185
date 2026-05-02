const axios = require("axios");
const { Log, setAuthToken } = require("../logging_middleware");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJhbnVzaHJpMTM1YXNAZ21haWwuY29tIiwiZXhwIjoxNzc3NzA0Njg5LCJpYXQiOjE3Nzc3MDM3ODksImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiIzMDAxYTY3NS03MDE0LTQxMGUtOWVlNS04MGExOWFiZTZmYWIiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJhbnVzaHJpYmFsYSBhIiwic3ViIjoiY2ZlMDE5M2YtNmFmZi00OGE4LWJmOGYtMGQ3ZTQ4NTZkOWVkIn0sImVtYWlsIjoiYW51c2hyaTEzNWFzQGdtYWlsLmNvbSIsIm5hbWUiOiJhbnVzaHJpYmFsYSBhIiwicm9sbE5vIjoicmEyMzExMDA4MDIwMTg1IiwiYWNjZXNzQ29kZSI6IlFrYnB4SCIsImNsaWVudElEIjoiY2ZlMDE5M2YtNmFmZi00OGE4LWJmOGYtMGQ3ZTQ4NTZkOWVkIiwiY2xpZW50U2VjcmV0IjoieE1XVGpYRERYZm5uYWdrRyJ9.25f9IbtodAbSzZLznTOt6tAKd4K5YJMuVgfsJpYGzEc";
const BASE = "http://20.207.122.201/evaluation-service";

setAuthToken(TOKEN);

const headers = { Authorization: `Bearer ${TOKEN}` };

const knapsack = (vehicles, capacity) => {
  const n = vehicles.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { Duration, Impact } = vehicles[i - 1];
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (Duration <= w) {
        dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - Duration] + Impact);
      }
    }
  }

  const selected = [];
  let w = capacity;

  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(vehicles[i - 1]);
      w -= vehicles[i - 1].Duration;
    }
  }

  return { maxImpact: dp[n][capacity], selected };
};

const main = async () => {
  await Log("backend", "info", "service", "Starting vehicle maintenance scheduler");

  const [d, v] = await Promise.all([
    axios.get(`${BASE}/depots`, { headers }),
    axios.get(`${BASE}/vehicles`, { headers }),
  ]);

  const depots = d.data.depots;
  const vehicles = v.data.vehicles;

  await Log("backend", "info", "service", `Fetched ${depots.length} depots, ${vehicles.length} vehicles`);

  for (const depot of depots) {
    const { maxImpact, selected } = knapsack(vehicles, depot.MechanicHours);

    await Log("backend", "info", "handler", `Depot ${depot.ID}: maxImpact=${maxImpact}`);

    console.log(`\nDepot ${depot.ID} | Budget: ${depot.MechanicHours}h | Max Impact: ${maxImpact}`);
    console.log(`Selected ${selected.length} tasks:`);

    selected.forEach(v =>
      console.log(`  Task: ${v.TaskID} | ${v.Duration}h | Impact: ${v.Impact}`)
    );
  }

  await Log("backend", "info", "service", "Vehicle scheduler completed successfully");
};

main().catch(async (err) => {
  await Log("backend", "error", "handler", `Scheduler crashed: ${err.message}`);
  console.error(err);
});