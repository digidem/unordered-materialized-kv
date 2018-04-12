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

  var linkExists = {} // pointed-to documents can't be heads
  docs.forEach(function (doc) {
    pending++
    ;(doc.links || []).forEach(function (link) {
      linkExists[link] = true
    })
    self._db.get(LINK + doc.id, function (err, value) {
      linkExists[doc.id] = linkExists[doc.id] || (value !== undefined)
      if (--pending === 0) writeBatch()
    })
  })

  var keygroup = {}
  docs.forEach(function (doc) {
    if (keygroup[doc.key]) keygroup[doc.key].push(doc)
    else keygroup[doc.key] = [doc]
  })
  var values = {}
  Object.keys(keygroup).forEach(function (key) {
    pending++
    var group = keygroup[key]
    self._db.get(KEY + key, function (err, value) {
      values[key] = value
      if (--pending === 0) writeBatch()
    })
  })
  if (--pending === 0) writeBatch()

  function writeBatch () {
    Object.keys(keygroup).forEach(function (key) {
      var group = keygroup[key]
      var klinks = values[key]
        ? values[key].toString().split(',')
        : []
      group.forEach(function (doc) {
        var dlinks = {}
        ;(doc.links || []).forEach(function (link) {
          dlinks[link] = true
          batch.push({
            type: 'put',
            key: LINK + link,
            value: ''
          })
        })
        if (!linkExists[doc.id]) klinks.push(doc.id)
        klinks = klinks.filter(function (link) {
          return !Object.prototype.hasOwnProperty.call(dlinks,link)
        })
      })
      batch.push({
        type: 'put',
        key: KEY + key,
        value: klinks.join(',')
      })
    })
    self._db.batch(batch,cb)
  }
}

MKV.prototype.get = function (key, cb) {
  this._db.get(KEY + key, function (err, values) {
    if (err) cb(err)
    else cb(null, values.toString().split(','))
  })
}
