import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useSessionCheck } from "../useSessionCheck";
import SessionExpiredModal from "../SessionExpiredModal";
import { Alert } from "@mui/material";
import { API_BASE } from "../config/api";

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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  //  For Saving of PDF to account
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

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
    education: [],
    skills: [],
    certifications: [],
    languages: [],
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
        response = await fetch('/api/chat/save', {
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  const callGeminiAPI = async (userInput, instruction = "") => {
    try {
      const prompt = instruction
        ? `${instruction}\n\nUser input: ${userInput}`
        : userInput;

      const res = await fetch("/api/gemini", {
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

  const handleSend = async () => {
    if (input.trim() === "" || isLoading) return;
    
    setError("");
    setMessages((prev) => [...prev, { from: "user", text: input }]);
    
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);

    setTimeout(async () => {
      await processUserInput(userInput);
      setIsLoading(false);
    }, 500);
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
          botResponse = `Nice to meet you, ${userInput}! 😊 What's your email address?`;
          setCurrentStep("email");
        }
        break;

      case "email":
        if (!validateEmail(userInput)) {
          botResponse = "That doesn't look like a valid email. Please enter a valid email address (e.g., juan@gmail.com)";
          isValid = false;
        } else {
          updatedData.personalInfo.email = userInput;
          botResponse = "Perfect! What's your mobile number? (Format: 09XX-XXX-XXXX)";
          setCurrentStep("phone");
        }
        break;

      case "phone":
        if (!validatePhone(userInput)) {
          botResponse = "Please enter a valid Philippine mobile number (e.g., 0917-123-4567 or +639171234567)";
          isValid = false;
        } else {
          updatedData.personalInfo.phone = userInput;
          botResponse = "Salamat! Where are you located? (City, Province - e.g., Quezon City, Metro Manila)";
          setCurrentStep("location");
        }
        break;

      case "location":
        if (userInput.length < 3) {
          botResponse = "Please enter your complete location (City and Province/Region)";
          isValid = false;
        } else {
          updatedData.personalInfo.location = userInput;
          botResponse = "Great! 🌐 Do you have a LinkedIn profile? (Paste the URL or type 'skip')";
          setCurrentStep("linkedin");
        }
        break;

      case "linkedin":
        if (userInput.toLowerCase() === 'skip' || userInput.toLowerCase() === 'none') {
          updatedData.personalInfo.linkedin = "";
          botResponse = "No problem! Do you have a portfolio website or GitHub profile? (Paste URL or type 'skip')";
          setCurrentStep("portfolio");
        } else if (!validateURL(userInput)) {
          botResponse = "Please enter a valid URL (e.g., https://linkedin.com/in/yourname) or type 'skip'";
          isValid = false;
        } else {
          updatedData.personalInfo.linkedin = userInput;
          botResponse = "Excellent! Do you have a portfolio website or GitHub profile? (Paste URL or type 'skip')";
          setCurrentStep("portfolio");
        }
        break;

      case "portfolio":
        if (userInput.toLowerCase() === 'skip' || userInput.toLowerCase() === 'none') {
          updatedData.personalInfo.portfolio = "";
          botResponse = "Understood! Now, what type of position are you applying for? Write a brief career objective (1-2 sentences).\n\nExample: Seeking a Marketing Coordinator position where I can leverage my digital marketing skills to drive brand growth.";
          setCurrentStep("objective");
        } else if (!validateURL(userInput)) {
          botResponse = "Please enter a valid URL (e.g., https://yourportfolio.com) or type 'skip'";
          isValid = false;
        } else {
          updatedData.personalInfo.portfolio = userInput;
          botResponse = "Perfect! 🎯 Now, what type of position are you applying for? Write a brief career objective (1-2 sentences).\n\nExample: Seeking a Marketing Coordinator position where I can leverage my digital marketing skills to drive brand growth.";
          setCurrentStep("objective");
        }
        break;

      case "objective":
        if (userInput.split(" ").length < 8) {
          botResponse = "Please provide more details about your career objective (at least 8 words).";
          isValid = false;
        } else {
          setMessages((prev) => [...prev, { from: "bot", text: "✨ Refining your career objective with AI..." }]);
          
          const enhancedObjective = await callGeminiAPI(
            userInput, 
            "Rewrite this career objective to be compelling and professional. Make it concise (1-2 sentences), action-oriented, and tailored for Philippine job applications. Return only the refined objective without explanations."
          );
          
          updatedData.objective = enhancedObjective || userInput;
          botResponse = enhancedObjective 
            ? `Great! Here's your refined objective:\n\n"${enhancedObjective}"\n\n💼 Now tell me about yourself professionally. Write 2-3 sentences highlighting your experience, key strengths, and what makes you stand out.`
            : "Great! 💼 Now tell me about yourself professionally. Write 2-3 sentences highlighting your experience, key strengths, and what makes you stand out.";
          setCurrentStep("summary");
        }
        break;

      case "summary":
        if (userInput.split(" ").length < 10) {
          botResponse = "Please provide more details (at least 10 words). Describe your professional background, key achievements, and strengths.";
          isValid = false;
        } else {
          setMessages((prev) => [...prev, { from: "bot", text: "✨ Enhancing your summary with AI..." }]);
          
          const enhancedSummary = await callGeminiAPI(
            userInput, 
            "Improve and rewrite this professional summary for a resume tailored to job applications in the Philippines. Make it sound confident, achievement-focused, and professional. Include specific strengths and value propositions. Keep it concise (3–4 sentences) and return only one final version without giving multiple options or explanations."
          );
          
          updatedData.summary = enhancedSummary || userInput;
          botResponse = enhancedSummary 
            ? `Excellent! Here's your enhanced summary:\n\n"${enhancedSummary}"\n\n👔 Let's add your work experience. Tell me about your most recent job:\n\nFormat: Job Title | Company Name | Start Date - End Date\nExample: Marketing Assistant | SM Supermalls | Jan 2022 - Present`
            : "Excellent! 👔 Let's add your work experience. Tell me about your most recent job:\n\nFormat: Job Title | Company Name | Start Date - End Date\nExample: Marketing Assistant | SM Supermalls | Jan 2022 - Present";
          setCurrentStep("experience");
        }
        break;

      case "experience":
        const expParts = userInput.split("|").map((s) => s.trim());
        if (expParts.length < 3) {
          botResponse = "Please follow the format: Job Title | Company Name | Duration\nExample: Sales Associate | Jollibee | Jan 2022 - Dec 2023";
          isValid = false;
        } else {
          updatedData.currentExperience = {
            title: expParts[0],
            company: expParts[1],
            duration: expParts[2],
            duties: [],
          };
          botResponse = "Great! Now describe your key responsibilities and achievements in this role (separate each with a semicolon).\n\nExample: Handled customer inquiries and complaints; Increased sales by 20% through upselling techniques; Trained 5 new employees on company procedures";
          setCurrentStep("experience_duties");
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
            updatedData.experience.push(updatedData.currentExperience);
            delete updatedData.currentExperience;
          }
          botResponse = "Magaling! Do you want to add another work experience? Type 'yes' or 'no'";
          setCurrentStep("experience_more");
        }
        break;

      case "experience_more":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          botResponse = "Please enter your next job experience:\n\nFormat: Job Title | Company Name | Start Date - End Date";
          setCurrentStep("experience");
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
        } else {
          updatedData.education.push({
            degree: eduParts[0],
            institution: eduParts[1],
            year: eduParts[2],
          });
          botResponse = "Would you like to add another educational background? Type 'yes' or 'no'";
          setCurrentStep("education_more");
        }
        break;

      case "education_more":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          botResponse = "Enter your next educational background:\n\nFormat: Degree/Course | School | Year";
          setCurrentStep("education");
        } else {
          botResponse = "Great! 🎓 Do you have any professional certifications? (e.g., TESDA, NC II, First Aid, etc.)\n\nFormat: Certification Name | Issuing Organization | Year\nExample: National Certificate II in Housekeeping | TESDA | 2023\n\nOr type 'skip' if none";
          setCurrentStep("certifications");
        }
        break;

      case "certifications":
        if (userInput.toLowerCase() === 'skip' || userInput.toLowerCase() === 'none') {
          updatedData.certifications = [];
          botResponse = "No problem! 🌍 What languages can you speak? (Include proficiency level)\n\nFormat: Language - Proficiency\nExample: English - Fluent, Tagalog - Native, Bisaya - Conversational\n\nSeparate multiple languages with commas.";
          setCurrentStep("languages");
        } else {
          const certParts = userInput.split("|").map((s) => s.trim());
          if (certParts.length < 2) {
            botResponse = "Please follow the format: Certification Name | Issuing Organization | Year\nOr type 'skip' if you don't have any certifications";
            isValid = false;
          } else {
            updatedData.certifications.push({
              name: certParts[0],
              issuer: certParts[1],
              year: certParts[2] || "N/A",
            });
            botResponse = "Excellent! Do you want to add another certification? Type 'yes' or 'no'";
            setCurrentStep("certifications_more");
          }
        }
        break;

      case "certifications_more":
        if (userInput.toLowerCase().includes("yes") || userInput.toLowerCase().includes("oo")) {
          botResponse = "Enter your next certification:\n\nFormat: Certification Name | Issuing Organization | Year";
          setCurrentStep("certifications");
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
          updatedData.languages = languagesList;
          botResponse = "Almost done! 🎉 List your key skills separated by commas (at least 3 skills).\n\nExample: Customer Service, MS Office, Social Media Marketing, Time Management, Communication Skills";
          setCurrentStep("skills");
        }
        break;

      case "skills":
        const skillsList = userInput.split(",").map((s) => s.trim()).filter((s) => s);
        if (skillsList.length < 3) {
          botResponse = "Please list at least 3 skills separated by commas.";
          isValid = false;
        } else {
          updatedData.skills = skillsList;
          botResponse = "Congratulations! 🎊 Your resume is complete! Click 'Preview Resume' to see it, or 'Download PDF' to save it. You can also type 'edit' if you want to change anything.";
          setCurrentStep("complete");
        }
        break;

      case "complete":
        if (userInput.toLowerCase().includes("edit")) {
          botResponse = "Sure! What section would you like to edit? (personal info, objective, summary, experience, education, certifications, languages, or skills)";
        } else if (userInput.toLowerCase().includes("new") || userInput.toLowerCase().includes("another")) {
          setShowNewResumeDialog(true);
          botResponse = "Would you like to create another resume? This will start fresh with a new conversation.";
        } else {
          botResponse = "You can preview your resume, download it as PDF, or save it to your account. Need any changes? Just let me know!\n\nType 'new resume' if you want to create another one.";
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
  
  const primaryColor = [39, 35, 67];
  const accentColor = [255, 230, 96];
  
  let y = 20;

  doc.setFillColor(...accentColor);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont(undefined, 'bold');
  doc.text(resumeData.personalInfo.name, 105, 20, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let contactInfo = `${resumeData.personalInfo.email} | ${resumeData.personalInfo.phone} | ${resumeData.personalInfo.location}`;
  doc.text(contactInfo, 105, 28, { align: 'center' });
  
  if (resumeData.personalInfo.linkedin || resumeData.personalInfo.portfolio) {
    let links = [];
    if (resumeData.personalInfo.linkedin) links.push(resumeData.personalInfo.linkedin);
    if (resumeData.personalInfo.portfolio) links.push(resumeData.personalInfo.portfolio);
    doc.setFontSize(8);
    doc.text(links.join(' | '), 105, 36, { align: 'center' });
  }
  
  y = 55;

  if (resumeData.objective) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('CAREER OBJECTIVE', 20, y);
    
    doc.setFillColor(...accentColor);
    doc.rect(20, y + 2, 170, 0.5, 'F');
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    const objectiveLines = doc.splitTextToSize(resumeData.objective, 170);
    doc.text(objectiveLines, 20, y);
    y += objectiveLines.length * 5 + 8;
  }

  if (resumeData.summary) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('PROFESSIONAL SUMMARY', 20, y);
    
    doc.setFillColor(...accentColor);
    doc.rect(20, y + 2, 170, 0.5, 'F');
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(resumeData.summary, 170);
    doc.text(summaryLines, 20, y);
    y += summaryLines.length * 5 + 8;
  }

  if (resumeData.experience.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('WORK EXPERIENCE', 20, y);
    
    doc.setFillColor(...accentColor);
    doc.rect(20, y + 2, 170, 0.5, 'F');
    
    y += 8;
    
    resumeData.experience.forEach((exp) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(exp.title, 20, y);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(80, 80, 80);
      doc.text(`${exp.company} | ${exp.duration}`, 20, y + 5);
      
      y += 10;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60, 60, 60);
      
      exp.duties.forEach((duty) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const dutyLines = doc.splitTextToSize(`• ${duty}`, 165);
        doc.text(dutyLines, 25, y);
        y += dutyLines.length * 5;
      });
      
      y += 5;
    });
  }

  if (resumeData.education.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    y += 3;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('EDUCATION', 20, y);
    
    doc.setFillColor(...accentColor);
    doc.rect(20, y + 2, 170, 0.5, 'F');
    
    y += 8;
    
    resumeData.education.forEach((edu) => {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(edu.degree, 20, y);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`${edu.institution} | ${edu.year}`, 20, y + 5);
      
      y += 12;
    });
  }

  if (resumeData.certifications.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    y += 3;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('CERTIFICATIONS', 20, y);
    
    doc.setFillColor(...accentColor);
    doc.rect(20, y + 2, 170, 0.5, 'F');
    
    y += 8;
    
    resumeData.certifications.forEach((cert) => {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(cert.name, 20, y);
      
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`${cert.issuer} | ${cert.year}`, 20, y + 5);
      
      y += 11;
    });
  }

  if (resumeData.skills.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    y += 3;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('SKILLS', 20, y);
    
    doc.setFillColor(...accentColor);
    doc.rect(20, y + 2, 170, 0.5, 'F');
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    
    const skillsText = resumeData.skills.join(' • ');
    const skillsLines = doc.splitTextToSize(skillsText, 170);
    doc.text(skillsLines, 20, y);
    y += skillsLines.length * 5 + 8;
  }

  if (resumeData.languages.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    y += 3;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('LANGUAGES', 20, y);
    
    doc.setFillColor(...accentColor);
    doc.rect(20, y + 2, 170, 0.5, 'F');
    
    y += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    
    resumeData.languages.forEach((lang) => {
      doc.text(`• ${lang}`, 20, y);
      y += 5;
    });
  }

  // Return the PDF as blob instead of directly saving
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
      const response = await fetch('/api/resume/save', {
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
      {/* Chat History Button */}
      <div className="px-6 pb-3 flex justify-between items-center border-b">
        <h2 className="text-lg font-bold text-gray-900 pl-5 md:pl-4">Resume Builder</h2>
        <button
          onClick={() => {
            setShowChatHistory(true);
            fetchAllUserChats();
          }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Chat History ({chatHistoryList.length})
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex mb-4 ${
              msg.from === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.from === "bot" && (
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0">
                🤖
              </div>
            )}
            <div
              className={`px-4 py-2 rounded-2xl max-w-xs text-sm whitespace-pre-line ${
                msg.from === "user"
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
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center mr-2">
              🤖
            </div>
            <div className="px-4 py-2 rounded-2xl bg-gray-100">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
        <div className="px-6 pb-3">
          {/* Main Actions - Horizontal Row */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 hover:border-gray-400 hover:bg-gray-50 transition-all text-xs font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 bg-yellow-400 text-gray-900 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-yellow-500 transition-all text-xs font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>

            <button
              onClick={handleOpenSaveDialog}
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all text-xs font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Save
            </button>
          </div>

          {/* New Resume Button */}
          <button
            onClick={() => setShowNewResumeDialog(true)}
            className="w-full bg-[#272343] text-white py-2 px-3 rounded-md flex items-center justify-center gap-1.5 hover:bg-[#1c1930] transition-all text-xs font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Resume
          </button>

          {/* Status - Minimal */}
          {lastSavedChatId && (
            <p className="text-[10px] text-center text-green-600 mt-1.5 flex items-center justify-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-green-600 rounded-full"></span>
              Auto-saved
            </p>
          )}
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

      {showPreview && (
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
      )}
      {/* For Saving Dialog  */}
      {showSaveDialog && (
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
                disabled={!saveFileName.trim()}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Yes, Save
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
      )}
      {/* Create Another Resume Dialog */}
      {showNewResumeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Another Resume?</h2>
            
            <p className="text-sm text-gray-600 mb-4">
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
                className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                ✓ Yes, Start New Resume
              </button>
              <button
                onClick={() => setShowNewResumeDialog(false)}
                className="flex-1 px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat History Sidebar */}
      {showChatHistory && (
        <div className="fixed inset-0 bg-opacity-50 flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-800">
              <h2 className="text-xl font-bold text-white">Chat History</h2>
              <button
                onClick={() => setShowChatHistory(false)}
                className="text-white hover:text-gray-300"
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
                className="w-full bg-yellow-400 text-gray-900 py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-500 transition-colors font-semibold"
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
                        className={`relative w-full p-4 rounded-lg border-2 transition-all ${
                          isActive
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
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isActive ? 'bg-yellow-400' : 'bg-gray-200'
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
      )}

    </div>
  );
};

const ResumePreview = ({ data }) => {
  return (
    <div className="bg-white">
      {/* Header */}
      <div className="mb-6 pb-4 border-b-4 border-yellow-400">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {data.personalInfo.name || "Your Name"}
        </h1>
        <div className="text-sm text-gray-600 flex flex-wrap gap-3">
          <span>📧 {data.personalInfo.email}</span>
          <span>📞 {data.personalInfo.phone}</span>
          <span>📍 {data.personalInfo.location}</span>
        </div>
        {(data.personalInfo.linkedin || data.personalInfo.portfolio) && (
          <div className="text-xs text-blue-600 mt-2 flex flex-wrap gap-2">
            {data.personalInfo.linkedin && <span>🔗 {data.personalInfo.linkedin}</span>}
            {data.personalInfo.portfolio && <span>🌐 {data.personalInfo.portfolio}</span>}
          </div>
        )}
      </div>

      {/* Career Objective */}
      {data.objective && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400">
            CAREER OBJECTIVE
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">{data.objective}</p>
        </div>
      )}

      {/* Professional Summary */}
      {data.summary && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400">
            PROFESSIONAL SUMMARY
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">{data.summary}</p>
        </div>
      )}

      {/* Work Experience */}
      {data.experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 pb-1 border-b-2 border-yellow-400">
            WORK EXPERIENCE
          </h2>
          {data.experience.map((exp, idx) => (
            <div key={idx} className="mb-4">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-gray-900 text-base">{exp.title}</h3>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{exp.duration}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2 italic">{exp.company}</p>
              {exp.duties && exp.duties.length > 0 && (
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-2">
                  {exp.duties.map((duty, i) => (
                    <li key={i}>{duty}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 pb-1 border-b-2 border-yellow-400">
            EDUCATION
          </h2>
          {data.education.map((edu, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{edu.degree}</h3>
                  <p className="text-sm text-gray-600">{edu.institution}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{edu.year}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 pb-1 border-b-2 border-yellow-400">
            CERTIFICATIONS
          </h2>
          {data.certifications.map((cert, idx) => (
            <div key={idx} className="mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">{cert.name}</h3>
              <p className="text-xs text-gray-600">{cert.issuer} | {cert.year}</p>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 pb-1 border-b-2 border-yellow-400">
            SKILLS
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-yellow-400 text-gray-900 rounded-full text-sm font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {data.languages && data.languages.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3 pb-1 border-b-2 border-yellow-400">
            LANGUAGES
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.languages.map((lang, idx) => (
              <span key={idx} className="text-sm text-gray-700">• {lang}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};



export default CareerBotSection;