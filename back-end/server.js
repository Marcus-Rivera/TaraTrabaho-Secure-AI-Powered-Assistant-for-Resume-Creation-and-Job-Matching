// Import required modules
const express = require("express");
const { createClient } = require("@libsql/client");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET || "your-secret-key";
const crypto = require("crypto");
const otpStore = {};

process.env.TZ = 'Asia/Manila';

//SendGrid
const sgMail = require('@sendgrid/mail');
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Reset PW
const resetTokenStore = {};

// Test for Resume Saver
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Initialize Express application
const app = express();

// API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.set("trust proxy", 1);

// ============================================================================
// TURSO DATABASE CONNECTION
// ============================================================================
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Test connection
(async () => {
  try {
    await db.execute("SELECT 1");
    console.log("✅ Connected to Turso database");
  } catch (err) {
    console.error("❌ Failed to connect to Turso:", err);
    process.exit(1);
  }
})();

const tempUserStore = {};

// ============================================================================
// GEMINI API ENDPOINT
// ============================================================================
app.post("/api/gemini", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not defined" });
    }

    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";

    res.json({ output });
  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Something went wrong with Gemini API" });
  }
});

// ============================================================================
// LOGIN ENDPOINT
// ============================================================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts, try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: 'Too many signup attempts, try again later' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP requests, try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please slow down' },
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await db.execute({
      sql: "SELECT * FROM user WHERE LOWER(email) = LOWER(?)",
      args: [email]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ 
        status: "error", 
        message: "Invalid email or password" 
      });
    }

    if (!user.password_hash && user.google_id) {
      return res.status(401).json({ 
        status: "error", 
        message: "This account uses Google login. Please sign in with Google." 
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({ 
        status: "error", 
        message: "Account configuration error. Please contact support." 
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ 
        status: "suspended", 
        message: "Your account has been suspended. Please contact support at taratrabaho@gmail.com for assistance." 
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ 
        status: "error", 
        message: "Invalid email or password" 
      });
    }

    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role }, 
      SECRET_KEY, 
      { expiresIn: "1h" }
    );

    // Track login activity
    await db.execute({
      sql: "INSERT INTO user_activity (user_id, activity_type, activity_date) VALUES (?, 'login', date('now'))",
      args: [user.user_id]
    });

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// ============================================================================
// AUTO LOGIN
// ============================================================================
app.post("/api/auto-login", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const result = await db.execute({
      sql: "SELECT * FROM user WHERE LOWER(email) = LOWER(?) AND verified = 1",
      args: [email]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found or not verified" });
    }

    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role }, 
      SECRET_KEY, 
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Auto-login successful",
      token,
      user: {
        id: user.user_id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Auto-login error:", err);
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

// ============================================================================
// VERIFY OTP
// ============================================================================
app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const otpRecord = otpStore[normalizedEmail];
  if (!otpRecord) {
    return res.status(400).json({ success: false, message: "No OTP sent for this email" });
  }
  
  if (Date.now() > otpRecord.expires) {
    delete otpStore[normalizedEmail];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }
  
  if (otpRecord.otp !== otp) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  const tempUser = tempUserStore[normalizedEmail];
  if (!tempUser) {
    return res.status(400).json({ success: false, message: "Signup session expired. Please sign up again." });
  }

  if (Date.now() > tempUser.expires) {
    delete tempUserStore[normalizedEmail];
    return res.status(400).json({ success: false, message: "Signup session expired. Please sign up again." });
  }

  try {
    const result = await db.execute({
      sql: `INSERT INTO user (firstname, lastname, birthday, gender, username, email, phone, password_hash, role, verified, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved')`,
      args: [
        tempUser.firstname,
        tempUser.lastname,
        tempUser.birthday,
        tempUser.gender,
        tempUser.username,
        tempUser.email,
        tempUser.phone,
        tempUser.password_hash,
        tempUser.role
      ]
    });

    delete otpStore[normalizedEmail];
    delete tempUserStore[normalizedEmail];

    res.json({ 
      success: true, 
      message: "Account verified and created successfully!",
      userId: Number(result.lastInsertRowid)
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    
    if (err.message.includes("UNIQUE constraint")) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }
    
    return res.status(500).json({ success: false, message: "Database error during registration" });
  }
});

// ============================================================================
// SEND OTP
// ============================================================================
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const tempUser = tempUserStore[normalizedEmail];
  
  if (!tempUser) {
    return res.status(400).json({ 
      success: false, 
      message: "No pending signup found. Please sign up first." 
    });
  }

  const otp = crypto.randomInt(1000, 9999).toString();
  otpStore[normalizedEmail] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  try {
    const msg = {
      to: normalizedEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Tratrabaho Email Verification OTP - Resent',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #BAE8E8, #FBDA23); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #272343; margin: 0;">✉️ Email Verification (Resent)</h2>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd;">
            <p>Welcome to <strong>TaraTrabaho</strong>!</p>
            <p>Your new verification code is:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2C275C; background: #f0f9ff; padding: 15px 30px; border-radius: 8px; display: inline-block;">
                ${otp}
              </span>
            </div>
            
            <p style="color: #d32f2f; font-weight: bold;">⚠️ This code will expire in 5 minutes.</p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('✅ OTP resent to:', normalizedEmail);

    res.json({
      success: true,
      message: "OTP resent successfully! Check your email.",
    });
  } catch (mailErr) {
    console.error("❌ Error resending OTP email:", mailErr.response?.body || mailErr);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP. Please try again.",
    });
  }
});

// ============================================================================
// VERIFY TOKEN
// ============================================================================
app.post("/api/verifyToken", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.json({ valid: false });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.json({ valid: false });
    res.json({ valid: true, user: decoded });
  });
});

// ============================================================================
// SIGNUP ENDPOINT
// ============================================================================
app.post("/api/signup", signupLimiter, async (req, res) => {
  const { firstname, lastname, birthday, gender, username, email, phone, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  if (!email || !password) {
    return res.status(400).json({ status: "error", message: "Email and password are required" });
  }

  try {
    const result = await db.execute({
      sql: "SELECT * FROM user WHERE LOWER(email) = LOWER(?)",
      args: [email]
    });

    const existingUser = result.rows[0];

    if (existingUser) {
      if (existingUser.google_id && (!existingUser.password_hash || existingUser.password_hash === '')) {
        return res.status(400).json({ 
          status: "error", 
          message: "This email is registered with Google. Please sign in with Google instead." 
        });
      }
      
      return res.status(400).json({ status: "error", message: "Email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const role = "job_seeker";

    tempUserStore[normalizedEmail] = {
      firstname,
      lastname,
      birthday,
      gender,
      username,
      email: normalizedEmail,
      phone,
      password_hash,
      role,
      expires: Date.now() + 10 * 60 * 1000
    };

    const otp = crypto.randomInt(1000, 9999).toString();
    otpStore[normalizedEmail] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    const msg = {
      to: normalizedEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Tratrabaho Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #BAE8E8, #FBDA23); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #272343; margin: 0;">✉️ Email Verification</h2>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd;">
            <p>Welcome to <strong>TaraTrabaho</strong>!</p>
            <p>Your verification code is:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2C275C; background: #f0f9ff; padding: 15px 30px; border-radius: 8px; display: inline-block;">
                ${otp}
              </span>
            </div>
            
            <p style="color: #d32f2f; font-weight: bold;">⚠️ This code will expire in 5 minutes.</p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('✅ OTP email sent to:', normalizedEmail);

    res.json({
      status: "pending",
      message: "Please verify your email via OTP to complete registration.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Signup error:", error);
    
    if (error.response?.body) {
      console.error("SendGrid error:", error.response.body);
      delete tempUserStore[normalizedEmail];
      delete otpStore[normalizedEmail];
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP email. Please try again.",
      });
    }
    
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// ============================================================================
// FETCH ALL USERS
// ============================================================================
app.get("/api/users", async (req, res) => {
  try {
    const result = await db.execute("SELECT user_id, username, email, role, status FROM user");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// ============================================================================
// UPDATE USER STATUS
// ============================================================================
app.put("/api/users/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const { status } = req.body;

  try {
    const result = await db.execute({
      sql: "UPDATE user SET status = ? WHERE user_id = ?",
      args: [status, user_id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User status updated successfully" });
  } catch (err) {
    console.error("Error updating user:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// ============================================================================
// DELETE USER
// ============================================================================
app.delete("/api/users/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    // Delete in order (foreign key constraints)
    await db.execute({ sql: 'DELETE FROM user_activity WHERE user_id = ?', args: [user_id] });
    await db.execute({ sql: 'DELETE FROM resume WHERE user_id = ?', args: [user_id] });
    await db.execute({ sql: 'DELETE FROM chathistory WHERE user_id = ?', args: [user_id] });
    await db.execute({ sql: 'DELETE FROM application WHERE user_id = ?', args: [user_id] });
    await db.execute({ sql: 'DELETE FROM saved_jobs WHERE user_id = ?', args: [user_id] });
    await db.execute({ sql: 'DELETE FROM admin_saved_jobs WHERE user_id = ?', args: [user_id] });
    await db.execute({ sql: 'DELETE FROM skills WHERE user_id = ?', args: [user_id] });
    await db.execute({ sql: 'DELETE FROM profile_picture WHERE user_id = ?', args: [user_id] });
    
    const result = await db.execute({ sql: 'DELETE FROM user WHERE user_id = ?', args: [user_id] });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User and all related data deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// ============================================================================
// JOB ENDPOINTS
// ============================================================================

// GET all jobs
app.get("/api/jobs", async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT job_id, title, description, location, min_salary, max_salary, 
             vacantleft, company, company_email, type, posted, tags, remote 
      FROM job
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching jobs:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// ADD job
app.post("/api/jobs", async (req, res) => {
  const { 
    title, description, location, min_salary, max_salary, vacantleft, 
    company, company_email, type, tags, remote 
  } = req.body;

  if (!title || !description || !location || !min_salary || !max_salary || 
      !vacantleft || !company || !company_email || !type || !tags) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const posted = new Date().toISOString().split('T')[0];

  try {
    const result = await db.execute({
      sql: `INSERT INTO job (title, description, location, min_salary, max_salary, vacantleft, 
                             company, company_email, type, posted, tags, remote)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [title, description, location, min_salary, max_salary, vacantleft, 
             company, company_email, type, posted, tags, remote || 0]
    });

    res.status(201).json({
      message: "Job added successfully.",
      job_id: Number(result.lastInsertRowid),
      title, description, location, min_salary, max_salary, vacantleft,
      company, company_email, type, posted, tags, remote: remote || 0
    });
  } catch (err) {
    console.error("Error inserting job:", err);
    return res.status(500).json({ message: "Database error while adding job." });
  }
});

// UPDATE job
app.put("/api/jobs/:job_id", async (req, res) => {
  const { job_id } = req.params;
  const { 
    title, description, location, min_salary, max_salary, vacantleft, 
    company, company_email, type, posted, tags, remote 
  } = req.body;

  if (!title || !description || !location || !company || !type || !tags) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = await db.execute({
      sql: `UPDATE job 
            SET title = ?, description = ?, location = ?, min_salary = ?, max_salary = ?, 
                vacantleft = ?, company = ?, company_email = ?, type = ?, posted = ?, tags = ?, remote = ?
            WHERE job_id = ?`,
      args: [title, description, location, min_salary, max_salary, vacantleft, 
             company, company_email, type, posted, tags, remote || 0, job_id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job updated successfully" });
  } catch (err) {
    console.error("Error updating job:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// DELETE job
app.delete("/api/jobs/:job_id", async (req, res) => {
  const { job_id } = req.params;

  try {
    const result = await db.execute({
      sql: "DELETE FROM job WHERE job_id = ?",
      args: [job_id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("Error deleting job:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================

// GET profile
app.get("/api/profile/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const result = await db.execute({
      sql: "SELECT * FROM user WHERE email = ?",
      args: [email]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// UPDATE profile
app.put("/api/profile/:email", async (req, res) => {
  const { email } = req.params;
  const {
    firstname, lastname, gender, birthday, address, phone, bio,
    certification, seniorHigh, undergraduate, postgraduate,
  } = req.body;

  try {
    const result = await db.execute({
      sql: `UPDATE user
            SET firstname = ?, lastname = ?, gender = ?, birthday = ?, address = ?, 
                phone = ?, bio = ?, certification = ?, seniorHigh = ?, undergraduate = ?, postgraduate = ?
            WHERE email = ?`,
      args: [firstname, lastname, gender, birthday, address, phone, bio,
             certification, seniorHigh, undergraduate, postgraduate, email]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Track activity
    const userResult = await db.execute({
      sql: 'SELECT user_id FROM user WHERE email = ?',
      args: [email]
    });

    if (userResult.rows[0]) {
      await db.execute({
        sql: "INSERT INTO user_activity (user_id, activity_type, activity_date) VALUES (?, 'profile_updated', date('now'))",
        args: [userResult.rows[0].user_id]
      });
    }

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// ============================================================================
// RESUME ENDPOINTS
// ============================================================================

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  },
});

// Save resume
app.post('/api/resume/save', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.body;
    const filename = req.file.originalname;
    const fileData = req.file.buffer;
    const createdAt = new Date().toISOString();

    const result = await db.execute({
      sql: `INSERT INTO resume (user_id, filename, file_data, created_at) VALUES (?, ?, ?, ?)`,
      args: [userId || null, filename, fileData, createdAt]
    });

    // Track activity
    if (userId) {
      await db.execute({
        sql: "INSERT INTO user_activity (user_id, activity_type, activity_date) VALUES (?, 'resume_created', date('now'))",
        args: [userId]
      });
    }

    res.json({
      success: true,
      message: 'Resume saved successfully',
      resumeId: Number(result.lastInsertRowid), 
      filename: filename,
    });
  } catch (error) {
    console.error('Error saving resume:', error);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// Get user's resumes
app.get('/api/resume/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.execute({
      sql: `SELECT resume_id, user_id, created_at, filename FROM resume WHERE user_id = ? ORDER BY created_at DESC`,
      args: [userId]
    });

    res.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// Download resume
app.get('/api/resume/download/:resumeId', async (req, res) => {
  const { resumeId } = req.params;

  try {
    const result = await db.execute({
      sql: 'SELECT filename, file_data FROM resume WHERE resume_id = ?',
      args: [resumeId]
    });

    const resume = result.rows[0];

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.filename}"`);
    res.send(Buffer.from(resume.file_data));
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Failed to retrieve resume' });
  }
});

// Delete resume
app.delete('/api/resume/:resumeId', async (req, res) => {
  const { resumeId } = req.params;

  try {
    const result = await db.execute({
      sql: 'DELETE FROM resume WHERE resume_id = ?',
      args: [resumeId]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Failed to delete resume' });
  }
});

// ============================================================================
// CHAT HISTORY ENDPOINTS
// ============================================================================

// CREATE chat history
app.post('/api/chat/save', async (req, res) => {
  try {
    const { userId, chatData, resumeData } = req.body;
    
    if (!userId || !chatData) {
      return res.status(400).json({ error: 'userId and chatData are required' });
    }

    const chatDataString = JSON.stringify(chatData);
    const resumeDataString = resumeData ? JSON.stringify(resumeData) : null;
    const createdAt = new Date().toISOString();

    const result = await db.execute({
      sql: `INSERT INTO chathistory (user_id, chat_data, resume_data, timestamp) VALUES (?, ?, ?, ?)`,
      args: [userId, chatDataString, resumeDataString, createdAt]
    });

    res.json({ 
      success: true, 
      message: 'Chat history saved successfully',
      chatId: Number(result.lastInsertRowid)
    });
  } catch (error) {
    console.error('Error in save chat endpoint:', error);
    res.status(500).json({ error: 'Server error while saving chat' });
  }
});

// UPDATE chat history
app.put('/api/chat/update/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatData, resumeData } = req.body;
    
    if (!chatData) {
      return res.status(400).json({ error: 'chatData is required' });
    }

    const chatDataString = JSON.stringify(chatData);
    const resumeDataString = resumeData ? JSON.stringify(resumeData) : null;
    const updatedAt = new Date().toISOString();

    const result = await db.execute({
      sql: `UPDATE chathistory SET chat_data = ?, resume_data = ?, timestamp = ? WHERE chat_id = ?`,
      args: [chatDataString, resumeDataString, updatedAt, chatId]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ 
      success: true, 
      message: 'Chat history updated successfully',
      chatId: parseInt(chatId)
    });
  } catch (error) {
    console.error('Error in update chat endpoint:', error);
    res.status(500).json({ error: 'Server error while updating chat' });
  }
});

// GET chat history
app.get('/api/chat/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.execute({
      sql: `SELECT chat_id, user_id, chat_data, resume_data, timestamp
            FROM chathistory WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50`,
      args: [userId]
    });

    const parsedResults = result.rows.map(row => ({
      ...row,
      chat_data: JSON.parse(row.chat_data),
      resume_data: row.resume_data ? JSON.parse(row.resume_data) : null
    }));

    res.json({ success: true, data: parsedResults });
  } catch (error) {
    console.error('Error in get chat history endpoint:', error);
    res.status(500).json({ error: 'Server error while fetching chat history' });
  }
});

// DELETE chat history
app.delete('/api/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    const result = await db.execute({
      sql: 'DELETE FROM chathistory WHERE chat_id = ?',
      args: [chatId]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json({ success: true, message: 'Chat history deleted successfully' });
  } catch (error) {
    console.error('Error in delete chat endpoint:', error);
    res.status(500).json({ error: 'Server error while deleting chat' });
  }
});

// ============================================================================
// JOB RECOMMENDATION ENDPOINT
// ============================================================================
app.post('/api/jobs/recommend', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const resumeResult = await db.execute({
      sql: `SELECT resume_data FROM chathistory 
            WHERE user_id = ? AND resume_data IS NOT NULL
            ORDER BY timestamp DESC LIMIT 1`,
      args: [userId]
    });
    
    const resumeRow = resumeResult.rows[0];

    if (!resumeRow || !resumeRow.resume_data) {
      console.log('No resume found for user:', userId);
      return res.json({
        success: true,
        recommendations: [],
        hasResume: false,
      });
    }

    let userProfile = {};
    try {
      const resumeData = JSON.parse(resumeRow.resume_data);
      userProfile = {
        skills: resumeData.skills || [],
        experience: resumeData.experience || [],
        education: resumeData.education || [],
        objective: resumeData.objective || '',
        summary: resumeData.summary || '',
      };
      console.log('Resume found for user:', userId, '- Starting AI matching...');
    } catch (e) {
      console.error('Error parsing resume data:', e);
      return res.json({
        success: true,
        recommendations: [],
        hasResume: false,
      });
    }

    const jobsResult = await db.execute(`
      SELECT job_id, title, description, location, min_salary, max_salary, 
             vacantleft, company, type, posted, tags, remote FROM job
    `);
    
    const jobs = jobsResult.rows;

    if (jobs.length === 0) {
      return res.json({ success: true, recommendations: [] });
    }

    const prompt = `You are an AI job matching expert. Analyze the user's profile and recommend the TOP 5 most suitable jobs from the list below. 

    User Profile:
    - Skills: ${userProfile.skills.join(', ') || 'Not specified'}
    - Experience: ${JSON.stringify(userProfile.experience) || 'Not specified'}
    - Education: ${JSON.stringify(userProfile.education) || 'Not specified'}
    - Career Objective: ${userProfile.objective || 'Not specified'}
    - Summary: ${userProfile.summary || 'Not specified'}

    Available Jobs (${jobs.length} total):
    ${jobs.map((job, idx) => `
    ${idx + 1}. Job ID: ${job.job_id}
      Title: ${job.title}
      Company: ${job.company}
      Type: ${job.type}
      Location: ${job.location}
      Tags: ${job.tags}
      Description: ${job.description}
    `).join('\n')}

    IMPORTANT: 
    - Return ONLY a JSON array of exactly 5 job IDs (numbers only) in order of best match
    - Format: [job_id1, job_id2, job_id3, job_id4, job_id5]
    - If fewer than 5 jobs exist, return all available job IDs
    - Consider skills match, experience level, education requirements, and career goals
    - Prioritize jobs that align with the user's skills and career objective

    Return ONLY the JSON array, no explanation.`;

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const geminiData = await geminiResponse.json();
      const aiOutput = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      
      console.log('AI Recommendation Output:', aiOutput);

      let recommendedJobIds = [];
      try {
        const jsonMatch = aiOutput.match(/\[[\d,\s]+\]/);
        if (jsonMatch) {
          recommendedJobIds = JSON.parse(jsonMatch[0]);
        } else {
          recommendedJobIds = JSON.parse(aiOutput);
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        recommendedJobIds = jobs.slice(0, 5).map(j => j.job_id);
      }

      const recommendedJobs = recommendedJobIds
        .map(jobId => jobs.find(j => j.job_id === jobId))
        .filter(job => job !== undefined)
        .slice(0, 5);

      const formattedRecommendations = recommendedJobs.map(job => ({
        id: job.job_id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        salary: `₱${parseInt(job.min_salary).toLocaleString()} - ₱${parseInt(job.max_salary).toLocaleString()}`,
        posted: job.posted,
        description: job.description,
        tags: job.tags ? job.tags.split(',').map(tag => tag.trim()) : [],
        vacantleft: `${job.vacantleft} Vacancies Left`,
        remote: job.remote === 1,
        min_salary: job.min_salary,
        max_salary: job.max_salary,
      }));

      if (formattedRecommendations.length > 0) {
        await db.execute({
          sql: "INSERT INTO user_activity (user_id, activity_type, activity_date) VALUES (?, 'recommendation_made', date('now'))",
          args: [userId]
        });
      }

      res.json({
        success: true,
        recommendations: formattedRecommendations,
        totalJobs: jobs.length,
        hasResume: !!resumeRow,
      });

    } catch (aiError) {
      console.error('Error calling Gemini API:', aiError);
      const fallbackJobs = jobs.slice(0, 5).map(job => ({
        id: job.job_id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        salary: `₱${parseInt(job.min_salary).toLocaleString()} - ₱${parseInt(job.max_salary).toLocaleString()}`,
        posted: job.posted,
        description: job.description,
        tags: job.tags ? job.tags.split(',').map(tag => tag.trim()) : [],
        vacantleft: `${job.vacantleft} Vacancies Left`,
        remote: job.remote === 1,
      }));

      res.json({
        success: true,
        recommendations: fallbackJobs,
        totalJobs: jobs.length,
        hasResume: false,
      });
    }
  } catch (error) {
    console.error('Error in job recommendation endpoint:', error);
    res.status(500).json({ error: 'Server error while generating recommendations' });
  }
});

// ============================================================================
// GET APPLICATION STATS
// ============================================================================
app.get('/api/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const appResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM application WHERE user_id = ?',
      args: [userId]
    });

    const resumeResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM resume WHERE user_id = ?',
      args: [userId]
    });

    res.json({
      success: true,
      stats: {
        applications: appResult.rows[0]?.count || 0,
        resumes: resumeResult.rows[0]?.count || 0,
        matches: 0,
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error while fetching stats' });
  }
});

// ============================================================================
// JOB APPLICATION ENDPOINT
// ============================================================================
app.post('/api/jobs/apply', upload.single('resume'), async (req, res) => {
  try {
    const { userId, jobId, fullName, email, phone, coverLetter, resumeSource, resumeId } = req.body;
    
    if (!userId || !jobId || !fullName || !email || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    const jobResult = await db.execute({
      sql: 'SELECT * FROM job WHERE job_id = ?',
      args: [jobId]
    });

    const job = jobResult.rows[0];

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    if (!job.company_email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company email not configured for this job' 
      });
    }

    let resumeData, resumeFilename;

    if (resumeSource === 'upload' && req.file) {
      resumeData = req.file.buffer;
      resumeFilename = req.file.originalname;
    } else if (resumeSource === 'saved' && resumeId) {
      const resumeResult = await db.execute({
        sql: 'SELECT filename, file_data FROM resume WHERE resume_id = ?',
        args: [resumeId]
      });

      const savedResume = resumeResult.rows[0];

      if (!savedResume) {
        return res.status(404).json({ 
          success: false, 
          error: 'Resume not found' 
        });
      }

      resumeData = savedResume.file_data;
      resumeFilename = savedResume.filename;
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'No resume provided' 
      });
    }

    const result = await db.execute({
      sql: `INSERT INTO application 
            (user_id, job_id, full_name, email, phone, cover_letter, resume_filename, resume_data, status, applied_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      args: [userId, jobId, fullName, email, phone, coverLetter, resumeFilename, resumeData]
    });

    const applicationId = Number(result.lastInsertRowid); 

    // Track activity
    await db.execute({
      sql: "INSERT INTO user_activity (user_id, activity_type, activity_date) VALUES (?, 'job_applied', date('now'))",
      args: [userId]
    });

    // Send email to company
    const companyMsg = {
      to: job.company_email,
      from: process.env.SENDGRID_FROM_EMAIL,
      replyTo: email,
      subject: `New Job Application: ${job.title} - ${fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #BAE8E8, #FBDA23); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #272343; margin: 0;">📋 New Job Application</h2>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #ddd;">
            <h3 style="color: #272343;">${job.title}</h3>
            
            <p><strong>Applicant:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Application ID:</strong> #${applicationId}</p>
            
            ${coverLetter ? `
              <h4>Cover Letter:</h4>
              <p style="white-space: pre-line; background: #f9f9f9; padding: 15px; border-radius: 5px;">
                ${coverLetter}
              </p>
            ` : ''}
            
            <p style="margin-top: 20px; color: #666;">📎 Resume is attached to this email.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          content: Buffer.from(resumeData).toString('base64'),
          filename: resumeFilename,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    await sgMail.send(companyMsg);
    console.log('✅ Application email sent to company:', job.company_email);

    // Send confirmation to applicant
    const applicantMsg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `✅ Application Submitted - ${job.title} at ${job.company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #BAE8E8, #FBDA23); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #272343; margin: 0;">✅ Application Submitted!</h2>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #ddd;">
            <p>Hi <strong>${fullName}</strong>,</p>
            
            <p>Your application has been successfully submitted to <strong>${job.company}</strong>!</p>
            
            <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #FBDA23; margin: 20px 0;">
              <h4 style="margin-top: 0;">Application Details</h4>
              <p><strong>Position:</strong> ${job.title}</p>
              <p><strong>Company:</strong> ${job.company}</p>
              <p><strong>Location:</strong> ${job.location}</p>
              <p><strong>Application ID:</strong> #${applicationId}</p>
            </div>
            
            <h4>What's Next?</h4>
            <ol>
              <li>${job.company} will review your application</li>
              <li>If shortlisted, they will contact you at ${email} or ${phone}</li>
              <li>Response time varies (typically 1-2 weeks)</li>
            </ol>
            
            <p style="color: #666; margin-top: 20px;">Good luck! 🍀</p>
          </div>
        </div>
      `
    };

    await sgMail.send(applicantMsg);
    console.log('✅ Confirmation email sent to applicant:', email);

    // Update vacancy count
    await db.execute({
      sql: 'UPDATE job SET vacantleft = vacantleft - 1 WHERE job_id = ? AND vacantleft > 0',
      args: [jobId]
    });

    res.json({
      success: true,
      message: `Application sent to ${job.company}! Check your email for confirmation.`,
      applicationId: applicationId,
    });

  } catch (error) {
    console.error('❌ Error in application endpoint:', error.response?.body || error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit application. Please try again.' 
    });
  }
});

// ============================================================================
// GET USER'S APPLICATIONS
// ============================================================================
app.get('/api/applications/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await db.execute({
      sql: `SELECT 
              a.application_id, a.full_name, a.email, a.phone, a.cover_letter,
              a.resume_filename, a.status, a.applied_at,
              j.title as job_title, j.company, j.location, j.type
            FROM application a
            JOIN job j ON a.job_id = j.job_id
            WHERE a.user_id = ?
            ORDER BY a.applied_at DESC`,
      args: [userId]
    });
    
    res.json({ success: true, applications: result.rows });
  } catch (err) {
    console.error('Error fetching applications:', err);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ============================================================================
// DOWNLOAD APPLICATION RESUME
// ============================================================================
app.get('/api/applications/resume/:applicationId', async (req, res) => {
  const { applicationId } = req.params;
  
  try {
    const result = await db.execute({
      sql: 'SELECT resume_filename, resume_data FROM application WHERE application_id = ?',
      args: [applicationId]
    });
    
    const row = result.rows[0];
    
    if (!row) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${row.resume_filename}"`);
    res.send(Buffer.from(row.resume_data));
  } catch (err) {
    console.error('Error fetching resume:', err);
    return res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// ============================================================================
// SAVED JOBS ENDPOINTS
// ============================================================================

// GET saved jobs
app.get('/api/saved-jobs/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await db.execute({
      sql: `SELECT saved_job_id, job_id, saved_at FROM saved_jobs WHERE user_id = ? ORDER BY saved_at DESC`,
      args: [userId]
    });
    
    res.json({ success: true, savedJobs: result.rows });
  } catch (err) {
    console.error('Error fetching saved jobs:', err);
    return res.status(500).json({ error: 'Failed to fetch saved jobs' });
  }
});

// SAVE a job
app.post('/api/saved-jobs', async (req, res) => {
  const { userId, jobId } = req.body;
  
  if (!userId || !jobId) {
    return res.status(400).json({ error: 'userId and jobId are required' });
  }
  
  try {
    const result = await db.execute({
      sql: `INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)`,
      args: [userId, jobId]
    });
    
    res.json({ 
      success: true, 
      message: 'Job saved successfully',
      savedJobId: Number(result.lastInsertRowid)
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Job already saved' });
    }
    console.error('Error saving job:', err);
    return res.status(500).json({ error: 'Failed to save job' });
  }
});

// UNSAVE a job
app.delete('/api/saved-jobs/:userId/:jobId', async (req, res) => {
  const { userId, jobId } = req.params;
  
  try {
    const result = await db.execute({
      sql: 'DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?',
      args: [userId, jobId]
    });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Saved job not found' });
    }
    
    res.json({ success: true, message: 'Job unsaved successfully' });
  } catch (err) {
    console.error('Error unsaving job:', err);
    return res.status(500).json({ error: 'Failed to unsave job' });
  }
});

// ============================================================================
// PROFILE PICTURE ENDPOINTS
// ============================================================================

const profilePictureStorage = multer.memoryStorage();
const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Upload profile picture
app.post('/api/profile-picture/upload', profilePictureUpload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = req.body;
    const imageData = req.file.buffer;
    const mimeType = req.file.mimetype;
    const uploadedAt = new Date().toISOString();

    const checkResult = await db.execute({
      sql: 'SELECT picture_id FROM profile_picture WHERE user_id = ?',
      args: [userId]
    });

    if (checkResult.rows[0]) {
      await db.execute({
        sql: 'UPDATE profile_picture SET image_data = ?, mime_type = ?, uploaded_at = ? WHERE user_id = ?',
        args: [imageData, mimeType, uploadedAt, userId]
      });
      res.json({ success: true, message: 'Profile picture updated successfully' });
    } else {
      await db.execute({
        sql: 'INSERT INTO profile_picture (user_id, image_data, mime_type, uploaded_at) VALUES (?, ?, ?, ?)',
        args: [userId, imageData, mimeType, uploadedAt]
      });
      res.json({ success: true, message: 'Profile picture uploaded successfully' });
    }
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Get profile picture
app.get('/api/profile-picture/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await db.execute({
      sql: 'SELECT image_data, mime_type FROM profile_picture WHERE user_id = ?',
      args: [userId]
    });
    
    const row = result.rows[0];
    
    if (!row) {
      return res.status(404).json({ error: 'Profile picture not found' });
    }
    
    res.setHeader('Content-Type', row.mime_type);
    res.send(Buffer.from(row.image_data));
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile picture' });
  }
});

// Delete profile picture
app.delete('/api/profile-picture/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await db.execute({
      sql: 'DELETE FROM profile_picture WHERE user_id = ?',
      args: [userId]
    });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Profile picture not found' });
    }
    
    res.json({ success: true, message: 'Profile picture deleted successfully' });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ error: 'Failed to delete profile picture' });
  }
});

// ============================================================================
// SKILLS ENDPOINTS
// ============================================================================

// GET skills
app.get('/api/skills/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const result = await db.execute({
      sql: `SELECT skill_id, skill_name, created_at FROM skills WHERE user_id = ? ORDER BY created_at DESC`,
      args: [userId]
    });
    
    res.json({ success: true, skills: result.rows });
  } catch (err) {
    console.error('Error fetching skills:', err);
    return res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// ADD skill
app.post('/api/skills', async (req, res) => {
  const { userId, skillName } = req.body;
  
  if (!userId || !skillName) {
    return res.status(400).json({ error: 'userId and skillName are required' });
  }
  
  try {
    const result = await db.execute({
      sql: `INSERT INTO skills (user_id, skill_name) VALUES (?, ?)`,
      args: [userId, skillName.trim()]
    });
    
    res.json({ 
      success: true, 
      message: 'Skill added successfully',
      skill: {
        skill_id: Number(result.lastInsertRowid),  // ← Convert BigInt to Number
        skill_name: skillName.trim()
      }
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Skill already exists' });
    }
    console.error('Error adding skill:', err);
    return res.status(500).json({ error: 'Failed to add skill' });
  }
});

// DELETE skill
app.delete('/api/skills/:skillId', async (req, res) => {
  const { skillId } = req.params;
  
  try {
    const result = await db.execute({
      sql: 'DELETE FROM skills WHERE skill_id = ?',
      args: [skillId]
    });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    
    res.json({ success: true, message: 'Skill deleted successfully' });
  } catch (err) {
    console.error('Error deleting skill:', err);
    return res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// BULK UPDATE skills
app.put('/api/skills/bulk/:userId', async (req, res) => {
  const { userId } = req.params;
  const { skills } = req.body;
  
  if (!Array.isArray(skills)) {
    return res.status(400).json({ error: 'skills must be an array' });
  }
  
  try {
    await db.execute({
      sql: 'DELETE FROM skills WHERE user_id = ?',
      args: [userId]
    });
    
    if (skills.length === 0) {
      return res.json({ success: true, message: 'All skills removed' });
    }
    
    for (const skill of skills) {
      await db.execute({
        sql: 'INSERT INTO skills (user_id, skill_name) VALUES (?, ?)',
        args: [userId, skill.trim()]
      });
    }
    
    res.json({ success: true, message: 'Skills updated successfully' });
  } catch (err) {
    console.error('Error updating skills:', err);
    return res.status(500).json({ error: 'Failed to update skills' });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Track activity
app.post('/api/analytics/track', async (req, res) => {
  const { userId, activityType } = req.body;
  
  if (!userId || !activityType) {
    return res.status(400).json({ error: 'userId and activityType required' });
  }
  
  const activityDate = new Date().toISOString().split('T')[0];
  
  try {
    await db.execute({
      sql: `INSERT INTO user_activity (user_id, activity_type, activity_date) VALUES (?, ?, ?)`,
      args: [userId, activityType, activityDate]
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error tracking activity:', err);
    return res.status(500).json({ error: 'Failed to track activity' });
  }
});

// Daily users
app.get('/api/analytics/daily-users', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        activity_date as date,
        COUNT(DISTINCT user_id) as count
      FROM user_activity
      WHERE activity_type = 'login'
        AND activity_date >= date('now', '-30 days')
      GROUP BY activity_date
      ORDER BY activity_date ASC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching daily users:', err);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Resumes stats
app.get('/api/analytics/resumes', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM resume
      WHERE created_at >= date('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching resume stats:', err);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Applications stats
app.get('/api/analytics/applications', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        DATE(applied_at) as date,
        COUNT(*) as count
      FROM application
      WHERE applied_at >= date('now', '-30 days')
      GROUP BY DATE(applied_at)
      ORDER BY date ASC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching application stats:', err);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Matches stats
app.get('/api/analytics/matches', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        activity_date as date,
        COUNT(*) as count
      FROM user_activity
      WHERE activity_type = 'recommendation_made'
        AND activity_date >= date('now', '-30 days')
      GROUP BY activity_date
      ORDER BY activity_date ASC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching match stats:', err);
    return res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Summary stats
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const totalUsersResult = await db.execute('SELECT COUNT(*) as count FROM user WHERE role = "job_seeker"');
    const totalResumesResult = await db.execute('SELECT COUNT(*) as count FROM resume');
    const totalApplicationsResult = await db.execute('SELECT COUNT(*) as count FROM application');
    const totalJobsResult = await db.execute('SELECT COUNT(*) as count FROM job');
    const activeUsersTodayResult = await db.execute(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM user_activity 
      WHERE activity_date = date('now')
    `);
    const applicationsTodayResult = await db.execute(`
      SELECT COUNT(*) as count 
      FROM application 
      WHERE DATE(applied_at) = date('now')
    `);
    
    res.json({ 
      success: true, 
      summary: {
        totalUsers: totalUsersResult.rows[0].count,
        totalResumes: totalResumesResult.rows[0].count,
        totalApplications: totalApplicationsResult.rows[0].count,
        totalJobs: totalJobsResult.rows[0].count,
        activeUsersToday: activeUsersTodayResult.rows[0].count,
        applicationsToday: applicationsTodayResult.rows[0].count
      }
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
    return res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// ============================================================================
// GOOGLE OAUTH
// ============================================================================
app.post("/api/auth/google", async (req, res) => {
  try {
    const { email, firstname, lastname, googleId, picture, email_verified } = req.body;

    if (!email_verified) {
      return res.status(400).json({ 
        success: false, 
        message: "Email not verified by Google. Please use a verified Google account." 
      });
    }

    const checkResult = await db.execute({
      sql: 'SELECT * FROM user WHERE LOWER(email) = LOWER(?)',
      args: [email]
    });

    let user = checkResult.rows[0];

    if (user) {
      if (user.status === 'suspended') {
        return res.status(403).json({ 
          success: false,
          status: "suspended",
          message: "Your account has been suspended. Please contact support at taratrabaho@gmail.com for assistance." 
        });
      }

      if (!user.google_id) {
        await db.execute({
          sql: 'UPDATE user SET google_id = ? WHERE user_id = ?',
          args: [googleId, user.user_id]
        });
      }

      await db.execute({
        sql: "INSERT INTO user_activity (user_id, activity_type, activity_date) VALUES (?, 'login', date('now'))",
        args: [user.user_id]
      });

    } else {
      const username = email.split('@')[0];
      
      const insertResult = await db.execute({
        sql: `INSERT INTO user (firstname, lastname, username, email, google_id, verified, role, status, password_hash)
              VALUES (?, ?, ?, ?, ?, 1, 'job_seeker', 'approved', '')`,
        args: [firstname || 'User', lastname || '', username, email, googleId]
      });

      const userResult = await db.execute({
        sql: 'SELECT * FROM user WHERE user_id = ?',
        args: [Number(insertResult.lastInsertRowid)] 
      });

      user = userResult.rows[0];

      await db.execute({
        sql: "INSERT INTO user_activity (user_id, activity_type, activity_date) VALUES (?, 'signup', date('now'))",
        args: [user.user_id]
      });
    }

    const token = jwt.sign(
      { id: user.user_id, email: user.email, role: user.role }, 
      SECRET_KEY, 
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user.user_id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        status: user.status,
      },
    });

  } catch (error) {
    console.error("❌ Google auth error:", error);
    
    if (error.message === "Email already exists") {
      return res.status(400).json({ 
        success: false, 
        message: "Email already exists. Please try logging in instead." 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Server error during Google authentication. Please try again." 
    });
  }
});

// ============================================================================
// UPDATE USER ROLE
// ============================================================================
app.put("/api/users/:user_id/role", async (req, res) => {
  const { user_id } = req.params;
  const { role } = req.body;

  if (!['job_seeker', 'admin'].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const result = await db.execute({
      sql: `UPDATE user SET role = ? WHERE user_id = ?`,
      args: [role, user_id]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User role updated successfully" });
  } catch (err) {
    console.error("Error updating user role:", err);
    return res.status(500).json({ message: "Database error" });
  }
});

// ============================================================================
// PASSWORD RESET ENDPOINTS
// ============================================================================

// Forget password
app.post("/api/forget-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await db.execute({
      sql: `SELECT * FROM user WHERE LOWER(email) = LOWER(?)`,
      args: [normalizedEmail]
    });

    const user = result.rows[0];

    if (!user) {
      return res.json({ 
        success: true, 
        message: "If this email exists, a reset link has been sent." 
      });
    }

    if (user.google_id && (!user.password_hash || user.password_hash === '')) {
      return res.json({ 
        success: true, 
        message: "If this email exists, a reset link has been sent." 
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    
    resetTokenStore[resetToken] = {
      email: normalizedEmail,
      userId: user.user_id,
      expires: Date.now() + 30 * 60 * 1000
    };

    const resetLink = `https://tara-trabaho-secure-ai-powered-assi.vercel.app/reset-password/${resetToken}`;

    const msg = {
      to: normalizedEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Reset Your Password - TaraTrabaho",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #BAE8E8, #FBDA23); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #272343; margin: 0;">🔐 Password Reset Request</h2>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
            <p>Hi <strong>${user.firstname}</strong>,</p>
            
            <p>We received a request to reset your password for your TaraTrabaho account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                style="background: #2C275C; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 13px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link in your browser:<br>
              <a href="${resetLink}" style="color: #2C275C; word-break: break-all; font-size: 12px;">${resetLink}</a>
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
              <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ This link will expire in 30 minutes.</p>
            </div>
            
            <p style="color: #666; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              If you didn't request this password reset, please ignore this email. Your password won't change unless you click the link above.
            </p>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);
    console.log('✅ Password reset email sent to:', normalizedEmail);

    res.json({ 
      success: true, 
      message: "If this email exists, a reset link has been sent. Please check your inbox." 
    });

  } catch (error) {
    console.error("❌ Error in forget-password:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send reset email. Please try again later." 
    });
  }
});

// Verify reset token
app.get("/api/verify-reset-token/:token", (req, res) => {
  const { token } = req.params;

  const tokenData = resetTokenStore[token];
  
  if (!tokenData) {
    return res.status(400).json({ 
      valid: false, 
      message: "Invalid or expired reset link. Please request a new one." 
    });
  }

  if (Date.now() > tokenData.expires) {
    delete resetTokenStore[token];
    return res.status(400).json({ 
      valid: false, 
      message: "Reset link has expired. Please request a new one." 
    });
  }

  res.json({ 
    valid: true, 
    email: tokenData.email 
  });
});

// Reset password
app.post("/api/reset-password", async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ 
      success: false, 
      message: "Token and password are required" 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must be at least 6 characters long" 
    });
  }

  const tokenData = resetTokenStore[token];
  
  if (!tokenData) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid or expired reset link. Please request a new one." 
    });
  }

  if (Date.now() > tokenData.expires) {
    delete resetTokenStore[token];
    return res.status(400).json({ 
      success: false, 
      message: "Reset link has expired. Please request a new one." 
    });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.execute({
      sql: `UPDATE user SET password_hash = ? WHERE email = ?`,
      args: [password_hash, tokenData.email]
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    delete resetTokenStore[token];

    console.log('✅ Password reset successful for:', tokenData.email);

    // Send confirmation email
    const msg = {
      to: tokenData.email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "Password Reset Confirmation - TaraTrabaho",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #BAE8E8, #FBDA23); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #272343; margin: 0;">✅ Password Reset Successful</h2>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
            <p>Your TaraTrabaho password has been successfully reset.</p>
            <p>You can now login with your new password.</p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
              <p style="color: #856404; margin: 0;">
                <strong>⚠️ Security Alert:</strong> If you didn't make this change, please contact support immediately at taratrabaho@gmail.com
              </p>
            </div>
          </div>
        </div>
      `
    };

    await sgMail.send(msg);

    res.json({ 
      success: true, 
      message: "Password reset successfully! You can now login with your new password." 
    });

  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error. Please try again later." 
    });
  }
});

// Cleanup expired tokens
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [token, data] of Object.entries(resetTokenStore)) {
    if (now > data.expires) {
      delete resetTokenStore[token];
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired reset tokens`);
  }
}, 15 * 60 * 1000);

// ============================================================================
// CHECK AUTH METHOD
// ============================================================================
app.post("/api/check-auth-method", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await db.execute({
      sql: `SELECT google_id, password_hash FROM user WHERE LOWER(email) = LOWER(?)`,
      args: [email]
    });

    const user = result.rows[0];

    if (!user) {
      return res.json({ 
        isGoogleAccount: false,
        exists: false 
      });
    }

    const isGoogleOnly = user.google_id && (!user.password_hash || user.password_hash === '');

    res.json({ 
      isGoogleAccount: isGoogleOnly,
      exists: true 
    });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// ============================================================================
// ADMIN SAVED JOBS ENDPOINTS
// ============================================================================

// GET admin saved jobs
app.get('/api/admin-saved-jobs/:userId', async (req, res) => {
  const { userId } = req.params;
  
  console.log('📥 Fetching saved jobs for user:', userId);
  
  try {
    const result = await db.execute({
      sql: `SELECT saved_job_id, job_id, saved_at FROM admin_saved_jobs WHERE user_id = ? ORDER BY saved_at DESC`,
      args: [userId]
    });
    
    console.log('✅ Found saved jobs:', result.rows);
    res.json({ success: true, savedJobs: result.rows });
  } catch (err) {
    console.error('❌ Error fetching admin saved jobs:', err);
    return res.status(500).json({ error: 'Failed to fetch saved jobs' });
  }
});

// SAVE job (admin)
app.post('/api/admin-saved-jobs', async (req, res) => {
  const { userId, jobId } = req.body;
  
  if (!userId || !jobId) {
    return res.status(400).json({ error: 'userId and jobId are required' });
  }
  
  console.log('💾 Saving job:', jobId, 'for user:', userId);
  
  try {
    const result = await db.execute({
      sql: `INSERT INTO admin_saved_jobs (user_id, job_id) VALUES (?, ?)`,
      args: [userId, jobId]
    });
    
    console.log('✅ Job saved successfully with ID:', result.lastInsertRowid);
    res.json({ 
      success: true, 
      message: 'Job saved successfully',
      savedJobId: Number(result.lastInsertRowid) 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Job already saved' });
    }
    console.error('❌ Error saving job:', err);
    return res.status(500).json({ error: 'Failed to save job' });
  }
});

// UNSAVE job (admin)
app.delete('/api/admin-saved-jobs/:userId/:jobId', async (req, res) => {
  const { userId, jobId } = req.params;
  
  console.log('🗑️ Unsaving job:', jobId, 'for user:', userId);
  
  try {
    const result = await db.execute({
      sql: 'DELETE FROM admin_saved_jobs WHERE user_id = ? AND job_id = ?',
      args: [userId, jobId]
    });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Saved job not found' });
    }
    
    console.log('✅ Job unsaved successfully');
    res.json({ success: true, message: 'Job unsaved successfully' });
  } catch (err) {
    console.error('❌ Error unsaving job:', err);
    return res.status(500).json({ error: 'Failed to unsave job' });
  }
});


// ============================================================================
// SERVER START
// ============================================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🚀 Connected to Turso database`);
});