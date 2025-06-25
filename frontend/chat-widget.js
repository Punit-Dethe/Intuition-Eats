// Chat Widget Module
const ChatWidget = {
    // Properties
    container: null,
    micButton: null,
    speechBubble: null,
    isRecording: false,
    recognition: null,
    synth: window.speechSynthesis,
    selectedVoice: null,
    speaking: false,
    currentSpeech: null,
    isProcessing: false,

    // Initialize the chat widget
    init() {
        // Check if chat widget already exists
        if (document.getElementById('chat-widget-container')) {
            return; // Don't create another instance
        }

        // Create container
        this.container = document.createElement('div');
        this.container.id = 'chat-widget-container';
        this.container.innerHTML = `
            <button class="mic-button" title="Click to start/stop recording">
                <i class="fas fa-microphone"></i>
            </button>
            <div class="speech-bubble"></div>
        `;
        document.body.appendChild(this.container);

        // Get references to elements
        this.micButton = this.container.querySelector('.mic-button');
        this.speechBubble = this.container.querySelector('.speech-bubble');

        // Initialize speech recognition
        this.initializeSpeechRecognition();

        // Add event listeners
        this.addEventListeners();

        // Check for ongoing speech
        this.checkOngoingSpeech();
    },

    // Initialize speech recognition
    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                this.handleSpeechInput(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopRecording();
            };

            this.recognition.onend = () => {
                if (this.isRecording) {
                    this.recognition.start();
                }
            };
        } else {
            console.error('Speech recognition not supported');
        }
    },

    // Add event listeners
    addEventListeners() {
        this.micButton.addEventListener('click', () => this.toggleRecording());
        
        // Touch events for mobile
        this.micButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.toggleRecording();
        });
    },

    // Toggle recording
    toggleRecording() {
        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    },

    // Start recording
    startRecording() {
        if (!this.recognition) return;
        
        this.isRecording = true;
        this.micButton.classList.add('recording');
        this.speechBubble.textContent = 'Recording... Click again to stop';
        this.speechBubble.classList.add('show');
        this.recognition.start();
    },

    // Stop recording
    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        this.micButton.classList.remove('recording');
        this.speechBubble.textContent = 'Processing...';
        this.recognition.stop();
    },

    // Handle speech input
    async handleSpeechInput(transcript) {
        if (!this.isRecording) {
            this.speechBubble.textContent = transcript;
            this.speechBubble.classList.add('show');
            this.isProcessing = true;

            try {
                const response = await fetch('http://localhost:3000/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: transcript })
                });

                const data = await response.json();
                console.log('Received response:', data); // Debug log
                
                // Handle different response types
                if (data.type === 'navigation') {
                    // Speak the navigation message
                    this.speakResponse(data.message);
                    // Navigate to the product after a short delay
                    setTimeout(() => {
                        window.location.href = `product.html?id=${data.productId}`;
                    }, 1500);
                } else if (data.type === 'info_and_navigate') {
                    // Speak the message
                    this.speakResponse(data.message);
                    // Navigate to the product after a longer delay to allow for the info to be heard
                    setTimeout(() => {
                        window.location.href = `product.html?id=${data.productId}`;
                    }, 5000);
                } else {
                    // Handle regular message
                    this.speakResponse(data.message || data.response);
                }
            } catch (error) {
                console.error('Error:', error);
                this.speakResponse('Sorry, I encountered an error. Please try again.');
            }
        }
    },

    // Speak response
    speakResponse(text) {
        if (this.speaking) {
            window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        this.speaking = true;
        this.currentSpeech = utterance;

        utterance.onend = () => {
            this.speaking = false;
            this.currentSpeech = null;
            this.speechBubble.classList.remove('show');
        };

        window.speechSynthesis.speak(utterance);
    },

    // Check for ongoing speech
    checkOngoingSpeech() {
        setInterval(() => {
            if (this.speaking && this.currentSpeech) {
                this.speechBubble.textContent = this.currentSpeech.text;
                this.speechBubble.classList.add('show');
            }
        }, 100);
    },

    // Add styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #chat-widget-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
            }

            .mic-button {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                border: none;
                background: var(--primary);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
                transition: all 0.3s ease;
            }

            .mic-button i {
                font-size: 24px;
            }

            .mic-button:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
            }

            .mic-button.recording {
                background: var(--accent);
                animation: pulse 1.5s infinite;
                box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.4);
            }

            .speech-bubble {
                position: absolute;
                bottom: calc(100% + 30px);
                right: 0;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: white;
                padding: 12px 20px;
                border-radius: 12px;
                margin-bottom: 15px;
                min-width: 200px;
                max-width: 400px;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
                pointer-events: none;
                display: none;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.1),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
                font-size: 14px;
                line-height: 1.5;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .speech-bubble::before {
                content: '';
                position: absolute;
                bottom: -8px;
                right: 20px;
                width: 16px;
                height: 16px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transform: rotate(45deg);
                box-shadow: 
                    4px 4px 8px rgba(0, 0, 0, 0.1),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
            }

            .speech-bubble.show {
                opacity: 1;
                transform: translateY(0);
                display: block;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes pulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234, 67, 53, 0.4); }
                70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(234, 67, 53, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(234, 67, 53, 0); }
            }

            .loading-container {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: var(--primary);
                animation: spin 1s linear infinite;
            }

            .loading-text {
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Initialize chat widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ChatWidget.init();
}); 