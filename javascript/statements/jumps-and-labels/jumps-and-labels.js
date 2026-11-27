// continue leaves the current turn of a loop, and break leaves the loop
for (const n of [1, 2, 3, 4]) {
  if (n === 2) continue;
  if (n === 4) break;
  console.log(n); // 1, 3
}

// A label names a loop, so break can leave the outer one from inside it
outer: for (const a of ["x", "y"]) {
  for (const b of [1, 2]) {
    if (b === 2) break outer;
    console.log(a, b); // x 1
  }
}

// A label on a plain block makes break an early exit from that block
check: { console.log("reached"); break check; } // reached

// return leaves the function, and finally runs on the way out of it
const take = (a) => { try { return a[0]; } finally { a.pop(); } };
const held = ["kept", "dropped"];
console.log(take(held), held); // kept ['kept']
