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

const crypto = require('crypto');
const algorithm = 'aes256';

// TODO: This key should be loaded from system
const key = 'atlassian_connect_week_2016';

module.exports = function(addon) {
  const nodePrefix = 'nexus-node-';
  const globalClientKey = 'global';
  const clientKeyName = 'hipchat-addon-settings';

  return {
    /**
     * Store Nexus settings per tenant. Since requests can originate from HipChat (settings configuration) or
     * Nexus (Webhooks), tenant settings must be stored by clientKey and Nexus nodeId
     */
    storeNexusClientKeyPairs: function(nodeId, secret, nexusUrl, regexFilter, roomId, clientKey) {
      if (secret) {
        var cipher = crypto.createCipher(algorithm, key);
        secret = cipher.update(secret, 'utf8', 'hex') + cipher.final('hex');
      }

      nodeId = nodeId.toLowerCase();
      clientKey = clientKey.toLowerCase();
      nexusUrl = nexusUrl.replace(/\/?$/, '/');

      addon.settings.set(nodePrefix + nodeId, {
        clientKey: clientKey,
        secretKey: secret,
        nexusUrl: nexusUrl,
        roomId: roomId,
        regexFilter: regexFilter
      }, globalClientKey);
      addon.settings.set(clientKeyName, {
        nodeId: nodeId,
        secretKey: secret,
        nexusUrl: nexusUrl,
        roomId: roomId,
        regexFilter: regexFilter
      }, clientKey);
    },
    /**
     * Nexus requests must retrieve settings by supplied nodeId
     */
    getFromNodeId: function(nodeId) {
      nodeId = nodeId.toLowerCase();
      return addon.settings.get(nodePrefix + nodeId, globalClientKey).then(function(settings) {
        if (settings.secretKey) {
          var decipher = crypto.createDecipher(algorithm, key);
          settings.secretKey = decipher.update(settings.secretKey, 'hex', 'utf8') + decipher.final('utf8');
        }

        return {
          nodeId: nodeId,
          clientKey: settings.clientKey,
          secretKey: settings.secretKey,
          nexusUrl: settings.nexusUrl,
          roomId: settings.roomId,
          regexFilter: settings.regexFilter
        };
      });
    },
    /**
     * HipChat requests must retrieve settings by supplied clientKey
     */
    getFromClientKey: function(clientKey) {
      clientKey = clientKey.toLowerCase();
      console.log(clientKey);
      return addon.settings.get(clientKeyName, clientKey).then(function(settings) {
        settings = settings || {};

        if (settings.secretKey) {
          var decipher = crypto.createDecipher(algorithm, key);
          settings.secretKey = decipher.update(settings.secretKey, 'hex', 'utf8') + decipher.final('utf8');
        }

        return {
          nodeId: settings.nodeId,
          clientKey: clientKey,
          secretKey: settings.secretKey,
          nexusUrl: settings.nexusUrl,
          roomId: settings.roomId,
          regexFilter: settings.regexFilter
        };
      });
    }
  }
};
