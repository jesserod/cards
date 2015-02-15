module.exports = {
  create: function(id, basePath, front, back) {
    return {
      id: id,
      frontImage: basePath + "/" + front,
      backImage: basePath + "/" + back,
    }
  }
}
