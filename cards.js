$(document).ready(function() {
  // Global vars
  var dragging = false;
  var shiftPressed = false;

  var selectable = $(".selectable-container");
  // Initialize DOM
  function createDraggable(id, text) {
    var element = '<div class="{0}" id="{0}-{1}"><p>{2}</p></div>'.format("draggable", id, text);
    selectable.append(element);
    return element;
  }
  createDraggable("A", "one");
  createDraggable("B", "two");
  createDraggable("C", "three");
  $(".selectable-container > *").each(function(i, element) {
    element.style.top = i * 100;
  })

  var draggable = $(".draggable");

  // Initialize handlers etc
  selectable.selectable({
    selected: function(event, ui) {
      $(ui.selected).addClass("canDrag");
    },

    unselected: function(event, ui) {
      $(ui.unselected).removeClass("canDrag");
    },

    // Only allow top-level items inside the selectable container to be selected
    filter: "> *"
  });

  var startGrabTop;
  var startGrabLeft;
  var currentPositions;

  draggable.draggable({
    cursor: "-webkit-grabbing",

    start: function(event, ui) {
      startGrabTop = ui.position.top
      startGrabLeft = ui.position.left
      currentPositions = $(".ui-selected").not(ui.helper).map(function() {
        return $(this).offset();
      }).get();
    },

    drag: function(event, ui) {
      /* Drag only if selected */
      if (!ui.helper.hasClass("ui-selected")) {
        event.preventDefault();
        return;
      }
      ui.helper.removeClass("canDrag");
      topMoved = ui.position.top - startGrabTop;
      leftMoved = ui.position.left - startGrabLeft;

      $(".ui-selected").not(ui.helper).each(function(index, element) {
        element.style.top = currentPositions[index].top + topMoved;
        element.style.left = currentPositions[index].left + leftMoved;
      });
    },

    stop: function(event, ui) {
      if (ui.helper.hasClass("ui-selected")) {
        ui.helper.addClass("canDrag");
      }
    },
  });

  /*
   * Since draggable conflicts with the click-to-select behavior of selectable,
   * we must manually define how clicks select items.
   */
  $(".ui-selectee").click(function() {
    var alreadySelected = $(".ui-selected").is(this);
    if (alreadySelected) {
      if (shiftPressed) {
        // Selected already, remove from existing list of selected things
        SelectSelectableElement(selectable, $(".ui-selected").not($(this)));
      } else {
        // Selected already, no shift pressed, select only this one
        SelectSelectableElement(selectable, $(this));
      }
    } else {
      if (shiftPressed) {
        // Not selected, add to existing list of selected things
        SelectSelectableElement(selectable, $(".ui-selected").add($(this)));
      } else {
        // Not selected, no shift pressed, select only this one
        SelectSelectableElement(selectable, $(this));
      }
    }
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

  $(document).on('keyup keydown', function(e) {shiftPressed = e.shiftKey});

  function SelectSelectableElement (selectableContainer, elementsToSelect)
  {
    // add unselecting class to all elements in the styleboard canvas except the ones to select
    $(".ui-selected", selectableContainer).not(elementsToSelect).removeClass("ui-selected").addClass("ui-unselecting");
    
    // add ui-selecting class to the elements to select
    $(elementsToSelect).not(".ui-selected").addClass("ui-selecting");

    // trigger the mouse stop event (this will select all .ui-selecting elements, and deselect all .ui-unselecting elements)
    selectableContainer.data("ui-selectable")._mouseStop(null);
  }

  function GetDraggableElementId(element) {
    return element.id.split("-")[1];
  }
});


