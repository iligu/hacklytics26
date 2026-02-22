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

    // Toggle Chat visibility
    chatToggle.addEventListener('click', () => {
        chatContainer.classList.toggle('hidden');
        if (!chatContainer.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    chatClose.addEventListener('click', () => {
        chatContainer.classList.add('hidden');
    });

    // Handle Sending Messages
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Add user message to UI
        appendMessage('user', text);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Show loading state
        const loadingDiv = appendMessage('bot', '...', true);
        chatSend.disabled = true;

        try {
            const response = await fetch('http://localhost:3002/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            
            // Replace loading with real response
            loadingDiv.remove();
            if (data.response) {
                appendMessage('bot', data.response);
            } else {
                appendMessage('bot', 'Sorry, I encountered an error. Is the API server running?');
            }
        } catch (error) {
            loadingDiv.remove();
            appendMessage('bot', 'Error connecting to server. Please ensure api.py is running on port 3002.');
            console.error('Chat error:', error);
        } finally {
            chatSend.disabled = false;
            scrollToBottom();
        }
    }

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

    // Event Listeners
    chatSend.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 150) {
            this.style.overflowY = 'scroll';
        } else {
            this.style.overflowY = 'hidden';
        }
    });
});
