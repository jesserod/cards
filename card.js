module.exports = {
  create: function(id, collection, basePath, front, back) {
    return {
      id: id,
      collection: collection,
      frontImage: basePath + "/" + front,
      backImage: basePath + "/" + back,
    }
  }
}
