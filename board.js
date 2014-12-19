module.exports = {
  create: function(boardId) {
    cards = {}
    return {
      id: boardId,
      cards: cards,
      addCard: function(card, top, left) {
        cards[cards.length] = {card: card, top: top, left: left};
      } 
    }
  }
}
