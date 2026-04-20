import { io } from 'socket.io-client';

const SERVER_HOST = window.location.hostname;
const URL = import.meta.env.DEV
  ? `http://${SERVER_HOST}:5000`
  : window.location.origin;

export const socket = io(URL, {
  autoConnect: false
});
