// Load Twilio credentials from environment or hardcode them (not recommended for production)
const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const client = require('twilio')(accountSid, authToken);
const express = require('express');
const app = express();
app.use(express.json());

app.post('/sendmessage', async (req, res) => {
    const { to, from, body } = req.body;
    if (!to || !from || !body) {
        return res.status(400).json({ error: 'Missing required fields: to, from, body' });
    }
    try {
        const message = await client.messages.create({ body, from, to });
        res.json({ success: true, sid: message.sid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(3001, () => {
    console.log('Server running on port 3001');
});
// client.messages
//   .create({
//     body: 'Hello from Node.js using Twilio!',
//     from: '+15714446911', // Your Twilio number
//     to: '+918905606007' // Your verified phone number (must be verified in trial)
//   })
//   .then(message => console.log('Message sent with SID:', message.sid))
//   .catch(error => console.error('Error sending SMS:', error));
