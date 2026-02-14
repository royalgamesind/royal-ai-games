export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const { query } = req.body;
  if(!query) return res.status(400).json({error:"No query"});

  try{
    const response = await fetch("https://api.gemini.com/chat", {
      method:"POST",
      headers:{
        "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({ message: query })
    }).then(r=>r.json());

    const replyText = response?.reply || "AI could not answer.";
    res.status(200).json({ reply: replyText });
  } catch(err){
    console.error("Gemini Error:", err);
    res.status(500).json({ reply: "AI error occurred. Check console." });
  }
}






