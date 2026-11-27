// The five loop statements, each over the same three values
const row = ["a", "b", "c"];

// The counted loop hands you the index, and row[i] is the value
for (let i = 0; i < row.length; i += 1) console.log(i); // 0, 1, 2

// for...of reads the values of anything iterable
for (const value of row) console.log(value); // a, b, c

// for...in reads the keys, which for an array are the string indexes
for (const key in row) console.log(typeof key); // string, string, string

// while tests before the body, so a false test runs it no times at all
let left = 2;
while (left > 0) { console.log(left); left -= 1; } // 2, 1

// do...while tests after, so the body always runs at least once
let spin = 0;
do { console.log("ran once"); spin -= 1; } while (spin > 0); // ran once

// NOTE entries() is what hands for...of the index and the value together
for (const [at, v] of row.entries()) console.log(at, v); // 0 a, 1 b, 2 c
