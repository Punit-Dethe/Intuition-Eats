const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const axios = require('axios');
const { generateTasteProfile, findClosestMenuItem } = require('./taste_profile');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Create WebSocket server
let wss;
try {
    wss = new WebSocket.Server({ port: 8080 });
    console.log('WebSocket server started on port 8080');
} catch (error) {
    console.error('Failed to start WebSocket server on port 8080:', error);
    // Try alternative port
    try {
        wss = new WebSocket.Server({ port: 8081 });
        console.log('WebSocket server started on port 8081');
    } catch (error) {
        console.error('Failed to start WebSocket server on alternative port:', error);
        process.exit(1);
    }
}

// Store connected ESP32 clients with additional metadata
const esp32Clients = new Map();

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`New WebSocket connection from ${clientIp}`);
    
    // Send immediate welcome message
    ws.send('SERVER_READY');
    
    // Setup ping-pong for connection keepalive
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
        console.log(`Received pong from ${clientIp}`);
    });
    
    ws.on('message', async (message) => {
        try {
            const messageStr = message.toString();
            console.log(`Received message from ${clientIp}:`, messageStr);

            // Handle ESP32 connection message
            if (messageStr.includes('ESP32')) {
                console.log(`ESP32 connected from ${clientIp}`);
                esp32Clients.set(ws, {
                    ip: clientIp,
                    lastSeen: Date.now(),
                    connectionTime: Date.now()
                });
                
                // Send confirmation to ESP32
                ws.send('ESP32_CONNECTED');
                return;
            }

            // Try to parse as JSON for other messages
            try {
                const data = JSON.parse(messageStr);
                if (data.type === 'chat_message') {
                    // Create a prompt for Gemini to be more conversational
                    const prompt = `You are a friendly and helpful restaurant assistant. You can engage in normal conversation, but you also have special abilities:

1. You can answer questions about our menu items
2. You can help customers find similar items based on taste preferences
3. You can help navigate to specific menu items

Our Menu Items:
${menuData.categories.map(cat => `
${cat.name}:
${cat.products.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}`).join('\n')}

Be friendly and conversational in your responses. Only use special commands when needed:

For navigation:
- If they want to see a specific item, respond with: "NAVIGATE_TO_PRODUCT:{product_id}"
- If they want both info and navigation, respond with: "INFO_AND_NAVIGATE:{product_id}:{your response}"

For taste profile analysis:
- If they ask about a food item not on our menu, analyze its taste characteristics and recommend a similar item from our menu
- Format the taste profile response as: "TASTE_PROFILE:{food_item}"

Otherwise, just chat naturally!`;
                    
                    const model = genAI.getGenerativeModel({ 
                        model: "gemini-2.0-flash-lite",
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 100,
                        }
                    });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();
                    
                    console.log('Gemini Response:', text);
                    
                    // Check if this is a navigation command (anywhere in the text)
                    if (text.includes('NAVIGATE_TO_PRODUCT:')) {
                        const productId = text.split('NAVIGATE_TO_PRODUCT:')[1].split('\n')[0].trim();
                        console.log('Navigation requested for product:', productId);
                        
                        // Send response back to client
                        ws.send(JSON.stringify({
                            type: 'navigation',
                            productId: productId,
                            message: "I'll take you there right away!"
                        }));
                    }
                    // Check if this is a combined info and navigation command (anywhere in the text)
                    else if (text.includes('INFO_AND_NAVIGATE:')) {
                        const parts = text.split('INFO_AND_NAVIGATE:')[1].split('\n')[0].trim().split(':');
                        const productId = parts[0];
                        const info = parts.slice(1).join(':');
                        
                        console.log('Info and navigation requested for product:', productId);

                        // Send response back to client
                        ws.send(JSON.stringify({
                            type: 'info_and_navigate',
                            productId: productId,
                            message: `${info} Let me take you there!`
                        }));
                    }
                    // Check if this is a taste profile request
                    else if (text.startsWith('TASTE_PROFILE:')) {
                        const foodItem = text.split(':')[1];
                        // Create a prompt for taste analysis
                        const tastePrompt = `You are a restaurant assistant helping to find similar menu items based on taste profiles. Your task is to:

1. Analyze the following food request: "${foodItem}"
2. Create a taste profile internally (DO NOT include this in your response)
3. Find the closest matching item from our menu
4. Return ONLY the recommendation with navigation command

Available Menu Items:
${menuData.categories.map(cat => `
${cat.name}:
${cat.products.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}`).join('\n')}

IMPORTANT: Your response should ONLY include the recommendation part. DO NOT include any taste profile analysis or percentages. Format your response exactly like this:

Based on the taste profile of "${foodItem}", I recommend the {menu_item} from our menu. This dish shares similar characteristics with what you're looking for, particularly in terms of {mention 2-3 key taste characteristics that match}. NAVIGATE_TO_PRODUCT:{product_id}

Example response:
Based on the taste profile of "Shawarma", I recommend the Pepperoni Pizza from our menu. This dish shares similar characteristics with what you're looking for, particularly in terms of its savory umami flavor and rich, meaty profile. NAVIGATE_TO_PRODUCT:pizza2

Remember: Only return the recommendation text followed by the navigation command. Do not include any taste profile analysis or percentages.`;
                        
                        const tasteModel = genAI.getGenerativeModel({ 
                            model: "gemini-2.0-flash-lite",
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 500,
                            }
                        });
                        const tasteResult = await tasteModel.generateContent(tastePrompt);
                        const tasteResponse = await tasteResult.response;
                        const tasteText = tasteResponse.text();
                        
                        console.log('Gemini Taste Response:', tasteText);
                        
                        // Check if the response includes a navigation command
                        if (tasteText.includes('NAVIGATE_TO_PRODUCT:')) {
                            const productId = tasteText.split('NAVIGATE_TO_PRODUCT:')[1].split('\n')[0].trim();
                            console.log('Navigation requested for product:', productId);
                            
                            // Send response back to client with navigation
                            ws.send(JSON.stringify({
                                type: 'navigation',
                                productId: productId,
                                message: "I'll take you there right away!"
                            }));
                        } else {
                            // If no navigation command found, send error
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Sorry, I could not find a matching product to navigate to.'
                            }));
                        }
                    }
                    // If it's not a special command, just send the normal response
                    else {
                        ws.send(JSON.stringify({
                            type: 'message',
                            message: text
                        }));
                    }
                }
            } catch (e) {
                console.log(`Non-JSON message from ${clientIp}:`, messageStr);
            }
        } catch (error) {
            console.error(`Error processing message from ${clientIp}:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error processing your request'
            }));
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error from ${clientIp}:`, error);
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${clientIp}`);
        esp32Clients.delete(ws);
    });
});

// Implement ping-pong interval to keep connections alive
const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            esp32Clients.delete(ws);
            return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // Check every 30 seconds

wss.on('close', () => {
    clearInterval(pingInterval);
});

// Function to send command to ESP32
function sendToESP32(categoryNumber) {
    const command = `MOTOR:${categoryNumber}\n`;
    console.log('Attempting to send command to ESP32 clients:', command);
    
    esp32Clients.forEach((clientInfo, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(command);
                console.log(`Sent command to ESP32 at ${clientInfo.ip}: ${command}`);
                
                // Update last seen timestamp
                clientInfo.lastSeen = Date.now();
            } catch (error) {
                console.error(`Error sending command to ESP32 at ${clientInfo.ip}:`, error);
            }
        } else {
            console.log(`ESP32 at ${clientInfo.ip} not ready. State: ${ws.readyState}`);
        }
    });
}

// Validate environment variables
if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in environment variables');
    process.exit(1);
}

// Initialize Gemini 2.0 Flash-Lite
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-lite",
    generationConfig: {
        temperature: 0.7, // Increased temperature for more creative responses
        candidateCount: 1,
        maxOutputTokens: 500,
    }
});

// Load menu data
let menuData = null;
try {
    const menuPath = path.join(__dirname, 'menu.json');
    menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
    console.log('Menu data loaded successfully');
    console.log('Categories:', menuData.categories.map(cat => cat.name));
    console.log('Total products:', menuData.categories.reduce((acc, cat) => acc + cat.products.length, 0));
} catch (error) {
    console.error('Error loading menu data:', error);
}

// Create a map for quick access to products by ID
const productMap = new Map();
menuData.categories.forEach(category => {
    category.products.forEach(product => {
        productMap.set(product.id, product);
    });
});

// Create a map for quick access to products by name (case-insensitive)
const productNameMap = new Map();
menuData.categories.forEach(category => {
    category.products.forEach(product => {
        productNameMap.set(product.name.toLowerCase(), product.id);
    });
});

// Create a structured prompt for Gemini
function createMenuPrompt() {
    let prompt = `You are a friendly and helpful restaurant assistant. You can engage in normal conversation, but you also have special abilities:

1. You can answer questions about our menu items
2. You can help customers find similar items based on taste preferences
3. You can help navigate to specific menu items

Available Categories:
${menuData.categories.map(cat => `- ${cat.name}`).join('\n')}

Available Products (with their IDs):
${menuData.categories.map(cat => `
${cat.name}:
${cat.products.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}`).join('\n')}

IMPORTANT: When a customer mentions a food item (whether it's on our menu or not), immediately:
1. Create a taste profile for that food
2. Find the closest matching item from our menu (ONLY recommend items that are actually on our menu)
3. Navigate to that item

For taste profile analysis and navigation:
- If they mention any food item, respond with: "TASTE_PROFILE:{food_item}"
- After analyzing the taste profile, you MUST include a navigation command to the recommended product
- Format: "Based on the taste profile, I recommend {menu_item}. NAVIGATE_TO_PRODUCT:{product_id}"
- When recommending a product, be conversational and mention why it's a good match

Example responses:
1. For food mention: "I'll analyze the taste profile of Shawarma and find you a similar item from our menu. TASTE_PROFILE:Shawarma"
2. For direct navigation: "I'll take you to the Margherita Pizza. NAVIGATE_TO_PRODUCT:pizza1"
3. For info and navigation: "The Margherita Pizza is a classic Italian pizza with fresh tomatoes and mozzarella. INFO_AND_NAVIGATE:pizza1:The Margherita Pizza is a classic Italian pizza with fresh tomatoes and mozzarella"

Otherwise, just chat naturally!`;

    return prompt;
}

// Menu API endpoint
app.get('/api/menu', (req, res) => {
    if (!menuData) {
        return res.status(500).json({ error: 'Menu data not available' });
    }
    
    // Ensure all image URLs are absolute
    const processedMenuData = JSON.parse(JSON.stringify(menuData));
    processedMenuData.categories.forEach(category => {
        category.products.forEach(product => {
            if (product.image_url && !product.image_url.startsWith('http')) {
                product.image_url = `https://${product.image_url}`;
            }
        });
    });
    
    res.json(processedMenuData);
});

// Get product by ID endpoint
app.get('/api/product/:id', (req, res) => {
    const product = productMap.get(req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
});

// Test endpoint to verify menu data and Gemini response
app.get('/api/test-menu', async (req, res) => {
    try {
        // Log the menu prompt
        const menuPrompt = createMenuPrompt();
        console.log('Menu Prompt Length:', menuPrompt.length);
        console.log('First 500 characters of prompt:', menuPrompt.substring(0, 500));

        // Test with a simple question
        const testQuestion = "What is the price of the Margherita Pizza?";
        const prompt = `${menuPrompt}\n\nCustomer Question: ${testQuestion}\nAssistant:`;
        
        console.log('Sending prompt to Gemini...');
        const result = await model.generateContent(prompt);
        const text = (await result.response).text();
        
        console.log('Gemini Response:', text);
        
        res.json({
            success: true,
            menuLoaded: !!menuData,
            categories: menuData?.categories.map(cat => cat.name),
            totalProducts: menuData?.categories.reduce((acc, cat) => acc + cat.products.length, 0),
            promptLength: menuPrompt.length,
            testResponse: text
        });
    } catch (error) {
        console.error('Test Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            menuLoaded: !!menuData
        });
    }
});

// Simplified test connection
async function testApiConnection() {
    try {
        const result = await model.generateContent("test");
        await result.response;
        console.log('Gemini 2.0 Flash-Lite Connected');
    } catch (error) {
        console.error('API Connection Failed:', error.message);
        process.exit(1);
    }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const menuPrompt = createMenuPrompt();
        
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: menuPrompt
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
            },
        });

        const result = await chat.sendMessage(message);
        const response = result.response.text();
        console.log('Gemini response:', response); // Debug log

        // Check if this is a taste profile request
        if (response.includes('TASTE_PROFILE:')) {
            const foodItem = response.split('TASTE_PROFILE:')[1].split('\n')[0].trim();
            console.log('Analyzing taste profile for:', foodItem);
            
            // Create a prompt for taste analysis
            const tastePrompt = `You are a restaurant assistant helping to find similar menu items based on taste profiles. Your task is to:

1. Analyze the following food request: "${foodItem}"
2. Create a taste profile internally (DO NOT include this in your response)
3. Find the closest matching item from our menu
4. Return ONLY the recommendation with navigation command

Available Menu Items:
${menuData.categories.map(cat => `
${cat.name}:
${cat.products.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}`).join('\n')}

IMPORTANT: Your response should ONLY include the recommendation part. DO NOT include any taste profile analysis or percentages. Format your response exactly like this:

Based on the taste profile of "${foodItem}", I recommend the {menu_item} from our menu. This dish shares similar characteristics with what you're looking for, particularly in terms of {mention 2-3 key taste characteristics that match}. NAVIGATE_TO_PRODUCT:{product_id}

Example response:
Based on the taste profile of "Shawarma", I recommend the Pepperoni Pizza from our menu. This dish shares similar characteristics with what you're looking for, particularly in terms of its savory umami flavor and rich, meaty profile. NAVIGATE_TO_PRODUCT:pizza2

Remember: Only return the recommendation text followed by the navigation command. Do not include any taste profile analysis or percentages.`;
            
            const tasteModel = genAI.getGenerativeModel({ 
                model: "gemini-2.0-flash-lite",
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                }
            });
            const tasteResult = await tasteModel.generateContent(tastePrompt);
            const tasteResponse = await tasteResult.response;
            const tasteText = tasteResponse.text();
            
            console.log('Gemini Taste Response:', tasteText);
            
            // Check if the response includes a navigation command
            if (tasteText.includes('NAVIGATE_TO_PRODUCT:')) {
                const productId = tasteText.split('NAVIGATE_TO_PRODUCT:')[1].split('\n')[0].trim();
                console.log('Navigation requested for product:', productId);
                
                // Extract just the recommendation part (before the navigation command)
                const recommendationText = tasteText.split('NAVIGATE_TO_PRODUCT:')[0].trim();
                
                // Send response back to client with navigation
                res.json({
                    type: 'navigation',
                    productId: productId,
                    message: recommendationText // Only send the recommendation part
                });
            } else {
                // If no navigation command found, send error
                res.json({
                    type: 'error',
                    message: 'Sorry, I could not find a matching product to navigate to.'
                });
            }
        }
        // Check if the response is a navigation command
        else if (response.includes('NAVIGATE_TO_PRODUCT:')) {
            const productId = response.split('NAVIGATE_TO_PRODUCT:')[1].split('\n')[0].trim();
            console.log('Navigation requested for product:', productId);
            res.json({ 
                type: 'navigation',
                productId: productId,
                message: "I'll take you there right away!"
            });
        } 
        // Check if the response is a combined info and navigation command
        else if (response.includes('INFO_AND_NAVIGATE:')) {
            const parts = response.split('INFO_AND_NAVIGATE:')[1].split('\n')[0].trim().split(':');
            const productId = parts[0];
            const info = parts.slice(1).join(':');
            
            console.log('Info and navigation requested for product:', productId);
            res.json({ 
                type: 'info_and_navigate',
                productId: productId,
                message: `${info} Let me take you there!`,
                info: info
            });
        }
        else {
            res.json({ 
                type: 'message',
                message: response 
            });
        }
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
});

// Category mapping for ESP32
const categoryMap = {
    'pizza': 1,
    'burger': 2,
    'fries': 3,
    'dessert': 4
};

// Order endpoint
app.post('/api/order', async (req, res) => {
    try {
        const { productId } = req.body;
        console.log('Received order for product:', productId);
        
        // Extract category from product ID (e.g., "pizza1" -> "pizza")
        const category = productId.replace(/\d+$/, '');
        const categoryNumber = categoryMap[category];

        if (!categoryNumber) {
            console.error('Invalid product category:', category);
            return res.status(400).json({ error: 'Invalid product category' });
        }

        console.log(`Sending category ${categoryNumber} to ESP32 for ${category}`);

        // Send command to ESP32
        sendToESP32(categoryNumber);

        // Check if we have any connected ESP32 clients
        if (esp32Clients.size === 0) {
            console.warn('No ESP32 clients connected');
            return res.status(503).json({ 
                warning: 'No ESP32 devices connected',
                success: false
            });
        }

        res.json({ 
            success: true, 
            message: 'Order sent to ESP32',
            category: categoryNumber,
            connectedDevices: esp32Clients.size
        });
    } catch (error) {
        console.error('Order error:', error);
        res.status(500).json({ error: 'Failed to process order' });
    }
});

// Health endpoint
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ElevenLabs TTS endpoint
app.post('/api/tts', async (req, res) => {
    try {
        const { text } = req.body;
        console.log('TTS Request received:', { text: text.substring(0, 50) + '...' });
        
        if (!text) {
            console.log('TTS Error: No text provided');
            return res.status(400).json({ error: 'Text is required' });
        }

        if (!process.env.ELEVENLABS_API_KEY) {
            console.error('TTS Error: ELEVENLABS_API_KEY is not set');
            return res.status(500).json({ error: 'API key not configured' });
        }

        if (!process.env.ELEVENLABS_VOICE_ID) {
            console.error('TTS Error: ELEVENLABS_VOICE_ID is not set');
            return res.status(500).json({ error: 'Voice ID not configured' });
        }

        console.log('TTS Request:', {
            text: text.substring(0, 50) + '...', // Log first 50 chars
            voiceId: process.env.ELEVENLABS_VOICE_ID,
            apiKey: process.env.ELEVENLABS_API_KEY.substring(0, 10) + '...' // Log first 10 chars of API key
        });

        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
            {
                text: text,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            },
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                responseType: 'arraybuffer'
            }
        );

        console.log('TTS Response received successfully');
        
        // Convert the audio buffer to base64
        const audioBase64 = Buffer.from(response.data).toString('base64');
        
        res.json({ audio: audioBase64 });
    } catch (error) {
        console.error('TTS Error Details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers
        });
        res.status(500).json({ 
            error: 'Failed to generate speech',
            details: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
console.log('Environment PORT:', process.env.PORT);
console.log('Using PORT:', PORT);

// Start server
async function startServer() {
    try {
        await testApiConnection();
        app.listen(PORT, () => console.log(`Server running on ${PORT}`));
    } catch (error) {
        console.error('Server Error:', error);
        process.exit(1);
    }
}

startServer(); 