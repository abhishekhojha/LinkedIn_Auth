require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const querystring = require('querystring');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

app.use(express.static(path.join(__dirname, 'public')));

// LinkedIn OAuth 2.0 URLs
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USER_INFO = 'https://api.linkedin.com/v2/userinfo'

// Index Route
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>LinkedIn Authentication</title>
            </head>
            <body>
                <h1>Welcome to LinkedIn Authentication</h1>
                <a href="/auth/linkedin"><button>Sign in with LinkedIn</button></a>
            </body>
        </html>
    `);
});

// Authentication Route
app.get('/auth/linkedin', (req, res) => {
    const authorizationUrl = `${LINKEDIN_AUTH_URL}?${querystring.stringify({
        response_type: 'code',
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: 'http://localhost:8000/auth/linkedin/callback',
        scope: 'openid profile email', // Required scopes
    })}`;
    res.redirect(authorizationUrl);
});

// Callback Route
app.get('/auth/linkedin/callback', async (req, res) => {
    const code = req.query.code;
    console.log(code)
    if (!code) {
        return res.status(400).send('Authorization code not provided');
    }

    try {
        // Exchange authorization code for access token
        const tokenResponse = await axios.post(LINKEDIN_TOKEN_URL, querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: 'http://localhost:8000/auth/linkedin/callback',
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const accessToken = tokenResponse.data.access_token;

        // Fetch user profile
        const profileResponse = await axios.get(LINKEDIN_USER_INFO, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log(profileResponse)
        // Store user information in the session
        req.session.user = {
            profile: profileResponse.data,
        };

        res.redirect('/profile');
    } catch (error) {
        console.error('Error during callback:', error);
        res.redirect('/error'); // Redirect to an error page
    }
});

// Profile Route
app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/linkedin');
    }
    const user = req.session.user;
    res.send(`
        <html>
            <head>
                <title>User Profile</title>
            </head>
            <body>
                <h1>Hello ${user.profile.name}</h1>
                <p>Email: ${user.profile.email}</p>
                <pre>${JSON.stringify(user.profile, null, 2)}</pre>
            </body>
        </html>
    `);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
