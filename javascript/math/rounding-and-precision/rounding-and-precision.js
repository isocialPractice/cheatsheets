// Math.round goes to the nearest, and a half goes up, both signs
console.log(Math.round(2.5)); // 3
console.log(Math.round(-2.5)); // -2

// floor and ceil go one way whatever the sign
console.log(Math.floor(-2.1)); // -3
console.log(Math.ceil(-2.9)); // -2
// trunc drops the fraction, which is not what floor does
console.log(Math.trunc(-2.9)); // -2

// A binary fraction does not land on a decimal one
console.log(0.1 + 0.2); // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3); // false

// So the comparison is made against a tolerance
const near = Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON;
console.log(near); // true

// toFixed returns a string, and rounds the binary value behind it
console.log((1.005).toFixed(2)); // 1.00
console.log(typeof (1.005).toFixed(2)); // string

// NOTE scaling by a power of ten does not rescue it either
console.log(Math.round(1.005 * 100) / 100); // 1
