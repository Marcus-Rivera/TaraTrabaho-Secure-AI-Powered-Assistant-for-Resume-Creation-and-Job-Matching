import React, { useState } from "react";
import bg from './assets/BG.png';
import { FaBars, FaTimes, FaFacebookF, FaInstagram, FaSignInAlt, FaRocket, FaShieldAlt, FaBriefcase, FaRobot } from "react-icons/fa";
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';

const ContactModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
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

        <h2 className="text-2xl font-bold mb-6 text-center text-[#272343]">Contact Us</h2>

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

const LandingPage = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);

    const features = [
      {
        icon: <FaRobot className="text-4xl text-yellow-400" />,
        title: "AI Resume Builder",
        description: "Create professional resumes in minutes with AI guidance. No design skills needed!"
      },
      {
        icon: <FaBriefcase className="text-4xl text-yellow-400" />,
        title: "Smart Job Matching",
        description: "Get matched with jobs that fit your skills, location, and salary expectations."
      },
      {
        icon: <FaRocket className="text-4xl text-yellow-400" />,
        title: "Quick Apply",
        description: "Apply to multiple employers at once. Track all your applications in one place."
      },
      {
        icon: <FaShieldAlt className="text-4xl text-yellow-400" />,
        title: "Secure & Private",
        description: "Your data is encrypted and protected. OTP authentication keeps your account safe."
      }
    ];

    return (
        <div className="min-h-screen">
        {/* Hero Section with Background */}
        <div 
          className="bg-cover min-h-screen items-center justify-center flex flex-col"
          style={{ backgroundImage: `url(${bg})` }}
        >
        {/* NAVBAR */}
        <nav className="fixed top-0 left-0 w-full text-[#272343] shadow-md z-50">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold italic">
                Tara<span className="text-yellow-400 drop-shadow-[2px_2px_0px_black]">Trabaho!</span>
            </h1>
            <ul className="hidden md:flex gap-8 font-bold">
                <li><a href="/" className="hover:text-yellow-400 underline">Home</a></li>
                <li><a href="/about" className="hover:text-yellow-400 underline">About Us</a></li>
                <li>
                <button onClick={() => setContactOpen(true)} className="hover:text-yellow-400 underline">
                    Contact
                </button>
                </li>
                <li><a href="/faqs" className="hover:text-yellow-400 underline">FAQs</a></li>
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
                <a href="/" className="block hover:text-yellow-400">Home</a>
                <a href="/about" className="block hover:text-yellow-400">About Us</a>
                <button onClick={() => { setContactOpen(true); setIsOpen(false); }} className="block hover:text-yellow-400 text-left w-full">
                Contact
                </button>
                <a href="/faqs" className="block hover:text-yellow-400">FAQs</a>
            </div>
            )}
        </nav>

        {/* MAIN CONTENT */}
        <div className="items-center justify-center mx-auto p-5 mt-20">
            <h1 className="text-5xl lg:text-7xl text-center font-inter font-bold mb-10 italic text-[#272343] animate-bounce">
            Tara
            <span className="text-yellow-400 drop-shadow-[2px_2px_0px_black] italic">Trabaho!</span>
            </h1>
            <div className="animate-fadeIn">
            <h2 className="text-2xl md:text-4xl lg:text-5xl text-center font-inter font-bold mb-4 text-[#272343]">
                Your Smart Partner in Landing the Right Job
            </h2>
            </div>
            <p className="font-inter text-center p-5 font-bold italic text-[#272343] max-w-4xl mx-auto">
            TaraTrabaho helps Filipinos find jobs faster. Build a professional resume with AI in minutes. 
            Get matched to jobs that fit your skills and location. Apply directly, send to multiple employers, 
            and track your progress. Your data stays safe with encrypted storage, password hashing, and OTP login.
            </p>
            <div className="flex justify-center gap-4 mt-4">
            <a 
                href="/login" 
                className="flex items-center gap-2 px-8 py-2 rounded-md bg-[#272343] text-white hover:bg-yellow-400 hover:text-black transition"
                aria-label="Login to your account"
            >
                <FaSignInAlt size={18} />
                Login
            </a>
            <a 
                href="/signup" 
                className="flex items-center gap-2 px-8 py-2 rounded-md bg-[#272343] text-white hover:bg-yellow-400 hover:text-black transition"
                aria-label="Sign up for a new account"
            >
                <PersonAddAltIcon size={18} />
                Sign Up
            </a>
            </div>
        </div>
        </div>

        {/* FEATURES SECTION */}
        <div className="bg-[#272343] py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
              Why Choose TaraTrabaho?
            </h2>
            <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
              We make job hunting simple, fast, and effective for every Filipino
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition transform hover:scale-105"
                >
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 text-center">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300 text-sm text-center">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="max-w-7xl mx-auto px-4 py-16 bg-white">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#272343] mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-yellow-400 text-[#272343] rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-[#272343] mb-2">Sign Up</h3>
              <p className="text-gray-600">Create your free account with secure OTP verification</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-400 text-[#272343] rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-[#272343] mb-2">Build Resume</h3>
              <p className="text-gray-600">Let AI guide you through creating a professional resume</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-400 text-[#272343] rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-[#272343] mb-2">Get Hired</h3>
              <p className="text-gray-600">Apply to matched jobs and track your applications</p>
            </div>
          </div>
        </div>

        {/* FINAL CTA */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#272343] mb-4">
              Ready to Find Your Dream Job?
            </h2>
            <p className="text-[#272343] mb-8 text-lg font-semibold">
              Join thousands of Filipinos already using TaraTrabaho to build better careers
            </p>
            <a 
              href="/signup" 
              className="inline-flex items-center gap-2 px-10 py-4 rounded-lg bg-[#272343] text-white hover:bg-gray-800 transition transform hover:scale-105 font-bold text-lg shadow-xl"
            >
              <PersonAddAltIcon />
              Start Your Journey Today
            </a>
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

        {/* CONTACT MODAL */}
        <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
        </div>
  );
};

export default LandingPage;