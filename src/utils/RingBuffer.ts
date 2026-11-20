// A fixed number of numbers, with room made when it is created. Once it is
// full, each push replaces the oldest value, so it never grows. Values are
// read by index: get(0) is the oldest, get(length - 1) the newest.
//
// Inside, `buffer` is used in a circle: `head` is where the oldest value is,
// and the `count` values held follow it, continuing at 0 after the end. It is
// a Float64Array, so a run of values is copied in or out in one block.
export class RingBuffer {
  readonly capacity: number;
  readonly buffer: Float64Array;
  head: number;
  count: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity);
    this.head = 0;
    this.count = 0;
  }

  // Values held, at most the capacity.
  get length(): number {
    return this.count;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  // Adds `value` as the newest, in place of the oldest when full. Without
  // capacity, nothing is kept.
  push(value: number): void {
    if (this.capacity === 0) return;
    if (this.count < this.capacity) {
      this.buffer[(this.head + this.count) % this.capacity] = value;
      this.count++;
    } else {
      // Over the oldest, which makes the next one the oldest.
      this.buffer[this.head] = value;
      this.head = (this.head + 1) % this.capacity;
    }
  }

  // Adds `values` as the newest, in order, as `push` would one by one. Two
  // block copies at most: one up to the end of `buffer`, and the rest from its
  // start. Of more values than the capacity, only the newest are kept.
  pushSlice(values: number[]): void {
    if (this.capacity === 0) return;
    const kept =
      values.length > this.capacity
        ? values.slice(values.length - this.capacity)
        : values;
    // Where the next value goes.
    const begin = (this.head + this.count) % this.capacity;
    const first = Math.min(kept.length, this.capacity - begin);
    this.buffer.set(kept.slice(0, first), begin);
    this.buffer.set(kept.slice(first), 0);
    const total = this.count + kept.length;
    if (total <= this.capacity) {
      this.count = total;
    } else {
      // The oldest ones were written over.
      this.head = (this.head + total - this.capacity) % this.capacity;
      this.count = this.capacity;
    }
  }

  // The value `index` places after the oldest.
  get(index: number): number {
    if (index < 0 || index >= this.count) {
      throw new RangeError(`No value ${index} in ${this.count}.`);
    }
    return this.buffer[(this.head + index) % this.capacity];
  }

  // A copy of the values from index `from` up to, not including, `to`, oldest
  // first. Two block copies at most: one up to the end of `buffer`, and the
  // rest from its start.
  getSlice(from: number, to: number): Float64Array {
    if (from < 0 || to > this.count || from > to) {
      throw new RangeError(`No values ${from} to ${to} in ${this.count}.`);
    }
    const slice = new Float64Array(to - from);
    if (slice.length === 0) return slice;
    const begin = (this.head + from) % this.capacity;
    const first = Math.min(slice.length, this.capacity - begin);
    slice.set(this.buffer.subarray(begin, begin + first));
    slice.set(this.buffer.subarray(0, slice.length - first), first);
    return slice;
  }

  // Every value, oldest first.
  toArray(): number[] {
    return Array.from({ length: this.count }, (_, index) => this.get(index));
  }
}
