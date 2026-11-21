// A throw abandons the function and looks for a catch
function parse(text) {
  const found = Number(text);
  if (Number.isNaN(found)) {
    throw new TypeError(`${text} is not a number`);
  }
  return found;
}

console.log(parse("42")); // 42

// A catch is handed the error, and finally runs either way
try {
  parse("ten");
} catch (error) {
  console.log(error.name); // TypeError
  console.log(error.message); // ten is not a number
} finally {
  console.log("checked"); // checked
}

// A guard hands a value back where a throw would stop the caller
const safe = (text) => (text.trim() === "" ? 0 : parse(text));
console.log(safe("")); // 0
console.log(safe("7")); // 7
