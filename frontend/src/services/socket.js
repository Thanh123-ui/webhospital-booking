import { io } from 'socket.io-client';

const SERVER_HOST = window.location.hostname;
const URL = `http://${SERVER_HOST}:5000`;

export const socket = io(URL, {
  autoConnect: false
});
