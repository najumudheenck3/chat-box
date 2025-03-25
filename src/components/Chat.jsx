import { useState, useEffect, useRef } from "react";
import CryptoJS from "crypto-js";
import moment from "moment";
import axios from "axios";
import io from "socket.io-client";
// Import emoji-picker-react
import EmojiPicker from "emoji-picker-react";
import {
  Button,
  IconButton,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  AttachFile as AttachFileIcon,
  Send as SendIcon,
  InsertEmoticon as EmojiIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

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
  const chatboxRef = useRef(null);
  const [showChat, setShowChat] = useState(widgetOpen);
  const [isRegistered, setIsRegistered] = useState(false);
  const [agentDetails, setAgentDetails] = useState({
    name: "shukoor",
  }); // State to store agent details
  const [isAgentDetailsSaved, setIsAgentDetailsSaved] = useState(false); // Flag to check if agent details are saved
  const [noAgentsAvailable, setNoAgentsAvailable] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
  const [chatMessages, setChatMessages] = useState([]);
  const [files, setFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const fileInputRef = useRef(null);
  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    // Validate file size (10MB limit per file)
    const invalidFiles = selectedFiles.filter(
      (file) => file.size > 10 * 1024 * 1024
    );

    if (invalidFiles.length > 0) {
      setUploadError("Some files exceed the 10MB size limit");
      return;
    }

    setFiles(selectedFiles);
    setShowUploadDialog(true);
  };
  const handleUpload = async () => {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Add message content and other data
      const messageId = generateUniqueMessageId();
      formData.append("messageId", messageId);
      formData.append("senderType", "customer");
      formData.append(
        "customerInfo",
        JSON.stringify({
          name: customerInfo.name,
          mobile: customerInfo.contact,
          email: customerInfo.email,
        })
      );
      formData.append(
        "ChatId",
        generateUniqueChatId(customerInfo.contact, customerInfo.email)
      );
      formData.append("content", message || "");
      formData.append("socketId", socketId);

      const response = await api.post(
        "/widgetapi/messages/customerMessage",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.status) {
        console.log(response.data, "response");
        setFiles([]);
        setMessage("");
        setShowUploadDialog(false);

        // Add message to chat

        const newMessage = {
          messageId: messageId,
          content: message || "",
          file_path: response?.data?.content?.latestMessage?.file_path || [],
          senderType: "customer",
          createdAt: new Date(),
          status: "sent",
        };
        console.log(
          response.data.content.latestMessage.file_path,
          "newmesageee"
        );
        setChatMessages((prev) => [...prev, newMessage]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  // Function to toggle emoji picker visibility
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Function to handle emoji click/selection - modified to not close picker
  const onEmojiClick = (emojiObject) => {
    setMessage((prevMessage) => prevMessage + emojiObject.emoji);
    // Removed the line that closes the picker
  };

  // Click outside handler for emoji picker - with exceptions for the emoji button
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      // Only close if click outside both emoji picker and emoji button
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Remove event listener on cleanup
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiPickerRef, emojiButtonRef]);

  useEffect(() => {
    const storedCustomerInfo = localStorage.getItem("customerInfo");
    console.log(storedCustomerInfo, "storedCustomerInfo");
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

  useEffect(() => {
    const handleMessageReceived = (newMessageReceived) => {
      // Check if Notification API is supported
      if (window.Notification && Notification.permission === "granted") {
        // Display desktop notification
        new Notification("New message received", {
          body: newMessageReceived.content,
        });
      } else if (Notification.permission !== "denied") {
        // Request permission to display notifications
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("New message received", {
              body: newMessageReceived.content,
            });
          }
        });
      }
      console.log("Message received from server:", newMessageReceived);
      if (newMessageReceived.agent && !isAgentDetailsSaved) {
        // Save agent details if not already saved
        if (!agentDetails && !newMessageReceived.closed) {
          const newAgentDetails = {
            user_name: newMessageReceived.agent.user_name,
            name: newMessageReceived.agent.name,
          };
          setAgentDetails(newAgentDetails);
          localStorage.setItem("agentDetails", JSON.stringify(newAgentDetails));
        }
      }
      if (newMessageReceived.customer) {
        localStorage.setItem("customerId", newMessageReceived.customer.id);
      }
      setChatMessages((prevMessages) => [...prevMessages, newMessageReceived]);
      if (newMessageReceived.closed) {
        localStorage.clear();
        setIsRegistered(false);
        setCustomerInfo({
          name: "",
          contact: "",
          email: "",
          firstMessage: "",
        });
        setAgentDetails(null);
        setIsAgentDetailsSaved(false);
        setNoAgentsAvailable(false);
        setMessage("");
        // setFiles([]);
        setChatMessages([]);
      }
    };
    socket?.on("message received", handleMessageReceived);

    return () => {
      if (socket) {
        socket.off("message received", handleMessageReceived);
      }
    };
  }, [chatMessages]);

  useEffect(() => {
    const getChatData = async () => {
      const chatId = localStorage.getItem("chatId");
      if (chatId) {
        const { data } = await api.get(
          `/widgetapi/messages/allMessages/${chatId}`
        );
        if (data && data.status === false) {
          setChatMessages([]);
        }
        if (data.status) {
          setChatMessages(data.data);
        }
      } else {
        setChatMessages([]);
      }
    };
    getChatData();
  }, []);

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight; // Scroll to the bottom
    }
  }, [chatMessages]);

  // Function to generate a unique ChatId based on contact and email
  const generateUniqueChatId = (contact, email) => {
    const combined = `${contact}-${email}`;
    const hash = CryptoJS.SHA256(combined).toString(CryptoJS.enc.Base64); // Create a hash and encode it to Base64
    return "web-" + hash.substring(0, 16); // Ensure ChatId is no longer than 16 characters
  };

  const generateUniqueMessageId = () => {
    // Create a unique ID using timestamp and random value
    return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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
      setCustomerInfo(JSON.stringify(formData));
      localStorage.setItem("customerInfo", JSON.stringify(customerInfo));
      setIsRegistered(true);
      const content = {
        senderType: "customer",
        customerInfo: {
          name: customerInfo.name,
          mobile: customerInfo.contact,
          email: customerInfo.email,
        },
        ChatId: generateUniqueChatId(customerInfo.contact, customerInfo.email),
        content: customerInfo.firstMessage,
        createdAt: new Date(),
        status: "pending", // Mark as pending initially
        socketId: socketId,
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

  const handleSendMessage = async () => {
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
        ChatId: generateUniqueChatId(customerInfo.contact, customerInfo.email),
        content: message.trim(),
        createdAt: new Date(),
        status: "pending",
        socketId: socketId,
      };
      setChatMessages((prev) => [...prev, content]);
      setMessage("");
      // Close emoji picker when sending message
      setShowEmojiPicker(false);
      try {
        const { data } = await api.post(
          "/widgetapi/messages/customerMessage",
          content
        );
        if (data.status) {
          if (data.content && !data.content.agent_assigned_on_time) {
            // Show alert if no available agents
            console.log(
              data.content.message || "No available agents to handle the chat."
            );
            setNoAgentsAvailable(true);
            setChatMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.messageId === content.messageId
                  ? { ...msg, status: "queued" }
                  : msg
              )
            );
          } else {
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
            // Reset noAgentsAvailable to false since message was successfully sent
            setNoAgentsAvailable(false);
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
        console.error("Error sending message:", error);
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
              <h1>Hai {customerInfo.name}</h1>
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
                <span className="error-message">{formErrors.contact}</span>
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
            <div className="chatBox" ref={chatboxRef}>
              {chatMessages.map((message, index) => (
                <div className="row" key={index}>
                  {message.senderType === "customer" ? (
                    <div className="customer">
                      {(message.content || message.file_path?.length > 0) && (
                        <>
                          {message.content && <p>{message.content}</p>}
                          {message.file_path &&
                            message.file_path.length > 0 && (
                              <div>
                                {message.file_path.map(
                                  (filePath, fileIndex) => {
                                    const fullFilePath = `${appEndpoint}${filePath}`;
                                    const fileExtension = filePath
                                      .split(".")
                                      .pop()
                                      .toLowerCase();

                                    // Determine file type
                                    const isImage = [
                                      "jpg",
                                      "jpeg",
                                      "png",
                                      "gif",
                                      "bmp",
                                      "webp",
                                    ].includes(fileExtension);
                                    const isVideo = [
                                      "mp4",
                                      "webm",
                                      "ogg",
                                    ].includes(fileExtension);
                                    const isAudio = [
                                      "mp3",
                                      "wav",
                                      "aac",
                                    ].includes(fileExtension);

                                    const isDocument = [
                                      "pdf",
                                      "doc",
                                      "docx",
                                      "txt",
                                      "rtf",
                                      "odt",
                                    ].includes(fileExtension);

                                    const isSpreadsheet = [
                                      "xls",
                                      "xlsx",
                                      "csv",
                                      "ods",
                                      "xlsm",
                                      "xlsb",
                                    ].includes(fileExtension);

                                    const isPresentationFile = [
                                      "ppt",
                                      "pptx",
                                      "odp",
                                    ].includes(fileExtension);
                                    return (
                                      <div key={fileIndex}>
                                        {isImage && (
                                          <img
                                            src={fullFilePath}
                                            alt={`Uploaded file ${
                                              fileIndex + 1
                                            }`}
                                            style={{
                                              maxWidth: "200px",
                                              maxHeight: "200px",
                                              objectFit: "contain",
                                            }}
                                            onClick={() =>
                                              window.open(
                                                fullFilePath,
                                                "_blank"
                                              )
                                            }
                                          />
                                        )}
                                        {isVideo && (
                                          <video
                                            controls
                                            style={{
                                              maxWidth: "200px",
                                              maxHeight: "200px",
                                            }}
                                          >
                                            <source
                                              src={fullFilePath}
                                              type={`video/${fileExtension}`}
                                            />
                                            Your browser does not support the
                                            video tag.
                                          </video>
                                        )}
                                        {isAudio && (
                                          <div
                                            key={fileIndex}
                                            className="audio-container"
                                            style={{
                                              width: "200px",
                                              padding: "5px",
                                              backgroundColor: "#f5f5f5",
                                              borderRadius: "8px",
                                              // marginBottom: "5px",
                                            }}
                                          >
                                            <audio
                                              controls
                                              preload="metadata"
                                              style={{
                                                width: "200px",
                                                height: "15px",
                                                marginBottom: "5px",
                                              }}
                                            >
                                              <source
                                                src={fullFilePath}
                                                type={`audio/${fileExtension}`}
                                              />
                                              {`Your browser does not support the audio element for ${fileExtension}`}
                                            </audio>
                                          </div>
                                        )}
                                        {(isDocument ||
                                          isSpreadsheet ||
                                          isPresentationFile) && (
                                          <div className="file-document">
                                            <div className="file-icon">
                                              {isDocument && "📄"}
                                              {isSpreadsheet && "📊"}
                                              {isPresentationFile && "📽️"}
                                            </div>
                                            <a
                                              href={fullFilePath}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="file-download-link"
                                            >
                                              Download{" "}
                                              {fileExtension.toUpperCase()} File
                                            </a>
                                          </div>
                                        )}
                                        {!isImage &&
                                          !isVideo &&
                                          !isAudio &&
                                          !isDocument &&
                                          !isSpreadsheet &&
                                          !isPresentationFile && (
                                            <a
                                              href={fullFilePath}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="file-download-link"
                                            >
                                              Download{" "}
                                              {fileExtension.toUpperCase()} File
                                            </a>
                                          )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          <span>
                            {moment(message.createdAt).format("hh:mm A")}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="agent">
                      {(message.content || message.file_path?.length > 0) && (
                        <>
                          <img
                            src="/assets/profile.jpg"
                            alt="Agent"
                            className="agent-profile-img"
                          />
                          <div className="text">
                            <label>
                              {agentDetails?.name || agentDetails?.user_name}
                            </label>
                            {message.content && <p>{message.content}</p>}
                            {/* Display agent files if available */}
                            {message.file_path &&
                              message.file_path.length > 0 && (
                                <div className="agent-files">
                                  {message.file_path.map(
                                    (filePath, fileIndex) => {
                                      const fullFilePath = `${appEndpoint}${filePath}`;
                                      const fileExtension = filePath
                                        .split(".")
                                        .pop()
                                        .toLowerCase();

                                      // Determine file type
                                      const isImage = [
                                        "jpg",
                                        "jpeg",
                                        "png",
                                        "gif",
                                        "bmp",
                                        "webp",
                                      ].includes(fileExtension);
                                      const isVideo = [
                                        "mp4",
                                        "webm",
                                        "ogg",
                                      ].includes(fileExtension);
                                      const isAudio = [
                                        "mp3",
                                        "wav",
                                        "aac",
                                      ].includes(fileExtension);
                                      const isDocument = [
                                        "pdf",
                                        "doc",
                                        "docx",
                                        "txt",
                                        "rtf",
                                        "odt",
                                      ].includes(fileExtension);
                                      const isSpreadsheet = [
                                        "xls",
                                        "xlsx",
                                        "csv",
                                        "ods",
                                        "xlsm",
                                        "xlsb",
                                      ].includes(fileExtension);
                                      const isPresentationFile = [
                                        "ppt",
                                        "pptx",
                                        "odp",
                                      ].includes(fileExtension);

                                      return (
                                        <div
                                          key={fileIndex}
                                          className="file-container"
                                        >
                                          {isImage && (
                                            <img
                                              src={fullFilePath}
                                              alt={`Uploaded file ${
                                                fileIndex + 1
                                              }`}
                                              style={{
                                                maxWidth: "200px",
                                                maxHeight: "200px",
                                                objectFit: "contain",
                                              }}
                                              onClick={() =>
                                                window.open(
                                                  fullFilePath,
                                                  "_blank"
                                                )
                                              }
                                            />
                                          )}
                                          {isVideo && (
                                            <video
                                              controls
                                              style={{
                                                maxWidth: "200px",
                                                maxHeight: "200px",
                                              }}
                                            >
                                              <source
                                                src={fullFilePath}
                                                type={`video/${fileExtension}`}
                                              />
                                              Your browser does not support the
                                              video tag.
                                            </video>
                                          )}
                                          {isAudio && (
                                            <div
                                              className="audio-container"
                                              style={{
                                                width: "200px",
                                                padding: "5px",
                                                backgroundColor: "#f5f5f5",
                                                borderRadius: "8px",
                                              }}
                                            >
                                              <audio
                                                controls
                                                preload="metadata"
                                                style={{
                                                  width: "200px",
                                                  height: "15px",
                                                  marginBottom: "5px",
                                                }}
                                              >
                                                <source
                                                  src={fullFilePath}
                                                  type={`audio/${fileExtension}`}
                                                />
                                                {`Your browser does not support the audio element for ${fileExtension}`}
                                              </audio>
                                            </div>
                                          )}
                                          {(isDocument ||
                                            isSpreadsheet ||
                                            isPresentationFile) && (
                                            <div className="file-document">
                                              <div className="file-icon">
                                                {isDocument && "📄"}
                                                {isSpreadsheet && "📊"}
                                                {isPresentationFile && "📽️"}
                                              </div>

                                              <a
                                                href={fullFilePath}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="file-download-link"
                                              >
                                                Download{" "}
                                                {fileExtension.toUpperCase()}{" "}
                                                File
                                              </a>
                                            </div>
                                          )}
                                          {!isImage &&
                                            !isVideo &&
                                            !isAudio &&
                                            !isDocument &&
                                            !isSpreadsheet &&
                                            !isPresentationFile && (
                                              <a
                                                href={fullFilePath}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="file-download-link"
                                              >
                                                Download{" "}
                                                {fileExtension.toUpperCase()}{" "}
                                                File
                                              </a>
                                            )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            <span>
                              {moment(message.createdAt).format("hh:mm A")}
                            </span>
                          </div>
                        </>
                      )}
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
              <div className="options">
                <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                  <img src="/assets/attachments.svg" alt="Attach File" />
                </label>
                <input
                  id="file-upload"
                  type="file"
                  ref={fileInputRef}
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
                <div style={{ position: "relative" }}>
                  <img
                    ref={emojiButtonRef}
                    src="/assets/smile.svg"
                    alt="Emoji"
                    onClick={toggleEmojiPicker}
                    style={{ cursor: "pointer" }}
                  />
                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      style={{
                        position: "absolute",
                        bottom: "40px",
                        right: "0",
                        zIndex: "999",
                      }}
                    >
                      <EmojiPicker onEmojiClick={onEmojiClick} />
                    </div>
                  )}
                </div>
              </div>
              <div className="send" onClick={handleSendMessage}>
                <img src="/assets/Send.svg" alt="Send" />
              </div>
            </div>
          </>
        )}
      </div>
      {/* Upload Dialog */}
      <Dialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
      >
        <DialogTitle>Upload Files</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Selected files ({files?.length}):
            {files?.map((file, index) => (
              <Typography key={index} variant="body2">
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
            ))}
          </DialogContentText>
          {uploadError && (
            <Typography color="error" variant="body2">
              {uploadError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setFiles([]);
              setShowUploadDialog(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading}
            variant="contained"
            color="primary"
          >
            {uploading ? <CircularProgress size={24} /> : "Upload & Send"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Chat;
