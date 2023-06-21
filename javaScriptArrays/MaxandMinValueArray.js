var A = [1,2500, 2, 50, 3, 33, 8, 73, 12];
var b = [...A].sort(function(a,b) {return a - b;});
var c = [...A].sort(function(a,b) {return b - a});

console.log(b[0]); // 1
console.log(c[0]); // 2500

// FInd max and min in nested array.
var ONE = [[1,2500], [[2, 50], [3, 33]], 8, 73, 1200];
/* 1. To string */  var one = ONE.toString();
/* 2. make array */ one = one.split(",");
/* 3. convert to number */ for (i in one) one[i] = Number(one[i]); 
/* 4. Now same logic applies */ one.sort(function(a, b) { return a - b;});
console.log(one[0]); // 1
// Use as function  
function unNestArray(arr) {
 let tempArr = arr.toString();
 tempArr = tempArr.split(",");
 for (i in tempArr) tempArr[i] = Number(tempArr[i]);
 return tempArr; // could include sort function oupt max or min.
}
var two = unNestArray(ONE);
two.sort(function(a, b) { return b - a; });
console.log(two[0]); // 2500