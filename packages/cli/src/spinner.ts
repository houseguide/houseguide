const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const interval = 80;

interface SpinnerStream {
  isTTY?: boolean;
  write(chunk: string): unknown;
}

export interface Spinner {
  start(label: string): void;
  stop(): void;
}

export function createSpinner(stream: SpinnerStream): Spinner {
  let timer: ReturnType<typeof setInterval> | undefined;
  let frame = 0;
  let startedAt = 0;
  let label = '';

  const clear = () => stream.write('\r\x1b[2K');
  const render = () => {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    clear();
    stream.write(`${frames[frame++ % frames.length]} ${label}${seconds > 0 ? ` ${seconds}s` : ''}`);
  };

  return {
    start(nextLabel) {
      if (!stream.isTTY || timer) {
        return;
      }
      label = nextLabel;
      startedAt = Date.now();
      render();
      timer = setInterval(render, interval);
    },
    stop() {
      if (!timer) {
        return;
      }
      clearInterval(timer);
      timer = undefined;
      clear();
    }
  };
}
