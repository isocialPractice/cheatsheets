var A = [1, 2500, 2, 50, 3, 33, 8, 73, 12];
function findMin(arr) { return Math.min.apply(null, arr); }
function findMax(arr) { return Math.max.apply(null, arr); }
var b = findMin(A); // 1
var c = findMax(A); // 2500
console.log(b); console.log(c);

var B = [{i: "c", I: 3}, {i: "b", I: 1}, {i: "a", I: 2}];
B.sort( function(a, b) {  return a.I - b.I; });
console.log(B[0].I + " " + B[1].I + " " + B[2].I); // 1 2 3
// To sort by property with string.
var cars = [ 
 {type:"Volvo", year:2016}, 
 {type:"Saab", year:2001},  
 {type:"BMW", year:2010}
]; 
cars.sort( function(a, b) {  
   let x = a.type.toLowerCase(); 
   let y = b.type.toLowerCase();
   if (x < y) { return -1; } 
   if (x > y) { return   1; }   
   // else essentially 
    return 0;    });
console.log(cars); // {type:"BMW", year:2010} {type:"Saab", year:2001} {type:"Volvo", year:2016}    
for (i in cars) { console.log(cars[i].type + " " + cars[i].year); }
// BMW 2010, Saab 2001, Volvo 2016