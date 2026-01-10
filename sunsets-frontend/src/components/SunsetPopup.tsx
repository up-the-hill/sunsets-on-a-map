import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@linaria/core';
import Spinner from './Spinner';

interface PopupProps {
  id: string;
}

export default function SunsetPopup({ id }: PopupProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchImage() {
      try {
        const res = await fetch(`/api/sunsets/${id}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch image url: ${res.statusText}`);
        }
        const url = await res.text();
        if (active) {
          setImageUrl(url);
        }
      } catch (err) {
        if (active) {
          setError('Failed to load image');
          console.error(err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchImage();
    return () => { active = false; };
  }, [id]);

  function handleOpen() {
    setImageOpen(true);
  }

  function handleClose() {
    setImageOpen(false);
  }

  if (loading) return <Spinner />;
  if (error) return <div>{error}</div>;
  if (!imageUrl) return <div>No image found</div>;

  return (
    <>
      <div className={css`
        padding: 10px;
        max-width: 200px;
      `}>
        <img
          src={imageUrl}
          alt="Sunset"
          onClick={handleOpen}
          className={css`
            width: 100%;
            height: auto;
            border-radius: 4px;
            cursor: pointer;
          `}
        />
      </div>

      {imageOpen && createPortal(
        <div
          onClick={handleClose}
          className={css`
            position: fixed;
            top: 0;
            left: 0;
            width: 100dvw;
            height: 100dvh;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          `}
        >
          <button
            onClick={handleClose}
            className={css`
              position: absolute;
              top: 20px;
              right: 20px;
              background: none;
              border: none;
              color: white;
              font-size: 2rem;
              cursor: pointer;
              z-index: 1000;
            `}
          >
            &#10005;
          </button>
          <img
            src={imageUrl}
            alt="Sunset Fullscreen"
            className={css`
              max-width: 90%;
              max-height: 90%;
              object-fit: contain;
              box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            `}
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>
  );
}
