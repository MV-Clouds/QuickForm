import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiRazorpay, SiStripe, SiSquare, SiPaypal, SiTwilio, SiAwsamplify, SiGooglesheets, SiGmail } from 'react-icons/si';
import { Filter, Trash } from 'lucide-react';

const GMAIL_CLIENT_ID = '932194946717-snt34c2fiiqkpeuj36ivj5u83eaf5vua.apps.googleusercontent.com';
const GMAIL_REDIRECT_URI = 'http://localhost:3000/home';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly email profile openid';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly email profile openid';
const allApps = [
    { id: 'twilio', name: 'Twilio', description: 'Twilio lets you send SMS and make calls through powerful APIs. Easily add communication features to any app.', icon: <SiTwilio size={32} color="#F22F46" /> },
    { id: 'square', name: 'Square', description: 'Square offers tools for payments, POS, and business management. Accept payments anywhere and grow your business with ease.', icon: <SiSquare size={32} color="#000" /> },
    { id: 'razorpay', name: 'Razorpay', description: 'Razorpay is a full-stack payment solution for businesses in India.', icon: <SiRazorpay size={32} color="#0B295E" /> },
    { id: 'stripe', name: 'Stripe', description: 'Stripe is a global payment platform for online businesses. It enables easy, secure payment processing and financial services integration.', icon: <SiStripe size={32} color="#1D6D9E" /> },
    { id: 'paypal', name: 'PayPal', description: 'PayPal is a global leader in online payment solutions with millions of account holders worldwide.', icon: <SiPaypal size={32} color="#003087" /> },
    { id: 'aws', name: 'AWS', description: 'Amazon Web Services (AWS) is a comprehensive cloud computing platform that offers a wide range of services for computing, storage, databases, analytics, machine learning, and more.', icon: <img src={'images/amazonlogo.png'} alt='AWS' height={'80px'} width='80px' /> },
    { id: 'google-sheet', name: 'Google Sheet', description: 'Google Sheets is a free online spreadsheet editor that allows users to create and edit spreadsheets online and collaborate with others in real-time.', icon: <SiGooglesheets size={32} color="green" /> },
    { id: 'gmail', name: 'Gmail', description: 'Gmail is a free email service provided by Google that allows users to send and receive emails with a generous storage capacity and advanced security features.', icon: <img src={'images/gmail_logo.png'} alt='Gmail' height={'40px'} width='40px' /> }
];

const initialConnectedApps = [
    { id: 'razorpay', name: 'Razorpay', description: 'Connected to your account. Payment gateway for India.', icon: <SiRazorpay size={32} color="#0B295E" /> },
];

const tabGradient = 'linear-gradient(360deg, #008AB033 0%, #8FDCF100 100%)';
const buttonGradient = 'linear-gradient(90deg, #0B295E 0%, #1D6D9E 100%)';
// 🔄 Skeleton Loader Component
const AppCardSkeleton = () => (
    <motion.div
        className="bg-white border rounded-xl p-5 flex flex-col gap-4 shadow-sm min-h-[170px]"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: [0.7, 0.4, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="h-6 w-28 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
    </motion.div>
);

function openGoogleOAuthPopup(scope, onSuccess, onError, token, instanceUrl , userId , type) {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GMAIL_CLIENT_ID)}&redirect_uri=${encodeURIComponent(GMAIL_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&prompt=consent&access_type=offline`;
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(url, 'GoogleAuth', `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) return onError && onError('Popup blocked');
    let handled = false;
    const timer = setInterval(async () => {
      try {
        if (handled) return; // prevent multiple calls
        if (!popup || popup.closed) {
          clearInterval(timer);
          onError && onError('Popup closed');
          return;
        }
  
        // Detect redirect
        const href = popup.location.href;
        if (href.startsWith(GMAIL_REDIRECT_URI)) {
            handled = true;
          clearInterval(timer); // ✅ stop immediately
          const search = popup.location.search;
          const params = new URLSearchParams(search.substring(1));
          const code = params.get("code");
  
          if (!code) {
            popup.close();
            onError && onError("No authorization code found");
            return;
          }
  
          try {
            // Exchange code with backend
            const res = await fetch("https://40npk4h6n3.execute-api.us-east-1.amazonaws.com/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, sfToken: token, sfInstanceUrl: instanceUrl , sfuserId : userId , type})
            });
  
            if (!res.ok) throw new Error("Backend exchange failed");
            const tokens = await res.json();
            console.log('tokens' , tokens)
            popup.close();
            onSuccess && onSuccess(tokens); // ✅ single success call
          } catch (err) {
            popup.close();
            onError && onError(err.message || "Token exchange error");
          }
        }
      } catch (e) {
        // ignore cross-origin errors until redirect happens
      }
    }, 500);
  }
  
const Integrations = ({ token }) => {
    const [integrations, setIntegrations] = useState([]);
    const [google_access_token , setgoogle_access_token] = useState();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAuthenticator, setShowAuthenticator] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [googleUsers, setGoogleUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedApp, setSelectedApp] = useState(null);
    const [connectedApps, setConnectedApps] = useState(initialConnectedApps);
    const [connecting, setConnecting] = useState(false);
    const [awsConnected, setAwsConnected] = useState(false);
    const [awsUser, setAwsUser] = useState(null);
    const [awsError, setAwsError] = useState('');
    const [awsAccessKey, setAwsAccessKey] = useState('');
    const [bucketname,setbucketname] = useState('')
    const [awsSecretKey, setAwsSecretKey] = useState('');
    const [twilioSid, setTwilioSid] = useState('');
    const [twilioAuthToken, setTwilioAuthToken] = useState('');
    const [twilioConnectionName, setTwilioConnectionName] = useState('');
    const [twilioConnected, setTwilioConnected] = useState(false);
    const [twilioError, setTwilioError] = useState('');
    // Change awsuser to an array of user objects
    const [awsuser, setawsuser] = useState([]); // [{ username, date, accountId, arn, bucketName }]
    const userId = sessionStorage.getItem('userId')
    const instanceUrl = sessionStorage.getItem('instanceUrl');
    const filteredApps = allApps.filter(app =>
        app.name.toLowerCase().includes(search.toLowerCase())
    );
     // ✅ Helper function to call backend
    const fetchIntegrations = async () => {
        try {
        const res = await fetch(`https://40npk4h6n3.execute-api.us-east-1.amazonaws.com/auth?instanceUrl=${encodeURIComponent(instanceUrl)}&sfToken=${encodeURIComponent(token)}`, { method: "GET" });
        if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.status}`);
        }
        const data = await res.json();
        console.log('Repsonse data' , data)
        // Salesforce-like response mapping
        // Assume data.records is returned from Lambda
        const mapped = (data.records || []).map((rec) => ({
            name: rec.Name,
            picture1: rec.PictureUrl_1__c,
            picture2: rec.PictureUrl_2__c,
            picture3: rec.PictureUrl_3__c,
            tokenType: rec.TokenType__c, // gmail or google-sheet
            connected: !!rec.Access_Token__c // true if token exists
        }));

        setIntegrations(mapped);

        const googleApps = mapped
            .filter(
                (integration) =>
                    (integration.tokenType === 'gmail' || integration.tokenType === 'google-sheet') &&
                    integration.connected
            )
            .map((integration) => {
                const app = allApps.find((app) => app.id === integration.tokenType);
                if (app) {
                    return { ...app, description: `Connected to your ${app.name} account.` };
                }
                return null;
            })
            .filter(Boolean);

        if (googleApps.length > 0) {
            setConnectedApps((prev) => {
                const existingIds = new Set(prev.map((app) => app.id));
                const newApps = googleApps.filter((app) => !existingIds.has(app.id));
                return [...prev, ...newApps];
            });
            setGoogleUsers(data?.records.map(user => ({
                Id: user.Id || user.TokenType__c + Date.now(),  // unique key fallback
                PictureUrl_1: user.PictureUrl_1__c || 'default-picture.png',  // fallback image
                UserName: user.UserName__c || 'Unknown User',
                Type : user.TokenType__c 
              })));
        }
        setgoogle_access_token(data.token)
        setError(null);
        } catch (err) {
        console.error("Error fetching integrations:", err);
        setError(err.message);
        } finally {
        setLoading(false);
        }
    };
    async function deleteGoogleCredential(recordId, instanceUrl, sfToken) {
        if (!recordId || !instanceUrl || !sfToken) {
          throw new Error("Missing required parameters");
        }
        
        // Construct URL with query parameters
        const url = new URL('https://40npk4h6n3.execute-api.us-east-1.amazonaws.com/auth');
        url.searchParams.append('recordId', recordId);
        url.searchParams.append('instanceUrl', instanceUrl);
        url.searchParams.append('sfToken', sfToken);
      
        const response = await fetch(url.toString(), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      
        if (response.ok) {
          const result = await response.json();
          return result;  // e.g. { success: true, message: "..."} 
        } else {
          const errorText = await response.text();
          throw new Error(`Delete failed: ${response.status} - ${errorText}`);
        }
      }
      
    // Handler to delete Google user from confirmation & UI (you can enhance to call API)
    const handleDeleteGoogleUser = async (id) => {
        // Add your API call to disconnect here if required
        const response = await deleteGoogleCredential(id , instanceUrl , token);
        console.log('Delete Response' , response)
        setGoogleUsers(prev => prev.filter((user, i) => user.Id !== id));
    };  
    // ✅ useEffect to call on mount
    useEffect(() => {
        if(token){
            console.log(token)
            fetchIntegrations();
        }
    }, [token , google_access_token]);

    const handleConnect = async (app) => {
        if (app.id === 'aws') {
            if (awsConnected) return; // Prevent reconnect
            if (!awsAccessKey || !awsSecretKey) {
                setAwsError("All fields are required.");
                return;
            }
            setConnecting(true);
            setAwsError('');
            try {
                const response = await fetch('https://pm8ylpazok.execute-api.us-east-1.amazonaws.com/auth', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        instanceUrl,
                        accessKey: awsAccessKey,
                        secretKey: awsSecretKey,
                        bucketName: bucketname
                    }),
                });
                const res = await response.json();
                if (response.ok) { // status 200
                    setAwsConnected(true);
                    setawsuser(prev => [...prev, {
                        username: res.username,
                        date: res.date,
                        accountId: res.accountId,
                        arn: res.arn,
                        bucketName: res.bucketName
                    }]);
                    setConnectedApps(prev => [...prev, { ...app, description: 'Connected to your AWS account.' }]);
                    setSelectedApp(null);
                    setAwsAccessKey('');
                    setbucketname('');
                    setAwsSecretKey('');
                } else {
                    setAwsAccessKey('');
                    setbucketname('');
                    setAwsSecretKey('');
                    const errorResult = res || { message: "Invalid credentials or server error" };
                    setAwsError(errorResult.message || `Authentication failed. Please check your credentials.`);
                }
            } catch (err) {
                setAwsError('AWS connection failed: ' + (err.message || 'An unknown error occurred.'));
            }
            setConnecting(false);
        } else if (app.id === 'twilio') {
            if (!twilioSid || !twilioAuthToken || !twilioConnectionName) {
                setTwilioError("All fields are required.");
                return;
            }
            setConnecting(true);
            setTwilioError('');
            try {
                const salesforceInstanceUrl = sessionStorage.getItem('instanceUrl');
                const salesforceAccessToken = token;

                const response = await fetch('https://naf0rbkhc6.execute-api.us-east-1.amazonaws.com/twilioAuth', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        accountSid: twilioSid,
                        authToken: twilioAuthToken,
                        connectionName: twilioConnectionName,
                        salesforceInstanceUrl: salesforceInstanceUrl,
                        salesforceAccessToken: salesforceAccessToken,
                    }),
                });

                if (response.ok) { // status 200
                    setTwilioConnected(true);
                    setConnectedApps(prev => [...prev, { ...app, description: `Connected as ${twilioConnectionName}.` }]);
                    setSelectedApp(null);
                    setTwilioSid('');
                    setTwilioAuthToken('');
                    setTwilioConnectionName('');
                } else {
                    setTwilioSid('');
                    setTwilioAuthToken('');
                    setTwilioConnectionName('');
                    const errorResult = await response.json().catch(() => ({ message: "Invalid credentials or server error" }));
                    setTwilioError(errorResult.message || `Authentication failed. Please check your credentials.`);
                }
            } catch (err) {
                setTwilioError('Twilio connection failed: ' + (err.message || 'An unknown error occurred.'));
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
                } ,
                token , instanceUrl , userId , "gmail"
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
                } ,
                token , instanceUrl , userId , "google-sheet"
            );
        } else {
            setConnectedApps(prev => [...prev, { ...app, description: `Connected to your ${app.name} account.` }]);
            setSelectedApp(null);
        }
    };

    // Delete AWS user row
    const handleDeleteAwsUser = (idx) => {
        setawsuser(prev => prev.filter((_, i) => i !== idx));
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

    const handleDisconnectTwilio = async () => {
        setConnecting(true);
        setTwilioError('');
        try {
            setTwilioConnected(false);
            setConnectedApps(prev => prev.filter(app => app.id !== 'twilio'));
        } catch (err) {
            setTwilioError('Twilio disconnect failed: ' + (err.message || err));
        }
        setConnecting(false);
    };

    return (
        <div>
        <div className=""
            style={{
                background: selectedApp
                    ? 'linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8)), url("images/Frame1.png") center center / cover no-repeat'
                    : '',
                height: '100%'
            }}
        >
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
            <div className="px-10">
                {/* If no app is selected, show tabs and app grid */}
                {!selectedApp && (
                    <>
                        <div className="flex border-b mb-6 mt-8">
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
                                    {loading ? (
                                        Array.from({length : 8}).map((_,i) => <AppCardSkeleton key={i}/>)
                                    ) : (
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
                                    )}
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
                    </>
                )}
                {/* If an app is selected, show details section */}
                {selectedApp && (
                    <div>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 40 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="mx-auto mt-16 mb-16 bg-white rounded-2xl  p-4 w-full max-w-2xl flex flex-col items-center relative border"
                    >
                        {/* Icon, SVG, and Image row */}
                        <div className="flex flex-row items-center justify-center gap-6 mb-6 py-20 w-[100%] " style={{ background: "url('images/Framehd.png') center center / cover no-repeat, white" }}>
                            {/* App Icon */}
                            <div className="flex items-center justify-center bg-white rounded-lg border shadow w-20 h-20">
                                {selectedApp.icon}
                            </div>
                            {/* SVG in the middle */}
                            <div className="flex items-center justify-center bg-white rounded-lg border shadow w-10 h-10">
                                <svg width="40" height="22" viewBox="0 0 28 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.6003 0.261765C11.778 0.200124 12.0499 0.127606 12.1986 0.0985988C12.4161 0.0623397 13.1921 0.051462 15.9695 0.0478361C19.2908 0.0442102 19.4758 0.0478361 19.6136 0.113102C19.6933 0.149362 19.7876 0.211002 19.8202 0.247261C19.8529 0.28352 19.9073 0.377794 19.9363 0.453938C19.9689 0.526456 19.9943 0.631608 19.9943 0.689622C19.9943 0.744011 19.9653 0.852788 19.929 0.932558C19.9162 0.960806 19.8961 0.993601 19.8659 1.03159C19.7103 1.22783 19.4487 1.29583 19.1982 1.2971L15.9913 1.31328C12.7896 1.33141 12.3799 1.34229 12.2167 1.39305C12.1188 1.42568 11.9774 1.47644 11.9085 1.50183C11.8396 1.52721 11.6837 1.60335 11.564 1.67224C11.4444 1.73751 11.2232 1.91881 11.0745 2.07109C10.9259 2.22338 10.7482 2.43731 10.6866 2.54609C10.6213 2.65487 10.527 2.85792 10.4799 2.99933C10.4291 3.14074 10.3747 3.37642 10.353 3.52508C10.3312 3.69188 10.3203 5.14949 10.3276 7.25977C10.3349 10.4506 10.3385 10.7406 10.4001 10.9401C10.4328 11.0597 10.5307 11.2954 10.614 11.4658C10.7301 11.6979 10.8352 11.8429 11.0564 12.0677C11.2159 12.2273 11.4444 12.4194 11.564 12.4883C11.6837 12.5572 11.8469 12.637 11.9266 12.6696C12.0064 12.7023 12.1986 12.753 12.3509 12.7857C12.5974 12.8364 13.0543 12.8437 16.013 12.8437C17.8731 12.8437 19.454 12.8546 19.5229 12.8691C19.5918 12.8836 19.7078 12.9524 19.7803 13.025C19.8529 13.0939 19.9326 13.2171 19.958 13.2969C19.9834 13.3767 19.9943 13.5 19.9834 13.5689C19.9689 13.6377 19.9218 13.7538 19.8782 13.8227C19.8492 13.8652 19.7966 13.9173 19.7011 13.9808C19.5546 14.0782 19.3769 14.1127 19.201 14.1127H16.0058C13.0942 14.1127 12.4959 14.1055 12.2348 14.0584C12.0644 14.0293 11.778 13.9568 11.6003 13.8952C11.4226 13.8372 11.1362 13.7066 10.9658 13.6051C10.7953 13.5036 10.5452 13.3259 10.4037 13.2135C10.266 13.1011 10.0593 12.8944 9.94325 12.753C9.83085 12.6116 9.66768 12.3759 9.58066 12.2273C9.49727 12.0786 9.38849 11.8647 9.34498 11.7559C9.30147 11.6471 9.22895 11.4332 9.18544 11.2845C9.10929 11.0235 9.10567 10.9437 9.08029 7.73114H5.13892C2.967 7.72751 1.10328 7.72026 0.994507 7.71301C0.863974 7.70213 0.747945 7.66587 0.660923 7.60423C0.584779 7.55347 0.486879 7.44469 0.446994 7.3613C0.38898 7.24527 0.374476 7.15825 0.381728 7.02046C0.392606 6.87905 0.421613 6.79928 0.508635 6.69413C0.584779 6.59986 0.679053 6.53096 0.798708 6.49108C0.961874 6.43306 1.30633 6.42944 9.08029 6.42581L9.09989 3.46929C9.10132 3.25378 9.13348 3.03956 9.19541 2.83313L9.19994 2.81803C9.25433 2.64036 9.37761 2.32853 9.47914 2.12911C9.57704 1.92968 9.76921 1.62873 9.90337 1.45832C10.0375 1.2879 10.2841 1.04496 10.4436 0.914429C10.6068 0.783896 10.8606 0.609852 11.0056 0.526456C11.1543 0.439434 11.4226 0.319779 11.6003 0.261765Z" fill="#028AB0" />
                                    <path d="M12.931 3.89855C12.9745 3.85142 13.0797 3.78978 13.1594 3.76077C13.2827 3.71726 13.7396 3.71001 16.0783 3.70638C17.8079 3.70638 18.9029 3.72088 18.9863 3.74264C19.0624 3.76439 19.1748 3.82241 19.2401 3.8768C19.3017 3.93481 19.3742 4.03271 19.4033 4.09435C19.4395 4.185 19.4504 4.48232 19.4504 6.42581H22.9603C26.1692 6.42944 26.481 6.43306 26.6442 6.49108C26.7638 6.53096 26.8581 6.59986 26.9343 6.6905C27.0358 6.81741 27.0467 6.8573 27.0467 7.07485C27.0467 7.28153 27.0322 7.33954 26.9524 7.44469C26.9016 7.51358 26.7965 7.60061 26.7167 7.64049C26.5793 7.71283 26.4959 7.71301 23.1376 7.72021L23.1126 7.72026C21.209 7.72751 19.6063 7.73114 19.4504 7.73114V8.83704C19.4504 9.53322 19.4359 9.9792 19.4105 10.0445C19.3888 10.0989 19.338 10.1823 19.2945 10.2294C19.251 10.2765 19.1494 10.3454 19.0697 10.3817C18.9319 10.4469 18.7723 10.4506 16.1146 10.4469C13.7396 10.4469 13.2827 10.4397 13.1594 10.3926C13.0797 10.3636 12.9854 10.3128 12.9455 10.2765C12.9092 10.2439 12.8476 10.1532 12.8113 10.0807C12.7461 9.9502 12.7425 9.81604 12.7425 7.08935C12.7425 4.68537 12.7497 4.21038 12.7932 4.10523C12.8222 4.03634 12.8839 3.94206 12.931 3.89855Z" fill="#028AB0" />
                                </svg>
                            </div>
                            {/* Quickform logo image */}
                            <div className="flex items-center justify-center bg-white rounded-lg border shadow w-20 h-20">
                                <img src="quickform-logo.png" alt="Quickform" className="object-contain w-12 h-12" />
                            </div>
                        </div>
                        {/* Description */}
                        <p className="text-gray-600 text-center mb-6">{selectedApp.description}</p>
                        {/* AWS connect form */}
                        {selectedApp.id === 'aws' && !awsConnected && (
                            <div className="w-full">
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="access-key">
                                        Access Key ID
                                    </label>
                                    <input
                                        id="access-key"
                                        type="password"
                                        value={awsAccessKey}
                                        onChange={(e) => setAwsAccessKey(e.target.value)}
                                        placeholder="********************"
                                        className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="secret-key">
                                        Secret Access Key
                                    </label>
                                    <input
                                        id="secret-key"
                                        type="password"
                                        value={awsSecretKey}
                                        onChange={(e) => setAwsSecretKey(e.target.value)}
                                        placeholder="****************************************"
                                        className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bucket-name">
                                        Bucket Name
                                    </label>
                                    <input
                                        id="bucket-name"
                                        type="text"
                                        value={bucketname}
                                        onChange={(e) => setbucketname(e.target.value)}
                                        placeholder="Enter your S3 Bucket Name..."
                                        className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                {awsError && (
                                    <div className="text-center text-red-600 text-sm mb-4">{awsError}</div>
                                )}
                            </div>
                        )}
                        
                        {/* Twilio connect form */}
                        {selectedApp.id === 'twilio' && !twilioConnected && (
                            <div className="w-full">
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="twilio-sid">
                                        Account SID
                                    </label>
                                    <input
                                        id="twilio-sid"
                                        type="password"
                                        value={twilioSid}
                                        onChange={(e) => setTwilioSid(e.target.value)}
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="twilio-auth-token">
                                        Auth Token
                                    </label>
                                    <input
                                        id="twilio-auth-token"
                                        type="password"
                                        value={twilioAuthToken}
                                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                                        placeholder="********************************"
                                        className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                <div className="mb-6">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="twilio-connection-name">
                                        Connection Name
                                    </label>
                                    <input
                                        id="twilio-connection-name"
                                        type="text"
                                        value={twilioConnectionName}
                                        onChange={(e) => setTwilioConnectionName(e.target.value)}
                                        placeholder="My Twilio Connection"
                                        className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                                {twilioError && (
                                    <div className="text-center text-red-600 text-sm mb-4">{twilioError}</div>
                                )}
                            </div>
                        )}
                        {/* AWS user info and error (if connected) */}
                        {selectedApp.id === 'aws' && awsConnected && awsUser && (
                            <div className="text-center text-green-700 text-sm mb-2">
                                Connected as: {awsUser.username || awsUser.userId || 'AWS User'}
                            </div>
                        )}
                        {selectedApp.id === 'aws' && awsError && (
                            <div className="text-center text-red-600 text-sm mb-2">{awsError}</div>
                        )}
                        {/* Action buttons */}
                        <div className="flex justify-between gap-4 w-full mt-2">
                            <button
                                className="w-[25%] py-2 rounded-lg border text-black font-semibold shadow-md"
                                style={{ background: 'white' }}
                                onClick={() => {
                                    setSelectedApp(null);
                                    setAwsError && setAwsError('');
                                    setAwsAccessKey && setAwsAccessKey('');
                                    setbucketname('')
                                    setAwsSecretKey && setAwsSecretKey('');
                                    setTwilioError && setTwilioError('');
                                    setTwilioSid && setTwilioSid('');
                                    setTwilioAuthToken && setTwilioAuthToken('');
                                    setTwilioConnectionName && setTwilioConnectionName('');
                                }}
                                disabled={connecting}
                            >
                                Back
                            </button>
                            {/* Connect/Disconnect logic */}
                            {selectedApp.id === 'aws' && awsConnected ? (
                                <button
                                    className="w-[35%] py-2 rounded-lg text-white font-semibold shadow-md"
                                    style={{ background: buttonGradient, opacity: connecting ? 0.7 : 1 }}
                                    onClick={handleDisconnectAWS}
                                    disabled={connecting}
                                >
                                    Disconnect
                                </button>
                            ) : selectedApp.id === 'twilio' && twilioConnected ? (
                                <button
                                    className="w-[35%] py-2 rounded-lg text-white font-semibold shadow-md"
                                    style={{ background: buttonGradient, opacity: connecting ? 0.7 : 1 }}
                                    onClick={handleDisconnectTwilio}
                                    disabled={connecting}
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    className="w-[30%] py-2 rounded-lg text-white font-semibold shadow-md flex items-center justify-center gap-2"
                                    style={{ background: buttonGradient, opacity: connecting ? 0.7 : 1 }}
                                    onClick={() => handleConnect(selectedApp)}
                                    disabled={connecting}
                                >
                                    <div className="mr-2 p-0.5 rounded-lg bg-white flex items-center"><div className={`${selectedApp.id === 'aws' ? 'w-5 h-5' : ''}`}>{selectedApp.icon}</div></div>
                                    {connecting && selectedApp.id !== 'aws' ? 'Connecting...' : 'Connect'}
                                </button>
                            )}
                        </div>
                    </motion.div>
                    {/* AWS connected users row */}
                    {selectedApp.id === 'aws' && awsConnected && awsuser.length > 0 && (
                        <div className='flex item-center justify-center '>
                            <div className="w-[42%] ">
                            {/* <h3 className="text-lg font-semibold mb-2">Connected AWS Users</h3> */}
                            <motion.div layout initial="false" className="flex flex-col gap-3">
                                <AnimatePresence>
                                    {awsuser.map((user, idx) => (
                                        <motion.div
                                            key={user.username + user.date + idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 20 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex items-center bg-white rounded-lg shadow border px-4 py-3 gap-4"
                                        >
                                            {/* Profile circle */}
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-300 text-white font-bold text-lg">
                                                {user.username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            {/* Username and date */}
                                            <div className="flex-1 flex flex-col">
                                                <span className="font-medium text-gray-900">{user.username}</span>
                                            </div>
                                            <div className="flex-1">
                                            <span className="text-xs text-gray-500">
                                                {new Date(user.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </span>
                                            </div>
                                            {/* Delete button */}
                                            <button
                                                className="p-2 rounded hover:bg-gray-100 transition"
                                                onClick={() => handleDeleteAwsUser(idx)}
                                                title="Delete user"
                                            >
                                                <Trash className="w-5 h-5 text-red-500" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                        </div>
                    )}
                    {(selectedApp?.id === 'google' || selectedApp?.id === 'gmail' || selectedApp?.id === 'google-sheet') && googleUsers.length > 0 && (
                        <div className="flex justify-center">
                            <div className="w-[42%]">
                            <h3 className="text-lg font-semibold mb-2">Connected Google Users</h3>
                            <motion.div layout initial={false} className="flex flex-col gap-3">
                                <AnimatePresence>
                                {googleUsers.map((user, idx) => (
                                    <motion.div
                                    key={user.Id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-center bg-white rounded-lg shadow border px-4 py-3 gap-4"
                                    >
                                    <img
                                        src={user.PictureUrl_1}
                                        alt={user.UserName}
                                        crossOrigin='anonymous'
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div className="flex-1 flex flex-col">
                                        <span className="font-medium text-gray-900">{user.UserName}</span>
                                    </div>
                                    <button
                                        className="p-2 rounded hover:bg-gray-100 transition"
                                        onClick={() => handleDeleteGoogleUser(user.Id)}
                                        title="Delete"
                                    >
                                        <Trash className="w-5 h-5 text-red-500" />
                                    </button>
                                    </motion.div>
                                ))}
                                </AnimatePresence>
                            </motion.div>
                            </div>
                        </div>
                        )}

                    </div>
                )}
            </div>
        </div>
        </div>
    );
};


export default Integrations; 