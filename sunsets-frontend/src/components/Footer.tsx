import { css } from '@linaria/core';
import { useState } from 'react';

const footerContainerStyle = css`
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: stretch;
`;

const toggleButtonStyle = css`
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-top-left-radius: 8px;
  cursor: pointer;
  padding: 4px 10px;
  font-size: 1rem;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #000;
    background: rgba(255, 255, 255, 0.95);
  }
`;

const contentStyle = css`
  background: rgba(255, 255, 255, 0.8);
  padding: 5px 15px 5px 5px;
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: sans-serif;
  font-size: 0.75rem;
  color: #333;

  .attribution {
    color: #666;
    margin-right: 5px;
    display: flex;
    gap: 4px;
    a {
      color: #666;
      font-weight: normal;
    }
  }

  a {
    color: #333;
    text-decoration: none;
    font-weight: bold;
    &:hover {
      text-decoration: underline;
    }
  }

  button.link-button {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    color: #555;
    &:hover {
      color: #000;
    }
  }
`;

const modalOverlayStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
`;

const modalContentStyle = css`
  background: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 400px;
  position: relative;

  button.close {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
  }
`;

export default function Footer() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      <div className={footerContainerStyle}>
        <button
          className={toggleButtonStyle}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Show info" : "Hide info"}
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          ) : '»'}
        </button>

        {!isCollapsed && (
          <div className={contentStyle}>
            <div className="attribution">
              <a href="https://maplibre.org" target="_blank" rel="noopener noreferrer">MapLibre</a>
              <span>|</span>
              <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
              <span>©</span>
              <a href="https://www.openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>
              <span>Data from</span>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
            </div>
            <span>|</span>
            <a href="https://github.com/up-the-hill/sunsets-on-a-map" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <span>|</span>
            <button className="link-button" onClick={() => setShowPrivacy(true)}>Privacy Policy</button>
          </div>
        )}
      </div>

      {showPrivacy && (
        <div className={modalOverlayStyle} onClick={() => setShowPrivacy(false)}>
          <div className={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowPrivacy(false)}>×</button>
            <h2>Privacy Policy</h2>
            <p>
              No personally identifying information is stored in the use of this app.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
