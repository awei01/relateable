module.exports = function (defaults) {
  defaults = defaults || {}
  const _collections = {}

  function collect (name, configs) {
    configs = Object.assign({}, defaults, configs)
    const collection = Collection(_collections, name, configs)
    if (_collections[name]) { throw new Error(`Collection [${name}] has already been defined`) }

    Object.defineProperty(_collections, name, {
      value: collection,
      enumerable: true
    })
    return collection
  }

  Object.defineProperties(_collections, {
    collect: { value: collect }
  })

  return _collections
}

function Collection (_collections, name, configs) {
  const _configs = Object.assign({ primaryKey: 'id' }, configs)
  const _entityProto = _configs.Entity = {} // hold the entity prototype

  const _collection = []
  const _props = {
    fields: [],
    aliases: []
  }

  function _validateAndReserveFields (item) {
    const keys = Object.keys(item)
    for (let i = 0; i < keys.length; i++) {
      const field = keys[i]
      if (_props.aliases.includes(field)) {
        throw new Error(`Alias [${field}] exists on [${name}] and cannot be assigned`)
      }
      if (!_props.fields.includes(field)) {
        _props.fields.push(field)
      }
    }
  }
  function fill (data) {
    data.forEach((item) => {
      _validateAndReserveFields(item)
      const entity = Entity(_collection, item)
      _collection.push(entity)
    })
    return _collection
  }

  function find (keyOrFn) {
    const findFn = typeof keyOrFn === 'function'
      ? keyOrFn
      : (item) => {
        return item.$key === keyOrFn
      }
    let idx = 0
    let len = _collection.length
    while (idx < len) {
      const current = _collection[idx]
      if (findFn(current)) { return current }
      idx++
    }
  }

  function pickBy (field, values) {
    if (Array.isArray(field)) {
      values = field
      field = '$key'
    }
    return values.reduce((result, value) => {
      const found = find((my) => {
        return my[field] === value
      })
      if (found) {
        result.push(found)
      }
      return result
    }, [])
  }

  function _validateAndReserveAlias (alias) {
    if (_props.aliases.includes(alias)) {
      throw new Error(`Collection [${name}] already has relationship for [${alias}]`)
    }
    if (_props.fields.includes(alias)) {
      throw new Error(`Field [${alias}] exists on [${name}] and cannot be aliased`)
    }
    _props.aliases.push(alias)
  }
  function _makeRelationship (relationship) {
    const { alias } = relationship
    _validateAndReserveAlias(alias)
    Object.defineProperty(_entityProto, alias, {
      get () {
        return relationship.resolve(_collections, this)
      }
    })
  }

  function relateToOne (joinTo, configs) {
    const relationship = _extractRelationship(_collection, joinTo, configs, true)
    _makeRelationship(relationship)
    return _collection
  }

  function relateToMany (joinTo, configs) {
    const relationship = _extractRelationship(_collection, joinTo, configs, false)
    _makeRelationship(relationship)
    return _collection
  }

  Object.defineProperties(_collection, {
    name: { value: name },
    configs: { value: _configs },
    fill: { value: fill },
    // filter: Array prototype method,
    find: { value: find },
    pickBy: { value: pickBy },
    relateToOne: { value: relateToOne },
    relateToMany: { value: relateToMany }
  })
  return _collection
}

function Entity (collection, data) {
  const { Entity, primaryKey } = collection.configs
  const $key = data[primaryKey]
  if ($key === undefined || typeof $key === 'object') {
    throw new Error(`Cannot fill [${collection.name}] because primaryKey [${primaryKey}] is invalid`)
  }
  if (collection.find($key)) {
    throw new Error(`Cannot fill [${collection.name}] because primaryKey [${primaryKey}] of [${$key}] is already defined`)
  }

  const entity = Object.create(Entity)
  Object.assign(entity, data)
  Object.defineProperty(entity, '$key', { value: $key })
  Object.freeze(entity)
  return entity
}

function _extractRelationship (us, joinTo, configs, isOneToOne) {
  configs = configs || {}
  const alias = configs.as || joinTo
  const { fromMy, toTheir, usingFn } = Object.assign({ fromMy: '$key', toTheir: '$key' }, configs)
  const isMineArray = Array.isArray(fromMy)
  const myKey = isMineArray ? fromMy[0] : fromMy
  const isTheirsArray = Array.isArray(toTheir)
  const theirKey = isTheirsArray ? toTheir[0] : toTheir

  function resolve (collections, me) {
    const them = collections[joinTo]
    if (!them) {
      throw new Error(`Collection [${us.name}.${alias}] trying to access undefined collection [${joinTo}]`)
    }
    if (usingFn) {
      return them[isOneToOne ? 'find' : 'filter']((him) => {
        return usingFn(me, him)
      })
    }
    const myValue = me[myKey]

    switch (true) {
      case isMineArray && !isTheirsArray:
        // i have a list of foreign keys, so, return them in order
        return them.pickBy(theirKey, myValue || [])
      case !isMineArray && isTheirsArray:
        // my key is in a list in one of their fields
        return them[isOneToOne ? 'find' : 'filter']((him) => {
          return (him[theirKey] || []).includes(myValue)
        })
      case !isMineArray && !isTheirsArray:
        // one-to-one relationship
        return them[isOneToOne ? 'find' : 'filter']((him) => {
          return him[theirKey] === myValue
        })
    }
  }

  return {
    alias,
    resolve
  }
}
