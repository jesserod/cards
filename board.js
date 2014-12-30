module.exports = {
  create: function(boardId) {
    numCards = 0;
    hash = {
      id: boardId,
      cardInstances: {},

      addCard: function(card, top, left, frontUp, hand) {
        hash.cardInstances[numCards] = {
          card: card,
          top: top,
          left: left,
          zIndex: numCards,
          frontUp: frontUp,
          hand: hand, // Name of the hand to which this card belongs, null if none
        };
        numCards++;
      } 
    };
    return hash;
  }
}
