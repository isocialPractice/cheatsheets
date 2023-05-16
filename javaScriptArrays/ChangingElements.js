// JavaScript Document

var arrayToChange = [1, 2, 3, 4];
arrayToChange[2] = .44; // 1,2,.44,4
console.log(arrayToChange); // (4) [1, 2, 0.44, 4]

arrayToChange[3] = ["a", "b", "c"];
console.log(arrayToChange); // (4) [1, 2, 0.44, Array(3)]
console.log(arrayToChange[3][1]); // b

var nestArrayToChange = [[10, 20, 30, 40], [1.0, 2.0, 3.0, 4.0], ["a","b"]];
nestArrayToChange[0] = [1];
nestArrayToChange[1][1] = 22.2;
nestArrayToChange[2] = ["c", "d", ["abc", "xyz"]];
nestArrayToChange[3] = "new item";

console.log(nestArrayToChange); // (4) [Array(1), Array(4), Array(3), new item]
console.log(nestArrayToChange[0]); // [1]

console.log(nestArrayToChange[1]); // (4) [1, 22.2, 3, 4]
console.log(nestArrayToChange[1][1]); // 22.2

console.log(nestArrayToChange[2]); // (3) ['c', 'd', Array(2)]
console.log(nestArrayToChange[2][2][0]); // abc

console.log(nestArrayToChange[3]); // new item