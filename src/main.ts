import "./app.pcss";
import App from "./App.svelte";
import './interceptor/axios';

const app = new App({
  target: document.getElementById("app"),
});

export default app;
