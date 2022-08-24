import { Atlas } from './atlas';
import { RGBA } from './colour';
import { Palette } from './palette';
import { AppTypes } from './util';

export class AtlasPalette {
    private _atlas: Atlas;
    private _palette: Palette;

    public constructor(atlas: Atlas, palette: Palette) {
        this._atlas = atlas;
        this._palette = palette;

        this._palette.removeMissingAtlasBlocks(this._atlas);
    }

    public getBlock(colour: RGBA, exclude?: AppTypes.TNamespacedBlockName[]) {
        return this._atlas.getBlock(colour, this._palette, exclude);
    }
}
