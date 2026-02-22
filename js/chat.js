/**
 * EpiWatch — RAG Chat Component
 * Handles communication with the /api/chat backend.
 */

document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById('chat-toggle');
    const chatContainer = document.getElementById('chat-container');
    const chatClose = document.getElementById('chat-close');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMessages = document.getElementById('chat-messages');
    const micBtn = document.getElementById('chat-mic');

    // ── Create Recording Popup ────────────────────────────────
    const recordingPopup = document.createElement('div');
    recordingPopup.id = 'recording-popup';
    recordingPopup.innerHTML = `
        <div id="recording-popup-inner">
            <div id="recording-header">
                <span id="recording-dot"></span>
                <span id="recording-status-text">Listening...</span>
                <button id="recording-cancel" title="Cancel">✕</button>
            </div>
            <div id="recording-live-text">Start speaking — your words will appear here</div>
            <div id="recording-warning" class="hidden">
                <span>⚠️</span>
                <span id="recording-warning-msg"></span>
            </div>
            <div id="recording-tip">Speak clearly into your mic. Press 🎤 again or wait to send.</div>
        </div>
    `;
    document.body.appendChild(recordingPopup);


    // ── Toggle Chat visibility ────────────────────────────────
    chatToggle.addEventListener('click', () => {
        chatContainer.classList.toggle('hidden');
        if (!chatContainer.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    chatClose.addEventListener('click', () => {
        chatContainer.classList.add('hidden');
    });

    // ── Send Message ──────────────────────────────────────────
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        appendMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        const loadingDiv = appendMessage('bot', '...', true);
        chatSend.disabled = true;

        try {
            const response = await fetch('http://localhost:5001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            loadingDiv.remove();

            if (data.response) {
                appendMessage('bot', data.response);
                speakResponse(data.response);
            } else {
                appendMessage('bot', 'Sorry, I encountered an error. Is the API server running?');
            }
        } catch (error) {
            loadingDiv.remove();
            appendMessage('bot', 'Error connecting to server. Please ensure api.py is running on port 5001.');
            console.error('Chat error:', error);
        } finally {
            chatSend.disabled = false;
            scrollToBottom();
        }
    }

    // ── Helpers ───────────────────────────────────────────────
    function appendMessage(role, text, isLoading = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        if (isLoading) msgDiv.classList.add('loading');
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
        return msgDiv;
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showWarning(msg) {
        const warning = document.getElementById('recording-warning');
        document.getElementById('recording-warning-msg').textContent = msg;
        warning.classList.remove('hidden');
    }

    function hideWarning() {
        document.getElementById('recording-warning').classList.add('hidden');
    }

    function setLiveText(text) {
        const el = document.getElementById('recording-live-text');
        if (text) {
            el.textContent = text;
            el.classList.add('has-text');
        } else {
            el.textContent = 'Start speaking — your words will appear here';
            el.classList.remove('has-text');
        }
    }

    function openPopup() {
        setLiveText('');
        hideWarning();
        document.getElementById('recording-status-text').textContent = 'Listening...';
        document.getElementById('recording-dot').style.background = '#ef4444';
        recordingPopup.classList.add('visible');
    }

    function closePopup() {
        recordingPopup.classList.remove('visible');
    }

    // ── Handle Suggestions ───────────────────────────────────
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value = btn.textContent;
            sendMessage();
        });
    });

    // ── Text Input Event Listeners ────────────────────────────
    chatSend.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        this.style.overflowY = this.scrollHeight > 150 ? 'scroll' : 'hidden';
    });

    // ── Voice Input (Speech to Text) ──────────────────────────
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;

        let isListening = false;
        let silenceTimer = null;

        // Cancel button inside popup
        document.getElementById('recording-cancel').addEventListener('click', () => {
            recognition.stop();
            closePopup();
            micBtn.textContent = '🎤';
            isListening = false;
        });

        micBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
                closePopup();
                micBtn.textContent = '🎤';
                isListening = false;
            } else {
                // Request mic permission explicitly first
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(() => {
                        isListening = true;
                        micBtn.textContent = '🔴';
                        openPopup();
                        hideWarning();

                        // If no speech detected after 5s, show a warning
                        silenceTimer = setTimeout(() => {
                            if (isListening) {
                                showWarning("Can't hear you — check your mic isn't muted");
                            }
                        }, 5000);

                        recognition.start();
                    })
                    .catch((err) => {
                        console.error('Mic permission denied:', err);
                        openPopup();
                        showWarning('Microphone access was denied. Please allow mic access in your browser settings.');
                        document.getElementById('recording-status-text').textContent = 'Mic blocked';
                        document.getElementById('recording-dot').style.background = '#f97316';
                    });
            }
        });

        recognition.onresult = (event) => {
            // Clear silence warning since we're hearing something
            clearTimeout(silenceTimer);
            hideWarning();

            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            const displayText = final || interim;
            setLiveText(displayText);

            // Mirror to textarea
            chatInput.value = displayText;
            chatInput.dispatchEvent(new Event('input'));

            if (final.trim()) {
                document.getElementById('recording-status-text').textContent = 'Got it! Sending...';
                setTimeout(() => {
                    closePopup();
                    sendMessage();
                }, 400);
            }
        };

        recognition.onnomatch = () => {
            showWarning("Couldn't recognise that. Try speaking more clearly.");
        };

        recognition.onend = () => {
            clearTimeout(silenceTimer);
            micBtn.textContent = '🎤';
            isListening = false;
            // Close popup if still open and nothing was sent
            setTimeout(closePopup, 800);
        };

        recognition.onerror = (e) => {
            clearTimeout(silenceTimer);
            console.error('Speech recognition error:', e.error);
            micBtn.textContent = '🎤';
            isListening = false;

            openPopup();
            document.getElementById('recording-dot').style.background = '#f97316';

            const errorMessages = {
                'not-allowed': 'Mic access denied — click the 🔒 in your address bar to allow it.',
                'no-speech': 'No speech detected — is your mic muted or unplugged?',
                'audio-capture': 'No microphone found — is one plugged in?',
                'network': 'Network error during recognition. Check your connection.',
                'aborted': 'Recording was cancelled.',
            };

            const msg = errorMessages[e.error] || `Recognition error: ${e.error}`;
            showWarning(msg);
            document.getElementById('recording-status-text').textContent = 'Error';
        };

    } else {
        micBtn.style.display = 'none';
    }

    // ── ElevenLabs Text to Speech ─────────────────────────────
    async function speakResponse(text) {
        const ELEVENLABS_API_KEY = 'sk_d4df9673226d3103f0072ebfd8a291877d36286b6f384587';
        const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'xi-api-key': ELEVENLABS_API_KEY
                    },
                    body: JSON.stringify({
                        text: text.slice(0, 500),
                        model_id: 'eleven_monolingual_v1',
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                    })
                }
            );

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play();
        } catch (e) {
            console.warn('ElevenLabs TTS failed, falling back to browser TTS:', e);
            const utterance = new SpeechSynthesisUtterance(text.slice(0, 200));
            window.speechSynthesis.speak(utterance);
        }
    }
});