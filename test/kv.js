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
