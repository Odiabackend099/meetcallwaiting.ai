/**
 * CallWaiting.ai Chat Widget with Voice AI
 * Professional chat widget with seamless voice capabilities
 * Security-compliant version with environment variables
 */

class CallWaitingChatWidget {
    constructor() {
        this.isOpen = false;
        this.isListening = false;
        this.isSpeaking = false;
        this.isThinking = false;
        this.audioEnabled = false;
        this.conversationHistory = [];
        
        // API configuration - will be set from backend
        this.apiBaseUrl = 'http://localhost:3002/api';
        this.groqApiKey = null; // Will be fetched from backend securely
        this.ttsUrl = 'http://localhost:3001/v1/synthesize';
        
        this.init();
    }

    async init() {
        await this.initializeAPI();
        this.createWidget();
        this.bindEvents();
        this.checkAudioSupport();
        this.addWelcomeMessage();
    }

    async initializeAPI() {
        try {
            // Fetch API configuration from backend
            const response = await fetch(`${this.apiBaseUrl}/chat/config`);
            if (response.ok) {
                const config = await response.json();
                this.groqApiKey = config.groqApiKey;
                this.ttsUrl = config.ttsUrl || this.ttsUrl;
            }
        } catch (error) {
            console.warn('Could not fetch API configuration, using fallback mode');
            // Fallback to text-only mode if API config fails
            this.groqApiKey = null;
        }
    }

    createWidget() {
        // Create widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'callwaiting-chat-widget';
        widgetContainer.innerHTML = `
            <div class="chat-widget-container">
                <!-- Chat Toggle Button -->
                <div class="chat-toggle-btn" id="chat-toggle">
                    <div class="chat-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="chat-notification" id="chat-notification"></div>
                </div>

                <!-- Chat Window -->
                <div class="chat-window" id="chat-window">
                    <div class="chat-header">
                        <div class="chat-title">
                            <div class="chat-avatar">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="chat-info">
                                <h3>CallWaiting.ai Assistant</h3>
                                <span class="chat-status" id="chat-status">Ready to help</span>
                            </div>
                        </div>
                        <div class="chat-controls">
                            <button class="voice-toggle-btn" id="voice-toggle" title="Toggle Voice Mode">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <button class="close-btn" id="close-chat" title="Close Chat">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="chat-messages" id="chat-messages">
                        <!-- Messages will be added here -->
                    </div>

                    <div class="chat-input-container">
                        <div class="voice-input-area" id="voice-input-area">
                            <div class="voice-visualizer" id="voice-visualizer">
                                <div class="voice-circle">
                                    <div class="voice-dot"></div>
                                </div>
                            </div>
                            <div class="voice-instructions">
                                <span id="voice-instruction">Hold to speak</span>
                            </div>
                        </div>
                        <div class="text-input-area" id="text-input-area">
                            <div class="input-group">
                                <input type="text" id="chat-input" placeholder="Type your message..." maxlength="1000">
                                <button class="send-btn" id="send-btn" title="Send Message">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <polygon points="22,2 15,22 11,13 2,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="input-mode-toggle">
                            <button class="mode-btn active" id="text-mode" data-mode="text">Text</button>
                            <button class="mode-btn" id="voice-mode" data-mode="voice">Voice</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(widgetContainer);
        this.addStyles();
    }

    addStyles() {
        const styles = `
            #callwaiting-chat-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .chat-widget-container {
                position: relative;
            }

            .chat-toggle-btn {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                position: relative;
                border: none;
            }

            .chat-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
            }

            .chat-icon {
                color: white;
                transition: transform 0.3s ease;
            }

            .chat-toggle-btn:hover .chat-icon {
                transform: rotate(10deg);
            }

            .chat-notification {
                position: absolute;
                top: -5px;
                right: -5px;
                width: 20px;
                height: 20px;
                background: #ff4757;
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            .chat-window {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 380px;
                height: 500px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                display: none;
                flex-direction: column;
                overflow: hidden;
                border: 1px solid #e1e8ed;
            }

            .chat-window.open {
                display: flex;
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .chat-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .chat-title {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .chat-avatar {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .chat-info h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .chat-status {
                font-size: 12px;
                opacity: 0.9;
            }

            .chat-controls {
                display: flex;
                gap: 8px;
            }

            .voice-toggle-btn,
            .close-btn {
                width: 32px;
                height: 32px;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .voice-toggle-btn:hover,
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.05);
            }

            .voice-toggle-btn.active {
                background: rgba(255, 255, 255, 0.3);
            }

            .chat-messages {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                background: #f8fafc;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .message {
                display: flex;
                gap: 8px;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .message.user {
                flex-direction: row-reverse;
            }

            .message-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .message.user .message-avatar {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-weight: bold;
                font-size: 12px;
            }

            .message.assistant .message-avatar {
                background: #e2e8f0;
                color: #4a5568;
            }

            .message-content {
                max-width: 80%;
                padding: 12px 16px;
                border-radius: 18px;
                font-size: 14px;
                line-height: 1.4;
            }

            .message.user .message-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .message.assistant .message-content {
                background: white;
                color: #2d3748;
                border: 1px solid #e2e8f0;
            }

            .message-time {
                font-size: 11px;
                opacity: 0.7;
                margin-top: 4px;
            }

            .typing-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: white;
                border-radius: 18px;
                border: 1px solid #e2e8f0;
                max-width: 80px;
            }

            .typing-dot {
                width: 8px;
                height: 8px;
                background: #cbd5e0;
                border-radius: 50%;
                animation: typing 1.4s infinite ease-in-out;
            }

            .typing-dot:nth-child(1) { animation-delay: -0.32s; }
            .typing-dot:nth-child(2) { animation-delay: -0.16s; }

            @keyframes typing {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }

            .chat-input-container {
                padding: 20px;
                background: white;
                border-top: 1px solid #e2e8f0;
            }

            .voice-input-area {
                display: none;
                text-align: center;
                padding: 20px;
            }

            .voice-input-area.active {
                display: block;
            }

            .voice-visualizer {
                margin-bottom: 16px;
            }

            .voice-circle {
                width: 80px;
                height: 80px;
                border: 3px solid #e2e8f0;
                border-radius: 50%;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                position: relative;
            }

            .voice-circle.listening {
                border-color: #ff4757;
                animation: pulse-red 1s infinite;
            }

            .voice-circle.speaking {
                border-color: #2ed573;
                animation: pulse-green 1s infinite;
            }

            @keyframes pulse-red {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes pulse-green {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            .voice-dot {
                width: 20px;
                height: 20px;
                background: #cbd5e0;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .voice-circle.listening .voice-dot {
                background: #ff4757;
                animation: pulse-dot 0.5s infinite;
            }

            .voice-circle.speaking .voice-dot {
                background: #2ed573;
            }

            @keyframes pulse-dot {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            .voice-instructions {
                color: #718096;
                font-size: 14px;
                font-weight: 500;
            }

            .text-input-area {
                display: block;
            }

            .text-input-area.hidden {
                display: none;
            }

            .input-group {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            #chat-input {
                flex: 1;
                padding: 12px 16px;
                border: 2px solid #e2e8f0;
                border-radius: 24px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s ease;
            }

            #chat-input:focus {
                border-color: #667eea;
            }

            .send-btn {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .send-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .send-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            .input-mode-toggle {
                display: flex;
                gap: 4px;
                margin-top: 12px;
                justify-content: center;
            }

            .mode-btn {
                padding: 6px 16px;
                border: 2px solid #e2e8f0;
                background: white;
                border-radius: 16px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                color: #718096;
            }

            .mode-btn.active {
                background: #667eea;
                border-color: #667eea;
                color: white;
            }

            .mode-btn:hover:not(.active) {
                border-color: #cbd5e0;
                color: #4a5568;
            }

            /* Mobile Responsive */
            @media (max-width: 480px) {
                #callwaiting-chat-widget {
                    bottom: 10px;
                    right: 10px;
                    left: 10px;
                }

                .chat-window {
                    width: 100%;
                    height: 80vh;
                    bottom: 80px;
                    right: 0;
                    left: 0;
                }

                .chat-toggle-btn {
                    width: 50px;
                    height: 50px;
                }
            }

            /* Scrollbar Styling */
            .chat-messages::-webkit-scrollbar {
                width: 4px;
            }

            .chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }

            .chat-messages::-webkit-scrollbar-thumb {
                background: #cbd5e0;
                border-radius: 2px;
            }

            .chat-messages::-webkit-scrollbar-thumb:hover {
                background: #a0aec0;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    bindEvents() {
        // Toggle chat window
        document.getElementById('chat-toggle').addEventListener('click', () => {
            this.toggleChat();
        });

        // Close chat
        document.getElementById('close-chat').addEventListener('click', () => {
            this.closeChat();
        });

        // Voice toggle
        document.getElementById('voice-toggle').addEventListener('click', () => {
            this.toggleVoiceMode();
        });

        // Input mode toggle
        document.getElementById('text-mode').addEventListener('click', () => {
            this.setInputMode('text');
        });

        document.getElementById('voice-mode').addEventListener('click', () => {
            this.setInputMode('voice');
        });

        // Send button
        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key to send
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Voice input area click
        document.getElementById('voice-input-area').addEventListener('mousedown', () => {
            this.startListening();
        });

        document.getElementById('voice-input-area').addEventListener('mouseup', () => {
            this.stopListening();
        });

        document.getElementById('voice-input-area').addEventListener('mouseleave', () => {
            this.stopListening();
        });

        // Touch events for mobile
        document.getElementById('voice-input-area').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startListening();
        });

        document.getElementById('voice-input-area').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopListening();
        });

        // Enable audio on any user interaction
        document.addEventListener('click', () => {
            this.enableAudio();
        });

        document.addEventListener('touchstart', () => {
            this.enableAudio();
        });
    }

    checkAudioSupport() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            document.getElementById('voice-mode').style.display = 'none';
            this.setInputMode('text');
        }
    }

    enableAudio() {
        if (!this.audioEnabled) {
            this.audioEnabled = true;
            console.log('Audio enabled');
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const notification = document.getElementById('chat-notification');

        if (this.isOpen) {
            chatWindow.classList.add('open');
            notification.style.display = 'none';
            document.getElementById('chat-input').focus();
        } else {
            chatWindow.classList.remove('open');
        }
    }

    closeChat() {
        this.isOpen = false;
        document.getElementById('chat-window').classList.remove('open');
    }

    toggleVoiceMode() {
        const voiceToggle = document.getElementById('voice-toggle');
        const isActive = voiceToggle.classList.contains('active');
        
        if (isActive) {
            this.setInputMode('text');
        } else {
            this.setInputMode('voice');
        }
    }

    setInputMode(mode) {
        const textMode = document.getElementById('text-mode');
        const voiceMode = document.getElementById('voice-mode');
        const textArea = document.getElementById('text-input-area');
        const voiceArea = document.getElementById('voice-input-area');
        const voiceToggle = document.getElementById('voice-toggle');

        if (mode === 'voice') {
            textMode.classList.remove('active');
            voiceMode.classList.add('active');
            textArea.classList.add('hidden');
            voiceArea.classList.add('active');
            voiceToggle.classList.add('active');
        } else {
            textMode.classList.add('active');
            voiceMode.classList.remove('active');
            textArea.classList.remove('hidden');
            voiceArea.classList.remove('active');
            voiceToggle.classList.remove('active');
        }
    }

    addWelcomeMessage() {
        const messages = document.getElementById('chat-messages');
        const welcomeMessage = this.createMessage('assistant', '👋 Hello! I\'m your CallWaiting.ai assistant. I can help you with voice calls, scheduling, and more. Try typing a message or switch to voice mode!');
        messages.appendChild(welcomeMessage);
        this.scrollToBottom();
    }

    createMessage(sender, content, timestamp = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? 'U' : 'AI';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = content;

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageContent.appendChild(messageTime);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);

        return messageDiv;
    }

    addMessage(sender, content) {
        const messages = document.getElementById('chat-messages');
        const message = this.createMessage(sender, content);
        messages.appendChild(message);
        this.scrollToBottom();
        
        // Add to conversation history
        this.conversationHistory.push({ sender, content, timestamp: new Date() });
    }

    showTypingIndicator() {
        const messages = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing-message';
        typingDiv.id = 'typing-indicator';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';

        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingIndicator.appendChild(dot);
        }

        typingDiv.appendChild(avatar);
        typingDiv.appendChild(typingIndicator);
        messages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        const messages = document.getElementById('chat-messages');
        messages.scrollTop = messages.scrollHeight;
    }

    updateStatus(status) {
        document.getElementById('chat-status').textContent = status;
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;

        input.value = '';
        this.addMessage('user', message);
        this.showTypingIndicator();
        this.updateStatus('Thinking...');

        try {
            const response = await this.getAIResponse(message);
            this.hideTypingIndicator();
            this.addMessage('assistant', response);
            
            // Speak the response
            if (this.audioEnabled) {
                await this.speakText(response);
            }
            
            this.updateStatus('Ready to help');
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            this.updateStatus('Ready to help');
            console.error('Error:', error);
        }
    }

    async startListening() {
        if (this.isListening) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.addMessage('assistant', 'Speech recognition is not supported in your browser.');
            return;
        }

        this.isListening = true;
        this.updateStatus('Listening...');
        
        const voiceCircle = document.querySelector('.voice-circle');
        const voiceInstruction = document.getElementById('voice-instruction');
        
        voiceCircle.classList.add('listening');
        voiceInstruction.textContent = 'Listening...';

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            console.log('Speech recognition started');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Speech recognized:', transcript);
            
            if (transcript.trim()) {
                this.addMessage('user', transcript);
                this.processVoiceInput(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.addMessage('assistant', `Speech recognition error: ${event.error}. Please try again.`);
        };

        this.recognition.onend = () => {
            this.stopListening();
        };

        this.recognition.start();
    }

    stopListening() {
        if (!this.isListening) return;

        this.isListening = false;
        this.updateStatus('Ready to help');
        
        const voiceCircle = document.querySelector('.voice-circle');
        const voiceInstruction = document.getElementById('voice-instruction');
        
        voiceCircle.classList.remove('listening');
        voiceInstruction.textContent = 'Hold to speak';

        if (this.recognition) {
            this.recognition.stop();
        }
    }

    async processVoiceInput(transcript) {
        this.showTypingIndicator();
        this.updateStatus('Thinking...');

        try {
            const response = await this.getAIResponse(transcript);
            this.hideTypingIndicator();
            this.addMessage('assistant', response);
            
            // Speak the response
            if (this.audioEnabled) {
                await this.speakText(response);
            }
            
            this.updateStatus('Ready to help');
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            this.updateStatus('Ready to help');
            console.error('Error:', error);
        }
    }

    async getAIResponse(message) {
        // Use backend API for AI responses
        try {
            const response = await fetch(`${this.apiBaseUrl}/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    history: this.conversationHistory.slice(-5)
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            // Fallback to simple responses if API is not available
            return this.getFallbackResponse(message);
        }
    }

    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return 'Hello! I\'m CallWaiting.ai\'s assistant. How can I help you today?';
        } else if (lowerMessage.includes('pricing') || lowerMessage.includes('cost')) {
            return 'Our pricing starts at $29/month for the Starter plan. Would you like to see our full pricing options?';
        } else if (lowerMessage.includes('demo') || lowerMessage.includes('trial')) {
            return 'Great! You can start a free 7-day trial right now. Would you like me to help you get started?';
        } else if (lowerMessage.includes('call') || lowerMessage.includes('phone')) {
            return 'CallWaiting.ai automatically answers your calls and sends SMS follow-ups to missed callers. It helps you never miss a potential customer!';
        } else {
            return 'Thanks for your message! Our team will get back to you soon. In the meantime, you can check out our pricing or start a free trial.';
        }
    }

    async speakText(text) {
        if (!this.audioEnabled) {
            console.log('Audio not enabled');
            return;
        }

        try {
            this.isSpeaking = true;
            this.updateStatus('Speaking...');
            
            const voiceCircle = document.querySelector('.voice-circle');
            voiceCircle.classList.add('speaking');

            const response = await fetch(this.ttsUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voice: 'en-US-AriaNeural'
                })
            });

            if (!response.ok) {
                throw new Error(`TTS request failed: ${response.status}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                this.isSpeaking = false;
                this.updateStatus('Ready to help');
                voiceCircle.classList.remove('speaking');
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                this.isSpeaking = false;
                this.updateStatus('Ready to help');
                voiceCircle.classList.remove('speaking');
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        } catch (error) {
            console.error('TTS error:', error);
            this.isSpeaking = false;
            this.updateStatus('Ready to help');
            
            // Fallback to browser TTS
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onend = () => {
                    this.isSpeaking = false;
                    this.updateStatus('Ready to help');
                };
                speechSynthesis.speak(utterance);
            }
        }
    }

    showNotification() {
        const notification = document.getElementById('chat-notification');
        notification.style.display = 'flex';
        notification.textContent = '1';
    }
}

// Initialize the chat widget when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.callWaitingChat = new CallWaitingChatWidget();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CallWaitingChatWidget;
}
