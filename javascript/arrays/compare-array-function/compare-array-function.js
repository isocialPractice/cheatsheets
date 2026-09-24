// NOTE - The spread syntax (...ONE) keeps original array intact.
var ONE = [3, 1, 4, 1, 5];
var a = [...ONE].sort((a, b) => a - b); // 1, 1, 3, 4, 5
// ONE and all future array using spread syntax keep original value.
console.log(ONE); // (5) [3, 1, 4, 1, 5]
console.log(a); // (5) [1, 1, 3, 4, 5]

var TWO = ["80", "c", "a", 40, 1, 5, 200];
var b = [...TWO].sort().sort((a, b) => a - b);
console.log(b); // (7) [1, 5, 40, '80', 200, 'a', 'c']

var THREE = [
  { name: "Edward", value: 37 },
  { name: "Sharpe", value: 21 },
  { name: "And", value: 45 }
];
var c = [...THREE].sort((a, b) => a.value - b.value);
console.log(c[0]); // {name: 'Sharpe', value: 21}
console.log(c[1]); // {name: 'Edward', value: 37}
console.log(c[2]); // {name: 'And', value: 45}
var d = [...THREE].sort((a, b) => {
 if (a.name.toUpperCase() >  b.name.toUpperCase()) return 1;
 if (a.name.toUpperCase() <  b.name.toUpperCase()) return -1;
 // a and b are equal; else essentially
 return 0; 
});
console.log(d[0]); // {name: 'And', value: 45}
console.log(d[1]); // {name: 'Edward', value: 37}
console.log(d[2]); // {name: 'Sharpe', value: 21}