$(document).ready(function() {
  // Global vars
  var dragging = false;
  var shiftPressed = false;

  var selectableContainer = $(".selectable-container");
  // Initialize DOM
  function createDraggable(id, text, zIndex) {
    var element = '<div class="{0}" id="{0}-{1}" style="z-index: {3}; position: absolute"><p>{2}</p></div>'.format("draggable", id, text, zIndex);
    selectableContainer.append(element);
    return element;
  }
  createDraggable("A", "one", 0);
  createDraggable("B", "two", 1);
  createDraggable("C", "three", 2);
  createDraggable("D", "four", 3);
  createDraggable("E", "five", 4);
  createDraggable("F", "six", 5);
  $("> *", selectableContainer).each(function(i, element) {
    element.style.top = i * 60;
  })

  var draggable = $(".draggable");

  // Initialize handlers etc
  selectableContainer.selectable({
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
      if (!IsSelected(ui.helper)) {
        ui.helper.trigger("click");
      }
      startGrabTop = ui.position.top
      startGrabLeft = ui.position.left
      currentPositions = GetSelected().not(ui.helper).map(function() {
        return $(this).offset();
      }).get();
    },

    drag: function(event, ui) {
      /* Drag only if selected */
      if (!IsSelected(ui.helper)) {
        event.preventDefault();
        return;
      }
      ui.helper.removeClass("canDrag");
      topMoved = ui.position.top - startGrabTop;
      leftMoved = ui.position.left - startGrabLeft;

      GetSelected().not(ui.helper).each(function(index, element) {
        element.style.top = currentPositions[index].top + topMoved;
        element.style.left = currentPositions[index].left + leftMoved;
      });
    },

    stop: function(event, ui) {
      if (IsSelected(ui.helper)) {
        ui.helper.addClass("canDrag");
      }
    },
  });

  /*
   * Since draggable conflicts with the click-to-select behavior of selectable,
   * we must manually define how clicks select items.
   */
  $(".ui-selectee").click(function() {
    var alreadySelected = GetSelected().is(this);
    if (alreadySelected) {
      if (shiftPressed) {
        // Selected already, remove from existing list of selected things
        SelectSelectableElement(selectableContainer, GetSelected().not($(this)));
      } else {
        // Selected already, no shift pressed, select only this one
        SelectSelectableElement(selectableContainer, $(this));
      }
    } else {
      if (shiftPressed) {
        // Not selected, add to existing list of selected things
        SelectSelectableElement(selectableContainer, GetSelected().add($(this)));
      } else {
        // Not selected, no shift pressed, select only this one
        SelectSelectableElement(selectableContainer, $(this));
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
    } else if (c == "d") {
      OrganizeDeck();
      console.log("Deck");
    } else {
      validKey = false;
    }
    if (validKey) {
      var fakeMouseup = $.Event( "mouseup", { which: 1 } );
      draggable.trigger(fakeMouseup);
    }
  });

  $(document).on('keyup keydown', function(e) {shiftPressed = e.shiftKey});

  /** Container is a .selectable container, elementsToSelect should be in it */
  function SelectSelectableElement(container, elementsToSelect)
  {
    // add unselecting class to all elements in the styleboard canvas except the ones to select
    $(".ui-selected", container).not(elementsToSelect).removeClass("ui-selected").addClass("ui-unselecting");
    
    // add ui-selecting class to the elements to select
    $(elementsToSelect).not(".ui-selected").addClass("ui-selecting");

    // trigger the mouse stop event (this will select all .ui-selecting elements, and deselect all .ui-unselecting elements)
    container.data("ui-selectable")._mouseStop(null);
  }

  function GetDraggableElementId(element) {
    return element.id.split("-")[1];
  }

  function GetSelected(container) {
    if (container == null) {
      container = selectableContainer
    }
    return $(".ui-selected", container);
  }

  function GetSelecting(container) {
    if (container == null) {
      container = selectableContainer
    }
    return $(".ui-selected", container);
  }

  function IsSelected(element) {
    return $(element).hasClass("ui-selected");
  }

  function OrganizeDeck() {
    var tops = GetSelected().map(function() {return $(this).offset().top}).get();
    var lefts = GetSelected().map(function() {return $(this).offset().left}).get();
    var baseTop = Math.floor(Array.avg(tops));
    var baseLeft = Math.floor(Array.avg(lefts));
    var offsetPerGroup = 2;
    var cardsPerGroup = 3;
    // Sort by z-index
    var inOrder = GetSelected().toArray().sort(function(x,y) {return $(x).zIndex() - $(y).zIndex()});
    for (var i = 0; i < inOrder.length; i++) {
      var groupIndex = Math.floor((i-1)/cardsPerGroup) + 1;
      var offset = groupIndex * offsetPerGroup;
      inOrder[i].style.top = baseTop + offset;
      inOrder[i].style.left = baseLeft + offset;
    }
  }
});
