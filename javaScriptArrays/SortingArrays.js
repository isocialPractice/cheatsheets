var A = ["Banana", "Orange", "Apple", "Mango"];
console.log(A.sort()); // (4) ['Apple', 'Banana', 'Mango', 'Orange']
console.log(A.reverse()); // (4) ['Orange', 'Mango', 'Banana', 'Apple']
console.log(A); // (4) ['Orange', 'Mango', 'Banana', 'Apple']
var b = A.sort();
console.log(b); // (4) ['Apple', 'Banana', 'Mango', 'Orange']
var c = A.reverse();
console.log(c); // (4) ['Orange', 'Mango', 'Banana', 'Apple']
console.log(A); // (4) ['Orange', 'Mango', 'Banana', 'Apple']

var ONE = [
[20, 0, 1, 1000], // IMPORTANT - mind sorting numbers
["c", "b", "a", 1],
["Banana", "Orange", "Apple", "Mango"]];
ONE.sort(); 
console.log(ONE[0]); // (4) [2, 0, 10, 3]
console.log(ONE[1]); // (4) ['Banana', 'Orange', 'Apple', 'Mango']
console.log(ONE[2]); // (3) ['c', 'b', 'a', 1]
var b = ONE[0].sort(); console.log(b); // (4) [0, 1, 10, 2]
var c = ONE[1].sort(); console.log(c); // (4) ['Apple', 'Banana', 'Mango', 'Orange']
var d = ONE[2].sort(); console.log(d); // (3) [1, 'a', 'b', 'c']
console.log(ONE[0]); // (4) [0, 1, 10, 2]
console.log(ONE[1]); // (4) ['Apple', 'Banana', 'Mango', 'Orange']
console.log(ONE[2]); // (3) [1, 'a', 'b', 'c']
console.log(ONE[2].reverse()); // (3) ['c', 'b', 'a', 1]
console.log(ONE[2]); // (3) ['c', 'b', 'a', 1]