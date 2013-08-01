var fs = require('fs');

// add all jar files to the classpath
var dir = module.resolve("../jars/");
fs.list(dir).forEach(function(file) {
  if (fs.extension(file) === ".jar") {
      addToClasspath(fs.join(dir, file));
  }
});

var NativeJavaObject = Packages.org.mozilla.javascript.NativeJavaObject;
var Wrapper = Packages.org.mozilla.javascript.Wrapper;
var Scriptable = Packages.org.mozilla.javascript.Scriptable;

var toJava = exports.toJava = function(obj) {
   if (obj == null || obj instanceof NativeJavaObject
            || obj === undefined) {
      return obj;
   }
   if (obj instanceof Wrapper) {
      obj = obj.unwrap();
   } else if (obj instanceof Scriptable) {
      var className = obj.getClassName();
      if ("Date".equals(className)) {
         return new NativeJavaObject(global, new java.util.Date(obj.toNumber()), null);
      }
   }
   return new NativeJavaObject(global, obj, null);
}

/**
 * @param {helma.File} directory The directory where the cache(s) should be stored
          or an ehcache.xml file.
 */
var CacheManager = exports.CacheManager = function(directoryOrFile) {
   var pkg = Packages.net.sf.ehcache;

   // the wrapped cache manager
   var manager;

   if (fs.isFile(directoryOrFile) === true) {
      // directoryOrFile is a file
      manager = new pkg.CacheManager(directoryOrFile);
   } else {
      // directoryOrFile is a directory
      if (fs.isDirectory(directoryOrFile) === false) {
         // try creating the directory if it does not exist
         if (fs.makeTree(directoryOrFile) === false) {
            throw new Error('Path is neither a creatable directory nor a file.');
         }
      }
      // disk store configuration
      var diskStoreConfig = new pkg.config.DiskStoreConfiguration();
      diskStoreConfig.setPath(fs.absolute(directoryOrFile));

      // default cache configuration
      var cacheConfig = new pkg.config.CacheConfiguration();
      cacheConfig.setOverflowToDisk(true);
      cacheConfig.setMemoryStoreEvictionPolicy(pkg.store.MemoryStoreEvictionPolicy.LRU);
      cacheConfig.setMaxElementsOnDisk(10000);
      cacheConfig.setMaxElementsInMemory(2000);
      cacheConfig.setEternal(true);
      cacheConfig.setDiskSpoolBufferSizeMB(20);
      cacheConfig.setDiskPersistent(true);
      cacheConfig.setStatistics(true);

      // cache manager configuration
      var config = new pkg.config.Configuration();
      config.addDefaultCache(cacheConfig);
      config.addDiskStore(diskStoreConfig);

      manager = new pkg.CacheManager(config);
   }

   /**
    * Returns the wrapped cache manager
    * @returns The wrapped cache manager
    * @type Packages.net.sf.ehcache.CacheManager
    */
   this.getCacheManager = function() {
      return manager;
   };

   this.getCacheDirectory = function() {
      return fs.absolute(directoryOrFile);
   };

   return this;
};

/** @ignore */
CacheManager.prototype.toString = function() {
   return "[CacheManager]";
};

/**
 * Shuts down the wrapped cache manager. This function should normally be called
 * in onStop() of the application
 */
CacheManager.prototype.shutdown = function() {
   this.getCacheManager().shutdown();
};

/**
 * Adds the cache passed as argument to the cache manager
 * @param {String|Packages.net.sf.ehcache.Cache} cache The cache to add, or the
 * name of the cache to create
 */
CacheManager.prototype.addCache = function(cache) {
   this.getCacheManager().addCache(cache);
};

CacheManager.prototype.getCache = function(name) {
   var self = this;
   return {
      put: function() {
         var args = Array.prototype.slice.apply(arguments);
         args.unshift(name);
         return self.put.apply(self, args);
      },
      get: function() {
         var args = Array.prototype.slice.apply(arguments);
         args.unshift(name);
         return self.get.apply(self, args);
      },
      getSize: function() {
         return self._getCache(name).getSize();
      }
   }
}


/**
 * Returns the cache with the given name
 * @param {String} name The cache name
 * @returns The cache with the given name
 * @type Packages.net.sf.ehcache.Cache
 */
CacheManager.prototype._getCache = function(name) {
   var cache = this.getCacheManager().getEhcache(name);
   if (cache == null) {
      throw "CacheManager._getCache(): Unknown cache '" + name +
            "', please initialize the cache first";
   }
   return cache;
};

/**
 * Puts the value with the given key into the cache specified
 * @param {String} cacheName The name of the cache
 * @param {Object} key The key to store the value under
 * @param {Object} value The value
 * @param {Number} ttl Optional time to live for this cache element
 * @param {Number} tti Optional time to idle for this cache element
 */
CacheManager.prototype.put = function(cacheName, key, value, ttl, tti) {
   if (key == null) {
      throw "CacheManager.put(): Missing arguments";
   }
   var cache = this._getCache(cacheName);
   var ttl = parseInt(ttl, 10) || null;
   var tti = parseInt(tti, 10) || null;
   var eternal = (ttl < 1 && tti < 1) || null;
   var element = new Packages.net.sf.ehcache.Element(toJava(key), toJava(value), eternal, tti, ttl);
   cache.put(element);
   return;
};

/**
 * Puts the value with the given key into the cache specified if no value is currently mapped to the key.
 * @param {String} cacheName The name of the cache
 * @param {Object} key The key to store the value under
 * @param {Object} value The value
 * @param {Number} ttl Optional time to live for this cache element
 * @param {Number} tti Optional time to idle for this cache element
 */
CacheManager.prototype.putIfAbsent = function(cacheName, key, value, ttl, tti) {
   if (key == null) {
      throw "CacheManager.put(): Missing arguments";
   }
   var cache = this._getCache(cacheName);
   var ttl = parseInt(ttl, 10) || null;
   var tti = parseInt(tti, 10) || null;
   var eternal = (ttl < 1 && tti < 1) || null;
   var element = new Packages.net.sf.ehcache.Element(toJava(key), toJava(value), eternal, tti, ttl);
   cache.putIfAbsent(element);
   return;
};

/**
 * Puts the element passed as argument into the specified cache
 * @param {String} cacheName The name of the cache
 * @param {Object} key The key to store the element under
 * @param {Packages.net.sf.ehcache.Element} element The element to put into the cache
 */
CacheManager.prototype.putElement = function(cacheName, element) {
   this._getCache(cacheName).put(element);
   return;
};

/**
 * Returns the cached value of the specified key
 * @param {String} cacheName The name of the cache
 * @param {Object} key The key to return the value of
 * @returns The value of the key
 * @type Object
 */
CacheManager.prototype.get = function(cacheName, key) {
   var element = this._getCache(cacheName).get(toJava(key));
   if (element != null) {
      return element.getValue();
   }
   return null;
};

/**
 * Returns the element cached under the specified key
 * @param {String} cacheName The name of the cache
 * @param {Object} key The key to return the element of
 * @returns The cached element
 * @type Packages.net.sf.ehcache.Element
 */
CacheManager.prototype.getElement = function(cacheName, key) {
   return this._getCache(cacheName).get(toJava(key));
};

/**
 * Removes the element with the given key
 * @param {String} cacheName The name of the cache
 * @param {String} key The key of the element to remove
 * @returns True if removal was successful, false if the key wasn't found
 * in the cache
 * @type Boolean
 */
CacheManager.prototype.removeElement = function(cacheName, key) {
   return this._getCache(cacheName).remove(toJava(key));
};

/**
 * Cleares all caches in this cache manager instance, but doesn't remove them
 */
CacheManager.prototype.clearAll = function() {
   this.getCacheManager().clearAll();
};

/**
 * Returns an object containing statistical information about a cache
 * @param {String} cacheName The name of the cache
 * @returns An object containing statistical information
 */
CacheManager.prototype.getStatistics = function(cacheName) {
   var cache = this._getCache(cacheName);
   var stats = cache.getStatistics();
   return {
      "averageGetTime": stats.getAverageGetTime(),
      "hits": stats.getCacheHits(),
      "misses": stats.getCacheMisses(),
      "hitRate": Math.round((1 - stats.getCacheMisses() / (stats.getCacheHits() + stats.getCacheMisses())) * 100) || 0,
      "evictions": stats.getEvictionCount(),
      "hitsInMemory": stats.getInMemoryHits(),
      "hitsOnDisk": stats.getOnDiskHits(),
      "elements": cache.getSize(),
      "elementsOnDisk": cache.getDiskStoreSize(),
      "elementsInMemory": cache.getMemoryStoreSize(),
   };
};
