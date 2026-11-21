// Destructuring names the parts of a value as you read it
const order = { id: 7, customer: "Jane Doe", total: 42 };
const { customer, total } = order;

console.log(customer); // Jane Doe
console.log(total); // 42

// A default fills in for a key that is not there
const { currency = "USD" } = order;
console.log(currency); // USD

// An array destructures by position, and a hole is skipped
const [first, , third] = ["Acme Corp", "Contoso", "Northwind"];
console.log(first); // Acme Corp
console.log(third); // Northwind

// Spread copies one level, so the copy is shallow
const amended = { ...order, total: 50 };
console.log(amended.total); // 50
console.log(order.total); // 42

// Rest collects whatever the names ahead of it did not take
const { id, ...rest } = order;
console.log(id); // 7
console.log(rest); // {customer: 'Jane Doe', total: 42}
