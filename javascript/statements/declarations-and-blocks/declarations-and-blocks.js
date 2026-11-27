// let and const are block scoped, so the block is where the name lives
let where = "the function";
{
  let where = "the block";
  console.log(where); // the block
}
console.log(where); // the function

// const binds the name and not the value, so an object still mutates
const held = { count: 0 };
held.count += 1;
console.log(held.count); // 1

// var is hoisted and initialised undefined, so typeof answers above it
console.log(typeof hoisted); // undefined
var hoisted = "set later";

// let is hoisted too, and reading it above its own line throws instead
const read = () => early;
try { read(); } catch (e) { console.log(e.name); } // ReferenceError
let early = "declared below the call";
console.log(read()); // declared below the call
