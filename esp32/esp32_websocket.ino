#include <WiFi.h>
#include <WebSocketsClient.h>

// WiFi credentials
const char* ssid = "Dethe 2.4G";
const char* password = "Dethe@1803.";

// WebSocket server details
const char* websocket_server = "192.168.1.6";
const uint16_t websocket_port = 8080;

// UART settings for communication with Arduino
#define UART_BAUD 9600
#define UART_TX 17  // ESP32 TX pin
#define UART_RX 16  // ESP32 RX pin

WebSocketsClient webSocket;
bool isConnected = false;

void setup() {
    // Initialize Serial for debugging
    Serial.begin(115200);
    delay(1000);
    
    // Initialize UART for Arduino communication
    Serial2.begin(UART_BAUD, SERIAL_8N1, UART_RX, UART_TX);
    
    Serial.println("\nESP32 WebSocket Client");
    Serial.println("---------------------");
    
    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    // Connect to WebSocket server
    Serial.println("Connecting to WebSocket server...");
    webSocket.begin(websocket_server, websocket_port, "/");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
    webSocket.enableHeartbeat(15000, 3000, 2);
}

void loop() {
    webSocket.loop();

    // If WiFi is disconnected, try to reconnect
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi disconnected! Reconnecting...");
        WiFi.reconnect();
        delay(1000);
    }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("Disconnected from WebSocket server!");
            isConnected = false;
            break;
            
        case WStype_CONNECTED:
            Serial.println("Connected to WebSocket server!");
            isConnected = true;
            // Send identification message
            webSocket.sendTXT("ESP32 Ready");
            break;
            
        case WStype_TEXT: {
            String message = String((char*)payload);
            Serial.println("----------------------------------------");
            Serial.print("Received message: ");
            Serial.println(message);
            
            // Check if it's a motor command
            if (message.startsWith("MOTOR:")) {
                String codeStr = message.substring(6); // Skip "MOTOR:"
                int code = codeStr.toInt();
                Serial.print("Received code: ");
                Serial.println(code);
                
                // Send the code to Arduino via UART
                Serial2.print(code);  // Changed from println to print
                Serial2.write('\n');  // Send newline separately
                Serial.print("Sent code to Arduino: ");
                Serial.println(code);
                
                // Here you can add code to handle the motor number
                // For now, we'll just print it
                Serial.print("Motor category: ");
                switch(code) {
                    case 1:
                        Serial.println("Pizza");
                        break;
                    case 2:
                        Serial.println("Burger");
                        break;
                    case 3:
                        Serial.println("Fries");
                        break;
                    case 4:
                        Serial.println("Dessert");
                        break;
                    default:
                        Serial.println("Unknown category");
                }
            }
            Serial.println("----------------------------------------");
            break;
        }
            
        case WStype_ERROR:
            Serial.println("WebSocket error occurred!");
            break;
    }
} 