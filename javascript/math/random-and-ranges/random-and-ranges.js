// Math.random is 0 inclusive to 1 exclusive, and takes no seed
const roll = Math.random();
console.log(roll >= 0 && roll < 1); // true

// Scale, then floor, for a whole number in a half open range
const index = Math.floor(Math.random() * 5);
console.log(index >= 0 && index < 5); // true

// An inclusive range needs the span plus one
function between(low, high) {
  return low + Math.floor(Math.random() * (high - low + 1));
}
console.log(between(1, 6) >= 1); // true

// min and max take any count of arguments, and spread a list
const scores = [12, 7, 30, 4];
console.log(Math.max(...scores)); // 30
console.log(Math.min(...scores)); // 4

// Given none they answer the identities, which are not zero
console.log(Math.max()); // -Infinity
console.log(Math.min()); // Infinity
// Clamping is one call of each, innermost first
console.log(Math.min(Math.max(42, 0), 10)); // 10
