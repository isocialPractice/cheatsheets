// A date is a count of milliseconds from 1970 in UTC
const epoch = new Date(0);
console.log(epoch.toISOString()); // 1970-01-01T00:00:00.000Z

// Date.UTC builds that count, and a month counts from zero
const launch = Date.UTC(2026, 10, 21);
console.log(launch); // 1795219200000
console.log(new Date(launch).toISOString()); // 2026-11-21T00:00:00.000Z

// A string is parsed, and only the ISO form travels
const parsed = new Date("2026-11-21T09:30:00.000Z");
console.log(parsed.getTime()); // 1795253400000

// The parts constructor reads its arguments as local time
// NOTE the same call is a different instant in every zone
const local = new Date(2026, 10, 21);
console.log(typeof local.getTime()); // number

// A string nothing can parse is an Invalid Date, not a throw
const bad = new Date("the 21st");
console.log(Number.isNaN(bad.getTime())); // true
console.log(bad.toString()); // Invalid Date

// Now is the one date that is never the same twice
// NOTE Date.now gives the count, new Date() gives the object
console.log(typeof Date.now()); // number
