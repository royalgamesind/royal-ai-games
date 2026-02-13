export default function handler(req, res) {

  if (req.method === 'GET') {
    return res.status(200).json({ message: "API is working 🚀" });
  }

  if (req.method === 'POST') {
    return res.status(200).json({ message: "POST received ✅" });
  }

  return res.status(405).json({ message: "Method Not Allowed" });
}




