const tally = { b: 2, a: 1, c: 3 };

// The three readers, each handing back a plain array
console.log(Object.keys(tally)); // (3) ['b', 'a', 'c']
console.log(Object.values(tally)); // (3) [2, 1, 3]
console.log(Object.entries(tally)[0]); // (2) ['b', 2]

// Insertion order is kept for string keys, so b stays first
console.log(Object.keys(tally).join(",")); // b,a,c

// An integer-like key is not a string key, and sorts ahead of them all
const mixed = { 2: "two", b: "bee", 1: "one" };
console.log(Object.keys(mixed)); // (3) ['1', '2', 'b']

// fromEntries is the inverse, so a map over entries rebuilds the object
const doubled = Object.entries(tally).map(([k, v]) => [k, v * 2]);
console.log(Object.fromEntries(doubled)); // {b: 4, a: 2, c: 6}

// NOTE for...in walks inherited keys too, which the three readers do not
const child = Object.create(tally);
child.own = 0;
console.log(Object.keys(child), "own" in child); // ['own'] true
