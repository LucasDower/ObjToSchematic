import { OtS_Mesh } from '../ots_mesh';

export abstract class IImporter {
    public abstract import(file: ReadableStream<Uint8Array>): Promise<OtS_Mesh>;
}