'use client'
import { useState } from 'react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="w-64 bg-gradient-to-b from-white to-gray-50 rounded-l-2xl shadow-lg fixed left-0 top-4 h-[calc(100vh-2rem)] font-sans">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your communication preferences</p>
        </div>

        {/* Dropdown Button */}
        <button
          className="w-full py-3 px-4 text-left text-gray-800 font-semibold bg-white rounded-xl hover:bg-gray-100 transition-all duration-200 flex justify-between items-center shadow-sm border border-gray-200"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-controls="notification-dropdown"
        >
          <span>Notification & Email</span>
          <svg
            className={`w-5 h-5 transform transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        {/* Dropdown Menu */}
        <div 
          id="notification-dropdown"
          className={`mt-3 space-y-2 transition-all duration-300 ease-in-out ${isDropdownOpen ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}
        >
          <button
            className={`w-full py-2.5 px-4 text-left font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
              activeTab === 'email' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('email')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l9 6 9-6m0 12H3V8h18v12z"></path>
            </svg>
            <span>Email</span>
          </button>
          <button
            className={`w-full py-2.5 px-4 text-left font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
              activeTab === 'notification' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('notification')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <span>Notification</span>
          </button>
          <button
            className={`w-full py-2.5 px-4 text-left font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
              activeTab === 'digest' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('digest')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <span>Digest Email</span>
          </button>
        </div>
      </div>
    </div>
  );
};