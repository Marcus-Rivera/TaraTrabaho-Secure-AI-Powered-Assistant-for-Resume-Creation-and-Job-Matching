// NotFound404.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaArrowLeft, FaBriefcase, FaRobot, FaUser, FaQuestionCircle } from 'react-icons/fa';
import bg from './assets/BG.png'; // Use your background

const NotFound404 = () => {
  const navigate = useNavigate();

  const popularPages = [
    { label: 'Job Listings', path: '/taratrabaho/jobs', icon: <FaBriefcase /> },
    { label: 'Career Bot', path: '/taratrabaho/career-bot', icon: <FaRobot /> },
    { label: 'Profile', path: '/taratrabaho/profile', icon: <FaUser /> },
    { label: 'FAQs', path: '/taratrabaho/faqs', icon: <FaQuestionCircle /> }
  ];

  const removeToken = () => {
    sessionStorage.removeItem('token');
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Main Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-3xl animate-fadeIn">
        
        {/* 404 Number with Animation */}
        <div className="text-center mb-6">
          <h1 className="text-8xl md:text-9xl font-bold text-[#272343]">
            4
            <span className="text-yellow-400 drop-shadow-[3px_3px_0px_black]">0</span>
            4
          </h1>
        </div>



        {/* Main Message */}
        <h2 className="text-3xl md:text-4xl font-bold text-center text-[#272343] mb-4">
          Page Not Found
        </h2>
        
        <p className="text-center text-[#272343] font-semibold text-lg mb-6 leading-relaxed">
          Oops! The page you're looking for seems to have wandered off. 
          It might have been moved, deleted, or never existed in the first place.
        </p>

        {/* Decorative Divider */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-1 bg-yellow-400 rounded-full"></div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => {
              removeToken();
              navigate('/');
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-yellow-400 text-[#272343] hover:bg-yellow-500 transition transform hover:scale-105 font-bold shadow-lg"
          >
            <FaHome size={20} />
            Go to Homepage
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#272343] text-white hover:bg-gray-800 transition transform hover:scale-105 font-bold shadow-lg"
          >
            <FaArrowLeft size={20} />
            Go Back
          </button>
        </div>

        {/* Popular Pages */}
        <div className="border-t border-gray-200 pt-8">
          <p className="text-center text-[#272343] font-bold mb-4">
            Try visiting these pages instead:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularPages.map((page, index) => (
              <button
                key={index}
                onClick={() => navigate(page.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-yellow-400/20 hover:border-yellow-400 border-2 border-transparent transition transform hover:scale-105"
              >
                <div className="text-yellow-400 text-2xl">
                  {page.icon}
                </div>
                <span className="text-sm font-semibold text-[#272343]">
                  {page.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Code Footer */}
        <p className="text-center text-gray-400 text-xs mt-8">
          Error Code: 404 | Page Not Found
        </p>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        
        .animate-bounce {
          animation: bounce 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default NotFound404;