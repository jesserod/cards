/**
 * Allows one to perform several animations in serial and call callbacks
 * when some or all of the animations have been completed.  Callbacks can
 * be interleaved with animations.
 */
function AnimationSequence() {
  this.functionsToCall = [];
  this._state = {};

  /**
   * Adds an animation to the queue.  This method can be called even after the
   * animations have been started via start(), however, they will run after all
   * currently queued animations *and* callbacks (ie, don't expect the existing
   * callbacks to run after this newly added animation, they will be called
   * in the order originally added).
   */
  this.addAnimation = function(element, properties, duration) {
    var q = this;
    var toCall = function() {q._callNext(q)};
    this.functionsToCall.push({
      type: "animation",
      fn: function() {
        element.animate(properties, {duration: duration, complete: toCall});
      }
    });
  }

  /**
   * Runs this callback in order after all previous animations and callbacks in
   * the queue have been completed.
   */
  this.addCallback = function(callback) {
    this.functionsToCall.push({type: "callback", fn: callback});
  }

  /**
   * Starts running the animations and callbacks in order when all animations
   * are completed.  Does nothing if already started and animations are
   * currently still running.
   */
  this.start = function() {
    if (!this._state.started) {
      var s = this._state; // To avoid "this" inside the callback
      this._state.started = true;
      this._callNext(this);
    }
  }

  /**
   * Calls the next function (either an animation or a callback)
   */
  this._callNext = function(q) {
    // While loop to handle back-to-back callback functions in the queue
    while (q.functionsToCall.length > 0) {
      var f = q.functionsToCall.shift();
      f.fn();
      // We don't have back-to-back callbacks, so we can rely on the animate
      // call to call _callNext again instead of using the loop.
      if (f.type == "animation") {
        break;
      }
    }

    // Whenever the queue runs out of things to do, then
    // we are no longer running and require an additional start().
    if (q.functionsToCall.length == 0) {
      q._state.started = false;
    }
  }
}
