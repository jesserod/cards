$(document).ready(function() {
  // Global vars
  var selected = false;
  var dragging = false;

  var selectable = $(".selectable-container");
  // Initialize DOM
  function createDraggable(id, text) {
    console.log(document.createElement("div"));
    var element = '<div class="{0}" id="{0}-{1}"><p>{2}</p></div>'.format("draggable", id, text);
    selectable.append(element);
  }
  createDraggable("A", "one");
  createDraggable("B", "two");
  createDraggable("C", "three");

  var draggable = $(".draggable");

  // Initialize handlers etc
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
});


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
