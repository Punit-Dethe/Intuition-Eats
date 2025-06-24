#define RXp2 16
#define TXp2 17

// L298N Motor Driver Pin Definitions
// Motor 1 (Categories 1 and 3)
const int ENA = 10;  // Enable motor 1
const int IN1 = 9;   // Motor 1 input 1
const int IN2 = 8;   // Motor 1 input 2

// Motor 2 (Categories 2 and 4)
const int ENB = 5;   // Enable motor 2
const int IN3 = 7;   // Motor 2 input 1
const int IN4 = 6;   // Motor 2 input 2

// Motor speeds (0-255)
const int MOTOR_SPEED = 200;
const int MOTOR_RUN_TIME = 1000;  // Time to run motor in milliseconds

void setup() {
  Serial.begin(9600);
  delay(1000);  // Give serial time to initialize
  Serial.println("Arduino Ready");
}

void loop() {
  if (Serial.available()) {
    String message = Serial.readStringUntil('\n');
    message.trim();
    
    Serial.println("----------------------------------------");
    Serial.print("Received message: ");
    Serial.println(message);
    
    // Send confirmation back to ESP32
    Serial.println("ACK:" + message);
    Serial.println("----------------------------------------");
  }
}

void handleTextCommand(String text) {
    Serial.print("Processing text: ");
    Serial.println(text);
    
    // Convert text to lowercase for easier comparison
    text.toLowerCase();
    
    // Check text content and activate appropriate motor
    if (text.indexOf("pizza") >= 0 || text.indexOf("burger") >= 0) {
        // Category 1: Pizza and Burger
        runMotor(ENA, IN1, IN2, MOTOR_SPEED);
        delay(MOTOR_RUN_TIME);
        stopMotor(ENA, IN1, IN2);
    }
    else if (text.indexOf("fries") >= 0 || text.indexOf("dessert") >= 0) {
        // Category 2: Fries and Dessert
        runMotor(ENB, IN3, IN4, MOTOR_SPEED);
        delay(MOTOR_RUN_TIME);
        stopMotor(ENB, IN3, IN4);
    }
    else {
        Serial.println("No matching category found");
    }
}

void runMotor(int enablePin, int in1, int in2, int speed) {
    analogWrite(enablePin, speed);
    digitalWrite(in1, HIGH);
    digitalWrite(in2, LOW);
}

void stopMotor(int enablePin, int in1, int in2) {
    analogWrite(enablePin, 0);
    digitalWrite(in1, LOW);
    digitalWrite(in2, LOW);
}

void stopAllMotors() {
    stopMotor(ENA, IN1, IN2);
    stopMotor(ENB, IN3, IN4);
} 