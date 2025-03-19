import { useState,useEffect } from "react";
import CryptoJS from "crypto-js";
import moment from "moment";
import axios from "axios";
import io from "socket.io-client";

let socket;
function Chat({
  endpoint,
  appEndpoint,
  appId,
  isRTL = true,
  language = "en",
  widgetOpen = false,
}) {
  console.log(endpoint, "endpoint");
  // Create an Axios instance with default headers
  const api = axios.create({
    baseURL: endpoint,
    headers: {
      "app-id": appId,
    },
  });
  const [showChat, setShowChat] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    firstMessage: "",
  });
  const [formErrors, setFormErrors] = useState({
    name: "",
    contact: "",
    email: "",
    firstMessage: "",
  });
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    contact: "",
    email: "",
    firstMessage: "",
  });
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      senderType: "customer",
      content: "Hello, How are you doing ?",
      createdAt: "08:15 AM",
    },
    {
      senderType: "agent",
      content: "I'm doing well, thank you! How Can I help you today ?",
      createdAt: "08:16 AM",
    },
    {
      senderType: "customer",
      content: "Hello, How are you doing ?",
      createdAt: "08:15 AM",
    },
    {
      senderType: "agent",
      content: "I'm doing well, thank you! How Can I help you today ?",
      createdAt: "08:16 AM",
    },
    {
      senderType: "customer",
      content: "Hello, How are you doing ?",
      createdAt: "08:15 AM",
    },
    {
      senderType: "agent",
      content: "I'm doing well, thank you! How Can I help you today ?",
      createdAt: "08:16 AM",
    },
    {
      senderType: "customer",
      content: "Hello, How are you doing ?",
      createdAt: "08:15 AM",
    },
    {
      senderType: "agent",
      content: "I'm doing well, thank you! How Can I help you today ?",
      createdAt: "08:16 AM",
    },
    {
      senderType: "customer",
      content: "Hello, How are you doing ?",
      createdAt: "08:15 AM",
    },
    {
      senderType: "agent",
      content: "I'm doing well, thank you! How Can I help you today ?",
      createdAt: "08:16 AM",
    },
    {
      senderType: "customer",
      content: "Hello, How are you doing ?",
      createdAt: "08:15 AM",
    },
    {
      senderType: "agent",
      content: "I'm doing well, thank you! How Can I help you today ?",
      createdAt: "08:16 AM",
    },
  ]);
  useEffect(() => {
    const storedCustomerInfo = localStorage.getItem("customerInfo");
    console.log(storedCustomerInfo,"storedCustomerInfo");
    const customerId = localStorage.getItem("customerId");
    const customerRoom = `customer-${customerId}`;
    if (storedCustomerInfo) {
      setCustomerInfo(JSON.parse(storedCustomerInfo));
      setIsRegistered(true);
    }
    socket = io(endpoint, {
      path: "/widgetsocket.io",
    });
    // Capture and set the socket ID
    socket.on("connect", () => {
      setSocketId(socket.id);
      console.log("Socket ID:", socket.id);
      // Join the room
      if (customerId) {
        socket.emit("joinRoom", customerRoom);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);
  // Function to generate a unique ChatId based on contact and email
  const generateUniqueChatId = (contact, email) => {
    const combined = `${contact}-${email}`;
    const hash = CryptoJS.SHA256(combined).toString(CryptoJS.enc.Base64); // Create a hash and encode it to Base64
    return "web-" + hash.substring(0, 16); // Ensure ChatId is no longer than 16 characters
  };
  const toggleChat = () => {
    setShowChat(!showChat);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Clear the error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prevErrors) => ({
        ...prevErrors,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { name: "", contact: "", email: "", firstMessage: "" };

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
      valid = false;
    }

    // Validate contact
    if (!formData.contact.trim()) {
      newErrors.contact = "Contact number is required";
      valid = false;
    } else if (!/^\d{9,10}$/.test(formData.contact.trim())) {
      newErrors.contact = "Please enter a valid phone number";
      valid = false;
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
      valid = false;
    }

    // Validate firstMessage
    if (!formData.firstMessage.trim()) {
      newErrors.firstMessage = "Please describe your issue";
      valid = false;
    }

    setFormErrors(newErrors);
    return valid;
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();

    if (validateForm()) {
      const customerInfo = { ...formData }; // Assign formData values to a new variable
      console.log("Customer Info:", customerInfo);
      setCustomerInfo(JSON.stringify(formData))
      localStorage.setItem("customerInfo", JSON.stringify(customerInfo));
      setIsRegistered(true);
      const content = {
        senderType: "customer",
        customerInfo: {
          name: customerInfo.name,
          mobile: customerInfo.contact,
          email: customerInfo.email,
        },
        ChatId: generateUniqueChatId(
          customerInfo.contact,
          customerInfo.email
        ),
        content: customerInfo.firstMessage,
        createdAt: moment().format("hh:mm A"),
        status: "pending", // Mark as pending initially
        // socketId: socketId,
      };
      console.log(content, "haihellooo");
      setChatMessages((prevMessages) => [...prevMessages, content]);
      try {
        const { data } = await api.post(
          "/widgetapi/messages/customerMessage",
          content
        );

        if (data.status) {
          // Update the message to 'sent' status on success
          setChatMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.messageId === content.messageId
                ? { ...msg, status: "sent" }
                : msg
            )
          );
          if (data.chatId) {
            localStorage.setItem("chatId", data.chatId);
          }
          if (data.customerId) {
            localStorage.setItem("customerId", data.customerId);
          }
        } else {
          // Update message status to 'failed' if the message was not successfully sent
          setChatMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.messageId === content.messageId
                ? { ...msg, status: "failed" }
                : msg
            )
          );
        }
      } catch (error) {
        console.error("Error sending first message:", error);
        // On failure, mark the message as 'failed'
        setChatMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.messageId === content.messageId
              ? { ...msg, status: "failed" }
              : msg
          )
        );
      }
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log("Sending message:", message);
      const content = {
        messageId: generateUniqueMessageId(),
        senderType: "customer",
        customerInfo: {
          name: customerInfo.name,
          mobile: customerInfo.contact,
          email: customerInfo.email,
        },
        ChatId: generateUniqueChatId(
          customerInfo.contact,
          customerInfo.email
        ),
        content: message.trim(),
        createdAt: moment().format("hh:mm A"),
        status: "pending",
        // socketId: socketId,
      };
      setChatMessages((prev) => [...prev, content]);
      setMessage("");
      // Here you would typically add the message to your chat state or send to API
    }
  };

  // Allow sending message with Enter key, but Shift+Enter for new line
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render Chat Button when chat is not shown
  if (!showChat) {
    return (
      <div className="app">
        <div className="chatButton" onClick={toggleChat}></div>
      </div>
    );
  }

  // Render Chat Wrapper when chat is shown
  return (
    <div className="app">
      <div className="chatwrapper" style={{ display: "block" }}>
        <div className="gradient"></div>
        <div className="head">
          <div className="logo-row">
            <img src="/assets/Logo Cutout.svg" className="logo" alt="Logo" />
            <div className="close" onClick={toggleChat}>
              <img src="/assets/Close.svg" alt="Close" />
            </div>
          </div>
          {isRegistered ? (
            <>
              <h1>hellooo</h1>
              <p>
                Fill in your information to start chatting with the first
                available agent
              </p>
            </>
          ) : (
            <>
              <h1>Register to Chat</h1>
              <p>
                Fill in your information to start chatting with the first
                available agent
              </p>
            </>
          )}
        </div>

        {/* Registration Form */}
        {!isRegistered && (
          <div className="form" style={{ display: "block" }}>
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleFormChange}
                className={formErrors.name ? "error" : ""}
              />
              {formErrors.name && (
                <span className="error-message">{formErrors.name}</span>
              )}
            </div>
            <div className="field">
              <label>Contact Number</label>
              <div className="row">
                <div className="code">
                  <img src="/assets/sa.jpg" alt="SA" /> +966
                </div>
                <input
                  type="tel"
                  name="contact"
                  placeholder="Contact Number"
                  value={formData.contact}
                  onChange={handleFormChange}
                  className={formErrors.contact ? "error" : ""}
                />
              </div>
              {formErrors.contact && (
                <span className="error-message">
                  {formErrors.contact}
                </span>
              )}
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleFormChange}
                className={formErrors.email ? "error" : ""}
              />
              {formErrors.email && (
                <span className="error-message">{formErrors.email}</span>
              )}
            </div>
            <div className="field">
              <label>firstMessage</label>
              <textarea
                name="firstMessage"
                placeholder="Please describe the Issue"
                value={formData.firstMessage}
                onChange={handleFormChange}
                className={formErrors.firstMessage ? "error" : ""}
              ></textarea>
              {formErrors.firstMessage && (
                <span className="error-message">{formErrors.firstMessage}</span>
              )}
            </div>
            <button onClick={handleFormSubmit}>Send</button>
          </div>
        )}

        {/* Chat Box */}
        {isRegistered && (
          <>
            <div className="chatBox">
              {chatMessages.map((message, index) => (
                <div className="row" key={index}>
                  {message.senderType === "customer" ? (
                    <div className="customer">
                      <p>{message.content}</p>
                      <span>{message.createdAt}</span>
                    </div>
                  ) : (
                    <div className="agent">
                      <img src="/assets/profile.jpg" alt="Agent" />
                      <div className="text">
                        <label>Agent</label>
                        <p>{message.content}</p>
                        <span>{message.createdAt}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="messageInput">
              <textarea
                name="Replay"
                placeholder="Replay"
                value={message}
                onChange={handleMessageChange}
                onKeyPress={handleKeyPress}
              ></textarea>
              <div className="send" onClick={handleSendMessage}>
                <img src="/assets/Send.svg" alt="Send" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Chat;
