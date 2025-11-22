const unsupported = () => {
  throw new Error("thread-stream is not available in the DarkDrop web build.");
};

class ThreadStream {
  constructor() {
    unsupported();
  }

  end() {
    unsupported();
  }
}

export default ThreadStream;
export { ThreadStream };
