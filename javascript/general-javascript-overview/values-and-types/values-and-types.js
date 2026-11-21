// A value has a type, and typeof is how you ask
const total = 42;
const label = "items";
const ready = true;
const nothing = null;
let missing;

console.log(typeof total); // number
console.log(typeof label); // string
console.log(typeof ready); // boolean
console.log(typeof missing); // undefined

// NOTE null reports object, which is a bug kept for compatibility
console.log(typeof nothing); // object

// Every number is a double, so a tenth is not exact
console.log(0.1 + 0.2); // 0.30000000000000004
const whole = Number.isInteger(total);
console.log(whole); // true

// A conversion is either written down or done for you
console.log(Number("42") + 1); // 43
console.log(String(total) + 1); // 421
console.log(Boolean("")); // false
console.log(Boolean("0")); // true
