function _checkDone () {
  if (this.destroyed) return
  for (const selection of this._selections) {
    for (let piece = selection.from; piece <= selection.to; piece++) {
      if (!this.bitfield.get(piece)) {
        done = false
        break
      }
    }
    if (!done) break
  }

  return done
}