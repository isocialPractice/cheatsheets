var A = ["square", "triangle"]; var B = []; B = B.concat([0, 1]);
var c = A.concat(B); console.log(c); // (4) [‘square’, ‘triangle’, 0, 1]
var d = c.concat([ ["a", "b", "c"] ]);
console.log(d); // (5) [‘square’, ‘triangle’, 0, 1, Array(3)]
var one = d.concat([2, 3].concat(4, 5));
console.log(one); // (9) [‘square’, ‘triangle’, 0, 1, Array(3), 2, 3, 4, 5]
var two = [["Array One", one].concat(A), ["Array Two"]];
console.log(two); // (2) [Array(4), Array(1)]
// * NOTE - This will not change array two___
two.concat(B); console.log(two + ""); // ____* Same as above (no + "")
/* Instead use: */ two = two.concat(B); 
console.log(two); // (4) [Array(4), Array(1), 0, 1] 
var three = { "I": ["I"].concat(one), "II": ["II"].concat(two) };
console.log(three); // {I: Array(10), II: Array(5)} 
three["III"] = [three["I"]].concat([three["II"]]);
console.log(three); // {I: Array(10), II: Array(5), III: Array(2)}
console.log(three["II"][1][1][4][2]); // c
console.log( // I - a,b,c -- square
 three["I"][0] + " - " + 
 three["II"][1][1][4] + " -- " + 
 three["III"][1][1][1][0]); 