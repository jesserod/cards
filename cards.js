$(document).ready(function() {
  var selected = false;
  var dragging = false;
  var draggable = $(".draggable");
  var selectable = $(".selectable-container");

  selectable.selectable({
    selected: function(event, ui) {
      selected = true;
      $(ui.selected).addClass("canDrag");
    },

    unselected: function(event, ui) {
      selected = false;
      $(ui.unselected).removeClass("canDrag");
      $(ui.unselected).removeClass("dragging");
    },

    // Only allow top-level items inside the selectable container to be selected
    filter: "> *"
  });

  draggable.draggable({
    drag: function(event, ui) {
      /* Drag only if selected */
      if (!selected) {
        event.preventDefault();
        return;
      }
      ui.helper.addClass("dragging");
    },
    stop: function(event, ui) {
      ui.helper.removeClass("dragging");
    },
  });

  /* By default, clicking on the draggable element doesn't trigger selection */
  draggable.click(function() {
    SelectSelectableElement(selectable, draggable);
  });

  /*
  draggable.click(function() {
    selected = !selected;
    if (selected) {
      draggable.addClass("selected");
    } else {
      draggable.removeClass("selected");
    }
  });
  */

  $(document).keypress(function(e) {
    var c = String.fromCharCode(e.which);
    var validKey = true;
    if (c == "t") {
      console.log("Taking");
    } else if (c == "f") {
      console.log("Flip");
    } else {
      validKey = false;
    }
    if (validKey) {
      var fakeMouseup = $.Event( "mouseup", { which: 1 } );
      draggable.trigger(fakeMouseup);
    }
  });

  function SelectSelectableElement (selectableContainer, elementsToSelect)
  {
    // add unselecting class to all elements in the styleboard canvas except the ones to select
    $(".ui-selected", selectableContainer).not(elementsToSelect).removeClass("ui-selected").addClass("ui-unselecting");
    
    // add ui-selecting class to the elements to select
    $(elementsToSelect).not(".ui-selected").addClass("ui-selecting");

    // trigger the mouse stop event (this will select all .ui-selecting elements, and deselect all .ui-unselecting elements)
    selectableContainer.data("ui-selectable")._mouseStop(null);
  }
  

  // Dead code
  /*
  draggable.mousedown(function() {
      console.log("mousedown");
      dragging = true;
    });
  $(document).mouseup(function() {
      console.log("mouseup");
      dragging = false;
    });

  draggable.mousemove(function(event) {
    if (selected && dragging) {
      console.log("ok here");
      draggable.css('left', event.clientX - draggable.offsetWidth/2 + 'px');
      draggable.css('top',  event.clientY - draggable.offsetHeight/2 + 'px');
    }
    event.preventDefault();
  });
  */
});
