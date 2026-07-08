const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");
const dayjs = require("dayjs");

const BACKUP_DIR = path.join(__dirname, "..", "backups");

const runMongoDump = (uri, archivePath) => {
  return new Promise((resolve, reject) => {
    const bin = process.env.MONGODUMP_PATH || "mongodump";
    execFile(
      bin,
      ["--uri", uri, `--archive=${archivePath}`, "--gzip"],
      { maxBuffer: 1024 * 1024 * 100 },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        resolve();
      }
    );
  });
};

const runMongoRestore = (uri, archivePath) => {
  return new Promise((resolve, reject) => {
    const bin = process.env.MONGORESTORE_PATH || "mongorestore";
    execFile(
      bin,
      ["--uri", uri, `--archive=${archivePath}`, "--gzip", "--drop"],
      { maxBuffer: 1024 * 1024 * 100 },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        resolve();
      }
    );
  });
};

const getDriveClient = () => {
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env;

  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
    throw new Error(
      "Google OAuth credentials missing. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REFRESH_TOKEN in .env (run scripts/getGoogleRefreshToken.js once to obtain the refresh token)."
    );
  }

  const oauth2Client = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });

  return google.drive({ version: "v3", auth: oauth2Client });
};

const uploadToDrive = async (filePath, fileName) => {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

  const { data } = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType: "application/gzip",
      body: fs.createReadStream(filePath),
    },
    fields: "id, webViewLink",
  });

  return data;
};

const downloadFromDrive = async (fileId, destPath) => {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  await new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    res.data.on("end", resolve).on("error", reject).pipe(dest);
    dest.on("error", reject);
  });
};

exports.listBackups = async (req, res) => {
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!folderId) {
    return res.status(500).json({
      success: false,
      message: "GOOGLE_DRIVE_BACKUP_FOLDER_ID is not configured on the server (.env).",
    });
  }

  try {
    const drive = getDriveClient();
    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, createdTime, size, webViewLink)",
      orderBy: "createdTime desc",
      pageSize: 100,
    });

    res.status(200).json({ success: true, data: data.files || [] });
  } catch (err) {
    console.error("Failed to list backups:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.restoreBackup = async (req, res) => {
  const { fileId, confirm } = req.body;

  if (!fileId) {
    return res.status(400).json({ success: false, message: "fileId is required." });
  }
  if (confirm !== "RESTORE") {
    return res.status(400).json({
      success: false,
      message: 'Restore not confirmed. Send confirm: "RESTORE" to proceed.',
    });
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    return res.status(500).json({
      success: false,
      message: "MONGO_URI is not configured on the server (.env).",
    });
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const tempPath = path.join(BACKUP_DIR, `restore-${Date.now()}.gz`);

  try {
    await downloadFromDrive(fileId, tempPath);
  } catch (err) {
    console.error("Failed to download backup from Drive:", err.message);
    return res.status(500).json({
      success: false,
      message: `Failed to download backup from Google Drive: ${err.message}`,
    });
  }

  try {
    await runMongoRestore(mongoUri, tempPath);
  } catch (err) {
    console.error("mongorestore failed:", err.message);
    return res.status(500).json({
      success: false,
      message: `mongorestore failed: ${err.message}`,
    });
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error("Failed to delete temp restore file:", err.message);
    }
  }

  res.status(200).json({
    success: true,
    message: "Database restored from the selected backup.",
  });
};

exports.runBackup = async (req, res) => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    return res.status(500).json({
      success: false,
      message: "MONGO_URI is not configured on the server (.env).",
    });
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const fileName = `backup-${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.gz`;
  const archivePath = path.join(BACKUP_DIR, fileName);

  try {
    await runMongoDump(mongoUri, archivePath);
  } catch (err) {
    console.error("mongodump failed:", err.message);
    return res.status(500).json({
      success: false,
      message: `mongodump failed: ${err.message}`,
    });
  }

  let driveFile;
  try {
    driveFile = await uploadToDrive(archivePath, fileName);
  } catch (err) {
    console.error("Google Drive upload failed:", err.message);
    return res.status(500).json({
      success: false,
      message: `Backup file created but Google Drive upload failed: ${err.message}`,
      fileName,
      keptLocal: true,
    });
  }

  try {
    fs.unlinkSync(archivePath);
  } catch (err) {
    console.error("Failed to delete local backup after upload:", err.message);
  }

  res.status(200).json({
    success: true,
    message: "Backup uploaded to Google Drive and the local copy was removed.",
    fileName,
    driveFileId: driveFile.id,
    driveLink: driveFile.webViewLink,
  });
};
