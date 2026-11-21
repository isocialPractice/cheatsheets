// A template reads better than a chain of plus signs
const name = "Jane Doe";
const items = 3;

console.log(`${name} has ${items} items`); // Jane Doe has 3 items
console.log(`${items} squared is ${items * items}`); // 3 squared is 9

// A string is never changed, only read from
const title = "  Acme Corp  ";
console.log(title.trim()); // Acme Corp
console.log(title.length); // 13

// Searching answers where, or answers whether
console.log(name.indexOf("Doe")); // 5
console.log(name.includes("Jane")); // true
console.log(name.startsWith("J")); // true

// Slicing takes a half open range and counts back from the end
console.log(name.slice(0, 4)); // Jane
console.log(name.slice(-3)); // Doe

// Splitting and joining are each other's opposite
const parts = name.split(" ");
console.log(parts); // (2) ['Jane', 'Doe']
console.log(parts.join("-")); // Jane-Doe
console.log(name.replace("Doe", "Smith")); // Jane Smith
