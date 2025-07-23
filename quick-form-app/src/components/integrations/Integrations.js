import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiRazorpay, SiStripe, SiSquare, SiPaypal, SiTwilio, SiAwsamplify, SiGooglesheets, SiGmail } from 'react-icons/si';
import { Filter } from 'lucide-react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import awsExports from './aws-config';
Amplify.configure(awsExports);

const GMAIL_CLIENT_ID = '932194946717-snt34c2fiiqkpeuj36ivj5u83eaf5vua.apps.googleusercontent.com';
const GMAIL_REDIRECT_URI = 'http://localhost:5173/home';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly email profile openid';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly email profile openid';

const allApps = [
    { id: 'twilio', name: 'Twilio', description: 'Twilio lets you send SMS and make calls through powerful APIs. Easily add communication features to any app.', icon: <SiTwilio size={32} color="#F22F46" /> },
    { id: 'square', name: 'Square', description: 'Square offers tools for payments, POS, and business management. Accept payments anywhere and grow your business with ease.', icon: <SiSquare size={32} color="#000" /> },
    { id: 'razorpay', name: 'Razorpay', description: 'Razorpay is a full-stack payment solution for businesses in India.', icon: <SiRazorpay size={32} color="#0B295E" /> },
    { id: 'stripe', name: 'Stripe', description: 'Stripe is a global payment platform for online businesses. It enables easy, secure payment processing and financial services integration.', icon: <SiStripe size={32} color="#1D6D9E" /> },
    { id: 'paypal', name: 'PayPal', description: 'PayPal is a global leader in online payment solutions with millions of account holders worldwide.', icon: <SiPaypal size={32} color="#003087" /> },
    { id: 'aws', name: 'AWS', description: 'Amazon Web Services (AWS) is a comprehensive cloud computing platform that offers a wide range of services for computing, storage, databases, analytics, machine learning, and more.', icon: <SiAwsamplify size={32} color="orange" /> },
    { id: 'google-sheet', name: 'Google Sheet', description: 'Google Sheets is a free online spreadsheet editor that allows users to create and edit spreadsheets online and collaborate with others in real-time.', icon: <SiGooglesheets size={32} color="green" /> },
    { id: 'gmail', name: 'Gmail', description: 'Gmail is a free email service provided by Google that allows users to send and receive emails with a generous storage capacity and advanced security features.', icon: <SiGmail size={32} color="Red" /> }
];

const initialConnectedApps = [
    { id: 'razorpay', name: 'Razorpay', description: 'Connected to your account. Payment gateway for India.', icon: <SiRazorpay size={32} color="#0B295E" /> },
];

const tabGradient = 'linear-gradient(360deg, #008AB033 0%, #8FDCF100 100%)';
const buttonGradient = 'linear-gradient(90deg, #0B295E 0%, #1D6D9E 100%)';

function openGoogleOAuthPopup(scope, onSuccess, onError) {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GMAIL_CLIENT_ID)}&redirect_uri=${encodeURIComponent(GMAIL_REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent&access_type=online`;
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(url, 'GoogleAuth', `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) return onError && onError('Popup blocked');

    const timer = setInterval(() => {
        try {
            if (!popup || popup.closed) {
                clearInterval(timer);
                onError && onError('Popup closed');
                return;
            }
            // Check for redirect URI in popup location
            const href = popup.location.href;
            if (href.startsWith(GMAIL_REDIRECT_URI)) {
                const hash = popup.location.hash;
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token');
                clearInterval(timer);
                popup.close();
                if (accessToken) {
                    onSuccess(accessToken);
                } else {
                    onError && onError('No access token');
                }
            }
        } catch (e) {
            // Ignore cross-origin errors until redirect
        }
    }, 500);
}

const Integrations = () => {
    const [showAuthenticator, setShowAuthenticator] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedApp, setSelectedApp] = useState(null);
    const [connectedApps, setConnectedApps] = useState(initialConnectedApps);
    const [connecting, setConnecting] = useState(false);
    const [awsConnected, setAwsConnected] = useState(false);
    const [awsUser, setAwsUser] = useState(null);
    const [awsError, setAwsError] = useState('');

    const filteredApps = allApps.filter(app =>
        app.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleConnect = async (app) => {
        if (app.id === 'aws') {
            if (awsConnected) return; // Prevent reconnect
            setConnecting(true);
            setAwsError('');
            try {
                setShowAuthenticator(true);
                // setAwsConnected(true);
                setConnectedApps(prev => [...prev, { ...app, description: 'Connected to your AWS account.' }]);
                setSelectedApp(null);
            } catch (err) {
                setAwsError('AWS connection failed: ' + (err.message || err));
            }
            setConnecting(false);
        } else if (app.id === 'gmail') {
            setConnecting(true);
            openGoogleOAuthPopup(
                GMAIL_SCOPE,
                (accessToken) => {
                    setConnecting(false);
                    setConnectedApps(prev => [...prev, { ...app, description: 'Connected to your Gmail account.' }]);
                    setSelectedApp(null);
                },
                (error) => {
                    setConnecting(false);
                    alert('Gmail connection failed: ' + error);
                }
            );
        } else if (app.id === 'google-sheet') {
            setConnecting(true);
            openGoogleOAuthPopup(
                SHEETS_SCOPE,
                (accessToken) => {
                    setConnecting(false);
                    setConnectedApps(prev => [...prev, { ...app, description: 'Connected to your Google Sheets account.' }]);
                    setSelectedApp(null);
                },
                (error) => {
                    setConnecting(false);
                    alert('Google Sheets connection failed: ' + error);
                }
            );
        } else {
            setConnectedApps(prev => [...prev, { ...app, description: `Connected to your ${app.name} account.` }]);
            setSelectedApp(null);
        }
    };

    const handleDisconnectAWS = async () => {
        setConnecting(true);
        setAwsError('');
        try {
            // await Auth.signOut();
            setAwsConnected(false);
            setAwsUser(null);
            setConnectedApps(prev => prev.filter(app => app.id !== 'aws'));
        } catch (err) {
            setAwsError('AWS disconnect failed: ' + (err.message || err));
        }
        setConnecting(false);
    };

    return (
        <div className="">
            <div className="px-10 py-8 rounded-b-xl shadow-lg relative" style={{ background: 'linear-gradient(to right, #008AB0, #8FDCF1)' }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-6"
                >
                    <h1 className="text-3xl font-bold text-white mb-1">Integrations</h1>
                </motion.div>
            </div>
            <div className="flex border-b mb-6 px-10 mt-8">
                <button
                    className={`px-4 py-2 -mb-px border-b-2 font-medium transition-colors  ${activeTab === 'all' ? '' : 'text-gray-500 hover:text-blue-600'}`}
                    style={activeTab === 'all' ? { background: tabGradient, borderColor: '#008AB0', color: '#008AB0' } : { borderColor: 'transparent' }}
                    onClick={() => setActiveTab('all')}
                >
                    All Application
                </button>
                <button
                    className={`ml-4 px-4 py-2 -mb-px border-b-2 font-medium transition-colors  ${activeTab === 'connected' ? '' : 'text-gray-500 hover:text-blue-600'}`}
                    style={activeTab === 'connected' ? { background: tabGradient, borderColor: '#008AB0', color: '#008AB0' } : { borderColor: 'transparent' }}
                    onClick={() => setActiveTab('connected')}
                >
                    Connected
                </button>
            </div>
            <div className="px-10">
                {activeTab === 'all' && (
                    <div>
                        <div className="flex items-center mb-6 justify-between">
                            <input
                                type="text"
                                placeholder="Search for Payment"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="px-4 py-2 border rounded-lg w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <button className="ml-4 px-5 py-2 border border-2  rounded-lg text-gray-600 flex items-end justify-right gap-2"><span className="material-icons"><Filter className='h-5 w-5' /></span>Filter</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <AnimatePresence>
                                {filteredApps.map(app => (
                                    <motion.div
                                        key={app.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        whileHover={{ scale: 1.04, boxShadow: '0 4px 24px #008AB033' }}
                                        className="bg-white border rounded-xl p-5 flex flex-col gap-2 cursor-pointer shadow-sm min-h-[170px]"
                                        onClick={() => setSelectedApp(app)}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            {app.icon}
                                            <span className="font-semibold text-lg">{app.name}</span>
                                        </div>
                                        <div className="text-gray-500 text-sm">{app.description}</div>
                                    </motion.div>
                                ))}
                                {filteredApps.length === 0 && (
                                    <div className="col-span-4 text-gray-400 text-center">No applications found.</div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
                {activeTab === 'connected' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {connectedApps.map(app => (
                                <motion.div
                                    key={app.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    whileHover={{ scale: 1.04, boxShadow: '0 4px 24px #008AB033' }}
                                    className="bg-white border rounded-xl p-5 flex flex-col gap-2 shadow-sm min-h-[170px]"
                                    onClick={() => setSelectedApp(app)}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        {app.icon}
                                        <span className="font-semibold text-lg">{app.name}</span>
                                    </div>
                                    <div className="text-gray-500 text-sm">{app.description}</div>
                                </motion.div>
                            ))}
                            {connectedApps.length === 0 && (
                                <div className="col-span-4 text-gray-400 text-center">No connected applications.</div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
            {showAuthenticator && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
                                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center relative">
                                        <Authenticator>
                                            {({ signOut, user }) => (
                                                <div className="flex flex-col items-center gap-4">
                                                    <h1 className="text-2xl font-bold mb-4">Hello {user.username}</h1>
                                                    <button
                                                        className="py-2 px-6 rounded-lg text-white font-semibold shadow-md"
                                                        style={{ background: buttonGradient }}
                                                        onClick={signOut}
                                                    >
                                                        Sign out
                                                    </button>
                                                    <button onClick={()=> setShowAuthenticator(false)}>Close</button>
                                                </div>
                                            )}
                                        </Authenticator>

                                    </div>
                                </div>
                            )}
            {/* Modal for app details */}
            <AnimatePresence>
                {selectedApp && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 40 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center relative"
                        >
                            <div className="flex flex-col items-center mb-4">
                                <div className="mb-2">{selectedApp.icon}</div>
                                <h2 className="text-2xl font-bold mb-2 text-center">{selectedApp.name}</h2>
                                <p className="text-gray-600 text-center mb-4">{selectedApp.description}</p>
                                {/* Dummy connection image */}
                                <div className="w-24 h-24 bg-gradient-to-tr from-blue-100 to-blue-300 rounded-full flex items-center justify-center mb-4">
                                    <span className="material-icons text-5xl text-blue-400">link</span>
                                </div>
                                {/* AWS user info and error */}
                                {selectedApp.id === 'aws' && awsConnected && awsUser && (
                                    <div className="text-center text-green-700 text-sm mb-2">
                                        Connected as: {awsUser.username || awsUser.userId || 'AWS User'}
                                    </div>
                                )}
                                {selectedApp.id === 'aws' && awsError && (
                                    <div className="text-center text-red-600 text-sm mb-2">{awsError}</div>
                                )}
                            </div>
                            
                            <div className="flex gap-4 w-full mt-2">
                                <button
                                    className="flex-1 py-2 rounded-lg border text-black font-semibold shadow-md"
                                    style={{ background: 'white' }}
                                    onClick={() => setSelectedApp(null)}
                                    disabled={connecting}
                                >
                                    Back
                                </button>
                                {selectedApp.id === 'aws' && awsConnected ? (
                                    <button
                                        className="flex-1 py-2 rounded-lg text-white font-semibold shadow-md"
                                        style={{ background: buttonGradient, opacity: connecting ? 0.7 : 1 }}
                                        onClick={handleDisconnectAWS}
                                        disabled={connecting}
                                    >
                                        Disconnect
                                    </button>
                                ) : (
                                    <button
                                        className="flex-1 py-2 rounded-lg text-white font-semibold shadow-md"
                                        style={{ background: buttonGradient, opacity: connecting ? 0.7 : 1 }}
                                        onClick={() => handleConnect(selectedApp)}
                                        disabled={connecting || (selectedApp.id === 'aws' && awsConnected)}
                                    >
                                        {connecting && selectedApp.id === 'aws' ? 'Connecting...' : 'Connect'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Integrations; 