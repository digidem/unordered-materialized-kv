var KEY = 'k!'
var LINK = 'l!'

module.exports = MKV

function MKV (db) {
  if (!(this instanceof MKV)) return new MKV(db)
  this._db = db
}

MKV.prototype.batch = function (docs, cb) {
  var self = this
  var batch = []
  var pending = 1
  docs.forEach(function (doc) {
    pending++
    var dlinks = {}
    ;(doc.links || []).forEach(function (link) {
      dlinks[link] = true
      batch.push({
        type: 'put',
        key: LINK + link,
        value: ''
      })
    })
    self._db.get(LINK + doc.id, function (err, value) {
      if (value !== undefined) {
        // link to this doc already exists, it can't be a head
        if (--pending === 0) writeBatch()
      } else self._db.get(KEY + doc.key, ongetkey)
    })
    function ongetkey (err, value) {
      var klinks = value
        ? value.toString().split(',')
        : []
      klinks.push(doc.id)
      var nlinks = klinks.filter(function (link) {
        return !Object.prototype.hasOwnProperty.call(dlinks,link)
      })
      batch.push({
        type: 'put',
        key: KEY + doc.key,
        value: nlinks.join(',')
      })
      if (--pending === 0) writeBatch()
    }
  })
  if (--pending === 0) writeBatch()
  function writeBatch () {
    self._db.batch(batch,cb)
  }
}

MKV.prototype.get = function (key, cb) {
  this._db.get(KEY + key, function (err, values) {
    if (err) cb(err)
    else cb(null, values.toString().split(','))
  })
}
