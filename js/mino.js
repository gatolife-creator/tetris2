class Mino {
  /**
   *
   * @param {"I"|"L"|"J"|"O"|"S"|"Z"|"T"} block_kind
   */
  constructor(block_kind) {
    this.block = BLOCK_KIND[block_kind];
  }

  static random() {
    const getRandom = (min, max) => (Math.random() * (max - min) + min) | 0;
    const kinds = ["I", "L", "J", "O", "S", "Z", "T"];

    return BLOCK_KIND[kinds[getRandom(0, 6)]];
  }
}
