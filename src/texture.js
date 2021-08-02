const fs = require("fs");
const png = require("pngjs").PNG;

class Texture {

	constructor(filename) {
		const file = fs.readFileSync(filename);
		this._image = png.sync.read(file);
	}

	getRGBA(u, v) {
		//u = 1 - u;
		v = 1 - v;

		let x = Math.floor(this._image.width * u);
		let y = Math.floor(this._image.height * v);

		x = Math.max(0, Math.min(x, this._image.width - 1));
		y = Math.max(0, Math.min(y, this._image.height - 1));

		const index = this._image.bpp * (this._image.width * y + x);
		return this._image.data.slice(index, index + this._image.bpp);
	}

}

module.exports.Texture = Texture;