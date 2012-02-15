/*
 * image-test.js: Test that should be common to all providers.
 *
 * (C) 2012 Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    path = require('path'),
    vows = require('vows'),
    assert = require('../../helpers/assert'),
    helpers = require('../../helpers');

var testData    = {},
    testContext = {},
    clients     = {};

function batchOne (providerClient, providerName) {
  var name   = providerName   || 'rackspace',
      client = providerClient || rackspace,
      test   = {};

  test["The pkgcloud " + name + " compute client"] = 
    {
      "the getImages() method": {
        "with details": {
          topic: function () {
            client.getImages(this.callback);
          },
          "should return the list of images": function (err, images) {
            assert.isNull(err);
            testContext.images = images;
            images.forEach(function (image) {
              assert.assertImageDetails(image);
            });
          }
        }
      },
      "the getFlavors() method": {
        "with details": {
          topic: function () {
            client.getFlavors(this.callback);
          },
          "should return the list of flavors": function (err, flavors) {
            assert.isNull(err);
            testContext.flavors = flavors;
            flavors.forEach(function (flavor) {
              assert.assertFlavorDetails(flavor);
            });
          }
        }
      }
    };

  return test;
}

function batchTwo (providerClient, providerName) {
  var name   = providerName   || 'rackspace',
      client = providerClient || rackspace,
      test   = {};

  test["The pkgcloud " + name + " compute client"] =
    {
      "the create() method": {
        "with image and flavor ids": {
          topic: function () {
            client.createServer({
              name: 'create-test-ids2',
              image: testContext.images[0].id,
              flavor: testContext.flavors[0].id
            }, this.callback);
          },
          "should return a valid server": function (err, server) {
            client.destroyServer(server);
            assert.isNull(err);
            assert.equal(server.name, 'create-test-ids2');
            assert.equal(server.imageId, testContext.images[0].id);
            assert.assertServerDetails(server);
          }
        }
      }
    };

  return test;
}

function batchThree (providerClient, providerName) {
  var name   = providerName   || 'rackspace',
      client = providerClient || rackspace,
      test   = {};

  test["The pkgcloud " + name + " compute client"] =
    {
      "the getServers() method": {
        topic: function () {
          client.getServers(this.callback);
        },
        "should return the list of servers": function (err, servers) {
          assert.isNull(err);
          testContext.servers = servers;
          servers.forEach(function (server) {
            assert.assertServer(server);
          });
        }
      }
    };

  return test;
}

function batchReboot(providerClient, providerName) {
  var name   = providerName   || 'rackspace',
      client = providerClient || rackspace,
      test   = {};

  test["The pkgcloud " + name + " compute client"] =
    {
      "the rebootServer() method": {
        topic: function () {
          var self = this;
          client.createServer({
              name  : "test-reboot", 
              image : "880c3250-51ff-11e1-b7aa-837f081ac1a9",
              flavor: "Small 1GB"
            },
            function(err,server,response) {
              if(err) { return self.callback(err); }
              var i = 1,
                  j = 1;

              function waitForReboot(server) {
                return setTimeout(function (){
                  server.refresh(function(err,srv){
                    if(err) { return self.callback(err); }
                    console.log(j++, srv.name, srv.status);
                    if(srv.status === "RUNNING") {
                      self.callback(null,srv);
                      return console.log('done');
                    }
                    waitForReboot(srv);
                  });
                }, 10000);
              }

            function keepTrying() { 
              return setTimeout(function () {
                if(server.status==='RUNNING') {
                  console.log('now active. lets reboot the bad boy');
                  server.reboot(function(err,ok) {
                    if(err) { return self.callback(err); }
                    waitForReboot(server);
                  });
                } else {
                  console.log(i++, server.status);
                  server.refresh(function(err,srv){
                    if(err) { return self.callback(err); }
                    server=srv;
                    keepTrying();
                  });
                }
              }, 10000);
            }
            keepTrying();
          });
        },
        "should return a server after reboot": function (err, server) {
          assert.isNull(err);
          assert.assertServer(server);
        }
      }
    };

  return test;
}

JSON.parse(fs.readFileSync(__dirname + '/../../configs/providers.json'))
  .forEach(function(provider) {
    clients[provider] = helpers.createClient(provider, 'compute');
    var client = clients[provider],
        nock   = require('nock');
    testData    = {};
    testContext = {};
    if(process.env.NOCK) {
      if(provider === 'joyent') {
      //  nock.recorder.rec();
      //  nock('https://' + client.config.serversUrl)
      //    .get('/' + client.config.account + '/machines')
      //      .reply(200, "[]", {})
      //    .get('/' + client.config.account + '/datasets')
      //      .reply(200, helpers.loadFixture('joyent/images.json'), {})
      //    .get('/' + client.config.account + '/packages')
      //      .reply(200, helpers.loadFixture('joyent/flavors.json'), {})
      //  .post('/' + client.config.account + '/machines',
      //    helpers.loadFixture('joyent/createServer.json'))
      //  .reply(201, helpers.loadFixture('joyent/createdServer.json'), {})
      //  ["delete"]('/' + client.config.account +  
      //   '/machines/14186c17-0fcd-4bb5-ab42-51b848bda7e9')
      //    .reply(204, "", {})
      //  .get('/nodejitsu1/machines')
      //    .reply(200, helpers.loadFixture('joyent/servers.json'), {});
      }
      else if(provider === 'rackspace') {
        nock('https://' + client.serversUrl)
          .get('/v1.0/537645/flavors/detail.json')
            .reply(200, helpers.loadFixture('rackspace/flavors.json'), {})
          .get('/v1.0/537645/flavors/detail.json')
            .reply(200, helpers.loadFixture('rackspace/flavors.json'), {})
          .get('/v1.0/537645/images/detail.json')
            .reply(200, helpers.loadFixture('rackspace/images.json'), {})
          .get('/v1.0/537645/images/detail.json')
            .reply(200, helpers.loadFixture('rackspace/images.json'), {})
          .post('/v1.0/537645/servers',  
              helpers.loadFixture('rackspace/createServer.json'))
            .reply(202,  helpers.loadFixture('rackspace/createdServer.json'), 
              {})
          .post('/v1.0/537645/servers',  
              helpers.loadFixture('rackspace/createServer.json'))
            .reply(202,  helpers.loadFixture('rackspace/createdServer.json'), 
              {})
          .get('/v1.0/537645/servers/detail.json')
            .reply(204, helpers.loadFixture('rackspace/servers.json'), {})
          ["delete"]('/v1.0/537645/servers/20592449')
            .reply(200, '{"ok": 20592449}', {})
          .post('/v1.0/537645/servers', 
              helpers.loadFixture('rackspace/createReboot.json'))
            .reply(202,
              helpers.loadFixture('rackspace/buildingReboot.json'), {})
          .get('/v1.0/537645/servers/20596929')
            .reply(200, 
              helpers.loadFixture('rackspace/activeReboot.json'), {})
          .post('/v1.0/537645/servers/20596929/action',
              '{"reboot":{"type":"SOFT"}}')
            .reply(202, "", {})
          .get('/v1.0/537645/servers/20596929')
            .reply(200, 
              helpers.loadFixture('rackspace/activeReboot.json'), {})
          ;
      }
    }
    vows
      .describe('pkgcloud/common/compute/server [' + provider + ']')
      //.addBatch(batchOne(client, provider))
      //.addBatch(batchTwo(client, provider))
      //.addBatch(batchThree(client, provider))
      .addBatch(batchReboot(client, provider))
       ["export"](module);
  });