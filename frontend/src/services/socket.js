import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.DEV ? `http://${window.location.hostname}:5000` : window.location.origin);

export const socket = io(URL, {
  autoConnect: false
});
