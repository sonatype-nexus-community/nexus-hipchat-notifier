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

module.exports = function(baseUrl, headers, body) {
  const deliveryId = headers['x-nexus-webhook-delivery'].toLowerCase();
  const webhookId = headers['x-nexus-webhook-id'].toLowerCase();
  const signature = headers['x-nexus-webhook-signature'];
  const repositoryName = body.repositoryName;

  /**
   * Determine if the Webhook matches a renderable event. Current implementation supports rendering created
   * events for asset and component Webhooks.
   */
  function shouldBuildCard() {
    var supportedWebhooks = [
      'rm:repository:asset',
      'rm:repository:component'
    ];
    var supportedActions = [
      'created'
    ];

    if (supportedWebhooks.indexOf(webhookId.toLowerCase()) === -1) {
      return false;
    }
    if (supportedActions.indexOf(body.action.toLowerCase()) === -1) {
      return false;
    }

    return true;
  }

  /**
   * Determine if the component identifier matches configured regex filter. Assets are identified by the name
   * of the asset whereas component identifiers are identified by their Maven GAV if they are Maven
   * components and their name if they are other components.
   */
  function passesRegexFilter(regex) {
    if (!regex) {
      return true;
    }

    switch (webhookId) {
      case 'rm:repository:asset':
        const asset = body.asset;
        return new RegExp(regex).test(asset.name);
      case 'rm:repository:component':
        const component = body.component;
        const componentIdentifier = _buildComponentIdentifier(component);
        return new RegExp(regex).test(componentIdentifier);
    }
  }

  /**
   * Determine if the Hmac digest of the Webhook body using the configured secretKey matches the supplied signature.
   */
  function passesSecretKeyVerification(secretKey) {
    if (!signature && !secretKey) {
      return true;
    }
    if (!secretKey) {
      return false;
    }

    var hmacDigest = crypto.createHmac("sha1", secretKey).update(JSON.stringify(body)).digest("hex");

    return hmacDigest === signature;
  }

  /**
   * Render a HipChat card for the asset or component.
   */
  function buildCard() {
    switch (webhookId) {
      case 'rm:repository:asset':
        const asset = body.asset;
        return _buildCardFromAsset(asset);
      case 'rm:repository:component':
        const component = body.component;
        return _buildCardFromComponent(component);
    }
  }

  function _buildCardFromComponent(component) {
    var componentIdentifier = _buildComponentIdentifier(component);

    return {
      id: deliveryId,
      style: 'application',
      format: 'medium',
      title: componentIdentifier,
      description: componentIdentifier + ' component cached in ' + repositoryName,
      icon: {
        url: baseUrl + '/img/nexus-rm.png'
      }
    }
  }

  function _buildCardFromAsset(asset) {
    const name = asset.name;

    return {
      id: deliveryId,
      style: 'application',
      format: 'medium',
      title: name,
      description: name + ' asset cached in ' + repositoryName,
      icon: {
        url: baseUrl + '/img/nexus-rm.png'
      }
    };
  }

  function _buildComponentIdentifier(component) {
    switch (component.format.toLowerCase()) {
      case 'maven2':
      case 'maven3':
        return component.group + ':' + component.name + ':' + component.version;
      default:
        return component.name;
    }
  }

  return {
    shouldBuildCard: shouldBuildCard,
    passesRegexFilter: passesRegexFilter,
    passesSecretKeyVerification: passesSecretKeyVerification,
    buildCard: buildCard
  }
};