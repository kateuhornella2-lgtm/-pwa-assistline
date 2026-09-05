const webpush = require("web-push");
const { getStore } = require("@netlify/blobs");

webpush.setVapidDetails(
  "mailto:support@assistline.demo",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const store = getStore("push-subscriptions");
  const { blobs } = await store.list();

  if (blobs.length === 0) {
    return { statusCode: 404, body: JSON.stringify({ error: "Aucun abonnement enregistre" }) };
  }

  const payload = JSON.stringify({
    title: "AssistLine - Nouvelle reponse",
    body: "Un agent a repondu a votre ticket. Ouvrez l'app pour le consulter.",
  });

  let sent = 0;
  await Promise.all(
    blobs.map(async ({ key }) => {
      const subscription = await store.get(key, { type: "json" });
      if (!subscription) return;
      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await store.delete(key);
        }
      }
    })
  );

  return { statusCode: 200, body: JSON.stringify({ ok: true, sent }) };
};
