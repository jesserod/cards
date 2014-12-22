(
function exports(){

function Diff(obj1, obj2) {
  if (typeof(obj1) == "object") {
    var diff = {}
    for (var key in obj1) {
      var val1 = obj1[key];
      var val2 = obj2[key];
      if (obj2[key] == null) {
        continue;
      }
      var d = Diff(val1, val2);
      if (d != null) {
        diff[key] = d;
      }
    }
    if (Object.keys(diff).length > 0) {
      return diff;
    }
  } else if (obj1 !== obj2) {
    return obj2
  }

  return null; // Equal
}


/* Tests
console.log("----");
Diff(1,2);
console.log("----");
Diff({1:2}, {1:3});
console.log("----");
Diff({1:{a:2,b:3}}, {1:{a:2,b:30}});
*/

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
