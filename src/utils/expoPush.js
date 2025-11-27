import fetch from "node-fetch";

export const sendExpoPush = async (expoToken, title, message) => {
  if (!expoToken) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: expoToken,
      sound: "default",
      title,
      body: message,
    }),
  });
};
