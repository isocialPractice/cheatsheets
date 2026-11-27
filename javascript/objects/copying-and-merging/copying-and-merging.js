const base = { id: 1, tags: ["a"], meta: { seen: false } };

// Spread copies one level, so the nested object is still shared
const spread = { ...base };
spread.id = 2;
spread.meta.seen = true;
console.log(base.id, base.meta.seen); // 1 true

// Object.assign writes into its first argument and returns it
const into = { id: 0 };
const result = Object.assign(into, { id: 9 }, { extra: true });
console.log(result === into, into); // true {id: 9, extra: true}

// A later source wins, which is how a default is overridden
const sizes = { ...{ size: "small", loud: false }, ...{ size: "large" } };
console.log(sizes); // {size: 'large', loud: false}

// A deep copy needs a second pass, which JSON does for plain data
const deep = JSON.parse(JSON.stringify(base));
deep.meta.seen = false;
console.log(base.meta.seen, deep.meta.seen); // true false
console.log(deep.tags === base.tags); // false
