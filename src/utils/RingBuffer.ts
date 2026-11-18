// A fixed number of values, with room made when it is created. Once it is
// full, each push replaces the oldest value, so it never grows. Values are
// read by age: get(0) is the oldest, get(length - 1) the newest.
//
// Inside, `buffer` is used in a circle: `head` is where the oldest value is,
// and the `count` values held follow it, continuing at 0 after the end.
export class RingBuffer<T> {
  private readonly capacity: number;
  private readonly buffer: T[];
  private head: number;
  private count: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array<T>(capacity);
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
  push(value: T): void {
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

  // The value `age` places after the oldest.
  get(age: number): T {
    if (age < 0 || age >= this.count) {
      throw new RangeError(`No value ${age} in ${this.count}.`);
    }
    return this.buffer[(this.head + age) % this.capacity];
  }

  // Every value, oldest first.
  toArray(): T[] {
    return Array.from({ length: this.count }, (_, age) => this.get(age));
  }
}
