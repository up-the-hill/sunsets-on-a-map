import { css } from '@linaria/core';
import React, { useState } from 'react';

const footerStyle = css`
  position: fixed;
  bottom: 0;
  right: 0;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  z-index: 1000;
  border-top-left-radius: 8px;
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: sans-serif;
  color: #333;

  a {
    color: #333;
    text-decoration: none;
    font-weight: bold;
    &:hover {
      text-decoration: underline;
    }
  }

  button {
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
  background: rgba(0, 0, 0, 0.5);
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;

  h2 {
    margin-top: 0;
  }

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

  return (
    <>
      <div className={footerStyle}>
        <a href="https://github.com/up-the-hill/sunsets-on-a-map" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span>|</span>
        <button onClick={() => setShowPrivacy(true)}>Privacy Policy</button>
      </div>

      {showPrivacy && (
        <div className={modalOverlayStyle} onClick={() => setShowPrivacy(false)}>
          <div className={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowPrivacy(false)}>×</button>
            <h2>Privacy Policy</h2>
            <p>
              No personally identifying information on the user, or in fact any information is stored in the use of this app.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
