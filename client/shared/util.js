(
function(exports) {

/*
 * Returns an object that represents the difference between obj1 and obj2.  If
 * obj2 is a primitive (non-object) and obj2 !== obj1, then obj2 is returned.
 * Otherwise, undefined is returned, indicating that the two objects are equal.
 * If obj1 and obj2 are both objects, then Diff returns an object for
 * differences for all keys that are present in obj1.  If obj2 does not contain
 * a defined value for a key from obj1, then the value in obj2 is not
 * considered to be different from the value in obj1.  If obj2 contains values
 * for keys that are not present in obj1, these are not considered differences
 * and are thus not output.
 *
 * Examples:
   util.Diff(1,2) === 2;
   util.Diff(1,1) === undefined;
   util.Diff({1:2}, {1:2}) === undefined;
   util.Diff({1:2}, {10:20}) === undefined;
   util.Diff({1:2}, {1:3}) === {1:3};
   util.Diff({1:2, 2:3}, {1:3, 2:3}) === {1:3};
   util.Diff({1:2, 2:3}, {1:3, 2:4}) === {1:3, 2:4};
   util.Diff({1:2}, {1:null}) === null;
 */
exports.Diff = function(obj1, obj2) {
  if (typeof(obj1) == "object" && typeof(obj2) == "object") {
    var diff = {}
    for (var key in obj1) {
      var val1 = obj1[key];
      var val2 = obj2[key];
      if (!(key in obj2)) {
        continue;
      }
      var d = exports.Diff(val1, val2);
      // If we detected a difference, store it
      if (d !== undefined) {
        diff[key] = d;
      }
    }
    if (Object.keys(diff).length > 0) {
      return diff;
    }
  } else if (obj2 !== obj1) {
    return obj2;
  }

  return undefined; // Equal
}


/* 
 * Implement "string".format(args...) if it doesn't exist.
 * Example: "foo {1} {0}".format("one", "two") will output "foo two one"
 */
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

// Function to get the Max value in Array
// Usage: Array.max(arr)
Array.max = function(array){
  return Math.max.apply(Math, array);
};

// Function to get the Max value in Array
// Usage: Array.min(arr)
Array.min = function(array){
  return Math.min.apply(Math, array);
};

// Function to get the average value in Array
// Usage: Array.avg(arr)
Array.avg = function(array){
  return array.reduce(function(total, val) {return total + val}, 0) / array.length;
};

// Takes a list of objects each with a "top", "left" and "zIndex"
exports.GroupCardPositions = function(pos, offsetPerGroup, cardsPerGroup) {
  if (offsetPerGroup == null) {
    offsetPerGroup = 2;
  }
  if (cardsPerGroup == null) {
    cardsPerGroup = 3;
  }

  var baseTop = Math.floor(Array.avg(pos.map(function(x){return x.top})));
  var baseLeft = Math.floor(Array.avg(pos.map(function(x){return x.left})));
  var numGroups = Math.floor(pos.length / cardsPerGroup) + (pos.length % cardsPerGroup > 0 ? 1 : 0);
  baseTop -= Math.floor(numGroups * offsetPerGroup / 2);
  baseLeft -= Math.floor(numGroups * offsetPerGroup / 2);

  // Sort by z-index
  sortedIndices = [];
  for (var i = 0; i < pos.length; i++) {
    sortedIndices.push(i);
  }
  sortedIndices = sortedIndices.sort(function(i1, i2) {return pos[i1].zIndex - pos[i2].zIndex});

  var newPositions = new Array(pos.length);
  for (var newIndex = 0; newIndex < sortedIndices.length; newIndex++) {
    var groupIndex = Math.floor((newIndex-1)/cardsPerGroup) + 1;
    var offset = groupIndex * offsetPerGroup;
    var origIndex = sortedIndices[newIndex];
    newPositions[origIndex] = {top: baseTop + offset, left: baseLeft + offset, zIndex: pos[origIndex].zIndex};
  }
  
  return newPositions;
}


} // End of exports
)(typeof exports === 'undefined'? this['util']={}: exports);
