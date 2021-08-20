//const fs = require("fs");
//const png = require("pngjs").PNG;

import * as fs from "fs";
import { PNG, PNGWithMetadata } from "pngjs";
import { UV, RGBA } from "./util";
import { clamp } from "./math";

export class Texture {

	private _image: PNGWithMetadata;

	constructor(filename: string) {
		try {
			const data = fs.readFileSync(filename);
			this._image = PNG.sync.read(data);
		} catch (err) {
			throw Error(`Could not read ${filename}`);
		}
		if (this._image.bpp !== 4) {
			throw Error("Image must be RBGA format");
		}
	}

	getRGBA(uv: UV): RGBA {
		uv.v = 1 - uv.v;

		const x = Math.floor(uv.u * this._image.width);
		const y = Math.floor(uv.v * this._image.height);

		const index = this._image.bpp * (this._image.width * y + x);
		const rgba = this._image.data.slice(index, index + this._image.bpp)
		
		return {
			r: rgba[0]/255,
			g: rgba[1]/255,
			b: rgba[2]/255,
			a: rgba[3]/255
		};
	}

}