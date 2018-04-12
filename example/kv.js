var umkv = require('../')
var db = require('level')('/tmp/kv.db')
var kv = umkv(db)

if (process.argv[2] === 'insert') {
  var doc = JSON.parse(process.argv[3])
  kv.batch([doc], function (err) {
    if (err) console.error(err)
  })
} else if (process.argv[2] === 'get') {
  var key = process.argv[3]
  kv.get(key, function (err, ids) {
    if (err) console.error(err)
    else console.log(ids)
  })
}
