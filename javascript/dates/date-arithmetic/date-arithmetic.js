// Subtracting one date from another gives milliseconds
const start = new Date(Date.UTC(2026, 10, 21));
const end = new Date(Date.UTC(2026, 11, 25));
const day = 86400000;

console.log(end - start); // 2937600000
console.log((end - start) / day); // 34

// Adding is done to the count, then read back as a date
const later = new Date(start.getTime() + 7 * day);
console.log(later.toISOString().slice(0, 10)); // 2026-11-28

// A part out of range rolls over rather than failing
const monthEnd = new Date(Date.UTC(2026, 11, 0));
console.log(monthEnd.toISOString().slice(0, 10)); // 2026-11-30

// Day zero of next month is the last day of this one
console.log(monthEnd.getUTCDate()); // 30

// So adding a month can land on a day that never existed
const jan31 = new Date(Date.UTC(2027, 0, 31));
jan31.setUTCMonth(1);
console.log(jan31.toISOString().slice(0, 10)); // 2027-03-03

// NOTE February has 28 days in 2027, so the 31st rolls into March
console.log(jan31.getUTCMonth()); // 2
