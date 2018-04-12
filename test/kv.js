var test = require('tape')
var memdb = require('memdb')
var umkv = require('../')

test('single-key linear in-order batch', function (t) {
  t.plan(3)
  var kv = umkv(memdb())
  var docs = [
    { id: 'a', key: 'cool', links: [] },
    { id: 'b', key: 'cool', links: ['a'] },
    { id: 'c', key: 'cool', links: ['b'] },
    { id: 'd', key: 'cool', links: ['c'] }
  ]
  kv.batch(docs, function (err) {
    t.error(err)
    kv.get('cool', function (err, ids) {
      t.error(err)
      t.deepEqual(ids, ['d'])
    })
  })
})

test('single-key forked in-order individual inserts', function (t) {
  t.plan(6)
  var kv = umkv(memdb())
  var docs = [
    { id: 'a', key: 'cool', links: [] },
    { id: 'b', key: 'cool', links: ['a'] },
    { id: 'c', key: 'cool', links: ['b'] },
    { id: 'd', key: 'cool', links: ['b'] }
  ]
  ;(function next (i) {
    if (i === docs.length) {
      return kv.get('cool', function (err, ids) {
        t.error(err)
        t.deepEqual(ids.sort(), ['c','d'])
      })
    }
    kv.batch([docs[i]], function (err) {
      t.error(err)
      next(i+1)
    })
  })(0)
})

test('single-key forked in-order batch', function (t) {
  t.plan(3)
  var kv = umkv(memdb())
  var docs = [
    { id: 'a', key: 'cool', links: [] },
    { id: 'b', key: 'cool', links: ['a'] },
    { id: 'c', key: 'cool', links: ['b'] },
    { id: 'd', key: 'cool', links: ['b'] }
  ]
  kv.batch(docs, function (err) {
    t.error(err)
    kv.get('cool', function (err, ids) {
      t.error(err)
      t.deepEqual(ids.sort(), ['c','d'])
    })
  })
})

test('single-key forked unordered batch', function (t) {
  t.plan(3)
  var kv = umkv(memdb())
  var docs = [
    { id: 'c', key: 'cool', links: ['b'] },
    { id: 'd', key: 'cool', links: ['b'] },
    { id: 'a', key: 'cool', links: [] },
    { id: 'b', key: 'cool', links: ['a'] }
  ]
  kv.batch(docs, function (err) {
    t.error(err)
    kv.get('cool', function (err, ids) {
      t.error(err)
      t.deepEqual(ids.sort(), ['c','d'])
    })
  })
})
