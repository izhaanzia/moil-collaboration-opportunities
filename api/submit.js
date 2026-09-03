module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const payload = req.body;

      // Log the submission to Vercel Logs
      console.log("New Submission received:", JSON.stringify(payload, null, 2));

      // Successfully received
      return res.status(200).json({
        ok: true,
        message: "Submission received successfully."
      });
    } catch (error) {
      console.error("Submission Error:", error);
      return res.status(500).json({
        ok: false,
        error: "Internal Server Error"
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
