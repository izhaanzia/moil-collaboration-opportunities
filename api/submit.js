const { google } = require('googleapis');

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const payload = req.body || {};
    const { companyName, representative, email, contact, selections } = payload;

    // Validate required fields
    if (!companyName || !representative || !email || !contact) {
      return res.status(400).json({
        ok: false,
        error: "Missing required company contact information."
      });
    }

    const submittedAt = formatTimestamp();

    // Prepare rows for Google Sheets insertion matching CSV column layout:
    // "Submitted At", "Company Name", "Company Representative", "Company Email", "Contact Information", "Selected Collaboration Area", "Interest / Collaboration Details"
    let rowsToInsert = [];
    if (Array.isArray(selections) && selections.length > 0) {
      rowsToInsert = selections.map((item) => [
        submittedAt,
        companyName || '',
        representative || '',
        email || '',
        contact || '',
        item.area || '',
        item.details || ''
      ]);
    } else {
      rowsToInsert = [[
        submittedAt,
        companyName || '',
        representative || '',
        email || '',
        contact || '',
        '',
        ''
      ]];
    }

    console.log("New Submission received:", JSON.stringify({ submittedAt, companyName, representative, email, contact, selectionsCount: selections ? selections.length : 0 }, null, 2));

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : null;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      console.warn("Google Sheets environment variables are not fully configured. Submission logged to console.");
      return res.status(200).json({
        ok: true,
        message: "Submission received successfully (Sheets configuration pending).",
        warning: "Google Sheets environment variables are missing on server."
      });
    }

    // Authenticate with Google Sheets API using Service Account credentials
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Append rows to Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: 'A:G',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rowsToInsert
      }
    });

    return res.status(200).json({
      ok: true,
      message: "Submission saved successfully to Google Sheets."
    });
  } catch (error) {
    console.error("Submission Error:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to store submission",
      details: error.message
    });
  }
};

