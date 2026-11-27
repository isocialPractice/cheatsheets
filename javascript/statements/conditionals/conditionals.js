// if and else if read in order, and the first true branch is the only one
const score = 72;
if (score >= 90) console.log("A");
else if (score >= 70) console.log("B"); // B
else console.log("C");

// A ternary is the same choice as an expression, so it can be assigned
const grade = score >= 70 ? "pass" : "fail";
console.log(grade); // pass

// switch compares with ===, so a string case never matches a number
switch (score) {
  case "72": console.log("string"); break;
  case 72: console.log("number"); break; // number
  default: console.log("neither");
}

// A falsy value is not an absent one, which is what ?? separates from ||
const limit = 0;
console.log(limit || 10); // 10
console.log(limit ?? 10); // 0
console.log(limit === 0 && "zero"); // zero
