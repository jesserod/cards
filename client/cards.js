var BOARD_ID = 1;

$(document).ready(function() {
$.ajax({url: "/show/boards/" + BOARD_ID, success: function(board) {
  console.log("BOARD LOADED:");
  console.log(board);
  // Global vars
  var dragging = false;
  var shiftPressed = false;
  // To keep track of items at the start of a shift-lasso so we can de-select
  // items en masse, and add new items to the selection en masse
  var selectedAtShiftLassoStart;
  var animationMs = 100;

  var selectableContainer = $(".selectable-container");
  var allCards = {};

  // Initialize DOM
  // cardInstanceId: Which card on the board.  Distinct from the ID of the card itself...
  // Maybe the ID for the card itself should be card UID
  for (var cardInstanceId in board.cardInstances) {
    var domId = "cardInstance" + cardInstanceId;
    var card = board.cardInstances[cardInstanceId]
    var clientCard = CreateCard({
      id: domId,
      cardInstanceId: cardInstanceId,
      top: card.top,
      left: card.left,
      "z-index": card.zIndex,
      text: "text" + cardInstanceId,
      backImage: card.card.backImage,
      frontImage: card.card.frontImage,
      frontUp: card.frontUp,
    });
    selectableContainer.append(clientCard.element);
    allCards[domId] = clientCard;
  }
  var draggable = $(".draggable");

  // Initialize handlers etc
  selectableContainer.selectable({
    start: function(event, ui) {
      // Keep track of what was currently selected when a shift-lasso drag started
      if (shiftPressed) {
        selectedAtShiftLassoStart = GetSelected();
      }
    },

    selecting: function(event, ui) {
      // Invert logic for shift-drag select
      if ($(selectedAtShiftLassoStart).is(ui.selecting)) {
        $(ui.selecting).removeClass("ui-selected");
        $(ui.selecting).removeClass("ui-selecting");
        $(ui.selecting).removeClass("canDrag");
        return;
      }
    },

    selected: function(event, ui) {
      // Invert logic for shift-drag select
      if ($(selectedAtShiftLassoStart).is(ui.selected)) {
        $(ui.selected).removeClass("ui-selected");
        $(ui.selected).removeClass("canDrag");
        return;
      }
      $(ui.selected).addClass("canDrag");
    },

    unselecting: function(event, ui) {
      // Retain selected items during shift drag
      if ($(selectedAtShiftLassoStart).is(ui.unselecting)) {
        $(ui.unselecting).addClass("ui-selected");
        return;
      }
    },

    unselected: function(event, ui) {
      $(ui.unselected).removeClass("canDrag");
    },

    stop: function(event, ui) {
      // Lasso is over, what was selected at start is now irrelevant
      selectedAtShiftLassoStart = null;
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
      // If an item is not selected yet a drag event starts on it,
      // pretend it was clicked prior to dragging
      if (!IsSelected(ui.helper)) {
        ui.helper.trigger("click");
      }
      selected = GetSelected();
      startGrabTop = ui.position.top
      startGrabLeft = ui.position.left
      currentPositions = selected.not(ui.helper).map(function() {
        return $(this).offset();
      }).get();

      // When we drag things, they should float above others
      BringToFront(selected, GetSelectees().not(selected));
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
        SendBoardUpdate();
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
    } else if (c == "u") {
      console.log("Flip Up");
      FlipSelectedCards(true);
    } else if (c == "d") {
      console.log("Flip Down");
      FlipSelectedCards(false);
    } else if (c == "g") {
      GroupCards();
      console.log("Group");
    } else {
      validKey = false;
    }
    if (validKey) {
      var fakeMouseup = $.Event( "mouseup", { which: 1 } );
      draggable.trigger(fakeMouseup);
      SendBoardUpdate();
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
    return $(".ui-selecting", container);
  }

  function GetSelectees(container) {
    if (container == null) {
      container = selectableContainer
    }
    return $(".ui-selectee", container);
  }

  function IsSelected(element) {
    return $(element).hasClass("ui-selected");
  }

  function IsSelecting(element) {
    return $(element).hasClass("ui-selecting");
  }

  function GroupCards() {
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

      $(inOrder[i]).animate({top: baseTop + offset, left: baseLeft + offset},
          {duration: animationMs});
    }
  }

  function GetZIndices(elements) {
    return $(elements).map(function() {
      return $(this).zIndex();
    }).get();
  }

  /*
   * Bring the given elements to the foreground such that every item
   * in elements has a higher z-index than the highest z-index in others.
   * The relative offsets of z-index within elements will be preserved.
   */
  function BringToFront(elements, others) {
    if (elements == null || others == null || elements.length == 0 || others.length == 0) {
      return;
    }
    elements = $(elements).toArray(); // Preserve order by converting to array (if not already one)
    var origZIndices = GetZIndices(elements);
    var minOrig = Array.min(origZIndices);
    var origZOffsets = origZIndices.map(function(x) {return x - minOrig});

    var otherZIndices = GetZIndices($(others).not(elements));
    var maxOthers = Array.max(otherZIndices);

    for (var i = 0; i < selected.length; i++) {
      var zIndex = maxOthers + 1 + origZOffsets[i];
      $(selected[i]).zIndex(zIndex);
      allCards[elements[i].id]["z-index"] = zIndex;
    }
  }

  function CreateCard(values) {
    var card = {}

    var attrKeys = ["id"];
    var cssKeys = ["z-index", "top", "left"];
    var otherKeys = ["frontImage", "backImage", "text", "frontUp", "cardInstanceId"];

    var attrMap = {}
    var cssMap = {}
    var otherMap = {}

    attrKeys.forEach(function(key) {
      card[key] = values[key];
      attrMap[key] = values[key];
    });
    cssKeys.forEach(function(key) {
      card[key] = values[key];
      cssMap[key] = values[key];
    });

    otherKeys.forEach(function(key) {
      card[key] = values[key];
      otherMap[key] = values[key];
    });

    var imageUrl;
    if (card.frontUp) {
      imageUrl = card.frontImage;
    } else {
      imageUrl = card.backImage
    }

    cssMap["background-image"] = 'url("' + imageUrl + '")';
    cssMap["position"] = "absolute";
    card.element = $("<div></div>")
        .attr(attrMap)
        .css(cssMap)
        .addClass("draggable");
    card.element.append($("<p></p>").text(card.text));

    return card;
  }

  function FlipSelectedCards(frontUp) {
    GetSelected().each(function(index, element) {
      var card = allCards[element.id];
      if (card != null) {
        FlipCard(card, frontUp);
      }
    });
  }

  function FlipCard(card, frontUp) {
    var url;
    card.frontUp = frontUp;
    if (frontUp) {
      url = card.frontImage;
    } else {
      url = card.backImage;
    }
    $(card.element).css({"background-image": "url(" + url + ")"});
  }

  function SendBoardUpdate() {
    var data = {}
    for (var domId in allCards) {
      var card = allCards[domId];
      data[card.cardInstanceId] = {
        frontUp: card.frontUp,
        top: card.element.offset().top,
        left: card.element.offset().left,
        zIndex: card["z-index"],
      }
    }
    $.post("/updateboard/" + BOARD_ID, data);
  }
}});
});
