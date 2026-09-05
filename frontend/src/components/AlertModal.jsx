import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import "../styles/alertModal.css";

const AlertModal = ({ isOpen, type = "info", title, message, onClose, onConfirm, confirmText, cancelText }) => {
  if (!isOpen) return null;

  // Icon mapping depending on alert type
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={32} />;
      case "error":
        return <AlertCircle size={32} />;
      case "warning":
        return <AlertTriangle size={32} />;
      case "info":
      default:
        return <Info size={32} />;
    }
  };

  // Helper function to check if the text is structured like a key-value details block
  const renderMessage = () => {
    if (typeof message !== "string") return message;

    // Check if it's a multi-line string containing structured details
    if (message.includes("\n")) {
      const lines = message.split("\n");
      const isKeyValueList = lines.every((line, idx) => idx === 0 || line.includes(":"));

      if (isKeyValueList) {
        const detailTitle = lines[0];
        const items = lines.slice(1).map((line) => {
          const colonIdx = line.indexOf(":");
          if (colonIdx > -1) {
            return {
              key: line.substring(0, colonIdx).trim(),
              value: line.substring(colonIdx + 1).trim(),
            };
          }
          return { key: "", value: line };
        });

        return (
          <div style={{ textAlign: "left", width: "100%", marginTop: "8px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px", textAlign: "center" }}>
              {detailTitle}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px", borderBottom: idx === items.length - 1 ? "none" : "1px dashed #f1f5f9", paddingBottom: "4px" }}>
                  <span style={{ color: '#64748b', fontWeight: '500', minWidth: '90px' }}>{item.key}</span>
                  <span style={{ color: '#0f172a', fontWeight: '600', textAlign: 'right', wordBreak: 'break-word' }}>{item.value || "N/A"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      } else {
        return (
          <div style={{ textAlign: "left", width: "100%" }}>
            {lines.map((line, idx) => (
              <p key={idx} style={{ margin: "0 0 6px 0", fontSize: "14px", color: "#475569" }}>
                {line}
              </p>
            ))}
          </div>
        );
      }
    }

    return <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>{message}</p>;
  };

  return (
    <div className="custom-alert-overlay" onClick={onClose}>
      <div className="custom-alert-box" onClick={(e) => e.stopPropagation()}>
        <div className="custom-alert-body">
          <div className={`custom-alert-icon-container ${type}`}>
            {getIcon()}
          </div>
          <h3 className="custom-alert-title">{title || (type.charAt(0).toUpperCase() + type.slice(1))}</h3>
          <div className="custom-alert-message">
            {renderMessage()}
          </div>
          <div className="custom-alert-footer">
            {onConfirm ? (
              <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                <button
                  type="button"
                  className="custom-alert-btn"
                  onClick={onClose}
                  style={{
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #e2e8f0",
                    width: "50%"
                  }}
                >
                  {cancelText || "Cancel"}
                </button>
                <button
                  type="button"
                  className={`custom-alert-btn ${type}`}
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  style={{
                    width: "50%"
                  }}
                >
                  {confirmText || "OK"}
                </button>
              </div>
            ) : (
              <button className={`custom-alert-btn ${type}`} onClick={onClose}>
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
