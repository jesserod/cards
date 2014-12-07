
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
