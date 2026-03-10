import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useSessionCheck } from "../useSessionCheck";
import SessionExpiredModal from "../SessionExpiredModal";
import { Alert } from "@mui/material";
import { API_BASE } from "./config/api";

const CareerBotSection = () => {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Kumusta! 👋 Welcome to TaraTrabaho AI Resume Builder! I'll help you create a professional resume tailored for Philippine employers. Let's start with your full name.",
    },
  ]);
  const [input, setInput] = useState("");
  const [currentStep, setCurrentStep] = useState("name");
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  //  For Saving of PDF to account
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Chat History
  const [lastSavedChatId, setLastSavedChatId] = useState(null);
  const [showNewResumeDialog, setShowNewResumeDialog] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [chatHistoryList, setChatHistoryList] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);

  const { userData, loading, sessionError } = useSessionCheck();

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");



  const [resumeData, setResumeData] = useState({
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      portfolio: "",
    },
    objective: "",
    summary: "",
    experience: [],
    projects: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    template: "classic",
    references: "Available upon request",
  });

  // 1. Load jsPDF library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => {
      console.log('jsPDF loaded successfully');
    };
    script.onerror = () => {
      setError('Failed to load PDF library. Please refresh the page.');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // 2. Auto-focus input when not loading
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, messages]);

  // 3. Load chat on mount - localStorage first, then databas
  useEffect(() => {
    const loadChatData = async () => {
      // console.log('CareerBot mounted - loading latest chat...');

      // If user is logged in, load LATEST chat from database
      if (userData && !loading) {
        await loadLastChatFromDatabase();
      } else {
        console.log('Waiting for user data to load...');
      }
    };

    loadChatData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, loading]);

  // 4. CONTINUOUS AUTO-SAVE to database (every message)
  useEffect(() => {

    if (userData && messages.length > 1 && !isLoading) {
      const timer = setTimeout(async () => {
        console.log('Chat Saved');
        await saveChatHistory(true);

        fetchAllUserChats();
      }); // Wait 2 seconds after last message

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, resumeData, userData, isLoading]); // Remove saveChatHistory and fetchAllUserChats from here

  // 5. Save to localStorage instantly (for navigation persistence)
  useEffect(() => {
    localStorage.setItem('careerbot_messages', JSON.stringify(messages));
    localStorage.setItem('careerbot_resume', JSON.stringify(resumeData));
    localStorage.setItem('careerbot_step', currentStep);
    if (lastSavedChatId) {
      localStorage.setItem('careerbot_chatId', lastSavedChatId.toString());
    }
  }, [messages, resumeData, currentStep, lastSavedChatId]);

  // 6. Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  useEffect(() => {
    if (userData && !loading) {
      fetchAllUserChats(); // Load the list for the badge counter
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, loading]);

  // CONSTSSSS

  // saveChatHistory function 
  // Wrap functions that are used as dependencies
  const saveChatHistory = useCallback(async (isAutoSave = false) => {
    try {
      if (!userData) {
        if (!isAutoSave) {
          throw new Error("User data not loaded. Please ensure you're logged in.");
        }
        return null;
      }

      const userResponse = await fetch(`${API_BASE}/api/profile/${userData.email}`);
      const userProfile = await userResponse.json();

      if (!userProfile || !userProfile.user_id) {
        if (!isAutoSave) {
          throw new Error("Could not retrieve user ID from profile.");
        }
        return null;
      }

      let response;
      let data;

      if (lastSavedChatId) {
        //console.log('Updating existing chat:', lastSavedChatId);
        response = await fetch(`${API_BASE}/api/chat/update/${lastSavedChatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatData: messages,
            resumeData: resumeData
          }),
        });
        data = await response.json();
      } else {
        console.log('Creating new chat');
        response = await fetch(`${API_BASE}/api/chat/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userProfile.user_id,
            chatData: messages,
            resumeData: resumeData
          }),
        });
        data = await response.json();
      }

      if (data.success) {
        if (data.chatId && !lastSavedChatId) {
          setLastSavedChatId(data.chatId);
          setActiveChatId(data.chatId);
          console.log('New chat created with ID:', data.chatId);
        }

        if (!isAutoSave) {
          setMessages((prev) => [...prev, {
            from: "bot",
            text: lastSavedChatId ? "✅ Chat history updated successfully!" : "✅ Chat history saved successfully!"
          }]);
        }
        return data;
      } else {
        throw new Error(data.error || 'Failed to save chat history');
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
      if (!isAutoSave) {
        setError(`Failed to save chat history: ${error.message}`);
      }
      return null;
    }
  }, [userData, lastSavedChatId, messages, resumeData]);

  // Fetch all user chat histories
  const fetchAllUserChats = useCallback(async () => {
    try {
      if (!userData) return;

      setLoadingChats(true);
      const userResponse = await fetch(`${API_BASE}/api/profile/${userData.email}`);
      const userProfile = await userResponse.json();

      if (!userProfile || !userProfile.user_id) return;

      const response = await fetch(`${API_BASE}/api/chat/history/${userProfile.user_id}`);
      const data = await response.json();

      if (data.success) {
        setChatHistoryList(data.data);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoadingChats(false);
    }
  }, [userData]);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+63|0)?9\d{9}$/;
    return phoneRegex.test(phone.replace(/[-\s]/g, ""));
  };

  const validateName = (name) => {
    return name.trim().length >= 2 && /^[a-zA-Z\s.]+$/.test(name);
  };

  const validateURL = (url) => {
    if (!url || url.toLowerCase() === 'skip' || url.toLowerCase() === 'none') return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateDateRange = (duration) => {
    if (!duration) return false;
    // Common formats: Jan 2020 - Present, 01/2020 - 12/2023, 2020 - 2023
    const datePartRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\/\d{4}|\d{4})\s*(?:-|,|to)?\s*(Present|Now|Current|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\/\d{4}|\d{4})$/i;
    return datePartRegex.test(duration.trim());
  };

  const validateYear = (year) => {
    if (!year || year.toLowerCase() === 'n/a' || year.toLowerCase() === 'skip') return true;
    const currentYear = new Date().getFullYear();
    const y = parseInt(year);
    return !isNaN(y) && y > 1950 && y <= currentYear + 10;
  };

  const isDuplicate = (list, newItem) => {
    if (!list || !newItem) return false;
    return list.some(item => item.toLowerCase().trim() === newItem.toLowerCase().trim());
  };

  const isWithinLimit = (text, limit = 500) => {
    return text.trim().length <= limit;
  };

  const callGeminiAPI = async (userInput, instruction = "") => {
    try {
      const prompt = instruction
        ? `${instruction}\n\nUser input: ${userInput}`
        : userInput;

      const res = await fetch(`${API_BASE}/api/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (data && data.output) {
        return data.output;
      } else if (data && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.error("Invalid API response format:", data);
        return null;
      }
    } catch (err) {
      console.error("Gemini API Error:", err);
      return null;
    }
  };
  const getBotJobRecommendations = async (currentResumeData) => {
    try {
      if (!userData) return;

      // Get user_id
      const userResponse = await fetch(`${API_BASE}/api/profile/${userData.email}`);
      const userProfile = await userResponse.json();

      if (!userProfile || !userProfile.user_id) return;

      // Trigger matching on backend
      const response = await fetch(`${API_BASE}/api/jobs/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.user_id }),
      });

      const data = await response.json();

      if (data.success && data.recommendations && data.recommendations.length > 0) {
        let recMessage = "I've found some jobs that might be a great fit for you! 💼\n\n";
        data.recommendations.slice(0, 3).forEach((job, index) => {
          recMessage += `${index + 1}. **${job.title}** at *${job.company}*\n   📍 ${job.location}\n   💰 ${job.salary}\n\n`;
        });
        recMessage += "You can view and apply for these in the **Job Search** section!";

        setMessages((prev) => [...prev, { from: "bot", text: recMessage }]);
      }
    } catch (error) {
      console.error('Error fetching bot job recommendations:', error);
    }
  };

  const simulateTyping = (duration = 1000) => {
    setIsLoading(true);
    return new Promise(resolve => setTimeout(resolve, duration));
  };

  const handleSend = async () => {
    if (input.trim() === "" || isLoading) return;

    setError("");
    setMessages((prev) => [...prev, { from: "user", text: input }]);

    const userInput = input.trim();
    setInput("");

    // Simulate realistic typing delay
    await simulateTyping(800 + Math.random() * 400); // 800-1200ms

    await processUserInput(userInput);
    setIsLoading(false);
  };

  const processUserInput = async (userInput) => {
    let botResponse = "";
    let isValid = true;
    const updatedData = { ...resumeData };

    switch (currentStep) {
      case "name":
        if (!validateName(userInput)) {
          botResponse = "Please enter a valid name (at least 2 characters, letters only). What's your full name?";
          isValid = false;
        } else {
          updatedData.personalInfo.name = userInput;

          if (isEditMode) {
            botResponse = `✅ Name updated to "${userInput}"! Your resume has been updated.\n\nYou can continue editing or download your resume.`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = `Nice to meet you, ${userInput}! 😊 What's your email address?`;
            setCurrentStep("email");
          }
        }
        break;

      case "email":
        if (!validateEmail(userInput)) {
          botResponse = "That doesn't look like a valid email. Please enter a valid email address (e.g., juan@gmail.com)";
          isValid = false;
        } else {
          updatedData.personalInfo.email = userInput;

          if (isEditMode) {
            botResponse = `✅ Email updated to "${userInput}"! Your resume has been updated.`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "Perfect! What's your mobile number? (Format: 09XX-XXX-XXXX)";
            setCurrentStep("phone");
          }
        }
        break;

      case "phone":
        if (!validatePhone(userInput)) {
          botResponse = "Please enter a valid Philippine mobile number (e.g., 0917-123-4567 or +639171234567)";
          isValid = false;
        } else {
          updatedData.personalInfo.phone = userInput;

          if (isEditMode) {
            botResponse = `✅ Phone updated to "${userInput}"! Your resume has been updated.`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "Salamat! Where are you located? (City, Province - e.g., Quezon City, Metro Manila)";
            setCurrentStep("location");
          }
        }
        break;

      case "location":
        if (userInput.length < 3) {
          botResponse = "Please enter your complete location (City and Province/Region)";
          isValid = false;
        } else {
          updatedData.personalInfo.location = userInput;

          if (isEditMode) {
            botResponse = `✅ Location updated to "${userInput}"! Your resume has been updated.`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "Great! 🌐 Do you have a LinkedIn profile? (Paste the URL or type 'skip')";
            setCurrentStep("linkedin");
          }
        }
        break;

      case "linkedin":
        if (userInput.toLowerCase() === 'skip' || userInput.toLowerCase() === 'none') {
          updatedData.personalInfo.linkedin = "";

          if (isEditMode) {
            botResponse = "✅ LinkedIn removed from your resume!";
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "No problem! Do you have a portfolio website or GitHub profile? (Paste URL or type 'skip')";
            setCurrentStep("portfolio");
          }
        } else if (!validateURL(userInput)) {
          botResponse = "Please enter a valid URL (e.g., https://linkedin.com/in/yourname) or type 'skip'";
          isValid = false;
        } else {
          updatedData.personalInfo.linkedin = userInput;

          if (isEditMode) {
            botResponse = `✅ LinkedIn updated! Your resume has been updated.`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "Excellent! Do you have a portfolio website or GitHub profile? (Paste URL or type 'skip')";
            setCurrentStep("portfolio");
          }
        }
        break;

      case "portfolio":
        if (userInput.toLowerCase() === 'skip' || userInput.toLowerCase() === 'none') {
          updatedData.personalInfo.portfolio = "";

          if (isEditMode) {
            botResponse = "✅ Portfolio removed from your resume!";
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "Understood! Now, what type of position are you applying for? Write a brief career objective (1-2 sentences).\n\nExample: Seeking a Marketing Coordinator position where I can leverage my digital marketing skills to drive brand growth.";
            setCurrentStep("objective");
          }
        } else if (!validateURL(userInput)) {
          botResponse = "Please enter a valid URL (e.g., https://yourportfolio.com) or type 'skip'";
          isValid = false;
        } else {
          updatedData.personalInfo.portfolio = userInput;

          if (isEditMode) {
            botResponse = `✅ Portfolio updated! Your resume has been updated.`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "Perfect! 🎯 Now, what type of position are you applying for? Write a brief career objective (1-2 sentences).\n\nExample: Seeking a Marketing Coordinator position where I can leverage my digital marketing skills to drive brand growth.";
            setCurrentStep("objective");
          }
        }
        break;

      case "objective":
        if (userInput.split(" ").length < 8) {
          botResponse = "Please provide more details about your career objective (at least 8 words).";
          isValid = false;
        } else if (!isWithinLimit(userInput, 300)) {
          botResponse = "Your career objective is a bit too long. Please try to keep it under 300 characters.";
          isValid = false;
        } else {
          setMessages((prev) => [...prev, { from: "bot", text: "✨ Refining your career objective with AI..." }]);

          const enhancedObjective = await callGeminiAPI(
            userInput,
            "Rewrite this career objective to be compelling and professional. Make it concise (1-2 sentences), action-oriented, and tailored for Philippine job applications. Return only the refined objective without explanations."
          );

          updatedData.objective = enhancedObjective || userInput;

          if (isEditMode) {
            botResponse = enhancedObjective
              ? `✅ Career objective updated!\n\n"${enhancedObjective}"\n\nYour resume has been updated.`
              : `✅ Career objective updated! Your resume has been updated.`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = enhancedObjective
              ? `Great! Here's your refined objective:\n\n"${enhancedObjective}"\n\n💼 Now tell me about yourself professionally. Write 2-3 sentences highlighting your experience, key strengths, and what makes you stand out.`
              : "Great! 💼 Now tell me about yourself professionally. Write 2-3 sentences highlighting your experience, key strengths, and what makes you stand out.";
            setCurrentStep("summary");
          }
        }
        break;

      case "summary":
        if (userInput.split(" ").length < 10) {
          botResponse = "Please provide more details (at least 10 words). Describe your professional background, key achievements, and strengths.";
          isValid = false;
        } else if (!isWithinLimit(userInput, 600)) {
          botResponse = "Your summary is a bit too long. Please try to keep it under 600 characters for the best resume layout.";
          isValid = false;
        } else {
          setMessages((prev) => [...prev, { from: "bot", text: "✨ Enhancing your summary with AI..." }]);

          const enhancedSummary = await callGeminiAPI(
            userInput,
            "Improve and rewrite this professional summary for a resume tailored to job applications in the Philippines. Make it sound confident, achievement-focused, and professional. Include specific strengths and value propositions. Keep it concise (3–4 sentences) and return only one final version without giving multiple options or explanations."
          );

          updatedData.summary = enhancedSummary || userInput;

          if (isEditMode) {
            botResponse = enhancedSummary
              ? `✅ Professional summary updated!\n\n"${enhancedSummary}"\n\nYour resume has been updated.`
              : `✅ Professional summary updated! Your resume has been updated.`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = enhancedSummary
              ? `Excellent! Here's your enhanced summary:\n\n"${enhancedSummary}"\n\n👔 Let's add your work experience. Tell me about your most recent job:\n\nFormat: Job Title | Company Name | Start Date - End Date\nExample: Marketing Assistant | SM Supermalls | Jan 2022 - Present`
              : "Excellent! 👔 Let's add your work experience. Tell me about your most recent job:\n\nFormat: Job Title | Company Name | Start Date - End Date\nExample: Marketing Assistant | SM Supermalls | Jan 2022 - Present";
            setCurrentStep("experience");
          }
        }
        break;

      case "experience":
        if (userInput.toLowerCase() === 'skip' || userInput.toLowerCase() === 'none' || userInput.toLowerCase().includes('fresh grad')) {
          botResponse = "No problem! 🎓 Since you're a fresh grad or don't have work experience, let's showcase your academic projects, capstone, or personal achievements. Tell me about a significant project you worked on:\n\nFormat: Project Title | Organization/Class | Date\nExample: E-commerce Website | Web Dev Class | 2023";
          setCurrentStep("projects");
          break;
        }

        const expParts = userInput.split(/[|,-]/).map((s) => s.trim());
        if (expParts.length < 3) {
          botResponse = "Please follow the format: Job Title | Company Name | Duration\nExample: Sales Associate | Jollibee | Jan 2022 - Dec 2023";
          isValid = false;
        } else if (!validateDateRange(expParts[expParts.length - 1])) {
          botResponse = "The duration format looks incorrect. Please use formats like 'Jan 2022 - Present' or '2020 - 2023'.";
          isValid = false;
        } else {
          updatedData.currentExperience = {
            title: expParts[0],
            company: expParts[1],
            duration: expParts[expParts.length - 1],
            duties: [],
          };
          botResponse = "Great! Now describe your key responsibilities and achievements in this role. 💡 Tip: Try to include numbers or percentages (e.g., 'Improved efficiency by 15%').\n\nSeparate duties with a semicolon (;).";
          setCurrentStep("experience_duties");
        }
        break;

      case "projects":
        const projParts = userInput.split(/[|,-]/).map((s) => s.trim());
        if (projParts.length < 2) {
          botResponse = "Please follow the format: Project Title | Organization/Class | Date\nOr type 'skip' to go to education";
          isValid = false;
        } else {
          updatedData.currentProject = {
            title: projParts[0],
            org: projParts[1],
            date: projParts[2] || "N/A",
            details: [],
          };
          botResponse = "Nice! Describe what you did in this project and what technologies you used (separate with semicolons).\n\nExample: Developed front-end using React; Integrated REST API; Worked in a team of 4";
          setCurrentStep("projects_details");
        }
        break;

      case "projects_details":
        if (userInput.length < 5) {
          botResponse = "Please provide some details about the project.";
          isValid = false;
        } else {
          if (updatedData.currentProject) {
            const details = userInput.split(";").map((d) => d.trim()).filter((d) => d);
            updatedData.currentProject.details = details;
          }
          botResponse = "Excellent! Would you like me to refine these project details with AI? (Type 'yes' or 'no')";
          setCurrentStep("projects_refine");
        }
        break;

      case "projects_refine":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          setMessages((prev) => [...prev, { from: "bot", text: "✨ Enhancing your project details with AI..." }]);
          const originalDetails = updatedData.currentProject.details.join("; ");
          const refinedDetailsText = await callGeminiAPI(
            originalDetails,
            "Refine these project achievements to be more professional and impactful. Use strong action verbs. Format as a semicolon-separated list. Return only the refined list."
          );
          if (refinedDetailsText) {
            const refinedDetails = refinedDetailsText.split(";").map(d => d.trim()).filter(d => d);
            updatedData.currentProject.details = refinedDetails;
            botResponse = `Here's the refined version:\n\n${refinedDetails.map(d => `• ${d}`).join('\n')}\n\nDoes this look good, or would you like to add more detail to make it even better? (Type 'looks good' or tell me what to change)`;
            setCurrentStep("projects_review");
          } else {
            botResponse = "I couldn't refine the details right now. I'll use your original version. Want to add another project? Type 'yes' or 'no'";
            updatedData.projects.push(updatedData.currentProject);
            delete updatedData.currentProject;
            setCurrentStep("projects_more");
          }
        } else {
          updatedData.projects.push(updatedData.currentProject);
          delete updatedData.currentProject;
          botResponse = "Got it! I'll keep your original project details. Want to add another project? Type 'yes' or 'no'";
          setCurrentStep("projects_more");
        }
        break;

      case "projects_review":
        if (userInput.toLowerCase().includes("good") || userInput.toLowerCase().includes("okay") || userInput.toLowerCase().includes("yes")) {
          updatedData.projects.push(updatedData.currentProject);
          delete updatedData.currentProject;
          botResponse = "Great! Want to add another project? Type 'yes' or 'no'";
          setCurrentStep("projects_more");
        } else {
          botResponse = "Sure! Tell me what specific detail or achievement I should emphasize, and I'll refine it again.";
          setCurrentStep("projects_refine_retry");
        }
        break;

      case "projects_refine_retry":
        setMessages((prev) => [...prev, { from: "bot", text: "✨ Re-refining your project details..." }]);
        const retryProjectText = await callGeminiAPI(
          updatedData.currentProject.details.join("; "),
          `Refine these project details further, specifically focusing on this user instruction: "${userInput}". Return only the refined semicolon-separated list.`
        );
        if (retryProjectText) {
          const refinedDetails = retryProjectText.split(";").map(d => d.trim()).filter(d => d);
          updatedData.currentProject.details = refinedDetails;
          botResponse = `Updated version:\n\n${refinedDetails.map(d => `• ${d}`).join('\n')}\n\nBetter? (Type 'looks good' or tell me more changes)`;
          setCurrentStep("projects_review");
        } else {
          botResponse = "I'm having trouble with the refinement. Let's stick with this version for now. Want to add another project? (yes/no)";
          updatedData.projects.push(updatedData.currentProject);
          delete updatedData.currentProject;
          setCurrentStep("projects_more");
        }
        break;

      case "projects_more":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          botResponse = "Tell me about your next project:\n\nFormat: Project Title | Organization | Date";
          setCurrentStep("projects");
        } else {
          botResponse = "Perfect! Now let's add your education. Please provide:\n\nFormat: Degree/Course | School Name | Graduation Year\nExample: BS Business Administration | UP | 2022";
          setCurrentStep("education");
        }
        break;

      case "experience_duties":
        if (userInput.length < 10) {
          botResponse = "Please provide more details about what you did in this role (at least 10 characters).";
          isValid = false;
        } else {
          if (updatedData.currentExperience) {
            const duties = userInput.split(";").map((d) => d.trim()).filter((d) => d);
            updatedData.currentExperience.duties = duties;
          }
          botResponse = "Excellent! ✨ Would you like me to use AI to refine these duties and make them sound more professional? (Type 'yes' to refine, or 'no' to keep your original version)";
          setCurrentStep("experience_duties_refine");
        }
        break;

      case "experience_duties_refine":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          setMessages((prev) => [...prev, { from: "bot", text: "✨ Professionalizing your job duties with AI..." }]);

          const originalDuties = updatedData.currentExperience.duties.join("; ");
          const refinedDutiesText = await callGeminiAPI(
            originalDuties,
            "Refine these job duties into professional, achievement-oriented bullet points for a resume. Use strong action verbs. Format the output as a semicolon-separated list. Keep it concise. Return only the refined list without any introductory text."
          );

          if (refinedDutiesText) {
            const refinedDuties = refinedDutiesText.split(";").map(d => d.trim()).filter(d => d);
            updatedData.currentExperience.duties = refinedDuties;
            botResponse = `Here's the professional version:\n\n${refinedDuties.map(d => `• ${d}`).join('\n')}\n\nDoes this look good, or should I change something? (Type 'looks good' or tell me what to change)`;
            setCurrentStep("experience_duties_review");
          } else {
            botResponse = "I couldn't refine the duties right now. I'll use your original version. Do you want to add another work experience? (yes/no)";
            updatedData.experience.push(updatedData.currentExperience);
            delete updatedData.currentExperience;
            setCurrentStep("experience_more");
          }
        } else {
          updatedData.experience.push(updatedData.currentExperience);
          delete updatedData.currentExperience;
          botResponse = "Got it! I'll keep your original duties. Do you want to add another work experience? (yes/no)";
          setCurrentStep("experience_more");
        }
        break;

      case "experience_duties_review":
        if (userInput.toLowerCase().includes("good") || userInput.toLowerCase().includes("okay") || userInput.toLowerCase().includes("yes")) {
          updatedData.experience.push(updatedData.currentExperience);
          delete updatedData.currentExperience;
          botResponse = "Great! Do you want to add another work experience? Type 'yes' or 'no'";
          setCurrentStep("experience_more");
        } else {
          botResponse = "Understood! Tell me more about your responsibilities or what you want to highlight, and I'll adjust the wording.";
          setCurrentStep("experience_duties_refine_retry");
        }
        break;

      case "experience_duties_refine_retry":
        setMessages((prev) => [...prev, { from: "bot", text: "✨ Adjusting your job duties..." }]);
        const retryDutiesText = await callGeminiAPI(
          updatedData.currentExperience.duties.join("; "),
          `Adjust these resume job duties based on this user feedback: "${userInput}". Keep them professional and achievement-oriented. Return only the refined semicolon-separated list.`
        );
        if (retryDutiesText) {
          const refinedDuties = retryDutiesText.split(";").map(d => d.trim()).filter(d => d);
          updatedData.currentExperience.duties = refinedDuties;
          botResponse = `How about this:\n\n${refinedDuties.map(d => `• ${d}`).join('\n')}\n\nDoes this work for you? (Type 'looks good' or tell me more changes)`;
          setCurrentStep("experience_duties_review");
        } else {
          botResponse = "I'm having trouble adjusting it further. Let's use this version for now. Want to add another work experience? (yes/no)";
          updatedData.experience.push(updatedData.currentExperience);
          delete updatedData.currentExperience;
          setCurrentStep("experience_more");
        }
        break;

      case "experience_more":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          botResponse = "Please enter your next job experience:\n\nFormat: Job Title | Company Name | Start Date - End Date";
          setCurrentStep("experience");
        } else if (isEditMode && (userInput.toLowerCase().includes("done") || userInput.toLowerCase().includes("no") || userInput.toLowerCase().includes("hindi"))) {
          botResponse = "✅ Work experience section updated! Your resume has been updated.";
          setCurrentStep("complete");
          setIsEditMode(false);
        } else {
          botResponse = "Perfect! Now let's add your education. Please provide:\n\nFormat: Degree/Course | School Name | Graduation Year\nExample: BS Business Administration | University of the Philippines | 2022";
          setCurrentStep("education");
        }
        break;

      case "education":
        const eduParts = userInput.split("|").map((s) => s.trim());
        if (eduParts.length < 3) {
          botResponse = "Please follow the format: Degree/Course | School | Year\nExample: BS Nursing | UST | 2020";
          isValid = false;
        } else if (!validateYear(eduParts[2])) {
          botResponse = "Please enter a valid graduation year (e.g., 2022).";
          isValid = false;
        } else {
          updatedData.education.push({
            degree: eduParts[0],
            institution: eduParts[1],
            year: eduParts[2],
          });

          if (isEditMode) {
            botResponse = "✅ Education updated! Would you like to add another educational background? Type 'yes' to add more, or 'done' to finish.";
            setCurrentStep("education_more");
          } else {
            botResponse = "Would you like to add another educational background? Type 'yes' or 'no'";
            setCurrentStep("education_more");
          }
        }
        break;

      case "education_more":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          botResponse = "Enter your next educational background:\n\nFormat: Degree/Course | School | Year";
          setCurrentStep("education");
        } else if (isEditMode && (userInput.toLowerCase().includes("done") || userInput.toLowerCase().includes("no") || userInput.toLowerCase().includes("hindi"))) {
          botResponse = "✅ Education section updated! Your resume has been updated.";
          setCurrentStep("complete");
          setIsEditMode(false);
        } else {
          botResponse = "Great! 🎓 Do you have any professional certifications? (e.g., TESDA, NC II, First Aid, etc.)\n\nFormat: Certification Name | Issuing Organization | Year\nExample: National Certificate II in Housekeeping | TESDA | 2023\n\nOr type 'skip' if none";
          setCurrentStep("certifications");
        }
        break;

      case "certifications":
        if (userInput.toLowerCase() === 'skip' || userInput.toLowerCase() === 'none') {
          updatedData.certifications = [];

          if (isEditMode) {
            botResponse = "✅ Certifications cleared from your resume!";
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "No problem! 🌍 What languages can you speak? (Include proficiency level)\n\nFormat: Language - Proficiency\nExample: English - Fluent, Tagalog - Native, Bisaya - Conversational\n\nSeparate multiple languages with commas.";
            setCurrentStep("languages");
          }
        } else {
          const certParts = userInput.split("|").map((s) => s.trim());
          if (certParts.length < 2) {
            botResponse = "Please follow the format: Certification Name | Issuing Organization | Year\nOr type 'skip' if you don't have any certifications";
            isValid = false;
          } else if (certParts[2] && !validateYear(certParts[2])) {
            botResponse = "Please enter a valid certification year (e.g., 2023) or leave it blank.";
            isValid = false;
          } else {
            updatedData.certifications.push({
              name: certParts[0],
              issuer: certParts[1],
              year: certParts[2] || "N/A",
            });

            if (isEditMode) {
              botResponse = "✅ Certification added! Do you want to add another certification? Type 'yes' to add more, or 'done' to finish.";
              setCurrentStep("certifications_more");
            } else {
              botResponse = "Excellent! Do you want to add another certification? Type 'yes' or 'no'";
              setCurrentStep("certifications_more");
            }
          }
        }
        break;

      case "certifications_more":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          botResponse = "Enter your next certification:\n\nFormat: Certification Name | Issuing Organization | Year";
          setCurrentStep("certifications");
        } else if (isEditMode && (userInput.toLowerCase().includes("done") || userInput.toLowerCase().includes("no") || userInput.toLowerCase().includes("hindi"))) {
          botResponse = "✅ Certifications section updated! Your resume has been updated.";
          setCurrentStep("complete");
          setIsEditMode(false);
        } else {
          botResponse = "Perfect! 🌍 What languages can you speak? (Include proficiency level)\n\nFormat: Language - Proficiency\nExample: English - Fluent, Tagalog - Native, Bisaya - Conversational\n\nSeparate multiple languages with commas.";
          setCurrentStep("languages");
        }
        break;

      case "languages":
        const languagesList = userInput.split(",").map((s) => s.trim()).filter((s) => s);
        if (languagesList.length < 1) {
          botResponse = "Please list at least one language with proficiency level.\nExample: English - Fluent, Tagalog - Native";
          isValid = false;
        } else {
          // Prevent duplicates
          const uniqueLanguages = [];
          const duplicatesFound = [];
          languagesList.forEach(lang => {
            if (!isDuplicate(uniqueLanguages, lang)) {
              uniqueLanguages.push(lang);
            } else {
              duplicatesFound.push(lang);
            }
          });

          updatedData.languages = [...new Set([...updatedData.languages, ...uniqueLanguages])];

          if (isEditMode) {
            botResponse = `✅ Languages updated! Your resume now includes: ${languagesList.join(', ')}`;
            setCurrentStep("complete");
            setIsEditMode(false);
          } else {
            botResponse = "Almost done! 🎉 List your key skills separated by commas (at least 3 skills).\n\nExample: Customer Service, MS Office, Social Media Marketing, Time Management, Communication Skills";
            setCurrentStep("skills");
          }
        }
        break;

      case "skills":
        const skillsList = userInput.split(",").map((s) => s.trim()).filter((s) => s);
        if (skillsList.length < 3 && updatedData.skills.length === 0) {
          botResponse = "Please list at least 3 skills separated by commas to make your resume competitive.";
          isValid = false;
        } else {
          // Prevent duplicates
          const uniqueSkills = [];
          skillsList.forEach(skill => {
            if (!isDuplicate(updatedData.skills, skill) && !isDuplicate(uniqueSkills, skill)) {
              uniqueSkills.push(skill);
            }
          });

          if (uniqueSkills.length === 0 && skillsList.length > 0) {
            botResponse = "Those skills are already in your list! Try adding different ones.";
            isValid = false;
          } else {
            updatedData.skills = [...updatedData.skills, ...uniqueSkills].slice(0, 15); // Limit to 15 skills
            isValid = true;
          }

          if (isValid) {
            if (isEditMode) {
              botResponse = `✅ Skills updated! Your resume now includes: ${skillsList.join(', ')}`;
              setCurrentStep("complete");
              setIsEditMode(false);
            } else {
              botResponse = "One last thing! 🎨 Which resume style would you like to use? Choose one:\n\n1. **Classic** (Professional & Clean)\n2. **Modern** (Contemporary & Bold)\n\nType 'classic' or 'modern'.";
              setCurrentStep("template_selection");
            }
          }
        }
        break;

      case "template_selection":
        if (userInput.toLowerCase().includes("modern")) {
          updatedData.template = "modern";
          botResponse = "Great choice! The **Modern** template has been applied.";
        } else {
          updatedData.template = "classic";
          botResponse = "Perfect! The **Classic** template has been applied.";
        }

        botResponse += "\n\nCongratulations! 🎊 Your resume is complete! I'm also finding some job opportunities for you based on your new resume...";
        setCurrentStep("complete");

        // Trigger job recommendations
        setTimeout(() => {
          getBotJobRecommendations(updatedData);
        }, 1500);
        break;

      case "complete":
        if (userInput.toLowerCase().includes("edit")) {
          setShowEditMenu(true);
          botResponse = "What section would you like to edit? Choose from the menu below:";
        } else if (userInput.toLowerCase().includes("new") || userInput.toLowerCase().includes("another")) {
          setShowNewResumeDialog(true);
          botResponse = "Would you like to create another resume? This will start fresh with a new conversation.";
        } else {
          botResponse = "You can preview your resume, download it as PDF, or save it to your account. Need any changes? Just let me know!\n\nType 'edit' to modify any section, or 'new resume' to create another one.";
        }
        break;

      default:
        botResponse = "Let's continue building your resume!";
    }

    if (isValid) {
      setResumeData(updatedData);
    }

    setMessages((prev) => [...prev, { from: "bot", text: botResponse }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generatePDF = () => {
    if (typeof window.jspdf === 'undefined') {
      throw new Error("jsPDF library not loaded");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Theme Colors
    const isModern = resumeData.template === "modern";
    const primaryColor = [39, 35, 67];
    const accentColor = isModern ? [186, 232, 232] : [255, 230, 96];

    if (isModern) {
      // MODERN TEMPLATE (Sidebar Layout)
      // Sidebar
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 75, 297, 'F');

      // Sidebar Content
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      const nameLines = doc.splitTextToSize(resumeData.personalInfo.name || "Your Name", 60);
      doc.text(nameLines, 37.5, 30, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      let sidebarY = 60;

      const addSidebarItem = (label, value) => {
        if (!value) return;
        doc.setFont(undefined, 'bold');
        doc.text(label.toUpperCase(), 10, sidebarY);
        sidebarY += 5;
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(value, 55);
        doc.text(lines, 10, sidebarY);
        sidebarY += (lines.length * 5) + 10;
      };

      addSidebarItem("Email", resumeData.personalInfo.email);
      addSidebarItem("Phone", resumeData.personalInfo.phone);
      addSidebarItem("Location", resumeData.personalInfo.location);
      if (resumeData.personalInfo.linkedin) addSidebarItem("LinkedIn", resumeData.personalInfo.linkedin);

      if (resumeData.skills.length > 0) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("SKILLS", 10, sidebarY);
        sidebarY += 7;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        resumeData.skills.forEach(skill => {
          doc.text(`• ${skill}`, 10, sidebarY);
          sidebarY += 5;
        });
        sidebarY += 10;
      }

      // Main Content
      doc.setTextColor(...primaryColor);
      let mainY = 25;
      const mainX = 85;
      const mainWidth = 110;

      const addSectionHeader = (title) => {
        if (mainY > 250) { doc.addPage(); mainY = 20; }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(title, mainX, mainY);
        doc.setFillColor(...accentColor);
        doc.rect(mainX, mainY + 2, mainWidth, 1, 'F');
        mainY += 10;
      };

      if (resumeData.summary) {
        addSectionHeader("PROFESSIONAL SUMMARY");
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(resumeData.summary, mainWidth);
        doc.text(lines, mainX, mainY);
        mainY += (lines.length * 5) + 12;
      } else if (resumeData.objective) {
        addSectionHeader("CAREER OBJECTIVE");
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(resumeData.objective, mainWidth);
        doc.text(lines, mainX, mainY);
        mainY += (lines.length * 5) + 12;
      }

      if (resumeData.experience.length > 0) {
        addSectionHeader("WORK EXPERIENCE");
        resumeData.experience.forEach(exp => {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(exp.title, mainX, mainY);
          doc.setFontSize(9);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text(`${exp.company} | ${exp.duration}`, mainX, mainY + 5);
          doc.setTextColor(...primaryColor);
          mainY += 10;
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          exp.duties.forEach(duty => {
            const dutyLines = doc.splitTextToSize(`• ${duty}`, mainWidth);
            doc.text(dutyLines, mainX + 2, mainY);
            mainY += (dutyLines.length * 5);
          });
          mainY += 5;
        });
        mainY += 5;
      }

      if (resumeData.education.length > 0) {
        addSectionHeader("EDUCATION");
        resumeData.education.forEach(edu => {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(edu.degree, mainX, mainY);
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.text(`${edu.institution} | ${edu.year}`, mainX, mainY + 5);
          mainY += 12;
        });
      }

      if (resumeData.projects && resumeData.projects.length > 0) {
        addSectionHeader("PROJECTS");
        resumeData.projects.forEach(proj => {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(proj.title, mainX, mainY);
          doc.setFontSize(9);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(100, 100, 100);
          doc.text(`${proj.org} | ${proj.date}`, mainX, mainY + 5);
          doc.setTextColor(...primaryColor);
          mainY += 10;
          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          proj.details.forEach(detail => {
            const detailLines = doc.splitTextToSize(`• ${detail}`, mainWidth);
            doc.text(detailLines, mainX + 2, mainY);
            mainY += (detailLines.length * 5);
          });
          mainY += 5;
        });
      }

    } else {
      // CLASSIC TEMPLATE
      let yClassic = 20;
      doc.setFillColor(...accentColor);
      doc.rect(0, 0, 210, 45, 'F');

      doc.setFontSize(24);
      doc.setTextColor(...primaryColor);
      doc.setFont(undefined, 'bold');
      doc.text(resumeData.personalInfo.name || "Your Name", 105, 20, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      let contactInfoClassic = `${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone} | ${resumeData.personalInfo.location}`;
      doc.text(contactInfoClassic, 105, 28, { align: 'center' });

      yClassic = 55;

      const addClassicSection = (title, content, isList = false) => {
        if (yClassic > 250) { doc.addPage(); yClassic = 20; }
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(title, 20, yClassic);
        doc.setFillColor(...accentColor);
        doc.rect(20, yClassic + 2, 170, 0.5, 'F');
        yClassic += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        if (isList) {
          content.forEach(item => {
            const lines = doc.splitTextToSize(`• ${item}`, 170);
            doc.text(lines, 20, yClassic);
            yClassic += lines.length * 5;
          });
          yClassic += 5;
        } else {
          const lines = doc.splitTextToSize(content, 170);
          doc.text(lines, 20, yClassic);
          yClassic += lines.length * 5 + 8;
        }
      };

      if (resumeData.objective) addClassicSection("CAREER OBJECTIVE", resumeData.objective);
      if (resumeData.summary) addClassicSection("PROFESSIONAL SUMMARY", resumeData.summary);

      if (resumeData.experience.length > 0) {
        addClassicSection("WORK EXPERIENCE", "");
        yClassic -= 5;
        resumeData.experience.forEach(exp => {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(exp.title, 20, yClassic);
          doc.setFontSize(10);
          doc.setFont(undefined, 'italic');
          doc.text(`${exp.company} | ${exp.duration}`, 20, yClassic + 5);
          yClassic += 10;
          doc.setFont(undefined, 'normal');
          exp.duties.forEach(duty => {
            const lines = doc.splitTextToSize(`• ${duty}`, 165);
            doc.text(lines, 25, yClassic);
            yClassic += lines.length * 5;
          });
          yClassic += 5;
        });
      }

      if (resumeData.education.length > 0) {
        addClassicSection("EDUCATION", "");
        yClassic -= 5;
        resumeData.education.forEach(edu => {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(edu.degree, 20, yClassic);
          doc.setFontSize(10);
          doc.text(`${edu.institution} | ${edu.year}`, 20, yClassic + 5);
          yClassic += 12;
        });
      }

      if (resumeData.projects && resumeData.projects.length > 0) {
        addClassicSection("PROJECTS", "");
        yClassic -= 5;
        resumeData.projects.forEach(proj => {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.text(proj.title, 20, yClassic);
          doc.setFontSize(10);
          doc.setFont(undefined, 'italic');
          doc.text(`${proj.org} | ${proj.date}`, 20, yClassic + 5);
          yClassic += 10;
          doc.setFont(undefined, 'normal');
          proj.details.forEach(detail => {
            const lines = doc.splitTextToSize(`• ${detail}`, 165);
            doc.text(lines, 25, yClassic);
            yClassic += lines.length * 5;
          });
          yClassic += 5;
        });
      }

      if (resumeData.skills.length > 0) {
        addClassicSection("SKILLS", resumeData.skills.join(" • "));
      }
    }

    return doc.output('blob');
  };

  const handleDownload = async () => {
    try {
      if (typeof window.jspdf === 'undefined') {
        setError("PDF library is still loading. Please wait a moment and try again.");
        return;
      }

      // Generate PDF and get blob
      const pdfBlob = generatePDF();
      const filename = resumeData.personalInfo.name
        ? `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf`
        : 'Resume.pdf';

      // Download the file to user's computer
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessages((prev) => [...prev, {
        from: "bot",
        text: "Your resume has been downloaded! 🎉 Good luck with your job applications!"
      }]);
      setError("");
    } catch (err) {
      setError("Failed to generate PDF. Please refresh the page and try again.");
      console.error("PDF Generation Error:", err);
    }
  };

  const handleOpenSaveDialog = () => {
    const defaultFilename = resumeData.personalInfo.name
      ? `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume`
      : 'Resume';
    setSaveFileName(defaultFilename);
    setShowSaveDialog(true);
  };

  const handleSaveToDatabase = async () => {
    try {
      setIsSaving(true); // Start loading
      const pdfBlob = generatePDF();
      const filename = `${saveFileName}.pdf`;

      await saveResumeToDatabase(pdfBlob, filename);
      setShowSaveDialog(false);
      setSaveFileName("");

      setSuccessMsg("Resume saved successfully! You can view it in the Resume section.");
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    } catch (err) {
      setError("Failed to save resume. Please try again.");
      console.error("Save Error:", err);
    } finally {
      setIsSaving(false); // Stop loading
    }
  };

  const saveResumeToDatabase = async (pdfBlob, filename) => {
    try {
      if (!userData) {
        throw new Error("User data not loaded. Please ensure you're logged in.");
      }

      // Fetch user_id from backend using email (same pattern as ProfileSection)
      const userResponse = await fetch(`${API_BASE}/api/profile/${userData.email}`);
      const userProfile = await userResponse.json();

      if (!userProfile || !userProfile.user_id) {
        throw new Error("Could not retrieve user ID from profile.");
      }

      const formData = new FormData();
      formData.append('resume', pdfBlob, filename);
      formData.append('userId', userProfile.user_id);
      formData.append('resumeData', JSON.stringify(resumeData));
      const response = await fetch(`${API_BASE}/api/resume/save`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        console.log('Resume saved to database:', data);
        setMessages((prev) => [...prev, {
          from: "bot",
          text: "Your resume has been saved to your account!"
        }]);
        return data;
      } else {
        throw new Error(data.error || 'Failed to save resume');
      }
    } catch (error) {
      console.error('Error saving resume to database:', error);
      setError(`Failed to save resume: ${error.message}. Please log in and try again.`);
      return null;
    }
  };





  // Helper function to determine current step from resume data
  const determineCurrentStep = (resumeData) => {
    if (!resumeData) return "name";
    if (resumeData.skills && resumeData.skills.length > 0) return "complete";
    if (resumeData.languages && resumeData.languages.length > 0) return "skills";
    if (resumeData.certifications && resumeData.certifications.length > 0) return "languages";
    if (resumeData.education && resumeData.education.length > 0) return "certifications";
    if (resumeData.experience && resumeData.experience.length > 0) return "education";
    if (resumeData.summary) return "experience";
    if (resumeData.objective) return "summary";
    if (resumeData.personalInfo && resumeData.personalInfo.portfolio) return "objective";
    if (resumeData.personalInfo && resumeData.personalInfo.linkedin) return "portfolio";
    if (resumeData.personalInfo && resumeData.personalInfo.location) return "linkedin";
    if (resumeData.personalInfo && resumeData.personalInfo.phone) return "location";
    if (resumeData.personalInfo && resumeData.personalInfo.email) return "phone";
    if (resumeData.personalInfo && resumeData.personalInfo.name) return "email";
    return "name";
  };

  // Load last chat from database
  const loadLastChatFromDatabase = async () => {
    try {
      if (!userData) {
        console.log('❌ No user data - cannot load from database');
        return;
      }

      // Get user_id
      const userResponse = await fetch(`${API_BASE}/api/profile/${userData.email}`);
      const userProfile = await userResponse.json();

      if (!userProfile || !userProfile.user_id) {
        console.log('❌ No user profile found');
        return;
      }

      // ==========================================
      // 🔑 KEY QUERY: Get LAST chat by timestamp
      // ==========================================
      const response = await fetch(`${API_BASE}/api/chat/history/${userProfile.user_id}`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        // ==========================================
        // This gets the MOST RECENT chat
        // Backend already sorted by: ORDER BY timestamp DESC
        // ==========================================
        const lastChat = data.data[0]; // ← FIRST item = LAST chat (most recent)

        console.log('Loaded chat from database:', lastChat.chat_id);
        console.log('Chat timestamp:', lastChat.timestamp);

        // Load the chat data
        setMessages(lastChat.chat_data);
        if (lastChat.resume_data) {
          setResumeData(lastChat.resume_data);
        }
        setLastSavedChatId(lastChat.chat_id);
        setActiveChatId(lastChat.chat_id);

        // Determine where user left off
        const step = determineCurrentStep(lastChat.resume_data);
        setCurrentStep(step);

        // ==========================================
        // Sync to localStorage for next time
        // ==========================================
        localStorage.setItem('careerbot_messages', JSON.stringify(lastChat.chat_data));
        localStorage.setItem('careerbot_resume', JSON.stringify(lastChat.resume_data || resumeData));
        localStorage.setItem('careerbot_step', step);
        localStorage.setItem('careerbot_chatId', lastChat.chat_id.toString());

        console.log('Synced database → localStorage');
      } else {
        console.log('No previous chats found in database');
      }
    } catch (error) {
      console.error('❌ Error loading chat from database:', error);
    }
  };

  const handleCreateNewResume = () => {
    // Clear localStorage
    localStorage.removeItem('careerbot_messages');
    localStorage.removeItem('careerbot_resume');
    localStorage.removeItem('careerbot_step');
    localStorage.removeItem('careerbot_chatId');

    // Reset all states to initial values
    setMessages([
      {
        from: "bot",
        text: "Kumusta! 👋 Welcome back to TaraTrabaho AI Resume Builder! Let's create another professional resume. What's your full name?",
      },
    ]);
    setInput("");
    setCurrentStep("name");
    setShowPreview(false);
    setIsLoading(false);
    setError("");
    setShowNewResumeDialog(false);
    setLastSavedChatId(null);

    // Reset resume data
    setResumeData({
      personalInfo: {
        name: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        portfolio: "",
      },
      objective: "",
      summary: "",
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      references: "Available upon request",
    });

    console.log('Chat reset - starting new resume');
  };

  const handleEditSection = (section) => {
    setIsEditMode(true);
    setShowEditMenu(false);

    const sectionMessages = {
      'name': "Let's update your name. What's your new full name?",
      'email': "What's your updated email address?",
      'phone': "What's your new mobile number? (Format: 09XX-XXX-XXXX)",
      'location': "Where are you located now? (City, Province)",
      'linkedin': "Update your LinkedIn profile URL (or type 'skip')",
      'portfolio': "Update your portfolio/GitHub URL (or type 'skip')",
      'objective': "Let's refine your career objective. What would you like it to say?",
      'summary': "Update your professional summary (2-3 sentences about your experience and strengths)",
      'experience': "Let's update your work experience. Tell me about your job:\n\nFormat: Job Title | Company Name | Start Date - End Date",
      'education': "Update your education:\n\nFormat: Degree/Course | School Name | Graduation Year",
      'certifications': "Update your certifications:\n\nFormat: Certification Name | Issuing Organization | Year\n(or type 'skip')",
      'languages': "What languages can you speak? (Include proficiency)\n\nExample: English - Fluent, Tagalog - Native",
      'skills': "List your key skills separated by commas (at least 3 skills)",
      'projects': "Update your projects or academic achievements:\n\nFormat: Project Title | Organization/Class | Date"
    };

    setMessages((prev) => [...prev, {
      from: "bot",
      text: sectionMessages[section] || "What would you like to update?"
    }]);

    const sectionStepMap = {
      'name': 'name',
      'email': 'email',
      'phone': 'phone',
      'location': 'location',
      'linkedin': 'linkedin',
      'portfolio': 'portfolio',
      'objective': 'objective',
      'summary': 'summary',
      'experience': 'experience',
      'education': 'education',
      'certifications': 'certifications',
      'languages': 'languages',
      'skills': 'skills',
      'projects': 'projects'
    };

    setCurrentStep(sectionStepMap[section]);
  };

  const handleTemplateSwitch = (newTemplate) => {
    setResumeData(prev => ({ ...prev, template: newTemplate }));
    setMessages(prev => [...prev, {
      from: "bot",
      text: `🎨 Template switched to **${newTemplate.charAt(0).toUpperCase() + newTemplate.slice(1)}**! You can see the change in the preview.`
    }]);
  };

  // Load a specific chat by ID
  const loadChatById = async (chatId) => {
    try {
      const chat = chatHistoryList.find(c => c.chat_id === chatId);
      if (!chat) return;

      // Load the chat data
      setMessages(chat.chat_data);
      if (chat.resume_data) {
        setResumeData(chat.resume_data);
      }
      setLastSavedChatId(chat.chat_id);
      setActiveChatId(chat.chat_id);

      // Determine the current step
      const step = determineCurrentStep(chat.resume_data);
      setCurrentStep(step);

      // Save to localStorage
      localStorage.setItem('careerbot_messages', JSON.stringify(chat.chat_data));
      localStorage.setItem('careerbot_resume', JSON.stringify(chat.resume_data || resumeData));
      localStorage.setItem('careerbot_step', step);
      localStorage.setItem('careerbot_chatId', chat.chat_id.toString());

      setShowChatHistory(false);
      console.log('Loaded chat:', chatId);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  // Starting a new chat
  const handleStartNewChat = () => {
    console.log('Starting completely new chat...');

    // Clear localStorage
    localStorage.removeItem('careerbot_messages');
    localStorage.removeItem('careerbot_resume');
    localStorage.removeItem('careerbot_step');
    localStorage.removeItem('careerbot_chatId');

    // Reset all states
    const initialMessage = {
      from: "bot",
      text: "Kumusta! 👋 Welcome to TaraTrabaho AI Resume Builder! I'll help you create a professional resume tailored for Philippine employers. Let's start with your full name.",
    };

    setMessages([initialMessage]);
    setInput("");
    setCurrentStep("name");
    setShowPreview(false);
    setIsLoading(false);
    setError("");
    setLastSavedChatId(null);
    setActiveChatId(null);
    setShowChatHistory(false);

    // Reset resume data
    const freshResumeData = {
      personalInfo: {
        name: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        portfolio: "",
      },
      objective: "",
      summary: "",
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      references: "Available upon request",
    };

    setResumeData(freshResumeData);

    console.log('New chat started - all data cleared');
  };

  // Deleting a chat
  const handleDeleteChat = async (chatId, chatName) => {
    if (!window.confirm(`Are you sure you want to delete "${chatName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('Deleting chat:', chatId);

      const response = await fetch(`${API_BASE}/api/chat/${chatId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        console.log('Chat deleted successfully');

        // If deleted chat was active, load the next most recent chat or start new
        if (activeChatId === chatId) {
          // Remove deleted chat from list first
          const updatedChatList = chatHistoryList.filter(chat => chat.chat_id !== chatId);
          setChatHistoryList(updatedChatList);

          if (updatedChatList.length > 0) {
            // Load the most recent remaining chat (first in the list)
            const nextChat = updatedChatList[0];
            console.log('Loading next most recent chat:', nextChat.chat_id);

            // Load the next chat
            setMessages(nextChat.chat_data);
            if (nextChat.resume_data) {
              setResumeData(nextChat.resume_data);
            }
            setLastSavedChatId(nextChat.chat_id);
            setActiveChatId(nextChat.chat_id);

            // Determine current step
            const step = determineCurrentStep(nextChat.resume_data);
            setCurrentStep(step);

            // Update localStorage
            localStorage.setItem('careerbot_messages', JSON.stringify(nextChat.chat_data));
            localStorage.setItem('careerbot_resume', JSON.stringify(nextChat.resume_data));
            localStorage.setItem('careerbot_step', step);
            localStorage.setItem('careerbot_chatId', nextChat.chat_id.toString());

            // Show success message
            setMessages((prev) => [...prev, {
              from: "bot",
              text: `✅ Chat deleted successfully! Loaded your previous chat: "${nextChat.resume_data?.personalInfo?.name || 'Unnamed Resume'}"`
            }]);
          } else {
            // No more chats - start fresh
            console.log('No more chats - starting new chat');
            handleStartNewChat();

            // Show success message after starting new chat
            setTimeout(() => {
              setMessages((prev) => [...prev, {
                from: "bot",
                text: "Chat deleted successfully! Starting a new resume for you."
              }]);
            }, 100);
          }
        } else {
          // Deleted chat was not active - just remove from list
          setChatHistoryList(prev => prev.filter(chat => chat.chat_id !== chatId));

          // Show success message
          setMessages((prev) => [...prev, {
            from: "bot",
            text: "✅ Chat deleted successfully!"
          }]);
        }
      } else {
        throw new Error(data.error || 'Failed to delete chat');
      }
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
      setError(`Failed to delete chat: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden pt-5 bg-white">
      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert severity="success">{successMsg}</Alert>
        </div>
      )}
      <div className="px-6 pb-3 flex justify-between items-center border-b bg-white italic">
        <h2 className="text-lg font-bold text-gray-900 md:pl-4">Resume Bot</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewResumeDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-yellow-400 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all hover:scale-105 active:scale-95 text-xs font-bold whitespace-nowrap cursor-pointer shadow-sm hover:shadow-md"
          >
            <span>+</span> New
          </button>
          <button
            onClick={() => {
              setShowChatHistory(true);
              fetchAllUserChats();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all hover:scale-105 active:scale-95 text-xs font-medium whitespace-nowrap cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            History ({chatHistoryList.length})
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex mb-4 ${msg.from === "user" ? "justify-end" : "justify-start"
              }`}
          >
            {msg.from === "bot" && (
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mr-2 flex-shrink-0 overflow-hidden border border-gray-200">
                <img src="/logo.png" alt="Bot" className="w-full h-full object-cover" />
              </div>
            )}
            <div
              className={`px-4 py-2 rounded-2xl max-w-xs text-sm whitespace-pre-line ${msg.from === "user"
                ? "bg-yellow-400 text-gray-900 font-semibold"
                : "bg-gray-100 text-gray-800"
                }`}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mr-2 overflow-hidden border border-gray-200">
              <img src="/logo.png" alt="Bot" className="w-full h-full object-cover" />
            </div>
            <div className="px-4 py-2 rounded-2xl bg-gray-100">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {currentStep === "complete" && (
        <div className="px-6 pb-4">
          <div className="bg-[#272343] p-1.5 rounded-2xl shadow-lg border border-gray-700">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {/* Primary Actions */}
              <button
                onClick={handleDownload}
                className="flex flex-col items-center justify-center min-w-[50px] h-11 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all flex-shrink-0"
                title="Download PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-[8px] font-bold mt-0.5 uppercase">PDF</span>
              </button>

              <button
                onClick={handleOpenSaveDialog}
                className="flex flex-col items-center justify-center min-w-[50px] h-11 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex-shrink-0"
                title="Save"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-[8px] font-bold mt-0.5 uppercase">Save</span>
              </button>

              <div className="w-px h-8 bg-gray-600 mx-1 flex-shrink-0"></div>

              {/* Tools */}
              <button
                onClick={() => setShowEditMenu(true)}
                className="flex-1 h-11 bg-gray-700 text-gray-200 rounded-xl hover:bg-gray-600 transition-all flex flex-col items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span className="text-[8px] mt-0.5 font-bold uppercase">Edit</span>
              </button>

              <button
                onClick={() => setShowPreview(true)}
                className="flex-1 h-11 bg-gray-700 text-gray-200 rounded-xl hover:bg-gray-600 transition-all flex flex-col items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-[8px] mt-0.5 font-bold uppercase">Preview</span>
              </button>

              <div className="w-px h-8 bg-gray-600 mx-1 flex-shrink-0"></div>

              {/* Theme Toggle */}
              <div className="flex flex-col bg-gray-800 p-1 rounded-xl flex-shrink-0 border border-gray-600">
                <button
                  onClick={() => handleTemplateSwitch('classic')}
                  className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase transition-all hover:scale-105 active:scale-95 cursor-pointer ${resumeData.template === 'classic' ? 'bg-yellow-400 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Classic
                </button>
                <button
                  onClick={() => handleTemplateSwitch('modern')}
                  className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase transition-all hover:scale-105 active:scale-95 cursor-pointer ${resumeData.template === 'modern' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Modern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="border-t border-gray-300 p-4 bg-white">
        <div className="flex items-center border border-black rounded-lg px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            className="flex-1 outline-none text-sm placeholder-gray-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
            disabled={isLoading}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={isLoading || input.trim() === ""}
            className="ml-2 w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➤
          </button>
        </div>
      </div>

      {
        showPreview && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm ">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-screen overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b bg-gray-800">
                <h2 className="text-xl font-bold text-white">Resume Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-white hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                <div className="bg-white p-8 shadow-lg max-w-4xl mx-auto">
                  <ResumePreview data={resumeData} />
                </div>
              </div>

              <div className="p-4 border-t flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-yellow-400 text-gray-900 py-3 px-4 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
                >
                  ⬇️ Download PDF
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* For Saving Dialog  */}
      {
        showSaveDialog && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#272343] rounded-lg w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-4">Save Resume to Account</h2>

              <p className="text-sm text-white mb-4">
                Are you sure you want to save this resume to your TaraTrabaho account? You can access it anytime from your profile.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-yellow-200 mb-2">
                  Resume Name
                </label>
                <input
                  type="text"
                  value={saveFileName}
                  onChange={(e) => setSaveFileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-white focus:ring-2 focus:ring-yellow-400"
                  placeholder="Enter resume name"
                />
                <p className="text-xs text-white mt-1">.pdf extension will be added automatically</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveToDatabase}
                  disabled={!saveFileName.trim() || isSaving}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>✓ Yes, Save</>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveFileName("");
                  }}
                  className="flex-1 px-6 py-2 border-2 border-gray-300 rounded-lg text-red-300 hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Create Another Resume Dialog */}
      {
        showNewResumeDialog && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <div className="bg-black rounded-lg w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-white mb-4">Create Another Resume?</h2>

              <p className="text-sm text-white mb-4">
                Are you sure you want to create a new resume? This will start a fresh conversation and reset all fields.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  💡 <strong>Don't worry!</strong> Your current chat history and resume have been automatically saved to your account.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateNewResume}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  ✓ Yes, Start New Resume
                </button>
                <button
                  onClick={() => setShowNewResumeDialog(false)}
                  className="flex-1 px-6 py-2  text-white bg-red-400 hover:bg-red-500 rounded-lg transition-colors font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Chat History Sidebar */}
      {
        showChatHistory && (
          <div className="fixed inset-0 bg-opacity-50 flex justify-end z-50">
            <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b bg-gray-800">
                <h2 className="text-xl font-bold text-white">Chat History</h2>
                <button
                  onClick={() => setShowChatHistory(false)}
                  className="text-white hover:text-gray-300 cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* New Chat Button */}
              <div className="p-4 border-b">
                <button
                  onClick={handleStartNewChat}
                  className="w-full bg-yellow-400 text-gray-900 py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-500 transition-colors font-semibold cursor-po"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Start New Chat
                </button>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingChats ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                  </div>
                ) : chatHistoryList.length > 0 ? (
                  <div className="space-y-2">
                    {chatHistoryList.map((chat) => {
                      const resumeName = chat.resume_data?.personalInfo?.name || 'Unnamed Resume';
                      const isActive = activeChatId === chat.chat_id;
                      const chatDate = new Date(chat.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div
                          key={chat.chat_id}
                          className={`relative w-full p-4 rounded-lg border-2 transition-all ${isActive
                            ? 'border-yellow-400 bg-yellow-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {/* Clickable area to load chat */}
                          <button
                            onClick={() => loadChatById(chat.chat_id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-yellow-400' : 'bg-gray-200'
                                }`}>
                                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {resumeName}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  {chatDate}
                                </p>
                                {isActive && (
                                  <span className="inline-block mt-2 text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Delete Button - Top Right Corner */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent loading chat when clicking delete
                              handleDeleteChat(chat.chat_id, resumeName);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-red-100 transition-colors group"
                            title="Delete chat"
                          >
                            <svg
                              className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">No chat history yet</p>
                    <p className="text-xs mt-1">Start creating resumes to see them here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
      {/* Edit Resume Menu */}
      {
        showEditMenu && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b ">
                <h2 className="text-xl font-bold text-black">✏️ Edit Resume Sections</h2>
                <button
                  onClick={() => setShowEditMenu(false)}
                  className="text-white hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Choose which section you'd like to update:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Personal Info Section */}
                  <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-400 transition-all">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Personal Information
                    </h3>
                    <div className="space-y-2">
                      <button onClick={() => handleEditSection('name')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Name
                      </button>
                      <button onClick={() => handleEditSection('email')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Email
                      </button>
                      <button onClick={() => handleEditSection('phone')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Phone
                      </button>
                      <button onClick={() => handleEditSection('location')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Location
                      </button>
                      <button onClick={() => handleEditSection('linkedin')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → LinkedIn
                      </button>
                      <button onClick={() => handleEditSection('portfolio')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Portfolio
                      </button>
                    </div>
                  </div>

                  {/* Career Section */}
                  <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-400 transition-all">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Career Details
                    </h3>
                    <div className="space-y-2">
                      <button onClick={() => handleEditSection('objective')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Career Objective
                      </button>
                      <button onClick={() => handleEditSection('summary')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Professional Summary
                      </button>
                      <button onClick={() => handleEditSection('experience')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Work Experience
                      </button>
                      <button onClick={() => handleEditSection('projects')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Projects & Academic Achievements
                      </button>
                    </div>
                  </div>

                  {/* Education Section */}
                  <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-400 transition-all">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Education & Certifications
                    </h3>
                    <div className="space-y-2">
                      <button onClick={() => handleEditSection('education')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Education
                      </button>
                      <button onClick={() => handleEditSection('certifications')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Certifications
                      </button>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-purple-400 transition-all">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Skills & Languages
                    </h3>
                    <div className="space-y-2">
                      <button onClick={() => handleEditSection('skills')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Skills
                      </button>
                      <button onClick={() => handleEditSection('languages')} className="w-full text-left text-sm text-gray-700 hover:text-purple-600 hover:bg-purple-50 p-2 rounded transition-all">
                        → Languages
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Tip:</strong> Click on any section above to update it. Your changes will be saved automatically!
                  </p>
                </div>
              </div>

              <div className="p-4 border-t">
                <button
                  onClick={() => setShowEditMenu(false)}
                  className="w-full py-2 px-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

const ResumePreview = ({ data }) => {
  const isModern = data.template === "modern";

  if (isModern) {
    return (
      <div className="bg-white flex flex-col md:flex-row min-h-[600px] border border-gray-200 shadow-lg rounded-lg overflow-hidden">
        {/* Sidebar */}
        <div className="md:w-1/3 bg-[#272343] p-6 text-white flex flex-col">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-2xl font-bold mb-2 leading-tight uppercase tracking-tight break-words">{data.personalInfo.name || "Your Name"}</h1>
          </div>

          <div className="space-y-4 text-[10px] font-light">
            <div className="border-l-2 border-[#bae8e8] pl-3 py-1">
              <p className="font-bold text-[#bae8e8] uppercase tracking-widest mb-0.5 text-[8px]">Contact</p>
              <p className="break-all opacity-90">{data.personalInfo.email}</p>
              <p className="opacity-90">{data.personalInfo.phone}</p>
              <p className="opacity-90">{data.personalInfo.location}</p>
            </div>

            {(data.personalInfo.linkedin || data.personalInfo.portfolio) && (
              <div className="border-l-2 border-[#bae8e8] pl-3 py-1">
                <p className="font-bold text-[#bae8e8] uppercase tracking-widest mb-0.5 text-[8px]">Links</p>
                {data.personalInfo.linkedin && <p className="text-[9px] break-all opacity-80 mb-1">🔗 LinkedIn</p>}
                {data.personalInfo.portfolio && <p className="text-[9px] break-all opacity-80">🌐 Portfolio</p>}
              </div>
            )}
          </div>

          <div className="mt-auto pt-10 space-y-8">
            {data.skills && data.skills.length > 0 && (
              <div>
                <h2 className="font-bold text-[#bae8e8] text-xs uppercase tracking-[0.2em] border-b border-[#bae8e8]/30 pb-2 mb-4">Skills</h2>
                <ul className="space-y-2 text-[10px] font-light">
                  {data.skills.map((skill, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#bae8e8] rounded-full"></span>
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.languages && data.languages.length > 0 && (
              <div>
                <h2 className="font-bold text-[#bae8e8] text-xs uppercase tracking-[0.2em] border-b border-[#bae8e8]/30 pb-2 mb-4">Languages</h2>
                <ul className="space-y-2 text-[10px] font-light">
                  {data.languages.map((lang, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#bae8e8] rounded-full"></span>
                      {lang}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="md:w-2/3 p-8 bg-white overflow-y-auto">
          {(data.summary || data.objective) && (
            <div className="mb-10">
              <h2 className="text-[#272343] font-bold text-sm uppercase tracking-[0.15em] mb-1">Profile</h2>
              <div className="h-0.5 w-10 bg-[#272343] mb-4"></div>
              <p className="text-xs text-gray-700 leading-relaxed font-light italic">
                {data.summary || data.objective}
              </p>
            </div>
          )}

          {data.experience.length > 0 && (
            <div className="mb-10">
              <h2 className="text-[#272343] font-bold text-sm uppercase tracking-[0.15em] mb-1">Experience</h2>
              <div className="h-0.5 w-10 bg-[#272343] mb-4"></div>
              <div className="space-y-6">
                {data.experience.map((exp, idx) => (
                  <div key={idx} className="relative">
                    <div className="flex flex-col mb-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-[#272343] text-sm">{exp.title}</h3>
                        <span className="text-[9px] text-gray-400 font-bold uppercase whitespace-nowrap ml-2">{exp.duration}</span>
                      </div>
                      <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">{exp.company}</p>
                    </div>
                    <ul className="space-y-1.5 mt-2">
                      {exp.duties.map((duty, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-2 leading-snug">
                          <span className="text-purple-300">•</span>
                          {duty}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.projects && data.projects.length > 0 && (
            <div className="mb-10">
              <h2 className="text-[#272343] font-bold text-sm uppercase tracking-[0.15em] mb-1">Projects</h2>
              <div className="h-0.5 w-10 bg-[#272343] mb-4"></div>
              <div className="space-y-6">
                {data.projects.map((proj, idx) => (
                  <div key={idx} className="relative">
                    <div className="flex flex-col mb-1">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-[#272343] text-sm">{proj.title}</h3>
                        <span className="text-[9px] text-gray-400 font-bold uppercase whitespace-nowrap ml-2">{proj.date}</span>
                      </div>
                      <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">{proj.org}</p>
                    </div>
                    <ul className="space-y-1.5 mt-2">
                      {proj.details.map((detail, i) => (
                        <li key={i} className="text-xs text-gray-600 flex gap-2 leading-snug">
                          <span className="text-purple-300">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.education.length > 0 && (
            <div className="mb-10">
              <h2 className="text-[#272343] font-bold text-sm uppercase tracking-[0.15em] mb-1">Education</h2>
              <div className="h-0.5 w-10 bg-[#272343] mb-4"></div>
              <div className="space-y-4">
                {data.education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-baseline">
                    <div>
                      <h3 className="font-bold text-[#272343] text-xs">{edu.degree}</h3>
                      <p className="text-[10px] text-gray-500 font-light">{edu.institution}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase whitespace-nowrap ml-4">{edu.year}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.certifications && data.certifications.length > 0 && (
            <div>
              <h2 className="text-[#272343] font-bold text-sm uppercase tracking-[0.15em] mb-1">Certifications</h2>
              <div className="h-0.5 w-10 bg-[#272343] mb-4"></div>
              <div className="space-y-3">
                {data.certifications.map((cert, idx) => (
                  <div key={idx} className="flex justify-between items-baseline">
                    <div>
                      <h3 className="font-bold text-[#272343] text-xs">{cert.name}</h3>
                      <p className="text-[10px] text-gray-500 font-light italic">{cert.issuer}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold uppercase whitespace-nowrap ml-4">{cert.year}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Classic Layout
  return (
    <div className="bg-white p-4">
      <div className="mb-6 pb-4 border-b-4 border-yellow-400">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 truncate">
          {data.personalInfo.name || "Your Name"}
        </h1>
        <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          <span className="flex items-center gap-1">📧 {data.personalInfo.email}</span>
          <span className="flex items-center gap-1">📞 {data.personalInfo.phone}</span>
          <span className="flex items-center gap-1">📍 {data.personalInfo.location}</span>
        </div>
      </div>

      <div className="space-y-6">
        {(data.objective || data.summary) && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400 uppercase tracking-wide">
              {data.summary ? "Professional Summary" : "Career Objective"}
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed mt-2">{data.summary || data.objective}</p>
          </div>
        )}

        {data.experience.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-1 border-b-2 border-yellow-400 uppercase tracking-wide">
              Work Experience
            </h2>
            <div className="space-y-4">
              {data.experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-900 text-base">{exp.title}</h3>
                    <span className="text-xs text-gray-500 font-semibold">{exp.duration}</span>
                  </div>
                  <p className="text-sm text-purple-700 font-semibold italic mb-2">{exp.company}</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                    {exp.duties.map((duty, i) => (
                      <li key={i}>{duty}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.education.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-1 border-b-2 border-yellow-400 uppercase tracking-wide">
              Education
            </h2>
            <div className="space-y-3">
              {data.education.map((edu, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{edu.degree}</h3>
                    <p className="text-sm text-gray-600">{edu.institution}</p>
                  </div>
                  <span className="text-xs text-gray-500 font-semibold">{edu.year}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.projects && data.projects.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 pb-1 border-b-2 border-yellow-400 uppercase tracking-wide">
              Projects
            </h2>
            <div className="space-y-4">
              {data.projects.map((proj, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-900 text-base">{proj.title}</h3>
                    <span className="text-xs text-gray-500 font-semibold">{proj.date}</span>
                  </div>
                  <p className="text-sm text-purple-700 font-semibold italic mb-2">{proj.org}</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                    {proj.details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {data.certifications && data.certifications.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400 uppercase tracking-wide">
                Certifications
              </h2>
              <div className="space-y-2">
                {data.certifications.map((cert, idx) => (
                  <div key={idx}>
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{cert.name}</h3>
                    <p className="text-xs text-gray-600 italic">{cert.issuer} | {cert.year}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {data.skills && data.skills.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400 uppercase tracking-wide">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((skill, idx) => (
                    <span key={idx} className="bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200 text-xs text-yellow-800 font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.languages && data.languages.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400 uppercase tracking-wide">
                  Languages
                </h2>
                <p className="text-sm text-gray-700">{data.languages.join(", ")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



export default CareerBotSection;