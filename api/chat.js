export default async function handler(req, res) {

  // ✅ CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = req.body;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: message }]
          }]
        })
      }
    );

    const data = await response.json();
    console.log("Gemini Raw Response:", JSON.stringify(data));

    if (data.candidates && data.candidates.length > 0) {
      const reply =
        data.candidates?.[0]?.content?.parts
          ?.map(part => part.text)
          ?.join(" ") || "AI returned empty text";

      return res.status(200).json({ reply });
    } else {
      // 🔥 THIS WAS MISSING
      return res.status(500).json({
        error: "No candidates returned",
        raw: data
      });
    }

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "AI Server Error" });
  }
  }




