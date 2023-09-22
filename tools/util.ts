import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { decode as jpegDecode } from 'jpeg-js';
import { OtS_Texture } from 'src/runtime/ots_texture';

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
            return new OtS_Texture(Uint8ClampedArray.from(jpeg.data), jpeg.width, jpeg.width, 'nearest', 'repeat');
        }
    }
}