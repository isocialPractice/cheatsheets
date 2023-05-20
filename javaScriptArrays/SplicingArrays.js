// JavaScript Document

var fruits = ["Banana", "Orage", "Apple", "Mango"];
console.log(fruits.splice(2, 2, "Lemon", "Kiwi")); // (2) ['Apple', 'Mango']
console.log(fruits); // (4) ['Banana', 'Orage', 'Lemon', 'Kiwi']
var trees = ["Maple", "Spruce", "Palm"];
var treeCategories = trees.splice(3, 0, "Birch");
console.log(trees); // (4) ['Maple', 'Spruce', 'Palm', 'Birch']
var mapleTrees = ["Silver", "Norway", "Bigleaf"];
mapleTrees = trees.splice(0, 1, mapleTrees);
console.log(mapleTrees); // ['Maple']
console.log(trees); // (4) [Array(3), 'Spruce', 'Palm', 'Birch'];
var spruceTrees = ["White", "Red", "Blue"];
trees.splice(0, 0, mapleTrees[0]); 
console.log(trees.splice(3, 0, spruceTrees)); // []
var palmTrees = ["Pindo", "Canary", "Foxtail"];
palmTrees = trees.splice(4, 1, palmTrees);
console.log(palmTrees[0]); // Palm
console.log(trees.splice(4, 0, palmTrees[0])); // []
console.log(trees); // (7) ['Maple', Array(3), 'Spruce', Array(3), 'Palm', Array(3), 'Birch']
console.log(trees[1]); // (3) ['Silver', 'Norway', 'Bigleaf']
console.log(trees[3]); // (3) ['White', 'Red', 'Blue']
console.log(trees[5]); // (3) ['Pindo', 'Canary', 'Foxtail']
