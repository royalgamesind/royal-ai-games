// Optional: fallback to Gemini if empty
      if(!news && !wiki && !duck && !sports) {
        const gemRes = await safeFetch("https://api.gemini.com/chat", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        });
        aiResponse = gemRes?.reply || "AI could not find an answer.";
      }
    }

    res.status(200).json({ reply: aiResponse });

  } catch(err) {
    console.error("AI handler error:", err);
    res.status(500).json({ reply: "AI encountered an error. Check console." });
  }
                                                            }
        







          
