#include <WiFi.h>
#include <WebSocketsClient.h>

// WiFi credentials
const char* ssid = "Dethe 2.4G";
const char* password = "Dethe@1803.";

// WebSocket server details
const char* websocket_server = "192.168.1.5";  // Your computer's IP address
const uint16_t websocket_port = 8080;

// Serial communication with Arduino UNO
#define ARDUINO_SERIAL Serial2  // Using Serial2 for ESP32 to Arduino communication
#define ARDUINO_BAUD 9600

WebSocketsClient webSocket;

void setup() {
    // Initialize Serial for debugging
    Serial.begin(115200);
    ARDUINO_SERIAL.begin(ARDUINO_BAUD);
    delay(1000); // Give serial monitor time to start
    
    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Connect to WebSocket server
    Serial.print("Connecting to WebSocket server at ");
    Serial.print(websocket_server);
    Serial.print(":");
    Serial.println(websocket_port);
    
    // Try to connect to server
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WiFi is connected, attempting WebSocket connection...");
        
        // Configure WebSocket client
        webSocket.begin(websocket_server, websocket_port, "/");
        webSocket.onEvent(webSocketEvent);
        webSocket.setReconnectInterval(5000);
        webSocket.enableHeartbeat(15000, 3000, 2);
        
        Serial.println("WebSocket connection initiated");
    } else {
        Serial.println("WiFi is not connected!");
    }
}

void loop() {
    webSocket.loop();
    
    // Check WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected! Reconnecting...");
        WiFi.reconnect();
    }
    
    // Send test message to Arduino every 5 seconds
    static unsigned long lastMessage = 0;
    if (millis() - lastMessage > 5000) {
        lastMessage = millis();
        
        // Send test message to Arduino
        Serial.println("----------------------------------------");
        Serial.println("Sending test message to Arduino...");
        ARDUINO_SERIAL.println("Test message from ESP32");
        
        // Wait for Arduino response
        delay(100);
        if (ARDUINO_SERIAL.available()) {
            String response = ARDUINO_SERIAL.readStringUntil('\n');
            Serial.print("Arduino response: ");
            Serial.println(response);
        }
        Serial.println("----------------------------------------");
    }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    String message;  // Declare message variable outside switch statement
    
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("Disconnected from WebSocket server!");
            Serial.println("Attempting to reconnect...");
            webSocket.begin(websocket_server, websocket_port, "/");
            break;
            
        case WStype_CONNECTED:
            Serial.println("Connected to WebSocket server!");
            Serial.println("Ready to receive commands!");
            break;
            
        case WStype_TEXT:
            // Convert payload to string
            message = String((char*)payload);
            Serial.println("----------------------------------------");
            Serial.print("Received from website: ");
            Serial.println(message);
            
            // Forward message to Arduino
            ARDUINO_SERIAL.println(message);
            
            // Wait for Arduino response
            delay(100);
            if (ARDUINO_SERIAL.available()) {
                String response = ARDUINO_SERIAL.readStringUntil('\n');
                Serial.print("Arduino response: ");
                Serial.println(response);
            }
            Serial.println("----------------------------------------");
            break;
            
        case WStype_ERROR:
            Serial.println("WebSocket error occurred!");
            break;
            
        case WStype_PING:
            Serial.println("Received ping from server");
            break;
            
        case WStype_PONG:
            Serial.println("Received pong from server");
            break;
    }
} 