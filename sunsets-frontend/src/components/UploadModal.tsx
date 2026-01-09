import { css } from '@linaria/core';
import { useRef, useState, type FormEvent } from 'react';
import Compressor from 'compressorjs';
import Spinner from './Spinner';

interface UploadModalProps {
  handleCloseModal: () => void;
  clickMarker: maplibregl.Marker | null;
}

export default function UploadModal({ handleCloseModal, clickMarker }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true)

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
          formData.append('longitude', lng.toPrecision(8));
          formData.append('latitude', lat.toPrecision(8));
          formData.append("file", result);
        }

        try {
          const res = await fetch('/api/sunsets', {
            method: 'POST',
            body: formData
          });

          if (!res.ok) {
            if (res.status === 400 && (await res.text()) == 'ImageNotSunset') {
              // alert("Image not Sunset!");
              handleCloseModal()
              throw new Error('Image not Sunset!');
            }
            handleCloseModal()
            throw new Error('Failed to get upload parameters');
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
              s3FormData.append('file', result);

              // Upload to S3
              const uploadRes = await fetch(url, {
                method: 'POST',
                body: s3FormData
              });

              if (!uploadRes.ok) {
                if (uploadRes.status === 400 && (await uploadRes.text()).includes('EntityTooLarge')) {
                  alert("filesize too large!");
                  throw new Error('File too large (max 5MB)');
                }
                alert("upload failed!");
                throw new Error('Upload to S3 failed');
              } else {
                alert("image uploaded!");
              }
              handleCloseModal();
            },
            error(err) {
              console.log(err.message);
            },
          });
        } catch (err) {
          console.error(err);
          alert(err instanceof Error ? err.message : "Upload failed");
        }
      },
      error(e) {
        console.error(e)
      },
    })


  }

  return (
    <div
      onClick={handleCloseModal}
      className={css`
            z-index: 999;
            position: fixed;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4); 
            display: grid;
            place-content: centre;
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
            `}>
        <p className={css`font-size: 1.2rem;`}>Upload Sunset
          <button onClick={handleCloseModal} className={css`float:right; padding: 0.2rem 0.3rem; font-size: 0.8rem`}>&#10005;</button>
        </p>
        <form onSubmit={handleSubmit} className={css`display: grid; gap:0.2rem;`}>
          <input ref={fileRef} type="file" id="sunset" name="sunset" accept="image/png, image/jpeg" required />
          <button className={css`max-width: 10rem; `}>Upload</button>
          {uploading && (
            <Spinner />
          )}
        </form>
      </div>
    </div>
  )
}
