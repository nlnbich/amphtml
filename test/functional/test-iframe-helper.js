/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as IframeHelper from '../../src/iframe-helper';
import * as sinon from 'sinon';
import {createIframePromise} from '../../testing/iframe';

describe('iframe-helper', function() {
  const iframeSrc = 'http://iframe.localhost:' + location.port +
      '/base/test/fixtures/served/iframe-intersection.html';

  let testIframe;
  let sandbox;
  let container;

  function insert(iframe) {
    container.doc.body.appendChild(iframe);
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    return createIframePromise().then(c => {
      container = c;
      const i = c.doc.createElement('iframe');
      i.src = iframeSrc;
      testIframe = i;
    });
  });

  afterEach(() => {
    container.iframe.parentNode.removeChild(container.iframe);
    sandbox.restore();
  });

  it('should assert src in iframe', () => {
    const iframe = container.doc.createElement('iframe');
    iframe.srcdoc = '<html>';
    expect(() => {
      IframeHelper.listen(iframe, 'test', () => {});
    }).to.throw('only iframes with src supported');
  });

  it('should assert iframe is detached', () => {
    const iframe = container.doc.createElement('iframe');
    iframe.src = iframeSrc;
    insert(iframe);
    expect(() => {
      IframeHelper.listen(iframe, 'test', () => {});
    }).to.throw('cannot register events on an attached iframe');
  });

  it('should listen to iframe messages', () => {
    let unlisten;
    let calls = 0;
    return new Promise(resolve => {
      unlisten = IframeHelper.listenFor(testIframe, 'send-intersections',
          () => {
            calls++;
            resolve();
          });
      insert(testIframe);
    }).then(() => {
      const total = calls;
      unlisten();
      return new Promise(resolve => {
        setTimeout(resolve, 50);
      }).then(() => {
        expect(calls).to.equal(total);
      });
    });
  });

  it('should un-listen after first hit', () => {
    let calls = 0;
    return new Promise(resolve => {
      IframeHelper.listenForOnce(testIframe, 'send-intersections', () => {
        calls++;
        resolve();
      });
      insert(testIframe);
    }).then(() => {
      const total = calls;
      return new Promise(resolve => {
        setTimeout(resolve, 50);
      }).then(() => {
        expect(calls).to.equal(total);
      });
    });
  });

  it('should un-listen on next message when iframe is unattached', () => {
    let calls = 0;
    return new Promise(resolve => {
      IframeHelper.listenFor(testIframe, 'send-intersections', () => {
        calls++;
        resolve();
      });
      insert(testIframe);
    }).then(() => {
      const total = calls;
      testIframe.parentElement.removeChild(testIframe);
      container.win.postMessage('hello world', '*');
      return new Promise(resolve => {
        setTimeout(resolve, 50);
      }).then(() => {
        expect(calls).to.equal(total);
      });
    });
  });

  it('should set sentinel on postMessage data', () => {
    insert(testIframe);
    postMessageSpy = sinon/*OK*/.spy(testIframe.contentWindow, 'postMessage');
    IframeHelper.postMessage(
        testIframe, 'testMessage', {}, 'http://google.com');
    expect(postMessageSpy.getCall(0).args[0].sentinel).to.equal('amp');
    expect(postMessageSpy.getCall(0).args[0].type).to.equal('testMessage');
    // Very important to do this outside of the sandbox, or else hell
    // breaks loose.
    postMessageSpy/*OK*/.restore();
  });
});
