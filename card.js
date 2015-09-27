module.exports = {
  create: function(id, collection, frontImgPath, backImgPath) {
    return {
      id: id,
      collection: collection,
      frontImage: frontImgPath,
      backImage: backImgPath,
    }
  }
}
