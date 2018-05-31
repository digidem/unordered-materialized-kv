var umkv = require('../')
var db = require('level')('/tmp/kv.db')
var kv = umkv(db)
var randomBytes = require('crypto').randomBytes

var batchSize = Number(process.argv[2])
var times = Number(process.argv[3])

var keys = []
for (var i = 0; i < 5000; i++) {
  keys.push(randomBytes(4).toString('hex'))
}

var start = Date.now()
var uid = 0

;(function next (n) {
  if (n === times) return finish()
  var docs = []
  for (var i = 0; i < batchSize; i++) {
    docs.push({
      id: uid,
      key: keys[Math.floor(Math.random()*keys.length)],
      links: uid > 0 ? [uid-1] : []
    })
    uid++
  }
  kv.batch(docs, function (err) {
    if (err) return console.error(err)
    else next(n+1)
  })
})(0)

function finish () {
  var elapsed = Date.now() - start
  console.log(elapsed)
}
