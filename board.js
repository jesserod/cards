module.exports = {
  create: function(boardId) {
    cards = []
    return {
      id: boardId,
      cards: cards,
      addCard: function(cardId, top, left) {
        cards.push({cardId: cardId, top: top, left: left});
      } 
    }
  }
}
