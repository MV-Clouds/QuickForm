import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Layers, 
  Users, 
  ChevronRight, 
  ArrowRight, 
  Check, 
  Star,
  Play,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react';
import LogoQF from '../../assets/LogoQF.png'
const QuickFormLanding = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [activeDemo, setActiveDemo] = useState('contact');
  const [isVisible, setIsVisible] = useState({});
  const [formData, setFormData] = useState({ email: '', name: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const observerRef = useRef();

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({
              ...prev,
              [entry.target.id]: true
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach(el => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    {
      text: "QuickForm transformed our lead generation process. We're seeing 3x more submissions with their intuitive drag-and-drop builder.",
      author: "Sarah Chen",
      role: "Marketing Director",
      company: "TechFlow",
      rating: 5
    },
    {
      text: "The conditional logic feature is a game-changer. Our forms now adapt based on user responses, making them feel truly personalized.",
      author: "Michael Rodriguez",
      role: "Product Manager",
      company: "InnovateLabs",
      rating: 5
    },
    {
      text: "Setup took minutes, not hours. The analytics dashboard gives us insights we never had before.",
      author: "Emily Johnson",
      role: "Operations Lead",
      company: "GrowthCorp",
      rating: 5
    }
  ];

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Lightning Fast Builder",
      description: "Create professional forms in minutes with our intuitive drag-and-drop interface.",
      details: "No coding required. Just drag, drop, and customize with over 20 field types including conditional logic, file uploads, and payment integration."
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: "Smart Conditional Logic",
      description: "Show or hide fields based on user responses for a personalized experience.",
      details: "Advanced branching logic, multi-step forms, and dynamic field updates create intelligent forms that adapt to your users."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Real-time Analytics",
      description: "Track form performance and user behavior with detailed insights.",
      details: "Conversion tracking, A/B testing, heatmaps, and detailed reporting help optimize your forms for maximum results."
    }
  ];

  const demoForms = {
    contact: {
      title: "Contact Form",
      fields: ["Name", "Email", "Company", "Message"]
    },
    survey: {
      title: "Survey Form",
      fields: ["Rating", "Multiple Choice", "Text Area", "Conditional Logic"]
    },
    registration: {
      title: "Event Registration",
      fields: ["Personal Info", "Ticket Type", "Payment", "Confirmation"]
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Animated Background */}
      {/* <div className="fixed inset-0 -z-1000">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 animate-pulse "></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200 to-blue-50 rounded-full mix-blend-multiply filter blur-xl  opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-200 to-emerald-200 rounded-full mix-blend-multiply filter  blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-gradient-to-r from-emerald-200 to-blue-200 rounded-full mix-blend-multiply  filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div> */}

      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-300 to-blue-100 rounded-lg flex items-center justify-center">
              <img src={LogoQF} className="w-8 h-8" />
            </div>
            <span className="text-xl font-bold"><span className='text-blue-500'>Quick </span><span className='text-black-500'>Form</span></span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
              Features
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full group-hover:left-0"></span>
            </a>
            <a href="#demo" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
              Demo
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full group-hover:left-0"></span>
            </a>
            <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors relative group">
              Testimonials
              <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full group-hover:left-0"></span>
            </a>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 hover:scale-105 transform transition-all shadow-lg hover:shadow-xl">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center px-6 -mt-16 pt-16">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
                  Build Forms That{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-blue-100 bg-clip-text text-transparent">
                    Convert
                  </span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Create professional, responsive forms in minutes with our drag-and-drop builder. 
                  No coding required, unlimited customization.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 hover:scale-105 transform transition-all shadow-lg hover:shadow-xl flex items-center justify-center group">
                  Start Building Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center group">
                  <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </button>
              </div>

              <div className="flex items-center space-x-8 text-sm text-gray-500">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-emerald-500 mr-2" />
                  Free forever plan
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-emerald-500 mr-2" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-emerald-500 mr-2" />
                  Setup in 2 minutes
                </div>
              </div>
            </div>

            {/* Animated Form Builder Illustration */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 transform hover:scale-105 transition-all duration-500">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Form Builder</h3>
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse animation-delay-200"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse animation-delay-400"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors cursor-pointer">
                      <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">T</span>
                      </div>
                      <span className="text-gray-700">Text Input</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-sky-50 rounded-lg border-2 border-dashed border-sky-200 hover:border-sky-400 transition-colors cursor-pointer">
                      <div className="w-6 h-6 bg-sky-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">@</span>
                      </div>
                      <span className="text-gray-700">Email Field</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-lg border-2 border-dashed border-emerald-200 hover:border-emerald-400 transition-colors cursor-pointer">
                      <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                      <span className="text-gray-700">Submit Button</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-r from-blue-500 to-sky-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-100 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Check className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div 
            className="text-center mb-16"
            id="features-header"
            data-animate
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Everything You Need to Build Better Forms
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From simple contact forms to complex multi-step surveys, QuickForm has the tools you need.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl hover:scale-105 transform transition-all duration-300 cursor-pointer"
                id={`feature-${index}`}
                data-animate
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-sky-500 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-500">{feature.details}</p>
                  </div>
                </div>
                
                <div className="flex items-center text-blue-600 font-medium mt-4 group-hover:translate-x-2 transition-transform">
                  Learn more
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              See QuickForm in Action
            </h2>
            <p className="text-xl text-gray-600">
              Switch between different form types to see the builder in action
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                {Object.entries(demoForms).map(([key, form]) => (
                  <button
                    key={key}
                    onClick={() => setActiveDemo(key)}
                    className={`px-6 py-4 font-medium transition-all ${
                      activeDemo === key
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {form.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {demoForms[activeDemo].title} Builder
                  </h3>
                  <div className="space-y-3">
                    {demoForms[activeDemo].fields.map((field, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <span className="text-gray-700">{field}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Live Preview</h3>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="space-y-4">
                      {demoForms[activeDemo].fields.map((field, index) => (
                        <div key={index} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {field}
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder={`Enter ${field.toLowerCase()}...`}
                          />
                        </div>
                      ))}
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                        Submit Form
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Loved by Teams Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of companies using QuickForm to capture more leads
            </p>
          </div>

          <div className="relative">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
              <div className="flex justify-center mb-6">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <p className="text-xl text-gray-700 mb-8 italic">
                "{testimonials[currentTestimonial].text}"
              </p>
              
              <div>
                <p className="font-semibold text-gray-800">
                  {testimonials[currentTestimonial].author}
                </p>
                <p className="text-gray-600">
                  {testimonials[currentTestimonial].role} at {testimonials[currentTestimonial].company}
                </p>
              </div>
            </div>

            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Company Logos */}
          <div className="mt-16">
            <p className="text-center text-gray-500 mb-8">Trusted by innovative companies</p>
            <div className="flex justify-center items-center space-x-12 opacity-60">
              <div className="w-24 h-12 bg-gray-200 rounded flex items-center justify-center hover:opacity-100 transition-opacity">
                <Monitor className="w-8 h-8 text-gray-600" />
              </div>
              <div className="w-24 h-12 bg-gray-200 rounded flex items-center justify-center hover:opacity-100 transition-opacity">
                <Smartphone className="w-8 h-8 text-gray-600" />
              </div>
              <div className="w-24 h-12 bg-gray-200 rounded flex items-center justify-center hover:opacity-100 transition-opacity">
                <Globe className="w-8 h-8 text-gray-600" />
              </div>
              <div className="w-24 h-12 bg-gray-200 rounded flex items-center justify-center hover:opacity-100 transition-opacity">
                <Layers className="w-8 h-8 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-sky-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Build Your First Form?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join over 50,000 teams who trust QuickForm to capture and convert their leads.
          </p>

          {/* Fixed form and button syntax */}
          <form
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
            onSubmit={handleSubmit}
          >
            <input
              type="email"
              required
              placeholder="Your email"
              className="px-6 py-3 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-lg"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="text"
              required
              placeholder="Your name"
              className="px-6 py-3 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all text-lg"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
            <button
              type="submit"
              className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 hover:scale-105 transform transition-all shadow-lg hover:shadow-xl"
            >
              {isSubmitted ? 'Thanks!' : 'Get Started'}
            </button>
          </form>

          <p className="text-blue-100">
            Start your free trial • No credit card required • Cancel anytime
          </p>
        </div>

        {/* Pulsing animation */}
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/10 rounded-full animate-ping "></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/10 rounded-full animate-ping animation-delay-1000"></div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-sky-500 rounded-lg flex items-center justify-center">
                    <img src={LogoQF} alt="" />
                </div>
                <span className="text-xl font-bold">QuickForm</span>
              </div>
              <p className="text-gray-400">
                The easiest way to build professional forms that convert.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Templates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 QuickForm. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-25px); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        
        .animation-delay-400 {
          animation-delay: 400ms;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default QuickFormLanding;