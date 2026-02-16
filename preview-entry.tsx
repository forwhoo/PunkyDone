import React from 'react';
import ReactDOM from 'react-dom/client';
import WrappedStoriesPreview from './components/WrappedStoriesPreview';

const rootElement = document.getElementById('preview-root');
if (!rootElement) {
  throw new Error("Could not find preview-root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <WrappedStoriesPreview />
  </React.StrictMode>
);
