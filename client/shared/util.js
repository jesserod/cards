(
function(exports) {

/*
 * Returns an object that represents the difference between obj1 and obj2.  If
 * obj2 is a primitive not null and is not equal to obj1, then obj2 is
 * returned. If obj1 and obj2 are both objects, then Diff returns an object for
 * differences for all keys that are present in obj1.  If obj2 does not contain
 * a non-null value for a key from obj1, then the value in obj2 is not
 * considered to be different from the value in obj1.  If obj2 contains values
 * for keys that are not present in obj1, these are not considered differences
 * and are thus not output.
 *
 * Examples:
 * Diff(1,2) == 2;
 * Diff(1,1) == null;
 * Diff({1:2}, {1:2}) == null;
 * Diff({1:2}, {1:3}) == {1:3};
 * Diff({1:2, 2:3}, {1:3, 2:3}) == {1:3};
 * Diff({1:2, 2:3}, {1:3, 2:4}) == {1:3, 2:4};
 */
exports.Diff = function(obj1, obj2) {
  if (typeof(obj1) == "object" && typeof(obj2) == "object") {
    var diff = {}
    for (var key in obj1) {
      var val1 = obj1[key];
      var val2 = obj2[key];
      if (obj2[key] == null) {
        continue;
      }
      var d = exports.Diff(val1, val2);
      if (d != null) {
        diff[key] = d;
      }
    }
    if (Object.keys(diff).length > 0) {
      return diff;
    }
  } else if (obj2 != null && obj1 !== obj2) {
    return obj2
  }

  return null; // Equal
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

} // End of exports
)(typeof exports === 'undefined'? this['util']={}: exports);
