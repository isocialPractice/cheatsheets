const record = {};
record.open = "plain assignment";

// A plain assignment turns all three flags on
const open = Object.getOwnPropertyDescriptor(record, "open");
console.log(open.writable, open.enumerable); // true true

// defineProperty defaults every flag it is not given to false instead
Object.defineProperty(record, "shut", { value: "defined" });
const shut = Object.getOwnPropertyDescriptor(record, "shut");
console.log(shut.writable, shut.enumerable); // false false

// A non-enumerable key is skipped by keys, and still found by in
console.log(Object.keys(record), "shut" in record); // ['open'] true

// An accessor carries get and set rather than a value
Object.defineProperty(record, "loud", { get: () => record.open });
console.log(record.loud); // plain assignment

// freeze turns every own key unwritable, and strict mode throws on one
Object.freeze(record);
try { record.open = "no"; } catch (e) { console.log(e.name); } // TypeError
