const axios = require("axios");

let authToken = "";

const setAuthToken = (token) => {
  authToken = token;
};

const Log = async (stack, level, package_, message) => {
  try {
    const res = await axios.post(
      "http://20.207.122.201/evaluation-service/logs",
      { stack, level, package: package_, message },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`[${level.toUpperCase()}] [${package_}] ${message}`);
    return res.data;
  } catch (err) {
    console.error("Log failed:", err.message);
  }
};

module.exports = { Log, setAuthToken };