// api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "No query provided" });
  }

  try {
    // GEMINI AI request
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: query }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // Get AI reply text
    const aiText = data.candidates?.[0]?.content?.[0]?.text || "AI did not return a response.";

    res.status(200).json({ reply: aiText });
  } catch (err) {
    console.error("Error contacting Gemini AI:", err);
    res.status(500).json({ reply: "Error contacting AI." });
  }
}




