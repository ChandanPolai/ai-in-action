import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import store from './store';
import DevToolsGuard  from './components/DevToolsGuard';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <DevToolsGuard />
      <App />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop theme="light" />
    </Provider>
  </React.StrictMode>
);
