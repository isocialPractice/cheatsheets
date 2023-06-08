// JavaScript Document
var A = [2, 50, 3, 1, 25, 33, 8, 73, 12];
A.sort(function(a,b) {return a - b;});
console.log(A);
var B = [2, 3, 25, 33, "w", "b"];
console.log(B.sort()); // [2, 25, 3, 33, 'b', 'w']
console. log(B.sort(function(a, b) {return a - b;})); // [2, 3, 25, 33, 'b', 'w']
console.log(B.reverse()); // ['w', 'b', 33, 25, 3, 2]


var ONE = [
 ["one", "and", "two"], [0, 10, 01], [1, 2], [210, 10],
 [23, 10, 3, 33], [20, 10], ["z", 2, 1, "a", 10]]; 
ONE.sort(function(a, b) { // WOULD BE LAST VALUE OF ONE
 return a.sort(function(a, b) { return a - b; }) - 
        b.sort(function(a, b) { return a - b; });
 });  
 /*  
IMPORTANT - if below lines omitted ONE is:
  ['one', 'and', 'two'], [0, 1, 10], [1, 2], 
  [10, 210], [3, 10, 23, 33], [10, 20], ['z', 1, 2, 'a', 10] 
*/
console.log(ONE.sort()); // WILL BE LAST VALUE OF ONE
/*
IMPORTANT - if below lines omitted ONE is:
  [0, 1, 10], [1, 2], [10, 20], [10, 210], 
  [3, 10, 23, 33], ['one', 'and', 'two'], ['z', 1, 2, 'a', 10]
*/
var two = ONE[2].sort(function(a, b) {return b - a;}); // WILL BE LAST VALUE OF ONE
console.log(two); //  [20, 10] 
console.log(ONE.sort(function(a, b) { // WILL BE LAST VALUE OF ONE 
 a.sort(); b.sort(); // IMPORTANT - sort a and b first
 a.sort(function(a, b) { return a - b; }); 
 b.sort(function(a, b) { return a - b; });  
 return a[0] - b[0];
 }));  

/*
IMPORTANT - all above instances of ONE are also:
[0, 1, 10], [1, 2], [1, 2, 10, 'a', 'z'], [3, 10, 23, 33], 
[10, 20], [10, 210], ['and', 'one', 'two']
*/

console.log(two); // (2) [10, 20]
// IMPORTANT - if above lines omitted two is: (2) [20, 10] 