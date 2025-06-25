# AI Menu Project

[Live Demo](https://intuition-eats-gcxf.onrender.com/categories.html)

## Overview

The AI Menu Project is an interactive digital menu system designed to provide a modern and engaging experience for users in a restaurant or food service setting. It features a web-based frontend for browsing the menu, an AI-powered chatbot (Google Gemini) for assistance and recommendations, and integration with hardware (ESP32/Arduino) to simulate order processing and real-world actions like food preparation.

## Features

-   **Interactive Digital Menu:** Stylish interface with categories, product cards (images, prices, details).
-   **AI Chatbot (Gemini):**
    -   Answers general and menu-specific questions.
    -   Provides personalized recommendations based on taste profiles.
    -   Assists with navigating the menu.
    -   Supports text and voice input.
-   **Taste Profile System:**
    -   Describes food items using traits (spicy, sweet, crunchy, etc.).
    -   Offers recommendations based on user preferences.
-   **Order Placement & Hardware Integration:**
    -   Users can place orders through the website.
    -   Orders trigger commands sent to an ESP32 microcontroller.
    -   ESP32 communicates with an Arduino via UART to control motors or other hardware, simulating kitchen actions.
-   **Voice Features:**
    -   Speech-to-text for user input.
    -   Text-to-speech for AI responses (browser-based or ElevenLabs TTS).
-   **Multi-Page Interface:** Separate views for the main menu, categories, and product details.

## Tech Stack

-   **Frontend:**
    -   HTML, CSS, JavaScript
    -   UI Libraries (Chakra UI, MUI, Tailwind CSS, DaisyUI - *Note: Specific library used may need confirmation*)
    -   Web Speech API (for voice input/output)
-   **Backend:**
    -   Node.js
    -   Express.js
    -   WebSocket (for real-time communication with ESP32)
-   **AI:**
    -   Google Gemini API
-   **Hardware:**
    -   ESP32 (WiFi-enabled microcontroller)
    -   Arduino
    -   UART (for communication between ESP32 and Arduino)
-   **Data Format:**
    -   JSON (for menu data and API responses)

## Local Development Setup

### Prerequisites
- Node.js (v14 or later)
- npm (comes with Node.js)
- Google Gemini API Key
- (Optional) ElevenLabs API Key for TTS

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with your API keys:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_VOICE_ID=your_voice_id
   ```

4. Start the backend server:
   ```bash
   node server.js
   ```
   The backend will be available at `http://localhost:10000`

### Frontend Setup

1. In a new terminal, navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. (If using any frontend framework) Install dependencies:
   ```bash
   npm install
   ```

3. Update the `frontend/config.js` file if needed to point to your local backend:
   ```javascript
   const API_URL = 'http://localhost:10000';
   ```

4. Open `index.html` in your browser or use a local server:
   ```bash
   npx http-server -p 3000
   ```
   Then open `http://localhost:3000` in your browser.

## Project Structure

The project is organized into the following main directories:

```
.
├── arduino/            # Arduino sketches and related files
├── backend/            # Node.js backend server (Express.js, API, WebSocket)
├── esp32/              # ESP32 firmware and related files
├── frontend/           # HTML, CSS, JavaScript for the user interface
├── menu-data.json      # (or menu.json) Contains the menu items and categories
├── taste_profile.js    # Logic for taste profile recommendations (likely in backend)
├── PROJECT_EXPLANATION.md # Detailed explanation of the project
└── README.md           # This file
```

*(Note: The exact location of `menu-data.json` and `taste_profile.js` might vary, please adjust if necessary.)*

## Setup and Installation

*(This section provides a general guideline. Specific steps might vary based on the actual project implementation.)*

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd ai-menu-project
    ```

2.  **Frontend:**
    -   Navigate to the `frontend/` directory.
    -   Install dependencies (if any, e.g., `npm install` if using a framework like React/Vue/Angular, or if there are other JS dependencies).
    -   Serve the HTML files (e.g., using a live server extension in your IDE, or a simple HTTP server).

3.  **Backend:**
    -   Navigate to the `backend/` directory.
    -   Install Node.js dependencies:
        ```bash
        npm install
        ```
    -   Set up environment variables:
        -   Create a `.env` file in the `backend/` directory.
        -   Add necessary API keys (e.g., `GEMINI_API_KEY=your_gemini_api_key`).
    -   Start the backend server:
        ```bash
        npm start
        ```
        (or `node server.js`, `nodemon server.js`, etc., depending on your `package.json` scripts)

4.  **Hardware (ESP32 & Arduino):**
    -   **ESP32:**
        -   Open the ESP32 project (likely in `esp32/`) using PlatformIO or Arduino IDE.
        -   Configure WiFi credentials and backend server address.
        -   Upload the firmware to the ESP32 board.
    -   **Arduino:**
        -   Open the Arduino sketch (likely in `arduino/`) using Arduino IDE.
        -   Upload the sketch to the Arduino board.
        -   Ensure proper wiring between ESP32 and Arduino (for UART communication) and any connected motors/hardware.

5.  **Menu Data:**
    -   Ensure `menu-data.json` (or `menu.json`) is present and correctly formatted, accessible by the backend.

## Usage

1.  Ensure the backend server is running.
2.  Ensure the ESP32 is powered on, connected to WiFi, and successfully connected to the backend via WebSocket.
3.  Open the `index.html` file from the `frontend/` directory in your web browser.
4.  Browse the menu, interact with the AI chatbot, and place orders.
5.  Observe the hardware actions triggered by orders.

## API Endpoints (Conceptual)

Based on the project explanation, the backend likely exposes the following API endpoints:

-   `GET /api/menu`: Fetches the menu data.
-   `POST /api/chat`: Sends user messages to the Gemini AI and returns responses.
-   `POST /api/order`: Submits an order, which then triggers hardware interaction.

*(Actual endpoint paths and methods might differ.)*

## Hardware Flow

1.  User places an order on the website (Frontend).
2.  Frontend sends the order to the Backend Server (`/api/order`).
3.  Backend Server sends a command to the ESP32 via WebSocket.
4.  ESP32 receives the command and sends a UART signal to the Arduino.
5.  Arduino controls the motor/hardware as per the command.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

*(Please ensure your code adheres to the project's coding standards and includes tests where applicable.)*

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

*(Note: You'll need to create a `LICENSE` file with the MIT License text if you choose this license.)*

---

This `README.md` provides a comprehensive starting point. You can further customize it by:
- Adding a project logo or screenshots.
- Providing more specific setup/usage instructions if the general ones are not accurate.
- Detailing the UI library used in the frontend.
- Specifying the exact file names and paths if they differ from the placeholders. 