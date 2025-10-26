import React, { useState } from "react";
import bg from "./assets/BG.png"; 
import { FaBars, FaTimes, FaFacebookF, FaInstagram, FaQuestionCircle, FaSearch } from "react-icons/fa";

const ContactModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm "
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-yellow-300 rounded-lg shadow-2xl p-6 w-full max-w-3xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black text-xl hover:scale-110 transition"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center text-[#272343]">
          Contact Us
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Fullname"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white font-bold"
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white font-bold"
            />
            <textarea
              placeholder="Message"
              rows="4"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white font-bold"
            ></textarea>
            <button
              type="button"
              className="w-full py-2 rounded-md bg-[#272343] text-white hover:bg-yellow-400 hover:text-black transition font-bold"
            >
              Contact Us
            </button>
          </div>

          <div className="space-y-4 text-[#272343] font-semibold">
            <div>
              <p className="font-bold">Contact</p>
              <p className="text-sm">TaraTrabaho@gmail.com</p>
            </div>
            <div>
              <p className="font-bold">Based in</p>
              <p className="text-sm italic">Magsaysay Avenue, Makati</p>
            </div>
            <div>
              <p className="font-bold">Socials</p>
              <div className="flex gap-3 mt-1">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:scale-110 transition"
                >
                  <FaFacebookF size={24} />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 hover:scale-110 transition"
                >
                  <FaInstagram size={24} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Faqs = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const faqs = [
    {
      category: "Getting Started",
      question: "How do I create an account on TaraTrabaho?",
      answer: "Click 'Sign Up' on the homepage and enter your email, phone number, and create a password. You'll receive an OTP (One-Time Password) via SMS or email to verify your account. Once verified, you can start building your resume and searching for jobs!"
    },
    {
      category: "Pricing",
      question: "Is TaraTrabaho free to use?",
      answer: "Yes! TaraTrabaho's basic features are completely free, including creating your AI-powered resume and applying to jobs. We also offer a Premium subscription for advanced features like sending your resume to multiple employers at once and priority job matching."
    },
    {
      category: "Resume Builder",
      question: "How does the AI Resume Builder work?",
      answer: "Our AI Resume Builder guides you through a simple interview-style process. Just answer questions about your skills, work experience, and education. The AI will automatically generate a professional, well-formatted resume for you. No technical skills needed!"
    },
    {
      category: "Job Matching",
      question: "Paano ako makakahanap ng trabahong swak sa akin?",
      answer: "Ang AI Job Matching feature ay mag-a-analyze ng iyong skills, experience, location preference, at desired salary. Pagkatapos, automatic na magrerecommend ng mga trabaho na swak sa iyo. Simple lang—sagutan mo lang ang mga tanong at tutulungan ka ng AI!"
    },
    {
      category: "Job Matching",
      question: "How does TaraTrabaho match me with jobs?",
      answer: "Our AI analyzes your resume, skills, work experience, location preferences, and salary expectations. It then recommends jobs that best match your profile. The more complete your profile, the better the job matches!"
    },
    {
      category: "Getting Started",
      question: "Do I need computer skills to use TaraTrabaho?",
      answer: "Not at all! TaraTrabaho is designed for everyone, even if you're not familiar with computers. The platform guides you step-by-step with simple questions. If you need help, our support team is ready to assist you."
    },
    {
      category: "Security",
      question: "Is my personal information safe on TaraTrabaho?",
      answer: "Yes, we take your security seriously. All personal data and resumes are encrypted and stored securely. We comply with data protection laws, and only verified employers can view your resume when you apply. You control what information to share."
    },
    {
      category: "Security",
      question: "What is OTP authentication and why do I need it?",
      answer: "OTP (One-Time Password) is a security code sent to your email during registration. It adds an extra layer of protection to prevent unauthorized access to your account and keeps your personal information safe."
    },
    {
      category: "Account",
      question: "How can I reset my password?",
      answer: "Click 'Forgot Password?' on the login page and enter your email or phone number. You'll receive an email that contains instructions to reset your password. Follow the link provided to create a new password and regain access to your account."
    },
    {
      category: "Applications",
      question: "How do I apply for a job through TaraTrabaho?",
      answer: "Browse available jobs or check your AI-recommended matches. Click on a job you're interested in, review the details, and click 'Apply.' Your resume will be sent to the employer automatically. You can track your applications in your dashboard."
    },
    {
      category: "Pricing",
      question: "What are the benefits of a Premium subscription?",
      answer: "Premium members can send their resume to multiple employers at once, get priority job matching, access advanced analytics on their applications, and receive personalized career coaching tips. Basic job search and resume creation remain free!"
    },
    {
      category: "Job Matching",
      question: "What if I don't have much work experience?",
      answer: "No problem! TaraTrabaho also recommends entry-level and beginner-friendly positions. The AI Resume Builder helps you highlight your skills, education, volunteer work, and potential—even if you're just starting your career."
    },
    {
      category: "Support",
      question: "How do I contact support?",
      answer: "You can reach our support team by clicking 'Contact' in the navigation bar, sending an email to TaraTrabaho@gmail.com, or messaging us on Facebook and Instagram. We're here to help you succeed!"
    }
  ];

  const categories = ["All", ...new Set(faqs.map(faq => faq.category))];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div
        className="bg-cover min-h-[50vh] flex flex-col relative"
        style={{ backgroundImage: `url(${bg})` }}
      >
        {/* NAVBAR */}
        <nav className="fixed top-0 left-0 w-full text-[#272343] shadow-md z-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold italic">
              Tara<span className="text-yellow-400 drop-shadow-[2px_2px_0px_black]">Trabaho!</span>
            </h1>
            <ul className="hidden md:flex gap-8 font-bold">
              <li>
                <a href="/" className="hover:text-yellow-400 underline">
                  Home
                </a>
              </li>
              <li>
                <a href="/about" className="hover:text-yellow-400 underline">
                  About Us
                </a>
              </li>
              <li>
                <button
                  onClick={() => setContactOpen(true)}
                  className="hover:text-yellow-400 underline"
                >
                  Contact
                </button>
              </li>
              <li>
                <a href="/faqs" className="hover:text-yellow-400 underline">
                  FAQs
                </a>
              </li>
            </ul>
            <button
              className="md:hidden text-2xl"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>

          {isOpen && (
            <div className="md:hidden bg-[#272343] text-white font-bold px-4 py-3 space-y-3">
              <a href="/" className="block hover:text-yellow-400">
                Home
              </a>
              <a href="/about" className="block hover:text-yellow-400">
                About Us
              </a>
              <button
                onClick={() => {
                  setContactOpen(true);
                  setIsOpen(false);
                }}
                className="block hover:text-yellow-400 text-left w-full"
              >
                Contact
              </button>
              <a href="/faqs" className="block hover:text-yellow-400">
                FAQs
              </a>
            </div>
          )}
        </nav>

        {/* Hero Content */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center animate-fadeIn">
            <div className="flex justify-center mb-4">
              <FaQuestionCircle className="text-6xl text-yellow-400 drop-shadow-lg" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#272343] mb-4">
              Frequently Asked <span className="text-yellow-400 drop-shadow-[2px_2px_0px_black]">Questions</span>
            </h1>
            <p className="text-lg md:text-xl text-[#272343] font-semibold max-w-2xl mx-auto">
              Find answers to common questions about TaraTrabaho
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-[#272343] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="relative mb-6">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold text-white"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  selectedCategory === category
                    ? "bg-yellow-400 text-[#272343]"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No questions found matching your search.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-4 px-6 py-2 bg-yellow-400 text-[#272343] rounded-lg font-bold hover:bg-yellow-500 transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex-1">
                    <span className="inline-block px-3 py-1 text-xs font-bold bg-yellow-400 text-[#272343] rounded-full mr-3">
                      {faq.category}
                    </span>
                    <span className="text-lg font-bold text-[#272343]">
                      {faq.question}
                    </span>
                  </div>
                  <span className={`text-yellow-400 text-2xl font-bold transition-transform ${
                    activeIndex === index ? 'rotate-180' : ''
                  }`}>
                    ▼
                  </span>
                </button>
                {activeIndex === index && (
                  <div className="px-6 py-4 text-gray-700 bg-gray-50 border-t-2 border-yellow-400 animate-fadeIn">
                    <p className="leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Still Have Questions Section */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#272343] mb-4">
            Still Have Questions?
          </h2>
          <p className="text-[#272343] mb-6 font-semibold">
            Our support team is here to help you every step of the way
          </p>
          <button
            onClick={() => setContactOpen(true)}
            className="inline-block px-8 py-3 rounded-lg bg-[#272343] text-white hover:bg-gray-800 transition transform hover:scale-105 font-bold shadow-xl"
          >
            Contact Support
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-[#272343] text-white py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm mb-4 md:mb-0">
            © 2025 TaraTrabaho. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">
              <FaFacebookF size={20} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">
              <FaInstagram size={20} />
            </a>
          </div>
        </div>
      </footer>

      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default Faqs;