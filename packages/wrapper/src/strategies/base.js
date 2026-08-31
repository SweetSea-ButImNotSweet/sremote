/**
 * Base abstract class for SRemote playback strategy drivers.
 */
export class BaseDriver {
  /**
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.options = { passkey: null, ...options };
  }

  /**
   * Resolve effective passkey
   * @param {string|null} key
   * @returns {string|null}
   */
  getPasskey(key) {
    return key || this.options.passkey || null;
  }

  /* eslint-disable no-unused-vars */
  async play(target, key) {
    throw new Error('[BaseDriver] play() must be implemented by driver');
  }

  async pause(target, key) {
    throw new Error('[BaseDriver] pause() must be implemented by driver');
  }

  async toggle(target, key) {
    throw new Error('[BaseDriver] toggle() must be implemented by driver');
  }

  async stop(target, key) {
    throw new Error('[BaseDriver] stop() must be implemented by driver');
  }

  async seek(offset, target, key) {
    throw new Error('[BaseDriver] seek() must be implemented by driver');
  }

  async seekTo(time, target, key) {
    throw new Error('[BaseDriver] seekTo() must be implemented by driver');
  }

  async volume(vol, target, key) {
    throw new Error('[BaseDriver] volume() must be implemented by driver');
  }

  async mute(muted, target, key) {
    throw new Error('[BaseDriver] mute() must be implemented by driver');
  }

  async speed(rate, target, key) {
    throw new Error('[BaseDriver] speed() must be implemented by driver');
  }

  async playbackRate(rate, target, key) {
    return this.speed(rate, target, key);
  }

  async pip(enable, target, key) {
    throw new Error('[BaseDriver] pip() must be implemented by driver');
  }

  async load(source, target, key) {
    throw new Error('[BaseDriver] load() must be implemented by driver');
  }

  useAdapter(adapter, instanceId, key) {
    throw new Error('[BaseDriver] useAdapter() must be implemented by driver');
  }

  removeAdapter(instanceId, key) {
    throw new Error('[BaseDriver] removeAdapter() must be implemented by driver');
  }

  getCustomAdapter(instanceId, key) {
    throw new Error('[BaseDriver] getCustomAdapter() must be implemented by driver');
  }

  on(event, handler, key) {
    throw new Error('[BaseDriver] on() must be implemented by driver');
  }

  off(event, handler) {
    throw new Error('[BaseDriver] off() must be implemented by driver');
  }
  /* eslint-enable no-unused-vars */
}
