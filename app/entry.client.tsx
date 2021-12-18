import React from 'react';
import ReactDOM from 'react-dom';
import { RemixBrowser } from 'remix';

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axe = require('@axe-core/react');
  axe(React, ReactDOM, 1000);
}

ReactDOM.hydrate(<RemixBrowser />, document);
