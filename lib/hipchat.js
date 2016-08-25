var RSVP = require('rsvp');
var http = require('request');
var _ = require('lodash');

module.exports = function(addon) {

  function request(clientInfo, options) {

    return new RSVP.Promise(function(resolve, reject) {

      function makeRequest(clientInfo) {
        addon.getAccessToken(clientInfo).then(function(token) {
          var hipchatBaseUrl = clientInfo.capabilitiesDoc.links.api;
          http({
            method: options.method || 'GET',
            url: hipchatBaseUrl + options.resource,
            qs: _.extend({auth_token: token.access_token}, options.qs),
            body: options.body,
            json: true
          }, function(err, resp, body) {
            if (err || (body && body.error)) {
              reject(err || body.error.message);
              return;
            }
            resolve(resp);
          });
        });
      }

      if (!clientInfo) {
        reject(new Error('clientInfo not available'));
        return;
      }
      if (typeof clientInfo === 'object') {
        makeRequest(clientInfo);
      }
      else {
        addon.loadClientInfo(clientInfo).then(makeRequest);
      }

    });

  }

  return {

    sendMessage: function(clientInfo, roomId, msg, opts, card) {
      opts = (opts && opts.options) || {};
      return request(clientInfo, {
        method: 'POST',
        resource: '/room/' + roomId + '/notification',
        body: {
          message: msg,
          message_format: (opts.format ? opts.format : 'html'),
          color: (opts.color ? opts.color : 'yellow'),
          notify: (opts.notify ? opts.notify : false),
          card: card
        }
      });
    }
  };
};
