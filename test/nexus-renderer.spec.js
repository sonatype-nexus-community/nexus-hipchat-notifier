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

'use strict';

const chai = require('chai');
const expect = chai.expect;
const nexusRendererCtr = require('../lib/nexus/nexus-renderer');

describe('nexus-renderer', function() {
  it('shouldBuildCard() returns true for component and asset lower case events', function() {
    var buildableEvents = [
      'rm:repository:asset',
      'rm:repository:component'
    ];
    buildableEvents.forEach(function(event) {
      var nexusRender = nexusRendererCtr({
        'x-nexus-webhook-delivery': '',
        'x-nexus-webhook-id': event
      }, {
        action: 'created'
      });

      expect(nexusRender.shouldBuildCard()).to.equal(true);
    });
  });

  it('shouldBuildCard() returns true for component and asset upper case events', function() {
    var buildableEvents = [
      'rm:repository:asset',
      'rm:repository:component'
    ];
    buildableEvents.forEach(function(event) {
      var nexusRender = nexusRendererCtr({
        'x-nexus-webhook-delivery': '',
        'x-nexus-webhook-id': event.toUpperCase()
      }, {
        action: 'created'
      });

      expect(nexusRender.shouldBuildCard()).to.equal(true);
    });
  });

  it('shouldBuildCard() returns false for non component or asset events', function() {
    var nonBuildableEvents = [
      'rm:global:audit',
      'rm:global:repository',
      'iq:applicationEvaluation'
    ];
    nonBuildableEvents.forEach(function(event) {
      var nexusRender = nexusRendererCtr({
        'x-nexus-webhook-delivery': '',
        'x-nexus-webhook-id': event.toUpperCase()
      }, {
        action: 'created'
      });

      expect(nexusRender.shouldBuildCard()).to.equal(false);
    });
  });

  it('shouldBuildCard() returns true for non created actions', function() {
    var nonBuildableActions = [
      'updated',
      'deleted'
    ];
    nonBuildableActions.forEach(function(action) {
      var nexusRender = nexusRendererCtr({
        'x-nexus-webhook-delivery': '',
        'x-nexus-webhook-id': 'rm:repository:component'
      }, {
        action: action
      });

      expect(nexusRender.shouldBuildCard()).to.equal(false);
    });
  });

  it('passesRegexFilter() returns true when regex is not set', function() {
    var unsetRegexes = [
      undefined,
      '',
      null
    ];

    unsetRegexes.forEach(function(regex) {
      var nexusRender = nexusRendererCtr({
        'x-nexus-webhook-delivery': '',
        'x-nexus-webhook-id': ''
      }, {});
      expect(nexusRender.passesRegexFilter(regex)).to.equal(true);
    });
  });

  it('passesRegexFilter() returns true for bodies which match regex', function() {
    var regexBodys = [
      {
        regex: '^group:artifact:*',
        event: 'rm:repository:component',
        body: {
          component: {
            format: 'maven2',
            group: 'group',
            name: 'artifact',
            version: '1.0'
          }
        }
      },
      {
        regex: '^hello-*',
        event: 'rm:repository:asset',
        body: {
          asset: {
            name: 'hello-world'
          }
        }
      }
    ];

    regexBodys.forEach(function(regexBody) {
      var nexusRender = nexusRendererCtr({
        'x-nexus-webhook-delivery': '',
        'x-nexus-webhook-id': regexBody.event
      }, regexBody.body);
      expect(nexusRender.passesRegexFilter(regexBody.regex)).to.equal(true);
    });
  });

  it('passesRegexFilter() returns false for bodies which do not match regex', function() {
    var regexBodys = [
      {
        regex: '^artifact:*',
        event: 'rm:repository:component',
        body: {
          component: {
            format: 'maven2',
            group: 'group',
            name: 'artifact',
            version: '1.0'
          }
        }
      },
      {
        regex: '^world-*',
        event: 'rm:repository:asset',
        body: {
          asset: {
            name: 'hello-world'
          }
        }
      }
    ];

    regexBodys.forEach(function(regexBody) {
      var nexusRender = nexusRendererCtr({
        'x-nexus-webhook-delivery': '',
        'x-nexus-webhook-id': regexBody.event
      }, regexBody.body);
      expect(nexusRender.passesRegexFilter(regexBody.regex)).to.equal(false);
    });
  });

  it('passesSecretKeyVerification() returns true when signature is not provided and secret key not set', function() {
    var unsetValues = [
      undefined,
      '',
      null
    ];

    unsetValues.forEach(function(unsetSignature) {
      var nexusRender = nexusRendererCtr({
        'x-nexus-webhook-delivery': '',
        'x-nexus-webhook-signature': unsetSignature,
        'x-nexus-webhook-id': ''
      }, {});

      unsetValues.forEach(function(unsetSecret) {
        expect(nexusRender.passesSecretKeyVerification(unsetSecret)).to.equal(true);
      });
    });
  });

  it('passesSecretKeyVerification() returns false when signature is provided and secret key not set', function() {
    var unsetSecrets = [
      undefined,
      '',
      null
    ];

    var nexusRender = nexusRendererCtr({
      'x-nexus-webhook-delivery': '',
      'x-nexus-webhook-signature': 'foo',
      'x-nexus-webhook-id': ''
    }, {});

    unsetSecrets.forEach(function(unsetSecret) {
      expect(nexusRender.passesSecretKeyVerification(unsetSecret)).to.equal(false);
    });
  });

  it('passesSecretKeyVerification() returns false when signature does not match secret digest on body', function() {
    var nexusRender = nexusRendererCtr({
      'x-nexus-webhook-delivery': '',
      'x-nexus-webhook-signature': 'foo',
      'x-nexus-webhook-id': ''
    }, {});

    expect(nexusRender.passesSecretKeyVerification('bar')).to.equal(false);
  });

  it('passesSecretKeyVerification() returns false when signature matches secret digest on body', function() {
    var nexusRender = nexusRendererCtr({
      'x-nexus-webhook-delivery': '',
      'x-nexus-webhook-signature': '59cd0592a1a8df816ea0a8a3bfe3b01ad6895699',
      'x-nexus-webhook-id': ''
    }, {});

    expect(nexusRender.passesSecretKeyVerification('bar')).to.equal(true);
  });

  it('buildCard() should correctly build asset cards', function() {
    var nexusRender = nexusRendererCtr({
      'x-nexus-webhook-delivery': 'foo',
      'x-nexus-webhook-id': 'rm:repository:asset'
    }, {
      repositoryName: 'repository',
      asset: {
        id: 'id',
        name: 'asset-name'
      }
    });

    var card = nexusRender.buildCard('http://foo.com/');
    expect(card.id).to.equal('foo');
    expect(card.style).to.equal('application');
    expect(card.format).to.equal('medium');
    expect(card.title).to.equal('asset-name');
    expect(card.url).to.equal('http://foo.com/#browse/browse/assets:repository:id');
    expect(card.description).to.equal('asset-name asset cached in repository');
    expect(card.icon.url).to.equal('http://foo.com/static/rapture/resources/icons/x32/page_white_stack.png');
  });

  it('buildCard() should correctly build component cards', function() {
    var nexusRender = nexusRendererCtr({
      'x-nexus-webhook-delivery': 'foo',
      'x-nexus-webhook-id': 'rm:repository:component'
    }, {
      repositoryName: 'repository',
      component: {
        id: 'id',
        format: 'maven2',
        group: 'group',
        name: 'artifact',
        version: 'version'
      }
    });

    var card = nexusRender.buildCard('http://foo.com/');
    expect(card.id).to.equal('foo');
    expect(card.style).to.equal('application');
    expect(card.format).to.equal('medium');
    expect(card.title).to.equal('group:artifact:version');
    expect(card.url).to.equal('http://foo.com/#browse/browse/components:repository:id');
    expect(card.description).to.equal('group:artifact:version component cached in repository');
    expect(card.icon.url).to.equal('http://foo.com/static/rapture/resources/icons/x32/box_front.png');
  });
});
