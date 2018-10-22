import React from 'react';
import ReactDOM from 'react-dom';

import 'normalize.css';
import './index.css';
import App from './App';
import { unregister } from './registerServiceWorker';

ReactDOM.render(<App />, document.getElementById('root'));
//registerServiceWorker();
unregister();
