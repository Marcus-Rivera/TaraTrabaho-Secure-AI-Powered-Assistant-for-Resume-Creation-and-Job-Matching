// Import required modules
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();
// Test for Resume Saver
const multer = require('multer');
const path = require('path');

// Initialize Express application
const app = express();

// Keys
const SECRET_KEY = process.env.SECRET_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT;

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Connect to SQLite database
const db = new sqlite3.Database("tratrabaho.db");

// Temporary in-memory OTP store
const otpStore = {};

// Configure Nodemailer transporter (use real credentials)
const EMAIL_CONFIG = {
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

const transporter = nodemailer.createTransport(EMAIL_CONFIG);
// ============================================================================
// SEND OTP
// ============================================================================
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Generate 4-digit OTP
  const otp = crypto.randomInt(1000, 9999).toString();

  // Save OTP in memory with 5-min expiry
  otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  // Send email
  try {
    await transporter.sendMail({
      from: '"TraTrabaho" <your_email@gmail.com>',
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
    });

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// ============================================================================
// VERIFY OTP
// ============================================================================
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const record = otpStore[email];
  if (!record) return res.status(400).json({ success: false, message: "No OTP sent for this email" });
  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.status(400).json({ success: false, message: "OTP expired" });
  }
  if (record.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

  // ✅ Mark user as verified
  db.run("UPDATE user SET verified = 1 WHERE email = ?", [email], function (err) {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    delete otpStore[email];
    res.json({ success: true, message: "Account verified successfully!" });
  });
});

// ============================================================================
// AUTO-LOGIN AFTER OTP VERIFICATION
// ============================================================================
app.post("/api/auto-login", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  // Retrieve user from database
  const query = `SELECT * FROM user WHERE email = ? AND verified = 1`;
  db.get(query, [email], (err, user) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found or not verified" });
    }

    // Create JWT token
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
  });
});

// ============================================================================
// GEMINI API ENDPOINT
// ============================================================================
// Route to handle Gemini API requests
app.post("/api/gemini", async (req, res) => {
  try {
    // Check if API key is set
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not defined" });
    }

    // Get prompt from frontend
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Call Gemini API
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

    // Safely extract Gemini text output
    const output =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";

    // Send cleaned result to frontend
    res.json({ output });

  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Something went wrong with Gemini API" });
  }
});

// ============================================================================
// LOGIN ENDPOINT
// ============================================================================
// Verifies user credentials against stored data in the database.
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate input fields
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Retrieve user record based on email
  const query = `SELECT * FROM user WHERE email = ?`;
  db.get(query, [email], async (err, user) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // Handle case where no user matches the provided email
    if (!user) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    // Compare provided password with the hashed password in the database
    const match = await bcrypt.compare(password, user.password_hash);

    // Handle invalid password case
    if (!match) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    // Create JWT (expires in 1 hour) 
    const token = jwt.sign({ id: user.user_id, email: user.email, role: user.role }, SECRET_KEY, 
      {expiresIn: "1h",});

     // Successful authentication → send user info (but omit sensitive data)
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
      },
    });
  });
});

// ============================================================================
// VERIFY TOKEN ENDPOINT
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
// Creates a new user account and stores hashed password securely.
app.post("/api/signup", async (req, res) => {
  const { firstname, lastname, birthday, gender, username, email, phone, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: "error", message: "Email and password are required" });
  }

  const role = "job_seeker";

  try {
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new user with verified = 0 (unverified)
    const stmt = db.prepare(`
      INSERT INTO user (firstname, lastname, birthday, gender, username, email, phone, password_hash, role, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(
      firstname,
      lastname,
      birthday,
      gender,
      username,
      email,
      phone,
      password_hash,
      role,
      async function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint")) {
            return res.status(400).json({ status: "error", message: "Email already exists" });
          }
          console.error("DB Error:", err);
          return res.status(500).json({ status: "error", message: "Database error" });
        }

        // Generate OTP (4-digit)
        const otp = crypto.randomInt(1000, 9999).toString();
        otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

        // Send OTP via email
        try {
          await transporter.sendMail({
            from: '"TaraTrabaho" <kayle1410@gmail.com>',
            to: email,
            subject: "Your TaraTrabaho OTP Code",
            text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
          });

          res.json({
            status: "pending",
            message: "Signup successful! Please verify your email via OTP.",
            email,
          });
        } catch (mailErr) {
          console.error("Error sending OTP email:", mailErr);
          res.status(500).json({
            status: "error",
            message: "User created but failed to send OTP email.",
          });
        }
      }
    );

    stmt.finalize();
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});


// ============================================================================
// FETCH ALL USERS
// ============================================================================
app.get("/api/users", (req, res) => {
  const query = `SELECT user_id, username, email, role, status FROM user`;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows);
  });
});

// ============================================================================
// UPDATE USER STATUS
// ============================================================================
app.put("/api/users/:user_id", (req, res) => {
  const { user_id } = req.params;
  const { status } = req.body;

  const query = `UPDATE user SET status = ? WHERE user_id = ?`;
  db.run(query, [status, user_id], function (err) {
    if (err) {
      console.error("Error updating user:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User status updated successfully" });
  });
});

// ============================================================================
// JOB FETCH - Get all jobs
// ============================================================================
app.get("/api/jobs", (req, res) => {
  const query = `
    SELECT job_id, title, description, location, min_salary, max_salary, 
           vacantleft, company, company_email, type, posted, tags, remote 
    FROM job
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching jobs:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows);
  });
});

// ============================================================================
// JOB ADD - Create a new job
// ============================================================================
app.post("/api/jobs", (req, res) => {
  const { 
    title, 
    description, 
    location, 
    min_salary, 
    max_salary, 
    vacantleft, 
    company, 
    company_email,
    type, 
    tags, 
    remote 
  } = req.body;

  // Validate required fields
  if (!title || !description || !location || !min_salary || !max_salary || !vacantleft || !company || !company_email || !type || !tags) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const posted = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  const query = `
    INSERT INTO job (title, description, location, min_salary, max_salary, vacantleft, company, company_email, type, posted, tags, remote)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    title, 
    description, 
    location, 
    min_salary, 
    max_salary, 
    vacantleft, 
    company, 
    company_email,
    type, 
    posted, 
    tags, 
    remote || 0
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Error inserting job:", err);
      return res.status(500).json({ message: "Database error while adding job." });
    }

    // Return the newly created job
    res.status(201).json({
      message: "Job added successfully.",
      job_id: this.lastID,
      title,
      description,
      location,
      min_salary,
      max_salary,
      vacantleft,
      company,
      company_email,
      type,
      posted,
      tags,
      remote: remote || 0
    });
  });
});

// ============================================================================
// JOB UPDATE - Update an existing job
// ============================================================================
app.put("/api/jobs/:job_id", (req, res) => {
  const { job_id } = req.params;
  const { 
    title, 
    description, 
    location, 
    min_salary, 
    max_salary, 
    vacantleft, 
    company, 
    company_email,
    type, 
    posted, 
    tags, 
    remote 
  } = req.body;

  // Validate required fields
  if (!title || !description || !location || !company || !type || !tags) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const query = `
    UPDATE job 
    SET title = ?, description = ?, location = ?, min_salary = ?, max_salary = ?, 
        vacantleft = ?, company = ?, company_email = ?, type = ?, posted = ?, tags = ?, remote = ?
    WHERE job_id = ?
  `;

  const params = [
    title, 
    description, 
    location, 
    min_salary, 
    max_salary, 
    vacantleft, 
    company, 
    company_email,
    type, 
    posted, 
    tags, 
    remote || 0, 
    job_id
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Error updating job:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job updated successfully" });
  });
});

// ============================================================================
// JOB DELETE - Delete a job
// ============================================================================
app.delete("/api/jobs/:job_id", (req, res) => {
  const { job_id } = req.params;

  const query = `DELETE FROM job WHERE job_id = ?`;

  db.run(query, [job_id], function (err) {
    if (err) {
      console.error("Error deleting job:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted successfully" });
  });
});

// ============================================================================
// FETCH PROFILE
// ============================================================================
app.get("/api/profile/:email", (req, res) => {
  const { email } = req.params;
  const query = `SELECT * FROM user WHERE email = ?`;

  db.get(query, [email], (err, user) => {
    if (err) {
      console.error("Error fetching profile:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  });
});

// ============================================================================
// UPDATE PROFILE
// ============================================================================
app.put("/api/profile/:email", (req, res) => {
  const { email } = req.params;
  const {
    firstname,
    lastname,
    gender,
    birthday,
    address,
    phone,
    bio,
    certification,
    seniorHigh,
    undergraduate,
    postgraduate,
  } = req.body;

  const query = `
    UPDATE user
    SET 
      firstname = ?, 
      lastname = ?,
      gender = ?, 
      birthday = ?, 
      address = ?, 
      phone = ?, 
      bio = ?, 
      certification = ?, 
      seniorHigh = ?, 
      undergraduate = ?, 
      postgraduate = ?
    WHERE email = ?;
  `;

  const params = [
    firstname,
    lastname,
    gender,
    birthday,
    address,
    phone,
    bio,
    certification,
    seniorHigh,
    undergraduate,
    postgraduate,
    email,
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error("Error updating profile:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully" });
  });
});

// ============================================================================
// RESUME ENDPOINTS - Using SQLite
// ============================================================================

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
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

// Save resume to database
app.post('/api/resume/save', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, resumeData } = req.body;
    const filename = req.file.originalname;
    const fileData = req.file.buffer;
    const createdAt = new Date().toISOString();

    // Insert resume into SQLite database
    const query = `
      INSERT INTO resume (user_id, filename, file_data, created_at) 
      VALUES (?, ?, ?, ?)
    `;

    db.run(query, [userId || null, filename, fileData, createdAt], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to save resume to database' });
      }

      res.json({
        success: true,
        message: 'Resume saved successfully',
        resumeId: this.lastID,
        filename: filename,
      });
    });
  } catch (error) {
    console.error('Error saving resume:', error);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

// Get user's resumes
app.get('/api/resume/user/:userId', (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT resume_id, user_id, created_at, filename 
    FROM resume 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `;

  db.all(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch resumes' });
    }

    res.json(results);
  });
});

// Download/retrieve resume
app.get('/api/resume/download/:resumeId', (req, res) => {
  const { resumeId } = req.params;

  const query = 'SELECT filename, file_data FROM resume WHERE resume_id = ?';

  db.get(query, [resumeId], (err, resume) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to retrieve resume' });
    }

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.filename}"`);
    res.send(resume.file_data);
  });
});

// Delete resume
app.delete('/api/resume/:resumeId', (req, res) => {
  const { resumeId } = req.params;

  const query = 'DELETE FROM resume WHERE resume_id = ?';

  db.run(query, [resumeId], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to delete resume' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json({ success: true, message: 'Resume deleted successfully' });
  });
});

// ============================================================================
// CHAT HISTORY ENDPOINTS 
// ============================================================================

// 1. CREATE new chat history
app.post('/api/chat/save', (req, res) => {
  try {
    const { userId, chatData, resumeData } = req.body;
    
    if (!userId || !chatData) {
      return res.status(400).json({ error: 'userId and chatData are required' });
    }

    const chatDataString = JSON.stringify(chatData);
    const resumeDataString = resumeData ? JSON.stringify(resumeData) : null;
    const createdAt = new Date().toISOString();

    const query = `
      INSERT INTO chathistory (user_id, chat_data, resume_data, timestamp)
      VALUES (?, ?, ?, ?)
    `;

    db.run(query, [userId, chatDataString, resumeDataString, createdAt], function(err) {
      if (err) {
        console.error('Error saving chat history:', err);
        return res.status(500).json({ error: 'Failed to save chat history' });
      }

      res.json({ 
        success: true, 
        message: 'Chat history saved successfully',
        chatId: this.lastID
      });
    });
  } catch (error) {
    console.error('Error in save chat endpoint:', error);
    res.status(500).json({ error: 'Server error while saving chat' });
  }
});

// 2. UPDATE existing chat history
app.put('/api/chat/update/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatData, resumeData } = req.body;
    
    if (!chatData) {
      return res.status(400).json({ error: 'chatData is required' });
    }

    const chatDataString = JSON.stringify(chatData);
    const resumeDataString = resumeData ? JSON.stringify(resumeData) : null;
    const updatedAt = new Date().toISOString();

    const query = `
      UPDATE chathistory 
      SET chat_data = ?, resume_data = ?, timestamp = ?
      WHERE chat_id = ?
    `;

    db.run(query, [chatDataString, resumeDataString, updatedAt, chatId], function(err) {
      if (err) {
        console.error('Error updating chat history:', err);
        return res.status(500).json({ error: 'Failed to update chat history' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.json({ 
        success: true, 
        message: 'Chat history updated successfully',
        chatId: parseInt(chatId)
      });
    });
  } catch (error) {
    console.error('Error in update chat endpoint:', error);
    res.status(500).json({ error: 'Server error while updating chat' });
  }
});

// 3. GET user's chat history (THIS WAS MISSING!)
// In server.js
app.get('/api/chat/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT chat_id, user_id, chat_data, resume_data, timestamp
      FROM chathistory 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 50  -- Optional: limit to 50 most recent chats for performance
    `;

    db.all(query, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching chat history:', err);
        return res.status(500).json({ error: 'Failed to fetch chat history' });
      }

      // Parse JSON strings back to objects
      const parsedResults = results.map(row => ({
        ...row,
        chat_data: JSON.parse(row.chat_data),
        resume_data: row.resume_data ? JSON.parse(row.resume_data) : null
      }));

      console.log(`✅ Fetched ${parsedResults.length} chats for user ${userId}`);
      if (parsedResults.length > 0) {
        console.log('📅 Most recent chat:', parsedResults[0].chat_id, 'at', parsedResults[0].timestamp);
      }

      res.json({ success: true, data: parsedResults });
    });
  } catch (error) {
    console.error('Error in get chat history endpoint:', error);
    res.status(500).json({ error: 'Server error while fetching chat history' });
  }
});

// 4. DELETE chat history
app.delete('/api/chat/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;

    const query = 'DELETE FROM chathistory WHERE chat_id = ?';

    db.run(query, [chatId], function(err) {
      if (err) {
        console.error('Error deleting chat:', err);
        return res.status(500).json({ error: 'Failed to delete chat history' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      res.json({ success: true, message: 'Chat history deleted successfully' });
    });
  } catch (error) {
    console.error('Error in delete chat endpoint:', error);
    res.status(500).json({ error: 'Server error while deleting chat' });
  }
});


// ============================================================================
// JOB RECOMMENDATION ENDPOINT - AI-Powered
// ============================================================================
app.post('/api/jobs/recommend', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 1. Fetch user's most recent resume
    const resumeQuery = `
      SELECT resume_data 
      FROM chathistory 
      WHERE user_id = ? AND resume_data IS NOT NULL
      ORDER BY timestamp DESC 
      LIMIT 1
    `;
    
    db.get(resumeQuery, [userId], async (err, resumeRow) => {
      if (err) {
        console.error('Error fetching resume:', err);
        return res.status(500).json({ error: 'Failed to fetch resume' });
      }

      let userProfile = {};
      if (resumeRow && resumeRow.resume_data) {
        try {
          const resumeData = JSON.parse(resumeRow.resume_data);
          userProfile = {
            skills: resumeData.skills || [],
            experience: resumeData.experience || [],
            education: resumeData.education || [],
            objective: resumeData.objective || '',
            summary: resumeData.summary || '',
          };
        } catch (e) {
          console.error('Error parsing resume data:', e);
        }
      }

      // 2. Fetch all jobs
      const jobsQuery = `
        SELECT job_id, title, description, location, min_salary, max_salary, 
               vacantleft, company, type, posted, tags, remote 
        FROM job
      `;
      
      db.all(jobsQuery, [], async (err, jobs) => {
        if (err) {
          console.error('Error fetching jobs:', err);
          return res.status(500).json({ error: 'Failed to fetch jobs' });
        }

        if (jobs.length === 0) {
          return res.json({ success: true, recommendations: [] });
        }

        // 3. Use Gemini AI to match jobs with user profile
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
          // Call Gemini API
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

          // Parse AI response
          let recommendedJobIds = [];
          try {
            // Extract JSON array from response (handle markdown code blocks)
            const jsonMatch = aiOutput.match(/\[[\d,\s]+\]/);
            if (jsonMatch) {
              recommendedJobIds = JSON.parse(jsonMatch[0]);
            } else {
              recommendedJobIds = JSON.parse(aiOutput);
            }
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError);
            // Fallback: return first 5 jobs
            recommendedJobIds = jobs.slice(0, 5).map(j => j.job_id);
          }

          // 4. Get full job details for recommended IDs
          const recommendedJobs = recommendedJobIds
            .map(jobId => jobs.find(j => j.job_id === jobId))
            .filter(job => job !== undefined)
            .slice(0, 5); // Ensure max 5 recommendations

          // 5. Format response
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

          res.json({
            success: true,
            recommendations: formattedRecommendations,
            totalJobs: jobs.length,
            hasResume: !!resumeRow,
          });

        } catch (aiError) {
          console.error('Error calling Gemini API:', aiError);
          // Fallback: return first 5 jobs
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
      });
    });
  } catch (error) {
    console.error('Error in job recommendation endpoint:', error);
    res.status(500).json({ error: 'Server error while generating recommendations' });
  }
});

// ============================================================================
// GET APPLICATION STATS
// ============================================================================
app.get('/api/stats/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    // Get resume count
    const resumeQuery = 'SELECT COUNT(*) as count FROM resume WHERE user_id = ?';
    
    // Get chat history count (resumes created in chatbot)
    const chatQuery = 'SELECT COUNT(*) as count FROM chathistory WHERE user_id = ? AND resume_data IS NOT NULL';

    db.get(resumeQuery, [userId], (err, resumeResult) => {
      if (err) {
        console.error('Error fetching resume count:', err);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }

      db.get(chatQuery, [userId], (err, chatResult) => {
        if (err) {
          console.error('Error fetching chat count:', err);
          return res.status(500).json({ error: 'Failed to fetch stats' });
        }

        // For now, applications is 0 (you can add an applications table later)
        res.json({
          success: true,
          stats: {
            applications: 0, // TODO: Implement applications table
            resumes: (resumeResult?.count || 0) + (chatResult?.count || 0),
            matches: 0, // Will be calculated from recommendations
          }
        });
      });
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error while fetching stats' });
  }
});

// ============================================================================
// JOB APPLICATION - EMAIL TO COMPANY
// ============================================================================
app.post('/api/jobs/apply', upload.single('resume'), async (req, res) => {
  try {
    const { userId, jobId, fullName, email, phone, coverLetter, resumeSource } = req.body;
    
    if (!userId || !jobId || !fullName || !email || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Get job details INCLUDING company email
    const jobQuery = 'SELECT * FROM job WHERE job_id = ?';
    const job = await new Promise((resolve, reject) => {
      db.get(jobQuery, [jobId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found' 
      });
    }

    // Check if company email exists
    if (!job.company_email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company email not configured for this job' 
      });
    }

    let resumeData, resumeFilename;

    // Handle resume
    if (resumeSource === 'upload' && req.file) {
      resumeData = req.file.buffer;
      resumeFilename = req.file.originalname;
    } else if (resumeSource === 'saved') {
      const resumeId = req.body.resumeId;
      const resumeQuery = 'SELECT filename, file_data FROM resume WHERE resume_id = ?';
      
      const savedResume = await new Promise((resolve, reject) => {
        db.get(resumeQuery, [resumeId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

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

    // Save to database
    const query = `
      INSERT INTO application 
        (user_id, job_id, full_name, email, phone, cover_letter, resume_filename, resume_data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    const applicationId = await new Promise((resolve, reject) => {
      db.run(
        query, 
        [userId, jobId, fullName, email, phone, coverLetter, resumeFilename, resumeData],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // 📧 SEND EMAIL TO COMPANY
    const companyMailOptions = {
      from: EMAIL_CONFIG.auth.user,
      to: job.company_email, // 👈 Email goes to company
      replyTo: email, // 👈 Company can reply directly to applicant
      subject: `New Job Application: ${job.title} - ${fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #BAE8E8, #FBDA23); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #272343; margin: 0;">📋 New Job Application via TaraTrabaho</h2>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
            <h3 style="color: #272343; border-bottom: 2px solid #FBDA23; padding-bottom: 10px;">
              ${job.title}
            </h3>
            
            <p style="color: #666; margin-bottom: 20px;">
              <strong>Position:</strong> ${job.title}<br>
              <strong>Location:</strong> ${job.location}<br>
              <strong>Job Type:</strong> ${job.type}<br>
              <strong>Application Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            
            <h4 style="color: #272343;">👤 Applicant Information</h4>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Full Name:</strong> ${fullName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2196F3;">${email}</a></p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${phone}" style="color: #2196F3;">${phone}</a></p>
              <p style="margin: 5px 0;"><strong>Application ID:</strong> #${applicationId}</p>
            </div>
            
            ${coverLetter ? `
              <h4 style="color: #272343;">📝 Cover Letter</h4>
              <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #FBDA23; border-radius: 5px; margin-bottom: 20px;">
                <p style="white-space: pre-line; line-height: 1.6;">${coverLetter}</p>
              </div>
            ` : ''}
            
            <div style="background: #BAE8E8; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <p style="margin: 0;">📎 <strong>Resume Attached:</strong> ${resumeFilename}</p>
            </div>
            
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            
            <h4 style="color: #272343;">Next Steps</h4>
            <ol style="line-height: 1.8;">
              <li>Review the attached resume and cover letter</li>
              <li>Contact the applicant directly using the email/phone above</li>
              <li>Schedule an interview if the candidate is a good fit</li>
            </ol>
            
            <div style="background: #fff9e6; padding: 15px; border-left: 4px solid #FBDA23; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; font-size: 14px;">
                <strong>💡 Tip:</strong> Reply directly to this email to contact ${fullName}. 
                Their email (${email}) is set as the reply-to address.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p><strong>TaraTrabaho</strong> - Connecting Talent with Opportunities</p>
            <p>This application was submitted through TaraTrabaho Job Portal</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: resumeFilename,
          content: resumeData,
        }
      ]
    };

    // Send email to company
    await transporter.sendMail(companyMailOptions);

    // 📧 SEND CONFIRMATION EMAIL TO APPLICANT
    const applicantMailOptions = {
      from: EMAIL_CONFIG.auth.user,
      to: email,
      subject: `✅ Application Submitted - ${job.title} at ${job.company}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #BAE8E8, #FBDA23); padding: 20px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #272343; margin: 0;">✅ Application Submitted Successfully!</h2>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
            <p>Hi <strong>${fullName}</strong>,</p>
            
            <p>Your application has been successfully submitted and sent directly to <strong>${job.company}</strong>!</p>
            
            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #FBDA23; border-radius: 5px; margin: 20px 0;">
              <h4 style="color: #272343; margin-top: 0;">📋 Application Details</h4>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Position:</strong></td>
                  <td style="padding: 8px 0;">${job.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Company:</strong></td>
                  <td style="padding: 8px 0;">${job.company}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
                  <td style="padding: 8px 0;">${job.location}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Job Type:</strong></td>
                  <td style="padding: 8px 0;">${job.type}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Application ID:</strong></td>
                  <td style="padding: 8px 0;">#${applicationId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Submitted:</strong></td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString('en-US')}</td>
                </tr>
              </table>
            </div>
            
            <h4 style="color: #272343;">📌 What Happens Next?</h4>
            <ol style="line-height: 1.8; padding-left: 20px;">
              <li><strong>${job.company}</strong> will review your application</li>
              <li>If shortlisted, they will contact you directly via:
                <ul style="margin-top: 5px;">
                  <li>Email: <strong>${email}</strong></li>
                  <li>Phone: <strong>${phone}</strong></li>
                </ul>
              </li>
              <li>Response time varies by company (typically 1-2 weeks)</li>
            </ol>
            
            <div style="background: #fff9e6; padding: 15px; border-left: 4px solid #FBDA23; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>💡 Pro Tip:</strong> Check your email regularly and ensure your phone is reachable. 
                Companies may reach out at any time!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="http://localhost:3000/taratrabaho/dashboard" 
                 style="background: #FBDA23; color: #272343; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                View My Applications
              </a>
            </div>
            
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #666; font-size: 13px; text-align: center; margin: 0;">
              Keep this email for your records. Good luck with your application! 🍀
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p><strong>TaraTrabaho</strong> - Find Your Dream Job Today!</p>
            <p>Questions? Contact us at support@taratrabaho.com</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(applicantMailOptions);

    // 📧 BCC TO ADMIN (Optional - for tracking)
    const adminNotification = {
      from: EMAIL_CONFIG.auth.user,
      to: 'admin@taratrabaho.com',
      subject: `[TRACKING] Application: ${fullName} → ${job.company}`,
      html: `
        <p><strong>New Application Submitted via TaraTrabaho</strong></p>
        <ul>
          <li>Applicant: ${fullName}</li>
          <li>Position: ${job.title}</li>
          <li>Company: ${job.company}</li>
          <li>Company Email: ${job.company_email}</li>
          <li>Application ID: #${applicationId}</li>
          <li>Timestamp: ${new Date().toLocaleString()}</li>
        </ul>
      `
    };

    // Send admin notification (non-blocking)
    transporter.sendMail(adminNotification).catch(err => 
      console.log('Admin notification failed:', err)
    );

    // Update job vacancy
    db.run('UPDATE job SET vacantleft = vacantleft - 1 WHERE job_id = ? AND vacantleft > 0', [jobId]);

    res.json({
      success: true,
      message: `Application sent to ${job.company}! Check your email for confirmation.`,
      applicationId: applicationId,
    });

  } catch (error) {
    console.error('Error in application endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit application. Please try again.' 
    });
  }
});


// ============================================================================
// SERVER START
// ============================================================================
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));