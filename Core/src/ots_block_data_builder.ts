import { OtS_ColourAverager, OtS_Colours, RGBA } from "./colour";
import { OtS_BlockData_PerBlock, OtS_BlockData_PerFace, OtS_FaceData } from "./ots_block_mesh_converter";

export class OtS_BlockDataBuilder {
    private _textures: Map<string, Uint8ClampedArray>;
    private _blocks: Map<string, OtS_FaceData<string>>;

    public static Create(): OtS_BlockDataBuilder {
        return new this();
    }

    private constructor() {
        this._textures = new Map();
        this._blocks = new Map();
    }

    public registerTexture(textureName: string, textureData: Uint8ClampedArray) {
        this._textures.set(textureName, textureData);
    }

    public registerBlock(blockName: string, blockData: OtS_FaceData<string>) {
        this._blocks.set(blockName, blockData);
    }

    public process(mode: "per-block"): OtS_BlockData_PerBlock<RGBA>
    public process(mode: "per-face"): OtS_BlockData_PerFace<string>
    public process(mode: "per-block" | "per-face") {
        if (mode === 'per-block') {
            return this._handlePerBlock();
        } else {
            return this._handlePerFace();
        }
    }

    private _handlePerBlock(): OtS_BlockData_PerBlock<RGBA> {
        const cachedAverages = new Map<string, RGBA>();

        const getAverage = (textureName: string): RGBA => {
            const cached = cachedAverages.get(textureName);
            if (cached !== undefined) {
                return cached;
            }

            const texture = this._textures.get(textureName);
            if (texture === undefined) {
                throw `Texture '${textureName}' is not registered`;
            }

            const average =  OtS_ColourAverager.From(texture);
            cachedAverages.set(textureName, average);

            return average;
        };

        const data: OtS_BlockData_PerBlock<RGBA> = [];
        this._blocks.forEach((block, blockName) => {
            const averager = OtS_ColourAverager.Create();
        
            averager.add(getAverage(block.up));
            averager.add(getAverage(block.down));
            averager.add(getAverage(block.north));
            averager.add(getAverage(block.south));
            averager.add(getAverage(block.east));
            averager.add(getAverage(block.west));

            const average = averager.compute();
            data.push({
                name: blockName,
                colour: average,
            })
        });

        return data;
    }

    private _handlePerFace(): OtS_BlockData_PerFace<string> {
        return {
            blocks: [],
            textures: {},
        };
    }

}