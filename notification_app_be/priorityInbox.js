const axios = require("axios");
const { Log, setAuthToken } = require("../logging_middleware");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJhbnVzaHJpMTM1YXNAZ21haWwuY29tIiwiZXhwIjoxNzc3NzA2MDAzLCJpYXQiOjE3Nzc3MDUxMDMsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiI2MTc1OWJkYS1mNGY2LTQ4YjMtOWY5YS03YzAxNjdmZTk0YzgiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJhbnVzaHJpYmFsYSBhIiwic3ViIjoiY2ZlMDE5M2YtNmFmZi00OGE4LWJmOGYtMGQ3ZTQ4NTZkOWVkIn0sImVtYWlsIjoiYW51c2hyaTEzNWFzQGdtYWlsLmNvbSIsIm5hbWUiOiJhbnVzaHJpYmFsYSBhIiwicm9sbE5vIjoicmEyMzExMDA4MDIwMTg1IiwiYWNjZXNzQ29kZSI6IlFrYnB4SCIsImNsaWVudElEIjoiY2ZlMDE5M2YtNmFmZi00OGE4LWJmOGYtMGQ3ZTQ4NTZkOWVkIiwiY2xpZW50U2VjcmV0IjoieE1XVGpYRERYZm5uYWdrRyJ9.M6Gd7rmgDGTkDHnYwzXSb3IlV3FlQHdrSdCE6W6RI5M";
setAuthToken(TOKEN);

const WEIGHT = { Placement: 3, Result: 2, Event: 1 };

const score = (n) => WEIGHT[n.Type] * 1e12 + new Date(n.Timestamp).getTime();

const getTop10 = async () => {
  await Log("backend", "info", "service", "Fetching notifications for priority inbox");

  const res = await axios.get(
    "http://20.207.122.201/evaluation-service/notifications",
    { headers: { Authorization: "Bearer " + TOKEN } }
  );

  const notifications = res.data.notifications;

  await Log("backend", "info", "handler", `Received ${notifications.length} notifications`);

  const top10 = notifications
    .sort((a, b) => score(b) - score(a))
    .slice(0, 10);

  console.log("\n🏆 Top 10 Priority Notifications:");
  top10.forEach((n, i) =>
    console.log(`${i + 1}. [${n.Type}] ${n.Message} | ${n.Timestamp}`)
  );

  await Log("backend", "info", "service", "Top 10 priority inbox computed successfully");
};

getTop10().catch(async (err) => {
  await Log("backend", "error", "handler", `Priority inbox failed: ${err.message}`);
});