import firebase from "firebase/app";
import "firebase/database";

// ------------------ Firebase Initialization ------------------
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

// ------------------ Safe fetch with timeout ------------------
async function fetchWithTimeout(url, options={}, timeout=5000){
  return Promise.race([
    fetch(url, options).then(r=>r.json()).catch(()=>null),
    new Promise(resolve => setTimeout(()=>resolve(null), timeout))
  ]);
}

// ------------------ Build Shop Report ------------------
async function buildBusinessReport() {
  try {
    const bookingsSnap = await db.ref("bookings").once("value");
    const noteSnap = await db.ref("customerNotes").once("value");
    const visitorSnap = await db.ref("dailyVisitors").once("value");

    let report = "", totalBookings = 0, totalRevenue = 0, completed = 0, cancelled = 0, active = 0;
    const bargainCustomers = {};
    noteSnap.forEach(n => { if(n.val().tag === "BARGAINER") bargainCustomers[n.key] = true; });

    bookingsSnap.forEach(c => {
      const d = c.val();
      totalBookings++;
      totalRevenue += Number(d.finalPrice || 0);
      if(d.status === "Completed") completed++;
      if(d.status === "Cancelled") cancelled++;
      if(d.status === "Active") active++;
      const bargain = bargainCustomers[d.phone] ? "YES" : "NO";
      report += `\nCustomer: ${d.name}\nPhone: ${d.phone}\nConsole: ${d.console}\nPaid: ₹${d.finalPrice}\nStatus: ${d.status}\nBargainer: ${bargain}\n---------------------`;
    });

    let totalVisitors = 0, bookedVisitors = 0;
    visitorSnap.forEach(day => { day.forEach(v => { totalVisitors++; if(v.val().booked) bookedVisitors++; }); });

    return `===== BUSINESS STATS =====\nTotal Bookings: ${totalBookings}\nRevenue: ₹${totalRevenue}\nCompleted: ${completed}\nCancelled: ${cancelled}\nActive: ${active}\nVisitors: ${totalVisitors}\nConverted Customers: ${bookedVisitors}\n===== CUSTOMER DATA =====\n${report}`;
  } catch(err) {
    console.error("Business report error:", err);
    return "[Failed to load business data]";
  }
}

// ------------------ Handle Admin Commands ------------------
async function handleAdminCommand(replyText) {
  const dbRef = db.ref();
  let match;

  // Change booking status
  match = replyText.match(/Change booking (\w+) status to (\w+)/i);
  if(match){
    const [_, bookingID, status] = match;
    const newStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const SAFE_STATUSES = ["Active","Completed","Cancelled"];
    if(SAFE_STATUSES.includes(newStatus)){
      try { await dbRef.child(`bookings/${bookingID}`).update({status:newStatus}); } catch(e){ console.error(e); }
      return `✅ Booking ${bookingID} updated to ${newStatus}`;
    }
    return `⚠️ Invalid status: ${status}`;
  }

  // Delete review
  match = replyText.match(/Delete review (\w+)/i);
  if(match){
    const reviewID = match[1];
    try { await dbRef.child(`reviews/${reviewID}`).remove(); } catch(e){ console.error(e); }
    return `✅ Review ${reviewID} deleted`;
  }

  // Tag customer as Bargainer
  match = replyText.match(/Tag customer (\w+) as BARGAINER/i);
  if(match){
    const phone = match[1];
    try { await dbRef.child(`customerNotes/${phone}`).set({tag:"BARGAINER", timestamp:Date.now()}); } catch(e){ console.error(e); }
    return `✅ Customer ${phone} tagged as BARGAINER`;
  }

  return replyText;
}

// ------------------ Main API ------------------
export default async function handler(req, res){
  try {
    if(req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
    const { message } = req.body;
    if(!message) return res.status(400).json({error:"No message provided"});

    let aiResponse = "";
    const businessKeywords = ["booking","vip","customer","revenue","bargainer","earnings","completed","cancelled"];
    const isBusiness = businessKeywords.some(k => message.toLowerCase().includes(k));

    if(isBusiness){
      // --- Business Query ---
      const report = await buildBusinessReport();
      const prompt = `You are a smart AI assistant. Answer owner questions based on shop data ONLY.\nOwner Question: ${message}\nShop Summary:\n${report}`;
      
      const gemRes = await fetchWithTimeout("https://api.gemini.com/chat", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
      }, 7000);

      aiResponse = gemRes?.reply ? await handleAdminCommand(gemRes.reply) : "AI could not understand shop data.";
    } else {
      // --- General Internet Query ---
      const [news, wiki, duck] = await Promise.all([
        process.env.NEWS_API_KEY ? fetchWithTimeout(`https://newsapi.org/v2/everything?q=${encodeURIComponent(message)}&pageSize=3&apiKey=${process.env.NEWS_API_KEY}`) : null,
        fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(message)}`),
        fetchWithTimeout(`https://api.duckduckgo.com/?q=${encodeURIComponent(message)}&format=json&no_redirect=1`)
      ]);

      if(news?.articles) aiResponse += "News:\n" + news.articles.map(a => `${a.title} - ${a.description}`).join("\n") + "\n\n";
      if(wiki?.extract) aiResponse += "Wikipedia:\n" + wiki.extract + "\n\n";
      if(duck?.RelatedTopics) aiResponse += "DuckDuckGo:\n" + duck.RelatedTopics.slice(0,5).map(d=>d.Text).join("\n") + "\n";

      // fallback to Gemini if all null
      if(!aiResponse){
        const gemRes = await fetchWithTimeout("https://api.gemini.com/chat", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        }, 7000);
        aiResponse = gemRes?.reply || "AI could not find an answer";
      }
    }

    res.status(200).json({ reply: aiResponse });

  } catch(err){
    console.error("AI handler error:", err);
    res.status(500).json({ reply: "AI encountered an error. Check console." });
  }
        }
          




          
