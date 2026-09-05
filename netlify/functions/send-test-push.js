const webpush = require("web-push");

webpush.setVapidDetails(
  "mailto:support@assistline.demo",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let subscription;
  try {
    subscription = JSON.parse(event.body).subscription;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!subscription || !subscription.endpoint) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing subscription" }) };
  }

  const payload = JSON.stringify({
    title: "AssistLine - Nouvelle reponse",
    body: "Un agent a repondu a votre ticket. Ouvrez l'app pour le consulter.",
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: err.statusCode || 500, body: JSON.stringify({ error: err.message }) };
  }
};
