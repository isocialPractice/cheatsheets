// NOTE - a “_” at the end of illustrations is final value at index.
// NOTE - the count of “*” at end means matches prior/future iteration.
var ONE = [40, 100, 1, 5, 25, 10];
var two = [...ONE];
function randomSort(x, y) { 
 for (let i = x.length-1; i > 0 ; i--) {
  let J = Math.floor(Math.random() * (i+1));  
  let JIllustration = [0, 1, 0, 3, 2, 3]; // say j equates to this.  
  let k = x[i]; 
  let k2= y[i];
  x[i] = x[J];   
  y[i] = y[JIllustration[i]];
  // (i = 5) => x[5] = x[3] = 5_
  // (i = 4) => x[4] = x[2] = 1  _
  // (i = 3) => x[3] = x[3] = 10 _*  
  // (i = 2) => x[2] = x[0] = 40 _** 
  // (i = 1) => x[1] = x[1] = 100_***
  // (i = 0) => x[0] = x[0] = 40
  
  x[J] = k;
  y[JIllustration[i]] = k2;
  // (j = 3) => x[3] = x[5] = 10  *
  // (j = 2) => x[2] = x[4] = 25  **
  // (j = 3) => x[3] = x[3] = 10  *
  // (j = 0) => x[0] = x[2] = 25 _**
  // (j = 1) => x[1] = x[1] = 100 ***
  // (j = 0) => x[0] = x[0] = 25  **
 }      
}
randomSort(ONE, two);
console.log(ONE); // r, a, n, s, e, q
console.log("Example output " + two); // 25, 100, 40, 10, 1, 5