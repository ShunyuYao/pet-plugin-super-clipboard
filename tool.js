'use strict';

const HISTORY_OPTIONS = Object.freeze({
  pollIntervalMs: 1000,
  maxBytes: 1073741824
});

module.exports.activate = async function activate(pet) {
  await pet.clipboard.startHistory(HISTORY_OPTIONS);
};

module.exports.HISTORY_OPTIONS = HISTORY_OPTIONS;
