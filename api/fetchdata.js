import admin from "firebase-admin";

// Initialize Firebase Admin (server-side, safe)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: "https://royalgamesproject-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

export default async function handler(req, res) {
  try {
    const db = admin.database();

    const bookingsSnap = await db.ref("bookings").once("value");
    const reviewsSnap = await db.ref("reviews").once("value");

    const bookings = [];
    bookingsSnap.forEach(c => bookings.push(c.val()));

    const reviews = [];
    reviewsSnap.forEach(c => reviews.push(c.val()));

    res.status(200).json({ bookings, reviews });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Firebase data" });
  }
}
