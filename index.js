var KEY = 'k!'
var LINK = 'l!'

module.exports = MKV

function MKV (db, opts) {
  if (!(this instanceof MKV)) return new MKV(db, opts)
  this._db = db
  this._delim = opts && opts.delim ? opts.delim : ','
  this._writing = false
  this._writeQueue = []
}

MKV.prototype.batch = function (docs, cb) {
  if (!cb) cb = noop
  var self = this
  if (self._writing) return self._writeQueue.push(docs, cb)
  self._writing = true

  var batch = []
  var pending = 1

  for (var i = 0; i < docs.length; i++) {
    if (docs[i].id.indexOf(self._delim) >= 0) {
      return process.nextTick(cb, new Error('id contains delimiter'))
    }
  }

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
        ? values[key].toString().split(self._delim)
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
        value: klinks.join(self._delim)
      })
    })
    self._db.batch(batch, function (err) {
      if (err) cb(err)
      else cb()
      self._writing = false
      if (self._writeQueue.length > 0) {
        var wdocs = self._writeQueue.shift()
        var wcb = self._writeQueue.shift()
        self.batch(wdocs, wcb)
      }
    })
  }
}

MKV.prototype.get = function (key, cb) {
  if (!cb) cb = noop
  var self = this
  self._db.get(KEY + key, function (err, values) {
    if (err) cb(err)
    else cb(null, values.toString().split(self._delim))
  })
}

function noop () {}
