require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('isomorphic-fetch');
const path = require('path');
const cors = require('cors');
const Redis = require('ioredis');

const app = express();
const port = 42000;

// Initialize Redis client
const redis = new Redis({
    host: '127.0.0.1', // Update if your Redis server is remote
    port: 6379,        // Default Redis port
    password: process.env.REDIS_PASSWORD, // Optional if Redis requires authentication
});

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(cors());

const thresholdScore = 0.5;

const accessDenied = (res) => {
    res.status(403).json({ "message": "Access denied" });
};

const offerDownload = async (req, res) => {
    const resumePath = path.join(__dirname, 'resume_hwilliams.pdf');
    const userIP = req.ip;

    try {
        // Add IP to Redis set for unique tracking
        await redis.sadd('unique_ips', userIP);

        res.download(resumePath, 'resume_hwilliams.pdf', (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ "message": "Error sending file" });
            }
        });
    } catch (error) {
        console.error('Error interacting with Redis:', error);
        res.status(500).json({ "message": "Internal server error" });
    }
};

const receiveScore = (req, res, google_response) => {
    const score = google_response.score || 0;
    if (score < thresholdScore) {
        return accessDenied(res);
    }
    return offerDownload(req, res);
};

const handleSend = (req, res) => {
    const secret_key = process.env.SECRET_KEY;
    const token = req.body.token;

    if (!token) {
        return res.status(400).json({ "message": "Token missing" });
    }

    const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`;
    console.log("offered");
    fetch(url, { method: 'post' })
        .then(response => response.json())
        .then(google_response => {
            if (!google_response.success) {
                return res.status(400).json({ "message": "CAPTCHA verification failed" });
            }
            receiveScore(req, res, google_response);
        })
        .catch(error => {
            console.error('Error verifying CAPTCHA:', error);
            res.status(500).json({ "message": "Internal server error" });
        });
};

app.post('/resume', handleSend);

// Add /stats endpoint to return the number of unique addresses
app.get('/stats', async (req, res) => {
    try {
        // Get the count of unique IPs from Redis set
        const uniqueCount = await redis.scard('unique_ips');
        res.json({ uniqueDownloads: uniqueCount });
    } catch (error) {
        console.error('Error retrieving stats from Redis:', error);
        res.status(500).json({ "message": "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}!`);
});