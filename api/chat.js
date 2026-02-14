// /api/fetchInfo.js
export default async function handler(req, res) {
  try {
    const { query, type } = req.body;
    if (!query) return res.status(400).json({ reply: "No query provided" });

    let reply = "";

    switch (type) {
      // ---------- NEWS ----------
      case "news": {
        const NEWS_API_KEY = process.env.NEWS_API_KEY;
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=3&apiKey=${NEWS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.articles && data.articles.length > 0) {
          reply = data.articles.map(a => `${a.title} (${a.source.name})`).join("\n\n");
        } else {
          reply = "No news found.";
        }
        break;
      }

      // ---------- WIKIPEDIA ----------
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
          const page = Object.values(extractData.query.pages)[0];
          reply = page.extract || "No summary found.";
        } else {
          reply = "No Wikipedia page found.";
        }
        break;
      }

      // ---------- DUCKDUCKGO ----------
      case "duck": {
        const DUCK_API = process.env.DUCKDUCKGO_URL;
        const url = `${DUCK_API}?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
        const response = await fetch(url);
        const data = await response.json();
        reply = data.AbstractText || "No result found on DuckDuckGo.";
        break;
      }

      // ---------- SPORTSDB ----------
      case "sports": {
        const SPORTSDB_KEY = process.env.SPORTSDB_KEY;
        const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/searchteams.php?t=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.teams && data.teams.length > 0) {
          const team = data.teams[0];
          reply = `Team: ${team.strTeam}\nLeague: ${team.strLeague}\nStadium: ${team.strStadium}\nDescription: ${team.strDescriptionEN?.substring(0, 200)}...`;
        } else {
          reply = "No sports team found.";
        }
        break;
      }

      // ---------- GOOGLE GEMINI ----------
      case "gemini": {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const url = "https://api.google.com/gemini/ask"; // Replace with actual Gemini API endpoint
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GEMINI_API_KEY}`
          },
          body: JSON.stringify({ message: query })
        });
        const data = await response.json();
        reply = data.reply || "No response from Gemini.";
        break;
      }

      default:
        reply = "Unknown query type. Use 'news', 'wikipedia', 'duck', 'sports', or 'gemini'.";
    }

    res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Error processing query." });
  }
}






