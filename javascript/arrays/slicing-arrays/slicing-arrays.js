// JavaScript Document
var A = ["A", "B", "C"];
var b = A.slice(1,2);
console.log(b); // ['B']

var c = A.slice(1)
console.log(c); // (2) ['B', 'C']
console.log(c[0]); // B

var ONE = [[0, 1, 2, 3], ["i", "ii"], "III", "IV"];
var two = ONE.slice(0,2);
console.log(two); // (2) [Array(4), Array(2)]
console.log(two[0]); // (4) [0, 1, 2, 3]
console.log(two[1][1]); // ii

var three = ONE[0].slice(0, 3);
console.log(three); // (3) [0, 1, 2]
console.log(three[2]); // 2