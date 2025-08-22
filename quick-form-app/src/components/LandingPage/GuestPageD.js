import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Tab } from "@headlessui/react";
import {
  ArrowUpDownIcon,
  CogIcon,
  TextCursorInputIcon,
  Globe,
  LockIcon,
  PlusSquare,
  ChartBarIcon,
  Mail,
  CheckCircleIcon,
  BoltIcon,
  Code,
  ArrowRightIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PlayIcon,
  TwitterIcon,
  Facebook,
  FacebookIcon,
  TvIcon,
  Linkedin,
  LinkedinIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

const QuickFormLanding = () => {
  useEffect(() => {
    sessionStorage.setItem("userId", "005gK0000068QxxQAE");
    sessionStorage.setItem(
      "instanceUrl",
      "https://orgfarm-407f70be85-dev-ed.develop.my.salesforce.com"
    );
  }, []);
  return (
    <div className="font-sans text-gray-800 overflow-x-hidden">
      {/* Navigation */}
      <NavBar />

      {/* Hero Section */}
      <HeroSection />

      {/* Features */}
      <FeaturesSection />

      {/* Demo Showcase */}
      <DemoShowcase />

      {/* Testimonials */}
      <TestimonialCarousel />

      {/* CTA */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

const NavBar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              {/* <TextCursorInputIcon /> */}
              <img
                src="/quickform-logo.png"
                alt="quickform logo"
                className="w-8 h-8 text-white"
              />
            </div>
            <span className="ml-2 text-xl font-bold">
              <span className="text-blue-500">Quick </span>Form
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {["Features", "Demo", "Testimonials", "Pricing"].map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                whileHover={{
                  color: "#4F46E5",
                  scale: 1.05,
                }}
                className="relative px-3 py-2 text-gray-600 font-medium"
              >
                {item}
                <motion.span
                  className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600"
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.3 }}
                />
              </motion.a>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden mt-4"
            >
              <div className="flex flex-col space-y-2">
                {["Features", "Demo", "Testimonials", "Pricing"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="px-3 py-2 text-gray-600 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

const HeroSection = () => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <section
      ref={ref}
      className="relative h-screen flex items-center overflow-hidden bg-gradient-to-br from-indigo-50 to-sky-50"
    >
      {/* Animated background elements */}
      {/* <motion.div 
        animate={{
          x: [0, 10, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 opacity-10"
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <pattern id="grid-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4F46E5" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </motion.div> */}

      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="md:w-1/2 mb-12 md:mb-0"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Build Beautiful Forms <br />
            <span className="text-indigo-600">Without Code</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-8">
            Drag, drop, and deploy forms that connect directly to your
            Salesforce CRM.
          </p>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/home">
              <motion.div
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium transition-all duration-300 flex items-center hover:text-white "
              >
                Start Building Free
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </motion.div>
            </Link>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-medium transition-all duration-300 flex items-center"
            >
              <PlayIcon className="w-5 h-5 mr-2" />
              Watch Demo
            </motion.button>
          </div>

          <div className="mt-8 flex items-center">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={`https://randomuser.me/api/portraits/${
                    i % 2 === 0 ? "women" : "men"
                  }/${i + 20}.jpg`}
                  alt="User"
                  className="w-10 h-10 rounded-full border-2 border-white"
                />
              ))}
            </div>
            <div className="ml-4 text-sm text-gray-500">
              <p>Trusted by 5,000+ businesses</p>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-4 h-4 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-1">4.9/5</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="md:w-1/2 relative"
        >
          <div className="relative w-full max-w-lg mx-auto">
            {/* Form builder illustration with animated elements */}
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -top-10 -left-10 bg-indigo-100 p-4 rounded-xl shadow-lg"
            >
              <div className="flex items-center">
                <PlusSquare className="w-6 h-6 text-indigo-600 mr-2" />
                <span className="text-sm font-medium">Text Field</span>
              </div>
            </motion.div>

            <motion.div
              animate={{
                y: [0, 10, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="absolute -bottom-10 -right-10 bg-emerald-100 p-4 rounded-xl shadow-lg"
            >
              <div className="flex items-center">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 mr-2" />
                <span className="text-sm font-medium">Success Page</span>
              </div>
            </motion.div>

            {/* Main form mockup */}
            <div className="relative bg-white p-6 rounded-xl shadow-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">New Contact Form</h3>
                <div className="flex space-x-2">
                  <button className="p-1 rounded hover:bg-gray-100">
                    <CogIcon className="w-5 h-5 text-gray-500" />
                  </button>
                  <button className="p-1 rounded hover:bg-gray-100">
                    <ArrowUpDownIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="John Doe"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="3"
                    placeholder="Your message..."
                  ></textarea>
                </div>

                <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
                  Submit
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const features = [
    {
      icon: <PlusSquare className="w-8 h-8 text-indigo-600" />,
      title: "Drag & Drop Builder",
      description: "Intuitive interface to create forms in minutes",
      details:
        "Simply drag fields onto your canvas and customize them with our easy-to-use property panel.",
    },
    {
      icon: <BoltIcon className="w-8 h-8 text-indigo-600" />,
      title: "Salesforce Integration",
      description: "Seamless connection with your CRM",
      details:
        "Automatically sync form submissions to Salesforce objects with our native integration.",
    },
    {
      icon: <Globe className="w-8 h-8 text-indigo-600" />,
      title: "Multi-Language Support",
      description: "Reach a global audience",
      details:
        "Create forms in multiple languages with our built-in translation tools.",
    },
    {
      icon: <ChartBarIcon className="w-8 h-8 text-indigo-600" />,
      title: "Real-Time Analytics",
      description: "Track submissions as they happen",
      details:
        "Get insights into form performance with our comprehensive analytics dashboard.",
    },
    {
      icon: <Mail className="w-8 h-8 text-indigo-600" />,
      title: "Instant Notifications",
      description: "Email & SMS alerts",
      details:
        "Configure automatic notifications for you and your form respondents.",
    },
    {
      icon: <LockIcon className="w-8 h-8 text-indigo-600" />,
      title: "Enterprise Security",
      description: "GDPR & SOC2 compliant",
      details:
        "Rest easy knowing your data is protected with enterprise-grade security features.",
    },
  ];

  return (
    <section id="features" ref={ref} className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powerful Features
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Everything you need to create, manage, and analyze forms at scale
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{
                y: -5,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
              }}
              className="bg-white rounded-xl p-6 border border-gray-100 hover:border-indigo-200 transition-all duration-300 overflow-hidden relative"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600 mb-4">{feature.description}</p>

              <motion.div
                initial={{ height: 0, opacity: 0 }}
                whileHover={{
                  height: "auto",
                  opacity: 1,
                  transition: { duration: 0.3 },
                }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <p className="text-gray-500">{feature.details}</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="absolute top-6 right-6 text-indigo-100 text-6xl -z-10"
              >
                {feature.icon}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const DemoShowcase = () => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const [categories] = useState({
    "Contact Forms": [
      {
        id: 1,
        title: "Lead Capture",
        description: "Collect leads with customizable fields",
      },
      {
        id: 2,
        title: "Event Registration",
        description: "Manage attendees with ease",
      },
    ],
    Surveys: [
      {
        id: 1,
        title: "Customer Feedback",
        description: "Gather valuable insights",
      },
      {
        id: 2,
        title: "Employee Satisfaction",
        description: "Measure team engagement",
      },
    ],
    Applications: [
      {
        id: 1,
        title: "Job Applications",
        description: "Streamline your hiring process",
      },
      {
        id: 2,
        title: "Membership Signup",
        description: "Onboard new members efficiently",
      },
    ],
  });

  return (
    <section id="demo" ref={ref} className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See It In Action
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our form builder with these ready-to-use templates
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-xl bg-indigo-900/20 p-1 max-w-md mx-auto mb-12">
              {Object.keys(categories).map((category) => (
                <Tab
                  key={category}
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-indigo-700
                    ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2
                    ${
                      selected
                        ? "bg-white shadow"
                        : "text-indigo-100 hover:bg-white/[0.12] hover:text-white"
                    }`
                  }
                >
                  {category}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-2">
              {Object.values(categories).map((forms, idx) => (
                <Tab.Panel
                  key={idx}
                  className={`rounded-xl bg-white p-6 shadow-lg border border-gray-200`}
                >
                  <div className="flex flex-col md:flex-row items-center">
                    <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
                      <h3 className="text-xl font-bold mb-4">Form Preview</h3>
                      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                        {forms.map((form) => (
                          <div key={form.id} className="mb-6 last:mb-0">
                            <h4 className="font-medium text-lg mb-2">
                              {form.title}
                            </h4>
                            <p className="text-gray-500 mb-4">
                              {form.description}
                            </p>
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Sample field"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                <option>Sample dropdown</option>
                              </select>
                              <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
                                Submit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="md:w-1/2">
                      <h3 className="text-xl font-bold mb-4">Form Builder</h3>
                      <div className="bg-gray-800 p-6 rounded-lg text-white">
                        <div className="flex mb-4">
                          <div className="w-1/4 pr-2">
                            <div className="bg-gray-700 p-2 rounded text-sm mb-2 flex items-center">
                              <PlusSquare className="w-4 h-4 mr-2" />
                              Text Field
                            </div>
                            <div className="bg-gray-700 p-2 rounded text-sm mb-2 flex items-center">
                              <Mail className="w-4 h-4 mr-2" />
                              Email
                            </div>
                            <div className="bg-gray-700 p-2 rounded text-sm mb-2 flex items-center">
                              <ChevronRightIcon className="w-4 h-4 mr-2" />
                              Dropdown
                            </div>
                          </div>
                          <div className="w-3/4 pl-2">
                            <div className="bg-gray-700 p-4 rounded-lg">
                              {forms.map((form) => (
                                <motion.div
                                  key={form.id}
                                  whileHover={{ x: 5 }}
                                  className="bg-gray-600 p-3 rounded mb-3 last:mb-0"
                                >
                                  <div className="text-sm font-medium">
                                    {form.title}
                                  </div>
                                  <div className="text-xs text-gray-300 mt-1">
                                    {form.description}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                          <button className="text-xs text-gray-400 hover:text-white">
                            <Code className="w-4 h-4 inline mr-1" />
                            Embed Code
                          </button>
                          <button className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1 rounded text-sm">
                            Publish
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </motion.div>
      </div>
    </section>
  );
};

const TestimonialCarousel = () => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const testimonials = [
    {
      id: 1,
      quote:
        "QuickForm has revolutionized how we collect customer data. The Salesforce integration saves us hours each week.",
      name: "Sarah Johnson",
      title: "Marketing Director",
      company: "Acme Inc",
      logo: "acme-logo",
    },
    {
      id: 2,
      quote:
        "Our form completion rates increased by 40% after switching to QuickForm. The user experience is unmatched.",
      name: "Michael Chen",
      title: "Product Manager",
      company: "TechCorp",
      logo: "techcorp-logo",
    },
    {
      id: 3,
      quote:
        "As a non-technical user, I love how easy it is to create professional forms that connect to our CRM.",
      name: "David Wilson",
      title: "Sales Operations",
      company: "Global Solutions",
      logo: "global-logo",
    },
  ];

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <section
      id="testimonials"
      ref={ref}
      className="py-20 bg-indigo-600 text-white"
    >
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by Industry Leaders
          </h2>
          <p className="text-indigo-100 max-w-2xl mx-auto">
            Join thousands of businesses transforming their data collection
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonials[currentTestimonial].id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="bg-indigo-700 rounded-xl p-8 shadow-lg relative"
            >
              <div className="text-xl mb-6">
                "{testimonials[currentTestimonial].quote}"
              </div>
              <div className="flex items-center">
                <div className="bg-white text-indigo-600 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mr-4">
                  {testimonials[currentTestimonial].name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="text-indigo-200">
                    {testimonials[currentTestimonial].title},{" "}
                    {testimonials[currentTestimonial].company}
                  </div>
                </div>
              </div>

              <button
                onClick={prevTestimonial}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={nextTestimonial}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center mt-8 space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full ${
                  currentTestimonial === index ? "bg-white" : "bg-indigo-400"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          <div className="flex flex-wrap justify-center mt-12 gap-6">
            {["acme", "techcorp", "global", "innovate", "nextgen"].map(
              (company) => (
                <motion.div
                  key={company}
                  whileHover={{ scale: 1.1 }}
                  className="bg-white/10 p-4 rounded-lg backdrop-blur-sm flex items-center justify-center w-32 h-16"
                >
                  <span className="text-white font-bold text-sm">
                    {company.toUpperCase()}
                  </span>
                </motion.div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const CTASection = () => {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const [email, setEmail] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setFormSubmitted(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <section
      id="signup"
      ref={ref}
      className="py-20 bg-gradient-to-r from-indigo-500 to-sky-500"
    >
      <div className="container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Forms?
          </h2>
          <p className="text-indigo-100 mb-8 text-xl">
            Join thousands of businesses using QuickForm to streamline their
            data collection
          </p>

          {!formSubmitted ? (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-grow px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-500"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: loading
                    ? "none"
                    : "0 0 0 10px rgba(255, 255, 255, 0.2)",
                }}
                transition={{
                  boxShadow: {
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  },
                }}
                disabled={loading}
                className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <ArrowUpDownIcon className="animate-spin w-5 h-5 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Get Started Free
                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                  </>
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/20 p-8 rounded-xl backdrop-blur-sm max-w-md mx-auto"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 0.6 }}
                className="text-5xl mb-4"
              >
                🎉
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
              <p className="text-indigo-100">
                We've sent a confirmation email to {email}. Our team will be in
                touch shortly.
              </p>
            </motion.div>
          )}

          <div className="mt-8 text-indigo-100">
            <p>No credit card required • 14-day free trial</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-white text-lg font-bold mb-4">QuickForm</h4>
            <p className="mb-4">
              The easiest way to build beautiful forms that connect to your CRM.
            </p>
            <div className="flex space-x-4">
              {["Twitter", "LinkedIn", "Facebook"].map((social) => (
                <motion.a
                  key={social}
                  href="#"
                  whileHover={{ y: -3 }}
                  className="text-gray-400 hover:text-white"
                >
                  <span className="sr-only">{social}</span>
                  <div className="w-6 h-6 bg-white-700 rounded-full flex items-center justify-center">
                    {social.charAt(0) === "T" ? (
                      <TwitterIcon />
                    ) : social.charAt(0) === "F" ? (
                      <FacebookIcon />
                    ) : (
                      <Linkedin />
                    )}
                  </div>
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white text-lg font-bold mb-4">Product</h4>
            <ul className="space-y-2">
              {["Features", "Pricing", "Integrations", "Updates"].map(
                (item) => (
                  <li key={item}>
                    <motion.a
                      href="#"
                      whileHover={{ color: "#FFFFFF", x: 5 }}
                      className="block transition-colors"
                    >
                      {item}
                    </motion.a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-lg font-bold mb-4">Resources</h4>
            <ul className="space-y-2">
              {["Documentation", "Tutorials", "Blog", "Community"].map(
                (item) => (
                  <li key={item}>
                    <motion.a
                      href="#"
                      whileHover={{ color: "#FFFFFF", x: 5 }}
                      className="block transition-colors"
                    >
                      {item}
                    </motion.a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-lg font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              {["About", "Careers", "Contact", "Legal"].map((item) => (
                <li key={item}>
                  <motion.a
                    href="#"
                    whileHover={{ color: "#FFFFFF", x: 5 }}
                    className="block transition-colors"
                  >
                    {item}
                  </motion.a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p>
            © {new Date().getFullYear()} QuickForm by MVClouds Private Limited.
            All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default QuickFormLanding;
