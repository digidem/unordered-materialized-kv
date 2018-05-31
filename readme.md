# unordered-materialized-kv

materialized view key/id store based on unordered log messages

This library presents a familiar key/value materialized view for append-only log
data which can be inserted in any order. New documents point at ancestor
documents under the same key to "overwrite" their values. This library
implements a multi-register conflict strategy, so each key may map to more than
one value. To merge multiple values into a single value, point at more than one
ancestor id.

This library is useful for kappa architectures with missing or out of order log
entries, or where calculating a topological ordering would be expensive.

This library does not store values itself, only the IDs to look up values. This
way you can use an append-only log to store your primary values without
duplicating data.

# example

``` js
var umkv = require('unordered-materialized-kv')
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
```

in order with no forking:

```
$ rm -rf /tmp/kv.db \
&& node kv.js insert '{"id":"x","key":"a","links":[]}' \
&& node kv.js insert '{"id":"y","key":"a","links":["x"]}' \
&& node kv.js get a
[ 'y' ]
```

out of order with no forking:

```
$ rm -rf /tmp/kv.db \
&& node kv.js insert '{"id":"y","key":"a","links":["x"]}' \
&& node kv.js insert '{"id":"x","key":"a","links":[]}' \
&& node kv.js get a
[ 'y' ]
```

in order with forking:

```
$ rm -rf /tmp/kv.db \
&& node kv.js insert '{"id":"x","key":"a","links":[]}' \
&& node kv.js insert '{"id":"y","key":"a","links":["x"]}' \
&& node kv.js insert '{"id":"z","key":"a","links":[]}' \
&& node kv.js get a
[ 'y', 'z' ]
```

out of order with forking:

```
$ rm -rf /tmp/kv.db \
&& node kv.js insert '{"id":"z","key":"a","links":[]}' \
&& node kv.js insert '{"id":"x","key":"a","links":[]}' \
&& node kv.js insert '{"id":"y","key":"a","links":["x"]}' \
&& node kv.js get a
[ 'z', 'y' ]
```

# api

``` js
var umkv = require('unordered-materialized-kv')
```

## var kv = umkv(db, opts)

Create a `kv` instance from a [leveldb][] instance `db` (levelup or leveldown).

Only the `db.batch()` and `db.get()` interfaces of leveldb are used with no
custom value encoding, so you can use any interface that supports these methods.

Optionally pass in a custom `opts.delim`. The default is `','`. This delimiter
is used to separate document ids.

## kv.batch(rows, cb)

Write an array of `rows` into the `kv`. Each `row` in the `rows` array has:

* `row.key` - string key to use
* `row.id` - unique id string of this record
* `row.links` - array of id string ancestor links

## kv.get(key, cb)

Lookup the array of ids that map to a given string `key` as `cb(err, ids)`.

[leveldb]: https://github.com/Level/level

## kv.isLinked(key, cb)

Test if a `key` is linked to as `cb(err, exists)` for a boolean `exists`.

This routine is used internally but you can use this method to save having to
duplicate this logic in your own unordered materialized view.

# license

BSD
