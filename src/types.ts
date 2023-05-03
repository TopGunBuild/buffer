export interface IBuffer extends Array<any> {

    from(array: any[]): IBuffer;
    from(buffer: Uint8Array): IBuffer;
    from(str: string, encoding?: string): IBuffer;
    from(value: ArrayBuffer | string | Uint8Array | any[], encodingOrOffset?: number, length?: number): IBuffer;

    alloc(size: number, fill?: string | number, encoding?: string): IBuffer;
    allocUnsafe(length: number): IBuffer;

    fill(value: number, start?: number, end?: number): this;

    concat(arr: any[]): IBuffer;

    toString(encoding?: string, start?: number, end?: number): string;
}