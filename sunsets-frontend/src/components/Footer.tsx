import { css } from "@linaria/core";
import { useState } from "react";

const footerContainerStyle = css`
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: stretch;
`;

const toggleButtonStyle = css`
  background: var(--honeydew);
  border: 1px solid var(--charcoal-brown);
  cursor: pointer;
  padding: 4px 4px;
  font-size: 1rem;
  color: var(--charcoal-brown);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #e6f0e2;
  }
`;

const contentStyle = css`
  background: var(--honeydew);
  border: 1px solid var(--charcoal-brown);
  border-right: none;
  padding: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--charcoal-brown);

  @media (max-width: 600px) {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .attribution {
    color: var(--charcoal-brown);

    @media (max-width: 600px) {
      text-align: right;
      width: fit-content;
      margin-left: auto;
    }

    a {
      color: var(--charcoal-brown);
      font-weight: normal;
    }
  }

  a {
    color: var(--charcoal-brown);
  }

  button.link-button {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
    color: var(--charcoal-brown);
    &:hover {
      opacity: 0.7;
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
  background: var(--honeydew);
  color: var(--charcoal-brown);
  border: 1px solid var(--charcoal-brown);
  padding: 20px;
  max-width: 400px;
  position: relative;

  button.close {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: var(--charcoal-brown);
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    &:hover {
      opacity: 0.6;
    }
  }
`;

export default function Footer() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <>
      <div className={footerContainerStyle}>
        <button
          className={toggleButtonStyle}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Show info" : "Hide info"}
        >
          {isCollapsed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="m7 7l5 5l-5 5m6-10l5 5l-5 5"
              />
            </svg>
          )}
        </button>

        {!isCollapsed && (
          <div className={contentStyle}>
            <a
              href="https://github.com/up-the-hill/sunsets-on-a-map"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <span>|</span>
            <button
              className="link-button"
              onClick={() => setShowPrivacy(true)}
            >
              Privacy Policy
            </button>
          </div>
        )}
      </div>

      {showPrivacy && (
        <div
          className={modalOverlayStyle}
          onClick={() => setShowPrivacy(false)}
        >
          <div
            className={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setShowPrivacy(false)}>
              ×
            </button>
            <h2>Privacy Policy</h2>
            <p>
              No personally identifying information is stored in the use of this
              app.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
