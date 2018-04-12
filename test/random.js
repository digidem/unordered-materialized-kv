var test = require('tape')
var memdb = require('memdb')
var umkv = require('../')

test('big random graph', function (t) {
  var N = 1000
  t.plan(N + 26*2)
  var kv = umkv(memdb())
  var keys = []
  var ids = []
  var lastId = 0
  for (var i = 0; i < 26; i++) {
    keys.push(String.fromCharCode(97+i))
  }
  var store = {}, pending = 1
  for (var i = 0; i < N; i++) {
    var batch = []
    var len = Math.floor(Math.random()*100)
    for (var j = 0; j < len; j++) {
      var key = keys[Math.floor(Math.random()*keys.length)]
      var links = []
      var id = lastId++
      if (!store[key]) store[key] = []
      var n = Math.floor(Math.random()*store[key].length+0.8)
      for (var k = 0; k < n; k++) {
        links.push(store[key][k])
      }
      ids.push(id)
      batch.push({
        id: String(id),
        key: key,
        links: links
      })
      store[key].push(String(id))
      for (var k = 0; k < links.length; k++) {
        var ix = store[key].indexOf(links[k])
        if (ix >= 0) store[key].splice(ix,1)
      }
    }
    pending++
    kv.batch(batch, function (err) {
      t.error(err)
      if (--pending === 0) check()
    })
  }
  if (--pending === 0) check()

  function check () {
    keys.sort()
    ;(function next (n) {
      if (n === keys.length) return
      var key = keys[n]
      kv.get(key, function (err, ids) {
        t.error(err)
        t.deepEqual(ids.sort(), store[key].sort())
        next(n+1)
      })
    })(0)
  }
})
