# React Client (Netlify-ready)

- TailwindCSS for modern UI
- Socket.io-client for realtime
- Room-based play using `?room=XXXXXX`

## Local Dev

```bash
npm install
echo "REACT_APP_SOCKET_URL=http://localhost:4000" > .env.local
npm start
```

## Build for Netlify

```bash
npm run build.
```

Set `REACT_APP_SOCKET_URL` environment variable in Netlify to your server URL.
