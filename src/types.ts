export abstract class IBuffer
{
    length: number;

    abstract write(string: string, offset?: number, length?: number, encoding?: string): number;

    abstract toString(encoding?: string, start?: number, end?: number): string;

    abstract toJSON(): {type: 'Buffer', data: any[]};

    abstract equals(otherBuffer: IBuffer): boolean;

    abstract compare(otherBuffer: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;

    abstract copy(targetBuffer: IBuffer, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;

    abstract slice(start?: number, end?: number): IBuffer;

    abstract writeUIntLE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;

    abstract writeUIntBE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;

    abstract writeIntLE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;

    abstract writeIntBE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;

    abstract readUIntLE(offset: number, byteLength: number, noAssert?: boolean): number;

    abstract readUIntBE(offset: number, byteLength: number, noAssert?: boolean): number;

    abstract readIntLE(offset: number, byteLength: number, noAssert?: boolean): number;

    abstract readIntBE(offset: number, byteLength: number, noAssert?: boolean): number;

    abstract readUInt8(offset: number, noAssert?: boolean): number;

    abstract readUInt16LE(offset: number, noAssert?: boolean): number;

    abstract readUInt16BE(offset: number, noAssert?: boolean): number;

    abstract readUInt32LE(offset: number, noAssert?: boolean): number;

    abstract readUInt32BE(offset: number, noAssert?: boolean): number;

    abstract readBigUInt64LE(offset: number): bigint;

    abstract readBigUInt64BE(offset: number): bigint;

    abstract readInt8(offset: number, noAssert?: boolean): number;

    abstract readInt16LE(offset: number, noAssert?: boolean): number;

    abstract readInt16BE(offset: number, noAssert?: boolean): number;

    abstract readInt32LE(offset: number, noAssert?: boolean): number;

    abstract readInt32BE(offset: number, noAssert?: boolean): number;

    abstract readBigInt64LE(offset: number): bigint;

    abstract readBigInt64BE(offset: number): bigint;

    abstract readFloatLE(offset: number, noAssert?: boolean): number;

    abstract readFloatBE(offset: number, noAssert?: boolean): number;

    abstract readDoubleLE(offset: number, noAssert?: boolean): number;

    abstract readDoubleBE(offset: number, noAssert?: boolean): number;

    abstract reverse(): this;

    abstract swap16(): IBuffer;

    abstract swap32(): IBuffer;

    abstract swap64(): IBuffer;

    abstract writeUInt8(value: number, offset: number, noAssert?: boolean): number;

    abstract writeUInt16LE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeUInt16BE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeUInt32LE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeUInt32BE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeBigUInt64LE(value: number, offset: number): bigint;

    abstract writeBigUInt64BE(value: number, offset: number): bigint;

    abstract writeInt8(value: number, offset: number, noAssert?: boolean): number;

    abstract writeInt16LE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeInt16BE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeInt32LE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeInt32BE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeBigInt64LE(value: number, offset: number): bigint;

    abstract writeBigInt64BE(value: number, offset: number): bigint;

    abstract writeFloatLE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeFloatBE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeDoubleLE(value: number, offset: number, noAssert?: boolean): number;

    abstract writeDoubleBE(value: number, offset: number, noAssert?: boolean): number;

    abstract fill(value: any, offset?: number, end?: number): this;

    abstract indexOf(value: string|number|IBuffer, byteOffset?: number, encoding?: string): number;

    abstract lastIndexOf(value: string|number|IBuffer, byteOffset?: number, encoding?: string): number;

    abstract includes(value: string|number|IBuffer, byteOffset?: number, encoding?: string): boolean;


    static from(array: any[]): IBuffer;
    static from(arrayBuffer: ArrayBuffer, byteOffset?: number, length?: number): IBuffer;
    static from(buffer: IBuffer|Uint8Array): IBuffer;
    static from(str: string, encoding?: string): IBuffer

    /**
     * Returns true if {obj} is a Buffer
     *
     * @param obj object to test.
     */
    static isBuffer(obj: any): obj is IBuffer;

    /**
     * Returns true if {encoding} is a valid encoding argument.
     * Valid string encodings in Node 0.12: 'ascii'|'utf8'|'utf16le'|'ucs2'(alias of 'utf16le')|'base64'|'binary'(deprecated)|'hex'
     *
     * @param encoding string to test.
     */
    static isEncoding(encoding: string): boolean;

    /**
     * Gives the actual byte length of a string. encoding defaults to 'utf8'.
     * This is not the same as String.prototype.length since that returns the number of characters in a string.
     *
     * @param string string to test.
     * @param encoding encoding used to evaluate (defaults to 'utf8')
     */
    static byteLength(string: string, encoding?: string): number;

    /**
     * Returns a buffer which is the result of concatenating all the buffers in the list together.
     *
     * If the list has no items, or if the totalLength is 0, then it returns a zero-length buffer.
     * If the list has exactly one item, then the first item of the list is returned.
     * If the list has more than one item, then a new Buffer is created.
     *
     * @param list An array of Buffer objects to concatenate
     * @param totalLength Total length of the buffers when concatenated.
     *   If totalLength is not provided, it is read from the buffers in the list. However, this adds an additional loop to the function, so it is faster to provide the length explicitly.
     */
    static concat(list: Uint8Array[], totalLength?: number): IBuffer;

    /**
     * The same as buf1.compare(buf2).
     */
    static compare(buf1: Uint8Array, buf2: Uint8Array): number;

    /**
     * Allocates a new buffer of {size} octets.
     *
     * @param size count of octets to allocate.
     * @param fill if specified, buffer will be initialized by calling buf.fill(fill).
     *    If parameter is omitted, buffer will be filled with zeros.
     * @param encoding encoding used for call to buf.fill while initializing
     */
    static alloc(size: number, fill?: string|IBuffer|number, encoding?: string): IBuffer;

    /**
     * Allocates a new buffer of {size} octets, leaving memory not initialized, so the contents
     * of the newly created Buffer are unknown and may contain sensitive data.
     *
     * @param size count of octets to allocate
     */
    static allocUnsafe(size: number): IBuffer;

    /**
     * Allocates a new non-pooled buffer of {size} octets, leaving memory not initialized, so the contents
     * of the newly created Buffer are unknown and may contain sensitive data.
     *
     * @param size count of octets to allocate
     */
    static allocUnsafeSlow(size: number): IBuffer
}
