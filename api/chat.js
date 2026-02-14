// ------------------ Safe fetch with timeout ------------------
async function fetchWithTimeout(url, options={}, timeout=7000){
  return Promise.race([
    fetch(url, options).then(r => r.json()).catch(() => null),
    new Promise(resolve => setTimeout(() => resolve(null), timeout))
  ]);
}

// ------------------ Main API ------------------
export default async function handler(req, res){
  try {
    if(req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { message } = req.body;
    if(!message) return res.status(400).json({ error: "No message provided" });

    // ----- Gemini Chat Only -----
    const gemRes = await fetchWithTimeout("https://api.gemini.com/chat", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    }, 7000);

    const aiResponse = gemRes?.reply || "AI could not find an answer.";

    res.status(200).json({ reply: aiResponse });

  } catch(err){
    console.error("AI handler error:", err);
    res.status(500).json({ reply: "AI encountered an error. Check console." });
  }
}



