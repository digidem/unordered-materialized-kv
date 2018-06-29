var once = require('once')

var KEY = 'k!'
var LINK = 'l!'

module.exports = MKV

function MKV (db, opts) {
  if (!(this instanceof MKV)) return new MKV(db, opts)
  this._db = db
  this._delim = opts && opts.delim ? opts.delim : ','
  this._writing = false
  this._writeQueue = []
  this._onremove = opts ? opts.onremove : null
}

MKV.prototype.batch = function (docs, cb) {
  cb = once(cb || noop)
  var self = this
  if (self._writing) return self._writeQueue.push(docs, cb)
  self._writing = true

  var batch = []
  var pending = 1

  for (var i = 0; i < docs.length; i++) {
    var id = docs[i].id
    if (typeof id !== 'string') id = String(id)
    if (id.indexOf(self._delim) >= 0) {
      return process.nextTick(cb, new Error('id contains delimiter'))
    }
  }

  var linkExists = {} // pointed-to documents can't be heads
  docs.forEach(function (doc) {
    pending++
    ;(doc.links || []).forEach(function (link) {
      linkExists[link] = true
    })
    self.isLinked(doc.id, function (err, ex) {
      if (err) return cb(err)
      linkExists[doc.id] = linkExists[doc.id] || ex
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
    var removed = [], removedObj = {}
    Object.keys(keygroup).forEach(function (key) {
      var group = keygroup[key]
      var klinks = values[key]
        ? values[key].toString().split(self._delim)
        : []
      var khas = {}
      for (var i = 0; i < klinks.length; i++) khas[klinks[i]] = true
      group.forEach(function (doc) {
        var dlinks = {}
        ;(doc.links || []).forEach(function (link) {
          if (!removedObj[link]) {
            removed.push(link)
            removedObj[link] = true
          }
          dlinks[link] = true
          batch.push({
            type: 'put',
            key: LINK + link,
            value: ''
          })
        })
        if (!linkExists[doc.id] && !khas[doc.id]) {
          klinks.push(doc.id)
        }
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
      if (self._onremove) self._onremove(removed)
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

MKV.prototype.isLinked = function (id, cb) {
  this._db.get(LINK + id, function (err, value) {
    cb(null, value !== undefined)
  })
}

function noop () {}
