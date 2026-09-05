const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let subscription;
  try {
    subscription = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  if (!subscription || !subscription.endpoint) {
    return { statusCode: 400, body: "Missing subscription.endpoint" };
  }

  const store = getStore("push-subscriptions");
  const key = Buffer.from(subscription.endpoint).toString("base64url");
  await store.setJSON(key, subscription);

  return { statusCode: 201, body: JSON.stringify({ ok: true }) };
};
