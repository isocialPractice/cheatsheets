// ** is the operator form of Math.pow, and it binds rightwards
console.log(2 ** 10); // 1024
console.log(2 ** 3 ** 2); // 512

// sqrt is the square root; cbrt keeps its argument's sign
console.log(Math.sqrt(144)); // 12
console.log(Math.cbrt(-27)); // -3

// The root of a negative is NaN rather than a throw
console.log(Math.sqrt(-1)); // NaN
// hypot squares, sums and roots without overflowing on the way
console.log(Math.hypot(3, 4)); // 5

// Math.log is the natural log, and that is the trap
console.log(Math.log(100)); // 4.605170185988092
console.log(Math.log10(100)); // 2

// log2 counts a bit width; a ratio of logs reaches any other base
console.log(Math.log2(1024)); // 10
console.log(Math.log(81) / Math.log(3)); // 4.000000000000001

// exp inverts the natural log, and e is a property of Math
console.log(Math.exp(0)); // 1
console.log(Math.E.toFixed(3)); // 2.718
