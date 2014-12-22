module.exports = {
  create: function(boardId) {
    cardInstances = {}
    numCards = 0;
    return {
      id: boardId,
      cardInstances: cardInstances,
      numCards: numCards,

      addCard: function(card, top, left, frontUp) {
        cardInstances[numCards] = {
          card: card,
          top: top,
          left: left,
          zIndex: numCards,
          frontUp: frontUp,
        };
        numCards++;
      } 
    }
  }
}
