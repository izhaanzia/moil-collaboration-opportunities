export default async function handler(req, res) {
  if (req.method === 'POST') {
    const payload = req.body;

    // Log the submission so it appears in your Vercel logs
    console.log("New Submission received:", JSON.stringify(payload, null, 2));

    // NOTE: Vercel is a serverless environment with a read-only filesystem.
    // fs.appendFileSync("moil-collaboration-responses.csv") will NOT work here.
    // To save data permanently, consider using a database (e.g., Vercel KV, Supabase)
    // or a service like Formspree.

    return res.status(200).json({
      ok: true,
      message: "Submission received! (Note: Local CSV storage is not supported on Vercel; check your logs or connect a database.)"
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
