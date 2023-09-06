export interface IHashable {
    hash(): number;
    equals(other: IHashable): boolean;
}
