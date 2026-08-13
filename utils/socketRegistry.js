// Holds a reference to the single Socket.IO server instance so that code
// running outside the request/response cycle (BullMQ workers, services) can
// emit events without requiring server.js and risking a circular dependency.
let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
};

const getIo = () => ioInstance;

module.exports = { setIo, getIo };
