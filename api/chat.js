import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { query, isAdmin } = req.body;

  if (!query) return res.status(400).json({ reply: "No query provided." });

  try {
    // -------- Gemini API Call --------
    const geminiResp = await fetch("https://gemini.googleapis.com/v1beta2/models/text-bison-001:generateText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        prompt: query,
        temperature: 0.7,
        maxOutputTokens: 500
      })
    });

    const geminiData = await geminiResp.json();
    let reply = geminiData?.candidates?.[0]?.content || "";

    // -------- NewsAPI Optional --------
    if (/news/i.test(query)) {
      const newsResp = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${process.env.NEWS_API_KEY}`);
      const newsData = await newsResp.json();
      if(newsData.articles && newsData.articles.length > 0){
        reply += "\n\nTop News:\n" + newsData.articles.slice(0,3).map(a=>`- ${a.title}`).join("\n");
      }
    }

    res.status(200).json({ reply });
  } catch(err) {
    console.error("API ERROR:", err);
    res.status(500).json({ reply: "Error contacting AI." });
  }
}




