module.exports = {
  create: function(boardId) {
    numCards = 0;
    hash = {
      id: boardId,
      cardInstances: {},

      addCard: function(card, top, left, frontUp) {
        hash.cardInstances[numCards] = {
          card: card,
          top: top,
          left: left,
          zIndex: numCards,
          frontUp: frontUp,
        };
        numCards++;
      } 
    };
    return hash;
  }
}
