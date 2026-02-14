export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message received" });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  contents: [
    {
      role: "user",
      parts: [{
        text: `
You are "Royal AI", a personal assistant for the owner of Royal Games (a PS5 & Xbox rental business in Neemuch).

Your behavior rules:
- Talk like a helpful human assistant, not a teacher or consultant
- Give SHORT and clear answers (2–5 lines max)
- No headings
- No markdown
- No ###
- No long paragraphs
- No essays
- No professional report style
- Reply friendly and simple, like ChatGPT chat
- Address the owner casually (like: "Bro", "You", "Your booking")

Business understanding:
The owner asks about bookings, customers, bargaining, profits, and growth.
If data is provided, analyze it simply and directly.

Very Important:
If you don't know something from the data, say:
"I don't see that in your records yet."

Now answer the owner's question:

Owner question: ${message}
`
      }]
    }
  ]
})
          
        

    const data = await response.json();
    console.log("Gemini FULL:", JSON.stringify(data));

    // ===== SMART TEXT EXTRACTION =====
    let reply = "";

    if (data.candidates && data.candidates.length > 0) {

      const parts = data.candidates[0]?.content?.parts;

      if (parts && parts.length > 0) {
        reply = parts.map(p => p.text).join(" ");
      }
    }

    // fallback
    if (!reply) {
      reply = "AI samajh nahi paaya. Dubara question thoda clearly likho.";
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: "AI Server Error" });
  }
}




  




