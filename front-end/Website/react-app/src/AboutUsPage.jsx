import React, { useState } from "react";
import bg from "./assets/BG.png";
import working from "./assets/working.png";
import { FaBars, FaTimes, FaFacebookF, FaInstagram, FaUsers, FaRocket, FaHeart, FaLightbulb } from "react-icons/fa";

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

const AboutPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const values = [
    {
      icon: <FaUsers className="text-4xl text-yellow-400" />,
      title: "Empowerment",
      description: "We empower every Filipino to find meaningful employment that matches their skills and aspirations."
    },
    {
      icon: <FaRocket className="text-4xl text-yellow-400" />,
      title: "Innovation",
      description: "We leverage AI technology to simplify and modernize the job search experience for all Filipinos."
    },
    {
      icon: <FaHeart className="text-4xl text-yellow-400" />,
      title: "Accessibility",
      description: "We believe everyone deserves access to quality job opportunities, regardless of their digital literacy."
    },
    {
      icon: <FaLightbulb className="text-4xl text-yellow-400" />,
      title: "Simplicity",
      description: "We make job searching straightforward and stress-free with intuitive tools and guidance."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div
        className="bg-cover min-h-[60vh] flex flex-col relative"
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

        {/* Hero Title */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center animate-fadeIn">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#272343] mb-4">
              About <span className="text-yellow-400 drop-shadow-[2px_2px_0px_black]">Us</span>
            </h1>
            <p className="text-lg md:text-xl text-[#272343] font-semibold max-w-2xl mx-auto">
              Empowering Filipinos to find their dream jobs with AI-powered simplicity
            </p>
          </div>
        </div>
      </div>

      {/* Main Story Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Image */}
          <div className="flex justify-center order-2 lg:order-1">
            <img
              src={working}
              alt="About us illustration"
              className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto drop-shadow-2xl"
            />
          </div>

          {/* Right: Text */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-[#272343] mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-[#272343]">
              <p className="text-justify font-semibold leading-relaxed">
                In the Philippines, many job seekers face significant challenges in securing employment. 
                Limited digital literacy makes it difficult to create professional resumes or navigate 
                online job platforms. Searching for work often requires going place-to-place for inquiries, 
                consuming valuable time and resources.
              </p>
              <p className="text-justify font-semibold leading-relaxed">
                Existing job portals can be overwhelming, with complex interfaces that aren't beginner-friendly. 
                As a result, many Filipinos end up in jobs that don't match their skills, leading to widespread 
                underemployment and unfulfilled potential.
              </p>
              <div className="bg-yellow-400/20 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-justify font-bold leading-relaxed">
                  TaraTrabaho was built to address these problems. Our mission is to provide an AI-powered 
                  assistant that guides job seekers step by step in their career journey. Unlike traditional 
                  platforms, TaraTrabaho focuses on making the process simple, secure, and effective for 
                  every Filipino.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Our Values Section */}
      <div className="bg-[#272343] py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Our Values
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
            The principles that guide everything we do at TaraTrabaho
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition transform hover:scale-105"
              >
                <div className="flex justify-center mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 text-center">
                  {value.title}
                </h3>
                <p className="text-gray-300 text-sm text-center">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission & Vision Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg p-8 shadow-xl">
            <h3 className="text-2xl md:text-3xl font-bold text-[#272343] mb-4">
              Our Mission
            </h3>
            <p className="text-[#272343] font-semibold leading-relaxed">
              To revolutionize job searching in the Philippines by providing accessible, AI-powered 
              tools that help every Filipino build professional resumes, find matching opportunities, 
              and secure meaningful employment with confidence.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-[#272343] to-gray-800 rounded-lg p-8 shadow-xl">
            <h3 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-4">
              Our Vision
            </h3>
            <p className="text-white font-semibold leading-relaxed">
              A Philippines where every job seeker, regardless of their background or digital literacy, 
              has equal access to quality employment opportunities that match their skills and help them 
              build fulfilling careers.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#272343] mb-4">
            Ready to Start Your Job Search Journey?
          </h2>
          <p className="text-[#272343] mb-6 font-semibold">
            Join thousands of Filipinos finding better opportunities with TaraTrabaho
          </p>
          <a 
            href="/signup" 
            className="inline-block px-8 py-3 rounded-lg bg-[#272343] text-white hover:bg-gray-800 transition transform hover:scale-105 font-bold shadow-xl"
          >
            Get Started Today
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

export default AboutPage;