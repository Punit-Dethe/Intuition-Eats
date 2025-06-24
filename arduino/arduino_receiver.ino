void setup() {
  // Initialize Serial for debugging
  Serial.begin(9600);
  
  Serial.println("Arduino Receiver Ready");
  Serial.println("---------------------");
}

void loop() {
  // Check if data is available to read
  if (Serial.available() > 0) {
    // Read the incoming code
    int code = Serial.parseInt();
    
    // Only process if we got a valid number (not 0 from empty line)
    if (code > 0) {
      // Print the received code
      Serial.print("Received code from ESP32: ");
      Serial.println(code);
      
      // Here you can add your code to handle different motor numbers
      switch(code) {
        case 1:
          Serial.println("Activating Pizza motor");
          break;
        case 2:
          Serial.println("Activating Burger motor");
          break;
        case 3:
          Serial.println("Activating Fries motor");
          break;
        case 4:
          Serial.println("Activating Dessert motor");
          break;
        default:
          Serial.println("Unknown code received");
      }
    }
  }
} 