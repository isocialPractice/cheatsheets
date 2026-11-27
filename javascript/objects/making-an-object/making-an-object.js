// The literal, which is the shortest and the one to reach for
const literal = { kind: "literal", size: 1 };
console.log(literal); // {kind: 'literal', size: 1}

// Object.create names the prototype, and null means none at all
const bare = Object.create(null);
bare.kind = "bare";
console.log(Object.getPrototypeOf(bare)); // null

// A constructor function, which new calls with this bound to a new object
function Made(kind) { this.kind = kind; }
const made = new Made("constructed");
console.log(made.kind, made instanceof Made); // constructed true

// A class, which is the same machinery with a declaration of its own
class Built { constructor(kind) { this.kind = kind; } }
const built = new Built("class");
console.log(built.kind, typeof Built); // class function

// Every one of the four is an object, whatever made it
const all = [literal, bare, made, built];
console.log(all.length, typeof all[0]); // 4 object
