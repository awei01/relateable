# Relateable

This is a simple package to help define relationships on javascript data

## Usage

```
const Relateable = require('relateable')

// create a new instance
const relations = Relateable()

// define a collection
const users = relations.collect('users')
// seed it with data
users.fill([{ id: 1, name: 'Joe' }, { id: 2, name: 'Bob' }])
// create a relationship to another collection
users.relateToOne('phones', { as: 'phone', toTheir: 'userId' })

// define another collection, seed it and define inverse relationship
const phones = relations.collect('phones')
  .seed([{ id: 'a', number: '111-111-1111', userId: 1 }, { id: 'b', number: '222-222-2222', userId: 2 }])
  .relateToOne('users', { as: 'user', fromMy: 'userId' })

console.log(users.find(1).$phone === phones.find(1))        // true
console.log(phones.find(1).$user.$phone === users.find(1))  // true
```
