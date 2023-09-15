import { Mesh } from '../mesh';

export abstract class IImporter {
    public abstract import(file: ArrayBuffer): Promise<Mesh>;
}