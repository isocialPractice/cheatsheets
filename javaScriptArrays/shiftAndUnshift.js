// JavaScript Document

var fruits = ["apple", "orange", "bannana", "coconut"];

var x = fruits.shift();
console.log(fruits); // orange, bannana, coconut
console.log(x); // appple

function showShift(onOff) {
 if (onOff == 0) {
  console.log(fruits.shift()); // orange
  console.log(x); // apple
  console.log(fruits); // bannana, coconut
 } else {
  var y = fruits.unshift("orange");
  console.log(y); // 3
  console.log(x); // apple
  console.log(fruits); // orange, bannana, coconut
 } 
}

showShift(0);
showShift(1);