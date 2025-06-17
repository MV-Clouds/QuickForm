'use client'
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Bot, X, Send, Maximize2, Minimize2 } from 'lucide-react'
import BotButton from './bot-button'
export default function ConvoBotPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'Hello! I\'m your QuickForm assistant. How can I help you today? 🌟' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const messagesEndRef = useRef(null);

    // Dynamic configuration
    const config = {
        botName: 'Formi',
        popupPosition: 'right', // '' | 'right' | 'center'
        
    };
    const streamString = async (stream) => {
        return await new Response(stream).text();
    }
    const handleSend = async () => {
        if (!input.trim()) return;

        setMessages(prev => [...prev, { role: 'user', content: input }]);
        setInput('');
        setIsLoading(true);

        // Add a placeholder for the streaming bot message
        setMessages(prev => [...prev, { role: 'bot', content: '' }]);

        try {
            const res = await fetch('http://localhost:3000/api/chat/chatTogether', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input }),
            });

            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let botMessage = '';
            let done = false;

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    botMessage += chunk;
                    setMessages(prev => {
                        const updated = [...prev];
                        // Update the last bot message
                        updated[updated.length - 1] = { role: 'bot', content: botMessage };
                        return updated;
                    });
                }
            }
        } catch (error) {
            setMessages(prev => [
                ...prev,
                { role: 'bot', content: "⚠️ Sorry, something went wrong. Please try again later." }
            ]);
        }
        setIsLoading(false);
    };

    // Scroll to bottom effect
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        }
    }, [messages]);

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
            style={isFullscreen ? { maxWidth: '75vw', maxHeight: '75vh', margin: '7rem 12rem' } : {}}
        >
            {/* Trigger Button */}
            {!isFullscreen && <BotButton isOpen={isOpen} setIsOpen={setIsOpen} />}

            {/* Chat Popup */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`absolute ${isFullscreen ? 'inset-0 w-full h-full' : 'bottom-24 right-4 w-96 max-w-[90vw] h-[32rem]'} bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/10`}
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
                                >
                                    <Bot className="h-5 w-5 text-white" />
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
                                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                >
                                    {isFullscreen ? (
                                        <Minimize2 className="h-4 w-4 text-white" />
                                    ) : (
                                        <Maximize2 className="h-4 w-4 text-white" />
                                    )}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {setIsOpen(false); if(isFullscreen) setIsFullscreen(f => !f);}}
                                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                                >
                                    <X className="h-4 w-4 text-white" />
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Messages Area with subtle gradient */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-white/5 to-white/2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                            {/* {messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="h-full flex flex-col items-center justify-center text-center p-6"
                                >
                                    <motion.div
                                        animate={{
                                            y: [0, -10, 0],
                                            transition: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
                                        }}
                                    >
                                        <Bot className="h-12 w-12 text-indigo-400 mb-4" />
                                    </motion.div>
                                    <h4 className="text-lg font-medium text-white/90 mb-2">How can I help you today?</h4>
                                    <p className="text-sm text-white/60 max-w-xs">
                                        Ask me anything or share what you're working on.
                                    </p>
                                </motion.div>
                            )} */}

                            <div className="space-y-4">
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: msg.role === 'user' ? 20 : -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            type: 'spring',
                                            damping: 20,
                                            stiffness: 300,
                                            delay: i * 0.05
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
                                            className={`relative max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                                                : 'bg-white/90 backdrop-blur-sm text-gray-800'
                                                } shadow-md`}
                                        >
                                            {/* Message tail */}
                                            <motion.div
                                                className={`absolute w-3 h-3 ${msg.role === 'user' ? 'right-[-4px]' : 'left-[-4px]'
                                                    } top-4 transform rotate-45 ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-white/90'
                                                    }`}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.1 }}
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
                                                        ), h4: ({ node, ...props }) => (
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
                                        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm">
                                            <div className="flex space-x-2">
                                                {[...Array(3)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        className="w-2.5 h-2.5 rounded-full bg-indigo-400"
                                                        animate={{
                                                            y: [0, -5, 0],
                                                            opacity: [0.6, 1, 0.6],
                                                        }}
                                                        transition={{
                                                            repeat: Infinity,
                                                            duration: 1.2,
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
                            
                        {/* Input Area with floating effect */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-lg"
                        >
                            <motion.div
                                whileHover={{ y: -2 }}
                                className="flex gap-3 items-end"
                            >
                                <motion.div
                                    className="flex-1 relative"
                                    whileFocusWithin={{ y: -3 }}
                                >
                                    <motion.textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Type your message..."
                                        className="w-full p-3 pr-10 rounded-xl border border-blue/20 bg-black/10 backdrop-blur-sm text-black placeholder-black/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent resize-none"
                                        style={{ minHeight: '44px', maxHeight: '120px' }}
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
                                        className="absolute right-2 bottom-4 p-1.5 rounded-lg bg-black/10 hover:bg-black/20 transition-all"
                                        disabled={!input.trim()}
                                    >
                                        <Send className="h-4 w-4" />
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