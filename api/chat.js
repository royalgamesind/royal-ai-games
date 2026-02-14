export default async function handler(req, res) {
  try {
    const { query, type } = req.body;
    if (!query) return res.status(400).json({ reply: "No query provided" });

    let apiData = "";

    switch (type) {
      case "news": {
        const NEWS_API_KEY = process.env.NEWS_API_KEY;
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=3&apiKey=${NEWS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.articles && data.articles.length > 0) {
          apiData = data.articles.map(a => `${a.title} (${a.source.name}) - ${a.description || ""}`).join("\n");
        } else apiData = "No news found.";
        break;
      }
      case "wikipedia": {
        const WIKI_API_URL = process.env.WIKI_API_URL;
        const searchUrl = `${WIKI_API_URL}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        if (searchData.query.search && searchData.query.search.length > 0) {
          const title = searchData.query.search[0].title;
          const extractUrl = `${WIKI_API_URL}?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(title)}&format=json&origin=*`;
          const extractRes = await fetch(extractUrl);
          const extractData = await extractRes.json();
          apiData = Object.values(extractData.query.pages)[0].extract || "No summary found.";
        } else apiData = "No Wikipedia page found.";
        break;
      }
      case "duck": {
        const DUCK_API = process.env.DUCKDUCKGO_URL;
        const url = `${DUCK_API}?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
        const response = await fetch(url);
        const data = await response.json();
        apiData = data.AbstractText || "No result found on DuckDuckGo.";
        break;
      }
      case "sports": {
        const SPORTSDB_KEY = process.env.SPORTSDB_KEY;
        const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/searchteams.php?t=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.teams && data.teams.length > 0) {
          const team = data.teams[0];
          apiData = `Team: ${team.strTeam}\nLeague: ${team.strLeague}\nStadium: ${team.strStadium}\nDescription: ${team.strDescriptionEN}`;
        } else apiData = "No sports team found.";
        break;
      }
      case "gemini":
        apiData = query; // Gemini can handle direct queries
        break;
      default:
        return res.status(400).json({ reply: "Unknown type" });
    }

    // ---------- FORMAT USING GOOGLE GEMINI ----------
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const geminiRes = await fetch("https://api.google.com/gemini/ask", { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        message: `Please answer this query in a conversational style like ChatGPT. 
Query: "${query}" 
Context / Info from API: "${apiData}"`
      })
    });
    const geminiData = await geminiRes.json();
    const reply = geminiData.reply || "Could not generate response";

    res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Error processing query" });
  }
}





        
