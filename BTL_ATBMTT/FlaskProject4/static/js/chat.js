document.addEventListener("DOMContentLoaded", function() {
    const socket = io();
    let currentUser = null;
    let aesKey = null;

    // Join user room
    socket.emit("join");

    // Select user to chat with
    document.querySelectorAll(".user-item").forEach(item => {
        item.addEventListener("click", function(e) {
            e.preventDefault();
            const selectedUser = this.getAttribute("data-user");

            // Update UI
            document.querySelector("#current-chat-user").textContent = selectedUser;
            document.querySelector("#message-input").disabled = false;
            document.querySelector("#send-button").disabled = false;

            // Clear chat messages
            document.querySelector("#chat-messages").innerHTML = "";

            // Initialize chat session
            currentUser = selectedUser;
            socket.emit("init_chat", { receiver: selectedUser });
        });
    });

    // Handle AES key exchange
    socket.on("aes_key_exchange", async (data) => {
        if (data.sender !== currentUser) return;

        try {
            // Here you would use the private key to decrypt the AES key
            // This is a simplified version - in a real app, you'd use WebCrypto or similar
            console.log("Received encrypted AES key:", data.encrypted_aes_key);
            console.log("Signature:", data.signature);

            // For demo purposes, we'll just store the encrypted key
            aesKey = data.encrypted_aes_key;

            // Notify user
            addMessage("System", "Secure connection established with " + data.sender, "system-message");
        } catch (error) {
            console.error("Error establishing secure connection:", error);
            addMessage("System", "Error establishing secure connection", "error-message");
        }
    });

    // Send message
    document.querySelector("#send-button").addEventListener("click", function() {
        const message = document.querySelector("#message-input").value;
        if (!message || !currentUser) return;

        // In a real app, you would encrypt the message here
        // For demo, we'll send it plaintext but indicate it's encrypted
        socket.emit("send_message", {
            receiver: currentUser,
            message: message
        });

        // Add to chat
        addMessage("You", message, "sent-message");
        document.querySelector("#message-input").value = "";
    });

    // Receive message
    socket.on("receive_message", (data) => {
        if (data.sender !== currentUser) return;

        // In a real app, you would decrypt and verify the message here
        // For demo, we'll just show it with a note about encryption
        addMessage(data.sender, "[ENCRYPTED] " + data.cipher, "received-message");

        // Verify the message
        socket.emit("verify_message", data);
    });

    // Message verification result
    socket.on("message_verified", (data) => {
        if (data.sender !== currentUser) return;

        if (data.status === "success") {
            // Update the message to show it's verified
            const messages = document.querySelectorAll(".received-message");
            const lastMessage = messages[messages.length - 1];
            if (lastMessage) {
                lastMessage.innerHTML = lastMessage.innerHTML.replace("[ENCRYPTED] ",
                    "[VERIFIED] " + data.message);
            }
        } else {
            addMessage("System", "Message verification failed", "error-message");
        }
    });

    // Message status (delivered/failed)
    socket.on("message_status", (data) => {
        if (data.receiver !== currentUser) return;

        const status = data.status === "delivered" ? "✓✓" : "✗";
        const messages = document.querySelectorAll(".sent-message");
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            lastMessage.innerHTML += ` <small>${status}</small>`;
        }
    });

    // Error handling
    socket.on("chat_error", (data) => {
        addMessage("System", data.message, "error-message");
    });

    // Helper function to add messages to the chat
    function addMessage(sender, message, className) {
        const chat = document.querySelector("#chat-messages");
        const msgElement = document.createElement("div");
        msgElement.className = `message ${className}`;
        msgElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chat.appendChild(msgElement);
        chat.scrollTop = chat.scrollHeight;
    }
});