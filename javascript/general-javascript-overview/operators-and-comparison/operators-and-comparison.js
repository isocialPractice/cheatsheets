// Strict equality compares the type as well as the value
console.log(1 === 1); // true
console.log(1 === "1"); // false
console.log(1 == "1"); // true

// NaN is the one value that is not equal to itself
console.log(NaN === NaN); // false
const notNumber = Number.isNaN(NaN);
console.log(notNumber); // true

// Or takes any falsy value, and zero is one of them
const count = 0;
console.log(count || 10); // 10
console.log(count ?? 10); // 0

// Optional chaining stops at the first missing link
const order = { customer: { name: "Jane Doe" } };
console.log(order.customer?.name); // Jane Doe
console.log(order.payment?.card); // undefined

// Plus joins strings, and every other operator counts
console.log("3" + 4); // 34
console.log("3" - 4); // -1
console.log(7 % 3); // 1
console.log(2 ** 10); // 1024
