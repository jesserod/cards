module.exports = {
  create: function(boardId) {
    cards = []
    return {
      id: boardId,
      cards: cards,
      addCard: function(card, top, left) {
        cards.push({card: card, top: top, left: left});
      } 
    }
  }
}
