import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

// Mock data for features
const features = [
  {
    icon: (
      <svg className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
      </svg>
    ),
    title: 'Drag & Drop Interface',
    description: 'Effortlessly build forms with a simple drag-and-drop experience. No coding required!',
  },
  {
    icon: (
      <svg className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
      </svg>
    ),
    title: 'Customizable Fields',
    description: 'Access a wide range of field types and customize them to fit your specific needs.',
  },
  {
    icon: (
      <svg className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.007 12.007 0 002.928 12c0 3.072 1.258 5.864 3.243 7.938A12.005 12.005 0 0012 22.928c3.072 0 5.864-1.258 7.938-3.243l.001-.001c1.985-2.074 3.243-4.866 3.243-7.938 0-1.95-.316-3.834-.903-5.529z"></path>
      </svg>
    ),
    title: 'Secure & Reliable',
    description: 'Rest assured, your data is safe with our robust security measures and reliable infrastructure.',
  },
  {
    icon: (
      <svg className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m2 0H7m4 6H9m4 0h-2m4-6h-2m-4-6V9m3-2V4m3 2v-2m-2-2v4m-2 4h-2m-2 4h2m2-2h-2m-2-2h-2"></path>
      </svg>
    ),
    title: 'Analytics & Reporting',
    description: 'Gain insights into your form submissions with detailed analytics and comprehensive reports.',
  },
  {
    icon: (
      <svg className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1L21 6l-3 3m-4 5a7 7 0 100 14h14a7 7 0 100-14h-14z"></path>
      </svg>
    ),
    title: 'Integrations',
    description: 'Connect with your favorite tools and services for seamless workflows.',
  },
  {
    icon: (
      <svg className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
      </svg>
    ),
    title: 'Export Data',
    description: 'Easily export your form submission data in various formats for offline analysis.',
  },
];

// Mock data for testimonials
const testimonials = [
  {
    quote: "QuickForm has revolutionized how we collect feedback. The drag-and-drop interface is incredibly intuitive, and the forms look fantastic on any device!",
    author: "Jane Doe",
    company: "Tech Innovations Inc.",
    logo: "https://placehold.co/100x40/E5E5E5/374151?text=CompanyA" // Placeholder logo
  },
  {
    quote: "The analytics provided by QuickForm helped us understand our customers better. It's an essential tool for any growing business.",
    author: "John Smith",
    company: "Global Solutions Co.",
    logo: "https://placehold.co/100x40/E5E5E5/374151?text=CompanyB" // Placeholder logo
  },
  {
    quote: "Setting up complex surveys used to be a nightmare. QuickForm made it a breeze with its powerful customization options.",
    author: "Alice Johnson",
    company: "Creative Agency LLC",
    logo: "https://placehold.co/100x40/E5E5E5/374151?text=CompanyC" // Placeholder logo
  }
];

// Main App component
function GuestPage() {
  const [activeTab, setActiveTab] = useState('contact'); // For demo showcase tabs
  const [currentTestimonial, setCurrentTestimonial] = useState(0); // For carousel
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Auto-play testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle early access form submission
  const handleEarlyAccessSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionSuccess(false);
    // Simulate API call
    setTimeout(() => {
      console.log('Early access request submitted for:', email);
      setIsSubmitting(false);
      setSubmissionSuccess(true);
      setEmail('');
      // Hide success message after a few seconds
      setTimeout(() => setSubmissionSuccess(false), 3000);
    }, 1500);
  };

  // Utility to observe sections for scroll-triggered animations
  const Section = ({ children, className, id }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 }); // Trigger when 30% in view

    return (
      <motion.section
        id={id}
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`py-16 md:py-24 ${className}`}
      >
        {children}
      </motion.section>
    );
  };

  return (
    <div className="font-sans text-gray-800 bg-white leading-normal tracking-tight">
      <style>
        {`
          @import url('https://rsms.me/inter/inter.css');
          html { font-family: 'Inter', sans-serif; }
          @supports (font-variation-settings: normal) {
            html { font-family: 'Inter var', sans-serif; }
          }
          /* Custom pulse animation for CTA button */
          @keyframes pulse-once {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(100, 116, 139, 0.7); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(100, 116, 139, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(100, 116, 139, 0); }
          }
          .animate-pulse-once {
            animation: pulse-once 1.5s ease-out forwards;
          }

          /* Animated gradient background for Hero */
          @keyframes gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animated-gradient-bg {
            background: linear-gradient(270deg, #4F46E5, #0EA5E9, #10B981);
            background-size: 400% 400%;
            animation: gradient-shift 15s ease infinite;
          }
        `}
      </style>

      {/* Header (Optional, but good for navigation) */}
      <header className="fixed w-full z-30 bg-white bg-opacity-90 backdrop-blur-sm shadow-sm py-4">
        <nav className="container mx-auto px-6 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-gray-900"
          >
            QuickForm
          </motion.div>
          <ul className="flex space-x-8">
            {['Features', 'Demo', 'Testimonials', 'Contact'].map((item, index) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              >
                <a
                  href={`#${item.toLowerCase()}`}
                  className="relative text-gray-600 hover:text-indigo-600 font-medium transition-colors duration-300 group"
                >
                  {item}
                  <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full group-hover:left-0"></span>
                </a>
              </motion.li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <motion.section
        id="hero"
        className="relative h-screen flex items-center justify-center text-white overflow-hidden animated-gradient-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center justify-between z-10 pt-20">
          {/* Left Content */}
          <div className="lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0">
            <motion.h1
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl md:text-6xl font-extrabold leading-tight mb-4"
            >
              Build Forms That Convert, Fast.
            </motion.h1>
            <motion.p
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-xl md:text-2xl font-light mb-8 text-indigo-100"
            >
              QuickForm's intuitive drag-and-drop builder empowers you to create stunning forms in minutes.
            </motion.p>
            <motion.button
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
              whileTap={{ scale: 0.95 }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform"
              onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
            >
              Get Started Free
            </motion.button>
          </div>

          {/* Right Illustration */}
          <div className="lg:w-1/2 flex justify-center items-center relative p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
              className="relative w-full max-w-lg aspect-video bg-white bg-opacity-20 backdrop-blur-md rounded-3xl shadow-2xl flex items-center justify-center border border-white border-opacity-30 p-6"
              style={{ minHeight: '300px' }} // Ensure a minimum height for visibility
            >
              {/* Form container */}
              <div className="relative w-full h-full bg-white rounded-xl shadow-inner p-4 flex flex-col overflow-hidden">
                <h3 className="text-gray-800 text-xl font-semibold mb-4 text-center">Your New Form</h3>
                {/* Form elements - animating their positions */}
                <motion.div
                  className="absolute p-2 bg-blue-100 rounded-lg shadow-md border border-blue-200"
                  initial={{ x: -100, y: -100, opacity: 0 }}
                  animate={{ x: '10%', y: '10%', opacity: 1, rotate: 2 }}
                  transition={{ delay: 1.2, duration: 0.7, type: "spring", stiffness: 120 }}
                >
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input type="text" placeholder="John Doe" className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white focus:ring-indigo-500 focus:border-indigo-500" readOnly />
                </motion.div>
                <motion.div
                  className="absolute p-2 bg-green-100 rounded-lg shadow-md border border-green-200"
                  initial={{ x: 100, y: -100, opacity: 0 }}
                  animate={{ x: '50%', y: '40%', opacity: 1, rotate: -3 }}
                  transition={{ delay: 1.4, duration: 0.7, type: "spring", stiffness: 120 }}
                >
                  <label className="text-sm font-medium text-gray-700 block">Message</label>
                  <textarea placeholder="Your message..." className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white focus:ring-emerald-500 focus:border-emerald-500" readOnly rows="2"></textarea>
                </motion.div>
                <motion.div
                  className="absolute p-2 bg-purple-100 rounded-lg shadow-md border border-purple-200"
                  initial={{ x: -100, y: 100, opacity: 0 }}
                  animate={{ x: '20%', y: '70%', opacity: 1, rotate: 1 }}
                  transition={{ delay: 1.6, duration: 0.7, type: "spring", stiffness: 120 }}
                >
                  <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">Submit</button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <Section id="features" className="bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6">Unleash Your Form Potential</h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            QuickForm provides all the tools you need to create powerful, engaging, and highly functional forms.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform border border-gray-200 hover:border-indigo-400 overflow-hidden"
                whileHover={{ scale: 1.03, boxShadow: "0 15px 30px rgba(0,0,0,0.1)" }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <motion.div
                  className="mb-4 inline-block p-3 rounded-full bg-indigo-100 group-hover:bg-indigo-600 transition-colors duration-300"
                  whileHover={{ y: -5, transition: { type: "spring", stiffness: 500, damping: 10 } }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 transition-all duration-300 opacity-100 group-hover:text-gray-700">
                  {feature.description}
                </p>
                {/* Optional: More details on hover */}
                {/* <motion.p
                  className="mt-4 text-sm text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={{ height: 0, opacity: 0 }}
                  whileHover={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  Learn more about {feature.title.toLowerCase()}.
                </motion.p> */}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Demo Showcase */}
      <Section id="demo" className="bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6">See QuickForm in Action</h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Explore different form types and experience the simplicity of our powerful builder.
          </p>

          <div className="flex justify-center mb-8">
            {['Contact', 'Survey', 'Order'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`py-2 px-6 rounded-full text-lg font-medium transition-all duration-300 mx-2
                  ${activeTab === tab.toLowerCase() ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                {tab} Form
              </button>
            ))}
          </div>

          <motion.div
            className="relative bg-gradient-to-br from-indigo-50 to-sky-50 p-8 rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Mockup of form builder interface */}
            <div className="relative w-full bg-white rounded-xl shadow-inner border border-gray-200 overflow-hidden" style={{ minHeight: '400px' }}>
              {/* Toolbar/Field Palette */}
              <div className="absolute left-0 top-0 h-full w-24 bg-gray-100 border-r border-gray-200 p-3 flex flex-col items-center space-y-4 pt-6">
                <div className="p-2 bg-indigo-200 rounded-md text-indigo-800 text-sm font-medium w-full text-center">Text</div>
                <div className="p-2 bg-sky-200 rounded-md text-sky-800 text-sm font-medium w-full text-center">Email</div>
                <div className="p-2 bg-emerald-200 rounded-md text-emerald-800 text-sm font-medium w-full text-center">Select</div>
                <div className="p-2 bg-red-200 rounded-md text-red-800 text-sm font-medium w-full text-center">Button</div>
              </div>

              {/* Form Preview Area */}
              <motion.div
                className="ml-24 p-8 relative flex items-start justify-center h-full"
                // Subtle parallax effect by moving content slightly based on scroll
                // This is a simplified approach, a true parallax would involve useScroll
                style={{ y: (isInView) => isInView ? 0 : -20 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              >
                <AnimatePresence mode="wait">
                  {activeTab === 'contact' && (
                    <motion.div
                      key="contact-form"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-md bg-white p-6 rounded-lg shadow-md border border-gray-200"
                    >
                      <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">Contact Us</h4>
                      <div className="mb-4">
                        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                        <input type="text" id="name" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" placeholder="Your Name" readOnly />
                      </div>
                      <div className="mb-6">
                        <label htmlFor="message" className="block text-gray-700 text-sm font-bold mb-2">Message</label>
                        <textarea id="message" rows="4" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" placeholder="Your Message" readOnly></textarea>
                      </div>
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md w-full transition-colors duration-200" disabled>Send Message</button>
                    </motion.div>
                  )}

                  {activeTab === 'survey' && (
                    <motion.div
                      key="survey-form"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-md bg-white p-6 rounded-lg shadow-md border border-gray-200"
                    >
                      <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">Customer Survey</h4>
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">How would you rate our service?</label>
                        <div className="flex items-center space-x-4">
                          {[1,2,3,4,5].map(star => (
                            <input key={star} type="radio" name="rating" className="form-radio text-indigo-600 h-5 w-5" disabled />
                          ))}
                        </div>
                      </div>
                      <div className="mb-6">
                        <label htmlFor="feedback" className="block text-gray-700 text-sm font-bold mb-2">Any additional feedback?</label>
                        <textarea id="feedback" rows="3" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" placeholder="Your feedback" readOnly></textarea>
                      </div>
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md w-full transition-colors duration-200" disabled>Submit Survey</button>
                    </motion.div>
                  )}

                  {activeTab === 'order' && (
                    <motion.div
                      key="order-form"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-md bg-white p-6 rounded-lg shadow-md border border-gray-200"
                    >
                      <h4 className="text-2xl font-bold text-gray-900 mb-6 text-center">Place Your Order</h4>
                      <div className="mb-4">
                        <label htmlFor="product" className="block text-gray-700 text-sm font-bold mb-2">Product</label>
                        <select id="product" className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" disabled>
                          <option>Select Product</option>
                          <option>Product A</option>
                          <option>Product B</option>
                        </select>
                      </div>
                      <div className="mb-6">
                        <label htmlFor="quantity" className="block text-gray-700 text-sm font-bold mb-2">Quantity</label>
                        <input type="number" id="quantity" min="1" defaultValue="1" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" readOnly />
                      </div>
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md w-full transition-colors duration-200" disabled>Place Order</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Testimonials Section */}
      <Section id="testimonials" className="bg-sky-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-6">What Our Users Say</h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Don't just take our word for it – hear from real users who love QuickForm!
          </p>

          <motion.div
            className="relative max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-gray-100"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center"
              >
                <p className="text-xl italic text-gray-700 mb-6">"{testimonials[currentTestimonial].quote}"</p>
                <div className="font-semibold text-indigo-600 text-lg">{testimonials[currentTestimonial].author}</div>
                <div className="text-gray-500 text-sm mb-4">{testimonials[currentTestimonial].company}</div>
                <motion.img
                  src={testimonials[currentTestimonial].logo}
                  alt={`${testimonials[currentTestimonial].company} logo`}
                  className="mx-auto h-10 object-contain rounded-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  whileHover={{ scale: 1.05, filter: "grayscale(0%)" }}
                  style={{ filter: "grayscale(100%)" }} // Apply grayscale by default
                />
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-center mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full mx-1 transition-colors duration-300 ${
                    index === currentTestimonial ? 'bg-indigo-600' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                ></button>
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section id="contact" className="relative bg-gradient-to-r from-indigo-600 to-sky-500 text-white overflow-hidden">
        <div className="container mx-auto px-6 text-center z-10 relative">
          <h2 className="text-4xl font-extrabold mb-6">Ready to Build Amazing Forms?</h2>
          <p className="text-xl font-light mb-12 max-w-3xl mx-auto text-indigo-100">
            Join our early access program and be among the first to experience the future of form building.
          </p>

          <motion.form
            onSubmit={handleEarlyAccessSubmit}
            className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-white border-opacity-30"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="mb-6">
              <label htmlFor="email" className="block text-gray-700 text-lg font-bold mb-3 text-left">Your Email Address</label>
              <motion.input
                type="email"
                id="email"
                className="shadow-inner appearance-none border rounded-xl w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-3 focus:ring-indigo-300 focus:border-indigo-400 transition-all duration-300"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                whileFocus={{ scale: 1.01, boxShadow: "0 0 0 4px rgba(79, 70, 229, 0.2)" }}
              />
            </div>
            <motion.button
              type="submit"
              className={`w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform
                ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'animate-pulse-once'}`}
              whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
              whileTap={{ scale: 0.95 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </div>
              ) : 'Join Early Access'}
            </motion.button>
            <AnimatePresence>
              {submissionSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-4 p-3 bg-emerald-100 text-emerald-800 rounded-lg text-sm flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Request submitted successfully!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        </div>
      </Section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-10">
        <div className="container mx-auto px-6 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} QuickForm. All rights reserved.</p>
          <p className="mt-2">Designed with ❤️ using React & Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

export default GuestPage;
