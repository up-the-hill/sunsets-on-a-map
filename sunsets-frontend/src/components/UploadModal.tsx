import { css } from "@linaria/core";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
              setTimeout(close, 1200);
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

  // open as a true modal: native focus-trap, Esc-to-close, backdrop, focus restore
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // always close via .close() so the browser restores focus to the trigger;
  // onClose then runs the React cleanup. Esc closes natively -> same path.
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      onClose={handleCloseModal}
      onClick={(e) => {
        // clicking the backdrop = clicking the <dialog> itself, not its children
        if (e.target === dialogRef.current) close();
      }}
      aria-labelledby="upload-title"
      className={css`
        background-color: var(--honeydew);
        padding: 1em;
        min-width: 20em;
        display: grid;
        gap: 0.5rem;
        border-radius: 0;
        border: 1px solid var(--charcoal-brown);
        &::backdrop {
          background-color: rgba(0, 0, 0, 0.8);
        }
      `}
    >
      <button
        type="button"
        onClick={close}
        className={css`
          position: absolute;
          top: 8px;
          right: 8px;
          border: none;
          background: none;
          font-size: 1.1rem;
          line-height: 1;
          color: var(--charcoal-brown);
          cursor: pointer;
          &:hover {
            opacity: 0.6;
          }
        `}
      >
        &#10005;
      </button>
      <p
        id="upload-title"
        className={css`
          font-size: 1.2rem;
          font-family: serif;
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
        {/* native file input, visually hidden but still keyboard/validation reachable */}
        <input
          ref={fileRef}
          type="file"
          id="sunset"
          name="sunset"
          accept="image/png, image/jpeg"
          required
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setFileName(file?.name ?? null);
            // ponytail: revoke previous url on change; skip unmount cleanup, one url leaks per open at worst
            setPreview((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return file ? URL.createObjectURL(file) : null;
            });
          }}
          className={css`
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
          `}
        />
        <label
          htmlFor="sunset"
          className={css`
            display: inline-block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            background-color: var(--honeydew);
            border: 1px solid var(--charcoal-brown);
            padding: 0.3rem 0.6rem;
            cursor: pointer;
            &:hover {
              background-color: #e6f0e2;
            }
          `}
        >
          {fileName ?? "Choose a photo…"}
        </label>
        {preview && (
          <img
            src={preview}
            alt="Selected sunset preview"
            className={css`
              width: 100%;
              max-height: 200px;
              object-fit: contain;
              border: 1px solid var(--charcoal-brown);
            `}
          />
        )}
        <div className="submit-area">
          <button
            disabled={uploading}
            className={css`
              max-width: 10rem;
              background-color: var(--honeydew);
              border: 1px solid var(--charcoal-brown);
              border-radius: 0;
              padding: 0.3rem 0.6rem;
              cursor: pointer;
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
    </dialog>
  );
}
