var fruits = ["apple", "orange", "banana", "coconut"];

var x = fruits.shift();
console.log(fruits); // (3) ['orange', 'banana', 'coconut']
console.log(x); // apple

function showShift(onOff) {
 if (onOff == 0) {
  console.log(fruits.shift()); // orange
  console.log(x); // apple
  console.log(fruits); // (2) ['banana', 'coconut']
 } else {
  var y = fruits.unshift("orange");
  console.log(y); // 3
  console.log(x); // apple
  console.log(fruits); // (3) ['orange', 'banana', 'coconut']
 } 
}

showShift(0);
showShift(1);
