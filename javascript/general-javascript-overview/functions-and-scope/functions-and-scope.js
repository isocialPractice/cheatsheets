// A declaration is hoisted, so this call works above it
console.log(double(4)); // 8

function double(n) {
  return n * 2;
}

// An arrow is an expression, so it is assigned, not hoisted
const triple = (n) => n * 3;
const greet = (name = "Jane Doe") => "Hello, " + name;

console.log(triple(4)); // 12
console.log(greet()); // Hello, Jane Doe

// A name declared with let belongs to its own block
function counted() {
  let seen = "outer";
  if (true) {
    let seen = "inner";
    console.log(seen); // inner
  }
  return seen;
}

console.log(counted()); // outer
