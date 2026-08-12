export const Endian = {
	LITTLE_ENDIAN: 'littleEndian',
	BIG_ENDIAN: 'bigEndian',
} as const;

export type Endian = (typeof Endian)[keyof typeof Endian];

const SIZE_OF_BOOLEAN = 1;
const SIZE_OF_INT8 = 1;
const SIZE_OF_INT16 = 2;
const SIZE_OF_INT32 = 4;
const SIZE_OF_UINT8 = 1;
const SIZE_OF_UINT16 = 2;
const SIZE_OF_UINT32 = 4;
const SIZE_OF_FLOAT32 = 4;
const SIZE_OF_FLOAT64 = 8;

const _encoder = new TextEncoder();
const _decoder = new TextDecoder('utf-8');

/**
 * ByteArray provides optimized reading and writing of binary data.
 */
export class ByteArray {
	protected _bufferExtSize: number;
	protected _data: DataView;
	protected _bytes: Uint8Array;
	protected _position = 0;
	protected _writePosition = 0;
	protected _littleEndian = false;

	public constructor(buffer?: ArrayBuffer | Uint8Array, bufferExtSize = 0) {
		this._bufferExtSize = bufferExtSize < 0 ? 0 : bufferExtSize;
		let bytes: Uint8Array;
		let wpos = 0;
		if (buffer) {
			const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
			wpos = uint8.length;
			bytes = this._allocate(wpos);
			bytes.set(uint8);
		} else {
			bytes = new Uint8Array(Math.max(bufferExtSize, 0));
		}
		this._writePosition = wpos;
		this._bytes = bytes;
		this._data = new DataView(bytes.buffer);
	}

	// ── Endian ────────────────────────────────────────────────────────────────

	public get endian(): Endian {
		return this._littleEndian ? Endian.LITTLE_ENDIAN : Endian.BIG_ENDIAN;
	}
	public set endian(value: Endian) {
		this._littleEndian = value === Endian.LITTLE_ENDIAN;
	}

	// ── Buffer access ─────────────────────────────────────────────────────────

	public get buffer(): ArrayBuffer {
		return this._data.buffer.slice(0, this._writePosition) as ArrayBuffer;
	}
	public set buffer(value: ArrayBuffer) {
		const uint8 = new Uint8Array(value);
		const bytes = this._allocate(value.byteLength);
		bytes.set(uint8);
		this._writePosition = value.byteLength;
		this._bytes = bytes;
		this._data = new DataView(bytes.buffer as ArrayBuffer);
	}

	public get rawBuffer(): ArrayBuffer {
		return this._data.buffer as ArrayBuffer;
	}

	public get bytes(): Uint8Array {
		return this._bytes;
	}

	public get dataView(): DataView {
		return this._data;
	}
	public set dataView(value: DataView) {
		this.buffer = value.buffer as ArrayBuffer;
	}

	public get bufferOffset(): number {
		return this._data.byteOffset;
	}

	// ── Position / Length ─────────────────────────────────────────────────────

	public get position(): number {
		return this._position;
	}
	public set position(value: number) {
		this._position = value;
		if (value > this._writePosition) this._writePosition = value;
	}

	public get length(): number {
		return this._writePosition;
	}
	public set length(value: number) {
		this._writePosition = value;
		if (this._data.byteLength > value) this._position = value;
		this._validateBuffer(value);
	}

	public get bytesAvailable(): number {
		return this._writePosition - this._position;
	}

	// ── Core ──────────────────────────────────────────────────────────────────

	public clear(): void {
		const buf = new ArrayBuffer(this._bufferExtSize);
		this._data = new DataView(buf);
		this._bytes = new Uint8Array(buf);
		this._position = 0;
		this._writePosition = 0;
	}

	// ── Read ──────────────────────────────────────────────────────────────────

	public readBoolean(): boolean {
		this._validate(SIZE_OF_BOOLEAN);
		return !!this._bytes[this._position++];
	}

	public readByte(): number {
		this._validate(SIZE_OF_INT8);
		return this._data.getInt8(this._position++);
	}

	public readUnsignedByte(): number {
		this._validate(SIZE_OF_UINT8);
		return this._bytes[this._position++];
	}

	public readShort(): number {
		this._validate(SIZE_OF_INT16);
		const v = this._data.getInt16(this._position, this._littleEndian);
		this._position += SIZE_OF_INT16;
		return v;
	}

	public readUnsignedShort(): number {
		this._validate(SIZE_OF_UINT16);
		const v = this._data.getUint16(this._position, this._littleEndian);
		this._position += SIZE_OF_UINT16;
		return v;
	}

	public readInt(): number {
		this._validate(SIZE_OF_INT32);
		const v = this._data.getInt32(this._position, this._littleEndian);
		this._position += SIZE_OF_INT32;
		return v;
	}

	public readUnsignedInt(): number {
		this._validate(SIZE_OF_UINT32);
		const v = this._data.getUint32(this._position, this._littleEndian);
		this._position += SIZE_OF_UINT32;
		return v;
	}

	public readFloat(): number {
		this._validate(SIZE_OF_FLOAT32);
		const v = this._data.getFloat32(this._position, this._littleEndian);
		this._position += SIZE_OF_FLOAT32;
		return v;
	}

	public readDouble(): number {
		this._validate(SIZE_OF_FLOAT64);
		const v = this._data.getFloat64(this._position, this._littleEndian);
		this._position += SIZE_OF_FLOAT64;
		return v;
	}

	public readBytes(bytes: ByteArray, offset = 0, length = 0): void {
		const available = this._writePosition - this._position;
		if (available < 0) throw new RangeError('ByteArray: read past end');
		if (length === 0) length = available;
		else if (length > available) throw new RangeError('ByteArray: read past end');
		const pos = bytes._position;
		bytes._position = 0;
		bytes._ensureWrite(offset + length);
		bytes._position = pos;
		bytes._bytes.set(this._bytes.subarray(this._position, this._position + length), offset);
		this._position += length;
	}

	public readUTF(): string {
		const length = this.readUnsignedShort();
		return length > 0 ? this.readUTFBytes(length) : '';
	}

	public readUTFBytes(length: number): string {
		this._validate(length);
		const slice = new Uint8Array(this._data.buffer, this._data.byteOffset + this._position, length);
		this._position += length;
		return _decoder.decode(slice);
	}

	// ── Write ─────────────────────────────────────────────────────────────────

	public writeBoolean(value: boolean): void {
		this._ensureWrite(SIZE_OF_BOOLEAN);
		this._bytes[this._position++] = value ? 1 : 0;
	}

	public writeByte(value: number): void {
		this._ensureWrite(SIZE_OF_INT8);
		this._bytes[this._position++] = value & 0xff;
	}

	public writeUnsignedByte(value: number): void {
		this._ensureWrite(SIZE_OF_UINT8);
		this._bytes[this._position++] = value & 0xff;
	}

	public writeShort(value: number): void {
		this._ensureWrite(SIZE_OF_INT16);
		this._data.setInt16(this._position, value, this._littleEndian);
		this._position += SIZE_OF_INT16;
	}

	public writeUnsignedShort(value: number): void {
		this._ensureWrite(SIZE_OF_UINT16);
		this._data.setUint16(this._position, value, this._littleEndian);
		this._position += SIZE_OF_UINT16;
	}

	public writeInt(value: number): void {
		this._ensureWrite(SIZE_OF_INT32);
		this._data.setInt32(this._position, value, this._littleEndian);
		this._position += SIZE_OF_INT32;
	}

	public writeUnsignedInt(value: number): void {
		this._ensureWrite(SIZE_OF_UINT32);
		this._data.setUint32(this._position, value, this._littleEndian);
		this._position += SIZE_OF_UINT32;
	}

	public writeFloat(value: number): void {
		this._ensureWrite(SIZE_OF_FLOAT32);
		this._data.setFloat32(this._position, value, this._littleEndian);
		this._position += SIZE_OF_FLOAT32;
	}

	public writeDouble(value: number): void {
		this._ensureWrite(SIZE_OF_FLOAT64);
		this._data.setFloat64(this._position, value, this._littleEndian);
		this._position += SIZE_OF_FLOAT64;
	}

	public writeBytes(bytes: ByteArray, offset = 0, length = 0): void {
		if (offset < 0 || length < 0) return;
		const writeLen = length === 0 ? bytes.length - offset : Math.min(bytes.length - offset, length);
		if (writeLen <= 0) return;
		this._ensureWrite(writeLen);
		this._bytes.set(bytes._bytes.subarray(offset, offset + writeLen), this._position);
		this._position += writeLen;
	}

	public writeUTF(value: string): void {
		const utf8 = _encoder.encode(value);
		this._ensureWrite(SIZE_OF_UINT16 + utf8.length);
		this._data.setUint16(this._position, utf8.length, this._littleEndian);
		this._position += SIZE_OF_UINT16;
		this._bytes.set(utf8, this._position);
		this._position += utf8.length;
		if (this._position > this._writePosition) this._writePosition = this._position;
	}

	public writeUTFBytes(value: string): void {
		const utf8 = _encoder.encode(value);
		this._ensureWrite(utf8.length);
		this._bytes.set(utf8, this._position);
		this._position += utf8.length;
	}

	public _writeUint8Array(bytes: Uint8Array | ArrayLike<number>, validate = true): void {
		const pos = this._position;
		const npos = pos + bytes.length;
		if (validate) this._ensureWrite(bytes.length);
		(this._bytes as Uint8Array).set(bytes as Uint8Array, pos);
		this._position = npos;
		if (npos > this._writePosition) this._writePosition = npos;
	}

	public toString(): string {
		return `[ByteArray] length:${this.length}, bytesAvailable:${this.bytesAvailable}`;
	}

	// ── Internal ──────────────────────────────────────────────────────────────

	public validate(len: number): boolean {
		if (this._writePosition > 0 && this._position + len <= this._writePosition) return true;
		throw new RangeError('ByteArray: read past end');
	}

	protected validateBuffer(len: number): void {
		this._writePosition = len > this._writePosition ? len : this._writePosition;
		this._validateBuffer(len + this._position);
	}

	protected _validateBuffer(value: number): void {
		if (this._data.byteLength < value) {
			const be = this._bufferExtSize;
			const nLen = be === 0 ? value : (Math.floor(value / be) + 1) * be;
			const tmp = new Uint8Array(nLen);
			tmp.set(this._bytes);
			this._bytes = tmp;
			this._data = new DataView(tmp.buffer);
		}
	}

	private _validate(len: number): void {
		if (this._position + len > this._writePosition) {
			throw new RangeError('ByteArray: read past end');
		}
	}

	private _ensureWrite(len: number): void {
		const needed = this._position + len;
		this._validateBuffer(needed);
		if (needed > this._writePosition) this._writePosition = needed;
	}

	private _allocate(size: number): Uint8Array {
		const be = this._bufferExtSize;
		if (be === 0) return new Uint8Array(size);
		return new Uint8Array((Math.floor(size / be) + 1) * be);
	}
}
