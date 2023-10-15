import fs from 'node:fs';
import path from 'node:path';

import OTS from 'ots-core';

import { decode as jpegDecode } from 'jpeg-js';

export function createReadableStream(p: fs.PathLike) {
    return new ReadableStream({
        async start(controller) {
            const readStream = fs.createReadStream(p);

            readStream.on('data', (chunk) => {
                controller.enqueue(chunk);
            });

            readStream.on('end', () => {
                controller.close();
            });

            readStream.on('error', (err) => {
                throw err;
            });
        },
    });
}

export function createOtSTexture(p: fs.PathLike) {
    const ext = path.extname(p.toString());
    switch (ext) {
        case '.jpg':
        case '.jpeg': {
            var jpegData = fs.readFileSync(p);
            const jpeg = jpegDecode(jpegData, {
                maxMemoryUsageInMB: undefined,
                formatAsRGBA: true,
            });
            return new OTS.texture(Uint8ClampedArray.from(jpeg.data), jpeg.width, jpeg.width, 'nearest', 'repeat');
        }
    }
}