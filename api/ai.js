export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  return res.status(200).json({
    reply: "AI is working 🚀\n\nYou asked:\n" + prompt
  });
}
