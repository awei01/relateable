module.exports = function () {
  const _collections = {}

  function collect (name, configs) {
    const collection = Collection(_collections, name, configs)
    if (_collections[name]) { throw new Error(`Collection [${name}] has already been defined`) }

    Object.defineProperty(_collections, name, {
      value: collection,
      enumerable: true
    })
    return collection
  }

  function _resolveOrThrow (name) {
    const result = _collections[name]
    if (!result) { throw new Error(`Collection [${name}] does not exist`) }
    return result
  }
  function find (name, primaryKey) {
    return _resolveOrThrow(name).find(primaryKey)
  }
  function filter (name, filterFn) {
    return _resolveOrThrow(name).filter(filterFn)
  }

  Object.defineProperties(_collections, {
    collect: { value: collect },
    find: { value: find },
    filter: { value: filter }
  })

  return _collections
}

function Collection (_collections, name, configs) {
  const _configs = Object.assign({ primaryKey: 'id' }, configs)
  const _entityProto = _configs.Entity = {} // hold the entity prototype

  const _collection = []

  function fill (data) {
    data.forEach((item) => {
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
      if (findFn(_collection[idx])) {
        return _collection[idx]
      }
      idx++
    }
  }

  function _makeRelationship (relationship) {
    const $alias = `$${relationship.alias}`
    if ($alias in _entityProto) { throw new Error(`Collection [${name}] already has relationship for [${relationship.alias}]`) }
    Object.defineProperty(_entityProto, $alias, {
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
    find: { value: find },
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

  let usingFn = configs.usingFn
  if (!usingFn) {
    const { fromMy, toTheir } = Object.assign({ fromMy: '$key', toTheir: '$key' }, configs)
    const isMineArray = Array.isArray(fromMy)
    const myKey = isMineArray ? fromMy[0] : fromMy
    const isTheirsArray = Array.isArray(toTheir)
    const theirKey = isTheirsArray ? toTheir[0] : toTheir
    usingFn = (me, him) => {
      const myValue = me[myKey]
      const theirValue = him[theirKey]
      switch (true) {
        case isMineArray && !isTheirsArray:
          return (myValue || []).includes(theirValue)
        case !isMineArray && isTheirsArray:
          return (theirValue || []).includes(myValue)
        default:
          return myValue === theirValue
      }
    }
  }

  function resolve (collections, me) {
    const them = collections[joinTo]
    if (!them) {
      throw new Error(`Collection [${us.name}.${alias}] trying to access undefined collection [${joinTo}]`)
    }
    return them[isOneToOne ? 'find' : 'filter'](_partial(usingFn, [me]))
  }

  return {
    alias,
    resolve
  }
}

function _partial (fn, preset) {
  return function (...args) {
    return fn.apply(null, [...preset, ...args])
  }
}
