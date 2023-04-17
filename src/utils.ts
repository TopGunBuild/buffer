import { base64ToBytes, fromByteArray } from './base64';
import { TGBuffer } from './buffer';

const K_MAX_LENGTH = 0x7fffffff;

export function asciiSlice(buf: TGBuffer, start: number, end: number): string
{
    let ret = '';
    end     = Math.min(buf.length, end);

    for (let i = start; i < end; ++i)
    {
        ret += String.fromCharCode(buf[i] & 0x7f);
    }
    return ret;
}

export function latin1Slice(buf: TGBuffer, start: number, end: number): string
{
    let ret = '';
    end     = Math.min(buf.length, end);

    for (let i = start; i < end; ++i)
    {
        ret += String.fromCharCode(buf[i]);
    }
    return ret;
}

export function base64Slice(buf: TGBuffer, start: number, end: number): string
{
    if (start === 0 && end === buf.length)
    {
        return fromByteArray(buf);
    }
    else
    {
        return fromByteArray(buf.slice(start, end));
    }
}

export function utf16leSlice(
    buf: TGBuffer,
    start: number,
    end: number,
): string
{
    const bytes = buf.slice(start, end);
    let res     = '';
    // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
    for (let i = 0; i < bytes.length - 1; i += 2)
    {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
    }
    return res;
}

export function base64Write(
    buf: TGBuffer,
    string: string,
    offset?: number,
    length?: number,
): number
{
    return blitBuffer(base64ToBytes(string), buf, offset, length);
}

export function asciiToBytes(str: string): number[]
{
    const byteArray = [];
    for (let i = 0; i < str.length; ++i)
    {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xff);
    }
    return byteArray;
}

export function asciiWrite(
    buf: TGBuffer,
    string: string,
    offset?: number,
    length?: number,
): number
{
    return blitBuffer(asciiToBytes(string), buf, offset, length);
}

export function utf8Write(
    buf: TGBuffer,
    string: string,
    offset?: number,
    length?: number,
): number
{
    return blitBuffer(
        utf8ToBytes(string, buf.length - offset),
        buf,
        offset,
        length,
    );
}

export function blitBuffer(
    src: ArrayLike<any>,
    dst: TGBuffer,
    offset?: number,
    length?: number,
): number
{
    let i;
    for (i = 0; i < length; ++i)
    {
        if (i + offset >= dst.length || i >= src.length) break;
        dst[i + offset] = src[i];
    }
    return i;
}

export function ucs2Write(buf, string, offset, length?: number)
{
    return blitBuffer(
        utf16leToBytes(string, buf.length - offset),
        buf,
        offset,
        length,
    );
}

export function utf16leToBytes(str: string, units: number): number[]
{
    let c, hi, lo;
    const byteArray: number[] = [];
    for (let i = 0; i < str.length; ++i)
    {
        if ((units -= 2) < 0) break;

        c  = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
    }

    return byteArray;
}

export function hexWrite(
    buf: any,
    string: string,
    offset?: number,
    length?: number,
): number
{
    offset          = Number(offset) || 0;
    const remaining = buf.length - offset;
    if (!length)
    {
        length = remaining;
    }
    else
    {
        length = Number(length);
        if (length > remaining)
        {
            length = remaining;
        }
    }

    const strLen = string.length;

    if (length > strLen / 2)
    {
        length = strLen / 2;
    }
    let i;
    for (i = 0; i < length; ++i)
    {
        const parsed = parseInt(string.substr(i * 2, 2), 16);
        if (numberIsNaN(parsed)) return i;
        buf[offset + i] = parsed;
    }
    return i;
}

export function assertSize(size: number): void
{
    if (typeof size !== 'number')
    {
        throw new TypeError('"size" argument must be of type number');
    }
    else if (size < 0)
    {
        throw new RangeError(
            'The value "' + size + '" is invalid for option "size"',
        );
    }
}

export function fromObject(obj: any): TGBuffer
{
    if (TGBuffer.isBuffer(obj))
    {
        const len = checked(obj.length) | 0;
        const buf = createBuffer(len);

        if (buf.length === 0)
        {
            return buf;
        }

        obj.copy(buf, 0, 0, len);
        return buf;
    }

    if (obj.length !== undefined)
    {
        if (typeof obj.length !== 'number' || numberIsNaN(obj.length))
        {
            return createBuffer(0);
        }
        return fromArrayLike(obj);
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data))
    {
        return fromArrayLike(obj.data);
    }
}

export function fromString(string: string, encoding: string): TGBuffer
{
    if (typeof encoding !== 'string' || encoding === '')
    {
        encoding = 'utf8';
    }

    if (!TGBuffer.isEncoding(encoding))
    {
        throw new TypeError('Unknown encoding: ' + encoding);
    }

    const length = byteLength(string, encoding) | 0;
    let buf      = createBuffer(length);

    const actual = buf.write(string, encoding);

    if (actual !== length)
    {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        buf = buf.slice(0, actual);
    }

    return buf;
}

export function byteLength(
    string: string|ArrayBuffer,
    encoding: string,
): number
{
    if (TGBuffer.isBuffer(string))
    {
        return string.length;
    }
    if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer))
    {
        return (string as ArrayBuffer).byteLength;
    }
    if (typeof string !== 'string')
    {
        throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
            'Received type ' +
            typeof string,
        );
    }

    const len       = string.length;
    const mustMatch = arguments.length > 2 && arguments[2] === true;
    if (!mustMatch && len === 0) return 0;

    // Use a for loop to avoid recursion
    let loweredCase = false;

    switch (encoding)
    {
        case 'ascii':
        case 'latin1':
        case 'binary':
            return len;
        case 'utf8':
        case 'utf-8':
            return utf8ToBytes(string).length;
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
            return len * 2;
        case 'hex':
            return len >>> 1;
        case 'base64':
            return base64ToBytes(string).length;
        default:
            if (loweredCase)
            {
                return mustMatch ? -1 : utf8ToBytes(string).length; // assume utf8
            }
            encoding    = ('' + encoding).toLowerCase();
            loweredCase = true;
    }
}

export function fromArrayLike(array: ArrayLike<any>): TGBuffer
{
    const length = array.length < 0 ? 0 : checked(array.length) | 0;
    const buf    = createBuffer(length);
    for (let i = 0; i < length; i += 1)
    {
        buf[i] = array[i] & 255;
    }
    return buf;
}

export function checked(length: number): number
{
    // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= K_MAX_LENGTH)
    {
        throw new RangeError(
            'Attempt to allocate Buffer larger than maximum ' +
            'size: 0x' +
            K_MAX_LENGTH.toString(16) +
            ' bytes',
        );
    }
    return length | 0;
}

export function fromArrayView(arrayView: ArrayLike<any>): TGBuffer
{
    if (isInstance(arrayView, Uint8Array))
    {
        const copy = new Uint8Array(arrayView);
        return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
    }
    return fromArrayLike(arrayView);
}

export function fromArrayBuffer(
    array: ArrayBuffer,
    byteOffset: number,
    length: number,
): TGBuffer
{
    if (byteOffset < 0 || array.byteLength < byteOffset)
    {
        throw new RangeError('"offset" is outside of buffer bounds');
    }

    if (array.byteLength < byteOffset + (length || 0))
    {
        throw new RangeError('"length" is outside of buffer bounds');
    }

    let buf: TGBuffer;
    if (byteOffset === undefined && length === undefined)
    {
        buf = new TGBuffer(array);
    }
    else if (length === undefined)
    {
        buf = new TGBuffer(array, byteOffset);
    }
    else
    {
        buf = new TGBuffer(array, byteOffset, length);
    }

    return buf;
}

export function utf8ToBytes(string: string, units?: number): number[]
{
    units                 = units || Infinity;
    let codePoint;
    const length          = string.length;
    let leadSurrogate     = null;
    const bytes: number[] = [];

    for (let i = 0; i < length; ++i)
    {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xd7ff && codePoint < 0xe000)
        {
            // last char was a lead
            if (!leadSurrogate)
            {
                // no lead yet
                if (codePoint > 0xdbff)
                {
                    // unexpected trail
                    if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                    continue;
                }
                else if (i + 1 === length)
                {
                    // unpaired lead
                    if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                    continue;
                }

                // valid lead
                leadSurrogate = codePoint;

                continue;
            }

            // 2 leads in a row
            if (codePoint < 0xdc00)
            {
                if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
                leadSurrogate = codePoint;
                continue;
            }

            // valid surrogate pair
            codePoint =
                (((leadSurrogate - 0xd800) << 10) | (codePoint - 0xdc00)) +
                0x10000;
        }
        else if (leadSurrogate)
        {
            // valid bmp char, but last char was a lead
            if ((units -= 3) > -1) bytes.push(0xef, 0xbf, 0xbd);
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80)
        {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint);
        }
        else if (codePoint < 0x800)
        {
            if ((units -= 2) < 0) break;
            bytes.push((codePoint >> 0x6) | 0xc0, (codePoint & 0x3f) | 0x80);
        }
        else if (codePoint < 0x10000)
        {
            if ((units -= 3) < 0) break;
            bytes.push(
                (codePoint >> 0xc) | 0xe0,
                ((codePoint >> 0x6) & 0x3f) | 0x80,
                (codePoint & 0x3f) | 0x80,
            );
        }
        else if (codePoint < 0x110000)
        {
            if ((units -= 4) < 0) break;
            bytes.push(
                (codePoint >> 0x12) | 0xf0,
                ((codePoint >> 0xc) & 0x3f) | 0x80,
                ((codePoint >> 0x6) & 0x3f) | 0x80,
                (codePoint & 0x3f) | 0x80,
            );
        }
        else
        {
            throw new Error('Invalid code point');
        }
    }

    return bytes;
}

export function createBuffer(length: number): TGBuffer
{
    if (length > K_MAX_LENGTH)
    {
        throw new RangeError(
            'The value "' + length + '" is invalid for option "size"',
        );
    }
    return new TGBuffer(length);
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
export function isInstance(obj: any, type: any): boolean
{
    return (
        obj instanceof type ||
        (obj != null &&
            obj.constructor != null &&
            obj.constructor.name != null &&
            obj.constructor.name === type.name)
    );
}

export function numberIsNaN(obj: any): boolean
{
    // For IE11 support
    return obj !== obj; // eslint-disable-line no-self-compare
}

export function slowToString(encoding: string, start: number, end: number): string
{
    let loweredCase = false;

    // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
    // property of a typed array.

    // This behaves neither like String nor Uint8Array in that we set start/end
    // to their upper/lower bounds if the value passed is out of range.
    // undefined is handled specially as per ECMA-262 6th Edition,
    // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
    if (start === undefined || start < 0)
    {
        start = 0;
    }
    // Return early if start > this.length. Done here to prevent potential uint32
    // coercion fail below.
    if (start > this.length)
    {
        return '';
    }

    if (end === undefined || end > this.length)
    {
        end = this.length;
    }

    if (end <= 0)
    {
        return '';
    }

    // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
    end >>>= 0;
    start >>>= 0;

    if (end <= start)
    {
        return '';
    }

    if (!encoding) encoding = 'utf8';

    while (true)
    {
        switch (encoding)
        {
            case 'hex':
                return hexSlice(this, start, end);

            case 'utf8':
            case 'utf-8':
                return utf8Slice(this, start, end);

            case 'ascii':
                return asciiSlice(this, start, end);

            case 'latin1':
            case 'binary':
                return latin1Slice(this, start, end);

            case 'base64':
                return base64Slice(this, start, end);

            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
                return utf16leSlice(this, start, end);

            default:
                if (loweredCase)
                {
                    throw new TypeError('Unknown encoding: ' + encoding);
                }
                encoding    = (encoding + '').toLowerCase();
                loweredCase = true;
        }
    }
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
const hexSliceLookupTable = (function ()
{
    const alphabet = '0123456789abcdef';
    const table    = new Array(256);
    for (let i = 0; i < 16; ++i)
    {
        const i16 = i * 16;
        for (let j = 0; j < 16; ++j)
        {
            table[i16 + j] = alphabet[i] + alphabet[j];
        }
    }
    return table;
})();

function hexSlice(buf: TGBuffer, start: number, end: number): string
{
    const len = buf.length;

    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;

    let out = '';
    for (let i = start; i < end; ++i)
    {
        out += hexSliceLookupTable[buf[i]];
    }
    return out;
}

export function utf8Slice(buf: TGBuffer, start: number, end: number): string
{
    end       = Math.min(buf.length, end);
    const res: number[] = [];

    let i = start;
    while (i < end)
    {
        const firstByte      = buf[i];
        let codePoint        = null;
        let bytesPerSequence =
                firstByte > 0xef
                    ? 4
                    : firstByte > 0xdf
                    ? 3
                    : firstByte > 0xbf
                        ? 2
                        : 1;

        if (i + bytesPerSequence <= end)
        {
            let secondByte, thirdByte, fourthByte, tempCodePoint;

            switch (bytesPerSequence)
            {
                case 1:
                    if (firstByte < 0x80)
                    {
                        codePoint = firstByte;
                    }
                    break;
                case 2:
                    secondByte = buf[i + 1];
                    if ((secondByte & 0xc0) === 0x80)
                    {
                        tempCodePoint =
                            ((firstByte & 0x1f) << 0x6) | (secondByte & 0x3f);
                        if (tempCodePoint > 0x7f)
                        {
                            codePoint = tempCodePoint;
                        }
                    }
                    break;
                case 3:
                    secondByte = buf[i + 1];
                    thirdByte  = buf[i + 2];
                    if (
                        (secondByte & 0xc0) === 0x80 &&
                        (thirdByte & 0xc0) === 0x80
                    )
                    {
                        tempCodePoint =
                            ((firstByte & 0xf) << 0xc) |
                            ((secondByte & 0x3f) << 0x6) |
                            (thirdByte & 0x3f);
                        if (
                            tempCodePoint > 0x7ff &&
                            (tempCodePoint < 0xd800 || tempCodePoint > 0xdfff)
                        )
                        {
                            codePoint = tempCodePoint;
                        }
                    }
                    break;
                case 4:
                    secondByte = buf[i + 1];
                    thirdByte  = buf[i + 2];
                    fourthByte = buf[i + 3];
                    if (
                        (secondByte & 0xc0) === 0x80 &&
                        (thirdByte & 0xc0) === 0x80 &&
                        (fourthByte & 0xc0) === 0x80
                    )
                    {
                        tempCodePoint =
                            ((firstByte & 0xf) << 0x12) |
                            ((secondByte & 0x3f) << 0xc) |
                            ((thirdByte & 0x3f) << 0x6) |
                            (fourthByte & 0x3f);
                        if (
                            tempCodePoint > 0xffff &&
                            tempCodePoint < 0x110000
                        )
                        {
                            codePoint = tempCodePoint;
                        }
                    }
            }
        }

        if (codePoint === null)
        {
            // we did not generate a valid codePoint so insert a
            // replacement char (U+FFFD) and advance only 1 byte
            codePoint        = 0xfffd;
            bytesPerSequence = 1;
        }
        else if (codePoint > 0xffff)
        {
            // encode to utf16 (surrogate pair dance)
            codePoint -= 0x10000;
            res.push(((codePoint >>> 10) & 0x3ff) | 0xd800);
            codePoint = 0xdc00 | (codePoint & 0x3ff);
        }

        res.push(codePoint);
        i += bytesPerSequence;
    }

    return decodeCodePointsArray(res);
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000;

export function decodeCodePointsArray(codePoints: number[]): string
{
    const len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH)
    {
        return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
    }

    // Decode in chunks to avoid "call stack size exceeded".
    let res = '';
    let i   = 0;
    while (i < len)
    {
        res += String.fromCharCode.apply(
            String,
            codePoints.slice(i, (i += MAX_ARGUMENTS_LENGTH)),
        );
    }
    return res;
}
