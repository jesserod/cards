module.exports = {
  create: function(boardId) {
    cards = {}
    numCards = 0;
    return {
      id: boardId,
      cards: cards,
      numCards: numCards,

      addCard: function(card, top, left, frontUp) {
        cards[numCards] = {
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
