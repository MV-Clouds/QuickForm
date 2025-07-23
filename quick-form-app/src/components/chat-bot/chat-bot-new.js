'use client'
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown';
import BotButton from './bot-button'
import { useChatBot } from '../form-builder-with-versions/ChatBotContext';

export default function ConvoBotPopup() {
    const { latestFieldsState, sendActivityToBot } = useChatBot();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'Hello! I\'m your QuickForm assistant. How can I help you today? 🌟' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isQuestionsOpen, setIsQuestionsOpen] = useState(true);
    const messagesEndRef = useRef(null);

    // Dynamic configuration
    const config = {
        botName: 'Formi',
        popupPosition: 'right', // '' | 'right' | 'center'
        sampleQuestions: [
            "How do I create a new form?",
            "What are the best practices for form design?",
            "Can you help me add validation to my form?",
            "How can I export form responses?"
        ]
    };

    const streamString = async (stream) => {
        return await new Response(stream).text();
    }

    const handleSend = async (message = input) => {
        if (!message.trim()) return;

        setMessages(prev => [...prev, { role: 'user', content: message }]);
        setInput('');
        setIsLoading(true);

        // Add a placeholder for the streaming bot message
        setMessages(prev => [...prev, { role: 'bot', content: '' }]);

        try {
            console.log('Body : ',JSON.stringify({ message  : message}));
            const res = await fetch('https://gzrhf9pxic.execute-api.us-east-1.amazonaws.com/bot-stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });
            const botresponse = await res.json();
            console.log('Chatbot Response', botresponse);

            console.log('Bot response:', botresponse.result);
            setMessages(prev => [
                ...prev,
                { role: 'bot', content: botresponse.result }
            ]);
        } catch (error) {
            setMessages(prev => [
                ...prev,
                { role: 'bot', content: "⚠️ Sorry, something went wrong. Please try again later." }
            ]);
        }
        setIsLoading(false);
    };

    // Handle sample question click
    const handleSampleQuestion = (question) => {
        handleSend(question);
    };

    // Scroll to bottom effect
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleActivity = async (activity) => {
        console.log('Handling activity body:', JSON.stringify({ activity: activity }));
        const res = await sendActivityToBot(activity);
        console.log('Activity response:', res);
        console.log('Latest fields state:', await res.json());
    }
    return (
        <div
            className={`fixed ${isFullscreen
                ? 'inset-0 w-screen h-screen left-0 top-0 right-0 bottom-0 rounded-xl'
                : config.popupPosition === 'right'
                    ? 'right-8'
                    : config.popupPosition === 'left'
                        ? 'left-8'
                        : 'left-1/2 transform -translate-x-1/2'
                } ${isFullscreen ? 'z-[9999]' : 'bottom-8 z-50'}`}
            style={isFullscreen ? { maxWidth: '80vw', maxHeight: '80vh', margin: 'auto' } : {}}
        >
            {/* Trigger Button */}
            {!isFullscreen && <BotButton isOpen={isOpen} setIsOpen={setIsOpen} handleActivity={handleActivity} />}

            {/* Chat Popup */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={`absolute ${isFullscreen ? 'inset-0 w-full h-full' : 'bottom-24 right-4 w-[420px] max-w-[95vw] h-[640px]'} bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10`}
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            ...isFullscreen ? { maxWidth: '100vw', maxHeight: '100vh' } : {}
                        }}
                    >
                        {/* Floating particles background */}
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(15)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute rounded-full bg-white/10"
                                    style={{
                                        width: `${Math.random() * 6 + 2}px`,
                                        height: `${Math.random() * 6 + 2}px`,
                                        top: `${Math.random() * 100}%`,
                                        left: `${Math.random() * 100}%`,
                                    }}
                                    animate={{
                                        y: [0, (Math.random() - 0.5) * 40],
                                        x: [0, (Math.random() - 0.5) * 40],
                                        opacity: [0.2, 0.8, 0.2],
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: Math.random() * 10 + 5,
                                        ease: 'easeInOut',
                                        delay: Math.random() * 5,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Header with glass morphism effect */}
                        <motion.div
                            className={`relative p-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-500/80 to-purple-600/80`}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.3 }}
                        >
                            <div className="flex items-center space-x-3">
                                <motion.div
                                    className="p-2 rounded-lg bg-white/10 backdrop-blur-sm"
                                    whileHover={{ rotate: 15 }}
                                    transition={{ type: 'spring', stiffness: 200 }}
                                >
                                    <Bot className="h-6 w-6 text-white" />
                                </motion.div>
                                <motion.h3
                                    className="font-bold text-lg text-white tracking-tight"
                                    animate={{
                                        x: [0, -2, 2, 0],
                                        transition: { repeat: Infinity, duration: 6, ease: 'easeInOut' }
                                    }}
                                >
                                    {config.botName}
                                </motion.h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsFullscreen(f => !f)}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                >
                                    {isFullscreen ? (
                                        <Minimize2 className="h-5 w-5 text-white" />
                                    ) : (
                                        <Maximize2 className="h-5 w-5 text-white" />
                                    )}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { setIsOpen(false); if (isFullscreen) setIsFullscreen(f => !f); }}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
                                    style={{ animationDuration: '0.07s', transitionDuration: '0.07s' }}
                                >
                                    <X className="h-5 w-5 text-white" />
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Messages Area with subtle gradient */}
                        <div className="flex-1 overflow-y-auto p-5 bg-gradient-to-b from-white/5 to-white/2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
                            <div className="space-y-5">
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: msg.role === 'user' ? 15 : -15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            type: 'spring',
                                            damping: 25,
                                            stiffness: 300,
                                            delay: i * 0.1
                                        }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <motion.div
                                            whileHover={{
                                                scale: 1.02,
                                                boxShadow: msg.role === 'user'
                                                    ? '0 5px 20px rgba(99, 102, 241, 0.3)'
                                                    : '0 5px 20px rgba(0, 0, 0, 0.1)'
                                            }}
                                            className={`relative max-w-[75%] p-4 rounded-2xl ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                                                : 'bg-white/90 backdrop-blur-sm text-gray-800'
                                                } shadow-md`}
                                        >
                                            {/* Message tail */}
                                            <motion.div
                                                className={`absolute w-3 h-3 ${msg.role === 'user' ? 'right-[-6px]' : 'left-[-6px]'
                                                    } top-3 transform rotate-45 ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-white/90'
                                                    }`}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.15 }}
                                            />
                                            {msg.role === 'bot' ? (
                                                <ReactMarkdown
                                                    components={{
                                                        h1: ({ node, ...props }) => (
                                                            <h1 className="text-xl font-bold mb-2 text-indigo-800">
                                                                <span role="img" aria-label="QuickForm" className="mr-2">📝</span>
                                                                {props.children}
                                                            </h1>
                                                        ),
                                                        h2: ({ node, ...props }) => (
                                                            <h2 className="text-lg font-semibold mb-1 text-indigo-700">
                                                                <span role="img" aria-label="settings" className="mr-2">⚙️</span>
                                                                {props.children}
                                                            </h2>
                                                        ),
                                                        h3: ({ node, ...props }) => (
                                                            <h3 className="text-base font-bold text-indigo-600">
                                                                <span role="img" aria-label="fields" className="mr-2">🔢</span>
                                                                {props.children}
                                                            </h3>
                                                        ),
                                                        h4: ({ node, ...props }) => (
                                                            <h3 className="text-base text-indigo-600">
                                                                <span role="img" aria-label="info" className="mr-2">💡</span>
                                                                {props.children}
                                                            </h3>
                                                        ),
                                                        ul: ({ node, ...props }) => (
                                                            <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />
                                                        ),
                                                        ol: ({ node, ...props }) => (
                                                            <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />
                                                        ),
                                                        li: ({ node, ...props }) => (
                                                            <li className="text-gray-700" {...props} />
                                                        ),
                                                        code: ({ node, ...props }) => (
                                                            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-700">
                                                                {props.children}
                                                            </code>
                                                        ),
                                                        a: ({ node, ...props }) => (
                                                            <a
                                                                className="text-indigo-600 hover:underline"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                {...props}
                                                            />
                                                        ),
                                                        p : ({ node, ...props }) => (
                                                            <p className="text-gray-800 mb-2" {...props} />
                                                        )
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            ) : (
                                                <p className="text-white">{msg.content}</p>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                ))}
                                <div ref={messagesEndRef} />
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-sm">
                                            <div className="flex space-x-1.5">
                                                {[...Array(3)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        className="w-2 h-2 rounded-full bg-indigo-400"
                                                        animate={{
                                                            y: [0, -4, 0],
                                                            opacity: [0.6, 1, 0.6],
                                                        }}
                                                        transition={{
                                                            repeat: Infinity,
                                                            duration: 1,
                                                            ease: 'easeInOut',
                                                            delay: i * 0.2,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Sample Questions Section */}
                        <motion.div
                            className="px-5 py-2 border-t border-white/10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsQuestionsOpen(!isQuestionsOpen)}
                                className="flex items-center justify-between w-full p-2 text-black/90 text-sm font-medium bg-black/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-200"
                            >
                                <span>Suggested Questions</span>
                                {isQuestionsOpen ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronUp className="h-4 w-4" />
                                )}
                            </motion.button>
                            <AnimatePresence>
                                {isQuestionsOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {config.sampleQuestions.map((question, index) => (
                                                <motion.button
                                                    key={index}
                                                    whileHover={{ scale: 1.01 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleSampleQuestion(question)}
                                                    className="p-3 text-left text-sm text-black/90 bg-black/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-all duration-200"
                                                >
                                                    {question}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Input Area with floating effect */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-5 border-t border-white/10 bg-white/5 backdrop-blur-lg"
                        >
                            <motion.div
                                whileHover={{ y: -2 }}
                                className="flex gap-3 items-end"
                            >
                                <motion.div
                                    className="flex-1 relative"
                                    whileFocusWithin={{ y: -2 }}
                                >
                                    <motion.textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Type your message..."
                                        className="w-full p-3 pr-12 rounded-xl border border-blue/20 bg-black/10 backdrop-blur-sm text-black placeholder-black/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent resize-none"
                                        style={{ minHeight: '48px', maxHeight: '100px' }}
                                        rows={1}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => input.trim() && handleSend()}
                                        className="absolute right-2 bottom-3 p-2 rounded-lg bg-black/10 hover:bg-black/20 transition-all"
                                        disabled={!input.trim()}
                                    >
                                        <Send className="h-5 w-5" />
                                    </motion.button>
                                </motion.div>
                            </motion.div>
                            <motion.div
                                className="mt-2 flex justify-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                transition={{ delay: 1 }}
                            >
                                <p className="text-xs text-black/50">
                                    {config.botName} • Powered by AI
                                </p>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}