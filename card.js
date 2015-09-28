module.exports = {
  /*
   * Other properties that may be set externally:
   * - pile: String identifying the pile of cards this card should go in when a
   *       new board is created.
   * - isToken: Whether this card is a token (not a card), eg so we know if it should
   *       get the .token css class.
   */
  create: function(id, collection, frontImgPath, backImgPath) {
    return {
      id: id,
      collection: collection,
      frontImage: frontImgPath,
      backImage: backImgPath,
    }
  }
}
