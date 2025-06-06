const Groq = require("groq-sdk");
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');

const groq = new Groq({
    apiKey: "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"
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Store active connections
const activeConnections = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    // Generate a unique ID for this connection
    const connectionId = Date.now().toString();
    activeConnections.set(connectionId, ws);
    
    // Handle incoming messages
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'prompt') {
                const userPrompt = data.prompt || 'How can I help you?';
                
                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: userPrompt }],
                    model: "llama3-70b-8192",
                    temperature: 0.7
                });

                const response = chatCompletion.choices[0]?.message?.content;
                
                ws.send(JSON.stringify({
                    type: 'response',
                    content: response
                }));
            }
        } catch (error) {
            console.error("WebSocket Error:", error);
            ws.send(JSON.stringify({
                type: 'error',
                content: 'Failed to process the prompt'
            }));
        }
    });
    
    // Handle connection close
    ws.on('close', () => {
        console.log('WebSocket connection closed');
        activeConnections.delete(connectionId);
    });
});

// HTTP route for fallback or non-WebSocket clients
app.post('/get-response', async (req, res) => {
    try {
        const userPrompt = req.body.prompt || 'How can I help you?';
        
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: userPrompt }],
            model: "llama3-70b-8192",
            temperature: 0.7
        });

        const response = chatCompletion.choices[0]?.message?.content;
        
        res.json({
            success: true,
            response: response
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to process the prompt"
        });
    }
});

// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`WebSocket server running at ws://localhost:${port}`);
});