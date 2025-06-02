const redis = require("redis");
const client = redis.createClient({
  url: "redis://cache-receive-send:6379",
});

client.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
    await client.connect();
})();

async function setCache(key, value, expirationInSeconds = 600) {
  try {
    await client.set(key, JSON.stringify(value), {
      EX: expirationInSeconds,
    });
  } catch (err) {
    console.error("Redis set error:", err);
  }
}

async function getCache(key) {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Redis get error:", err);
    return null;
  }
}

module.exports = {
  client,
  setCache,
  getCache,
};