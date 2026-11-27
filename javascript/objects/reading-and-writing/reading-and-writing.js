const page = { title: "Home", "data-id": 7, nested: { depth: 1 } };

// A dot needs a valid name, and brackets take any string or a variable
console.log(page.title, page["data-id"]); // Home 7
const which = "title";
console.log(page[which]); // Home

// An absent key reads as undefined, and reading through one throws
console.log(page.missing); // undefined
try { page.missing.deeper; } catch (e) { console.log(e.name); } // TypeError

// Optional chaining stops at the absent key instead of throwing
console.log(page.missing?.deeper); // undefined
console.log(page.nested?.depth); // 1

// in asks whether the key is there, which undefined cannot answer
page.empty = undefined;
console.log("empty" in page, page.empty === undefined); // true true

// delete removes the key itself, so in answers false afterwards
delete page.empty;
console.log("empty" in page, page.title); // false Home
