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
const sinon = require('sinon');

var addon = {
  settings: {
    set: sinon.spy()
  }
};
const nexusSettings = require('../lib/nexus/nexus-settings')(addon);

describe('nexus-settings', function() {
  it('storeNexusClientKeyPairs() stores Nexus settings', function() {
    nexusSettings.storeNexusClientKeyPairs('nodeId', 'secret', 'https://foo.com/', '^filter', 123, 'clientKey');

    var nexusNodeStore = addon.settings.set.args[0];
    expect(nexusNodeStore[0]).to.equal('nexus-node-nodeid');
    var nexusNodeStoreValue = nexusNodeStore[1];
    expect(nexusNodeStoreValue.clientKey).to.equal('clientkey');
    expect(nexusNodeStoreValue.secretKey).to.equal('9ddefe5d139deb7e101bdf33033ffa04');
    expect(nexusNodeStoreValue.nexusUrl).to.equal('https://foo.com/');
    expect(nexusNodeStoreValue.roomId).to.equal(123);
    expect(nexusNodeStoreValue.regexFilter).to.equal('^filter');
    expect(nexusNodeStore[2]).to.equal('global');
  });

  it('storeNexusClientKeyPairs() stores HipChat Addon settings', function() {
    nexusSettings.storeNexusClientKeyPairs('nodeId', 'secret', 'https://foo.com/', '^filter', 123, 'clientKey');

    var hipChatStore = addon.settings.set.args[1];
    expect(hipChatStore[0]).to.equal('hipchat-addon-settings');
    var hipChatStoreValue = hipChatStore[1];
    expect(hipChatStoreValue.nodeId).to.equal('nodeid');
    expect(hipChatStoreValue.secretKey).to.equal('9ddefe5d139deb7e101bdf33033ffa04');
    expect(hipChatStoreValue.nexusUrl).to.equal('https://foo.com/');
    expect(hipChatStoreValue.roomId).to.equal(123);
    expect(hipChatStoreValue.regexFilter).to.equal('^filter');
    expect(hipChatStore[2]).to.equal('clientkey');
  });

  it('adds trailing slash to Nexus URL when not present', function() {
    nexusSettings.storeNexusClientKeyPairs('', '', 'https://foo.com', '', null, '');

    var nexusNodeStore = addon.settings.set.args[0];
    expect(nexusNodeStore[0]).to.equal('nexus-node-nodeid');
    var nexusNodeStoreValue = nexusNodeStore[1];
    expect(nexusNodeStoreValue.nexusUrl).to.equal('https://foo.com/');
  })
});
