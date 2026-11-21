// Every getter has a UTC twin, and the twin is the portable one
const stamp = new Date(Date.UTC(2026, 10, 21, 9, 30, 15));

console.log(stamp.getUTCFullYear()); // 2026
console.log(stamp.getUTCMonth()); // 10
console.log(stamp.getUTCDate()); // 21
console.log(stamp.getUTCDay()); // 6

// NOTE November is month 10, and Saturday is day 6
// A month counts from zero and a day of the month from one
console.log(stamp.getUTCHours()); // 9
console.log(stamp.getUTCMinutes()); // 30

// One format is the same wherever it is read
console.log(stamp.toISOString()); // 2026-11-21T09:30:15.000Z
console.log(stamp.toISOString().slice(0, 10)); // 2026-11-21

// getTime is the value, and all the rest is a rendering
console.log(stamp.getTime()); // 1795253415000
console.log(Number(stamp)); // 1795253415000

// A plain getter answers for whatever zone the reader is in
// NOTE both lines below move with that zone, so neither claims a figure
console.log(typeof stamp.getHours()); // number
console.log(typeof stamp.getTimezoneOffset()); // number
