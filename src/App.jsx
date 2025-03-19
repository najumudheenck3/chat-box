import React, { useEffect, useState } from "react";
import "./App.css";
import Chat from "./components/Chat";

function App() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const widgetElement = document.getElementById("v360widget");
    if (widgetElement) {
      const endpoint = widgetElement.getAttribute("data-endpoint");
      const appEndpoint = widgetElement.getAttribute("app-endpoint");
      const appId = widgetElement.getAttribute("data-app-id");
      const isRTL = widgetElement.getAttribute("data-rtl") === "true";
      const language = widgetElement.getAttribute("data-language") || "en";
      const widgetOpen =
        widgetElement.getAttribute("data-widget-open") === "true";

      setConfig({
        endpoint,
        appEndpoint,
        appId,
        isRTL,
        language,
        widgetOpen,
      });
    }
  }, []);

  if (!config) {
    return null;
  }
  return (
    <Chat
      endpoint={config.endpoint}
      appEndpoint={config.appEndpoint}
      appId={config.appId}
      isRTL={config.isRTL}
      language={config.language}
      widgetOpen={config.widgetOpen}
    />
  );
}

export default App;
