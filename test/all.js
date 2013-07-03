var assert = require("assert");
var fs = require('fs');
var system = require("system");
var {CacheManager, toJava} = require("../lib/main");

var tmpDir = fs.join(java.lang.System.getProperty("java.io.tmpdir"), "cachetest");

var cacheMgr = null;

exports.setUp = function() {
   fs.makeDirectory(tmpDir);
   assert.isTrue(fs.exists(tmpDir));
   cacheMgr = new CacheManager(tmpDir);
   return;
};

exports.tearDown = function() {
   cacheMgr.shutdown();
   fs.removeTree(tmpDir);
   cacheMgr = null;
   return;
};


exports.testAddCache = function() {
   // trying to access a not initialized cache throws exception
   assert.throws(function() {
      cacheMgr.getCache("test");
   });
   cacheMgr.addCache("test");
   var cache = cacheMgr.getCache("test")
   assert.isNotNull(cache);
   assert.isTrue(cache instanceof Packages.net.sf.ehcache.Cache);
   return;
};

exports.testPutGet = function() {
   cacheMgr.addCache("test");
   cacheMgr.put("test", "key", "value");
   assert.equal(cacheMgr.getCache("test").getSize(), 1);
   assert.isNotNull(cacheMgr.get("test", "key"));
   assert.equal("value", cacheMgr.get("test", "key"));
   return;
};

exports.testTTL = function() {
   cacheMgr.addCache("test");
   cacheMgr.put("test", "key", "value", 1);
   var element = cacheMgr.getElement("test", "key");
   assert.isFalse(element.isEternal());
   assert.equal(element.getTimeToLive(), 1);
   java.lang.Thread.sleep(1501);
   assert.isNull(cacheMgr.get("test", "key"));
   return;
};

exports.testTTI = function() {
   cacheMgr.addCache("test");
   cacheMgr.put("test", "key", "value", 0, 10);
   var element = cacheMgr.getElement("test", "key");
   assert.isFalse(element.isEternal());
   assert.equal(element.getTimeToIdle(), 10);
   return;
};

exports.testPutGetElement = function() {
   cacheMgr.addCache("test");
   var element = new Packages.net.sf.ehcache.Element(toJava("key"), toJava("value"), true, 0, 0);
   cacheMgr.putElement("test", element);
   assert.equal(cacheMgr.getCache("test").getSize(), 1);
   assert.equal(cacheMgr.getElement("test", "key"), element);
   return;
};

exports.testRemove = function() {
   cacheMgr.addCache("test");
   cacheMgr.put("test", "key", "value");
   assert.equal(cacheMgr.getCache("test").getSize(), 1);
   cacheMgr.removeElement("test", "key");
   assert.isNull(cacheMgr.get("test", "key"));
   assert.equal(cacheMgr.getCache("test").getSize(), 0);
   return;
};

exports.testClearAll = function() {
   cacheMgr.addCache("test");
   cacheMgr.put("test", "key", "value");
   assert.equal(cacheMgr.getCache("test").getSize(), 1);
   cacheMgr.clearAll();
   assert.equal(cacheMgr.getCache("test").getSize(), 0);
   return;
};

//start the test runner if we're called directly from command line
if (require.main == module.id) {
    system.exit(require('test').run(exports, arguments[1]));
}