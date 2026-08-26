import { css } from "@linaria/core";
import { useRef, useState, type FormEvent } from "react";
import Compressor from "compressorjs";
import Spinner from "./Spinner";
import { Marker } from "maplibre-gl";

interface UploadModalProps {
  handleCloseModal: () => void;
  clickMarker: Marker | null;
  addPoint: (point: { id: string; lng: number; lat: number }) => void;
}

export default function UploadModal({
  handleCloseModal,
  clickMarker,
  addPoint,
}: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setMessage(null);

    const input = fileRef.current;
    const file = input!.files![0];

    // compress image for 1st upload
    new Compressor(file, {
      quality: 0.8,
      maxHeight: 224,
      async success(result) {
        // API Call to get Presigned POST data, and check if image is a sunset
        const formData = new FormData();
        if (clickMarker) {
          const { lng, lat } = clickMarker.getLngLat();
          formData.append("longitude", lng.toFixed(8));
          formData.append("latitude", lat.toFixed(8));
          formData.append("file", result);
        }

        try {
          const res = await fetch("/api/sunsets", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            if (res.status === 400 && (await res.text()) == "ImageNotSunset") {
              setUploading(false);
              setMessage({
                text: "Not a sunset \u{1F305} — try another photo",
                error: true,
              });
              return;
            }
            setUploading(false);
            setMessage({
              text: "Upload failed, please try again",
              error: true,
            });
            return;
          }

          const { url, fields } = await res.json();

          // compress the image for upload to s3 bucket
          new Compressor(file, {
            quality: 0.7,
            maxWidth: 1080,

            async success(result) {
              // Construct FormData for S3 upload
              const s3FormData = new FormData();
              Object.entries(fields).forEach(([key, value]) => {
                s3FormData.append(key, value as string);
              });
              s3FormData.append("file", result);

              // Upload to S3
              const uploadRes = await fetch(url, {
                method: "POST",
                body: s3FormData,
              });

              if (!uploadRes.ok) {
                setUploading(false);
                if (
                  uploadRes.status === 400 &&
                  (await uploadRes.text()).includes("EntityTooLarge")
                ) {
                  setMessage({ text: "File too large (max 5MB)", error: true });
                  return;
                }
                setMessage({
                  text: "Upload failed, please try again",
                  error: true,
                });
                return;
              }

              if (clickMarker) {
                const { lng, lat } = clickMarker.getLngLat();
                addPoint({
                  id: fields.key,
                  lng: Number(lng.toFixed(8)),
                  lat: Number(lat.toFixed(8)),
                });
              }
              setMessage({ text: "Sunset uploaded \u{2728}", error: false });
              setTimeout(handleCloseModal, 1200);
            },
            error(err) {
              console.error(err.message);
              setUploading(false);
              setMessage({
                text: "Upload failed, please try again",
                error: true,
              });
            },
          });
        } catch (err) {
          console.error(err);
          setUploading(false);
          setMessage({ text: "Upload failed, please try again", error: true });
        }
      },
      error(e) {
        console.error(e);
        setUploading(false);
        setMessage({ text: "Could not read that image", error: true });
      },
    });
  };

  return (
    <div
      onClick={handleCloseModal}
      className={css`
        z-index: 999;
        position: fixed;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: grid;
        place-content: center;
        box-shadow: rgba(0, 0, 0, 0.5);
      `}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={css`
          z-index: 9999;
          background-color: #fff;
          padding: 1em;
          margin: auto auto;
          min-width: 20em;
          display: grid;
          gap: 0.5rem;
          border-radius: 5px;
          position: relative;
        `}
      >
        <button
          onClick={handleCloseModal}
          className={css`
            position: absolute;
            top: 10px;
            right: 10px;
            border: none;
            background: none;
            cursor: pointer;
          `}
        >
          &#10005;
        </button>
        <p
          className={css`
            font-size: 1.2rem;
          `}
        >
          Upload Sunset
        </p>
        <form
          onSubmit={handleSubmit}
          className={css`
            display: grid;
            gap: 0.2rem;
          `}
        >
          <input
            ref={fileRef}
            type="file"
            id="sunset"
            name="sunset"
            accept="image/png, image/jpeg"
            required
          />
          <div className="submit-area">
            <button
              disabled={uploading}
              className={css`
                max-width: 10rem;
              `}
            >
              Upload
            </button>
            {uploading && <Spinner />}
          </div>
          {message && (
            <p
              className={
                css`
                  margin: 0;
                  font-size: 0.9rem;
                ` +
                " " +
                (message.error
                  ? css`
                      color: #c0392b;
                    `
                  : css`
                      color: #1e824c;
                    `)
              }
            >
              {message.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
