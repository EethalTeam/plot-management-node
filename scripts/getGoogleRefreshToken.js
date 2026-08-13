// One-time helper: run `node scripts/getGoogleRefreshToken.js` to obtain a
// Google OAuth refresh token for the Backup feature (Drive uploads).
//
// Requires GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to already
// be set in .env (from a Google Cloud "Desktop app" OAuth client).
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const http = require("http");
const url = require("url");
const { google } = require("googleapis");

const PORT = 3999;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } = process.env;

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  console.error(
    "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env.\n" +
    "Create a Desktop app OAuth client in Google Cloud Console first, then set those two values."
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== "/oauth2callback") {
    res.writeHead(404);
    return res.end();
  }

  const { code } = parsed.query;
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h2>Authorized. You can close this tab and return to the terminal.</h2>");
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n Success! Add this line to plot-management-node/.env:\n");
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    if (!tokens.refresh_token) {
      console.warn(
        "No refresh_token returned. If you've authorized this app before, revoke access at " +
        "https://myaccount.google.com/permissions and re-run this script so Google issues a new one."
      );
    }
  } catch (err) {
    console.error("Failed to exchange code for tokens:", err.message);
  } finally {
    process.exit(0);
  }
});

server.listen(PORT, () => {
  console.log("Open this URL in your browser and sign in with the Google account you want backups uploaded to:\n");
  console.log(authUrl + "\n");
  console.log(`Waiting for authorization on ${REDIRECT_URI} ...`);
});
