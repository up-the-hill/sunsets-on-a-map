import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { rateLimiter } from 'hono-rate-limiter'
import { bodyLimit } from 'hono/body-limit'
import { sunsetsTable } from './db/schema.js';
import { db } from './db/db.js';
import { s3Client } from './aws.js';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

const session = await ort.InferenceSession.create('public/sunsets-model/model.onnx');

async function preprocessBuffer(imageBuffer: Buffer): Promise<ort.Tensor> {
  const raw = await sharp(imageBuffer)
    .resize(224, 224)
    .removeAlpha()
    .raw()
    .toBuffer();

  const float32 = new Float32Array(224 * 224 * 3);
  for (let i = 0; i < raw.length; i++) {
    float32[i] = raw[i] / 127.5 - 1.0; // MobileNetV2 normalisation
  }

  return new ort.Tensor('float32', float32, [1, 224, 224, 3]);
}

// s3 imports
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { sql } from 'drizzle-orm';


// s3 helper functions
type CreatePresignedUrlWithClientParams = {
  client: S3Client;
  bucket: string;
  key: string;
};

export const createPresignedPutUrl = async ({
  client,
  bucket,
  key,
}: CreatePresignedUrlWithClientParams): Promise<string> => {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

export const createPresignedGetUrl = async ({
  client,
  bucket,
  key,
}: CreatePresignedUrlWithClientParams): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

function parseLngLatPair(str: string | undefined) {
  if (!str) return null
  const parts = str.split(',').map(s => s.trim())
  if (parts.length !== 2) return null
  const lng = Number(parts[0])
  const lat = Number(parts[1])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lng, lat }
}

// main
const app = new Hono()

app.use('*', secureHeaders())

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,               // Limit each IP to 100 requests per window
  standardHeaders: 'draft-7', // Return rate limit info in the `RateLimit-*` headers
  keyGenerator: (c) => c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? c.req.header('x-real-ip') ?? 'unknown',
})

app.use('/api/*', limiter)

type formData = {
  longitude: number,
  latitude: number,
  file: File
}

// app.get('/', serveStatic({ path: './public/index.html' }))

app.get('/styles/sunset', serveStatic({ path: './public/sunset_min.json' }))

// api endpoint, gets all rows from table as GeoJSON using PostGIS
app.get('/api/sunsets', async (c) => {
  const result = await db.execute(sql`
    SELECT json_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(
        json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geo)::json,
            'properties', json_build_object('id', id)
          )
        ), 
        '[]'::json
      )
    ) as geojson
    FROM ${sunsetsTable}
  `);

  if (!result.rows.length) return c.json({ type: 'FeatureCollection', features: [] });
  return c.json(result.rows[0].geojson);
})

// newer location-based queries
// app.get('/api/sunsets', async (c) => {
//   const centreRaw = c.req.query('centre')
//   const zoomRaw = c.req.query('zoom')
//
//   const centre = parseLngLatPair(centreRaw)
//   const zoom = Number(zoomRaw);
//
//   if (!centre || !zoom) {
//     return c.json({ error: 'Invalid or missing query parameters.' }, 400);
//   }
//
//   if (zoom < 5) {
//     return c.json({ error: 'Zoom too low.' }, 400);
//   }
//
//   const radius = (36864 * 2 ** (1 - zoom))
//
//   const sunsets = await db.select().from(sunsetsTable).where(sql`ST_DWithin(
//     ${sunsetsTable.geo}, ST_SetSRID(ST_MakePoint(${centre.lng}, ${centre.lat}), 4326)::geography, ${radius * 1000}
//   )`)
//
//   return c.json(toGeoJSON(sunsets))
// })

// get image
app.get('/api/sunsets/:id', async (c) => {
  const id = c.req.param('id')
  const url = await createPresignedGetUrl({
    client: s3Client,
    bucket: process.env.AWS_BUCKET_NAME!,
    key: id,
  });
  return c.text(url);
})

// upload image
app.post(
  '/api/sunsets',
  bodyLimit({
    maxSize: 5 * 1024 * 1024, // 5MB — matches S3 presigned POST limit
    onError: (c) => {
      return c.text('Payload Too Large', 413)
    },
  }),
  async (c) => {
    let fd: formData = await c.req.parseBody() as any;

    const longitude = Number(fd.longitude);
    const latitude = Number(fd.latitude);
    if (
      Number.isNaN(longitude) || Number.isNaN(latitude) ||
      longitude < -180 || longitude > 180 ||
      latitude < -90 || latitude > 90
    ) {
      c.status(400)
      return c.text("InvalidCoordinates")
    }

    // check if image is a sunset
    const file = fd.file;
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const input = await preprocessBuffer(imageBuffer).catch(() => null);
    if (!input) {
      c.status(400)
      return c.text("InvalidImage")
    }

    const results = await session.run({ [session.inputNames[0]]: input });
    const predictionArray = Array.from(results[session.outputNames[0]].data as Float32Array);
    const highestIndex = predictionArray.indexOf(Math.max(...predictionArray));

    // if not sunset return error
    if (highestIndex !== 1) {
      c.status(400)
      return c.text("ImageNotSunset")
    }

    try {
      // generate a uuidv4
      let uuid = uuidv4();

      // create s3 presigned POST
      const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: uuid,
        Conditions: [
          ["content-length-range", 0, 5242880], // up to 5 MB
        ],
        Expires: 3600,
      });

      const s: typeof sunsetsTable.$inferInsert = {
        id: uuid,
        geo: [longitude, latitude],
      };

      await db.insert(sunsetsTable).values(s)

      c.status(201)
      return c.json({ url, fields })
    } catch (e) {
      console.error(e)
      c.status(500)
      return c.text("Internal Server Error")
    }
  })

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
