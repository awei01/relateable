const Relateable = require('~/src/Relateable')

describe('Relateable', () => {
  it('should be a function', () => {
    expect(typeof Relateable).toBe('function')
  })
  it('should return an object', () => {
    expect(typeof Relateable()).toBe('object')
  })

  describe('collect()', () => {
    it('creates a collection on relations and returns the collection', () => {
      const relations = Relateable()
      const result = relations.collect('authors')
      expect(relations).toEqual({
        authors: []
      })
      expect(relations.authors).toBe(result)
    })
    it('can .fill() on a collection with data', () => {
      const _data = [
        { id: 1, name: 'Austin' },
        { id: 2, name: 'Justin' }
      ]
      const relations = Relateable()
      const result = relations.collect('authors')
        .fill(_data)
      expect(relations).toEqual({
        authors: _data
      })
      expect(relations.authors).toEqual(_data)
    })
    it('if primaryKey is invalid it will throw', () => {
      const relations = Relateable()
      const authors = relations.collect('authors')
      expect(() => {
        authors.fill([{ id: null }])
      }).toThrow('Cannot fill [authors] because primaryKey [id] is invalid')
      expect(() => {
        authors.fill([{ id: undefined }])
      }).toThrow('Cannot fill [authors] because primaryKey [id] is invalid')
      expect(() => {
        authors.fill([{ id: [] }])
      }).toThrow('Cannot fill [authors] because primaryKey [id] is invalid')
      expect(() => {
        authors.fill([{ id: {} }])
      }).toThrow('Cannot fill [authors] because primaryKey [id] is invalid')
    })
    it('if duplicate primaryKey will throw', () => {
      const _data = [
        { id: 1, name: 'Austin' },
        { id: 1, name: 'Justin' }
      ]
      const relations = Relateable()
      const authors = relations.collect('authors')
      expect(() => {
        authors.fill(_data)
      }).toThrow('Cannot fill [authors] because primaryKey [id] of [1] is already defined')
    })
    it('can .find() and .filter() on a valid collection otherwise it will throw', () => {
      const _data = [
        { id: 1, name: 'Austin', group: 1 },
        { id: 2, name: 'Justin', group: 1 },
        { id: 3, name: 'Dustin', group: 2 }
      ]
      const relations = Relateable()
      relations.collect('authors')
        .fill(_data)

      expect(relations.find('authors', 1)).toEqual(_data[0])
      expect(relations.filter('authors', ({ group }) => {
        return group === 1
      })).toEqual([_data[0], _data[1]])

      expect(() => {
        relations.find('invalid', 1)
      }).toThrow('Collection [invalid] does not exist')
      expect(() => {
        relations.filter('invalid', 1)
      }).toThrow('Collection [invalid] does not exist')
    })
    it('does not allow the relations collection property from being changed', () => {
      const _data = [
        { id: 1, name: 'Austin' },
        { id: 2, name: 'Justin' }
      ]
      const relations = Relateable()
      relations.collect('authors')
        .fill(_data)

      expect(() => {
        relations.authors = null
      }).toThrow()
    })
    it('makes the items in a collection immutable', () => {
      const _data = [
        { id: 1, name: 'Austin' },
        { id: 2, name: 'Justin' }
      ]
      const relations = Relateable()
      const authors = relations.collect('authors')
        .fill(_data)
      const first = authors.find(1)

      expect(() => {
        first.id = 3
      }).toThrow()
      expect(() => {
        first.foo = 'value'
      }).toThrow()
    })
    it('if duplicate collection name, will throw', () => {
      const relations = Relateable()
      relations.collect('authors')
      expect(() => {
        relations.collect('authors')
      }).toThrow('Collection [authors] has already been defined')
    })
  })
  describe('collection methods', () => {
    it('can find()', () => {
      const _data = [
        { id: 1, name: 'Austin' },
        { id: 2, name: 'Justin' }
      ]
      const relations = Relateable()
      const authors = relations.collect('authors')
        .fill(_data)
      expect(authors.find(1)).toEqual(_data[0])
      expect(authors.find(3)).toBe(undefined)
    })
    it('can find() using a different primaryKey', () => {
      const _data = [
        { id: 1, name: 'Austin' },
        { id: 2, name: 'Justin' }
      ]
      const relations = Relateable()
      const authors = relations.collect('authors', { primaryKey: 'name' })
        .fill(_data)
      expect(authors.find('Austin')).toEqual(_data[0])
      expect(authors.find(1)).toBe(undefined)
    })
    it('can find() using a function', () => {
      const _data = [
        { id: 1, name: 'Austin' },
        { id: 2, name: 'Justin' }
      ]
      const relations = Relateable()
      const authors = relations.collect('authors', { primaryKey: 'name' })
        .fill(_data)
      expect(authors.find((me) => {
        return me.name === 'Austin'
      })).toEqual(_data[0])
    })
    it('can filter()', () => {
      const _data = [
        { id: 1, name: 'Austin' },
        { id: 2, name: 'Justin' }
      ]
      const relations = Relateable()
      const authors = relations.collect('authors')
        .fill(_data)
      expect(authors.filter(({ id }) => {
        return id === 1
      })).toEqual([_data[0]])
    })
  })

  describe('One-to-one relationships', () => {
    const _DATA = {
      users: [
        { id: 1, name: 'Austin' },
        { id: 2, name: 'Justin' }
      ],
      phones: [
        { id: 1, value: 1111111, userId: 2, userName: 'Austin' },
        { id: 2, value: 2222222, userId: 1, userName: 'Justin' }
      ]
    }
    it('can define relationship using my primaryKey to their primaryKey', () => {
      const relations = Relateable()
      relations.collect('users')
        .fill(_DATA.users)
      const phones = relations.collect('phones')
        .relateToOne('users')
        .fill(_DATA.phones)

      expect(phones.find(1).users).toEqual(_DATA.users[0])
      expect(phones.find(2).users).toEqual(_DATA.users[1])
    })
    it('can define relationship using my foreignKey', () => {
      const relations = Relateable()
      relations.collect('users')
        .fill(_DATA.users)
      const phones = relations.collect('phones')
        .relateToOne('users', { fromMy: 'userId' })
        .fill(_DATA.phones)

      expect(phones.find(1).users).toEqual(_DATA.users[1])
      expect(phones.find(2).users).toEqual(_DATA.users[0])
    })
    it('can define relationship using my foreignKey that references their non-primaryKey', () => {
      const relations = Relateable()
      relations.collect('users')
        .fill(_DATA.users)
      const phones = relations.collect('phones')
        .relateToOne('users', { fromMy: 'userName', toTheir: 'name' })
        .fill(_DATA.phones)

      expect(phones.find(1).users).toEqual(_DATA.users[0])
      expect(phones.find(2).users).toEqual(_DATA.users[1])
    })
    it('can define aliased relationships', () => {
      const relations = Relateable()
      relations.collect('users')
        .fill(_DATA.users)
      const phones = relations.collect('phones')
        .relateToOne('users', { as: 'user', fromMy: 'userId' })
        .relateToOne('users', { as: 'owner', fromMy: 'userName', toTheir: 'name' })
        .fill(_DATA.phones)

      expect(phones.find(1).user).toEqual(_DATA.users[1])
      expect(phones.find(2).owner).toEqual(_DATA.users[1])
    })
    it('can create custom relationship', () => {
      const relations = Relateable()
      relations.collect('users')
        .fill(_DATA.users)
      const phones = relations.collect('phones')
        .relateToOne('users', { as: 'user', usingFn: (my, their) => {
          return my.id + 1 === their.id
        } })
        .fill(_DATA.phones)

      expect(phones.find(1).user).toEqual(_DATA.users[1])
      expect(phones.find(2).user).toBe(undefined)
    })
  })
  describe('One-to-many relationships', () => {
    const _DATA = {
      authors: [
        { id: 1, name: 'Austin', likedPostIds: [1, 2, 3] },
        { id: 2, name: 'Justin', likedPostIds: [1], likedPostTitles: ['Proident velit', 'Officia excepteur'] }
      ],
      posts: [
        { id: 1, title: 'Proident velit', authorId: 1, authorName: 'Austin' },
        { id: 2, title: 'Lorem ipsum duis voluptate amet adipisicing occaecat', authorId: 2, authorName: 'Justin' },
        { id: 3, title: 'Reprehenderit excepteur', authorId: 1, authorName: 'Austin' },
        { id: 4, title: 'Lorem ipsum minim ad duis aliquip sunt', authorId: 2, authorName: 'Justin' },
        { id: 5, title: 'Quis aute elit ex', authorId: 1, authorName: 'Austin' },
        { id: 6, title: 'Officia excepteur', authorId: 2, authorName: 'Justin' }
      ]
    }
    it('can define one-to-many relationship using my primaryKey to their primaryKey', () => {
      const relations = Relateable()
      const users = relations.collect('authors')
        .fill(_DATA.authors)
        .relateToMany('posts')
      relations.collect('posts')
        .fill(_DATA.posts)

      expect(users.find(1).posts).toEqual([_DATA.posts[0]])
      expect(users.find(2).posts).toEqual([_DATA.posts[1]])
    })
    it('can define one-to-many relationship using a foreignKey on their object', () => {
      const relations = Relateable()
      const users = relations.collect('authors')
        .fill(_DATA.authors)
        .relateToMany('posts', { toTheir: 'authorId' })
      relations.collect('posts')
        .fill(_DATA.posts)

      expect(users.find(1).posts).toEqual([_DATA.posts[0], _DATA.posts[2], _DATA.posts[4]])
      expect(users.find(2).posts).toEqual([_DATA.posts[1], _DATA.posts[3], _DATA.posts[5]])
    })
    it('can define one-to-many relationship using a foreignKey on their object that matches up w/ non-primaryKey on my object', () => {
      const relations = Relateable()
      const users = relations.collect('authors')
        .fill(_DATA.authors)
        .relateToMany('posts', { fromMy: 'name', toTheir: 'authorName' })
      relations.collect('posts')
        .fill(_DATA.posts)

      expect(users.find(1).posts).toEqual([_DATA.posts[0], _DATA.posts[2], _DATA.posts[4]])
      expect(users.find(2).posts).toEqual([_DATA.posts[1], _DATA.posts[3], _DATA.posts[5]])
    })
    it('can define one-to-many relationship using an array on my object that includes a key on their object', () => {
      const relations = Relateable()
      const users = relations.collect('authors')
        .fill(_DATA.authors)
        .relateToMany('posts', { as: 'likedIds', fromMy: ['likedPostIds'] })
        .relateToMany('posts', { as: 'likedTitles', fromMy: ['likedPostTitles'], toTheir: 'title' })
      relations.collect('posts')
        .fill(_DATA.posts)

      expect(users.find(1).likedIds).toEqual([_DATA.posts[0], _DATA.posts[1], _DATA.posts[2]])
      expect(users.find(2).likedIds).toEqual([_DATA.posts[0]])
      expect(users.find(1).likedTitles).toEqual([])
      expect(users.find(2).likedTitles).toEqual([_DATA.posts[0], _DATA.posts[5]])
    })
    it('can define one-to-many relationship using an array on their object that includes a key on our object', () => {
      const relations = Relateable()
      relations.collect('authors')
        .fill(_DATA.authors)
      const posts = relations.collect('posts')
        .relateToMany('authors', { as: 'likedBy', toTheir: ['likedPostIds'] })
        .fill(_DATA.posts)

      expect(posts.find(1).likedBy).toEqual([_DATA.authors[0], _DATA.authors[1]])
      expect(posts.find(2).likedBy).toEqual([_DATA.authors[0]])
      expect(posts.find(3).likedBy).toEqual([_DATA.authors[0]])
      expect(posts.find(4).likedBy).toEqual([])
    })
    it('can define one-to-many relationship using a custom function', () => {
      const relations = Relateable()
      const users = relations.collect('authors')
        .fill(_DATA.authors)
        .relateToMany('posts', { usingFn: (my, his) => {
          return my.id === his.title.split(' ').length
        } })
      relations.collect('posts')
        .fill(_DATA.posts)

      expect(users.find(1).posts).toEqual([])
      expect(users.find(2).posts).toEqual([_DATA.posts[0], _DATA.posts[2], _DATA.posts[5]])
    })
    it('can do self-referential relationships', () => {
      const _DATA = [
        { id: 1, name: 'Austin', following: [2, 3] },
        { id: 2, name: 'Justin', following: [1, 3] },
        { id: 3, name: 'Bob' }
      ]
      const relations = Relateable()
      const users = relations.collect('users')
        .relateToMany('users', { as: 'followingUsers', fromMy: ['following'] })
        .relateToMany('users', { as: 'followerUsers', toTheir: ['following'] })
        .fill(_DATA)

      expect(users.find(1).followingUsers).toEqual([_DATA[1], _DATA[2]])
      expect(users.find(1).followerUsers).toEqual([_DATA[1]])
      expect(users.find(2).followingUsers).toEqual([_DATA[0], _DATA[2]])
      expect(users.find(2).followerUsers).toEqual([_DATA[0]])
      expect(users.find(3).followingUsers).toEqual([])
      expect(users.find(3).followerUsers).toEqual([_DATA[0], _DATA[1]])
    })
    it('can deep link', () => {
      const relations = Relateable()
      const authors = relations.collect('authors')
        .fill(_DATA.authors)
        .relateToMany('posts', { toTheir: 'authorId' })
      relations.collect('posts')
        .relateToOne('authors', { as: 'author', fromMy: 'authorId' })
        .fill(_DATA.posts)

      expect(authors.find(1).posts[0].author).toBe(authors.find(1))
    })
  })

  describe('Relatinship validation', () => {
    it('When defining relationship w/ same name will throw', () => {
      const relations = Relateable()
      const users = relations.collect('users')
      users.relateToOne('foo')

      expect(() => {
        users.relateToOne('foo')
      }).toThrow('Collection [users] already has relationship for [foo]')
      expect(() => {
        users.relateToMany('foo')
      }).toThrow('Collection [users] already has relationship for [foo]')
    })
    it('When a relationship references non-existent collection will throw', () => {
      const relations = Relateable()
      const users = relations.collect('users')
      users.relateToOne('foos', { as: 'foo' })
        .fill([{ id: 1, name: 'Austin' }])

      expect(() => {
        users.find(1).foo
      }).toThrow('Collection [users.foo] trying to access undefined collection [foos]')
    })
    it('.fill() throws when field name collides with alias', () => {
      const phones = [
        { id: 1, value: 1111111, userId: 2, userName: 'Austin' },
        { id: 2, value: 2222222, userId: 1, userName: 'Justin' }
      ]

      expect(() => {
        const relations = Relateable()
        relations.collect('phones')
          .relateToOne('users', { as: 'userId' })
          .fill(phones)
      }).toThrow('Alias [userId] exists on [phones] and cannot be assigned')

      expect(() => {
        const relations = Relateable()
        relations.collect('phones')
          .relateToMany('users', { as: 'userId' })
          .fill(phones)
      }).toThrow('Alias [userId] exists on [phones] and cannot be assigned')
    })
    it('.relate() throws when alias collides with field name', () => {
      const phones = [
        { id: 1, value: 1111111, userId: 2, userName: 'Austin' },
        { id: 2, value: 2222222, userId: 1, userName: 'Justin' }
      ]

      expect(() => {
        const relations = Relateable()
        relations.collect('phones')
          .fill(phones)
          .relateToOne('users', { as: 'userId' })
      }).toThrow('Field [userId] exists on [phones] and cannot be aliased')

      expect(() => {
        const relations = Relateable()
        relations.collect('phones')
          .fill(phones)
          .relateToMany('users', { as: 'userId' })
      }).toThrow('Field [userId] exists on [phones] and cannot be aliased')
    })
  })
  describe('Global config', () => {
    it('can set primaryKey globally but be overridden', () => {
      const relations = Relateable({ primaryKey: 'name' })
      const users = relations.collect('users')
        .fill([{ id: 1, name: 'Austin' }])
      const phones = relations.collect('phones', { primaryKey: 'number' })
        .fill([{ id: 2, number: 123 }])

      expect(users.find('Austin').id).toBe(1)
      expect(phones.find(123).id).toBe(2)
    })
  })

})
