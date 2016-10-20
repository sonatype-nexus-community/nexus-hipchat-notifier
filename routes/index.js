/*
 * Copyright (c) 2008-present Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const url = require('url');
const dummySecretKey = '~~DUMMY-SECRET-KEY~~';

module.exports = function(app, addon) {
  const hipchat = require('../lib/hipchat')(addon);

  // Instantiate Nexus HipChat Addon data store
  const nexusSettings = require('../lib/nexus/nexus-settings')(addon);

  /**
   * This route will serve the `atlassian-connect.json` unless a homepage URL is
   * specified in `addon.json`.
   */
  app.get('/',
      function(req, res) {
        // Use content-type negotiation to choose the best way to respond
        res.format({
          // If the request content-type is text-html, it will decide which to serve up
          'text/html': function() {
            var homepage = url.parse(addon.descriptor.links.homepage);
            if (homepage.hostname === req.hostname && homepage.path === req.path) {
              res.render('homepage', addon.descriptor);
            }
            else {
              res.redirect(addon.descriptor.links.homepage);
            }
          },
          /**
           * This logic is here to make sure that the `atlassian-connect.json` is always
           * served up when requested by the host
           */
          'application/json': function() {
            res.redirect('/atlassian-connect.json');
          }
        });
      }
  );

  /**
   * GET request for the configuration page.
   */
  app.get('/config',
      addon.authenticate(),
      function(req, res) {
        nexusSettings.getFromClientKey(req.clientInfo.clientKey).then(function(settings) {
          /**
           * Replace secret key with a dummy value to prevent exposure to client.
           */
          settings.secretKey = dummySecretKey;
          res.render('config', settings);
        });
      }
  );

  /**
   * Accept POST request from configuration page to persist tenant settings in configured data store.
   */
  app.post('/config',
      addon.authenticate(),
      function(req, res) {
        const nodeId = req.body.nodeId;
        var secretKey = req.body.secretKey;
        const nexusUrl = req.body.nexusUrl;
        const regexFilter = req.body.regexFilter;

        // If dummy secret key is POSTed the user did not change the key. Replace with existing secret key.
        if (secretKey === dummySecretKey) {
          nexusSettings.getFromNodeId(nodeId).then(function(settings) {
            secretKey = settings.secretKey;

            // Store tenant settings by clientKey and nodeId so they can be retrieved with either context
            nexusSettings.storeNexusClientKeyPairs(nodeId, secretKey, nexusUrl, regexFilter, req.clientInfo.roomId,
                req.clientInfo.clientKey);
            res.sendStatus(200);
          });
        } else {
          // Store tenant settings by clientKey and nodeId so they can be retrieved with either context
          nexusSettings.storeNexusClientKeyPairs(nodeId, secretKey, nexusUrl, regexFilter, req.clientInfo.roomId,
              req.clientInfo.clientKey);
          res.sendStatus(200);
        }}
  );

  /**
   * Accept POST request from Nexus 3 Repository Manager. This endpoint consumes Webhooks from Nexus.
   */
  app.post('/nexus',
      function(req, res) {
        const headers = req.headers;
        const body = req.body;
        const nodeId = body.nodeId;

        // Instantiate Nexus Renderer for specific Webhook request
        var nexusRenderer = require('../lib/nexus/nexus-renderer')(headers, body);

        // Determine if the Webhook matches a renderable event
        if (!nexusRenderer.shouldBuildCard()) {
          res.sendStatus(200);
          return;
        }

        // Get tenant settings from Nexus nodeId
        nexusSettings.getFromNodeId(nodeId).then(function(settings) {
          // Determine is event matches configured regex filter
          if (!nexusRenderer.passesRegexFilter(settings.regexFilter)) {
            res.sendStatus(200);
            return;
          }

          // Validate Hmac digest of request against secretKey
          const secretKey = settings.secretKey;
          if (!nexusRenderer.passesSecretKeyVerification(secretKey)) {
            // Send 401 unauthorized response if secretKey validation fails. This will causes errors on the
            // tenant's Nexus Repository Manager to indicate authorization failures
            res.sendStatus(401);
            return;
          }

          // Build renderable HipChat card from the Webhook event
          const nexusUrl = settings.nexusUrl;
          var card = nexusRenderer.buildCard(nexusUrl);

          // Use tenant's clientKey stored by Nexus nodeId to determine where to send message
          const clientKey = settings.clientKey;
          addon.loadClientInfo(clientKey).then(function(clientInfo) {
            // Send rendered HipChat card
            hipchat.sendMessage(clientInfo, settings.roomId, card.description, {}, card).then(function(data) {
              res.sendStatus(200);
            });
          });
        });
      }
  );

  /**
   * Notify the room that the add-on was installed. To learn more about
   */
  addon.on('installed', function(clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId,
        'The ' + addon.descriptor.name + ' add-on has been installed in this room');
  });

  /**
   * Clean up clients when uninstalled
   */
  addon.on('uninstalled', function(id) {
    addon.settings.client.keys(id + ':*', function(err, rep) {
      rep.forEach(function(k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });
};
