# unordered-materialized-kv

materialized view key/id store based on unordered log messages

useful for kappa architectures with missing or out of order log entries

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

