import firebase from "firebase/app";
import "firebase/database";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

export default async function handler(req, res) {
  try {
    const { query, type } = req.body;
    if (!query) return res.status(400).json({ reply: "No query provided" });

    let apiData = "";

    // ---------- STEP 1: fetch from external APIs ----------
    switch(type) {
      case "news": {
        const NEWS_API_KEY = process.env.NEWS_API_KEY;
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=3&apiKey=${NEWS_API_KEY}`;
        const data = await (await fetch(url)).json();
        apiData = data.articles?.map(a => `${a.title} - ${a.description || ""}`).join("\n") || "No news found.";
        break;
      }
      case "wikipedia": {
        const WIKI_API_URL = process.env.WIKI_API_URL;
        const searchUrl = `${WIKI_API_URL}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        const searchData = await (await fetch(searchUrl)).json();
        if (searchData.query.search.length) {
          const title = searchData.query.search[0].title;
          const extractUrl = `${WIKI_API_URL}?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(title)}&format=json&origin=*`;
          const extractData = await (await fetch(extractUrl)).json();
          apiData = Object.values(extractData.query.pages)[0].extract || "No summary found.";
        } else apiData = "No Wikipedia page found.";
        break;
      }
      case "duck": {
        const DUCK_API = process.env.DUCKDUCKGO_URL;
        const data = await (await fetch(`${DUCK_API}?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`)).json();
        apiData = data.AbstractText || "No result found on DuckDuckGo.";
        break;
      }
      case "sports": {
        const SPORTSDB_KEY = process.env.SPORTSDB_KEY;
        const data = await (await fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/searchteams.php?t=${encodeURIComponent(query)}`)).json();
        if (data.teams?.length) {
          const t = data.teams[0];
          apiData = `Team: ${t.strTeam}, League: ${t.strLeague}, Stadium: ${t.strStadium}`;
        } else apiData = "No sports team found.";
        break;
      }
      case "gemini":
        apiData = query;
        break;
    }

    // ---------- STEP 2: Ask Gemini to generate response & possible commands ----------
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const geminiRes = await fetch("https://api.google.com/gemini/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        message: `
You are a smart AI assistant. Answer this query naturally, like ChatGPT.
Query: "${query}"
Context from API: "${apiData}"

If the user requests a database change (bookings, customers, reviews), return command in the format:
- Change booking <ID> status to <Status>
- Tag customer <Phone> as BARGAINER
- Delete review <ID>

Otherwise, return only natural answer.
`
      })
    });

    const geminiData = await geminiRes.json();
    let replyText = geminiData.reply || "No response from Gemini.";

    // ---------- STEP 3: Detect & execute Firebase commands ----------
    const SAFE_STATUSES = ["Active","Completed","Cancelled"];

    // Change booking status
    let match = replyText.match(/Change booking (\w+) status to (\w+)/i);
    if (match) {
      const [_, bookingID, status] = match;
      const newStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      if (SAFE_STATUSES.includes(newStatus)) {
        await db.ref(`bookings/${bookingID}`).update({ status: newStatus });
        replyText += `\n✅ Booking ${bookingID} updated to ${newStatus}`;
      }
    }

    // Delete review
    match = replyText.match(/Delete review (\w+)/i);
    if (match) {
      const reviewID = match[1];
      await db.ref(`reviews/${reviewID}`).remove();
      replyText += `\n✅ Review ${reviewID} deleted`;
    }

    // Tag Bargainer
    match = replyText.match(/Tag customer (\w+) as BARGAINER/i);
    if (match) {
      const phone = match[1];
      await db.ref(`customerNotes/${phone}`).set({ tag: "BARGAINER", timestamp: Date.now() });
      replyText += `\n✅ Customer ${phone} tagged as BARGAINER`;
    }

    // Show visitors who didn’t book today
    if (/show me visitors who didn’t book/i.test(replyText)) {
      const todayKey = new Date().toISOString().split("T")[0];
      const snap = await db.ref(`dailyVisitors/${todayKey}`).once("value");
      const nonBookers = [];
      snap.forEach(child => { if (!child.val().booked) nonBookers.push(child.key); });
      replyText += `\nVisitors who didn’t book today: ${nonBookers.join(", ") || "None"}`;
    }

    res.status(200).json({ reply: replyText });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Error processing query" });
  }
      }



